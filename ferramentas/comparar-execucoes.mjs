/* global console */
/**
 * Lista e compara execuções guardadas em `relatorios/historico/execucoes/<id>.json`
 * (escritas pelo `reporter-historico.ts` no fim de cada corrida).
 *
 *   node ferramentas/comparar-execucoes.mjs listar [filtro]      # todas (ou as que contêm o filtro)
 *   node ferramentas/comparar-execucoes.mjs comparar             # as 2 últimas do mesmo tipo+ambiente
 *   node ferramentas/comparar-execucoes.mjs comparar <idB>       # <idB> vs a anterior do mesmo tipo+ambiente
 *   node ferramentas/comparar-execucoes.mjs comparar <idA> <idB> # A (antes) vs B (depois)
 *
 * (atalhos: `npm run execucoes:listar`, `npm run execucoes:comparar -- …`). Os ids podem ser
 * abreviados: basta um pedaço único (ex. `front-mock-2026-09-30_14`).
 *
 * A comparação mostra: contagens, duração da corrida e estatísticas por caso (média,
 * mediana, mín., máx.) com a diferença; casos que mudaram de estado; casos que ficaram mais
 * lentos/rápidos (só os que correram nas duas, pela chave projeto › ficheiro › títulos); casos
 * que só existem numa delas.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';

const PASTA = 'relatorios/historico/execucoes';
const LIMIAR_MS = 1000; // variações abaixo de 1 s por caso não são listadas
const TOP = 10;

const fmt = (ms) => {
  if (!Number.isFinite(ms)) return '—';
  const sinal = ms < 0 ? '-' : '';
  const a = Math.abs(ms);
  if (a < 60_000) return `${sinal}${(a / 1000).toFixed(1).replace('.', ',')} s`;
  return `${sinal}${Math.floor(a / 60_000)} m ${Math.round((a % 60_000) / 1000)} s`;
};
const delta = (antes, depois) => {
  const d = depois - antes;
  const pct = antes > 0 ? ` (${d >= 0 ? '+' : ''}${Math.round((d / antes) * 100)}%)` : '';
  return `${d >= 0 ? '+' : ''}${fmt(d)}${pct}`;
};

function carregar() {
  if (!fs.existsSync(PASTA)) return [];
  return fs
    .readdirSync(PASTA)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(PASTA, f), 'utf8')))
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
}

function encontrar(execucoes, pedaco) {
  const achadas = execucoes.filter((e) => e.execucao.includes(pedaco));
  if (achadas.length === 1) return achadas[0];
  const exata = achadas.find((e) => e.execucao === pedaco);
  if (exata) return exata;
  console.error(
    achadas.length === 0
      ? `[comparar] nenhuma execução com "${pedaco}".`
      : `[comparar] "${pedaco}" é ambíguo: ${achadas.map((e) => e.execucao).join(', ')}`,
  );
  process.exit(2);
}

const mesmoTipo = (a, b) => a.tipo === b.tipo && a.ambiente === b.ambiente;

function listar(execucoes, filtro) {
  const lista = filtro ? execucoes.filter((e) => e.execucao.includes(filtro)) : execucoes;
  if (lista.length === 0) {
    console.log(`Sem execuções em ${PASTA}/ — corra os testes primeiro (npm run test:front, …).`);
    return;
  }
  console.table(
    lista.map((e) => ({
      execucao: e.execucao,
      lote: e.lote ?? '',
      resultado: e.resultado,
      casos: e.contagens.total,
      passou: e.contagens.passou,
      falhou: e.contagens.falhou,
      instavel: e.contagens.instavel,
      corrida: fmt(e.duracaoMs),
      'média/caso': fmt(e.tempos.geral.mediaMs),
      'máx/caso': fmt(e.tempos.geral.maxMs),
      filtro: e.filtro,
    })),
  );
}

function comparar(a, b) {
  if (!mesmoTipo(a, b)) {
    console.warn(
      `AVISO: tipos/ambientes diferentes (${a.tipo}/${a.ambiente} vs ${b.tipo}/${b.ambiente}) — ` +
        'as diferenças de tempo misturam conjuntos de casos distintos.\n',
    );
  }
  if (a.filtro !== b.filtro) {
    console.warn(`AVISO: filtros diferentes ("${a.filtro}" vs "${b.filtro}").\n`);
  }
  console.log(`A (antes):  ${a.execucao}   app ${a.versoes?.app?.commit ?? 'n/d'} · e2e ${a.versoes?.e2e?.commit ?? 'n/d'}`);
  console.log(`B (depois): ${b.execucao}   app ${b.versoes?.app?.commit ?? 'n/d'} · e2e ${b.versoes?.e2e?.commit ?? 'n/d'}\n`);

  const ga = a.tempos.geral;
  const gb = b.tempos.geral;
  console.table({
    'casos (total)': { A: a.contagens.total, B: b.contagens.total, 'B − A': b.contagens.total - a.contagens.total },
    passou: { A: a.contagens.passou, B: b.contagens.passou, 'B − A': b.contagens.passou - a.contagens.passou },
    falhou: { A: a.contagens.falhou, B: b.contagens.falhou, 'B − A': b.contagens.falhou - a.contagens.falhou },
    instável: { A: a.contagens.instavel, B: b.contagens.instavel, 'B − A': b.contagens.instavel - a.contagens.instavel },
    'duração da corrida': { A: fmt(a.duracaoMs), B: fmt(b.duracaoMs), 'B − A': delta(a.duracaoMs, b.duracaoMs) },
    'média por caso': { A: fmt(ga.mediaMs), B: fmt(gb.mediaMs), 'B − A': delta(ga.mediaMs, gb.mediaMs) },
    'mediana por caso': { A: fmt(ga.medianaMs), B: fmt(gb.medianaMs), 'B − A': delta(ga.medianaMs, gb.medianaMs) },
    'mín. por caso': { A: fmt(ga.minMs), B: fmt(gb.minMs), 'B − A': delta(ga.minMs, gb.minMs) },
    'máx. por caso': { A: fmt(ga.maxMs), B: fmt(gb.maxMs), 'B − A': delta(ga.maxMs, gb.maxMs) },
  });

  const porChave = (e) => new Map(e.casos.map((c) => [c.chave, c]));
  const ca = porChave(a);
  const cb = porChave(b);
  const correram = (c) => c && c.estado !== 'ignorado' && c.estado !== 'não executado';

  const mudancas = [...cb.values()]
    .filter((c) => ca.has(c.chave) && ca.get(c.chave).estado !== c.estado)
    .map((c) => ({ caso: c.titulo, browser: c.projeto, A: ca.get(c.chave).estado, B: c.estado }));
  console.log(`\nMudanças de estado (${mudancas.length}):`);
  if (mudancas.length) console.table(mudancas);

  const variacoes = [...cb.values()]
    .filter((c) => correram(c) && correram(ca.get(c.chave)))
    .map((c) => ({ c, d: c.duracaoMs - ca.get(c.chave).duracaoMs }))
    .filter((x) => Math.abs(x.d) >= LIMIAR_MS);
  const linha = ({ c }) => ({
    caso: c.titulo.length > 70 ? `${c.titulo.slice(0, 70)}…` : c.titulo,
    browser: c.projeto,
    A: fmt(ca.get(c.chave).duracaoMs),
    B: fmt(c.duracaoMs),
    'B − A': delta(ca.get(c.chave).duracaoMs, c.duracaoMs),
  });
  const lentos = variacoes.filter((x) => x.d > 0).sort((x, y) => y.d - x.d).slice(0, TOP);
  const rapidos = variacoes.filter((x) => x.d < 0).sort((x, y) => x.d - y.d).slice(0, TOP);
  console.log(`\nMais lentos em B (top ${TOP}, variação ≥ ${fmt(LIMIAR_MS)}):`);
  if (lentos.length) console.table(lentos.map(linha));
  console.log(`\nMais rápidos em B (top ${TOP}, variação ≥ ${fmt(LIMIAR_MS)}):`);
  if (rapidos.length) console.table(rapidos.map(linha));

  const soA = [...ca.keys()].filter((k) => !cb.has(k)).length;
  const soB = [...cb.keys()].filter((k) => !ca.has(k)).length;
  if (soA || soB) console.log(`\nCasos só em A: ${soA} · só em B: ${soB}`);
}

const [acao = 'listar', x, y] = process.argv.slice(2);
const execucoes = carregar();

if (acao === 'listar') {
  listar(execucoes, x);
} else if (acao === 'comparar') {
  let a;
  let b;
  if (x && y) {
    a = encontrar(execucoes, x);
    b = encontrar(execucoes, y);
  } else {
    b = x ? encontrar(execucoes, x) : execucoes.at(-1);
    a = b && execucoes.filter((e) => e !== b && mesmoTipo(e, b) && e.inicio < b.inicio).at(-1);
  }
  if (!a || !b) {
    console.error('[comparar] são precisas pelo menos 2 execuções do mesmo tipo e ambiente (ver "listar").');
    process.exit(2);
  }
  comparar(a, b);
} else {
  console.error('Uso: node ferramentas/comparar-execucoes.mjs <listar [filtro] | comparar [idA] [idB]>');
  process.exit(2);
}

import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';

/**
 * Reporter de rastreabilidade CASO (CT) <-> REQUISITO (RF).
 *
 * Lê `rastreabilidade/requisitos.yaml`, cruza com as annotations dos testes
 * (`{ type: 'caso' }`, `{ type: 'requisito' }`; fallback: tags `@CT-...` / `@RF\d+`)
 * e escreve em `relatorios/rastreabilidade/`:
 *   - rastreabilidade.json  (estruturado)
 *   - rastreabilidade.md    (tabelas — colar em PR/Bitbucket)
 *   - rastreabilidade.html  (offline, sem dependências de rede)
 *
 * Inspirado no contrato de veredicto do repo `ccmsns-automated-tests`
 * (campos `referencia` / `veredicto`) mas determinístico.
 */

interface OpcoesReporter {
  /** Caminho da matriz YAML (default `rastreabilidade/requisitos.yaml`). */
  matriz?: string;
  /** Pasta de saída (default `relatorios/rastreabilidade`). */
  pastaSaida?: string;
  /** Relatório de execução do Playwright, citado no rodapé (ver `reporter-execucao.ts`). */
  relatorioExecucao?: string;
}

interface RequisitoMatriz {
  titulo?: string;
  descricao?: string;
  seccao_plano?: string;
}

interface CasoMatriz {
  titulo?: string;
  area?: string;
  rota?: string;
  tipo?: string;
  requisitos?: string[];
  cenario_plano?: string;
  spec?: string;
}

interface Matriz {
  fonte?: Record<string, string>;
  requisitos?: Record<string, RequisitoMatriz>;
  casos?: Record<string, CasoMatriz>;
}

type Veredicto = 'passa' | 'falha' | 'ignorado' | 'nao_executado';

const COBERTURA = {
  COBERTO: 'COBERTO',
  FALHA: 'FALHA',
  PARCIAL: 'PARCIAL',
  NAO_EXECUTADO: 'NÃO EXECUTADO',
  SEM_COBERTURA: 'SEM COBERTURA',
} as const;
type Cobertura = (typeof COBERTURA)[keyof typeof COBERTURA];

/**
 * Paleta do relatório (tema claro fixo, contraste alto — todos os pares texto/fundo ≥ 4,5:1).
 * `fg` é sempre um tom escuro usado no texto; `bg` é o tom claro usado só na célula de
 * "Cobertura" e na legenda. Pílulas de tag/requisito são "outline" (fundo branco + borda
 * e texto em `fg`); cartões de caso são brancos com barra lateral em `fg`.
 *
 * REGRA DE CORES: o vermelho é **exclusivo de resultado negativo** (veredicto
 * `falha`, cobertura `FALHA`). Tudo o resto — informação, categorias, "não
 * executado", cobertura parcial — usa tons frios (verde, azul, índigo, ardósia, teal).
 */
type Cor = { bg: string; fg: string };
const CORES = {
  passa: { bg: '#c6e7cb', fg: '#14532d' }, // verde — positivo
  falha: { bg: '#f6cfca', fg: '#991b1b' }, // vermelho — NEGATIVO (único quente)
  neutro: { bg: '#dfe3e8', fg: '#3a4351' }, // cinza-ardósia — ignorado / não executado
  parcial: { bg: '#d5d9f7', fg: '#312e81' }, // índigo — cobertura parcial (frio)
  lacuna: { bg: '#d5dde6', fg: '#1e293b' }, // ardósia — requisito sem cobertura
  info: { bg: '#d3e3fb', fg: '#1e3a8a' }, // azul — requisitos (RF/WCAG)
  categoria: { bg: '#e2e6ea', fg: '#334155' }, // ardósia — famílias, tipo, suíte, ids
  robustez: { bg: '#c9ece9', fg: '#134e4a' }, // teal — robustez
} as const satisfies Record<string, Cor>;

function corCobertura(c: Cobertura): Cor {
  switch (c) {
    case COBERTURA.FALHA:
      return CORES.falha; // quente — resultado negativo
    case COBERTURA.COBERTO:
      return CORES.passa;
    case COBERTURA.PARCIAL:
      return CORES.parcial;
    case COBERTURA.SEM_COBERTURA:
      return CORES.lacuna;
    default:
      return CORES.neutro; // NÃO EXECUTADO
  }
}

function corVeredicto(v: Veredicto): Cor {
  if (v === 'falha') return CORES.falha; // quente — resultado negativo
  if (v === 'passa') return CORES.passa;
  return CORES.neutro; // ignorado / nao_executado
}

/** Cor de uma tag do Playwright. Nunca vermelha (tags são categoria/informação). */
function corTag(tag: string): Cor {
  const t = tag.replace(/^@/, '').toLowerCase();
  if (/^rf\d+$/.test(t) || /^wcag/.test(t)) return CORES.info;
  if (/^ct-/.test(t)) return CORES.categoria;
  if (t === 'positivo') return CORES.passa;
  if (t === 'robustez') return CORES.robustez;
  return CORES.categoria; // negativo, famílias (@fatura, …), suíte, tipo, smoke
}

interface ExecucaoCaso {
  caso: string;
  titulo: string;
  requisitos: string[];
  tags: string[];
  veredicto: Veredicto;
  statusPlaywright: string;
  duracaoMs: number;
  tentativas: number;
  erro?: string;
  plano?: string;
  massa?: string;
  ficheiro: string;
  anexos: { nome: string; caminho: string }[];
}

function veredictoDeStatus(status: TestResult['status']): Veredicto {
  if (status === 'passed') return 'passa';
  if (status === 'skipped') return 'ignorado';
  return 'falha'; // failed | timedOut | interrupted
}

/** Duração legível: 1234 → "1,2 s"; 83000 → "1 m 23 s"; 830 → "0,8 s". */
function fmtDuracao(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 60_000) return `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return `${m} m ${s} s`;
}

/** Remove codigos de cor ANSI (ESC[...m) de mensagens de erro do Playwright. */
function stripAnsi(texto: string | undefined): string {
  const re = new RegExp(String.fromCharCode(27) + '[[0-9;]*m', 'g');
  return (texto ?? '').replace(re, '');
}

function escaparHtml(valor: unknown): string {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function anotacao(test: TestCase, tipo: string): string | undefined {
  return test.annotations.find((a) => a.type === tipo)?.description ?? undefined;
}

function anotacoes(test: TestCase, tipo: string): string[] {
  return test.annotations
    .filter((a) => a.type === tipo)
    .map((a) => a.description ?? '')
    .filter(Boolean);
}

function tagsComPrefixo(test: TestCase, re: RegExp): string[] {
  const tags = (test as unknown as { tags?: string[] }).tags ?? [];
  return tags.map((t) => re.exec(t)?.[1]).filter((v): v is string => Boolean(v));
}

export default class ReporterRastreabilidade implements Reporter {
  private readonly matrizPath: string;
  private readonly pastaSaida: string;
  private readonly relatorioExecucao: string;
  private matriz: Matriz = {};
  private readonly execucoes = new Map<string, { test: TestCase; result: TestResult }>();
  private rootDir = process.cwd();

  constructor(opcoes: OpcoesReporter = {}) {
    this.matrizPath = path.resolve(
      process.cwd(),
      opcoes.matriz ?? 'rastreabilidade/requisitos.yaml',
    );
    this.pastaSaida = path.resolve(
      process.cwd(),
      opcoes.pastaSaida ?? 'relatorios/rastreabilidade',
    );
    this.relatorioExecucao = opcoes.relatorioExecucao ?? 'relatorios/playwright/index.html';
  }

  printsToStdio(): boolean {
    return false;
  }

  onBegin(config: FullConfig, _suite: Suite): void {
    this.rootDir = config.rootDir ?? process.cwd();
    try {
      this.matriz = (yaml.load(fs.readFileSync(this.matrizPath, 'utf8')) as Matriz) ?? {};
    } catch (erro) {
      console.warn(
        `[rastreabilidade] não consegui ler a matriz "${this.matrizPath}": ${(erro as Error).message}`,
      );
      this.matriz = {};
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const anterior = this.execucoes.get(test.id);
    if (!anterior || result.retry >= anterior.result.retry) {
      this.execucoes.set(test.id, { test, result });
    }
  }

  async onEnd(resultado: FullResult): Promise<void> {
    // `playwright test --list` também chama onEnd — não sobrescrever um relatório
    // válido com um vazio quando nenhum teste correu.
    if (this.execucoes.size === 0) return;

    const requisitosMatriz = this.matriz.requisitos ?? {};
    const casosMatriz = this.matriz.casos ?? {};

    // --- Execuções por caso -------------------------------------------------
    const execucoes: ExecucaoCaso[] = [];
    for (const { test, result } of this.execucoes.values()) {
      const caso =
        anotacao(test, 'caso') ?? tagsComPrefixo(test, /^@(CT-[A-Za-z0-9._-]+)$/)[0] ?? test.title;
      const requisitos = [
        ...new Set([
          ...anotacoes(test, 'requisito'),
          ...tagsComPrefixo(test, /^@(RF\d+)$/),
          ...(casosMatriz[caso]?.requisitos ?? []),
        ]),
      ];
      execucoes.push({
        caso,
        titulo: test.title,
        requisitos,
        tags: (test as unknown as { tags?: string[] }).tags ?? [],
        veredicto: veredictoDeStatus(result.status),
        statusPlaywright: result.status,
        duracaoMs: result.duration,
        tentativas: result.retry + 1,
        erro: stripAnsi(result.error?.message).trim() || undefined,
        plano: anotacao(test, 'plano'),
        massa: anotacao(test, 'massa'),
        ficheiro: path.relative(this.rootDir, test.location.file).replace(/\\/g, '/'),
        anexos: result.attachments
          .filter((a) => a.path)
          .map((a) => ({
            nome: a.name,
            caminho: path.relative(this.pastaSaida, a.path as string).replace(/\\/g, '/'),
          })),
      });
    }
    const execPorCaso = new Map(execucoes.map((e) => [e.caso, e]));

    // --- Cobertura por requisito -----------------------------------------
    const idsRequisitos = [
      ...new Set([...Object.keys(requisitosMatriz), ...execucoes.flatMap((e) => e.requisitos)]),
    ].sort();

    const coberturaRequisitos = idsRequisitos.map((rf) => {
      const casosDoRf = [
        ...new Set([
          ...Object.entries(casosMatriz)
            .filter(([, c]) => (c.requisitos ?? []).includes(rf))
            .map(([id]) => id),
          ...execucoes.filter((e) => e.requisitos.includes(rf)).map((e) => e.caso),
        ]),
      ].sort();

      const veredictos = casosDoRf.map<Veredicto>(
        (id) => execPorCaso.get(id)?.veredicto ?? 'nao_executado',
      );

      let cobertura: Cobertura;
      if (casosDoRf.length === 0) cobertura = COBERTURA.SEM_COBERTURA;
      else if (veredictos.includes('falha')) cobertura = COBERTURA.FALHA;
      else if (veredictos.every((v) => v === 'passa')) cobertura = COBERTURA.COBERTO;
      else if (veredictos.every((v) => v === 'ignorado' || v === 'nao_executado'))
        cobertura = COBERTURA.NAO_EXECUTADO;
      else cobertura = COBERTURA.PARCIAL;

      const def = requisitosMatriz[rf];
      return {
        requisito: rf,
        titulo: def?.titulo ?? '(não descrito na matriz)',
        descricao: def?.descricao ?? '',
        seccao_plano: def?.seccao_plano ?? '',
        cobertura,
        casos: casosDoRf.map((id) => ({
          caso: id,
          veredicto: execPorCaso.get(id)?.veredicto ?? 'nao_executado',
        })),
      };
    });

    // --- Avisos --------------------------------------------------------
    const avisos: string[] = [];
    for (const e of execucoes) {
      if (e.requisitos.length === 0)
        avisos.push(`Caso "${e.caso}" não referencia nenhum requisito.`);
      if (!casosMatriz[e.caso])
        avisos.push(`Caso "${e.caso}" não está descrito em requisitos.yaml.`);
      for (const rf of e.requisitos) {
        if (!requisitosMatriz[rf])
          avisos.push(`Requisito "${rf}" (caso "${e.caso}") não está descrito em requisitos.yaml.`);
      }
    }

    const somaCasosMs = execucoes.reduce((t, e) => t + (e.duracaoMs || 0), 0);
    const duracaoTotalMs =
      typeof resultado.duration === 'number' && resultado.duration > 0
        ? resultado.duration
        : somaCasosMs;

    const resumo = {
      gerado_em: new Date().toISOString(),
      ambiente: ['qua', 'dev'].includes(process.env.AMBIENTE ?? '') ? process.env.AMBIENTE : 'mock',
      resultado_playwright: resultado.status,
      total_casos: execucoes.length,
      passa: execucoes.filter((e) => e.veredicto === 'passa').length,
      falha: execucoes.filter((e) => e.veredicto === 'falha').length,
      ignorado: execucoes.filter((e) => e.veredicto === 'ignorado').length,
      requisitos_cobertos: coberturaRequisitos.filter((r) => r.cobertura === COBERTURA.COBERTO)
        .length,
      requisitos_total: coberturaRequisitos.length,
      /** Tempo de relógio da execução completa (Playwright `FullResult.duration`). */
      duracao_total_ms: duracaoTotalMs,
      duracao_total: fmtDuracao(duracaoTotalMs),
      /** Soma dos tempos por caso (≠ relógio quando há paralelismo). */
      duracao_soma_casos_ms: somaCasosMs,
      duracao_soma_casos: fmtDuracao(somaCasosMs),
    };

    const dados = {
      resumo,
      fonte: this.matriz.fonte ?? {},
      requisitos: coberturaRequisitos,
      casos: execucoes,
      avisos: [...new Set(avisos)],
    };

    fs.mkdirSync(this.pastaSaida, { recursive: true });
    fs.writeFileSync(
      path.join(this.pastaSaida, 'rastreabilidade.json'),
      JSON.stringify(dados, null, 2),
    );
    fs.writeFileSync(
      path.join(this.pastaSaida, 'rastreabilidade.md'),
      this.renderMarkdown(dados as RelatorioDados),
    );
    fs.writeFileSync(
      path.join(this.pastaSaida, 'rastreabilidade.html'),
      this.renderHtml(dados as RelatorioDados),
    );

    console.log(
      `\n[rastreabilidade] ${resumo.requisitos_cobertos}/${resumo.requisitos_total} requisitos cobertos · ` +
        `${resumo.passa} passa / ${resumo.falha} falha / ${resumo.ignorado} ignorado · ` +
        `duração ${resumo.duracao_total} · ` +
        `${path.relative(process.cwd(), this.pastaSaida)}/rastreabilidade.html`,
    );
  }

  // --------------------------------------------------------------------
  private renderMarkdown(dados: RelatorioDados): string {
    const linhasReq = dados.requisitos
      .map(
        (r) =>
          `| ${r.requisito} | ${r.titulo} | ${r.cobertura} | ${
            r.casos.map((c) => `${c.caso} (${c.veredicto})`).join('<br>') || '—'
          } | ${r.seccao_plano} |`,
      )
      .join('\n');

    const linhasCaso = dados.casos
      .map(
        (c) =>
          `| ${c.caso} | ${c.titulo} | ${c.requisitos.join(', ') || '—'} | ${c.veredicto} | ${fmtDuracao(
            c.duracaoMs,
          )} | ${c.ficheiro} |`,
      )
      .join('\n');

    return `# Rastreabilidade — Consulta por Área de Prestação

Gerado em ${dados.resumo.gerado_em} · ambiente **${dados.resumo.ambiente}** · resultado Playwright: **${dados.resumo.resultado_playwright}**

Requisitos cobertos: **${dados.resumo.requisitos_cobertos}/${dados.resumo.requisitos_total}** ·
Casos: ${dados.resumo.passa} passa / ${dados.resumo.falha} falha / ${dados.resumo.ignorado} ignorado ·
Duração total: **${dados.resumo.duracao_total}** (soma dos casos: ${dados.resumo.duracao_soma_casos})

## Cobertura por requisito

| Requisito | Título | Cobertura | Casos | Secção do plano |
|---|---|---|---|---|
${linhasReq || '| — | — | — | — | — |'}

## Casos executados

| Caso | Título | Requisitos | Veredicto | Duração | Ficheiro |
|---|---|---|---|---|---|
${linhasCaso || '| — | — | — | — | — | — |'}
${dados.avisos.length ? `\n## Avisos\n\n${dados.avisos.map((a) => `- ${a}`).join('\n')}\n` : ''}`;
  }

  // --------------------------------------------------------------------
  private renderHtml(dados: RelatorioDados): string {
    // Pílula "outline": fundo branco + borda e texto na cor forte → legível sobre qualquer fundo.
    const badge = (txt: string, cor: Cor) =>
      `<span class="badge" style="border-color:${cor.fg};color:${cor.fg}">${escaparHtml(txt)}</span>`;
    const chipTag = (t: string) => badge(t, corTag(t));
    const duracaoPorCaso = new Map(dados.casos.map((c) => [c.caso, c.duracaoMs]));

    const linhasReq = dados.requisitos
      .map((r) => {
        const cc = corCobertura(r.cobertura);
        return `<tr>
        <td class="mono">${escaparHtml(r.requisito)}</td>
        <td>${escaparHtml(r.titulo)}<div class="sub">${escaparHtml(r.descricao)}</div></td>
        <td class="cobertura" style="background:${cc.bg};color:${cc.fg};border-left:4px solid ${cc.fg}">${escaparHtml(r.cobertura)}</td>
        <td>${
          r.casos
            .map((c) => {
              const cvc = corVeredicto(c.veredicto);
              const ms = duracaoPorCaso.get(c.caso);
              const t =
                ms != null ? ` <span class="sub">· ${escaparHtml(fmtDuracao(ms))}</span>` : '';
              return `<span class="mono">${escaparHtml(c.caso)}</span> <b style="color:${cvc.fg}">${escaparHtml(c.veredicto)}</b>${t}`;
            })
            .join('<br>') || '—'
        }</td>
        <td class="sub">${escaparHtml(r.seccao_plano)}</td>
      </tr>`;
      })
      .join('\n');

    const cardsCaso = dados.casos
      .map((c) => {
        const cv = corVeredicto(c.veredicto);
        return `<article class="card" style="border-left:5px solid ${cv.fg}">
        <header><span class="mono cid">${escaparHtml(c.caso)}</span>
          <b class="verd" style="color:${cv.fg}">${escaparHtml(c.veredicto)}</b>
          <span class="sub">${escaparHtml(fmtDuracao(c.duracaoMs))} · ${c.tentativas} tentativa(s)</span></header>
        <h3>${escaparHtml(c.titulo)}</h3>
        <dl>
          <dt>Requisitos</dt><dd class="chips">${c.requisitos.map((r) => badge(r, CORES.info)).join(' ') || '—'}</dd>
          <dt>Tags</dt><dd class="chips">${c.tags.map(chipTag).join(' ') || '—'}</dd>
          <dt>Plano</dt><dd>${escaparHtml(c.plano ?? '—')}</dd>
          <dt>Massa</dt><dd>${escaparHtml(c.massa ?? '—')}</dd>
          <dt>Spec</dt><dd class="mono">${escaparHtml(c.ficheiro)}</dd>
          <dt>Evidência</dt><dd>${
            c.anexos.length
              ? c.anexos
                  .map((a) => `<a href="${escaparHtml(a.caminho)}">${escaparHtml(a.nome)}</a>`)
                  .join(' · ')
              : '—'
          }</dd>
        </dl>
        ${c.erro ? `<pre class="erro">${escaparHtml(c.erro)}</pre>` : ''}
      </article>`;
      })
      .join('\n');

    const legenda = `
      <div class="legenda">
        <b>Legenda</b> — vermelho só para resultado negativo:
        ${badge('falha / FALHA', CORES.falha)}
        ${badge('passa / COBERTO', CORES.passa)}
        ${badge('PARCIAL', CORES.parcial)}
        ${badge('SEM COBERTURA', CORES.lacuna)}
        ${badge('ignorado / NÃO EXECUTADO', CORES.neutro)}
        ${badge('requisito (RF/WCAG)', CORES.info)}
        ${badge('categoria / família', CORES.categoria)}
        ${badge('robustez', CORES.robustez)}
      </div>`;

    const fonte = Object.entries(dados.fonte)
      .map(
        ([k, v]) =>
          `<li><b>${escaparHtml(k)}:</b> <span class="mono">${escaparHtml(v)}</span></li>`,
      )
      .join('');

    return `<!doctype html>
<html lang="pt-PT">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rastreabilidade — Consulta por Área de Prestação</title>
<style>
  :root { color-scheme: only light; }
  * { box-sizing: border-box; }
  html, body { background: #ffffff; }
  body { font: 14.5px/1.55 system-ui, -apple-system, Segoe UI, sans-serif; margin: 0; padding: 24px;
         max-width: 1100px; margin-inline: auto; color: #14181d; }
  h1 { font-size: 20px; margin: 0 0 4px; color: #0f1216; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: .05em; color: #1f2937; font-weight: 800;
       margin: 32px 0 10px; border-bottom: 2px solid #c9d1da; padding-bottom: 5px; }
  h3 { font-size: 14px; margin: 6px 0; color: #14181d; font-weight: 700; }
  a { color: #1d4ed8; font-weight: 600; }
  .sub { color: #454e59; font-size: 12px; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .cid { font-weight: 800; color: #0f1216; }
  .verd { text-transform: uppercase; font-size: 11px; letter-spacing: .04em; }
  .resumo { display: flex; gap: 12px; flex-wrap: wrap; margin: 12px 0; }
  .resumo div { border: 1px solid #c9d1da; background: #f4f6f8; border-radius: 8px; padding: 8px 14px; }
  .resumo b { font-size: 18px; display: block; color: #0f1216; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #c2cbd4; padding: 7px 9px; text-align: left; vertical-align: top; }
  th { background: #e7ebef; color: #1f2933; font-weight: 800; }
  tbody tr:nth-child(even) td { background: #f7f8fa; }
  td.cobertura { font-weight: 800; white-space: nowrap; letter-spacing: .02em; }
  .badge { display: inline-block; background: #fff; border: 1.5px solid; border-radius: 999px;
           padding: 0 8px; font-size: 11px; font-weight: 700; white-space: nowrap; line-height: 1.7; }
  .card { border: 1px solid #c9d1da; border-radius: 8px; padding: 12px 14px; margin: 10px 0; background: #fff; }
  .card header { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
  dl { display: grid; grid-template-columns: 92px 1fr; gap: 5px 10px; margin: 8px 0 0; }
  dt { color: #454e59; font-weight: 600; } dd { margin: 0; }
  dd.chips { display: flex; gap: 5px; flex-wrap: wrap; }
  .legenda { display: flex; gap: 6px 8px; flex-wrap: wrap; align-items: center;
             margin: 8px 0 4px; font-size: 12px; color: #454e59; }
  pre.erro { background: #fbe4e1; border: 1px solid #e79b93; color: #7f1d1d; border-radius: 6px;
             padding: 10px; overflow-x: auto; white-space: pre-wrap; font-size: 12px; }
  footer { margin-top: 32px; color: #454e59; font-size: 12px; border-top: 1px solid #c9d1da; padding-top: 12px; }
</style>
</head>
<body>
  <h1>Rastreabilidade — Consulta por Área de Prestação</h1>
  <p class="sub">Gerado em ${escaparHtml(dados.resumo.gerado_em)} · ambiente <b>${escaparHtml(
    dados.resumo.ambiente,
  )}</b> · resultado Playwright: <b>${escaparHtml(dados.resumo.resultado_playwright)}</b></p>

  <div class="resumo">
    <div><b style="color:${
      dados.resumo.requisitos_cobertos === dados.resumo.requisitos_total
        ? CORES.passa.fg
        : CORES.lacuna.fg
    }">${dados.resumo.requisitos_cobertos}/${dados.resumo.requisitos_total}</b> requisitos cobertos</div>
    <div><b style="color:${CORES.passa.fg}">${dados.resumo.passa}</b> casos passa</div>
    <div><b style="color:${dados.resumo.falha ? CORES.falha.fg : '#1a1f26'}">${dados.resumo.falha}</b> casos falha</div>
    <div><b style="color:${CORES.neutro.fg}">${dados.resumo.ignorado}</b> casos ignorados</div>
    <div><b>${escaparHtml(dados.resumo.duracao_total)}</b> duração total<div class="sub">soma dos casos: ${escaparHtml(
      dados.resumo.duracao_soma_casos,
    )}</div></div>
  </div>

  ${legenda}

  <h2>Cobertura por requisito</h2>
  <table>
    <thead><tr><th>Requisito</th><th>Título</th><th>Cobertura</th><th>Casos</th><th>Secção do plano</th></tr></thead>
    <tbody>${linhasReq || '<tr><td colspan="5">Sem requisitos.</td></tr>'}</tbody>
  </table>

  <h2>Casos executados</h2>
  ${cardsCaso || '<p>Nenhum caso executado.</p>'}

  ${
    dados.avisos.length
      ? `<h2>Avisos</h2><ul>${dados.avisos.map((a) => `<li>${escaparHtml(a)}</li>`).join('')}</ul>`
      : ''
  }

  <footer>
    <b>Fontes</b><ul>${fonte || '<li>—</li>'}</ul>
    Relatório de execução detalhado: <span class="mono">${escaparHtml(this.relatorioExecucao)}</span>
  </footer>
</body>
</html>`;
  }
}

interface RelatorioDados {
  resumo: {
    gerado_em: string;
    ambiente: string;
    resultado_playwright: string;
    total_casos: number;
    passa: number;
    falha: number;
    ignorado: number;
    requisitos_cobertos: number;
    requisitos_total: number;
    duracao_total_ms: number;
    duracao_total: string;
    duracao_soma_casos_ms: number;
    duracao_soma_casos: string;
  };
  fonte: Record<string, string>;
  requisitos: {
    requisito: string;
    titulo: string;
    descricao: string;
    seccao_plano: string;
    cobertura: Cobertura;
    casos: { caso: string; veredicto: Veredicto }[];
  }[];
  casos: ExecucaoCaso[];
  avisos: string[];
}

import { expect, test } from '../fixtures';
import type { Page } from '@playwright/test';
import { naoAplicavel } from '../../paginas/dadosReferencia/padraoUi';
import { PesquisaConsulta, ROTULO_PRESTADOR, type Criterio } from '../../paginas/pesquisaConsulta';
import { meta } from '../apoio';
import type { EcraConsulta } from './apoio-consulta';
import { PLANO_PADROES_PESQUISA, base, configDe, ecrasComPadroes, metaPadrao, nomeCaso } from './padroes-pesquisa.apoio';
import type { FiltroConfig } from './padroes-pesquisa.config';

/**
 * Famílias A (filtros, um de cada vez) e B (campos que carregam opções) do plano
 * `docs/padroes-pesquisa-consulta-16-10-2026/plano-padroes-pesquisa.md`.
 *
 * Os valores dos filtros saem de uma **linha real** da pesquisa de base (célula da coluna do
 * filtro), e não de massa fixa. Os filtros que o ecrã só aceita combinados (`com`) são
 * preenchidos com os valores da mesma linha.
 */

const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
const vazio = (s: string) => s === '' || /^[—–-]+$/.test(s.trim());
const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

/** Valor de cada coluna, por linha, para as colunas pedidas (as que não existem ficam ''). */
async function tabelaDe(pq: PesquisaConsulta, colunas: string[]): Promise<Record<string, string>[]> {
  const existentes = await pq.tabela().colunas();
  const porColuna: Record<string, string[]> = {};
  for (const c of colunas) porColuna[c] = existentes.includes(c) ? await pq.valoresColuna(c) : [];
  const n = Math.max(0, ...Object.values(porColuna).map((v) => v.length));
  return Array.from({ length: n }, (_, i) => Object.fromEntries(colunas.map((c) => [c, porColuna[c][i] ?? ''])));
}

/** Critério de um filtro a partir do valor da célula. */
function criterioDe(f: FiltroConfig, valor: string): Criterio | { prestador: string } {
  if (f.tipo === 'select') return { select: f.rotulo, opcao: valor };
  if (f.tipo === 'prestador') return { prestador: valor };
  return { campo: f.rotulo, valor };
}

async function preencherFiltro(pq: PesquisaConsulta, c: Criterio | { prestador: string }): Promise<void> {
  if ('prestador' in c) await pq.escolherPrestador(c.prestador);
  else await pq.preencher([c]);
}

/** O valor da célula corresponde ao filtro aplicado? */
function corresponde(f: FiltroConfig, celula: string, valor: string): boolean {
  if (f.tipo === 'texto') return norm(celula).includes(norm(valor));
  if (f.tipo === 'prestador') return celula.replace(/\s+/g, '') === valor.replace(/\s+/g, '');
  return norm(celula) === norm(valor);
}

function filtroPorRotulo(ecra: EcraConsulta, rotulo: string): FiltroConfig {
  const f = (configDe(ecra).filtros ?? []).find((x) => x.rotulo === rotulo);
  if (!f) throw new Error(`${ecra.rota}: filtro «${rotulo}» não configurado`);
  return f;
}

/**
 * Aplica o filtro `f` com o valor `valor` (mais os filtros `com`, tirados de `linha`), pesquisa
 * e verifica que todas as linhas devolvidas têm o valor na coluna do filtro.
 */
async function aplicarEVerificar(
  pq: PesquisaConsulta,
  ecra: EcraConsulta,
  f: FiltroConfig,
  valor: string,
  linha: Record<string, string>,
  opcoes: { linhaOrigem?: string; esperarResultados?: boolean } = {},
): Promise<{ linhas: number; total: number }> {
  await pq.abrir();
  await preencherFiltro(pq, criterioDe(f, valor));
  for (const rotulo of f.com ?? []) {
    const outro = filtroPorRotulo(ecra, rotulo);
    await preencherFiltro(pq, criterioDe(outro, linha[outro.coluna!]));
  }
  await pq.pesquisar();
  const textos = await pq.textosLinhas();
  const total = (await pq.total()) ?? textos.length;
  if (opcoes.esperarResultados !== false) {
    expect.soft(textos.length, `${ecra.rota}: «${f.rotulo}» = "${valor}" devolve o registo de origem`).toBeGreaterThan(0);
  }
  const celulas = textos.length > 0 ? await pq.valoresColuna(f.coluna!) : [];
  const fora = celulas.filter((c) => !corresponde(f, c, valor));
  expect
    .soft(fora.slice(0, 10), `${ecra.rota}: linhas cuja coluna «${f.coluna}» não corresponde a «${f.rotulo}» = "${valor}"`)
    .toEqual([]);
  if (opcoes.linhaOrigem && total <= textos.length) {
    expect.soft(textos, `${ecra.rota}: o registo de origem está nos resultados`).toContain(opcoes.linhaOrigem);
  }
  return { linhas: textos.length, total };
}

/** Linha da pesquisa de base com valor em todas as colunas necessárias (filtro + `com`). */
async function linhaComValores(
  pq: PesquisaConsulta,
  ecra: EcraConsulta,
  f: FiltroConfig,
): Promise<{ linha: Record<string, string>; texto: string } | null> {
  const colunas = [f.coluna!, ...(f.com ?? []).map((r) => filtroPorRotulo(ecra, r).coluna!)];
  const existentes = await pq.tabela().colunas();
  const emFalta = colunas.filter((c) => !existentes.includes(c));
  expect(emFalta, `${ecra.rota}: colunas configuradas que não existem na grelha (${existentes.join(', ')})`).toEqual([]);
  const linhas = await tabelaDe(pq, colunas);
  const textos = await pq.textosLinhas();
  const i = linhas.findIndex((l) => colunas.every((c) => !vazio(l[c])));
  return i < 0 ? null : { linha: linhas[i], texto: textos[i] };
}

// --- A. Filtros -------------------------------------------------------------------------------

const UC_DO_TIPO: Record<FiltroConfig['tipo'], string> = { texto: '01', data: '04', select: '05', prestador: '06' };

/** UC-FIL-01 / 04 / 05 / 06 — o filtro devolve só registos com o valor pesquisado. */
export function casoFiltro(ecra: EcraConsulta, f: FiltroConfig): void {
  const nn = UC_DO_TIPO[f.tipo];
  const caso = `${nomeCaso('FIL', nn, ecra)}-${slug(f.rotulo)}`;
  const descricao = {
    texto: 'devolve só registos com o valor pesquisado',
    data: 'devolve só registos dessa data, incluindo o registo de origem (dia inteiro)',
    select: 'cada opção devolve só registos com essa descrição',
    prestador: 'o prestador escolhido devolve só registos com o NIF dele',
  }[f.tipo];
  test(
    `${caso} — ${ecra.rotulo}: «${f.rotulo}» ${descricao}${f.com ? ` (com ${f.com.join(' + ')})` : ''}`,
    metaPadrao(ecra, caso, `UC-FIL-${nn}`, { integracao: true, bug: f.bug }),
    async ({ page }) => {
      test.slow();
      const pq = await base(page, ecra, 1, 'sem registos para tirar valores');
      if (!pq) return;

      if (f.tipo === 'select' && !f.com) {
        // Cada opção, sozinha.
        await pq.abrir();
        const opcoes = await pq.opcoesSelect(f.rotulo);
        expect(opcoes.length, `«${f.rotulo}» tem opções`).toBeGreaterThan(0);
        const comRegistos: string[] = [];
        for (const opcao of opcoes) {
          await test.step(`«${f.rotulo}» = "${opcao}"`, async () => {
            const r = await aplicarEVerificar(pq, ecra, f, opcao, {}, { esperarResultados: false });
            if (r.linhas > 0) comRegistos.push(`${opcao} (${r.total})`);
          });
        }
        test.info().annotations.push({ type: 'observacao', description: `${ecra.rota}: opções com registos: ${comRegistos.join(', ') || 'nenhuma'}` });
        expect.soft(comRegistos.length, `${ecra.rota}: pelo menos uma opção de «${f.rotulo}» devolve registos`).toBeGreaterThan(0);
        return;
      }

      const origem = await linhaComValores(pq, ecra, f);
      if (!origem) {
        naoAplicavel(`${ecra.rota}: nenhuma linha da pesquisa de base tem valor em «${f.coluna}»`);
        return;
      }
      if (f.tipo === 'select') {
        // Combinado: os valores distintos da coluna na página de base, cada um com a sua linha.
        const linhas = await tabelaDe(pq, [f.coluna!, ...(f.com ?? []).map((r) => filtroPorRotulo(ecra, r).coluna!)]);
        const vistos = new Map<string, Record<string, string>>();
        for (const l of linhas) if (!vazio(l[f.coluna!]) && !vistos.has(l[f.coluna!])) vistos.set(l[f.coluna!], l);
        for (const [valor, linha] of vistos) {
          await test.step(`«${f.rotulo}» = "${valor}"`, async () => {
            await aplicarEVerificar(pq, ecra, f, valor, linha);
          });
        }
        return;
      }
      const valor = origem.linha[f.coluna!];
      test.info().annotations.push({ type: 'observacao', description: `${ecra.rota}: «${f.rotulo}» = "${valor}" (da pesquisa de base)` });
      await aplicarEVerificar(pq, ecra, f, valor, origem.linha, { linhaOrigem: origem.texto });
    },
  );
}

/** UC-FIL-02 / 03 — identificadores por conteúdo parcial, códigos por igualdade exata. */
export function casoModoComparacao(ecra: EcraConsulta, f: FiltroConfig): void {
  if (!f.modo || f.tipo !== 'texto') return;
  const nn = f.modo === 'parcial' ? '02' : '03';
  const caso = `${nomeCaso('FIL', nn, ecra)}-${slug(f.rotulo)}`;
  test(
    f.modo === 'parcial'
      ? `${caso} — ${ecra.rotulo}: «${f.rotulo}» pesquisa por conteúdo parcial`
      : `${caso} — ${ecra.rotulo}: «${f.rotulo}» pesquisa por igualdade exata`,
    metaPadrao(ecra, caso, `UC-FIL-${nn}`, { integracao: true, bug: 'TASK-20261015-03' }),
    async ({ page }) => {
      test.slow();
      const pq = await base(page, ecra, 1, 'sem registos para tirar valores');
      if (!pq) return;
      const origem = await linhaComValores(pq, ecra, f);
      const valor = origem?.linha[f.coluna!] ?? '';
      if (!origem || valor.length < 3) {
        naoAplicavel(`${ecra.rota}: sem valor com 3+ caracteres em «${f.coluna}» para tirar um excerto`);
        return;
      }
      if (f.modo === 'parcial') {
        // Excerto do meio: não é prefixo nem sufixo do valor.
        const excerto = valor.length > 4 ? valor.slice(1, -1) : valor.slice(1);
        test.info().annotations.push({ type: 'observacao', description: `${ecra.rota}: "${valor}" → excerto "${excerto}"` });
        await aplicarEVerificar(pq, ecra, { ...f, tipo: 'texto' }, excerto, origem.linha, { linhaOrigem: origem.texto });
        return;
      }
      const excerto = valor.slice(0, -1);
      test.info().annotations.push({ type: 'observacao', description: `${ecra.rota}: "${valor}" → excerto "${excerto}"` });
      await pq.abrir();
      await pq.preencher([{ campo: f.rotulo, valor: excerto }]);
      for (const rotulo of f.com ?? []) {
        const outro = filtroPorRotulo(ecra, rotulo);
        await preencherFiltro(pq, criterioDe(outro, origem.linha[outro.coluna!]));
      }
      await pq.pesquisar();
      const celulas = (await pq.contarLinhas()) > 0 ? await pq.valoresColuna(f.coluna!) : [];
      expect
        .soft(celulas.filter((c) => norm(c) !== norm(excerto)).slice(0, 10), `${ecra.rota}: o excerto "${excerto}" só pode devolver registos com «${f.coluna}» igual ao excerto`)
        .toEqual([]);
    },
  );
}

/** Valor que não existe em nenhum registo (aceite pelos campos só de dígitos: ficam os zeros). */
const SEM_CORRESPONDENCIA = 'QA0000000000';

/** UC-FIL-08 — filtro sem correspondência: grelha vazia com a mensagem de «sem resultados». */
export function casoSemResultados(ecra: EcraConsulta): void {
  const f = (configDe(ecra).filtros ?? []).find((x) => x.tipo === 'texto' && !x.com);
  if (!f) return;
  const caso = nomeCaso('FIL', '08', ecra);
  test(
    `${caso} — ${ecra.rotulo}: filtro sem correspondência mostra a grelha vazia com a mensagem de sem resultados`,
    metaPadrao(ecra, caso, 'UC-FIL-08', { bug: 'TASK-20261015-16', tipo: 'negativo' }),
    async ({ page }) => {
      const pq = new PesquisaConsulta(page, ecra.rota, configDe(ecra).endpoint);
      await pq.abrir();
      const antes = (await pq.tabela().celulaVazia().innerText({ timeout: 3_000 }).catch(() => '')).trim();
      await pq.preencher([{ campo: f.rotulo, valor: SEM_CORRESPONDENCIA }]);
      const resposta = pq.esperarResposta();
      await pq.botaoPesquisar().click();
      const r = await resposta;
      expect.soft(r?.status(), `${ecra.rota}: estado HTTP da pesquisa sem correspondência`).toBe(200);
      await pq.esperarGrelha();
      expect.soft(await pq.contarLinhas(), `${ecra.rota}: a grelha fica vazia`).toBe(0);
      const msg = (await pq.tabela().celulaVazia().innerText({ timeout: 3_000 }).catch(() => '')).trim();
      test.info().annotations.push({ type: 'observacao', description: `${ecra.rota}: mensagem de sem resultados "${msg}"` });
      expect.soft(msg, `${ecra.rota}: há mensagem de sem resultados`).not.toBe('');
      expect.soft(msg, `${ecra.rota}: a mensagem de sem resultados é diferente da de antes da pesquisa`).not.toBe(antes);
    },
  );
}

const MSG_CRITERIO_MINIMO = /É necessário preencher pelo menos um dos campos de pesquisa|Deverá estar preenchido, pelo menos/;

/** UC-FIL-09 — pesquisar sem filtros (ou com combinação insuficiente) avisa e não pede ao servidor. */
export function casoCriterioMinimo(ecra: EcraConsulta): void {
  const caso = nomeCaso('FIL', '09', ecra);
  const insuficientes = configDe(ecra).insuficientes ?? [];
  test(
    `${caso} — ${ecra.rotulo}: pesquisar sem filtros${insuficientes.length ? ' ou com combinação insuficiente' : ''} avisa e não pesquisa`,
    metaPadrao(ecra, caso, 'UC-FIL-09', { tipo: 'negativo' }),
    async ({ page }) => {
      const pq = new PesquisaConsulta(page, ecra.rota, configDe(ecra).endpoint);
      for (const criterios of [[], ...insuficientes] as Criterio[][]) {
        await test.step(criterios.length ? `Só ${criterios.map((c) => ('campo' in c ? c.campo : c.select)).join(' + ')}` : 'Sem filtros', async () => {
          await pq.abrir();
          await pq.preencher(criterios);
          const antes = pq.pedidos.length;
          await pq.botaoPesquisar().click();
          await expect.soft(pq.conteudo().getByText(MSG_CRITERIO_MINIMO).first(), `${ecra.rota}: aviso de critério mínimo`).toBeVisible();
          await page.waitForTimeout(1_000);
          expect.soft(pq.pedidos.length - antes, `${ecra.rota}: pedidos de pesquisa feitos`).toBe(0);
        });
      }
    },
  );
}

/** UC-FIL-10 — «Limpar» esvazia todos os campos, incluindo selects e o autocomplete. */
export function casoLimpar(ecra: EcraConsulta): void {
  const caso = nomeCaso('FIL', '10', ecra);
  test(
    `${caso} — ${ecra.rotulo}: «Limpar» esvazia todos os campos de filtro`,
    metaPadrao(ecra, caso, 'UC-FIL-10'),
    async ({ page }) => {
      const cfg = configDe(ecra);
      const pq = new PesquisaConsulta(page, ecra.rota, cfg.endpoint);
      await pq.abrir();
      for (const f of cfg.filtros ?? []) {
        if (f.tipo === 'select') {
          const opcao = (await pq.opcoesSelect(f.rotulo))[0];
          if (opcao) await pq.escolherOpcao(f.rotulo, opcao);
        } else if (f.tipo === 'prestador') {
          const termo = configDe(ecra).prestador?.termos[0] ?? '50';
          if ((await pq.escreverPrestador(termo)).opcoes.length > 0) await pq.escolherPrimeiroPrestador();
        } else {
          await pq.preencher([{ campo: f.rotulo, valor: f.tipo === 'data' ? '01/01/2025' : '1' }]);
        }
      }
      await pq.botaoLimpar().click();
      const sobra = await pq.valoresDosCampos();
      expect.soft(sobra.filter((c) => c.valor !== '').map((c) => `${c.campo}="${c.valor}"`), `${ecra.rota}: campos com valor depois de «Limpar»`).toEqual([]);
    },
  );
}

/** UC-FIL-11 — depois de pesquisar e recarregar, os campos e os resultados mantêm-se. */
export function casoRecarregar(ecra: EcraConsulta): void {
  const caso = nomeCaso('FIL', '11', ecra);
  test(
    `${caso} — ${ecra.rotulo}: recarregar a página mantém os filtros e os resultados`,
    metaPadrao(ecra, caso, 'UC-FIL-11', { bug: 'TASK-20261015-14' }),
    async ({ page }) => {
      const pq = await base(page, ecra, 0, 'sem registos');
      if (!pq) return;
      const campos = (await pq.valoresDosCampos()).filter((c) => c.valor !== '');
      const linhas = await pq.textosLinhas();
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(pq.botaoPesquisar()).toBeVisible({ timeout: 60_000 });
      await pq.esperarGrelha();
      expect.soft((await pq.valoresDosCampos()).filter((c) => c.valor !== ''), `${ecra.rota}: campos preenchidos depois de recarregar`).toEqual(campos);
      expect.soft(await pq.textosLinhas(), `${ecra.rota}: linhas depois de recarregar`).toEqual(linhas);
    },
  );
}

// --- B. Campos que carregam opções --------------------------------------------------------------

/** Texto que parece um código interno e não uma descrição. */
const PARECE_CODIGO = /^(\d+|[A-Z0-9]+(_[A-Z0-9]+)+|[A-Z]{1,5})$/;

function selectsDe(ecra: EcraConsulta): FiltroConfig[] {
  return (configDe(ecra).filtros ?? []).filter((f) => f.tipo === 'select');
}

/** UC-OPC-01 — cada select abre e mostra opções, sem vazias nem repetidas. */
export function casoOpcoesCarregam(ecra: EcraConsulta): void {
  const selects = selectsDe(ecra);
  if (selects.length === 0) return;
  const caso = nomeCaso('OPC', '01', ecra);
  test(
    `${caso} — ${ecra.rotulo}: ${selects.map((s) => `«${s.rotulo}»`).join(', ')} abrem e mostram opções`,
    metaPadrao(ecra, caso, 'UC-OPC-01'),
    async ({ page }) => {
      const pq = new PesquisaConsulta(page, ecra.rota, configDe(ecra).endpoint);
      await pq.abrir();
      for (const s of selects) {
        await test.step(`«${s.rotulo}»`, async () => {
          const opcoes = await pq.opcoesSelect(s.rotulo);
          test.info().annotations.push({ type: 'observacao', description: `${ecra.rota}: «${s.rotulo}» = ${opcoes.join(' | ')}` });
          expect.soft(opcoes.length, `«${s.rotulo}» tem opções`).toBeGreaterThan(0);
          expect.soft(opcoes.filter((o, i) => opcoes.indexOf(o) !== i), `«${s.rotulo}»: opções repetidas`).toEqual([]);
        });
      }
    },
  );
}

/** UC-OPC-02 / 03 — as opções mostram a descrição e vêm de uma resposta do servidor. */
export function casoOpcoesDoServidor(ecra: EcraConsulta): void {
  const selects = selectsDe(ecra);
  if (selects.length === 0) return;
  for (const [nn, uc] of [
    ['02', 'UC-OPC-02'],
    ['03', 'UC-OPC-03'],
  ] as const) {
    const caso = nomeCaso('OPC', nn, ecra);
    // Listas fixas de Estado já registadas (P8): TASK-20261015-09 (Vacinas), -10 (Termas), -11 (Seringas).
    const bug = nn === '03' ? selects.find((s) => /^TASK-20261015-(09|10|11)$/.test(s.bug ?? ''))?.bug : undefined;
    test(
      nn === '02'
        ? `${caso} — ${ecra.rotulo}: as opções dos selects mostram a descrição, não o código`
        : `${caso} — ${ecra.rotulo}: as opções dos selects vêm do servidor (tabela de domínio), não de uma lista fixa`,
      metaPadrao(ecra, caso, uc, { integracao: true, bug }),
      async ({ page }) => {
        const textosApi = nn === '03' ? await recolherTextosApi(page) : null;
        const pq = new PesquisaConsulta(page, ecra.rota, configDe(ecra).endpoint);
        await pq.abrir();
        for (const s of selects) {
          await test.step(`«${s.rotulo}»`, async () => {
            const opcoes = await pq.opcoesSelect(s.rotulo);
            if (nn === '02') {
              expect.soft(opcoes.filter((o) => PARECE_CODIGO.test(o)), `«${s.rotulo}»: opções que parecem códigos`).toEqual([]);
            } else {
              const fora = opcoes.filter((o) => !textosApi!.has(norm(o)));
              expect.soft(fora, `«${s.rotulo}»: opções que não vêm de nenhuma resposta da API (lista fixa no front)`).toEqual([]);
            }
          });
        }
      },
    );
  }
}

/** Junta (normalizados) todos os textos das respostas JSON da API desde já. */
async function recolherTextosApi(page: Page): Promise<Set<string>> {
  const textos = new Set<string>();
  const juntar = (v: unknown): void => {
    if (typeof v === 'string') textos.add(norm(v));
    else if (Array.isArray(v)) v.forEach(juntar);
    else if (v && typeof v === 'object') Object.values(v).forEach(juntar);
  };
  page.on('response', (r) => {
    if (!/\/ccmsns\/api\//.test(r.url()) || !/json/.test(r.headers()['content-type'] ?? '')) return;
    r.json().then(juntar, () => undefined);
  });
  return textos;
}

/** UC-OPC-05 — o mesmo domínio mostra as mesmas opções em dois ecrãs. */
export function casoMesmoDominio(a: EcraConsulta, b: EcraConsulta, rotulo: string, rotuloB = rotulo): void {
  const caso = `CT-CON-OPC-05-${a.sufixo}-${b.sufixo}-${slug(rotulo)}`;
  test(
    `${caso} — «${rotulo}» em ${a.rotulo} e «${rotuloB}» em ${b.rotulo} têm as mesmas opções`,
    metaPadrao(a, caso, 'UC-OPC-05', { integracao: true }),
    async ({ page }) => {
      const listas: string[][] = [];
      for (const [ecra, r] of [
        [a, rotulo],
        [b, rotuloB],
      ] as const) {
        const pq = new PesquisaConsulta(page, ecra.rota, configDe(ecra).endpoint);
        await pq.abrir();
        listas.push(await pq.opcoesSelect(r));
      }
      expect.soft(listas[1], `«${rotuloB}» em ${b.rota} igual a «${rotulo}» em ${a.rota}`).toEqual(listas[0]);
    },
  );
}

/** UC-OPC-06 — o autocomplete do prestador sugere prestadores da área do ecrã. */
export function casoAutocompletePrestador(ecra: EcraConsulta): void {
  const cfg = configDe(ecra);
  if (!cfg.prestador) return;
  const caso = nomeCaso('OPC', '06', ecra);
  test(
    `${caso} — ${ecra.rotulo}: «${ROTULO_PRESTADOR}» sugere prestadores da área (${cfg.prestador.area}), pagina e limpa`,
    metaPadrao(ecra, caso, 'UC-OPC-06', { integracao: true }),
    async ({ page }) => {
      const pq = new PesquisaConsulta(page, ecra.rota, cfg.endpoint);
      await pq.abrir();
      let termo = '';
      let pedido: URL | null = null;
      for (const t of cfg.prestador!.termos) {
        const r = await pq.escreverPrestador(t);
        if (r.opcoes.length > 0) {
          termo = t;
          pedido = r.pedido;
          break;
        }
      }
      if (!termo) {
        naoAplicavel(`${ecra.rota}: nenhum dos termos ${cfg.prestador!.termos.join(', ')} devolve prestadores`);
        return;
      }
      expect.soft(pedido?.searchParams.get('areaConferenciaId'), `${ecra.rota}: o pedido de prestadores leva a área do ecrã`).toBe(String(cfg.prestador!.area));
      const seguinte = pq.listaPrestador().getByRole('button', { name: 'Página seguinte' });
      if ((await seguinte.count()) > 0 && (await seguinte.isEnabled())) {
        const antes = await pq.opcoesPrestador().allInnerTexts();
        await seguinte.click();
        await expect.soft(pq.opcoesPrestador().first(), `${ecra.rota}: «Página seguinte» traz outras sugestões`).not.toHaveText(antes[0]);
      }
      await pq.escolherPrimeiroPrestador();
      await expect.soft(pq.campoPrestador(), `${ecra.rota}: prestador escolhido fica no campo`).not.toHaveValue('');
      await pq.conteudo().getByRole('button', { name: 'Limpar campo' }).first().click();
      await expect.soft(pq.campoPrestador(), `${ecra.rota}: «Limpar campo» esvazia o campo`).toHaveValue('');
    },
  );
}

/** UC-OPC-07 — o autocomplete sem correspondência não mostra sugestões nem dá erro. */
export function casoAutocompleteSemResultados(ecra: EcraConsulta): void {
  const cfg = configDe(ecra);
  if (!cfg.prestador) return;
  const caso = nomeCaso('OPC', '07', ecra);
  test(
    `${caso} — ${ecra.rotulo}: «${ROTULO_PRESTADOR}» sem correspondência não sugere nada e não dá erro`,
    metaPadrao(ecra, caso, 'UC-OPC-07', { tipo: 'negativo' }),
    async ({ page }) => {
      const erros: string[] = [];
      page.on('response', (r) => {
        if (/\/prestadores/.test(r.url()) && r.status() >= 400) erros.push(`${r.status()} ${r.url()}`);
      });
      const pq = new PesquisaConsulta(page, ecra.rota, cfg.endpoint);
      await pq.abrir();
      const r = await pq.escreverPrestador('zzqaxx');
      expect.soft(r.opcoes, `${ecra.rota}: sugestões para um termo sem correspondência`).toEqual([]);
      expect.soft(erros, `${ecra.rota}: respostas de erro de /prestadores`).toEqual([]);
    },
  );
}

/** UC-OPC-08 — Cuidados Continuados: cada select mostra o domínio que o rótulo indica. */
export function casoRotuloCorrespondeConteudo(ecra: EcraConsulta): void {
  const verif = configDe(ecra).rotulosDominio;
  if (!verif) return;
  const caso = nomeCaso('OPC', '08', ecra);
  test(
    `${caso} — ${ecra.rotulo}: cada select mostra opções do domínio que o rótulo indica`,
    metaPadrao(ecra, caso, 'UC-OPC-08', { integracao: true }),
    async ({ page }) => {
      const pq = new PesquisaConsulta(page, ecra.rota, configDe(ecra).endpoint);
      await pq.abrir();
      for (const v of verif) {
        const opcoes = await pq.opcoesSelect(v.rotulo);
        test.info().annotations.push({ type: 'observacao', description: `${ecra.rota}: «${v.rotulo}» = ${opcoes.join(' | ')}` });
        expect.soft(opcoes.filter((o) => !v.dominio.test(o)), `«${v.rotulo}»: opções fora do domínio (${v.descricao})`).toEqual([]);
      }
    },
  );
}

// --- quadro: mensagem de sem resultados (todos os ecrãs) ---------------------------------------

/** UC-FIL-08 (quadro) — a mensagem de sem resultados é a mesma em todos os ecrãs. */
export function casoQuadroSemResultados(): void {
  const caso = 'CT-CON-FIL-08-QUADRO';
  test(
    `${caso} — A mensagem de sem resultados é a mesma nos ${ecrasComPadroes().length} ecrãs`,
    meta({
      caso,
      requisitos: ['RF29'],
      plano: `${PLANO_PADROES_PESQUISA} — UC-FIL-08`,
      tipoTeste: 'caixa-preta',
      bug: 'TASK-20261015-16',
      tipo: 'negativo',
    }),
    async ({ page }) => {
      test.setTimeout(600_000);
      const linhas: { ecra: string; msg: string }[] = [];
      for (const ecra of ecrasComPadroes()) {
        const f = (configDe(ecra).filtros ?? []).find((x) => x.tipo === 'texto' && !x.com);
        if (!f) continue;
        await test.step(`${ecra.item} → ${ecra.rotulo}`, async () => {
          const pq = new PesquisaConsulta(page, ecra.rota, configDe(ecra).endpoint);
          await pq.abrir();
          await pq.preencher([{ campo: f.rotulo, valor: SEM_CORRESPONDENCIA }]);
          await pq.pesquisar().catch(() => undefined);
          linhas.push({ ecra: `${ecra.item} → ${ecra.rotulo}`, msg: (await pq.tabela().celulaVazia().innerText({ timeout: 3_000 }).catch(() => '(sem mensagem)')).trim() });
        });
      }
      await test.info().attach('quadro-sem-resultados.md', {
        body: ['| Ecrã | Mensagem |', '|---|---|', ...linhas.map((l) => `| ${l.ecra} | ${l.msg} |`)].join('\n'),
        contentType: 'text/markdown',
      });
      expect.soft([...new Set(linhas.map((l) => l.msg))], 'mensagens de sem resultados diferentes (devia haver uma só)').toHaveLength(1);
    },
  );
}

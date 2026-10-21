import { expect, test, type Locator, type Page, type Request } from '@playwright/test';
import {
  MSG_ANTES_PESQUISA,
  MSG_SEM_RESULTADOS_PESQUISA,
  type PaginaPesquisaDadosReferencia,
} from './PaginaPesquisaDadosReferencia';
import type { PaginaDetalheDadosReferencia } from './PaginaDetalheDadosReferencia';

/**
 * VerificaÃ§Ãµes do **padrÃ£o comum** (Parte A do roteiro de deploy dos padrÃµes de UI de
 * Dados de ReferÃªncia). Cada funÃ§Ã£o corresponde a um passo `Axx` do roteiro e usa
 * `expect.soft`, para que um passo com vÃ¡rios critÃ©rios reporte todos os que falham
 * (o relatÃ³rio mostra cada critÃ©rio em separado, como a checklist manual).
 */

/** Palavras que nÃ£o levam maiÃºscula num tÃ­tulo em "iniciais maiÃºsculas". */
const PALAVRAS_MINUSCULAS = new Set(['a', 'o', 'e', 'de', 'da', 'do', 'das', 'dos', 'em', 'para', 'por', 'com']);

/** Palavras do tÃ­tulo que deviam comeÃ§ar por maiÃºscula e nÃ£o comeÃ§am. */
export function palavrasSemMaiuscula(titulo: string): string[] {
  return titulo
    .split(/\s+/)
    .filter((p) => /^[\p{L}]/u.test(p) && !PALAVRAS_MINUSCULAS.has(p))
    .filter((p) => p[0] !== p[0].toLocaleUpperCase('pt-PT'));
}

/** Regista na anotaÃ§Ã£o do teste um critÃ©rio que nÃ£o se aplica nesta tela/massa (âž– na checklist). */
export function naoAplicavel(motivo: string): void {
  test.info().annotations.push({ type: 'nao-aplicavel', description: motivo });
}

/** dd/mm/aaaa â†’ nÃºmero ordenÃ¡vel (aaaammdd); `null` para vazio/"â€”". */
export function dataParaNumero(texto: string): number | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(texto.trim());
  return m ? Number(`${m[3]}${m[2]}${m[1]}`) : null;
}

/**
 * Compara dois valores de cÃ©lula como o servidor os ordena: datas pelo valor
 * cronolÃ³gico, nÃºmeros pelo valor numÃ©rico e o resto como texto (pt-PT).
 */
export function compararCelulas(a: string, b: string): number {
  const da = dataParaNumero(a);
  const db = dataParaNumero(b);
  if (da !== null && db !== null) return da - db;
  const na = Number(a.replace(',', '.'));
  const nb = Number(b.replace(',', '.'));
  if (a !== '' && b !== '' && !Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return a.localeCompare(b, 'pt-PT', { sensitivity: 'base', numeric: true });
}

/**
 * Comparadores aceites para "estÃ¡ ordenado": o do servidor depende do tipo da coluna na BD
 * (cÃ³digos guardados como texto ordenam lexicograficamente, "10" antes de "9"). Datas
 * `dd/mm/aaaa` comparam-se sempre pelo valor cronolÃ³gico (Ã© o que o roteiro exige).
 */
const COMPARADORES: ((a: string, b: string) => number)[] = [
  compararCelulas,
  (a, b) => {
    const da = dataParaNumero(a);
    const db = dataParaNumero(b);
    if (da !== null && db !== null) return da - db;
    return a.localeCompare(b, 'pt-PT', { sensitivity: 'base' });
  },
  (a, b) => {
    const da = dataParaNumero(a);
    const db = dataParaNumero(b);
    if (da !== null && db !== null) return da - db;
    return a < b ? -1 : a > b ? 1 : 0;
  },
];

/** OrdenaÃ§Ã£o pelo nÃºmero sem o prefixo de letras (ex.: "D1", "C1", "D10" â€” N.Âº Prescritor). */
const semPrefixo = (a: string, b: string) => {
  const x = a.replace(/^[A-Za-z]+/, '');
  const y = b.replace(/^[A-Za-z]+/, '');
  return x < y ? -1 : x > y ? 1 : 0;
};

const ordenadoCom = (v: string[], sentido: 'asc' | 'desc', cmp: (a: string, b: string) => number) =>
  v.every((x, i) => {
    if (i === 0) return true;
    const c = cmp(v[i - 1], x);
    return sentido === 'asc' ? c <= 0 : c >= 0;
  });

export function estaOrdenado(valores: string[], sentido: 'asc' | 'desc'): boolean {
  const v = valores.filter((x) => x !== '' && x !== 'â€”');
  if (COMPARADORES.some((cmp) => ordenadoCom(v, sentido, cmp))) return true;
  if (ordenadoCom(v, sentido, semPrefixo)) {
    test.info().annotations.push({
      type: 'observacao',
      description: `ordenado pelo nÃºmero sem o prefixo de letras, como texto (${v.slice(0, 6).join(', ')}â€¦) â€” confirmar se Ã© a ordem esperada`,
    });
    return true;
  }
  return false;
}

/** A01 â€” tela aberta sem pesquisar. */
export async function verificarEstadoAntesPesquisa(pag: PaginaPesquisaDadosReferencia): Promise<void> {
  await test.step('A tabela aparece vazia, com o texto de "antes da pesquisa"', async () => {
    await expect.soft(pag.tabela()).toBeVisible();
    await expect.soft(pag.linhasDados()).toHaveCount(0);
    await expect.soft(pag.textoTabelaVazia()).toHaveText(MSG_ANTES_PESQUISA);
  });
  await test.step('O breadcrumb do topo nÃ£o aparece', async () => {
    await expect.soft(pag.breadcrumb()).toHaveCount(0);
  });
  await test.step('O tÃ­tulo Ã© "Pesquisa â€¦" com iniciais maiÃºsculas', async () => {
    const titulo = (await pag.titulo().textContent())?.trim() ?? '';
    expect.soft(titulo, 'tÃ­tulo h1 comeÃ§a por "Pesquisa"').toMatch(/^Pesquisa\b/);
    expect.soft(palavrasSemMaiuscula(titulo), `palavras sem inicial maiÃºscula em "${titulo}"`).toEqual([]);
  });
}

/** A07 â€” grelha depois de uma pesquisa vÃ¡lida. */
export async function verificarGrelhaResultados(pag: PaginaPesquisaDadosReferencia): Promise<void> {
  await expect(pag.linhasDados().first()).toBeVisible();
  const grelha = await pag.tabela().evaluate((tabela) => {
    const ths = Array.from(tabela.querySelectorAll('thead th'));
    const linhas = Array.from(tabela.querySelectorAll('tbody tr')).filter((tr) =>
      tr.querySelector('td[headers="actions"]'),
    );
    const celulasDados = linhas.flatMap((tr) =>
      Array.from(tr.querySelectorAll('td')).filter((td) => td.getAttribute('headers') !== 'actions'),
    );
    const botaoAcao = tabela.querySelector('td[headers="actions"] button');
    const h1 = document.querySelector('h1');
    return {
      zebrado: linhas.every((tr, i) =>
        Array.from(tr.querySelectorAll('td')).every((td) =>
          td.classList.contains(i % 2 === 0 ? 'odd-row' : 'even-row'),
        ),
      ),
      compacta: celulasDados.every((td) => {
        const w = td.querySelector('.Traceability Suite-tablev2-cell-content-wrapper');
        return !!w && getComputedStyle(w).webkitLineClamp === '2';
      }),
      naoAlinhadasEsquerda: celulasDados
        .filter((td) => !['left', 'start'].includes(getComputedStyle(td).textAlign))
        .map((td) => `${td.getAttribute('headers')}=${getComputedStyle(td).textAlign}`),
      primeiraColuna: {
        id: ths[0]?.id,
        texto: (ths[0]?.textContent ?? '').trim(),
        rotulo: ths[0]?.getAttribute('aria-label'),
      },
      colunasAcoes: ths.filter((th) => th.id === 'actions' || /^A[cÃ§]?Ã§Ãµes$/i.test(th.getAttribute('abbr') ?? ''))
        .length,
      corIcone: botaoAcao ? getComputedStyle(botaoAcao).color : null,
      corPrimaria: h1 ? getComputedStyle(h1).color : null,
    };
  });

  await test.step('Linhas compactas e zebradas', async () => {
    expect.soft(grelha.compacta, 'cÃ©lulas a no mÃ¡ximo 2 linhas (modo compacto)').toBe(true);
    expect.soft(grelha.zebrado, 'linhas alternam odd-row/even-row').toBe(true);
  });
  await test.step('Tudo alinhado Ã  esquerda', async () => {
    expect.soft(grelha.naoAlinhadasEsquerda, 'cÃ©lulas de dados nÃ£o alinhadas Ã  esquerda').toEqual([]);
  });
  await test.step('A 1.Âª coluna tem os Ã­cones de aÃ§Ã£o, sem tÃ­tulo visÃ­vel, e hÃ¡ sÃ³ uma coluna de aÃ§Ãµes', async () => {
    expect.soft(grelha.primeiraColuna.id, 'id da 1.Âª coluna').toBe('actions');
    expect.soft(grelha.primeiraColuna.texto, 'tÃ­tulo visÃ­vel da coluna de aÃ§Ãµes').toBe('');
    expect.soft(grelha.primeiraColuna.rotulo, 'rÃ³tulo acessÃ­vel da coluna de aÃ§Ãµes').toBe('AÃ§Ãµes');
    expect.soft(grelha.colunasAcoes, 'nÂº de colunas de aÃ§Ãµes').toBe(1);
  });
  await test.step('Os Ã­cones de aÃ§Ã£o usam a cor primÃ¡ria', async () => {
    expect.soft(grelha.corIcone, 'cor do Ã­cone = cor primÃ¡ria (a do tÃ­tulo h1)').toBe(grelha.corPrimaria);
  });
  await test.step('O botÃ£o Exportar fica ativo', async () => {
    if ((await pag.botaoExportar().count()) === 0) {
      naoAplicavel(`${pag.tela.nome}: a pesquisa nÃ£o tem botÃ£o Exportar`);
      return;
    }
    await expect.soft(pag.botaoExportar()).toBeEnabled();
  });
}

/** Caixa (px) de um elemento. */
async function caixa(pag: PaginaPesquisaDadosReferencia, coluna: string) {
  const b = await pag.cabecalhoOrdenavel(coluna).boundingBox();
  return b ? { w: Math.round(b.width), h: Math.round(b.height) } : null;
}

/** Espera o pedido GET da grelha com o `sort` indicado (ordenaÃ§Ã£o no servidor). */
export function esperarPedidoComSort(page: Page, sort: RegExp, timeout?: number): Promise<Request> {
  return page.waitForRequest((r) => r.method() === 'GET' && sort.test(decodeURIComponent(r.url())), {
    timeout,
  });
}

/** A08 â€” ordenar asc/desc, cabeÃ§alho estÃ¡vel e ordem que continua na pÃ¡gina 2. */
export async function verificarOrdenacaoServidor(
  pag: PaginaPesquisaDadosReferencia,
  coluna: string,
): Promise<void> {
  const th = pag.cabecalhoOrdenavel(coluna);
  await expect(th, `coluna "${coluna}" Ã© ordenÃ¡vel`).toBeVisible();
  const antes = await caixa(pag, coluna);

  await test.step(`1.Âº clique em "${coluna}" ordena ascendente (pedido ao servidor com sort=â€¦,asc)`, async () => {
    await th.hover();
    const emHover = await caixa(pag, coluna);
    expect.soft(emHover, 'cabeÃ§alho nÃ£o muda de tamanho ao aparecer o Ã­cone (hover)').toEqual(antes);
    await pag.ordenarPor(coluna, 'ascending');
    const valores = await pag.valoresColuna(coluna);
    expect.soft(estaOrdenado(valores, 'asc'), `linhas em ordem ascendente (${valores.join(' | ')})`).toBe(true);
  });

  await test.step(`2.Âº clique em "${coluna}" ordena descendente`, async () => {
    await pag.ordenarPor(coluna, 'descending');
    await pag.page.mouse.move(0, 0);
    // A largura acompanha o conteÃºdo das novas linhas; o Ã­cone sÃ³ pode afetar a altura.
    expect.soft(await caixa(pag, coluna).then((c) => c?.h), 'altura do cabeÃ§alho igual com o Ã­cone visÃ­vel').toBe(antes?.h);
    const valores = await pag.valoresColuna(coluna);
    expect.soft(estaOrdenado(valores, 'desc'), `linhas em ordem descendente (${valores.join(' | ')})`).toBe(true);
  });

  await test.step('A pÃ¡gina 2 continua a sequÃªncia (ordenaÃ§Ã£o no servidor)', async () => {
    const seguinte = pag.botaoPaginaSeguinte();
    if ((await seguinte.count()) === 0 || (await seguinte.isDisabled())) {
      naoAplicavel(`${pag.tela.nome}: a massa sÃ³ tem 1 pÃ¡gina â€” continuidade na pÃ¡gina 2 nÃ£o verificÃ¡vel`);
      return;
    }
    const pagina1 = await pag.valoresColuna(coluna);
    let pedido = esperarPedidoComSort(pag.page, /[?&]sort=[^&]+,desc/, 5_000);
    await seguinte.click();
    if (!(await pedido.then(() => true, () => false))) {
      test.info().annotations.push({
        type: 'observacao',
        description: `${pag.tela.nome}: o 1.Âº clique em "pÃ¡gina seguinte" nÃ£o fez pedido; repetido`,
      });
      pedido = esperarPedidoComSort(pag.page, /[?&]sort=[^&]+,desc/, 5_000);
      await seguinte.click();
      const ok = await pedido.then(() => true, () => false);
      expect(ok, 'a pÃ¡gina 2 Ã© pedida ao servidor mantendo o sort').toBe(true);
    }
    await pag.esperarResultados();
    const pagina2 = await pag.valoresColuna(coluna);
    expect
      .soft(
        estaOrdenado([...pagina1, ...pagina2], 'desc'),
        `pÃ¡gina 2 continua a ordem da pÃ¡gina 1 (${pagina1.at(-1)} â†’ ${pagina2[0]})`,
      )
      .toBe(true);
  });
}

/** A09 â€” coluna de data em ordem cronolÃ³gica. */
export async function verificarOrdenacaoData(pag: PaginaPesquisaDadosReferencia, coluna: string): Promise<void> {
  await pag.ordenarPor(coluna, 'ascending');
  const datas = (await pag.valoresColuna(coluna))
    .map(dataParaNumero)
    .filter((d): d is number => d !== null);
  expect(datas.length, 'a coluna tem datas para comparar').toBeGreaterThan(1);
  expect(datas, 'ordem cronolÃ³gica (nÃ£o pela ordem do texto dd/mm/aaaa)').toEqual([...datas].sort((a, b) => a - b));
}

/** A06 â€” pesquisa sem resultado mostra o texto prÃ³prio, diferente do de A01. */
export async function verificarPesquisaSemResultado(pag: PaginaPesquisaDadosReferencia): Promise<void> {
  await expect(pag.linhasDados()).toHaveCount(0);
  await expect(pag.textoTabelaVazia()).toHaveText(MSG_SEM_RESULTADOS_PESQUISA);
  expect(MSG_SEM_RESULTADOS_PESQUISA).not.toBe(MSG_ANTES_PESQUISA);
}

/**
 * A12 â€” pÃ¡gina de detalhe: `h1` + subsecÃ§Ãµes `h2` menores; cabeÃ§alho num cartÃ£o
 * colapsÃ¡vel com as aÃ§Ãµes (Exportar / "Ir paraâ€¦") no topo; listas como painÃ©is
 * colapsÃ¡veis (ou abas) num Ãºnico cartÃ£o; "Voltar" no rodapÃ©.
 */
export async function verificarPaginaDetalhe(
  det: PaginaDetalheDadosReferencia,
  opcoes: { listasEmAbas?: boolean } = {},
): Promise<void> {
  await expect(det.titulo()).toBeVisible();
  const e = await det.estrutura();
  const h1 = e.titulos.filter((t) => t.nivel === 1);
  const h2 = e.titulos.filter((t) => t.nivel === 2);

  await test.step('O tÃ­tulo Ã© um h1 e as subseÃ§Ãµes sÃ£o h2, menores', async () => {
    expect.soft(h1.length, 'um Ãºnico h1').toBe(1);
    const tamH1 = h1[0]?.tamanhoFonte ?? 0;
    for (const t of h2) {
      expect.soft(t.tamanhoFonte, `h2 "${t.texto}" menor que o h1`).toBeLessThan(tamH1);
    }
    const outros = e.titulos.filter((t) => t.nivel > 2 && t.cartao >= 0);
    expect.soft(outros.map((t) => `h${t.nivel} ${t.texto}`), 'tÃ­tulos abaixo de h2 nos cartÃµes').toEqual([]);
  });

  const cartaoCabecalho = h1[0]?.cartao ?? -1;
  await test.step('O cabeÃ§alho Ã© um cartÃ£o colapsÃ¡vel com as aÃ§Ãµes no topo', async () => {
    expect.soft(cartaoCabecalho, 'o h1 estÃ¡ dentro de um cartÃ£o').toBeGreaterThanOrEqual(0);
    expect.soft(h1[0]?.colapsavel, 'o cartÃ£o do cabeÃ§alho tem Colapsar/Expandir').toBe(true);
    const acoes = e.botoes.filter((b) => /^(Exportar|Ir para)/.test(b.rotulo));
    if (acoes.length === 0) {
      naoAplicavel('o cabeÃ§alho deste detalhe nÃ£o tem aÃ§Ãµes Exportar / "Ir paraâ€¦"');
    }
    for (const a of acoes) {
      expect.soft(a.cartao, `"${a.rotulo}" estÃ¡ no cartÃ£o do cabeÃ§alho`).toBe(cartaoCabecalho);
    }
  });

  await test.step(
    opcoes.listasEmAbas
      ? 'As listas estÃ£o em abas dentro de um Ãºnico cartÃ£o'
      : 'As listas sÃ£o painÃ©is colapsÃ¡veis dentro de um Ãºnico cartÃ£o',
    async () => {
      if (opcoes.listasEmAbas) {
        expect.soft(e.abas.length, 'hÃ¡ abas').toBeGreaterThan(0);
        expect.soft(new Set(e.abas.map((a) => a.cartao)).size, 'abas num sÃ³ cartÃ£o').toBe(1);
        return;
      }
      const paineis = h2.filter((t) => t.colapsavel);
      expect.soft(paineis.length, 'hÃ¡ painÃ©is de lista colapsÃ¡veis (h2 com Colapsar)').toBeGreaterThan(0);
      const cartoes = new Set(paineis.map((t) => t.cartao));
      expect.soft([...cartoes].length, `painÃ©is num sÃ³ cartÃ£o (${paineis.map((p) => p.texto).join(', ')})`).toBe(1);
      expect.soft([...cartoes][0], 'o cartÃ£o das listas Ã© diferente do cabeÃ§alho').not.toBe(cartaoCabecalho);
    },
  );

  await test.step('"Voltar" fica no rodapÃ©', async () => {
    const voltar = e.botoes.filter((b) => b.rotulo === 'Voltar');
    expect.soft(voltar.length, 'um botÃ£o "Voltar"').toBe(1);
    expect.soft(voltar[0]?.cartao, '"Voltar" fora dos cartÃµes').toBe(-1);
    expect.soft(voltar[0]?.topo ?? 0, '"Voltar" abaixo do Ãºltimo cartÃ£o').toBeGreaterThanOrEqual(e.fundoUltimoCartao);
  });
}

/** A16 â€” Estado em texto simples (sem badge/chip) no conteÃºdo da pÃ¡gina. */
export async function verificarEstadoComoTexto(page: Page): Promise<void> {
  const badges = page.locator(
    '.Traceability SuiteTemplate__content [class*="MuiChip"], .Traceability SuiteTemplate__content [class*="MuiBadge"], .Traceability SuiteTemplate__content [class*="badge"]',
  );
  await expect(badges, 'sem badge/pastilha colorida no conteÃºdo').toHaveCount(0);
}

/** Textos da coluna de um `<th>` numa tabela qualquer (linhas de dados, sem a cÃ©lula de vazio). */
export async function valoresDaColuna(tabela: Locator, th: Locator): Promise<string[]> {
  const abbr = await th.getAttribute('abbr');
  return tabela.evaluate((t, nome) => {
    const idx = Array.from(t.querySelectorAll('thead th')).findIndex((x) => x.getAttribute('abbr') === nome);
    return Array.from(t.querySelectorAll('tbody tr'))
      .filter((tr) => !tr.querySelector('td[colspan]'))
      .map((tr) => (tr.querySelectorAll('td')[idx]?.textContent ?? '').trim());
  }, abbr);
}

/**
 * Ordena uma lista (sub-tabela de um detalhe, ou outra tabela) pela coluna indicada â€” ou a
 * 1.Âª ordenÃ¡vel â€” e verifica `aria-sort`, a ordem das linhas e, com `servidor`, o pedido
 * `sort=â€¦` ao servidor. Espera a tabela sair do carregamento antes de clicar (o `TableV2`
 * ignora cliques de ordenaÃ§Ã£o enquanto carrega).
 */
export async function verificarOrdenacaoLista(
  page: Page,
  tabela: Locator,
  opcoes: { coluna?: string; servidor?: boolean; descricao?: string } = {},
): Promise<void> {
  const nome = opcoes.descricao ?? opcoes.coluna ?? '1.Âª coluna ordenÃ¡vel';
  const th = opcoes.coluna
    ? tabela.getByRole('columnheader', { name: `Ordenar por ${opcoes.coluna}`, exact: true })
    : tabela.locator('thead th[aria-label^="Ordenar por"]').first();
  await expect.soft(th, `"${nome}" Ã© ordenÃ¡vel`).toBeVisible();
  if (!(await th.isVisible())) return;
  await expect(tabela.locator('td.Traceability Suite-tablev2-cell-loading')).toHaveCount(0);
  const pedido = opcoes.servidor ? esperarPedidoComSort(page, /[?&]sort=[^&]+,asc/, 5_000) : null;
  await th.click();
  await expect.soft(th, `"${nome}" ordenada ascendente`).toHaveAttribute('aria-sort', 'ascending');
  if (pedido) {
    expect.soft(await pedido.then(() => true, () => false), `"${nome}": pedido ao servidor com sort`).toBe(true);
  }
  await expect(tabela.locator('td.Traceability Suite-tablev2-cell-loading')).toHaveCount(0);
  const valores = await valoresDaColuna(tabela, th);
  expect.soft(estaOrdenado(valores, 'asc'), `"${nome}": linhas em ordem ascendente (${valores.join(' | ')})`).toBe(true);
}

/** Mensagens do filtro de preÃ§os (`ccmsns-ui` `src/commons/filtros/precos.ts`). */
export const MSG_FILTROS_PRECOS = {
  precoInvalido: 'Introduza um preÃ§o vÃ¡lido.',
  precoMaximoInferior: 'O preÃ§o mÃ¡ximo nÃ£o pode ser inferior ao preÃ§o mÃ­nimo.',
  dataFimAnterior: 'A data de fim nÃ£o pode ser anterior Ã  data de inÃ­cio.',
} as const;

/** "1.234,50 â‚¬" / "12,5" â†’ 1234.5 (NaN se nÃ£o for nÃºmero). */
export function numeroPt(texto: string): number {
  return Number(texto.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
}

/**
 * Filtro de preÃ§os de uma lista de detalhe (Vacinas, HemodiÃ¡lise, ServiÃ§os DP): campos
 * "PreÃ§o mÃ­nimo"/"PreÃ§o mÃ¡ximo"/"Data InÃ­cio"/"Data Fim" e botÃµes Filtrar/Limpar no
 * corpo do painel "Lista de PreÃ§os".
 */
export class FiltroPrecos {
  constructor(
    readonly page: Page,
    readonly corpo: Locator,
  ) {}
  campo(rotulo: 'PreÃ§o mÃ­nimo' | 'PreÃ§o mÃ¡ximo' | 'Data InÃ­cio' | 'Data Fim'): Locator {
    return this.corpo.getByRole('textbox', { name: rotulo, exact: true });
  }
  botaoFiltrar(): Locator {
    return this.corpo.getByRole('button', { name: 'Filtrar', exact: true });
  }
  tabela(): Locator {
    return this.corpo.locator('table').first();
  }
  /** Escreve a data e sai do campo com Tab (Enter submete o formulÃ¡rio do filtro). */
  async data(rotulo: 'Data InÃ­cio' | 'Data Fim', ddmmaaaa: string): Promise<void> {
    const campo = this.campo(rotulo);
    await campo.click();
    await campo.pressSequentially(ddmmaaaa);
    await campo.press('Tab');
    await expect(campo).toHaveValue(ddmmaaaa);
  }
  /** PreÃ§os da coluna "PreÃ§o"/"PreÃ§o unitÃ¡rio" da lista. */
  async precos(): Promise<number[]> {
    await expect(this.tabela().locator('td.Traceability Suite-tablev2-cell-loading')).toHaveCount(0);
    const th = this.tabela().locator('thead th[abbr^="PreÃ§o"]').first();
    return (await valoresDaColuna(this.tabela(), th)).map(numeroPt).filter((n) => !Number.isNaN(n));
  }
}

/** B8.4 / B9.3 â€” preÃ§o mÃ¡ximo menor que o mÃ­nimo: mensagem e filtro nÃ£o aplicado. */
export async function verificarPrecoMaximoInferior(f: FiltroPrecos, escritasOuPedidos: string[]): Promise<void> {
  const antes = escritasOuPedidos.length;
  await f.campo('PreÃ§o mÃ­nimo').fill('10');
  await f.campo('PreÃ§o mÃ¡ximo').fill('5');
  await f.botaoFiltrar().click();
  await expect.soft(f.corpo.getByText(MSG_FILTROS_PRECOS.precoMaximoInferior)).toBeVisible();
  await f.page.waitForTimeout(500);
  expect.soft(escritasOuPedidos.slice(antes), 'nenhum pedido com o filtro invÃ¡lido').toEqual([]);
}

/** B8.5 / B9.3 â€” preÃ§o negativo e data fim anterior Ã  data inÃ­cio: mensagens de validaÃ§Ã£o. */
export async function verificarPrecoNegativoEDatas(f: FiltroPrecos): Promise<void> {
  await test.step('PreÃ§o negativo', async () => {
    await f.campo('PreÃ§o mÃ­nimo').fill('');
    await f.campo('PreÃ§o mÃ­nimo').pressSequentially('-5');
    const valor = await f.campo('PreÃ§o mÃ­nimo').inputValue();
    if (!valor.includes('-')) {
      naoAplicavel(`o campo nÃ£o aceita o sinal "-" (ficou "${valor}") â€” o preÃ§o negativo nÃ£o chega a ser introduzido`);
    } else {
      await f.botaoFiltrar().click();
      await expect.soft(f.corpo.locator('[role="alert"], .Mui-error, [class*="error"]').first()).toBeVisible();
    }
    await f.campo('PreÃ§o mÃ­nimo').fill('');
  });
  await test.step('Data fim anterior Ã  data inÃ­cio', async () => {
    await f.data('Data InÃ­cio', '10/10/2025');
    await f.data('Data Fim', '01/01/2025');
    await f.botaoFiltrar().click();
    await expect.soft(f.corpo.getByText(MSG_FILTROS_PRECOS.dataFimAnterior)).toBeVisible();
  });
}

/** B8.6 / B9.3 / B10.4 â€” intervalo vÃ¡lido: a lista mostra sÃ³ preÃ§os dentro do intervalo. */
export async function verificarIntervaloPrecosValido(f: FiltroPrecos): Promise<void> {
  const todos = await f.precos();
  if (todos.length === 0) {
    naoAplicavel('a lista de preÃ§os deste registo estÃ¡ vazia no ambiente â€” intervalo nÃ£o verificÃ¡vel');
    return;
  }
  const alvo = Math.min(...todos);
  const txt = String(alvo).replace('.', ',');
  await f.campo('PreÃ§o mÃ­nimo').fill(String(alvo));
  await f.campo('PreÃ§o mÃ¡ximo').fill(String(alvo));
  await f.botaoFiltrar().click();
  await expect(f.tabela().locator('td.Traceability Suite-tablev2-cell-loading')).toHaveCount(0);
  await expect.poll(async () => (await f.precos()).every((p) => p === alvo), {
    message: `todos os preÃ§os listados = ${txt} (intervalo [${txt}; ${txt}])`,
  }).toBe(true);
  expect.soft((await f.precos()).length, 'pelo menos 1 preÃ§o dentro do intervalo').toBeGreaterThan(0);
}

/**
 * B2.4 â€” formataÃ§Ã£o das sub-tabelas: datas `dd/mm/aaaa` (vazias como "â€”"), moeda com "â‚¬",
 * percentagens com "%", e nada de ISO cru, `null`/`undefined`/`NaN`.
 */
export async function verificarFormatacaoTabelas(tabelas: Locator): Promise<void> {
  const problemas = await tabelas.evaluateAll((ts) =>
    ts.flatMap((t) => {
      const ths = Array.from(t.querySelectorAll('thead th')).map((h) => h.getAttribute('abbr') ?? '');
      return Array.from(t.querySelectorAll('tbody tr'))
        .filter((tr) => !tr.querySelector('td[colspan]'))
        .flatMap((tr) =>
          Array.from(tr.querySelectorAll('td')).flatMap((td, i) => {
            const col = ths[i] ?? '';
            const v = (td.textContent ?? '').trim();
            const erros: string[] = [];
            if (/\d{4}-\d{2}-\d{2}/.test(v) || /\b(null|undefined|NaN)\b/.test(v)) erros.push(`${col}="${v}" (valor cru)`);
            if (/^data|inÃ­cio$|fim$/i.test(col) && !/^(\d{2}\/\d{2}\/\d{4}|â€”)$/.test(v)) erros.push(`${col}="${v}" (data)`);
            if (/preÃ§o|valor|montante|dÃ©bito|crÃ©dito|saldo/i.test(col) && v !== 'â€”' && !/â‚¬/.test(v)) erros.push(`${col}="${v}" (moeda)`);
            if (/%|percent/i.test(col) && v !== 'â€”' && !/%/.test(v)) erros.push(`${col}="${v}" (percentagem)`);
            return erros;
          }),
        );
    }),
  );
  expect.soft(problemas, 'cÃ©lulas mal formatadas').toEqual([]);
}

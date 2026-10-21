import { expect, test } from '../fixtures';
import type { Locator, Page } from '@playwright/test';
import { abrirRota } from '../../paginas/appMock';
import { naoAplicavel } from '../../paginas/dadosReferencia/padraoUi';
import { meta } from '../apoio';

/**
 * Apoio comum aos casos de padrÃ£o das pesquisas de **Consulta por Ãrea de PrestaÃ§Ã£o**
 * (plano `docs/ready-for-test-taiga-09-10-2026/plano-validacao-ready-for-test.md` Â§4.1):
 *   - `CT-REG-TASK-20260928-04` (#1565) â€” sem breadcrumb na pesquisa aberta pelo menu; com
 *     breadcrumb no detalhe;
 *   - `CT-REG-TASK-20260928-05` (#1566) â€” placeholders com instruÃ§Ã£o de preenchimento.
 *
 * Menu, rotas e breadcrumb confirmados em `ccmsns-ui` `origin/develop` (sÃ³ leitura,
 * `1865324`, 09-10-2026):
 *   - `src/layout/MainLayout.tsx` â€” grupo `consulta-area-prestacao` (Â«Ãrea de PrestaÃ§Ã£oÂ»), um
 *     submenu por Item (`area-<id>`) e uma folha por RÃ³tulo com `url`; o Traceability Suite Menu desenha
 *     cada nÃ³ como `a[role=menuitem]`, com `aria-controls="submenu-<_id>"` nos grupos e
 *     `href=<url>` nas folhas, e o submenu como `nav#submenu-<_id>`;
 *   - `ROTAS_SEM_BREADCRUMB` (mesmo ficheiro) â€” as 26 rotas abaixo estÃ£o na lista;
 *   - breadcrumb: `Breadcrumb` do `@Traceability Suite/ui-react` â†’ `nav.breadcrumb`, um
 *     `li.breadcrumb__item` por nÃ­vel, `a[href]` sÃ³ nos nÃ­veis com `url`, `is-active` no atual.
 *
 * Nota: o Â§4.1 do plano fala em 27 pesquisas, mas o menu de `origin/develop` tem **26**
 * folhas com rota neste grupo (a 27.Âª entrada, Â«FacturaÃ§Ã£o de Migrantes (em breve)Â», nÃ£o
 * tem ecrÃ£). A lista segue o menu.
 */

/** Plano de origem (caminho relativo Ã  raiz `mptech/`). */
export const PLANO_READY_FOR_TEST_CONSULTA =
  'CCM/ccmsns-qa-e2e/docs/ready-for-test-taiga-09-10-2026/plano-validacao-ready-for-test.md';

/** RÃ³tulo do grupo no menu lateral (o `test.describe` mantÃ©m Â«Consulta por Ãrea de PrestaÃ§Ã£oÂ»). */
export const GRUPO_MENU_CONSULTA = 'Ãrea de PrestaÃ§Ã£o';
const ID_GRUPO_MENU_CONSULTA = 'consulta-area-prestacao';

/** Itens do grupo (pasta em `testes/consulta-area-prestacao/<area>/`). */
export type AreaConsulta =
  | 'medicamentos'
  | 'mcdt'
  | 'crd'
  | 'cuidados-continuados'
  | 'hemodialise'
  | 'uts'
  | 'tratamentos-termais'
  | 'saude-oral'
  | 'vacinas'
  | 'dispensa-proximidade'
  | 'troca-seringas';

export interface EcraConsulta {
  /** Pasta/tag do Item (`@area-<area>`). */
  area: AreaConsulta;
  /** Item, como aparece no menu lateral. */
  item: string;
  /** `_id` do Item no menu (`MainLayout.tsx`) â€” o submenu Ã© `#submenu-<idMenu>`. */
  idMenu: string;
  /** RÃ³tulo (folha do menu). */
  rotulo: string;
  rota: string;
  /** Sufixo da variante do caso (`CT-REG-TASK-20260928-04-<sufixo>`). */
  sufixo: string;
  /**
   * Valores tentados em Â«NÃºmero da FacturaÂ» para encontrar um registo com detalhe (default
   * `['1']`, que no DEV de 13-10-2026 devolve registos em vÃ¡rios ecrÃ£s por correspondÃªncia
   * parcial). Sem registo com detalhe, o critÃ©rio do detalhe fica Â«nÃ£o aplicÃ¡velÂ».
   */
  sondasDetalhe?: string[];
}

/** As 26 pesquisas do grupo, pela ordem do menu. */
export const ECRAS_CONSULTA: readonly EcraConsulta[] = [
  { area: 'medicamentos', item: 'Medicamentos', idMenu: 'area-medicamentos', rotulo: 'Facturas', rota: '/medicamentos/factura', sufixo: 'MED-FAT' },
  { area: 'medicamentos', item: 'Medicamentos', idMenu: 'area-medicamentos', rotulo: 'Lotes', rota: '/medicamentos/lote', sufixo: 'MED-LOT', sondasDetalhe: ['E003-261', 'E017-1'] },
  { area: 'medicamentos', item: 'Medicamentos', idMenu: 'area-medicamentos', rotulo: 'PrestaÃ§Ãµes', rota: '/medicamentos/prestacoes', sufixo: 'MED-PRE', sondasDetalhe: ['E003-261', 'E017-1'] },
  { area: 'mcdt', item: 'MCDT', idMenu: 'area-mcdt', rotulo: 'Facturas', rota: '/mcdts/factura', sufixo: 'MCDT-FAT' },
  { area: 'mcdt', item: 'MCDT', idMenu: 'area-mcdt', rotulo: 'Lotes', rota: '/mcdts/lote', sufixo: 'MCDT-LOT' },
  { area: 'mcdt', item: 'MCDT', idMenu: 'area-mcdt', rotulo: 'PrestaÃ§Ãµes', rota: '/mcdts/prescricao', sufixo: 'MCDT-PRE' },
  { area: 'mcdt', item: 'MCDT', idMenu: 'area-mcdt', rotulo: 'PrestaÃ§Ã£o IPATIMUP', rota: '/mcdts/prestacoes-ipatimup', sufixo: 'MCDT-IPA' },
  { area: 'crd', item: 'Cuidados RespiratÃ³rios DomiciliÃ¡rios', idMenu: 'area-crd', rotulo: 'Facturas', rota: '/cuidados-respiratorios/factura', sufixo: 'CRD-FAT' },
  { area: 'crd', item: 'Cuidados RespiratÃ³rios DomiciliÃ¡rios', idMenu: 'area-crd', rotulo: 'Lotes', rota: '/cuidados-respiratorios/lote', sufixo: 'CRD-LOT' },
  { area: 'crd', item: 'Cuidados RespiratÃ³rios DomiciliÃ¡rios', idMenu: 'area-crd', rotulo: 'PrestaÃ§Ãµes', rota: '/cuidados-respiratorios/prestacao', sufixo: 'CRD-PRE' },
  { area: 'cuidados-continuados', item: 'Cuidados Continuados', idMenu: 'area-cuidados-continuados', rotulo: 'Facturas', rota: '/cuidados-continuados/factura', sufixo: 'CC-FAT' },
  { area: 'hemodialise', item: 'HemodiÃ¡lise', idMenu: 'area-hemodialise', rotulo: 'Facturas', rota: '/hemodialise/factura', sufixo: 'HEMO-FAT' },
  { area: 'hemodialise', item: 'HemodiÃ¡lise', idMenu: 'area-hemodialise', rotulo: 'PrestaÃ§Ãµes', rota: '/hemodialise/prestacao', sufixo: 'HEMO-PRE' },
  { area: 'uts', item: 'Unidades TerapÃªuticas de Sangue', idMenu: 'area-uts', rotulo: 'Facturas', rota: '/uts/factura', sufixo: 'UTS-FAT' },
  { area: 'uts', item: 'Unidades TerapÃªuticas de Sangue', idMenu: 'area-uts', rotulo: 'PrestaÃ§Ãµes', rota: '/uts/prestacao', sufixo: 'UTS-PRE' },
  { area: 'tratamentos-termais', item: 'Tratamentos Termais', idMenu: 'area-termais', rotulo: 'Facturas', rota: '/tratamentos-termais/factura', sufixo: 'TT-FAT' },
  { area: 'tratamentos-termais', item: 'Tratamentos Termais', idMenu: 'area-termais', rotulo: 'Lotes', rota: '/tratamentos-termais/lote', sufixo: 'TT-LOT' },
  { area: 'tratamentos-termais', item: 'Tratamentos Termais', idMenu: 'area-termais', rotulo: 'PrestaÃ§Ãµes', rota: '/tratamentos-termais/prestacao', sufixo: 'TT-PRE' },
  { area: 'saude-oral', item: 'SaÃºde Oral', idMenu: 'area-saude-oral', rotulo: 'Facturas', rota: '/saude-oral/factura', sufixo: 'SO-FAT' },
  { area: 'saude-oral', item: 'SaÃºde Oral', idMenu: 'area-saude-oral', rotulo: 'PrestaÃ§Ãµes', rota: '/saude-oral/prestacoes', sufixo: 'SO-PRE' },
  { area: 'vacinas', item: 'Vacinas', idMenu: 'area-vacinas', rotulo: 'Facturas', rota: '/vacinas/factura', sufixo: 'VAC-FAT' },
  { area: 'vacinas', item: 'Vacinas', idMenu: 'area-vacinas', rotulo: 'PrestaÃ§Ãµes', rota: '/vacinas/prestacao', sufixo: 'VAC-PRE' },
  { area: 'dispensa-proximidade', item: 'Dispensa em Proximidade', idMenu: 'area-dispensa-proximidade', rotulo: 'Facturas', rota: '/dispensa-proximidade/factura', sufixo: 'DP-FAT' },
  { area: 'dispensa-proximidade', item: 'Dispensa em Proximidade', idMenu: 'area-dispensa-proximidade', rotulo: 'Lotes', rota: '/dispensa-proximidade/lote', sufixo: 'DP-LOT' },
  { area: 'dispensa-proximidade', item: 'Dispensa em Proximidade', idMenu: 'area-dispensa-proximidade', rotulo: 'PrestaÃ§Ãµes', rota: '/dispensa-proximidade/prestacao', sufixo: 'DP-PRE' },
  { area: 'troca-seringas', item: 'Programa Troca de Seringas', idMenu: 'area-troca-seringas', rotulo: 'Facturas', rota: '/troca-seringas/factura', sufixo: 'PTS-FAT' },
];

export function ecrasDoItem(area: AreaConsulta): EcraConsulta[] {
  return ECRAS_CONSULTA.filter((e) => e.area === area);
}

export function ecraConsulta(rota: string): EcraConsulta {
  const e = ECRAS_CONSULTA.find((x) => x.rota === rota);
  if (!e) throw new Error(`Rota de Consulta desconhecida: ${rota}`);
  return e;
}

const escaparRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// --- navegaÃ§Ã£o ------------------------------------------------------------------------------

function botaoPesquisar(page: Page): Locator {
  return page.getByRole('button', { name: 'Pesquisar', exact: true });
}

export function breadcrumb(page: Page): Locator {
  return page.locator('nav.breadcrumb');
}

/** Texto do breadcrumb (Â«Ãrea de PrestaÃ§Ã£o â†’ Medicamentos â†’ LotesÂ»), ou `null` se nÃ£o existir. */
export async function textoBreadcrumb(page: Page): Promise<string | null> {
  if ((await breadcrumb(page).count()) === 0) return null;
  const niveis = await breadcrumb(page).first().locator('li.breadcrumb__item').allInnerTexts();
  return niveis.map((n) => n.trim()).join(' â†’ ');
}

/**
 * Abre a pesquisa pelo menu lateral: Ãrea de PrestaÃ§Ã£o â†’ <Item> â†’ <RÃ³tulo>. O menu nasce
 * expandido (`defaultOpen`); se o grupo ou o Item estiverem fechados, abre-os primeiro.
 */
export async function abrirPeloMenu(page: Page, ecra: EcraConsulta): Promise<void> {
  await abrirRota(page, '/');
  const grupo = page.locator(`a[role="menuitem"][aria-controls="submenu-${ID_GRUPO_MENU_CONSULTA}"]`);
  const item = page.locator(`a[role="menuitem"][aria-controls="submenu-${ecra.idMenu}"]`);
  const folha = page.locator(`[id="submenu-${ecra.idMenu}"] a[role="menuitem"][href="${ecra.rota}"]`);
  await expect(grupo, `grupo Â«${GRUPO_MENU_CONSULTA}Â» no menu lateral`).toBeVisible({ timeout: 30_000 });
  if (!(await item.isVisible())) await grupo.click();
  await expect(item, `Item Â«${ecra.item}Â» no menu`).toBeVisible();
  if (!(await folha.isVisible())) await item.click();
  await expect(folha, `folha Â«${ecra.rotulo}Â» (${ecra.rota}) no menu`).toBeVisible();
  await expect(folha).toHaveText(ecra.rotulo);
  // Abaixo da dobra o clique pode nÃ£o estabilizar: cai para o evento de clique do link (o
  // `routeNavigator` do Traceability Suite Menu trata-o igual).
  await folha.click({ timeout: 10_000 }).catch(() => folha.dispatchEvent('click'));
  await expect(page).toHaveURL(new RegExp(`${escaparRegex(ecra.rota)}(\\?.*)?$`));
  await expect(botaoPesquisar(page)).toBeVisible({ timeout: 30_000 });
}

/** Estado da grelha de resultados da pesquisa (avaliado no browser). */
type EstadoGrelha = 'sem-tabela' | 'a-carregar' | 'com-detalhe' | 'sem-acao' | 'vazio' | 'inalterado';

async function estadoGrelha(page: Page, vazioAntes: string | null): Promise<EstadoGrelha> {
  return page.evaluate((antes) => {
    const t = document.querySelector('.Traceability SuiteTemplate__content table');
    if (!t) return 'sem-tabela';
    if (t.querySelector('td.Traceability Suite-tablev2-cell-loading')) return 'a-carregar';
    if (t.querySelector('td[headers="actions"] button, td[headers="actions"] a')) return 'com-detalhe';
    const vazio = t.querySelector('tbody td[colspan]')?.textContent?.trim() ?? null;
    if (vazio !== null) return vazio === antes ? 'inalterado' : 'vazio';
    return t.querySelectorAll('tbody tr').length > 0 ? 'sem-acao' : 'inalterado';
  }, vazioAntes);
}

/**
 * Pesquisa pelo Â«NÃºmero da FacturaÂ» com cada sonda atÃ© encontrar um registo com aÃ§Ã£o de
 * detalhe. Devolve `true` se a grelha ficou com pelo menos uma linha com detalhe.
 */
async function pesquisarRegistoComDetalhe(page: Page, ecra: EcraConsulta): Promise<{ ok: boolean; motivo: string }> {
  const sondas = ecra.sondasDetalhe ?? ['1'];
  // `as`: o valor Ã© atribuÃ­do dentro do poll e o TS nÃ£o deve estreitar o tipo ao literal inicial.
  let ultimo = 'sem-tabela' as EstadoGrelha;
  for (const [i, sonda] of sondas.entries()) {
    if (i > 0) {
      // Volta ao estado "antes da pesquisa", para distinguir a resposta da nova pesquisa.
      await abrirRota(page, ecra.rota);
      await expect(botaoPesquisar(page)).toBeVisible({ timeout: 30_000 });
    }
    const porPlaceholder = page
      .locator('.Traceability SuiteTemplate__content')
      .getByPlaceholder('Insira o nÃºmero da factura', { exact: true });
    const campo = (await porPlaceholder.count()) > 0
      ? porPlaceholder.first()
      : page.locator('.Traceability SuiteTemplate__content input[type="text"]:not([role="combobox"])').first();
    const vazioAntes = await page
      .locator('.Traceability SuiteTemplate__content table tbody td[colspan]')
      .first()
      .textContent({ timeout: 1_000 })
      .then((t) => t?.trim() ?? null, () => null);
    await campo.fill(sonda);
    await botaoPesquisar(page).click();
    await expect
      .poll(async () => (ultimo = await estadoGrelha(page, vazioAntes)), {
        message: `${ecra.rota}: a grelha responde Ã  pesquisa por "${sonda}"`,
        timeout: 30_000,
      })
      .toMatch(/^(com-detalhe|sem-acao|vazio)$/);
    if (ultimo === 'com-detalhe') return { ok: true, motivo: '' };
  }
  return {
    ok: false,
    motivo:
      ultimo === 'sem-acao'
        ? `${ecra.rota}: a grelha tem linhas, mas sem aÃ§Ã£o de detalhe`
        : `${ecra.rota}: sem registos com detalhe no ambiente (NÃºmero da Factura ${sondas.map((s) => `"${s}"`).join(', ')})`,
  };
}

// --- critÃ©rios ----------------------------------------------------------------------------

/** TASK-04, passo 2 â€” aberta pelo menu, a pesquisa nÃ£o mostra breadcrumb. */
export async function verificarSemBreadcrumbNaPesquisa(page: Page, ecra: EcraConsulta): Promise<void> {
  // O breadcrumb Ã© desenhado pelo MainLayout no mesmo render do conteÃºdo: com o botÃ£o
  // Pesquisar visÃ­vel, um breadcrumb que exista jÃ¡ estÃ¡ no DOM.
  const trilho = await textoBreadcrumb(page);
  expect.soft(trilho, `${ecra.rota}: breadcrumb visÃ­vel na pesquisa aberta pelo menu ("${trilho}")`).toBeNull();
}

/**
 * Pesquisa (com as sondas do ecrÃ£) e abre o detalhe do 1.Âº registo. Devolve `null` quando o
 * detalhe abriu numa pÃ¡gina nova, ou o motivo por que nÃ£o foi possÃ­vel.
 */
export async function abrirPrimeiroDetalheDaPesquisa(page: Page, ecra: EcraConsulta): Promise<string | null> {
  const r = await pesquisarRegistoComDetalhe(page, ecra);
  if (!r.ok) return r.motivo;
  const acao = page.locator('.Traceability SuiteTemplate__content table td[headers="actions"]').locator('button, a').first();
  const rotulo = ((await acao.getAttribute('aria-label')) ?? (await acao.textContent()) ?? '').trim();
  await acao.click();
  const mudou = await expect(page)
    .not.toHaveURL(new RegExp(`${escaparRegex(ecra.rota)}(\\?.*)?$`), { timeout: 15_000 })
    .then(() => true, () => false);
  if (!mudou) return `${ecra.rota}: "${rotulo}" nÃ£o muda de pÃ¡gina (detalhe em diÃ¡logo?)`;
  await expect(page.getByText('A carregar...')).toHaveCount(0, { timeout: 30_000 });
  test.info().annotations.push({
    type: 'observacao',
    description: `${ecra.rota}: detalhe aberto por "${rotulo}" â†’ ${new URL(page.url()).pathname}`,
  });
  return null;
}

/** TASK-04, passo 3 â€” no detalhe aberto a partir da pesquisa, o breadcrumb aparece. */
export async function verificarBreadcrumbNoDetalhe(page: Page, ecra: EcraConsulta): Promise<void> {
  const motivo = await abrirPrimeiroDetalheDaPesquisa(page, ecra);
  if (motivo) {
    naoAplicavel(`${motivo} â€” breadcrumb do detalhe nÃ£o verificÃ¡vel`);
    return;
  }
  const caminho = new URL(page.url()).pathname;
  await expect
    .soft(breadcrumb(page), `${caminho}: o detalhe aberto a partir de ${ecra.rota} mostra o breadcrumb`)
    .toBeVisible({ timeout: 10_000 });
  const trilho = await textoBreadcrumb(page);
  test.info().annotations.push({ type: 'observacao', description: `${caminho}: breadcrumb do detalhe "${trilho}"` });
}

/**
 * BUG-20260915-28 â€” cada nÃ­vel do breadcrumb anterior ao atual Ã© um link que abre a pÃ¡gina
 * correspondente. Os nÃ­veis que sÃ£o sÃ³ grupos do menu (sem `url` em `MainLayout.tsx`, ex.
 * Â«Ãrea de PrestaÃ§Ã£oÂ») nÃ£o tÃªm pÃ¡gina para abrir: aparecem como texto e ficam registados
 * como observaÃ§Ã£o; um nÃ­vel que nÃ£o seja grupo e nÃ£o tenha link Ã© defeito.
 */
export async function verificarBreadcrumbNavegavel(
  page: Page,
  contexto: string,
  gruposSemPagina: string[],
): Promise<void> {
  const nav = breadcrumb(page).first();
  await expect(nav, `${contexto}: breadcrumb visÃ­vel`).toBeVisible();
  const niveis = await nav.locator('li.breadcrumb__item').evaluateAll((lis) =>
    lis.map((li) => ({
      texto: (li.textContent ?? '').trim(),
      href: li.querySelector('a')?.getAttribute('href') ?? null,
      atual: li.classList.contains('is-active'),
    })),
  );
  test.info().annotations.push({
    type: 'observacao',
    description: `${contexto}: breadcrumb ${niveis
      .map((n) => `${n.texto}${n.href ? ` [link ${n.href}]` : ''}${n.atual ? ' (atual)' : ''}`)
      .join(' â†’ ')}`,
  });
  const anteriores = niveis.filter((n) => !n.atual);
  const semLink = anteriores.filter((n) => !n.href).map((n) => n.texto);
  const gruposSemLink = semLink.filter((t) => gruposSemPagina.includes(t));
  if (gruposSemLink.length > 0) {
    test.info().annotations.push({
      type: 'observacao',
      description: `${contexto}: nÃ­veis que sÃ£o sÃ³ grupos do menu, sem pÃ¡gina prÃ³pria, mostrados como texto: ${gruposSemLink.join(', ')}`,
    });
  }
  expect
    .soft(
      semLink.filter((t) => !gruposSemPagina.includes(t)),
      `${contexto}: nÃ­veis anteriores ao atual sem link (tÃªm pÃ¡gina prÃ³pria)`,
    )
    .toEqual([]);
  const urlAtual = page.url();
  for (const n of anteriores.filter((x) => x.href)) {
    await test.step(`Â«${n.texto}Â» abre ${n.href}`, async () => {
      await nav.locator('li.breadcrumb__item a', { hasText: n.texto }).first().click();
      await expect
        .soft(page, `${contexto}: clicar em Â«${n.texto}Â» abre ${n.href}`)
        .toHaveURL(new RegExp(`${escaparRegex(n.href!)}(\\?.*)?$`));
      await page.goBack();
      await expect(page).toHaveURL(urlAtual);
      await expect(nav).toBeVisible();
    });
  }
}

/** Um campo de filtro com o placeholder fora do padrÃ£o. */
export interface PlaceholderForaDoPadrao {
  campo: string;
  placeholder: string;
  motivo: string;
}

/** Placeholder de mÃ¡scara do Datepicker do design system (igual nas pesquisas DR, jÃ¡ conformes). */
const MASCARA_DATA = /^(DD|dd)\/(MM|mm)\/(YYYY|yyyy|AAAA|aaaa)$/;

/**
 * LÃª o placeholder de cada campo de filtro vazio da pesquisa: inputs de texto (incl. o
 * autocomplete do Prestador) e SelectBox do `@Traceability Suite/ui-react` sem valor
 * (`.Traceability Suite-select-box-value.is-placeholder`). Ignora a grelha, a paginaÃ§Ã£o e o breadcrumb.
 */
export async function lerPlaceholders(page: Page): Promise<{ campo: string; placeholder: string; tipo: 'texto' | 'selecao' }[]> {
  return page.locator('.Traceability SuiteTemplate__content').first().evaluate((raiz) => {
    const fora = (el: Element) => !!el.closest('table, .MuiTablePagination-root, nav.breadcrumb, [role="dialog"]');
    const nomeDe = (el: Element): string => {
      const id = el.getAttribute('id');
      const label = id ? raiz.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
      const porId = el.getAttribute('aria-labelledby');
      return (
        label?.textContent?.trim() ||
        el.getAttribute('aria-label')?.trim() ||
        (porId ? document.getElementById(porId)?.textContent?.trim() : '') ||
        el.closest('.MuiFormControl-root, .Traceability SuiteTextInput-root')?.querySelector('label')?.textContent?.trim() ||
        '(sem rÃ³tulo)'
      );
    };
    const textos = Array.from(raiz.querySelectorAll('input'))
      .filter((i) => !fora(i))
      .filter((i) => ['text', 'search', 'number', 'tel', 'email', ''].includes(i.type))
      .filter((i) => i.getAttribute('aria-hidden') !== 'true' && !i.classList.contains('MuiSelect-nativeInput'))
      .filter((i) => i.value === '')
      .map((i) => ({ campo: nomeDe(i), placeholder: i.getAttribute('placeholder') ?? '', tipo: 'texto' as const }));
    const selecoes = Array.from(raiz.querySelectorAll('.Traceability Suite-select-box-container[role="combobox"]'))
      .filter((s) => !fora(s))
      .map((s) => ({ s, valor: s.querySelector('.Traceability Suite-select-box-value') }))
      .filter(({ valor }) => !valor || valor.classList.contains('is-placeholder'))
      .map(({ s, valor }) => ({ campo: nomeDe(s), placeholder: valor?.textContent?.trim() ?? '', tipo: 'selecao' as const }));
    return [...textos, ...selecoes];
  });
}

/** Classifica os placeholders pelo critÃ©rio da TASK-20260928-05 / Manual B.7. */
export function placeholdersForaDoPadrao(
  campos: { campo: string; placeholder: string; tipo: 'texto' | 'selecao' }[],
): { fora: PlaceholderForaDoPadrao[]; mascarasData: string[] } {
  const fora: PlaceholderForaDoPadrao[] = [];
  const mascarasData: string[] = [];
  for (const c of campos) {
    const p = c.placeholder.trim();
    if (p === '') fora.push({ ...c, motivo: 'sem placeholder' });
    else if (/^ex(emplo)?\s*[:.]/i.test(p)) fora.push({ ...c, motivo: 'exemplo em vez de instruÃ§Ã£o ("Ex:")' });
    else if (/^[\d\s.,/-]+$/.test(p)) fora.push({ ...c, motivo: 'sÃ³ dÃ­gitos/zeros' });
    else if (MASCARA_DATA.test(p)) mascarasData.push(`${c.campo}="${p}"`);
    else if (!/^(Insira|Selecione)\b/.test(p)) fora.push({ ...c, motivo: 'nÃ£o comeÃ§a por "Insira" nem "Selecione"' });
  }
  return { fora, mascarasData };
}

/** TASK-05 â€” todos os placeholders dos filtros dÃ£o instruÃ§Ã£o de preenchimento. */
export async function verificarPlaceholders(page: Page, ecra: EcraConsulta): Promise<void> {
  const campos = await lerPlaceholders(page);
  expect(campos.length, `${ecra.rota}: hÃ¡ campos de filtro para ler`).toBeGreaterThan(0);
  test.info().annotations.push({
    type: 'observacao',
    description: `${ecra.rota}: ${campos.map((c) => `${c.campo}="${c.placeholder}"`).join(' Â· ')}`,
  });
  const { fora, mascarasData } = placeholdersForaDoPadrao(campos);
  if (mascarasData.length > 0) {
    // A mÃ¡scara do Datepicker do design system nÃ£o Ã© texto da aplicaÃ§Ã£o; Ã© a mesma das
    // pesquisas de Dados de ReferÃªncia, dadas como conformes (Manual B.7, deploy #50/#55).
    test.info().annotations.push({
      type: 'observacao',
      description: `${ecra.rota}: campos de data com a mÃ¡scara do Datepicker, fora do critÃ©rio "Insira/Selecione": ${mascarasData.join(', ')}`,
    });
  }
  expect
    .soft(
      fora.map((f) => `${f.campo}: "${f.placeholder}" (${f.motivo})`),
      `${ecra.rota}: placeholders fora do padrÃ£o ("Insiraâ€¦"/"Selecioneâ€¦", sem "Ex:" nem sÃ³ dÃ­gitos)`,
    )
    .toEqual([]);
}

// --- registo dos casos --------------------------------------------------------------------

/** `CT-REG-TASK-20260928-04-<sufixo>` â€” sem breadcrumb na pesquisa; com breadcrumb no detalhe. */
export function casoSemBreadcrumb(ecra: EcraConsulta): void {
  const caso = `CT-REG-TASK-20260928-04-${ecra.sufixo}`;
  test(
    `${caso} â€” ${ecra.rotulo}: aberta pelo menu nÃ£o mostra breadcrumb; o detalhe mostra`,
    meta({
      caso,
      requisitos: ['RF29'],
      plano: `${PLANO_READY_FOR_TEST_CONSULTA} â€” CT-REG-TASK-20260928-04`,
      tipoTeste: 'interface',
      area: ecra.area,
      bug: 'TASK-20260928-04',
      tipo: 'positivo',
    }),
    async ({ page }) => {
      test.slow();
      await test.step(`A pesquisa abre pelo menu Â«${GRUPO_MENU_CONSULTA} â†’ ${ecra.item} â†’ ${ecra.rotulo}Â» (${ecra.rota})`, async () => {
        await abrirPeloMenu(page, ecra);
      });
      await test.step('Aberta pelo menu, a pesquisa nÃ£o mostra breadcrumb', async () => {
        await verificarSemBreadcrumbNaPesquisa(page, ecra);
      });
      await test.step('No detalhe aberto a partir da pesquisa, o breadcrumb aparece', async () => {
        await verificarBreadcrumbNoDetalhe(page, ecra);
      });
    },
  );
}

/** `CT-REG-TASK-20260928-05-<sufixo>` â€” placeholders com instruÃ§Ã£o de preenchimento. */
export function casoPlaceholders(ecra: EcraConsulta): void {
  const caso = `CT-REG-TASK-20260928-05-${ecra.sufixo}`;
  test(
    `${caso} â€” ${ecra.rotulo}: os placeholders dos filtros dÃ£o instruÃ§Ã£o ("Insiraâ€¦"/"Selecioneâ€¦"), sem exemplos`,
    meta({
      caso,
      requisitos: ['RF29'],
      plano: `${PLANO_READY_FOR_TEST_CONSULTA} â€” CT-REG-TASK-20260928-05`,
      tipoTeste: 'interface',
      area: ecra.area,
      bug: 'TASK-20260928-05',
      tipo: 'positivo',
    }),
    async ({ page }) => {
      await test.step(`A pesquisa abre pelo menu Â«${GRUPO_MENU_CONSULTA} â†’ ${ecra.item} â†’ ${ecra.rotulo}Â» (${ecra.rota})`, async () => {
        await abrirPeloMenu(page, ecra);
      });
      await test.step('Nenhum placeholder comeÃ§a por "Ex:" nem Ã© sÃ³ dÃ­gitos; todos comeÃ§am por "Insira" ou "Selecione"', async () => {
        await verificarPlaceholders(page, ecra);
      });
    },
  );
}

/**
 * ConferÃªncia do padrÃ£o de uma pesquisa de Consulta (modelo do `CT-DR-A.1.x`): regista os
 * casos `CT-REG-TASK-20260928-04-<sufixo>` e `-05-<sufixo>` da rota.
 */
export function conferenciaPadraoPesquisa(rota: string): void {
  const ecra = ecraConsulta(rota);
  casoSemBreadcrumb(ecra);
  casoPlaceholders(ecra);
}

/**
 * Regista, para cada RÃ³tulo do Item, um `test.describe` com os casos da TASK-04 e -05. Nos
 * specs que jÃ¡ tinham casos por RÃ³tulo, o tÃ­tulo do `describe` distingue-o dos existentes.
 */
export function casosPadraoPesquisaItem(
  area: AreaConsulta,
  tituloDescribe: (ecra: EcraConsulta) => string = (e) => e.rotulo,
): void {
  for (const ecra of ecrasDoItem(area)) {
    test.describe(tituloDescribe(ecra), () => {
      conferenciaPadraoPesquisa(ecra.rota);
    });
  }
}

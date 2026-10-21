import { expect, type Download, type Page } from '@playwright/test';
import { abrirRota } from './appMock';

/**
 * MediÃ§Ãµes e aÃ§Ãµes genÃ©ricas dos ecrÃ£s de pesquisa, para os casos transversais das tarefas de
 * padrÃ£o (`TASK-20260928-01`, `-10`, `-13`), que percorrem ecrÃ£s de grupos diferentes sem page
 * object prÃ³prio.
 *
 * Estrutura comum confirmada no DOM do DEV (13-10-2026) e no cÃ³digo (`ccmsns-ui` `origin/develop`):
 *   - o bloco de pesquisa Ã© um cartÃ£o MUI (`.MuiPaper-root`) com o tÃ­tulo, o botÃ£o Colapsar e,
 *     por baixo, os campos e a linha de botÃµes (Â«LimparÂ», Â«PesquisarÂ»; em Â«Localizar / CorrigirÂ»
 *     o botÃ£o Ã© Â«LocalizarÂ»);
 *   - cada campo Ã© um `FormField` do `@Traceability Suite/ui-react` (`.Traceability SuiteFormField-root`, rÃ³tulo
 *     `.Traceability SuiteFormField-label`, controlo `input`/`[role=combobox]`, dica `.Traceability SuiteFormField-hint`);
 *   - com um sÃ³ campo, o campo e a linha de botÃµes ficam lado a lado (50% / 50%).
 * O Â«bloco de filtrosÂ» medido Ã© o menor elemento que contÃ©m todos os controlos e o botÃ£o de
 * pesquisa (Ã© a largura Ãºtil do cartÃ£o, sem o padding).
 */

export const BOTAO_PESQUISA = /^(Pesquisar|Localizar)$/;

export interface Caixa {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CampoMedido {
  rotulo: string;
  /** Caixa do campo (FormField: rÃ³tulo + controlo + dica). */
  caixa: Caixa;
  /** Caixa do controlo (input / SelectBox / Autocomplete). */
  controlo: Caixa;
}

export interface MedidaFiltros {
  encontrado: boolean;
  motivo?: string;
  bloco: Caixa;
  campos: CampoMedido[];
  /** BotÃµes da linha de aÃ§Ãµes (Limpar, Pesquisarâ€¦), da esquerda para a direita. */
  botoes: { nome: string; caixa: Caixa }[];
  /** Pares de elementos que se intersetam (campo Ã— campo ou campo Ã— botÃ£o). */
  sobreposicoes: string[];
  /** Textos de rÃ³tulos/valores visÃ­veis cortados (pelo prÃ³prio elemento ou por um contentor). */
  textosCortados: string[];
  /** Placeholders que nÃ£o cabem no campo (informativo). */
  placeholdersCortados: string[];
  /** Campos ou botÃµes que saem do bloco de filtros. */
  foraDoBloco: string[];
  /** px de scroll horizontal na pÃ¡gina. */
  overflowPagina: number;
  /** px de conteÃºdo a mais na largura do bloco. */
  overflowBloco: number;
}

/** Abre o ecrÃ£ e espera o botÃ£o de pesquisa e as fontes (a mediÃ§Ã£o depende delas). */
export async function abrirEcraPesquisa(page: Page, rota: string): Promise<void> {
  await abrirRota(page, rota);
  await expect(
    page.locator('.Traceability SuiteTemplate__content').getByRole('button', { name: BOTAO_PESQUISA }).first(),
    `botÃ£o Pesquisar/Localizar visÃ­vel em ${rota}`,
  ).toBeVisible({ timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.waitForTimeout(500);
}

/**
 * Mede o bloco de filtros do ecrÃ£ aberto. Corre no browser (funÃ§Ã£o autocontida). Marca o cartÃ£o
 * com `data-qa-bloco-filtros` para a captura (`blocoFiltros()`); nÃ£o altera mais nada.
 */
export async function medirFiltros(page: Page): Promise<MedidaFiltros> {
  return page.evaluate((padraoBotao) => {
    const reBotao = new RegExp(padraoBotao);
    const arred = (n: number) => Math.round(n * 10) / 10;
    const caixa = (r: DOMRect | { left: number; top: number; right: number; bottom: number }): Caixa => ({
      x: arred(r.left),
      y: arred(r.top),
      w: arred(r.right - r.left),
      h: arred(r.bottom - r.top),
    });
    const visivel = (e: Element) => {
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
    };
    const vazio: MedidaFiltros = {
      encontrado: false,
      bloco: { x: 0, y: 0, w: 0, h: 0 },
      campos: [],
      botoes: [],
      sobreposicoes: [],
      textosCortados: [],
      placeholdersCortados: [],
      foraDoBloco: [],
      overflowPagina: 0,
      overflowBloco: 0,
    };
    const conteudo = document.querySelector('.Traceability SuiteTemplate__content') ?? document.body;
    const acao = Array.from(conteudo.querySelectorAll('button')).find(
      (b) => visivel(b) && reBotao.test((b.textContent ?? '').trim()),
    );
    if (!acao) return { ...vazio, motivo: 'sem botÃ£o Pesquisar/Localizar' };
    const cartao = acao.closest('.MuiPaper-root') ?? acao.parentElement?.parentElement ?? conteudo;
    cartao.setAttribute('data-qa-bloco-filtros', '');

    const brutos = Array.from(
      cartao.querySelectorAll('input:not([type=hidden]), textarea, [role=combobox]'),
    ).filter((e) => visivel(e) && !e.closest('table, [class*="Pagination"], nav'));
    const controlos = brutos.filter((e) => !brutos.some((o) => o !== e && o.contains(e)));

    const ancestrais = (e: Element) => {
      const s: Element[] = [];
      for (let a: Element | null = e; a; a = a.parentElement) s.push(a);
      return s;
    };
    const lca = (a: Element, b: Element): Element => {
      const s = new Set(ancestrais(a));
      for (let e: Element | null = b; e; e = e.parentElement) if (s.has(e)) return e;
      return document.body;
    };
    const linhaBotoes = acao.parentElement ?? acao;
    let bloco: Element = linhaBotoes;
    for (const c of controlos) bloco = lca(bloco, c);
    const rb = bloco.getBoundingClientRect();

    // Recorte de um elemento pelos contentores com overflow â‰  visible, atÃ© ao bloco (inclusive).
    const recortar = (r: { left: number; top: number; right: number; bottom: number }, desde: Element | null) => {
      let { left, top, right, bottom } = r;
      for (let a = desde; a && a !== bloco.parentElement; a = a.parentElement) {
        const cs = getComputedStyle(a);
        const ar = a.getBoundingClientRect();
        if (cs.overflowX !== 'visible') {
          left = Math.max(left, ar.left);
          right = Math.min(right, ar.right);
        }
        if (cs.overflowY !== 'visible') {
          top = Math.max(top, ar.top);
          bottom = Math.min(bottom, ar.bottom);
        }
      }
      return { left, top, right, bottom };
    };

    // Campo = FormField do controlo (ou o <label> que o envolve, ou o LCA com o <label for>).
    const unidadeDe = (c: Element): Element => {
      let u: Element | null = c.closest('.Traceability SuiteFormField-root') ?? c.closest('label');
      if (!u && c.id) {
        const l = cartao.querySelector(`label[for="${CSS.escape(c.id)}"]`);
        if (l) u = lca(c, l);
      }
      if (!u || !bloco.contains(u) || u === bloco) u = c.parentElement ?? c;
      return u;
    };
    const unidades: { el: Element; controlo: Element }[] = [];
    for (const c of controlos) {
      const u = unidadeDe(c);
      if (!unidades.some((x) => x.el === u)) unidades.push({ el: u, controlo: c });
    }
    const campos = unidades.filter((u) => !unidades.some((o) => o.el !== u.el && o.el.contains(u.el)));

    const rotuloDe = (u: { el: Element; controlo: Element }) => {
      const l = u.el.tagName === 'LABEL' ? u.el : u.el.querySelector('.Traceability SuiteFormField-label, label');
      const t = (l?.textContent ?? '').trim();
      return (
        t ||
        u.controlo.getAttribute('aria-label') ||
        (u.controlo as HTMLInputElement).placeholder ||
        '(sem rÃ³tulo)'
      );
    };

    // ExtensÃ£o real (com o que transborda) de um campo: uniÃ£o dos descendentes visÃ­veis, recortados.
    const extensao = (el: Element) => {
      let x1 = Infinity;
      let y1 = Infinity;
      let x2 = -Infinity;
      let y2 = -Infinity;
      for (const d of [el, ...Array.from(el.querySelectorAll('*'))]) {
        if (!visivel(d)) continue;
        const r = recortar(d.getBoundingClientRect(), d.parentElement);
        if (r.right - r.left <= 0 || r.bottom - r.top <= 0) continue;
        x1 = Math.min(x1, r.left);
        y1 = Math.min(y1, r.top);
        x2 = Math.max(x2, r.right);
        y2 = Math.max(y2, r.bottom);
      }
      return { left: x1, top: y1, right: x2, bottom: y2 };
    };

    const botoes = Array.from(linhaBotoes.querySelectorAll('button'))
      .filter(visivel)
      .map((b) => ({ el: b as Element, nome: (b.textContent ?? '').trim() || b.getAttribute('aria-label') || 'botÃ£o' }))
      .sort((a, b) => a.el.getBoundingClientRect().left - b.el.getBoundingClientRect().left);

    const itens = [
      ...campos.map((u) => ({ nome: `campo Â«${rotuloDe(u)}Â»`, el: u.el, ext: extensao(u.el) })),
      ...botoes.map((b) => ({ nome: `botÃ£o Â«${b.nome}Â»`, el: b.el, ext: extensao(b.el) })),
    ];

    const sobreposicoes: string[] = [];
    for (let i = 0; i < itens.length; i++) {
      for (let j = i + 1; j < itens.length; j++) {
        const a = itens[i];
        const b = itens[j];
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        const iw = Math.min(a.ext.right, b.ext.right) - Math.max(a.ext.left, b.ext.left);
        const ih = Math.min(a.ext.bottom, b.ext.bottom) - Math.max(a.ext.top, b.ext.top);
        if (iw > 1 && ih > 1) sobreposicoes.push(`${a.nome} Ã— ${b.nome} (${Math.round(iw)}Ã—${Math.round(ih)} px)`);
      }
    }

    const foraDoBloco = itens
      .filter((it) => it.ext.left < rb.left - 1 || it.ext.right > rb.right + 1)
      .map((it) => `${it.nome} (${Math.round(it.ext.left)}â€“${Math.round(it.ext.right)} px; bloco ${Math.round(rb.left)}â€“${Math.round(rb.right)} px)`);

    // Textos visÃ­veis (rÃ³tulos, valor/placeholder dos SelectBox) cortados pelo elemento ou por um contentor.
    const textosCortados: string[] = [];
    for (const u of campos) {
      const caminhante = document.createTreeWalker(u.el, NodeFilter.SHOW_TEXT);
      for (let n = caminhante.nextNode(); n; n = caminhante.nextNode()) {
        const texto = (n.textContent ?? '').trim();
        if (!texto || !n.parentElement || !visivel(n.parentElement)) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        const rt = range.getBoundingClientRect();
        if (rt.width === 0) continue;
        const rc = recortar(rt, n.parentElement);
        if (rc.right < rt.right - 1 || rc.left > rt.left + 1 || rc.bottom < rt.bottom - 1)
          textosCortados.push(`Â«${texto}Â» em ${`campo Â«${rotuloDe(u)}Â»`} (visÃ­vel ${Math.max(0, Math.round(rc.right - rc.left))} de ${Math.round(rt.width)} px)`);
      }
      const l = u.el.querySelector('.Traceability SuiteFormField-label');
      if (l && l.scrollWidth > l.clientWidth + 1 && !textosCortados.some((t) => t.includes(`campo Â«${rotuloDe(u)}Â»`)))
        textosCortados.push(`rÃ³tulo Â«${rotuloDe(u)}Â» (scrollWidth ${l.scrollWidth} > clientWidth ${l.clientWidth})`);
    }

    // Placeholder maior do que a Ã¡rea Ãºtil do input (sÃ³ informativo).
    const placeholdersCortados: string[] = [];
    const canvas = document.createElement('canvas').getContext('2d');
    for (const u of campos) {
      const i = u.controlo as HTMLInputElement;
      if (i.tagName !== 'INPUT' || !i.placeholder || i.value || !canvas) continue;
      const cs = getComputedStyle(i);
      canvas.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const precisa = canvas.measureText(i.placeholder).width;
      const util = i.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      if (precisa > util + 1)
        placeholdersCortados.push(`campo Â«${rotuloDe(u)}Â»: Â«${i.placeholder}Â» (${Math.round(precisa)} px em ${Math.round(util)} px)`);
    }

    const se = document.scrollingElement ?? document.documentElement;
    return {
      encontrado: true,
      bloco: caixa(rb),
      campos: campos.map((u) => ({
        rotulo: rotuloDe(u),
        caixa: caixa(u.el.getBoundingClientRect()),
        controlo: caixa(u.controlo.getBoundingClientRect()),
      })),
      botoes: botoes.map((b) => ({ nome: b.nome, caixa: caixa(b.el.getBoundingClientRect()) })),
      sobreposicoes,
      textosCortados,
      placeholdersCortados,
      foraDoBloco,
      overflowPagina: se.scrollWidth - se.clientWidth,
      overflowBloco: bloco.scrollWidth - bloco.clientWidth,
    };
  }, BOTAO_PESQUISA.source);
}

/** CartÃ£o do bloco de filtros marcado por `medirFiltros()` (para a captura). */
export function blocoFiltros(page: Page) {
  return page.locator('[data-qa-bloco-filtros]').first();
}

// --- Exportar (TASK-20260928-10) -------------------------------------------------------------

/** Mensagens da `TabelaComExport` (`ccmsns-ui` `src/commons/export/mensagens.ts`, `estados`). */
export const RE_AVISO_EXPORTAR = /exportar|pesquis|limite|registos/i;

/**
 * Bloqueia no contexto todos os pedidos de escrita Ã  API (POST/PUT/PATCH/DELETE), exceto o
 * `POST â€¦/exportar` (a exportaÃ§Ã£o XLSX usa POST mas nÃ£o grava). Devolve a lista dos bloqueados,
 * para o teste confirmar que nenhum caso tentou gravar. Modelo: `vigiarEscritas` de
 * `paginas/dadosReferencia/formularios.ts`.
 */
export async function bloquearEscritasExcetoExportar(page: Page): Promise<string[]> {
  const bloqueados: string[] = [];
  await page.context().route('**/api/**', async (rota) => {
    const pedido = rota.request();
    const metodo = pedido.method();
    const caminho = new URL(pedido.url()).pathname;
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(metodo) || (metodo === 'POST' && /\/exportar$/.test(caminho))) {
      await rota.fallback();
      return;
    }
    bloqueados.push(`${metodo} ${caminho}`);
    await rota.abort('blockedbyclient');
  });
  return bloqueados;
}

/** Linhas de dados da 1.Âª grelha do conteÃºdo (sem a cÃ©lula de vazio com `colspan`). */
export function linhasDados(page: Page) {
  return page.locator('.Traceability SuiteTemplate__content table').first().locator('tbody tr:not(:has(td[colspan]))');
}

/**
 * Espera a grelha estÃ¡vel depois de pesquisar: sem cÃ©lulas em carregamento e com linhas, texto de
 * vazio que nÃ£o seja o de Â«antes da pesquisaÂ», ou um aviso no ecrÃ£. Devolve o nÂº de linhas e o
 * texto de vazio/aviso (para registar quando nÃ£o hÃ¡ linhas).
 */
export async function esperarResultado(page: Page, timeout = 120_000): Promise<{ linhas: number; texto: string }> {
  const tabela = page.locator('.Traceability SuiteTemplate__content table').first();
  let estado = { linhas: 0, texto: '' };
  await expect
    .poll(
      async () => {
        const aCarregar = await tabela.locator('td.Traceability Suite-tablev2-cell-loading').count();
        const linhas = await linhasDados(page).count();
        const vazio = ((await tabela.locator('tbody td[colspan]').first().textContent().catch(() => '')) ?? '').trim();
        const aviso = (
          await page
            .locator('.Traceability SuiteTemplate__content [role="alert"], .MuiAlert-message')
            .filter({ hasText: /\S/ })
            .allInnerTexts()
        )
          .join(' | ')
          .trim();
        estado = { linhas, texto: aviso || vazio };
        if (aCarregar > 0) return 'a carregar';
        if (linhas > 0) return 'linhas';
        if (aviso) return 'aviso';
        if (vazio && !/Utilize os filtros acima/i.test(vazio)) return 'vazio';
        return 'a carregar';
      },
      { timeout, intervals: [500, 1000, 2000] },
    )
    .not.toBe('a carregar')
    .catch(() => undefined);
  return estado;
}

/**
 * Clica em Exportar e espera o `download`. Se em vez do download aparecer um aviso (sem resultados,
 * limite de linhas, falha), devolve o texto do aviso. NÃ£o lÃª o conteÃºdo do ficheiro (decisÃ£o de
 * 28-09: o XLSX nÃ£o tem de seguir a ordenaÃ§Ã£o).
 */
export async function exportarEsperarDownload(
  page: Page,
  timeout = 180_000,
): Promise<{ download?: Download; aviso?: string }> {
  const botao = page.locator('.Traceability SuiteTemplate__content').getByRole('button', { name: /^Exportar/ }).first();
  const download = page.waitForEvent('download', { timeout }).then(
    (d) => ({ download: d }),
    () => ({ aviso: 'sem download nem aviso dentro do tempo limite' }),
  );
  const avisosAntes = await page.locator('.MuiAlert-message').count();
  await botao.click();
  const aviso = expect
    .poll(async () => page.locator('.MuiAlert-message').count(), { timeout, intervals: [500, 1000] })
    .toBeGreaterThan(avisosAntes)
    .then(async () => ({ aviso: (await page.locator('.MuiAlert-message').last().innerText()).trim() }))
    .catch(() => new Promise<never>(() => undefined));
  return Promise.race([download, aviso]);
}

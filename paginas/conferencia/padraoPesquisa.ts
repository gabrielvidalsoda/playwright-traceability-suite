import type { Page } from '@playwright/test';

/**
 * Leitura do **padrÃ£o de pesquisa** de um ecrÃ£ da ConferÃªncia (TASK-20260928-08, #1568):
 * breadcrumb, largura dos campos de filtro, placeholders e posiÃ§Ã£o do tÃ­tulo. SÃ³ lÃª o DOM e
 * abre/fecha dropdowns (sem escolher opÃ§Ãµes) â€” nada Ã© gravado.
 *
 * Factos de DOM confirmados em `ccmsns-ui` `origin/develop` (sÃ³ leitura) e no DEV a 13-10-2026:
 *   - breadcrumb: `nav.breadcrumb` (presente nos detalhes, ex. `/motor-regras/workflows/10`);
 *   - cartÃ£o: `Paper` do `@Traceability Suite/ui-react` = `.MuiPaper-root`, com o corpo num `Box` com `p: 3`
 *     (`PainelColapsavel`); o tÃ­tulo `h1` vive no cabeÃ§alho do painel;
 *   - grelha de filtros: `Seccao colunas={COLUNAS_FILTROS}` = `display: grid` (6 colunas a
 *     partir de 1328px de painel, 3 abaixo disso; `COLUNAS_FILTROS_QUATRO` em Workflows);
 *   - campo: `.Traceability SuiteFormField-root` (rÃ³tulo `label.Traceability SuiteFormField-label`); texto = `input`
 *     com `placeholder`; SelectBox = `[role=combobox]` com o texto em `.Traceability Suite-select-box-value`
 *     (o placeholder Ã© a 1.Âª opÃ§Ã£o, `aria-selected=true` quando o campo estÃ¡ vazio);
 *     Datepicker = campo com `.Traceability Suite-datepicker-actions` (placeholder = mÃ¡scara `DD/MM/YYYY`).
 */

/** Seletor do breadcrumb (o da app e qualquer variante com a classe). */
export const SELETOR_BREADCRUMB = 'nav.breadcrumb, nav[aria-label*="breadcrumb" i]';

/** CritÃ©rio do `CT-DR-A16` (pastilha/badge no conteÃºdo), alargado a qualquer classe "chip". */
export const SELETOR_CHIPS = [
  '[class*="MuiChip"]',
  '[class*="MuiBadge"]',
  '[class*="badge"]',
  '[class*="chip" i]',
]
  .map((s) => `.Traceability SuiteTemplate__content ${s}`)
  .join(', ');

export type TipoCampo = 'texto' | 'selecao' | 'data';

export interface CampoFiltro {
  rotulo: string;
  tipo: TipoCampo;
  /** Placeholder (texto) ou texto mostrado (seleÃ§Ã£o). */
  placeholder: string | null;
  /** Ãndice do campo no ecrÃ£ (para reabrir a seleÃ§Ã£o). */
  indice: number;
  /** O campo jÃ¡ tem um valor (por omissÃ£o): o placeholder nÃ£o estÃ¡ visÃ­vel e nÃ£o se avalia. */
  comValor: boolean;
}

export interface LinhaFiltros {
  campos: string[];
  /** Largura ocupada pela linha (do 1.Âº ao Ãºltimo campo) em % da Ã¡rea Ãºtil do cartÃ£o. */
  percentagem: number;
}

export interface BlocoFiltros {
  /** TÃ­tulo do bloco (h1â€“h6 do cartÃ£o, acima dos campos), se existir. */
  tituloCartao: string | null;
  larguraUtil: number;
  totalCampos: number;
  linhas: LinhaFiltros[];
}

export interface PadraoPesquisa {
  breadcrumb: string | null;
  h1: { texto: string; dentroDeCartao: boolean } | null;
  blocos: BlocoFiltros[];
  campos: CampoFiltro[];
}

/** Marca usada para reencontrar os campos de seleÃ§Ã£o depois do `evaluate`. */
const ATRIBUTO_INDICE = 'data-qa-campo-filtro';

/**
 * LÃª o padrÃ£o de pesquisa do ecrÃ£ aberto. Os campos de filtro sÃ£o os controlos de formulÃ¡rio
 * dentro de um cartÃ£o **sem tabela** (o cartÃ£o da grelha de resultados, com a paginaÃ§Ã£o e o
 * seletor de colunas, fica de fora), fora de drawers e diÃ¡logos.
 */
export async function lerPadraoPesquisa(page: Page): Promise<PadraoPesquisa> {
  const leitura = await page.evaluate(
    ({ seletorBreadcrumb, atributo }) => {
      const conteudo = document.querySelector('.Traceability SuiteTemplate__content') ?? document.body;
      const cartaoDe = (el: Element) => el.closest('.MuiPaper-root');
      const visivel = (el: Element) => el.getClientRects().length > 0;
      const texto = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

      const bc = document.querySelector(seletorBreadcrumb);
      const h1 = conteudo.querySelector('h1');

      const controlos = Array.from(
        conteudo.querySelectorAll(
          'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not(.MuiSelect-nativeInput), textarea, [role="combobox"]',
        ),
      ).filter((el) => {
        if (!visivel(el)) return false;
        if (el.closest('table, .MuiTablePagination-root, .MuiDrawer-root, [role="dialog"]')) return false;
        const cartao = cartaoDe(el);
        return !!cartao && !cartao.querySelector('table');
      });

      /** CÃ©lula do campo: o filho direto da grelha (ou o `.Traceability SuiteFormField-root`, sem grelha). */
      const celulaDe = (el: Element): { celula: Element; grelha: Element | null } => {
        const cartao = cartaoDe(el);
        let atual: Element | null = el;
        while (atual && atual.parentElement && atual !== cartao) {
          const pai: Element = atual.parentElement;
          if (getComputedStyle(pai).display === 'grid') return { celula: atual, grelha: pai };
          atual = pai;
        }
        return { celula: el.closest('.Traceability SuiteFormField-root') ?? el, grelha: null };
      };

      const campos: {
        rotulo: string;
        tipo: 'texto' | 'selecao' | 'data';
        placeholder: string | null;
        indice: number;
        comValor: boolean;
      }[] = [];
      const porBloco = new Map<Element, { cartao: Element; celulas: Set<Element> }>();
      controlos.forEach((el, indice) => {
        const { celula, grelha } = celulaDe(el);
        const cartao = cartaoDe(el)!;
        const chave = grelha ?? cartao;
        if (!porBloco.has(chave)) porBloco.set(chave, { cartao, celulas: new Set() });
        porBloco.get(chave)!.celulas.add(celula);

        const campo = el.closest('.Traceability SuiteFormField-root') ?? celula;
        const rotulo =
          texto(campo.querySelector('label')) || el.getAttribute('aria-label') || el.getAttribute('placeholder') || `campo ${indice + 1}`;
        el.setAttribute(atributo, String(indice));
        // SelectBox = `div[role=combobox]`; um `input[role=combobox]` Ã© um Autocomplete (campo de texto).
        if (el.getAttribute('role') === 'combobox' && el.tagName !== 'INPUT') {
          campos.push({
            rotulo,
            tipo: 'selecao',
            placeholder: texto(el.querySelector('.Traceability Suite-select-box-value') ?? el),
            indice,
            comValor: false,
          });
        } else {
          const tipo = campo.querySelector('.Traceability Suite-datepicker-actions') ? 'data' : 'texto';
          const valor = (el as HTMLInputElement).value ?? '';
          campos.push({ rotulo, tipo, placeholder: el.getAttribute('placeholder'), indice, comValor: valor.trim() !== '' });
        }
      });

      const blocos = Array.from(porBloco.values()).map(({ cartao, celulas }) => {
        const corpo = cartao.firstElementChild ?? cartao;
        const cs = getComputedStyle(corpo);
        const rc = corpo.getBoundingClientRect();
        const larguraUtil = rc.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        const caixas = Array.from(celulas)
          .map((c) => ({ r: c.getBoundingClientRect(), rotulo: texto(c.querySelector('label')) || texto(c).slice(0, 30) }))
          .sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left);
        const linhas: { campos: string[]; esquerda: number; direita: number; topo: number }[] = [];
        for (const { r, rotulo } of caixas) {
          const linha = linhas.find((l) => Math.abs(l.topo - r.top) <= 4);
          if (linha) {
            linha.campos.push(rotulo);
            linha.esquerda = Math.min(linha.esquerda, r.left);
            linha.direita = Math.max(linha.direita, r.right);
          } else {
            linhas.push({ campos: [rotulo], esquerda: r.left, direita: r.right, topo: r.top });
          }
        }
        const topoCampos = Math.min(...caixas.map((c) => c.r.top));
        const tituloCartao = Array.from(cartao.querySelectorAll('h1, h2, h3, h4, h5, h6')).find(
          (h) => visivel(h) && h.getBoundingClientRect().bottom <= topoCampos + 1,
        );
        return {
          tituloCartao: tituloCartao ? texto(tituloCartao) : null,
          larguraUtil: Math.round(larguraUtil),
          totalCampos: caixas.length,
          linhas: linhas.map((l) => ({
            campos: l.campos,
            percentagem: Math.round(((l.direita - l.esquerda) / larguraUtil) * 1000) / 10,
          })),
        };
      });

      return {
        breadcrumb: bc ? texto(bc) || '(vazio)' : null,
        h1: h1 ? { texto: texto(h1), dentroDeCartao: !!cartaoDe(h1) } : null,
        blocos,
        campos,
      };
    },
    { seletorBreadcrumb: SELETOR_BREADCRUMB, atributo: ATRIBUTO_INDICE },
  );

  // Uma seleÃ§Ã£o cujo texto nÃ£o Ã© Â«Selecioneâ€¦Â» pode ter um valor por omissÃ£o (ex. Estado =
  // Â«DisponÃ­velÂ» na SupervisÃ£o): abre-se a lista (sem escolher) e, se a opÃ§Ã£o marcada nÃ£o for a
  // 1.Âª (a vazia), o texto Ã© um valor e nÃ£o um placeholder.
  for (const campo of leitura.campos) {
    if (campo.tipo !== 'selecao' || /^Selecc?ione/i.test(campo.placeholder ?? '')) continue;
    const caixa = page.locator(`[${ATRIBUTO_INDICE}="${campo.indice}"]`);
    if ((await caixa.getAttribute('aria-disabled')) === 'true') continue;
    await caixa.click();
    const opcoes = page.getByRole('option');
    const aberta = await opcoes.first().isVisible({ timeout: 5_000 }).catch(() => false);
    if (aberta) {
      const marcada = await opcoes.evaluateAll((os) => os.findIndex((o) => o.getAttribute('aria-selected') === 'true'));
      if (marcada > 0) campo.comValor = true;
    }
    await page.keyboard.press('Escape');
  }
  return leitura;
}

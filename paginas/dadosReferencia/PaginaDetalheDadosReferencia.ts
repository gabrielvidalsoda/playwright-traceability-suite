import { expect, type Locator, type Page } from '@playwright/test';
import { abrirRota } from '../appMock';

/** Um tÃ­tulo (`h1`â€“`h6`) do conteÃºdo da pÃ¡gina, com o cartÃ£o (`Paper`) a que pertence. */
export interface TituloDetalhe {
  nivel: number;
  texto: string;
  /** Ãndice do `.MuiPaper-root` que o contÃ©m (-1 = fora de qualquer cartÃ£o). */
  cartao: number;
  /** O tÃ­tulo tem o toggle Colapsar/Expandir ao lado (`PainelColapsavel collapsible`). */
  colapsavel: boolean;
  tamanhoFonte: number;
}

/** Fotografia estrutural da pÃ¡gina de detalhe, para as verificaÃ§Ãµes A12/A13. */
export interface EstruturaDetalhe {
  titulos: TituloDetalhe[];
  /** BotÃµes com rÃ³tulo, com o cartÃ£o a que pertencem e a posiÃ§Ã£o vertical. */
  botoes: { rotulo: string; cartao: number; topo: number }[];
  /** Abas (`role=tab`) e o cartÃ£o onde estÃ£o. */
  abas: { rotulo: string; cartao: number }[];
  /** Fundo (y) do Ãºltimo cartÃ£o. */
  fundoUltimoCartao: number;
}

/**
 * Page object genÃ©rico das pÃ¡ginas de detalhe de Dados de ReferÃªncia.
 *
 * Estrutura confirmada no DOM real (modo mock) para as 12 telas do roteiro: um cartÃ£o
 * de cabeÃ§alho (`PainelColapsavel collapsible nivelTitulo="h1"`, com as aÃ§Ãµes Exportar /
 * "Ir paraâ€¦" no `acoesExtra`), um segundo cartÃ£o com as listas (`PainelColapsavel
 * semSuperficie collapsible` â†’ `h2`, ou abas `Tabview`) e o `Voltar` fora dos cartÃµes,
 * no rodapÃ© (`RodapeVoltar` / `Button` "Voltar").
 */
export class PaginaDetalheDadosReferencia {
  constructor(readonly page: Page) {}

  async abrir(rota: string): Promise<void> {
    await abrirRota(this.page, rota);
  }

  /** Espera o fim do carregamento (`ACarregar`) e o `h1` do detalhe. */
  async esperarCarregado(): Promise<void> {
    await expect(this.conteudo().getByText('A carregar...')).toHaveCount(0);
    await expect(this.titulo()).toBeVisible();
    await expect(this.titulo()).not.toHaveText(/^Pesquisa/);
  }

  conteudo(): Locator {
    return this.page.locator('.Traceability SuiteTemplate__content');
  }
  titulo(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }
  breadcrumb(): Locator {
    return this.page.locator('nav.breadcrumb');
  }
  /**
   * NÃ­veis do breadcrumb, pela ordem, com o `href` do link quando o nÃ­vel Ã© navegÃ¡vel
   * (separadores de um carÃ¡cter sÃ£o ignorados).
   */
  async itensBreadcrumb(): Promise<{ texto: string; href: string | null }[]> {
    await expect(this.breadcrumb()).toBeVisible();
    return this.breadcrumb().evaluate((nav) => {
      const lis = Array.from(nav.querySelectorAll('li'));
      const base = lis.length > 0 ? lis : Array.from(nav.querySelectorAll('a, span'));
      return base
        .map((el) => {
          const link = el.tagName === 'A' ? el : el.querySelector('a');
          return { texto: (el.textContent ?? '').trim(), href: link ? link.getAttribute('href') : null };
        })
        .filter((i) => i.texto !== '' && !/^[/>â€ºÂ»|]$/.test(i.texto));
    });
  }
  /** `Alert` MUI (erro do pedido ou validaÃ§Ã£o). */
  alertas(): Locator {
    return this.conteudo().locator('.MuiAlert-root');
  }
  botaoVoltar(): Locator {
    return this.conteudo().getByRole('button', { name: 'Voltar', exact: true });
  }
  botaoColapsar(): Locator {
    return this.conteudo().getByRole('button', { name: 'Colapsar', exact: true });
  }
  botaoExpandir(): Locator {
    return this.conteudo().getByRole('button', { name: 'Expandir', exact: true });
  }
  /** XPath do tÃ­tulo (h1/h2) de um cartÃ£o ou painel. */
  private xTitulo(titulo: string): string {
    return `//*[self::h1 or self::h2][normalize-space()="${titulo}"]`;
  }
  /** Toggle Colapsar/Expandir que estÃ¡ na mesma linha do tÃ­tulo indicado. */
  toggleDoPainel(titulo: string): Locator {
    return this.conteudo().locator(
      `xpath=${this.xTitulo(titulo)}/parent::*//button[@aria-label="Colapsar" or @aria-label="Expandir"]`,
    );
  }
  /** Corpo do painel: o bloco irmÃ£o a seguir Ã  linha do tÃ­tulo (`PainelColapsavel`). */
  corpoDoPainel(titulo: string): Locator {
    return this.conteudo().locator(`xpath=${this.xTitulo(titulo)}/parent::*/following-sibling::*[1]`);
  }
  /** Tabela de um painel de lista. */
  tabelaDoPainel(titulo: string): Locator {
    return this.corpoDoPainel(titulo).locator('table').first();
  }

  async estrutura(): Promise<EstruturaDetalhe> {
    return this.conteudo().evaluate((raiz) => {
      const cartoes = Array.from(raiz.querySelectorAll('.MuiPaper-root'));
      const cartaoDe = (el: Element) => cartoes.indexOf(el.closest('.MuiPaper-root') as Element);
      const titulos = Array.from(raiz.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((h) => {
        const linha = h.parentElement;
        const toggle = linha?.querySelector(
          ':scope > div button[aria-label="Colapsar"], :scope > div button[aria-label="Expandir"]',
        );
        return {
          nivel: Number(h.tagName.slice(1)),
          texto: (h.textContent ?? '').trim(),
          cartao: cartaoDe(h),
          colapsavel: !!toggle,
          tamanhoFonte: parseFloat(getComputedStyle(h).fontSize),
        };
      });
      const botoes = Array.from(raiz.querySelectorAll('button'))
        .map((b) => ({
          rotulo: (b.getAttribute('aria-label') || b.textContent || '').trim(),
          cartao: cartaoDe(b),
          topo: b.getBoundingClientRect().top + window.scrollY,
        }))
        .filter((b) => b.rotulo);
      const abas = Array.from(raiz.querySelectorAll('[role="tab"]')).map((t) => ({
        rotulo: (t.textContent ?? '').trim(),
        cartao: cartaoDe(t),
      }));
      const ultimo = cartoes[cartoes.length - 1];
      return {
        titulos,
        botoes,
        abas,
        fundoUltimoCartao: ultimo ? ultimo.getBoundingClientRect().bottom + window.scrollY : 0,
      };
    });
  }
}

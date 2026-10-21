import { expect, type Locator, type Page } from '@playwright/test';
import { abrirRota } from '../appMock';
import { filtroDaTela, type TelaDadosReferencia } from './telas';

/** Textos Ãºnicos da tabela vazia (`ccmsns-ui` `src/commons/estados/mensagens.ts`). */
export const MSG_ANTES_PESQUISA = 'Utilize os filtros acima e clique em pesquisar.';
export const MSG_SEM_RESULTADOS_PESQUISA = 'Nenhum resultado encontrado.';
export const MSG_SEM_RESULTADOS = 'Nenhum resultado apresentado';

/**
 * Page object genÃ©rico das telas de pesquisa de Dados de ReferÃªncia (e Exames MCDT),
 * que desde as PRs #50/#55 seguem todas o mesmo padrÃ£o.
 *
 * Seletores confirmados no cÃ³digo (`ccmsns-ui`, `origin/develop`, sÃ³ leitura) e no DOM
 * real em modo mock:
 *   - tÃ­tulo: `PainelColapsavel nivelTitulo="h1"` (`src/commons/layout/PainelColapsavel.tsx`);
 *   - tabela: `TabelaComExport` (`src/commons/export/TabelaComExport.tsx`) sobre o
 *     `TableV2` do `@Traceability Suite/ui-react` â€” `<th aria-label="Ordenar por <coluna>" aria-sort>`,
 *     `<th abbr="<coluna>">`, `<td headers="actions">`, linhas `odd-row`/`even-row`,
 *     cÃ©lula vazia com `colspan` e o texto `labelEmptyRows`;
 *   - coluna de aÃ§Ãµes: `colunaAccoes` (`src/commons/tabela/colunaAccoes.ts`) â€” `colId`
 *     `actions`, `headerName: ''`, `headerAriaLabel: 'AÃ§Ãµes'`;
 *   - Exportar: `BotaoExportar` â€” `aria-label="Exportar XLSX"`;
 *   - seletor de colunas: `SeletorColunas` â€” `aria-label="Escolher colunas"`;
 *   - paginaÃ§Ã£o: `Pagination` MUI â€” "Go to next page";
 *   - breadcrumb: `nav.breadcrumb` (`@Traceability Suite/ui-react` Breadcrumb), escondido nas rotas
 *     de `ROTAS_SEM_BREADCRUMB` de `src/layout/MainLayout.tsx`.
 */
export class PaginaPesquisaDadosReferencia {
  constructor(
    readonly page: Page,
    readonly tela: TelaDadosReferencia,
  ) {}

  async abrir(query = ''): Promise<void> {
    await abrirRota(this.page, `${this.tela.rota}${query}`);
    await expect(this.botaoPesquisar()).toBeVisible();
  }

  // --- cabeÃ§alho ---------------------------------------------------------
  titulo(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }
  breadcrumb(): Locator {
    return this.page.locator('nav.breadcrumb');
  }

  // --- formulÃ¡rio ----------------------------------------------------------
  formulario(): Locator {
    return this.page.locator('.Traceability SuiteTemplate__content form').first();
  }
  campo(rotulo: string): Locator {
    return this.formulario().getByRole('textbox', { name: rotulo, exact: true });
  }
  seletor(rotulo: string): Locator {
    return this.formulario().getByRole('combobox', { name: rotulo, exact: true });
  }
  botaoPesquisar(): Locator {
    return this.page.getByRole('button', { name: 'Pesquisar', exact: true });
  }
  botaoLimpar(): Locator {
    return this.formulario().getByRole('button', { name: 'Limpar', exact: true });
  }
  /** Mensagens de validaÃ§Ã£o por baixo dos campos e aviso de filtros obrigatÃ³rios. */
  alertas(): Locator {
    return this.page.locator('.Traceability SuiteTemplate__content [role="alert"]');
  }

  async preencherFiltro(): Promise<void> {
    const f = filtroDaTela(this.tela);
    if (!f) return;
    if (f.tipo === 'combobox') {
      await this.seletor(f.rotulo).click();
      await this.page.getByRole('option', { name: f.valor, exact: true }).click();
    } else {
      await this.campo(f.rotulo).fill(f.valor);
    }
  }

  /** Clica em Pesquisar e espera que a grelha saia do estado "antes da pesquisa". */
  async pesquisar(): Promise<void> {
    await this.botaoPesquisar().click();
    await expect(this.celulaVazia().filter({ hasText: MSG_ANTES_PESQUISA })).toHaveCount(0);
    await this.esperarResultados();
  }

  /**
   * Espera a grelha estÃ¡vel: sem cÃ©lulas em carregamento (`Traceability Suite-tablev2-cell-loading`,
   * enquanto o `TableV2` ignora cliques de ordenaÃ§Ã£o) e com linhas ou o texto de vazio.
   */
  async esperarResultados(): Promise<void> {
    await expect(this.tabela().locator('td.Traceability Suite-tablev2-cell-loading')).toHaveCount(0);
    await expect(this.linhasDados().first().or(this.textoTabelaVazia())).toBeVisible();
  }

  /** Preenche o filtro mÃ­nimo da tela e pesquisa. */
  async pesquisarComFiltro(): Promise<void> {
    await this.preencherFiltro();
    await this.pesquisar();
  }

  // --- grelha --------------------------------------------------------------
  tabela(): Locator {
    return this.page.locator('.Traceability SuiteTemplate__content table').first();
  }
  cabecalhos(): Locator {
    return this.tabela().locator('thead th');
  }
  cabecalhoAcoes(): Locator {
    return this.tabela().locator('thead th#actions');
  }
  cabecalhoOrdenavel(coluna: string): Locator {
    return this.tabela().getByRole('columnheader', { name: `Ordenar por ${coluna}`, exact: true });
  }
  /** CabeÃ§alho pelo `abbr` (= nome da coluna), ordenÃ¡vel ou nÃ£o. */
  cabecalho(coluna: string): Locator {
    return this.tabela().locator(`thead th[abbr="${coluna}"]`);
  }
  linhasDados(): Locator {
    return this.tabela()
      .locator('tbody tr')
      .filter({ has: this.page.locator('td[headers="actions"]') });
  }
  celulaVazia(): Locator {
    return this.tabela().locator('tbody td[colspan]');
  }
  textoTabelaVazia(): Locator {
    return this.celulaVazia().locator('.Traceability Suite-tablev2-cell-content-wrapper');
  }
  botoesVerDetalhe(): Locator {
    return this.tabela().locator('td[headers="actions"] button[aria-label^="Ver detalhe"]');
  }
  botaoExportar(): Locator {
    return this.page.getByRole('button', { name: 'Exportar XLSX' });
  }
  botaoEscolherColunas(): Locator {
    return this.page.getByRole('button', { name: 'Escolher colunas' });
  }
  botaoPaginaSeguinte(): Locator {
    return this.page.getByRole('button', { name: 'Go to next page' });
  }

  /** Textos de uma coluna (pela posiÃ§Ã£o do `<th abbr>`), na ordem das linhas visÃ­veis. */
  async valoresColuna(coluna: string): Promise<string[]> {
    return this.tabela().evaluate((tabela, nome) => {
      const ths = Array.from(tabela.querySelectorAll('thead th'));
      const idx = ths.findIndex((th) => th.getAttribute('abbr') === nome);
      if (idx < 0) throw new Error(`Coluna "${nome}" nÃ£o encontrada`);
      return Array.from(tabela.querySelectorAll('tbody tr'))
        .filter((tr) => tr.querySelector('td[headers="actions"]'))
        .map((tr) => (tr.querySelectorAll('td')[idx]?.textContent ?? '').trim());
    }, coluna);
  }

  /**
   * Clica no cabeÃ§alho e espera o `aria-sort` pedido. A ordenaÃ§Ã£o destas telas Ã© feita
   * no servidor (`sort=<campo>,<asc|desc>` na URL/pedido) â€” a grelha re-renderiza.
   */
  async ordenarPor(coluna: string, esperado: 'ascending' | 'descending'): Promise<void> {
    const th = this.cabecalhoOrdenavel(coluna);
    const sentido = esperado === 'ascending' ? 'asc' : 'desc';
    const resposta = this.page.waitForResponse(
      (r) =>
        r.request().method() === 'GET' &&
        new RegExp(`[?&]sort=[^&]+,${sentido}(&|$)`).test(decodeURIComponent(r.url())),
    );
    await this.esperarResultados();
    await th.click();
    await expect(th).toHaveAttribute('aria-sort', esperado);
    await resposta;
    await this.esperarResultados();
  }

  async abrirPrimeiroDetalhe(): Promise<void> {
    await this.botoesVerDetalhe().first().click();
    await expect(this.page).not.toHaveURL(new RegExp(`${this.tela.rota}(\\?.*)?$`));
    // O formulÃ¡rio de pesquisa desaparece quando o detalhe substitui a lista (nem todos
    // os detalhes tÃªm h1 â€” ex. Diplomas).
    await expect(this.botaoPesquisar()).toHaveCount(0);
    await expect(this.page.getByText('A carregar...')).toHaveCount(0);
  }
}

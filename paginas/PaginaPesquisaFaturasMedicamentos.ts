import { expect, type Locator, type Page, type Response } from '@playwright/test';
import { abrirRota } from './appMock';

/**
 * Page object da tela "Pesquisa Facturas" de Medicamentos (`/medicamentos/factura`).
 *
 * Seletores confirmados contra o DOM real (ccmsns-ui em modo mock):
 *   - form: `src/pages/medicamentos/facturaMed/components/FormFiltrosFactura.tsx`
 *     (labels pt-PT "Fac**t**ura"); campos = `role=textbox` / `role=combobox`
 *     (assim nÃ£o colidem com os `columnheader` homÃ³nimos da grelha).
 *   - grelha: `TableV2` do `@Traceability Suite/ui-react` (`<table>` real). Linha de dados = tem
 *     um botÃ£o "Ver detalhes da factura <nÂº>". NÃ£o hÃ¡ `data-testid`.
 */
export class PaginaPesquisaFaturasMedicamentos {
  readonly rota = '/medicamentos/factura';

  constructor(private readonly page: Page) {}

  // --- filtros ---------------------------------------------------------
  campoNumeroFatura(): Locator {
    return this.page.getByRole('textbox', { name: 'NÃºmero da Factura' });
  }
  campoNif(): Locator {
    return this.page.getByRole('textbox', { name: 'NIF Prestador' });
  }
  campoProcesso(): Locator {
    return this.page.getByRole('textbox', { name: 'NÃºmero do Processo' });
  }
  campoData(): Locator {
    return this.page.getByRole('textbox', { name: 'Data da Factura' });
  }
  seletorEstado(): Locator {
    return this.page.getByRole('combobox', { name: 'Estado' });
  }
  botaoPesquisar(): Locator {
    return this.page.getByRole('button', { name: 'Pesquisar' });
  }
  botaoLimpar(): Locator {
    return this.page.getByRole('button', { name: 'Limpar', exact: true });
  }

  // --- grelha ---------------------------------------------------------
  tabela(): Locator {
    return this.page.getByRole('table');
  }
  linhasResultado(): Locator {
    return this.tabela()
      .getByRole('row')
      .filter({ has: this.page.getByRole('button', { name: /Ver detalhes da factura/ }) });
  }
  celulaFatura(numero: string): Locator {
    return this.tabela().getByRole('cell', { name: numero, exact: true });
  }
  cabecalho(nome: string): Locator {
    return this.page.getByRole('columnheader', { name: nome });
  }
  estadoVazio(): Locator {
    return this.page.getByText('Nenhum resultado encontrado...');
  }
  mensagemCriterioMinimo(): Locator {
    return this.page.getByText('Ã‰ necessÃ¡rio preencher pelo menos um dos campos de pesquisa.');
  }

  // --- paginaÃ§Ã£o -----------------------------------------------------
  navegacaoPaginas(): Locator {
    return this.page.getByRole('navigation', { name: /pagination/i });
  }
  botaoPagina(nome: 'first' | 'previous' | 'next' | 'last'): Locator {
    return this.page.getByRole('button', { name: `Go to ${nome} page` });
  }
  seletorTamanhoPagina(): Locator {
    return this.page.getByRole('combobox', { name: /Resultados por pÃ¡gina/i });
  }

  // --- ordenaÃ§Ã£o / exportaÃ§Ã£o -------------------------------------------
  cabecalhoOrdenavel(coluna: string): Locator {
    return this.page.getByRole('columnheader', { name: `Ordenar por ${coluna}` });
  }
  botaoExportar(): Locator {
    return this.page.getByRole('button', { name: 'Exportar XLSX' });
  }

  async ordenarPor(coluna: string): Promise<void> {
    const r = this.esperarPesquisa();
    await this.cabecalhoOrdenavel(coluna).click();
    await r;
  }

  // --- aÃ§Ãµes --------------------------------------------------------
  async abrir(): Promise<void> {
    await abrirRota(this.page, this.rota);
    await expect(this.botaoPesquisar()).toBeVisible();
  }

  private esperarPesquisa(): Promise<Response> {
    return this.page.waitForResponse(
      (r) => /\/medicamentos\/facturas\?/.test(r.url()) && r.request().method() === 'GET',
    );
  }

  async pesquisar(): Promise<void> {
    const r = this.esperarPesquisa();
    await this.botaoPesquisar().click();
    await r;
  }

  async pesquisarPorNumero(numero: string): Promise<void> {
    await this.campoNumeroFatura().fill(numero);
    await this.pesquisar();
  }

  async pesquisarPorNif(nif: string): Promise<void> {
    await this.campoNif().fill(nif);
    await this.pesquisar();
  }

  async pesquisarPorProcesso(processo: string): Promise<void> {
    await this.campoProcesso().fill(processo);
    await this.pesquisar();
  }

  /**
   * Preenche o datepicker "Data da Factura" (formato `DD/MM/AAAA`) e confirma com
   * `Enter` para o componente Traceability Suite fazer o parse do texto para `Date`.
   */
  async preencherData(ddmmaaaa: string): Promise<void> {
    const campo = this.campoData();
    await campo.click();
    await campo.fill(ddmmaaaa);
    await campo.press('Enter');
    await this.page.keyboard.press('Escape');
  }

  async selecionarEstado(label: string): Promise<void> {
    await this.seletorEstado().click();
    await this.page.getByRole('option', { name: label, exact: true }).click();
  }

  /**
   * Navega na paginaÃ§Ã£o. NÃ£o espera resposta HTTP: voltar a uma pÃ¡gina jÃ¡
   * visitada Ã© servido da cache do react-query (sem pedido de rede). Os testes
   * validam a mudanÃ§a com asserÃ§Ãµes web-first sobre a grelha.
   */
  async irParaPagina(nome: 'first' | 'previous' | 'next' | 'last'): Promise<void> {
    await this.botaoPagina(nome).click();
  }

  /** NÂº da fatura da primeira linha de resultados (lido do aria-label do botÃ£o de detalhe). */
  async primeiroNumeroFatura(): Promise<string> {
    const rotulo = await this.linhasResultado()
      .first()
      .getByRole('button', { name: /Ver detalhes da factura/ })
      .getAttribute('aria-label');
    return (rotulo ?? '').replace('Ver detalhes da factura', '').trim();
  }

  async abrirDetalheDaPrimeiraLinha(): Promise<void> {
    await this.linhasResultado()
      .first()
      .getByRole('button', { name: /Ver detalhes da factura/ })
      .click();
    await this.page.waitForURL(/\/medicamentos\/factura\/\d+/);
  }
}

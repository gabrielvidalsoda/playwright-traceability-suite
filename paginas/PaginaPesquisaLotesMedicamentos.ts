import { expect, type Locator, type Page, type Response } from '@playwright/test';
import { abrirRota } from './appMock';

/**
 * Page object da tela "Pesquisa Lotes" de Medicamentos (`/medicamentos/lote`).
 * Grelha `TableV2`; linha de dados tem botão "Ver detalhe do lote <nº>".
 *
 * Critério mínimo (Medicamentos): combinação obrigatória — NIF ou Nº de Lote
 * isolados **não** disparam a pesquisa (ver §2.4 do plano funcional).
 */
export class PaginaPesquisaLotesMedicamentos {
  readonly rota = '/medicamentos/lote';

  constructor(private readonly page: Page) {}

  campoNumeroFatura(): Locator {
    return this.page.getByRole('textbox', { name: 'Número da Factura' });
  }
  campoNif(): Locator {
    return this.page.getByRole('textbox', { name: 'NIF Prestador' });
  }
  campoNumeroLote(): Locator {
    return this.page.getByRole('textbox', { name: 'Número de Lote' });
  }
  seletorTipoLote(): Locator {
    return this.page.getByRole('combobox', { name: 'Tipo de Lote' });
  }
  botaoPesquisar(): Locator {
    return this.page.getByRole('button', { name: 'Pesquisar' });
  }
  tabela(): Locator {
    return this.page.getByRole('table');
  }
  linhasResultado(): Locator {
    return this.tabela()
      .getByRole('row')
      .filter({ has: this.page.getByRole('button', { name: /Ver detalhe do lote/ }) });
  }
  cabecalho(nome: string): Locator {
    return this.page.getByRole('columnheader', { name: nome });
  }

  async abrir(): Promise<void> {
    await abrirRota(this.page, this.rota);
    await expect(this.botaoPesquisar()).toBeVisible();
  }

  private esperarPesquisa(): Promise<Response> {
    return this.page.waitForResponse(
      (resp) => /\/medicamentos\/lotes\?/.test(resp.url()) && resp.request().method() === 'GET',
    );
  }

  async pesquisarPorNumeroFatura(numero: string): Promise<void> {
    await this.campoNumeroFatura().fill(numero);
    const r = this.esperarPesquisa();
    await this.botaoPesquisar().click();
    await r;
  }

  async selecionarTipoLote(label: string): Promise<void> {
    await this.seletorTipoLote().click();
    await this.page.getByRole('option', { name: label, exact: true }).click();
  }

  async pesquisarPorTipoENumero(tipo: string, numeroLote: string): Promise<void> {
    await this.selecionarTipoLote(tipo);
    await this.campoNumeroLote().fill(numeroLote);
    const r = this.esperarPesquisa();
    await this.botaoPesquisar().click();
    await r;
  }

  async abrirDetalheDoPrimeiroLote(): Promise<void> {
    await this.linhasResultado()
      .first()
      .getByRole('button', { name: /Ver detalhe do lote/ })
      .click();
    await this.page.waitForURL(/\/medicamentos\/lote\/\d+/);
  }
}

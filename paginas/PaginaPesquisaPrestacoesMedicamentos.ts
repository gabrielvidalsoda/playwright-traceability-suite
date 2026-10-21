import { expect, type Locator, type Page, type Response } from '@playwright/test';
import { abrirRota } from './appMock';

/**
 * Page object da tela "Pesquisa Prestações" de Medicamentos (`/medicamentos/prestacoes`).
 * Grelha `TableV2`; linha de dados tem botão "Ver detalhe…".
 *
 * Critério mínimo: combinação obrigatória — sem filtro, ao clicar "Pesquisar"
 * é exibido um `role=alert` com a mensagem de combinações mínimas.
 */
export class PaginaPesquisaPrestacoesMedicamentos {
  readonly rota = '/medicamentos/prestacoes';

  constructor(private readonly page: Page) {}

  campoNumeroReceita(): Locator {
    return this.page.getByRole('textbox', { name: 'Número de Receita' });
  }
  campoNumeroFatura(): Locator {
    return this.page.getByRole('textbox', { name: 'Número da Factura' });
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
      .filter({ has: this.page.getByRole('button', { name: /Ver detalhe/ }) });
  }
  cabecalho(nome: string): Locator {
    return this.page.getByRole('columnheader', { name: nome });
  }
  mensagemCriterioMinimo(): Locator {
    return this.page.getByRole('alert').filter({ hasText: 'Deverá estar preenchido, pelo menos' });
  }

  async abrir(): Promise<void> {
    await abrirRota(this.page, this.rota);
    await expect(this.botaoPesquisar()).toBeVisible();
  }

  private esperarPesquisa(): Promise<Response> {
    return this.page.waitForResponse(
      (resp) =>
        /\/medicamentos\/prestacoes\?/.test(resp.url()) && resp.request().method() === 'GET',
    );
  }

  async pesquisarPorNumeroReceita(receita: string): Promise<void> {
    await this.campoNumeroReceita().fill(receita);
    const r = this.esperarPesquisa();
    await this.botaoPesquisar().click();
    await r;
  }

  async pesquisarPorNumeroFatura(numero: string): Promise<void> {
    await this.campoNumeroFatura().fill(numero);
    const r = this.esperarPesquisa();
    await this.botaoPesquisar().click();
    await r;
  }
}

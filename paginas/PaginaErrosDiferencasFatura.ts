import { type Locator, type Page } from '@playwright/test';
import { abrirRota } from './appMock';

/**
 * Page object da tela dedicada "Erros e diferenças" de uma fatura de Medicamentos
 * (`/medicamentos/factura/:id/erros-diferencas`, `ErrosDiferencasPage.tsx`).
 *
 * Usa o mesmo endpoint (`GET /medicamentos/facturas/:id/erros-diferencas`, via
 * `searchErrosDiferencas`) que a secção "Erros" da aba "Informações" no detalhe
 * da fatura (`useErrosDiferencasFactura` chama o mesmo serviço com o mesmo id)
 * — por isso os dados das duas telas devem coincidir (BUG-20260910-09).
 *
 * O título (`Erros e diferenças — Factura {id}`) interpola hoje o `:id` da rota
 * (o identificador interno), não o número real da fatura (BUG-20260910-10).
 */
export class PaginaErrosDiferencasFatura {
  constructor(private readonly page: Page) {}

  async abrirPorId(id: string | number): Promise<void> {
    await abrirRota(this.page, `/medicamentos/factura/${id}/erros-diferencas`);
  }

  titulo(): Locator {
    return this.page.getByRole('heading', { level: 4, name: /^Erros e diferenças — Factura/ });
  }

  botaoVoltar(): Locator {
    return this.page.getByRole('button', { name: 'Voltar' });
  }

  tabela(): Locator {
    return this.page.getByRole('table');
  }

  /** Linhas de dados (exclui o cabeçalho — sem coluna de ação nesta tela). */
  linhas(): Locator {
    return this.tabela()
      .getByRole('row')
      .filter({ has: this.page.getByRole('cell') });
  }

  cabecalho(nome: string): Locator {
    return this.page.getByRole('columnheader', { name: nome });
  }
}

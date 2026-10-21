import { type Locator, type Page } from '@playwright/test';

/**
 * Page object do detalhe do lote de Medicamentos (`/medicamentos/lote/:id`).
 *
 * Tela **somente leitura**: campos como `paragraph`. Ações: "Ir para Factura",
 * breadcrumb "Lotes", abas "Detalhe do Lote" / "Prestações".
 */
export class PaginaDetalheLoteMedicamentos {
  constructor(private readonly page: Page) {}

  titulo(): Locator {
    return this.page.getByRole('heading', { name: 'Lote de Medicamentos' });
  }
  botaoIrParaFactura(): Locator {
    return this.page.getByRole('button', { name: 'Ir para Factura' });
  }
  blocoTotaisComunicados(): Locator {
    return this.page.getByRole('heading', { name: 'Totais Comunicados' });
  }
  blocoTotaisApurados(): Locator {
    return this.page.getByRole('heading', { name: 'Totais Apurados' });
  }
  abaDetalheDoLote(): Locator {
    return this.page.getByRole('tab', { name: 'Detalhe do Lote' });
  }
  abaPrestacoes(): Locator {
    return this.page.getByRole('tab', { name: 'Prestações' });
  }

  /** Inputs editáveis para campos de DADOS do lote (deve ser 0: tela de consulta). */
  camposDadosEditaveis(): Locator {
    return this.page.getByRole('textbox', {
      name: /Número do Lote|Tipo de Lote|Estado|Número da Factura|Total (PVP|PVU|Comp|Fee)|NIF/i,
    });
  }
}

import { expect, type Locator, type Page } from '@playwright/test';
import { abrirRota } from './appMock';

/**
 * Page object da tela "Pesquisa Facturas" de Cuidados RespiratÃ³rios (CRD)
 * (`/cuidados-respiratorios/factura`).
 *
 * Seletores confirmados contra o cÃ³digo-fonte (`CCM/repos/ccmsns-ui`, sÃ³ leitura):
 *   - form: `src/pages/crd/factura/FacturaFormFiltros.tsx` â€” rÃ³tulos pt-PT reais:
 *     "NÃºmero da Factura", **"Data da FacturaÃ§Ã£o"** (nÃ£o "Data da Factura" â€” nome
 *     usado no relatÃ³rio original do bug era informal), "NIF do Prestador",
 *     "CÃ³digo do Prestador", "Estado".
 *   - datepicker: `@Traceability Suite/ui-react` `Datepicker` (componente prÃ³prio, nÃ£o MUI X) â€”
 *     `src/components/Datepicker/mui/components/Datepicker/controller.mjs` renderiza
 *     o Ã­cone de calendÃ¡rio como `<button aria-label="Abrir/fechar calendÃ¡rio">`
 *     (`CalendarIcon` Ã© `styled('button', ...)`; rÃ³tulo de
 *     `shared/models.mjs`, `defaultLocale.aria.calendarIcon`).
 */
export class PaginaPesquisaFaturasCrd {
  readonly rota = '/cuidados-respiratorios/factura';

  constructor(private readonly page: Page) {}

  campoNumeroFatura(): Locator {
    return this.page.getByRole('textbox', { name: 'NÃºmero da Factura' });
  }
  campoDataFacturacao(): Locator {
    return this.page.getByRole('textbox', { name: 'Data da FacturaÃ§Ã£o' });
  }
  botaoCalendarioData(): Locator {
    return this.page.getByRole('button', { name: 'Abrir/fechar calendÃ¡rio' });
  }
  campoNif(): Locator {
    return this.page.getByRole('textbox', { name: 'NIF do Prestador' });
  }
  campoCodigoPrestador(): Locator {
    return this.page.getByRole('textbox', { name: 'CÃ³digo do Prestador' });
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
  mensagemCriterioMinimo(): Locator {
    return this.page.getByText('Ã‰ necessÃ¡rio preencher pelo menos um dos campos de pesquisa.');
  }
  /**
   * BotÃ£o "MÃªs anterior" do painel do calendÃ¡rio â€” sÃ³ visÃ­vel quando o painel
   * estÃ¡ aberto; serve de evidÃªncia de que o date-picker abriu (`Panel/index.mjs`,
   * `monthPreviousButtonProps['aria-label']`, `defaultLocale.aria.previousMonth`).
   */
  botaoMesAnteriorCalendario(): Locator {
    return this.page.getByRole('button', { name: 'MÃªs anterior' });
  }

  async abrir(): Promise<void> {
    await abrirRota(this.page, this.rota);
    await expect(this.botaoPesquisar()).toBeVisible();
  }

  /**
   * Preenche "Data da FacturaÃ§Ã£o" (formato `DD/MM/AAAA`) digitando e confirma
   * com `Enter`, no mesmo padrÃ£o comprovado em
   * `PaginaPesquisaFaturasMedicamentos.preencherData`.
   */
  async preencherData(ddmmaaaa: string): Promise<void> {
    const campo = this.campoDataFacturacao();
    await campo.click();
    await campo.fill(ddmmaaaa);
    await campo.press('Enter');
    await this.page.keyboard.press('Escape');
  }
}

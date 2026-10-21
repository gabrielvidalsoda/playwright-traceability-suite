import { expect, type Page } from '@playwright/test';
import { botao, ci, MSG, pesquisar, Tabela, tituloH1 } from './Traceability Suite';

/**
 * Listas do Motor de Regras (Workflows, Regras, AprovaÃ§Ãµes, Logs) â€” `ccmsns-ui`
 * `pages/motor-regras/*Page.tsx`: nÃ£o pesquisam ao abrir (`enabled: pesquisou`), guardam
 * filtros/pÃ¡gina/ordem no URL (`_q=1`, `_p`, `_t`, `_o`, `useGridStateNaUrl`) e mostram a
 * grelha Â«Resultados da PesquisaÂ» (TabelaComExport).
 */
export class ListaMotorRegras {
  constructor(
    readonly page: Page,
    readonly rota: string,
    readonly titulo: string,
    /** Uma coluna que sÃ³ existe nesta grelha (identifica a tabela). */
    readonly colunaChave: string,
    /** Caminho da API de pesquisa (para esperar a resposta). */
    readonly api: RegExp,
  ) {}

  async abrir(query = ''): Promise<void> {
    await this.page.goto(`${this.rota}${query}`, { waitUntil: 'domcontentloaded' });
    await expect(tituloH1(this.page)).toHaveText(ci(this.titulo), { timeout: 30_000 });
  }
  tabela(): Tabela {
    return Tabela.comColuna(this.page, this.colunaChave);
  }
  async pesquisar(): Promise<void> {
    const resp = this.page.waitForResponse((r) => this.api.test(r.url()) && r.request().method() === 'GET', { timeout: 60_000 });
    await pesquisar(this.page).click();
    await resp;
    await expect(this.tabela().celulaVazia().filter({ hasText: MSG.antesPesquisa })).toHaveCount(0);
    await this.tabela().esperar();
  }
  async abrirPrimeiroDetalhe(rotulo: string | RegExp = 'Ver detalhes'): Promise<void> {
    await this.tabela().acaoNaLinha(0, rotulo).click();
    await expect(this.page).toHaveURL(new RegExp(`${this.rota}/\\d+`));
    await expect(this.page.getByText('A carregar...')).toHaveCount(0, { timeout: 30_000 });
    await expect(tituloH1(this.page)).toBeVisible({ timeout: 30_000 });
  }
  voltar() {
    return botao(this.page, 'Voltar');
  }
}

export const workflows = (page: Page) =>
  new ListaMotorRegras(page, '/motor-regras/workflows', 'Pesquisa de Workflows', 'N.Âº Regras', /\/motor-regras\/workflows\?/);
export const regras = (page: Page) =>
  new ListaMotorRegras(page, '/motor-regras/regras', 'Pesquisa de Regras', 'ID do erro', /\/motor-regras\/regras\?/);
export const aprovacoes = (page: Page) =>
  new ListaMotorRegras(page, '/motor-regras/aprovacoes', 'AprovaÃ§Ãµes Pendentes', 'Solicitado em', /\/motor-regras\/aprovacoes\?/);
export const logs = (page: Page) =>
  new ListaMotorRegras(page, '/motor-regras/execucoes', 'Logs de ConferÃªncia', 'Acusou erro', /\/motor-regras\/execucoes\?/);

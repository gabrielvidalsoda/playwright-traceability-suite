import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Ajudas genÃ©ricas para os componentes `@Traceability Suite/ui-react` / MUI usados nos ecrÃ£s da
 * ConferÃªncia (`ccmsns-ui`, `develop` 14d7c2b â€” lido, nunca editado).
 *
 * Factos de DOM confirmados no cÃ³digo:
 *   - SelectBox: `div[role=combobox][aria-label=<rÃ³tulo>]`, opÃ§Ãµes `role=option` numa
 *     `listbox` "OpÃ§Ãµes do select"; a 1.Âª opÃ§Ã£o Ã© Â«SeleccioneÂ»/Â«SelecioneÂ» (valor vazio);
 *   - TableV2: `th[abbr=<coluna>]`, `aria-sort`, `td[headers=<colId>]`, coluna de aÃ§Ãµes
 *     `th#actions` + `td[headers="actions"]`, vazio em `td.Traceability Suite-tablev2-cell-empty-rows`,
 *     carregamento em `td.Traceability Suite-tablev2-cell-loading`;
 *   - aÃ§Ãµes de linha (`AccaoTabela`): IconButton com `aria-label` = rÃ³tulo;
 *   - Exportar (`BotaoExportar`): `aria-label="Exportar XLSX"`, nunca desativado â€” sem
 *     resultados mostra Â«NÃ£o hÃ¡ resultados para exportar. Pesquise primeiro.Â»;
 *   - DetalheCampo: legenda (`caption`) seguida do valor (`body1`), irmÃ£os no mesmo Box;
 *   - breadcrumb: `nav.breadcrumb li.breadcrumb__item` (o Ãºltimo `.is-active`).
 */

export const MSG = {
  antesPesquisa: 'Utilize os filtros acima e clique em pesquisar',
  semResultados: 'Nenhum resultado encontrado...',
  semResultadosApresentado: 'Nenhum resultado apresentado',
  exportarSemResultados: 'NÃ£o hÃ¡ resultados para exportar. Pesquise primeiro.',
} as const;

/** Texto exato sem distinguir maiÃºsculas (o DEV passou vÃ¡rios rÃ³tulos a minÃºsculas, ex. Â«ConferÃªncia manual: worklistÂ»). */
export function ci(texto: string): RegExp {
  return new RegExp(`^${texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
}

export function combobox(escopo: Page | Locator, rotulo: string): Locator {
  return escopo.getByRole('combobox', { name: rotulo, exact: true });
}

/** Abre o SelectBox e escolhe a opÃ§Ã£o (texto exato ou expressÃ£o regular). */
export async function escolherOpcao(
  page: Page,
  rotulo: string,
  opcao: string | RegExp,
  escopo: Page | Locator = page,
): Promise<void> {
  await combobox(escopo, rotulo).click();
  await page.getByRole('option', { name: opcao, exact: typeof opcao === 'string' }).first().click();
  // Ã€s vezes o popover fica aberto e o MUI esconde o resto da pÃ¡gina (aria-hidden): fecha-se.
  if (await page.getByRole('listbox').isVisible().catch(() => false)) await page.keyboard.press('Escape');
}

/** Textos das opÃ§Ãµes de um SelectBox (abre e fecha a lista com Escape). */
export async function opcoesDe(page: Page, rotulo: string, escopo: Page | Locator = page): Promise<string[]> {
  await combobox(escopo, rotulo).click();
  const opcoes = page.getByRole('option');
  await expect(opcoes.first()).toBeVisible();
  // As opÃ§Ãµes vÃªm da API (lenta em DEV): a lista comeÃ§a sÃ³ com Â«SelecioneÂ».
  await expect.poll(() => opcoes.count(), { timeout: 60_000 }).toBeGreaterThan(1).catch(() => undefined);
  const textos = (await opcoes.allInnerTexts()).map((t) => t.trim());
  await page.keyboard.press('Escape');
  return textos;
}

export function botao(escopo: Page | Locator, nome: string | RegExp): Locator {
  return escopo.getByRole('button', { name: nome, exact: typeof nome === 'string' });
}

/** Valor de um `DetalheCampo` pela legenda. */
export function valorCampo(escopo: Page | Locator, legenda: string): Locator {
  return escopo.getByText(legenda, { exact: true }).first().locator('xpath=following-sibling::*[1]');
}

/**
 * Itens do breadcrumb **em minÃºsculas**: o DEV passou vÃ¡rios rÃ³tulos a minÃºsculas
 * (Â«ConferÃªncia manual: supervisÃ£oÂ») e a diferenÃ§a de caixa nÃ£o Ã© o que se verifica aqui.
 * Comparar com `trilho('ConferÃªncia', â€¦)`.
 */
export async function trilhoBreadcrumb(page: Page): Promise<string[]> {
  const itens = page.locator('nav.breadcrumb li.breadcrumb__item');
  if ((await itens.count()) === 0) return [];
  return (await itens.allInnerTexts()).map((t) => t.trim().toLowerCase());
}
export const trilho = (...partes: string[]) => partes.map((p) => p.toLowerCase());

/** Tabela TableV2 (`TabelaComExport` ou `Table` direta). */
export class Tabela {
  constructor(readonly raiz: Locator) {}

  /** A tabela que tem um cabeÃ§alho com este `abbr` (identifica a grelha numa pÃ¡gina com vÃ¡rias). */
  static comColuna(page: Page, coluna: string): Tabela {
    return new Tabela(page.locator('table').filter({ has: page.locator(`thead th[abbr="${coluna}"]`) }).first());
  }

  linhas(): Locator {
    return this.raiz.locator('tbody tr').filter({ hasNot: this.raiz.page().locator('td.Traceability Suite-tablev2-cell-empty-rows') });
  }
  celulaVazia(): Locator {
    return this.raiz.locator('tbody td.Traceability Suite-tablev2-cell-empty-rows');
  }
  /** Espera o fim do carregamento: sem cÃ©lulas de esqueleto e com linhas ou o texto de vazio. */
  async esperar(): Promise<void> {
    await expect(this.raiz).toBeVisible();
    await expect(this.raiz.locator('td.Traceability Suite-tablev2-cell-loading')).toHaveCount(0, { timeout: 60_000 });
    await expect(this.linhas().first().or(this.celulaVazia())).toBeVisible({ timeout: 60_000 });
  }
  async textoVazio(): Promise<string> {
    return (await this.celulaVazia().innerText()).trim();
  }
  /** CabeÃ§alhos visÃ­veis (pelo `abbr`), sem a coluna de aÃ§Ãµes. */
  async colunas(): Promise<string[]> {
    return this.raiz.evaluate((t) =>
      Array.from(t.querySelectorAll('thead th'))
        .filter((th) => th.id !== 'actions')
        .map((th) => (th.getAttribute('abbr') ?? th.textContent ?? '').trim())
        .filter((t) => t && t !== 'undefined'),
    );
  }
  /** Textos de uma coluna, na ordem das linhas. */
  async valoresColuna(coluna: string): Promise<string[]> {
    return this.raiz.evaluate((t, nome) => {
      const ths = Array.from(t.querySelectorAll('thead th'));
      const idx = ths.findIndex((th) => th.getAttribute('abbr') === nome);
      if (idx < 0) throw new Error(`Coluna "${nome}" nÃ£o encontrada`);
      return Array.from(t.querySelectorAll('tbody tr'))
        .filter((tr) => !tr.querySelector('td.Traceability Suite-tablev2-cell-empty-rows'))
        .map((tr) => (tr.querySelectorAll('td')[idx]?.textContent ?? '').trim());
    }, coluna);
  }
  acaoNaLinha(linha: number, rotulo: string | RegExp): Locator {
    return this.linhas().nth(linha).locator('td[headers="actions"]').getByRole('button', { name: rotulo });
  }
  /** Seletor Â«Resultados por pÃ¡ginaÂ» (SelectBox sem nome; mostra o tamanho atual). */
  tamanhoPagina(): Locator {
    return this.raiz
      .locator('xpath=ancestor::*[.//*[contains(normalize-space(.), "Resultados por pÃ¡gina")]][1]')
      .getByRole('combobox')
      .filter({ hasText: /^\s*\d+\s*$/ })
      .first();
  }
  async mudarTamanhoPagina(tamanho: number): Promise<void> {
    await this.tamanhoPagina().click();
    await this.raiz.page().getByRole('option', { name: String(tamanho), exact: true }).click();
    await this.esperar();
  }
  paginaSeguinte(): Locator {
    return this.raiz
      .locator('xpath=ancestor::*[.//button[@aria-label="Go to next page"]][1]')
      .getByRole('button', { name: /Go to next page|prÃ³xima pÃ¡gina/i })
      .first();
  }
  /** BotÃ£o Â«Exportar XLSXÂ» mais prÃ³ximo desta tabela. */
  botaoExportar(): Locator {
    return this.raiz
      .locator('xpath=ancestor::*[.//button[@aria-label="Exportar XLSX"]][1]')
      .getByRole('button', { name: 'Exportar XLSX' })
      .first();
  }
}

/** Clica em Exportar e devolve o nome do ficheiro descarregado (exportaÃ§Ã£o no servidor, POST sÃ³ de leitura). */
export async function exportar(page: Page, botaoExportar: Locator): Promise<string> {
  const download = page.waitForEvent('download', { timeout: 180_000 });
  await botaoExportar.click();
  return (await download).suggestedFilename();
}

/** BotÃµes Â«PesquisarÂ» / Â«LimparÂ» do formulÃ¡rio de filtros (`AccoesFiltro`). */
export const pesquisar = (escopo: Page | Locator) => botao(escopo, 'Pesquisar');
export const limpar = (escopo: Page | Locator) => botao(escopo, 'Limpar');

/** TÃ­tulo h1 da pÃ¡gina. */
export const tituloH1 = (page: Page) => page.getByRole('heading', { level: 1 });

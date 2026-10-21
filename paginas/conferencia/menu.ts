import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Menu lateral, grupo Â«ConferÃªnciaÂ» (`ccmsns-ui` `src/layout/MainLayout.tsx`, Traceability Suite Menu):
 * cada item Ã© `li[role=presentation] > a[role=menuitem][href=<url>]`; o grupo tem
 * `aria-controls="submenu-conferencia"`. Os itens Â«(em breve)Â» nÃ£o tÃªm url: ficam com
 * `href="#"`, sem `aria-disabled`, sÃ³ esbatidos por CSS (`opacity:.45; pointer-events:none`).
 */

/**
 * Itens esperados (PRE-02): os 11 do script de 08-10-2026, com os rÃ³tulos do DEV, mais
 * Â«MovimentaÃ§Ã£o entre ciclosÂ» (`ccmsns-ui` #67), acrescentado em 09-10-2026.
 */
export const ITENS_MENU_CONFERENCIA = [
  'Cockpit',
  'ConferÃªncia manual: worklist',
  'ConferÃªncia manual: supervisÃ£o',
  'Facturas conferidas com erro (em breve)',
  'AlarmÃ­stica (em breve)',
  'Workflows de conferÃªncia',
  'Regras de conferÃªncia',
  'Logs de conferÃªncia',
  'AprovaÃ§Ãµes pendentes',
  'GestÃ£o de calendÃ¡rio',
  'GestÃ£o de feriados',
  'MovimentaÃ§Ã£o entre ciclos',
] as const;

export function grupoConferencia(page: Page): Locator {
  return page.locator('a[aria-controls="submenu-conferencia"]');
}
export function submenuConferencia(page: Page): Locator {
  return page.locator('[id="submenu-conferencia"]');
}
export function itemMenu(page: Page, titulo: string | RegExp): Locator {
  return submenuConferencia(page).getByRole('menuitem', { name: titulo });
}

/** Expande o grupo Â«ConferÃªnciaÂ» (se ainda estiver fechado). */
export async function expandirConferencia(page: Page): Promise<void> {
  const grupo = grupoConferencia(page);
  await expect(grupo).toBeVisible({ timeout: 30_000 });
  const primeiro = itemMenu(page, 'Cockpit');
  if (!(await primeiro.isVisible())) await grupo.click();
  await expect(primeiro).toBeVisible();
}

export async function abrirItemMenu(page: Page, titulo: string | RegExp): Promise<void> {
  await expandirConferencia(page);
  const item = itemMenu(page, titulo);
  // Com o grupo aberto noutra pÃ¡gina o item pode ficar abaixo da dobra e o clique normal nÃ£o estabilizar: cai para o
  // evento de clique do prÃ³prio link (o `routeNavigator` do Traceability Suite Menu trata-o igual).
  await item.click({ timeout: 10_000 }).catch(() => item.dispatchEvent('click'));
}

/** TÃ­tulos dos itens do grupo, pela ordem do DOM. */
export async function titulosItens(page: Page): Promise<string[]> {
  await expandirConferencia(page);
  return (await submenuConferencia(page).getByRole('menuitem').allInnerTexts()).map((t) => t.trim());
}

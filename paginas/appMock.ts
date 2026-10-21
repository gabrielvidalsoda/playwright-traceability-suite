import { type Page } from '@playwright/test';
import { AMBIENTE } from '../dados/massa';

/**
 * Navega para uma rota da SPA e garante que o mock (MSW) está a intercetar.
 *
 * Porquê: o dev server (`vite --mode mock`) serve centenas de módulos ES à
 * medida; sob paralelismo, o `waitUntil: 'load'` do Playwright pode exceder o
 * timeout. Usa-se `domcontentloaded` + espera explícita pelo service worker do
 * MSW a controlar a página (com um reload de recurso se ainda não controlar).
 */
export async function abrirRota(page: Page, rota: string): Promise<void> {
  await page.goto(rota, { waitUntil: 'domcontentloaded' });
  // Fora do modo mock (qua/dev) não há MSW: a app fala com a API real.
  if (AMBIENTE !== 'mock') return;
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const controlado = await page.evaluate(
      () => !!navigator.serviceWorker && !!navigator.serviceWorker.controller,
    );
    if (controlado) return;
    await page.waitForTimeout(500);
    if (tentativa === 1) await page.reload({ waitUntil: 'domcontentloaded' });
  }
}

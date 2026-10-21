import { expect, test } from '../fixtures';
import { abrirRota } from '../../paginas/appMock';
import { meta } from '../apoio';

/**
 * Traceability Suite Â§4.10 â€” compatibilidade cross-browser da SPA.
 *
 * Executar em cada motor:  npx playwright test --grep @compatibilidade --project=firefox
 * O conjunto @smoke (regressÃ£o) tambÃ©m deve correr por browser â€” Ã© o CT-COMPAT-SMOKE.
 */
const ECRAS = [
  { nome: 'Pesquisa de Faturas', rota: '/medicamentos/factura', heading: 'Pesquisa Facturas' },
  { nome: 'Pesquisa de Lotes', rota: '/medicamentos/lote', heading: 'Pesquisa Lotes' },
  {
    nome: 'Pesquisa de PrestaÃ§Ãµes',
    rota: '/medicamentos/prestacoes',
    heading: 'Pesquisa PrestaÃ§Ãµes',
  },
];

test.describe('Compatibilidade cross-browser (Traceability Suite Â§4.10)', () => {
  for (const ecra of ECRAS) {
    test(
      `CT-COMPAT-RENDER â€” ${ecra.nome} renderiza sem erros de consola nem overflow`,
      meta({
        caso: 'CT-COMPAT-RENDER',
        requisitos: ['RF29'],
        tipoTeste: 'compatibilidade',
        smoke: true,
        plano: `Traceability Suite 20250077 Â§4.10 â€” @CT-COMPAT-RENDER (${ecra.nome})`,
      }),
      async ({ page }, testInfo) => {
        const errosConsola: string[] = [];
        page.on('console', (m) => {
          if (m.type() === 'error' && !/Tanstack|React DevTools|Download the/i.test(m.text())) {
            errosConsola.push(m.text());
          }
        });

        await abrirRota(page, ecra.rota);
        await expect(page.getByRole('heading', { name: ecra.heading })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Pesquisar' })).toBeVisible();

        const overflow = await page.evaluate(() => {
          const el = document.scrollingElement ?? document.documentElement;
          return el.scrollWidth - el.clientWidth;
        });
        expect(overflow, `overflow horizontal em ${testInfo.project.name}`).toBeLessThanOrEqual(1);
        expect(errosConsola, `erros de consola em ${testInfo.project.name}`).toEqual([]);
      },
    );
  }
});

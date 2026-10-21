import { expect, test } from '../fixtures';
import { PaginaPesquisaFaturasMedicamentos } from '../../paginas/PaginaPesquisaFaturasMedicamentos';
import { abrirRota } from '../../paginas/appMock';
import { analisarAcessibilidade } from '../../paginas/acessibilidade';
import { massa } from '../../dados/massa';
import { meta } from '../apoio';

const PLANO = 'Traceability Suite 20250077 Â§4.6 â€” Interface / Usabilidade';

test.describe('Interface / Usabilidade (Traceability Suite Â§4.6)', () => {
  test(
    'CT-UI-NAV-MENU â€” NavegaÃ§Ã£o pelo menu atÃ© os ecrÃ£s de Consulta',
    meta({
      caso: 'CT-UI-NAV-MENU',
      requisitos: ['RF29'],
      tipoTeste: 'interface',
      plano: `${PLANO} â€” @CT-UI-NAV-MENU`,
    }),
    async ({ page }) => {
      test.slow(); // menu lateral Traceability Suite Ã© lento a hidratar/expandir
      await abrirRota(page, '/');
      await expect(page.getByRole('menuitem', { name: 'InÃ­cio' })).toBeVisible();
      await page.waitForTimeout(1000); // hidrataÃ§Ã£o do menu

      // Expandir "Consulta por Ãrea de PrestaÃ§Ã£o" â†’ "Medicamentos" (Traceability Suite Menu:
      // cliques com force para nÃ£o serem intercetados pelo contentor do submenu).
      await page
        .getByRole('menuitem', { name: 'Consulta por Ãrea de PrestaÃ§Ã£o' })
        .first()
        .click({ force: true });
      await page.waitForTimeout(500);
      await page
        .getByRole('navigation', { name: 'Consulta por Ãrea de PrestaÃ§Ã£o submenu' })
        .getByRole('menuitem', { name: 'Medicamentos' })
        .first()
        .click({ force: true });
      await page.waitForTimeout(800);

      const submenu = page.getByRole('navigation', { name: 'Medicamentos submenu' });
      await expect(submenu).toBeVisible();
      const irPara = async (item: string, rota: RegExp, heading: string) => {
        await submenu.getByRole('menuitem', { name: item }).click({ force: true });
        await expect(page).toHaveURL(rota);
        await expect(page.getByRole('heading', { name: heading })).toBeVisible();
        await page.waitForTimeout(300);
      };

      await irPara('Facturas', /\/medicamentos\/factura$/, 'Pesquisa Facturas');
      await irPara('Lotes', /\/medicamentos\/lote$/, 'Pesquisa Lotes');
      await irPara('PrestaÃ§Ãµes', /\/medicamentos\/prestacoes$/, 'Pesquisa PrestaÃ§Ãµes');
    },
  );

  test(
    'CT-UI-TECLADO â€” SubmissÃ£o da pesquisa por tecla Enter',
    meta({
      caso: 'CT-UI-TECLADO',
      requisitos: ['RF29'],
      tipoTeste: 'interface',
      plano: `${PLANO} â€” @CT-UI-TECLADO (WCAG 2.1 AA operÃ¡vel por teclado)`,
    }),
    async ({ page }) => {
      const d = massa().faturaPorNumero;
      const pag = new PaginaPesquisaFaturasMedicamentos(page);
      await pag.abrir();

      await pag.campoNumeroFatura().click();
      await pag.campoNumeroFatura().fill(d.numeroFatura);
      const resposta = page.waitForResponse((r) => /\/medicamentos\/facturas\?/.test(r.url()));
      await page.keyboard.press('Enter');
      await resposta;

      await expect(page).toHaveURL(new RegExp(`numeroFactura=${d.numeroFatura}`));
      await expect(pag.linhasResultado()).toHaveCount(1);
    },
  );

  test(
    'CT-UI-RESPONSIVO â€” Sem overflow horizontal em vÃ¡rias larguras',
    meta({
      caso: 'CT-UI-RESPONSIVO',
      requisitos: ['RF29'],
      tipoTeste: 'interface',
      plano: `${PLANO} â€” @CT-UI-RESPONSIVO (WCAG 2.1 AA reflow)`,
    }),
    async ({ page }) => {
      const pag = new PaginaPesquisaFaturasMedicamentos(page);
      for (const largura of [1280, 1024, 768, 400]) {
        await page.setViewportSize({ width: largura, height: 900 });
        await pag.abrir();
        const overflow = await page.evaluate(() => {
          const el = document.scrollingElement ?? document.documentElement;
          return el.scrollWidth - el.clientWidth;
        });
        expect(overflow, `overflow horizontal a ${largura}px`).toBeLessThanOrEqual(1);
        await expect(pag.botaoPesquisar()).toBeVisible();
      }
    },
  );

  test(
    'CT-UI-FORMATO-PT â€” Montantes e datas no formato pt na grelha',
    meta({
      caso: 'CT-UI-FORMATO-PT',
      requisitos: ['RF29'],
      tipoTeste: 'interface',
      plano: 'Consulta-Area-Prestacao.md Â§2.5 CA-G-10 â€” @CT-UI-FORMATO-PT',
    }),
    async ({ page }) => {
      const pag = new PaginaPesquisaFaturasMedicamentos(page);
      await pag.abrir();
      await pag.pesquisarPorNumero(massa().faturaPorNumero.numeroFatura);

      const linha = pag.linhasResultado().first();
      const texto = await linha.innerText();

      // datas MM/AAAA ou DD/MM/AAAA
      expect(texto, 'coluna de data no formato pt').toMatch(
        /\b\d{2}\/\d{4}\b|\b\d{2}\/\d{2}\/\d{4}\b/,
      );
      // montantes com vÃ­rgula decimal (ex. 4637,50)
      expect(texto, 'montantes com vÃ­rgula decimal (defeito conhecido do plano Â§7/Â§8)').toMatch(
        /\d,\d{2}\b/,
      );
    },
  );

  test(
    'CT-UI-A11Y-PESQUISA â€” axe/WCAG 2.1 AA no ecrÃ£ de Pesquisa de Faturas',
    meta({
      caso: 'CT-UI-A11Y-PESQUISA',
      requisitos: ['RF29', 'WCAG21AA'],
      tipoTeste: 'interface',
      plano: `${PLANO} â€” @CT-UI-A11Y-PESQUISA`,
    }),
    async ({ page }, testInfo) => {
      const pag = new PaginaPesquisaFaturasMedicamentos(page);
      await pag.abrir();
      await analisarAcessibilidade(page, testInfo, 'pesquisa-faturas');
      await pag.pesquisarPorNumero(massa().faturaPorNumero.numeroFatura);
      await analisarAcessibilidade(page, testInfo, 'pesquisa-faturas-com-resultados');
    },
  );

  test(
    'CT-UI-A11Y-DETALHE â€” axe/WCAG 2.1 AA no detalhe da fatura',
    meta({
      caso: 'CT-UI-A11Y-DETALHE',
      requisitos: ['RF21', 'WCAG21AA'],
      tipoTeste: 'interface',
      plano: `${PLANO} â€” @CT-UI-A11Y-DETALHE`,
    }),
    async ({ page }, testInfo) => {
      const pag = new PaginaPesquisaFaturasMedicamentos(page);
      await pag.abrir();
      await pag.pesquisarPorNumero(massa().faturaComDetalhe.numeroFatura);
      await pag.abrirDetalheDaPrimeiraLinha();
      await expect(page.getByRole('heading', { name: 'Factura de Medicamentos' })).toBeVisible();
      await analisarAcessibilidade(page, testInfo, 'detalhe-fatura');
    },
  );
});

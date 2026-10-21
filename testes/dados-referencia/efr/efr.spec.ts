import { expect, test } from '../../fixtures';
import { PaginaPesquisaDadosReferencia } from '../../../paginas/dadosReferencia/PaginaPesquisaDadosReferencia';
import { EFR } from '../../../paginas/dadosReferencia/telas';
import {
  naoAplicavel,
  verificarEstadoComoTexto,
  verificarOrdenacaoServidor,
} from '../../../paginas/dadosReferencia/padraoUi';
import {
  abrirPrimeiroDetalhe,
  exportarDescarregaXlsx,
  metaDR,
  metaReg,
  testeConferenciaRapida,
  testeTodasAsColunasOrdenam,
} from '../apoio-dados-referencia';

/**
 * Roteiro de deploy dos padrÃµes de UI de Dados de ReferÃªncia â€” A.1.4 e B5
 * (EFR â€” Entidade Financeira ResponsÃ¡vel). O detalhe usa abas (padrÃ£o das outras telas).
 * RegressÃ£o dos itens em "Ready for test" (plano de 09-10-2026): BUG-20260915-12 (EFR),
 * -14 (EFR) e -16 (EFR).
 */
test.describe('Dados de ReferÃªncia â†’ EFR â€” Entidade Financeira ResponsÃ¡vel', () => {
  test.describe('Pesquisa', () => {
    testeConferenciaRapida(EFR, { listasEmAbas: true });

    test('CT-DR-B5.1 â€” Ordenar por Tipo Entidade, Ativa CRD e Valida RNU; Estado em texto', metaDR(EFR, 'CT-DR-B5.1', { integracao: true }), async ({ page }) => {
      const pag = new PaginaPesquisaDadosReferencia(page, EFR);
      await pag.abrir();
      await pag.pesquisarComFiltro();
      // RÃ³tulos das colunas na grelha (`efr/TabelaResultados.tsx`): "CRD" = Ativa CRD, "RNU" = Valida RNU.
      for (const coluna of ['Tipo Entidade', 'CRD', 'RNU']) {
        await test.step(`Ordenar por "${coluna}"`, async () => {
          await verificarOrdenacaoServidor(pag, coluna);
        });
      }
      await test.step('O Estado aparece como texto', async () => {
        expect.soft((await pag.valoresColuna('Estado')).every((v) => v.length > 0)).toBe(true);
        await verificarEstadoComoTexto(page);
      });
    });

    testeTodasAsColunasOrdenam(EFR, 'EFR');

    test('CT-REG-BUG-20260915-14-EFR â€” Pesquisar sem nenhum campo preenchido mostra uma mensagem do que falta (se a EFR tiver obrigatÃ³rios)', metaReg(EFR, 'CT-REG-BUG-20260915-14-EFR', 'BUG-20260915-14', { tipo: 'negativo' }), async ({ page }) => {
      const pag = new PaginaPesquisaDadosReferencia(page, EFR);
      await pag.abrir();
      const pedidos: string[] = [];
      page.on('request', (r) => {
        if (r.method() === 'GET' && /\/api\/dados-referencia\/efr\?/.test(r.url())) pedidos.push(r.url());
      });
      await test.step('Clicar em Pesquisar com todos os campos vazios', async () => {
        await pag.botaoPesquisar().click();
        await page.waitForTimeout(1_500);
      });
      await test.step('Aparece uma mensagem do que falta preencher, ou a pesquisa sem critÃ©rios Ã© aceite (pendÃªncia P2)', async () => {
        const mensagem = pag.alertas().or(page.locator('.Traceability SuiteTemplate__content .MuiAlert-root'));
        if (await mensagem.first().isVisible().catch(() => false)) {
          const texto = ((await mensagem.first().textContent()) ?? '').trim();
          expect.soft(texto, 'a mensagem diz o que falta preencher').toMatch(/preencher|indique|pelo menos|obrigat/i);
          return;
        }
        await pag.esperarResultados();
        const linhas = await pag.linhasDados().count();
        expect.soft(pedidos.length + linhas, 'sem mensagem, a pesquisa tem de ter corrido (nÃ£o falha em silÃªncio)').toBeGreaterThan(0);
        naoAplicavel(
          `EFR aceita a pesquisa sem critÃ©rios (${pedidos.length} pedido(s) GET, ${linhas} linha(s) na 1.Âª pÃ¡gina) e nÃ£o mostra mensagem â€” confirmar se a EFR tem campos obrigatÃ³rios (pendÃªncia P2)`,
        );
      });
    });

    test('CT-REG-BUG-20260915-16-EFR â€” Exportar descarrega o XLSX', metaReg(EFR, 'CT-REG-BUG-20260915-16-EFR', 'BUG-20260915-16', { integracao: true }), async ({ page }) => {
      const pag = new PaginaPesquisaDadosReferencia(page, EFR);
      await pag.abrir();
      await pag.pesquisarComFiltro();
      await exportarDescarregaXlsx(page, pag.botaoExportar());
    });
  });

  test.describe('Detalhe', () => {
    test('CT-DR-B5.2 â€” CabeÃ§alho colapsÃ¡vel com Exportar no topo, "IdentificaÃ§Ã£o" e "VigÃªncia e Estado", sem ID interno', metaDR(EFR, 'CT-DR-B5.2', { interface: true }), async ({ page }) => {
      const det = await abrirPrimeiroDetalhe(new PaginaPesquisaDadosReferencia(page, EFR));
      const e = await det.estrutura();
      const h1 = e.titulos.find((t) => t.nivel === 1);
      expect.soft(h1?.colapsavel, 'cabeÃ§alho colapsÃ¡vel').toBe(true);
      const exportar = e.botoes.find((b) => /^Exportar/.test(b.rotulo));
      expect.soft(exportar, 'botÃ£o Exportar').toBeDefined();
      expect.soft(exportar?.cartao, 'Exportar no cartÃ£o do cabeÃ§alho').toBe(h1?.cartao);
      for (const sub of ['IdentificaÃ§Ã£o', 'VigÃªncia e Estado']) {
        await expect.soft(page.getByRole('heading', { level: 2, name: sub, exact: true })).toBeVisible();
      }
      await expect.soft(det.conteudo().getByText(/^ID( interno)?$/), 'o ID interno nÃ£o aparece').toHaveCount(0);
    });
  });
});

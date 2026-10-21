import { expect, test } from '../../fixtures';
import { PaginaPesquisaDadosReferencia } from '../../../paginas/dadosReferencia/PaginaPesquisaDadosReferencia';
import { SISTEMAS_CRD } from '../../../paginas/dadosReferencia/telas';
import { naoAplicavel, verificarOrdenacaoLista } from '../../../paginas/dadosReferencia/padraoUi';
import {
  abrirPrimeiroDetalhe,
  metaDR,
  metaReg,
  testeConferenciaRapida,
  testeResultadosPorPagina,
  testeTodasAsColunasOrdenam,
  todasAsColunasOrdenam,
} from '../apoio-dados-referencia';

/**
 * Roteiro de deploy dos padrões de UI de Dados de Referência — A.1.10 e B11 (Sistemas CRD).
 * Regressão dos itens em "Ready for test" (plano de 09-10-2026): BUG-20260915-12 (CRD, CRD-DET)
 * e BUG-20260915-13 (CRD).
 */
const TELA = SISTEMAS_CRD;
const LISTAS = [
  'Lista de Preços (por Convenção / Contrato)',
  'Sistemas Semelhantes',
  'Contextos Associados (Linhas)',
  'Locais Autorizados',
];

test.describe('Dados de Referência → Sistemas CRD', () => {
  test.describe('Pesquisa', () => {
    testeConferenciaRapida(TELA);

    // Validação manual de 28-09-2026 (F1/F7): não é esperado que a exportação siga a
    // ordenação da tabela — o teste só confirma que Exportar descarrega o XLSX.
    test('CT-DR-B11.1 — Ordenar e Exportar: descarrega o XLSX', metaDR(TELA, 'CT-DR-B11.1', { integracao: true }), async ({ page }) => {
      const pag = new PaginaPesquisaDadosReferencia(page, TELA);
      await pag.abrir();
      await pag.pesquisarComFiltro();
      await pag.ordenarPor(TELA.colunaOrdenavel, 'ascending');
      await pag.ordenarPor(TELA.colunaOrdenavel, 'descending');
      const pedido = page.waitForRequest((r) => r.method() === 'POST' && /\/sistemas-crd\/exportar/.test(r.url()));
      const download = page.waitForEvent('download');
      await pag.botaoExportar().click();
      await pedido;
      expect((await download).suggestedFilename()).toMatch(/\.xlsx$/);
    });

    // Regressão dos itens em "Ready for test" (plano de 09-10-2026).
    testeTodasAsColunasOrdenam(TELA, 'CRD');
    testeResultadosPorPagina(TELA, 'CRD');
  });

  test.describe('Detalhe', () => {
    test('CT-DR-B11.2 — Cabeçalho h1 e as 4 listas são painéis colapsáveis num cartão', metaDR(TELA, 'CT-DR-B11.2', { interface: true }), async ({ page }) => {
      const det = await abrirPrimeiroDetalhe(new PaginaPesquisaDadosReferencia(page, TELA));
      const e = await det.estrutura();
      expect.soft(e.titulos.filter((t) => t.nivel === 1).length, 'um h1').toBe(1);
      const paineis = e.titulos.filter((t) => LISTAS.includes(t.texto));
      expect.soft(paineis.map((p) => p.texto), 'as 4 listas').toEqual(LISTAS);
      expect.soft(paineis.every((p) => p.colapsavel), 'todas colapsáveis').toBe(true);
      expect.soft(new Set(paineis.map((p) => p.cartao)).size, 'num só cartão').toBe(1);
    });

    test('CT-DR-B11.3 — Ordenar Preços, Locais e Semelhantes; em Semelhantes a ordem mantém-se entre páginas', metaDR(TELA, 'CT-DR-B11.3', { integracao: true }), async ({ page }) => {
      const det = await abrirPrimeiroDetalhe(new PaginaPesquisaDadosReferencia(page, TELA));
      for (const lista of ['Lista de Preços (por Convenção / Contrato)', 'Locais Autorizados', 'Sistemas Semelhantes']) {
        await test.step(`"${lista}" ordena (no servidor)`, async () => {
          await verificarOrdenacaoLista(page, det.tabelaDoPainel(lista), { servidor: true, descricao: lista });
        });
      }
      await test.step('Semelhantes: ordem mantida entre páginas', async () => {
        const seguinte = det.corpoDoPainel('Sistemas Semelhantes').getByRole('button', { name: 'Go to next page' });
        if ((await seguinte.count()) === 0 || (await seguinte.isDisabled())) {
          naoAplicavel('"Sistemas Semelhantes" só tem 1 página neste registo — continuidade não verificável');
          return;
        }
        const pedido = page.waitForRequest((r) => /semelhantes.*[?&]sort=/.test(decodeURIComponent(r.url())) && /pagina=2/.test(r.url()));
        await seguinte.click();
        await pedido;
      });
    });

    test('CT-REG-BUG-20260915-12-CRD-DET — Todas as colunas das 4 listas do detalhe ordenam asc/desc por clique no cabeçalho', metaReg(TELA, 'CT-REG-BUG-20260915-12-CRD-DET', 'BUG-20260915-12', { integracao: true }), async ({ page }) => {
      test.setTimeout(300_000);
      const det = await abrirPrimeiroDetalhe(new PaginaPesquisaDadosReferencia(page, TELA));
      for (const lista of LISTAS) {
        await test.step(`"${lista}": todas as colunas ordenam`, async () => {
          await expect(det.tabelaDoPainel(lista), `tabela "${lista}"`).toBeVisible();
          await todasAsColunasOrdenam(page, det.tabelaDoPainel(lista), { descricao: lista });
        });
      }
    });
  });
});

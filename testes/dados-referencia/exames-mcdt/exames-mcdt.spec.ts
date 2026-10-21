import { expect, test } from '../../fixtures';
import { PaginaPesquisaDadosReferencia } from '../../../paginas/dadosReferencia/PaginaPesquisaDadosReferencia';
import { PaginaDetalheDadosReferencia } from '../../../paginas/dadosReferencia/PaginaDetalheDadosReferencia';
import { EXAMES_MCDT, filtroDaTela } from '../../../paginas/dadosReferencia/telas';
import { verificarOrdenacaoLista } from '../../../paginas/dadosReferencia/padraoUi';
import {
  metaDR,
  testeConferenciaRapida,
  testeResultadosPorPagina,
  testeTodasAsColunasOrdenam,
} from '../apoio-dados-referencia';

/**
 * Roteiro de deploy dos padrões de UI de Dados de Referência — A.1.12 e B14 (Exames MCDT,
 * no menu "Dados de Referência" de `MainLayout.tsx`, rota `/mcdts/exames`).
 */
const TELA = EXAMES_MCDT;
const BLOCOS = [
  'Histórico de Preços',
  'Exames Equivalentes',
  'Exames Compatíveis',
  'Exames Não Prescritos Autorizados',
  'Exames Obrigatórios',
];

test.describe('Dados de Referência → Exames MCDT', () => {
  test.describe('Pesquisa', () => {
    testeConferenciaRapida(TELA);

    test('CT-DR-B14.1 — Filtros no grid padrão; Exportar visível mas desativado', metaDR(TELA, 'CT-DR-B14.1'), async ({ page }) => {
      const pag = new PaginaPesquisaDadosReferencia(page, TELA);
      await pag.abrir();
      const colunas = await pag
        .formulario()
        .locator('input')
        .first()
        .evaluate((input) => {
          let el: HTMLElement | null = input.parentElement;
          while (el && !(getComputedStyle(el).display === 'grid' && el.querySelector('[role="combobox"]'))) {
            el = el.parentElement;
          }
          return el ? getComputedStyle(el).gridTemplateColumns.split(' ').length : 0;
        });
      expect.soft(colunas, 'grelha de filtros com 6 colunas (ecrã largo)').toBe(6);
      await expect.soft(pag.botaoExportar()).toBeVisible();
      await expect.soft(pag.botaoExportar()).toBeDisabled();
    });

    // Validação manual de 28-09-2026 (F7): não é esperado que a exportação siga a ordenação
    // da tabela — só a ordenação no servidor e o download do XLSX são verificados.
    test('CT-DR-B14.2 — Pesquisar, ordenar e Exportar: ordenação no servidor e XLSX descarregado', metaDR(TELA, 'CT-DR-B14.2', { integracao: true }), async ({ page }) => {
      const pag = new PaginaPesquisaDadosReferencia(page, TELA);
      await pag.abrir();
      await pag.pesquisarComFiltro();
      await pag.ordenarPor(TELA.colunaOrdenavel, 'ascending');
      await pag.ordenarPor(TELA.colunaOrdenavel, 'descending');
      const sortTabela = new URL(page.url()).searchParams.get('sort');
      expect(sortTabela, 'sort da tabela na URL').toBeTruthy();
      const pedido = page.waitForRequest((r) => r.method() === 'POST' && /\/exames\/exportar/.test(r.url()));
      const download = page.waitForEvent('download');
      await pag.botaoExportar().click();
      await pedido;
      expect((await download).suggestedFilename()).toMatch(/\.xlsx$/);
    });

    // Regressão dos itens em "Ready for test" (plano de 09-10-2026).
    testeTodasAsColunasOrdenam(TELA, 'MCDT');
    testeResultadosPorPagina(TELA, 'MCDT');
  });

  test.describe('Detalhe', () => {
    test('CT-DR-B14.3 — Título com o código do exame, cabeçalho "Identificação", 5 blocos num cartão com tabelas ordenáveis', metaDR(TELA, 'CT-DR-B14.3', { interface: true }), async ({ page }) => {
      test.slow();
      const pag = new PaginaPesquisaDadosReferencia(page, TELA);
      await pag.abrir();
      await pag.pesquisarComFiltro();
      const codigo = (await pag.valoresColuna('Código Exame'))[0];
      await pag.abrirPrimeiroDetalhe();
      const det = new PaginaDetalheDadosReferencia(page);
      await det.esperarCarregado();
      await expect.soft(det.titulo(), 'o título inclui o código do exame').toContainText(codigo);
      await expect.soft(page.getByRole('heading', { name: 'Identificação', exact: true })).toBeVisible();
      const e = await det.estrutura();
      const blocos = e.titulos.filter((t) => BLOCOS.includes(t.texto));
      expect.soft(blocos.map((b) => b.texto), 'os 5 blocos').toEqual(BLOCOS);
      expect.soft(new Set(blocos.map((b) => b.cartao)).size, 'num só cartão').toBe(1);
      for (const bloco of BLOCOS) {
        await test.step(`"${bloco}" ordena`, async () => {
          await verificarOrdenacaoLista(page, det.tabelaDoPainel(bloco), { descricao: bloco });
        });
      }
    });

    test('CT-DR-B14.4 — "Voltar" regressa a /mcdts/exames com os filtros e os resultados', metaDR(TELA, 'CT-DR-B14.4'), async ({ page }) => {
      const pag = new PaginaPesquisaDadosReferencia(page, TELA);
      await pag.abrir();
      await pag.pesquisarComFiltro();
      const urlPesquisa = page.url();
      await pag.abrirPrimeiroDetalhe();
      const det = new PaginaDetalheDadosReferencia(page);
      await det.esperarCarregado();
      await det.botaoVoltar().click();
      await expect(page).toHaveURL(urlPesquisa);
      const filtro = filtroDaTela(TELA)!;
      await expect.soft(pag.seletor(filtro.rotulo), 'filtro "Área MCDT" ainda preenchido').toContainText(filtro.valor);
      await pag.esperarResultados();
      await expect.soft(pag.linhasDados().first(), 'resultados ainda visíveis').toBeVisible();
    });
  });
});

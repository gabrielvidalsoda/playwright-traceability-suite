import { type Page } from '@playwright/test';
import { expect, test } from '../../fixtures';
import { PaginaPesquisaDadosReferencia } from '../../../paginas/dadosReferencia/PaginaPesquisaDadosReferencia';
import type { PaginaDetalheDadosReferencia } from '../../../paginas/dadosReferencia/PaginaDetalheDadosReferencia';
import { VACINAS } from '../../../paginas/dadosReferencia/telas';
import {
  FiltroPrecos,
  verificarIntervaloPrecosValido,
  verificarOrdenacaoLista,
  verificarOrdenacaoServidor,
  verificarPrecoMaximoInferior,
  verificarPrecoNegativoEDatas,
} from '../../../paginas/dadosReferencia/padraoUi';
import {
  abrirPrimeiroDetalhe,
  exportarDescarregaXlsx,
  metaDR,
  metaReg,
  testeConferenciaRapida,
  testeTodasAsColunasOrdenam,
} from '../apoio-dados-referencia';

/** Roteiro de deploy dos padrões de UI de Dados de Referência — A.1.7 e B8 (Vacinas). */
const TELA = VACINAS;
const LISTAS = ['Lista de Preços', 'Regras de Idade', 'Convenções Autorizadas'];

/** Pedidos GET com filtro de preços (o filtro de Vacinas é aplicado no servidor — PR back #31). */
function pedidosComFiltroPrecos(page: Page): string[] {
  const pedidos: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'GET' && /\/precos\?.*preco(Minimo|Maximo)=/.test(r.url())) pedidos.push(r.url());
  });
  return pedidos;
}

test.describe('Dados de Referência → Vacinas', () => {
  test.describe('Pesquisa', () => {
    testeConferenciaRapida(TELA);

    test('CT-DR-B8.1 — Exportar descarrega o XLSX com as colunas código, descrição e código de origem', metaDR(TELA, 'CT-DR-B8.1', { integracao: true }), async ({ page }) => {
      const pag = new PaginaPesquisaDadosReferencia(page, TELA);
      await pag.abrir();
      await pag.pesquisarComFiltro();
      const pedido = page.waitForRequest((r) => r.method() === 'POST' && /\/vacinas\/exportar/.test(r.url()));
      const download = page.waitForEvent('download');
      await pag.botaoExportar().click();
      const corpo = (await pedido).postDataJSON() as { colunas: { id: string }[] };
      expect((await download).suggestedFilename()).toMatch(/\.xlsx$/);
      expect.soft(corpo.colunas.map((c) => c.id), 'colunas pedidas na exportação').toEqual(
        expect.arrayContaining(['codigo', 'descricao', 'codigoOrigem']),
      );
    });

    test('CT-DR-B8.2 — Ordenar e ir para a página 2: ordenação no servidor', metaDR(TELA, 'CT-DR-B8.2', { integracao: true }), async ({ page }) => {
      const pag = new PaginaPesquisaDadosReferencia(page, TELA);
      await pag.abrir();
      await pag.pesquisarComFiltro();
      await verificarOrdenacaoServidor(pag, TELA.colunaOrdenavel);
    });

    // Regressão dos itens em "Ready for test" (plano de 09-10-2026).
    testeTodasAsColunasOrdenam(TELA, 'VAC');

    test('CT-REG-BUG-20260915-16-VAC — Exportar descarrega o XLSX', metaReg(TELA, 'CT-REG-BUG-20260915-16-VAC', 'BUG-20260915-16', { integracao: true }), async ({ page }) => {
      const pag = new PaginaPesquisaDadosReferencia(page, TELA);
      await pag.abrir();
      await pag.pesquisarComFiltro();
      await exportarDescarregaXlsx(page, pag.botaoExportar());
    });
  });

  test.describe('Detalhe', () => {
    let det: PaginaDetalheDadosReferencia;
    let filtro: FiltroPrecos;
    let pedidos: string[];
    test.beforeEach(async ({ page }) => {
      pedidos = pedidosComFiltroPrecos(page);
      det = await abrirPrimeiroDetalhe(new PaginaPesquisaDadosReferencia(page, TELA));
      filtro = new FiltroPrecos(page, det.corpoDoPainel('Lista de Preços'));
    });

    test('CT-DR-B8.3 — Preços, Regras de Idade e Convenções colapsáveis e ordenáveis', metaDR(TELA, 'CT-DR-B8.3'), async ({ page }) => {
      const e = await det.estrutura();
      for (const lista of LISTAS) {
        await test.step(`"${lista}"`, async () => {
          expect.soft(e.titulos.find((t) => t.texto === lista)?.colapsavel, `"${lista}" colapsável`).toBe(true);
          await verificarOrdenacaoLista(page, det.tabelaDoPainel(lista), { servidor: true, descricao: lista });
        });
      }
    });

    test('CT-DR-B8.4 — Preço máximo menor que o mínimo: validação e o filtro não é aplicado', metaDR(TELA, 'CT-DR-B8.4', { tipo: 'negativo' }), async () => {
      await verificarPrecoMaximoInferior(filtro, pedidos);
    });

    test('CT-DR-B8.5 — Preço negativo ou data fim anterior à data início: validação', metaDR(TELA, 'CT-DR-B8.5', { tipo: 'negativo' }), async () => {
      await verificarPrecoNegativoEDatas(filtro);
    });

    test('CT-DR-B8.6 — Intervalo de preços válido mostra só os preços dentro do intervalo', metaDR(TELA, 'CT-DR-B8.6', { integracao: true }), async () => {
      await verificarIntervaloPrecosValido(filtro);
    });
  });
});

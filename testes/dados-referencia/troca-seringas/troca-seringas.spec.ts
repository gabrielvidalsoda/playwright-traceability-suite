import { expect, test } from '../../fixtures';
import { AMBIENTE } from '../../../dados/massa';
import { PaginaPesquisaDadosReferencia } from '../../../paginas/dadosReferencia/PaginaPesquisaDadosReferencia';
import { TROCA_SERINGAS } from '../../../paginas/dadosReferencia/telas';
import { naoAplicavel, verificarOrdenacaoLista } from '../../../paginas/dadosReferencia/padraoUi';
import {
  abrirPrimeiroDetalhe,
  metaDR,
  metaReg,
  testeConferenciaRapida,
  testeTodasAsColunasOrdenam,
} from '../apoio-dados-referencia';

/**
 * Roteiro de deploy dos padrÃµes de UI de Dados de ReferÃªncia â€” A.1.2 e B3
 * (ConvenÃ§Ãµes SICAD / Programa Troca de Seringas).
 */
test.describe('Dados de ReferÃªncia â†’ Programa Troca de Seringas', () => {
  test.describe('Pesquisa', () => {
    testeConferenciaRapida(TROCA_SERINGAS);

    test('CT-DR-B3.1 â€” TÃ­tulo "Pesquisa ConvenÃ§Ãµes SICAD / Kits"', metaDR(TROCA_SERINGAS, 'CT-DR-B3.1'), async ({ page }) => {
      const pag = new PaginaPesquisaDadosReferencia(page, TROCA_SERINGAS);
      await pag.abrir();
      await expect(pag.titulo()).toHaveText('Pesquisa ConvenÃ§Ãµes SICAD / Kits');
    });

    test('CT-DR-B3.2 â€” Aviso de filtros e erro do serviÃ§o aparecem em mensagens separadas', metaDR(TROCA_SERINGAS, 'CT-DR-B3.2', { integracao: true, tipo: 'negativo' }), async ({ page }) => {
      const pag = new PaginaPesquisaDadosReferencia(page, TROCA_SERINGAS);
      await pag.abrir();
      let aviso = '';
      await test.step('Pesquisar sem filtros mostra o aviso de filtros', async () => {
        await pag.botaoPesquisar().click();
        await expect(pag.alertas().first()).toBeVisible();
        aviso = (await pag.alertas().first().textContent())?.trim() ?? '';
      });
      await test.step('Com o serviÃ§o em erro, o erro aparece numa mensagem prÃ³pria', async () => {
        if (AMBIENTE === 'mock') {
          naoAplicavel('em mock o MSW responde antes do page.route â€” erro do serviÃ§o nÃ£o simulÃ¡vel');
          return;
        }
        await page.route('**/api/dados-referencia/troca-seringas**', (r) =>
          r.request().method() === 'GET'
            ? r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ detail: 'Erro simulado pelo teste E2E' }) })
            : r.fallback(),
        );
        await pag.preencherFiltro();
        await pag.botaoPesquisar().click();
        const erro = page.locator('.Traceability SuiteTemplate__content .MuiAlert-root').filter({ hasNotText: aviso });
        await expect(erro.first(), 'Alert de erro do serviÃ§o').toBeVisible();
        await expect.soft(page.getByText(aviso, { exact: true }), 'o aviso de filtros nÃ£o se mistura com o erro').toHaveCount(0);
      });
    });

    // RegressÃ£o dos itens em "Ready for test" (plano de 09-10-2026).
    testeTodasAsColunasOrdenam(TROCA_SERINGAS, 'SICAD');

    test('CT-REG-BUG-20260915-27 â€” O tÃ­tulo da secÃ§Ã£o de pesquisa corresponde ao item de menu "Programa Troca de Seringas"', metaReg(TROCA_SERINGAS, 'CT-REG-BUG-20260915-27', 'BUG-20260915-27'), async ({ page }) => {
      // PendÃªncia P1 (plano de 09-10-2026, Â§0.3): o CT-DR-B3.1 (roteiro de 24-09) espera
      // "Pesquisa ConvenÃ§Ãµes SICAD / Kits" e o bug pede o nome do menu. AtÃ© haver resposta do
      // Henrique/Douglas, o caso fica `fixme`; nessa altura alinhar tambÃ©m o CT-DR-B3.1.
      test.fixme(true, 'P1 â€” tÃ­tulo esperado por definir: "Pesquisa ConvenÃ§Ãµes SICAD / Kits" (CT-DR-B3.1) ou o nome do menu "Programa Troca de Seringas"');
      const pag = new PaginaPesquisaDadosReferencia(page, TROCA_SERINGAS);
      await pag.abrir();
      const item = page.locator(`a[role="menuitem"][href$="${TROCA_SERINGAS.rota}"]`).first();
      const nomeMenu = ((await item.textContent()) ?? '').trim();
      await expect(pag.titulo(), `tÃ­tulo com o nome do menu "${nomeMenu}"`).toHaveText(`Pesquisa ${nomeMenu}`);
    });
  });

  test.describe('Detalhe', () => {
    test('CT-DR-B3.3 â€” "Ir para facturas" no cabeÃ§alho (nÃ£o no rodapÃ©) e preÃ§os unitÃ¡rios num painel colapsÃ¡vel e ordenÃ¡vel', metaDR(TROCA_SERINGAS, 'CT-DR-B3.3', { interface: true }), async ({ page }) => {
      const det = await abrirPrimeiroDetalhe(new PaginaPesquisaDadosReferencia(page, TROCA_SERINGAS));
      const e = await det.estrutura();
      const cabecalho = e.titulos.find((t) => t.nivel === 1)?.cartao;
      const irPara = e.botoes.find((b) => b.rotulo === 'Ir para facturas');
      expect.soft(irPara, 'botÃ£o "Ir para facturas"').toBeDefined();
      expect.soft(irPara?.cartao, '"Ir para facturas" no cartÃ£o do cabeÃ§alho').toBe(cabecalho);
      await expect.soft(page.getByText('Ver facturas deste cÃ³digo SICAD')).toHaveCount(0);
      const painel = e.titulos.find((t) => t.texto.startsWith('PreÃ§os UnitÃ¡rios'));
      expect.soft(painel?.colapsavel, 'painel de preÃ§os unitÃ¡rios colapsÃ¡vel').toBe(true);
      if (painel) {
        await verificarOrdenacaoLista(page, det.tabelaDoPainel(painel.texto), { descricao: painel.texto });
      }
    });

    test('CT-DR-B3.4 â€” "Ir para facturas" abre as faturas filtradas por esse cÃ³digo', metaDR(TROCA_SERINGAS, 'CT-DR-B3.4', { integracao: true }), async ({ page }) => {
      const pag = new PaginaPesquisaDadosReferencia(page, TROCA_SERINGAS);
      await pag.abrir();
      await pag.pesquisarComFiltro();
      const codigo = (await pag.valoresColuna('CÃ³digo SICAD'))[0];
      expect(codigo, 'cÃ³digo SICAD da 1.Âª linha').toBeTruthy();
      await pag.abrirPrimeiroDetalhe();
      await page.getByRole('button', { name: 'Ir para facturas' }).click();
      await expect(page).toHaveURL(new RegExp(`/troca-seringas/factura\\?codigoSicad=${codigo}`));
      await expect
        .poll(() => page.locator('.Traceability SuiteTemplate__content input').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value)), {
          message: 'filtro da pesquisa de faturas preenchido com o cÃ³digo SICAD',
        })
        .toContain(codigo);
    });
  });
});

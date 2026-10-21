import { expect, test } from '../../fixtures';
import { PaginaPesquisaDadosReferencia } from '../../../paginas/dadosReferencia/PaginaPesquisaDadosReferencia';
import { PaginaDetalheDadosReferencia } from '../../../paginas/dadosReferencia/PaginaDetalheDadosReferencia';
import { CONVENCOES } from '../../../paginas/dadosReferencia/telas';
import {
  naoAplicavel,
  verificarFormatacaoTabelas,
  verificarOrdenacaoLista,
} from '../../../paginas/dadosReferencia/padraoUi';
import {
  abrirPrimeiroDetalhe,
  metaDR,
  metaReg,
  testeConferenciaRapida,
  testeTodasAsColunasOrdenam,
} from '../apoio-dados-referencia';

/**
 * Roteiro de deploy dos padrÃµes de UI de Dados de ReferÃªncia â€” A.1.1 e B2 (ConvenÃ§Ãµes).
 * RegressÃ£o dos itens em "Ready for test" (plano de 09-10-2026): BUG-20260915-12 (CONV) e -19.
 */
test.describe('Dados de ReferÃªncia â†’ ConvenÃ§Ãµes', () => {
  test.describe('Pesquisa', () => {
    testeConferenciaRapida(CONVENCOES);

    test('CT-DR-B2.1 â€” TÃ­tulo "Pesquisa ConvenÃ§Ãµes" e campo "NIF Prestador"', metaDR(CONVENCOES, 'CT-DR-B2.1'), async ({ page }) => {
      const pag = new PaginaPesquisaDadosReferencia(page, CONVENCOES);
      await pag.abrir();
      await expect.soft(pag.titulo()).toHaveText('Pesquisa ConvenÃ§Ãµes');
      await expect.soft(pag.campo('NIF Prestador')).toBeVisible();
    });

    // RegressÃ£o dos itens em "Ready for test" (plano de 09-10-2026).
    testeTodasAsColunasOrdenam(CONVENCOES, 'CONV');
  });

  test.describe('Processos de conferÃªncia', () => {
    test('CT-REG-BUG-20260915-19 â€” "Ver detalhe" de uma fatura mostra um aviso de indisponibilidade em texto legÃ­vel, sem URL', metaReg(CONVENCOES, 'CT-REG-BUG-20260915-19', 'BUG-20260915-19', { integracao: true }), async ({ page }) => {
      test.slow();
      const pag = new PaginaPesquisaDadosReferencia(page, CONVENCOES);
      const det = new PaginaDetalheDadosReferencia(page);
      const tabela = det.conteudo().locator('table').first();
      const verDetalhe = tabela.locator('td[headers="actions"] button[aria-label^="Ver detalhe"]');
      let encontrou = false;
      await test.step('Abrir os Processos de conferÃªncia de uma convenÃ§Ã£o com faturas (atÃ© Ã s 5 primeiras da pesquisa)', async () => {
        await pag.abrir();
        await pag.pesquisarComFiltro();
        const n = Math.min(await pag.botoesVerDetalhe().count(), 5);
        for (let i = 0; i < n && !encontrou; i++) {
          if (i > 0) {
            await pag.abrir();
            await pag.pesquisarComFiltro();
          }
          await pag.botoesVerDetalhe().nth(i).click();
          const irPara = page.getByRole('button', { name: 'Ir para Processos de ConferÃªncia' });
          await expect(irPara).toBeVisible({ timeout: 20_000 });
          await irPara.click();
          await expect(page).toHaveURL(/\/processos-conferencia$/);
          await expect(det.conteudo().getByText('A carregar...')).toHaveCount(0);
          await expect(tabela.locator('td.Traceability Suite-tablev2-cell-loading')).toHaveCount(0);
          await expect(tabela).toBeVisible();
          encontrou = (await verDetalhe.count()) > 0;
        }
      });
      if (!encontrou) {
        naoAplicavel('nenhuma das 5 primeiras convenÃ§Ãµes da pesquisa tem faturas em Processos de conferÃªncia no dev â€” aÃ§Ã£o nÃ£o clicÃ¡vel');
        return;
      }
      let texto = '';
      await test.step('Clicar em "Ver detalhe" da 1.Âª fatura mostra a mensagem de indisponibilidade', async () => {
        await verDetalhe.first().click();
        const aviso = page.locator('.MuiSnackbar-root .MuiAlert-root, [role="alert"]').filter({ hasText: /\S/ }).first();
        await expect(aviso, 'aviso de aÃ§Ã£o nÃ£o disponÃ­vel').toBeVisible();
        texto = ((await aviso.innerText()) ?? '').trim();
        test.info().annotations.push({ type: 'observacao', description: `aviso mostrado: "${texto}"` });
      });
      await test.step('A mensagem Ã© uma frase legÃ­vel, sem rota nem URL', async () => {
        expect.soft(texto, 'texto do aviso sem "/" nem "http"').not.toMatch(/\/|http/i);
        expect.soft(texto.split(/\s+/).length, `o aviso Ã© uma frase ("${texto}")`).toBeGreaterThan(3);
      });
    });
  });

  test.describe('Detalhe', () => {
    let det: PaginaDetalheDadosReferencia;
    test.beforeEach(async ({ page }) => {
      det = await abrirPrimeiroDetalhe(new PaginaPesquisaDadosReferencia(page, CONVENCOES));
    });

    test('CT-DR-B2.2 â€” "Ir paraâ€¦" no cabeÃ§alho, identificaÃ§Ã£o no cartÃ£o da Entidade com subtÃ­tulos, sub-tabelas num cartÃ£o prÃ³prio', metaDR(CONVENCOES, 'CT-DR-B2.2', { interface: true }), async () => {
      const e = await det.estrutura();
      const cabecalho = e.titulos.find((t) => t.nivel === 1)?.cartao;
      for (const rotulo of ['Ir para Processos de ConferÃªncia', 'Ir para Conta Corrente']) {
        const b = e.botoes.find((x) => x.rotulo === rotulo);
        expect.soft(b, `botÃ£o "${rotulo}"`).toBeDefined();
        expect.soft(b?.cartao, `"${rotulo}" no cartÃ£o do cabeÃ§alho`).toBe(cabecalho);
      }
      const subtitulos = e.titulos.filter((t) => t.nivel === 2 && t.cartao === cabecalho).map((t) => t.texto);
      expect.soft(subtitulos, 'subtÃ­tulos da identificaÃ§Ã£o no cartÃ£o da Entidade').toEqual(
        expect.arrayContaining(['ConvenÃ§Ã£o', 'Dados da Entidade']),
      );
      const subtabelas = e.titulos.filter((t) => t.nivel === 2 && t.colapsavel);
      expect.soft(subtabelas.length, 'hÃ¡ sub-tabelas').toBeGreaterThan(0);
      expect.soft(new Set(subtabelas.map((t) => t.cartao)).size, 'sub-tabelas num sÃ³ cartÃ£o').toBe(1);
      expect.soft(subtabelas[0]?.cartao, 'cartÃ£o das sub-tabelas â‰  cartÃ£o da Entidade').not.toBe(cabecalho);
    });

    test('CT-DR-B2.3 â€” "Alterar" Ã© clicÃ¡vel e avisa que a alteraÃ§Ã£o ainda nÃ£o estÃ¡ disponÃ­vel', metaDR(CONVENCOES, 'CT-DR-B2.3'), async ({ page }) => {
      const alterar = page.getByRole('button', { name: 'Alterar', exact: true });
      await expect(alterar).toBeEnabled();
      await alterar.click();
      await expect(page.getByText(/alteraÃ§Ã£o de convenÃ§Ãµes ainda nÃ£o estÃ¡ disponÃ­vel/i)).toBeVisible();
    });

    test('CT-DR-B2.4 â€” Sub-tabelas com moeda, % e datas formatadas; datas vazias como "â€”"', metaDR(CONVENCOES, 'CT-DR-B2.4'), async () => {
      await expect(det.conteudo().locator('td.Traceability Suite-tablev2-cell-loading')).toHaveCount(0);
      await verificarFormatacaoTabelas(det.conteudo().locator('table'));
    });

    test('CT-DR-B2.5 â€” Conta Corrente e Processos de ConferÃªncia usam cartÃµes padrÃ£o e as tabelas ordenam', metaDR(CONVENCOES, 'CT-DR-B2.5'), async ({ page }) => {
      await test.step('Ir para Conta Corrente', async () => {
        await page.getByRole('button', { name: 'Ir para Conta Corrente' }).click();
        await expect(page).toHaveURL(/\/conta-corrente$/);
        await expect(det.titulo()).toBeVisible();
        await expect.soft(det.conteudo().locator('.MuiPaper-root').first()).toBeVisible();
        await verificarOrdenacaoLista(page, det.conteudo().locator('table').first(), { descricao: 'Movimentos da Conta Corrente' });
      });
      await test.step('Voltar e ir para Processos de ConferÃªncia', async () => {
        await det.botaoVoltar().click();
        await det.esperarCarregado();
        await page.getByRole('button', { name: 'Ir para Processos de ConferÃªncia' }).click();
        await expect(page).toHaveURL(/\/processos-conferencia$/);
        await expect(det.titulo()).toBeVisible();
        await expect.soft(det.conteudo().locator('.MuiPaper-root').first()).toBeVisible();
        await verificarOrdenacaoLista(page, det.conteudo().locator('table').first(), { descricao: 'Faturas' });
      });
    });
  });
});

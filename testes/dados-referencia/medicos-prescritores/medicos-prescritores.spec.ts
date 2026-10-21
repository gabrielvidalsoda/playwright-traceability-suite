import { expect, test } from '../../fixtures';
import { PaginaPesquisaDadosReferencia } from '../../../paginas/dadosReferencia/PaginaPesquisaDadosReferencia';
import { MEDICOS_PRESCRITORES } from '../../../paginas/dadosReferencia/telas';
import {
  verificarEstadoComoTexto,
  verificarOrdenacaoLista,
  verificarOrdenacaoServidor,
} from '../../../paginas/dadosReferencia/padraoUi';
import {
  abrirPrimeiroDetalhe,
  metaDR,
  metaReg,
  testeConferenciaRapida,
  testeDataVaziaComDatepicker,
  testeTodasAsColunasOrdenam,
} from '../apoio-dados-referencia';

/**
 * Roteiro de deploy dos padrÃµes de UI de Dados de ReferÃªncia â€” A.1.6 e B7 (MÃ©dicos / Prescritores).
 * RegressÃ£o dos itens em "Ready for test" (plano de 09-10-2026): BUG-20260915-07 (MED),
 * BUG-20260915-12 (MED) e TASK-20260928-03.
 */
const TELA = MEDICOS_PRESCRITORES;

/** Mensagem de critÃ©rio mÃ­nimo (`ccmsns-ui` `src/commons/filtros/mensagens.ts`, `preenchaPeloMenosUmCampo`). */
const MSG_CRITERIO_MINIMO = /preencher pelo menos um dos campos de pesquisa/i;

test.describe('Dados de ReferÃªncia â†’ MÃ©dicos / Prescritores', () => {
  test.describe('Pesquisa', () => {
    testeConferenciaRapida(TELA);

    test('CT-DR-B7.1 â€” Data de ReferÃªncia vazia e com o Datepicker padrÃ£o', metaDR(TELA, 'CT-DR-B7.1'), async ({ page }) => {
      const pag = new PaginaPesquisaDadosReferencia(page, TELA);
      await pag.abrir();
      await expect.soft(pag.campo('Data de ReferÃªncia')).toHaveValue('');
      await expect.soft(pag.campo('Data de ReferÃªncia')).toHaveAttribute('placeholder', 'DD/MM/YYYY');
      await expect.soft(pag.formulario().getByRole('button', { name: 'Abrir/fechar calendÃ¡rio' }), 'Ã­cone de calendÃ¡rio do Datepicker Traceability Suite').toBeVisible();
    });

    test('CT-DR-B7.2 â€” Ordenar por NÂº Prescritor e por Tipo, tambÃ©m na pÃ¡gina 2; Estado em texto', metaDR(TELA, 'CT-DR-B7.2', { integracao: true }), async ({ page }) => {
      const pag = new PaginaPesquisaDadosReferencia(page, TELA);
      for (const coluna of ['N.Âº Prescritor', 'Tipo']) {
        await test.step(`Ordenar por "${coluna}"`, async () => {
          await pag.abrir();
          await pag.pesquisarComFiltro();
          await verificarOrdenacaoServidor(pag, coluna);
        });
      }
      await test.step('O Estado aparece como texto', async () => {
        await verificarEstadoComoTexto(page);
      });
    });

    testeDataVaziaComDatepicker(TELA, 'MED', 'Data de ReferÃªncia');
    testeTodasAsColunasOrdenam(TELA, 'MED');

    test('CT-REG-TASK-20260928-03 â€” Escolher uma data no Datepicker de "Data de ReferÃªncia" nÃ£o mostra o erro de pesquisa vazia; sÃ³ Pesquisar o mostra', metaReg(TELA, 'CT-REG-TASK-20260928-03', 'TASK-20260928-03', { tipo: 'robustez' }), async ({ page }) => {
      const pag = new PaginaPesquisaDadosReferencia(page, TELA);
      await pag.abrir();
      const aviso = page.locator('.Traceability SuiteTemplate__content').getByText(MSG_CRITERIO_MINIMO);
      const campoData = pag.campo('Data de ReferÃªncia');

      await test.step('Todos os campos de texto comeÃ§am vazios', async () => {
        const valores = await pag.formulario().locator('input:not([type]), input[type="text"]').evaluateAll((els) =>
          els.map((e) => `${e.getAttribute('aria-label') ?? e.id}=${(e as HTMLInputElement).value}`).filter((v) => !v.endsWith('=')),
        );
        expect.soft(valores, 'campos preenchidos ao abrir').toEqual([]);
      });

      await test.step('Abrir o calendÃ¡rio e escolher uma data nÃ£o mostra nenhum erro', async () => {
        await pag.formulario().getByRole('button', { name: 'Abrir/fechar calendÃ¡rio' }).first().click();
        await expect(page.getByRole('button', { name: 'MÃªs anterior' }), 'o calendÃ¡rio abriu').toBeVisible();
        await expect.soft(aviso, 'erro de critÃ©rio mÃ­nimo com o calendÃ¡rio aberto').toHaveCount(0);
        const dia = page.getByRole('gridcell', { name: '15', exact: true }).or(page.getByRole('button', { name: '15', exact: true })).first();
        if (await dia.isVisible().catch(() => false)) {
          await dia.click();
        } else {
          test.info().annotations.push({ type: 'observacao', description: 'dia do calendÃ¡rio nÃ£o encontrado por papel; a data foi escrita no campo' });
          await page.keyboard.press('Escape');
          await campoData.click();
          await campoData.pressSequentially('15/09/2026');
          await campoData.press('Tab');
        }
        await expect.soft(campoData, 'a data escolhida fica no campo').not.toHaveValue('');
        await page.waitForTimeout(300);
        await expect.soft(aviso, 'erro de critÃ©rio mÃ­nimo depois de escolher a data').toHaveCount(0);
        await expect.soft(pag.alertas(), 'nenhum alerta/validaÃ§Ã£o depois de escolher a data').toHaveCount(0);
      });

      await test.step('Clicar em Pesquisar sem mais nenhum campo mostra "Ã‰ necessÃ¡rio preencher pelo menos um dos campos de pesquisa."', async () => {
        await pag.botaoPesquisar().click();
        await expect.soft(aviso.first(), 'mensagem de critÃ©rio mÃ­nimo depois de Pesquisar').toBeVisible();
      });
    });
  });

  test.describe('Detalhe', () => {
    test('CT-DR-B7.3 â€” Especialidades, SuspensÃµes e UtilizaÃ§Ã£o colapsÃ¡veis; SuspensÃµes e UtilizaÃ§Ã£o ordenam; Estado em texto', metaDR(TELA, 'CT-DR-B7.3'), async ({ page }) => {
      const det = await abrirPrimeiroDetalhe(new PaginaPesquisaDadosReferencia(page, TELA));
      const e = await det.estrutura();
      for (const painel of ['Especialidades', 'SuspensÃµes', 'UtilizaÃ§Ã£o']) {
        expect.soft(e.titulos.find((t) => t.texto === painel)?.colapsavel, `"${painel}" colapsÃ¡vel`).toBe(true);
      }
      for (const painel of ['SuspensÃµes', 'UtilizaÃ§Ã£o']) {
        await test.step(`"${painel}" ordena`, async () => {
          await verificarOrdenacaoLista(page, det.tabelaDoPainel(painel), { descricao: painel });
        });
      }
      await test.step('O Estado aparece como texto', async () => {
        await verificarEstadoComoTexto(page);
      });
    });
  });
});

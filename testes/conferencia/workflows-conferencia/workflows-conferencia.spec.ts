import { abrirItemMenu } from '../../../paginas/conferencia/menu';
import { workflows } from '../../../paginas/conferencia/motorRegras';
import { escolherOpcao, MSG, opcoesDe, Tabela, tituloH1 } from '../../../paginas/conferencia/Traceability Suite';
import {
  abrir,
  expect,
  metaConf,
  observar,
  semMassa,
  test,
  metaPadraoPesquisa,
  verificarPadraoPesquisa,
  VIEWPORT_PADRAO_PESQUISA,
} from '../apoio-conferencia';

/**
 * ConferÃªncia â†’ Workflows de ConferÃªncia (`/motor-regras/workflows`) â€” script C1
 * (VisualizaÃ§Ã£o) de 08-10-2026, S11. SÃ³ leitura: nunca Â«Novo workflowÂ», Â«EditarÂ»,
 * Â«AtivarÂ»/Â«DesativarÂ» nem Â«Adicionar regraÂ» (os workflows existentes sÃ£o a base de testes
 * do Walmir).
 */

const ITEM = 'workflows' as const;
const COLUNAS = ['AcrÃ³nimo', 'Ãrea', 'DescriÃ§Ã£o', 'Modo de execuÃ§Ã£o', 'N.Âº Regras', 'Ãšltima atualizaÃ§Ã£o', 'Estado'];

test.describe('ConferÃªncia â†’ Workflows de ConferÃªncia', () => {
  test.describe('Pesquisa', () => {
    test('CT-CONF-WF-01 â€” Lista e filtros (AcrÃ³nimo, Modo, Estado)', metaConf(ITEM, 'CT-CONF-WF-01', ['RF-27']), async ({ page }) => {
      const lista = workflows(page);
      await abrir(page, '/');
      await abrirItemMenu(page, 'Workflows de ConferÃªncia');
      await expect(tituloH1(page)).toHaveText(lista.titulo);
      const t = lista.tabela();
      await t.esperar();
      expect.soft(await t.textoVazio(), 'nÃ£o pesquisa ao abrir').toBe(MSG.antesPesquisa);
      await test.step('Exportar antes de pesquisar', async () => {
        const exp = t.botaoExportar();
        const desativado = await exp.isDisabled();
        if (!desativado) {
          await exp.click();
          observar(`Antes de pesquisar Â«Exportar XLSXÂ» estÃ¡ ativo (${(await page.getByText(MSG.exportarSemResultados).isVisible()) ? `mostra Â«${MSG.exportarSemResultados}Â»` : 'sem mensagem'})`);
        }
        expect.soft(desativado, 'Exportar desativado antes de pesquisar').toBe(true);
      });
      await lista.pesquisar();
      expect.soft(await t.colunas()).toEqual(COLUNAS);
      const emAprovacao = await page.locator('[role="img"][aria-label="Em aprovaÃ§Ã£o"]').count();
      observar(`${emAprovacao} workflow(s) com o Ã­cone Â«Em aprovaÃ§Ã£oÂ» na 1.Âª pÃ¡gina`);

      await test.step('AcrÃ³nimo Â«LOTEÂ»', async () => {
        await page.getByRole('textbox', { name: 'AcrÃ³nimo' }).fill('LOTE');
        await lista.pesquisar();
        for (const a of await t.valoresColuna('AcrÃ³nimo')) expect.soft(a, 'contÃ©m LOTE').toMatch(/LOTE/i);
        await page.getByRole('textbox', { name: 'AcrÃ³nimo' }).fill('');
      });
      for (const [filtro, opcao, coluna] of [
        ['Modo de execuÃ§Ã£o', 'AssÃ­ncrono', 'Modo de execuÃ§Ã£o'],
        ['Estado', 'Inativo', 'Estado'],
      ] as const) {
        await test.step(`${filtro} = ${opcao}`, async () => {
          await escolherOpcao(page, filtro, opcao);
          await lista.pesquisar();
          for (const v of await t.valoresColuna(coluna)) expect.soft(v, `${coluna} = ${opcao}`).toBe(opcao);
          await escolherOpcao(page, filtro, /^Selec/);
        });
      }
    });

    test('CT-CONF-WF-02 â€” Filtro Ãrea: Medicamentos, MCDT, CRD', metaConf(ITEM, 'CT-CONF-WF-02', ['RF-27', 'Q-13']), async ({ page }) => {
      const lista = workflows(page);
      await lista.abrir();
      const opcoes = await opcoesDe(page, 'Ãrea');
      const vistos: string[] = [];
      for (const re of [/Medicamentos/i, /MCDT/i, /CRD|Respirat/i]) {
        const opcao = opcoes.find((o) => re.test(o));
        expect.soft(opcao, `opÃ§Ã£o de Ãrea ${re}`).toBeDefined();
        if (!opcao) continue;
        await test.step(opcao, async () => {
          await escolherOpcao(page, 'Ãrea', opcao);
          await lista.pesquisar();
          const t = lista.tabela();
          const acr = await t.valoresColuna('AcrÃ³nimo');
          for (const a of await t.valoresColuna('Ãrea')) expect.soft(a, `Ãrea = ${opcao}`).toBe(opcao);
          expect.soft(acr.length, `${opcao}: workflows`).toBeGreaterThan(0);
          vistos.push(`${opcao}: ${acr.join(', ') || 'â€”'}`);
        });
      }
      observar(`Workflows por Ã¡rea (1.Âª pÃ¡gina) â€” ${vistos.join(' | ')}`);
    });
  });

  test.describe('Detalhe', () => {
    test('CT-CONF-WF-03 â€” Detalhe de MED_LOTE96: regras por fase somam o N.Âº Regras', metaConf(ITEM, 'CT-CONF-WF-03', ['RF-27', 'RN-04', 'Q-09']), async ({ page }) => {
      const lista = workflows(page);
      await lista.abrir();
      await page.getByRole('textbox', { name: 'AcrÃ³nimo' }).fill('MED_LOTE96');
      await lista.pesquisar();
      const acr = await lista.tabela().valoresColuna('AcrÃ³nimo');
      const i = acr.indexOf('MED_LOTE96');
      semMassa(i < 0, 'workflow MED_LOTE96 nÃ£o encontrado');
      const nRegras = Number((await lista.tabela().valoresColuna('N.Âº Regras'))[i]);
      await lista.tabela().acaoNaLinha(i, 'Ver detalhes').click();
      await expect(tituloH1(page)).toHaveText('MED_LOTE96', { timeout: 30_000 });
      await expect(page.getByRole('heading', { name: 'Regras do workflow' })).toBeVisible();
      await expect(page.getByRole('heading', { level: 3, name: /^Fase: / }).first()).toBeVisible({ timeout: 60_000 });
      const fases = (await page.getByRole('heading', { level: 3, name: /^Fase: / }).allInnerTexts()).map((f) => f.trim());
      for (const f of fases) expect.soft(['Fase: ValidaÃ§Ã£o', 'Fase: CÃ¡lculo', 'Fase: PÃ³s-cÃ¡lculo', 'Fase: ZerificaÃ§Ã£o'], f).toContain(f);
      const tabelas = page.locator('table').filter({ has: page.locator('thead th[abbr="Seq."]') });
      const seqs: number[] = [];
      for (let k = 0; k < (await tabelas.count()); k++) {
        const t = new Tabela(tabelas.nth(k));
        await t.esperar();
        seqs.push(...(await t.valoresColuna('Seq.')).map(Number));
        expect.soft(await t.colunas(), `colunas da ${fases[k] ?? `tabela ${k + 1}`}`).toEqual(['Seq.', 'AcrÃ³nimo', 'CÃ³digo do erro', 'Tipo', 'Ã‚mbito', 'Estado']);
      }
      expect.soft(seqs.length, `soma das regras por fase = N.Âº Regras da lista (${nRegras})`).toBe(nRegras);
      expect.soft(seqs, 'Seq. contÃ­nua entre fases').toEqual(seqs.map((_, k) => k + 1));
      await expect.soft(page.getByRole('heading', { name: 'HistÃ³rico de solicitaÃ§Ãµes' })).toBeVisible();
      observar(`MED_LOTE96: fases [${fases.join(', ')}], ${seqs.length} regras (Q-09: confirmar se faltam regras da categoria DECISAO)`);
    });

    test('CT-CONF-WF-12 â€” Ids invÃ¡lidos', metaConf(ITEM, 'CT-CONF-WF-12', ['Â§5 PRD'], { tipo: 'negativo' }), async ({ page }) => {
      await abrir(page, '/motor-regras/workflows/abc');
      await expect(page.getByText('Identificador de workflow invÃ¡lido.', { exact: true })).toBeVisible({ timeout: 30_000 });
      await abrir(page, '/motor-regras/workflows/999999');
      await expect(page.getByText('Workflow nÃ£o encontrado(a) com id: 999999')).toBeVisible({ timeout: 60_000 });
    });

    test('CT-CONF-WF-15 â€” Versionamento e eliminaÃ§Ã£o do workflow', metaConf(ITEM, 'CT-CONF-WF-15', ['RF-36', 'Q-06']), async ({ page }) => {
      const lista = workflows(page);
      await lista.abrir();
      await lista.pesquisar();
      semMassa((await lista.tabela().linhas().count()) === 0, 'sem workflows');
      await lista.abrirPrimeiroDetalhe();
      const texto = await page.locator('main, body').first().innerText();
      const versoes = /vers(Ã£o|Ãµes)|rollback|reverter/i.test(texto);
      const eliminar = (await page.getByRole('button', { name: /Eliminar/ }).count()) > 0;
      observar(`RF-36 (Q-06): controlo de versÃµes/rollback ${versoes ? 'encontrado' : 'inexistente'}; eliminar workflow ${eliminar ? 'existe' : 'inexistente'} (sÃ³ Â«HistÃ³rico de solicitaÃ§ÃµesÂ»)`);
      expect.soft(versoes, 'requisito: controlo de versÃµes com rollback').toBe(true);
    });
  });

  // ---------------------------------------------------------------------------------
  // PadrÃ£o de pesquisa da ConferÃªncia (TASK-20260928-08, #1568): os 5 pontos da tarefa.
  test.describe('PadrÃ£o de pesquisa', () => {
    test.use({ viewport: VIEWPORT_PADRAO_PESQUISA });

    test(
      'CT-REG-TASK-20260928-08-WF â€” Workflows de ConferÃªncia no padrÃ£o de pesquisa: breadcrumb, largura dos filtros, chips, placeholders e tÃ­tulo',
      metaPadraoPesquisa('workflows', 'WF'),
      async ({ page }) => {
        await verificarPadraoPesquisa(page, {
          itemMenu: 'Workflows de conferÃªncia',
          titulo: 'Pesquisa de Workflows',
          pesquisar: async (p) => {
          await workflows(p).pesquisar();
          return workflows(p).tabela().linhas().count();
        },
        });
      },
    );
  });
});

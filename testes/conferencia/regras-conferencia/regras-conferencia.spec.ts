import type { Page } from '@playwright/test';
import { abrirItemMenu } from '../../../paginas/conferencia/menu';
import { regras } from '../../../paginas/conferencia/motorRegras';
import { escolherOpcao, Tabela, tituloH1, valorCampo } from '../../../paginas/conferencia/Traceability Suite';
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
 * ConferÃªncia â†’ Regras de ConferÃªncia (`/motor-regras/regras`) â€” script C1 (VisualizaÃ§Ã£o)
 * de 08-10-2026, S12. SÃ³ leitura: nunca Â«Nova regraÂ», Â«EditarÂ», Â«AtivarÂ»/Â«DesativarÂ»,
 * Â«EliminarÂ», nem a seleÃ§Ã£o em massa (Â«Ativar/Desativar selecionadasÂ» gravam logo).
 */

const ITEM = 'regras' as const;
const COLUNAS = ['AcrÃ³nimo', 'Workflow', 'ID do erro', 'CÃ³digo do erro', 'Tipo', 'Tipo de erro', 'Ã‚mbito', 'Estado'];
const PLACEHOLDER_ERRO = 'Pesquise por ID, cÃ³digo ou descriÃ§Ã£o';

const campoErro = (page: Page) => page.getByPlaceholder(PLACEHOLDER_ERRO);

test.describe('ConferÃªncia â†’ Regras de ConferÃªncia', () => {
  test.describe('Pesquisa', () => {
    test('CT-CONF-REG-01 â€” Lista e filtros (implementaÃ§Ã£o, tipo de erro, Ã¢mbito, estado)', metaConf(ITEM, 'CT-CONF-REG-01', ['RF-29']), async ({ page }) => {
      test.slow();
      const lista = regras(page);
      await abrir(page, '/');
      await abrirItemMenu(page, 'Regras de ConferÃªncia');
      await expect(tituloH1(page)).toHaveText(lista.titulo);
      await lista.pesquisar();
      const t = lista.tabela();
      expect.soft(await t.colunas()).toEqual(COLUNAS);
      await test.step('Regra partilhada aparece uma vez por workflow', async () => {
        const acr = await t.valoresColuna('AcrÃ³nimo');
        const wf = await t.valoresColuna('Workflow');
        const pares = acr.map((a, i) => `${a}|${wf[i]}`);
        expect.soft(pares.length, 'sem pares acrÃ³nimo Ã— workflow repetidos').toBe(new Set(pares).size);
      });
      for (const [filtro, opcao, coluna, re] of [
        ['Tipo de implementaÃ§Ã£o', 'SpEL', 'Tipo', /SpEL/],
        ['Tipo de erro', 'D - DevoluÃ§Ã£o', 'Tipo de erro', /^D\b|DevoluÃ§Ã£o/],
        ['Ã‚mbito', 'PrestaÃ§Ã£o', 'Ã‚mbito', /^PrestaÃ§Ã£o$/],
        ['Estado', 'Ativa', 'Estado', /^Ativa$/],
      ] as const) {
        await test.step(`${filtro} = ${opcao}`, async () => {
          await escolherOpcao(page, filtro, opcao);
          await lista.pesquisar();
          for (const v of await t.valoresColuna(coluna)) expect.soft(v, `${coluna} ~ ${opcao}`).toMatch(re);
          await escolherOpcao(page, filtro, /^Selec/);
        });
      }
    });

    test('CT-CONF-REG-02 â€” Filtro Erro: por cÃ³digo, por descriÃ§Ã£o e sem correspondÃªncia', metaConf(ITEM, 'CT-CONF-REG-02', ['RF-29']), async ({ page }) => {
      const lista = regras(page);
      await lista.abrir();
      const campo = campoErro(page);
      await test.step('cÃ³digo D050', async () => {
        await campo.fill('D050');
        await expect(page.getByRole('option').first()).toBeVisible({ timeout: 15_000 });
        expect.soft((await page.getByRole('option').allInnerTexts()).some((o) => o.includes('D050'))).toBe(true);
      });
      await test.step('parte da descriÃ§Ã£o', async () => {
        await campo.fill('');
        await campo.fill('prescri');
        await expect(page.getByRole('option').first()).toBeVisible({ timeout: 15_000 });
        for (const o of (await page.getByRole('option').allInnerTexts()).slice(0, 5)) expect.soft(o.toLowerCase()).toContain('prescri');
      });
      await test.step('Â«zzzÂ»', async () => {
        await campo.fill('');
        await campo.fill('zzz');
        await expect(page.getByText('Nenhum erro encontrado', { exact: true })).toBeVisible({ timeout: 15_000 });
      });
      await page.keyboard.press('Escape');
    });
  });

  test.describe('Detalhe', () => {
    test('CT-CONF-REG-03 â€” Detalhe de uma regra partilhada por 2 workflows', metaConf(ITEM, 'CT-CONF-REG-03', ['RF-29', 'Q-03']), async ({ page }) => {
      const lista = regras(page);
      await lista.abrir('?_t=20');
      await lista.pesquisar();
      const t = lista.tabela();
      let indice = -1;
      for (let pagina = 0; pagina < 5 && indice < 0; pagina++) {
        const acr = await t.valoresColuna('AcrÃ³nimo');
        indice = acr.findIndex((a, i) => acr.indexOf(a) !== i);
        if (indice >= 0) break;
        const seguinte = page.getByRole('button', { name: /prÃ³xima pÃ¡gina|next page/i });
        if (!(await seguinte.isEnabled())) break;
        await seguinte.click();
        await t.esperar();
      }
      semMassa(indice < 0, '{REGRA_PARTILHADA}: nenhum acrÃ³nimo repetido nas 5 primeiras pÃ¡ginas');
      const acronimo = (await t.valoresColuna('AcrÃ³nimo'))[indice];
      await t.acaoNaLinha(indice, 'Ver detalhes').click();
      await expect(tituloH1(page)).toHaveText(acronimo, { timeout: 30_000 });
      for (const s of ['IdentificaÃ§Ã£o', 'Erro associado', 'ImplementaÃ§Ã£o']) {
        await expect.soft(page.getByRole('heading', { level: 3, name: s }), s).toBeVisible();
      }
      for (const c of ['ID do erro', 'CÃ³digo do erro', 'Tipo de erro', 'Ã‚mbito', 'Aceita justificaÃ§Ã£o', 'SequÃªncia', 'Mensagem de erro']) {
        await expect.soft(page.getByText(c, { exact: true }).first(), c).toBeVisible();
      }
      await expect.soft(page.getByRole('heading', { name: 'Workflows', exact: true })).toBeVisible();
      const wf = Tabela.comColuna(page, 'SequÃªncia');
      await wf.esperar();
      expect.soft(await wf.colunas()).toEqual(['Workflow', 'Ãrea', 'SequÃªncia', 'Estado']);
      expect.soft(await wf.linhas().count(), 'associada a â‰¥ 2 workflows').toBeGreaterThanOrEqual(2);
      await expect.soft(page.getByRole('heading', { name: 'HistÃ³rico de solicitaÃ§Ãµes' })).toBeVisible();
      const estadoRegra = (await valorCampo(page, 'Estado').innerText()).trim();
      const estadosAssoc = await wf.valoresColuna('Estado');
      observar(`${acronimo}: Estado da regra Â«${estadoRegra}Â» Ã— associaÃ§Ãµes [${estadosAssoc.join(', ')}] (Q-03)`);
    });

    test('CT-CONF-REG-16 â€” Enquadramento legal da regra', metaConf(ITEM, 'CT-CONF-REG-16', ['RF-33', 'Q-07']), async ({ page }) => {
      const lista = regras(page);
      await lista.abrir();
      await lista.pesquisar();
      semMassa((await lista.tabela().linhas().count()) === 0, 'sem regras');
      await lista.abrirPrimeiroDetalhe();
      const existe = /diploma|enquadramento legal|artigo/i.test(await page.locator('body').innerText());
      observar(`RF-33 (Q-07): campo de enquadramento legal no detalhe ${existe ? 'encontrado' : 'inexistente'}`);
      expect.soft(existe, 'requisito: associar a regra ao enquadramento legal').toBe(true);
    });

    test('CT-CONF-REG-17 â€” Ids invÃ¡lidos', metaConf(ITEM, 'CT-CONF-REG-17', ['Â§5 PRD'], { tipo: 'negativo' }), async ({ page }) => {
      await abrir(page, '/motor-regras/regras/abc');
      await expect(page.getByText('Identificador de regra invÃ¡lido.', { exact: true })).toBeVisible({ timeout: 30_000 });
      await abrir(page, '/motor-regras/regras/999999');
      const alerta = page.getByRole('alert').first();
      await expect(alerta).toBeVisible({ timeout: 60_000 });
      const texto = (await alerta.innerText()).trim();
      observar(`Id 999999: Â«${texto}Â»`);
      expect.soft(texto).toContain('Regra nÃ£o encontrada.');
    });
  });

  // ---------------------------------------------------------------------------------
  // PadrÃ£o de pesquisa da ConferÃªncia (TASK-20260928-08, #1568): os 5 pontos da tarefa.
  test.describe('PadrÃ£o de pesquisa', () => {
    test.use({ viewport: VIEWPORT_PADRAO_PESQUISA });

    test(
      'CT-REG-TASK-20260928-08-REG â€” Regras de ConferÃªncia no padrÃ£o de pesquisa: breadcrumb, largura dos filtros, chips, placeholders e tÃ­tulo',
      metaPadraoPesquisa('regras', 'REG'),
      async ({ page }) => {
        await verificarPadraoPesquisa(page, {
          itemMenu: 'Regras de conferÃªncia',
          titulo: 'Pesquisa de Regras',
          pesquisar: async (p) => {
          await regras(p).pesquisar();
          return regras(p).tabela().linhas().count();
        },
        });
      },
    );
  });
});

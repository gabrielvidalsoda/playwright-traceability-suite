import type { Page } from '@playwright/test';
import { abrirItemMenu } from '../../../paginas/conferencia/menu';
import {
  botao,
  ci,
  combobox,
  escolherOpcao,
  exportar,
  limpar,
  MSG,
  opcoesDe,
  pesquisar,
  Tabela,
  tituloH1,
  trilho,
  trilhoBreadcrumb,
  valorCampo,
} from '../../../paginas/conferencia/Traceability Suite';
import {
  abrir,
  expect,
  metaConf,
  observar,
  semMassa,
  test,
  type Paginado,
  metaPadraoPesquisa,
  verificarPadraoPesquisa,
  VIEWPORT_PADRAO_PESQUISA,
} from '../apoio-conferencia';

/**
 * ConferÃªncia â†’ ConferÃªncia Manual: SupervisÃ£o â€” script C1 (VisualizaÃ§Ã£o) de 08-10-2026,
 * S8 (SupervisÃ£o), S9 (AlocaÃ§Ã£o de Equipa) e S10 (Prestadores PrioritÃ¡rios), que no
 * breadcrumb ficam sob a SupervisÃ£o.
 *
 * SÃ³ leitura: os drawers e modais sÃ³ sÃ£o observados. Nunca se clica nos botÃµes de aÃ§Ã£o
 * (Reservar, Atribuir, Suspender, ForÃ§ar libertaÃ§Ã£o, Voltar para Fila, Decidir destino,
 * Alterar prioridade, Adicionar nota), nem nos **operadores** da AlocaÃ§Ã£o (gravam logo),
 * nem em Â«Adicionar prestador prioritÃ¡rioÂ» / Â«RemoverÂ».
 */

const ITEM = 'supervisao' as const;
const ROTA = '/conferencia/supervisao';
const RE_CONTADORES = /^(\d+) a aguardar decisÃ£o Â· (\d+) em execuÃ§Ã£o Â· (\d+) atribuÃ­das Â· (\d+) suspensas Â· (\d+) no pool Â· (\d+) totais$/;

const pool = (page: Page) => Tabela.comColuna(page, 'CÃ³digo do Prestador');
const escaladas = (page: Page) => Tabela.comColuna(page, 'Motivo');
const drawer = (page: Page) => page.locator('.MuiDrawer-paper');

async function abrirSupervisao(page: Page): Promise<void> {
  await abrir(page, ROTA);
  await expect(tituloH1(page)).toHaveText(ci('ConferÃªncia manual: supervisÃ£o'), { timeout: 30_000 });
}
/** Pesquisa a pool e devolve o `meta.totalRegistos` da resposta. */
async function pesquisarPool(page: Page): Promise<number> {
  const resp = page.waitForResponse(
    (r) => /\/conferencia-manual\/tarefas\?/.test(r.url()) && !/size=1(&|$)/.test(r.url()) && r.request().method() === 'GET',
  );
  await pesquisar(page).click();
  const r = await resp;
  expect(r.ok(), `pesquisa da pool â†’ HTTP ${r.status()}`).toBeTruthy();
  const total = ((await r.json()) as Paginado<unknown>).meta.totalRegistos;
  await pool(page).esperar();
  return total;
}
async function contadores(page: Page): Promise<number[]> {
  const t = page.getByText(RE_CONTADORES);
  await expect(t).toBeVisible({ timeout: 60_000 });
  return (await t.innerText()).match(RE_CONTADORES)!.slice(1).map(Number);
}

test.describe('ConferÃªncia â†’ ConferÃªncia Manual: SupervisÃ£o', () => {
  // ---------------------------------------------------------------------------------
  test.describe('SupervisÃ£o', () => {
    test('CT-CONF-SUP-01 â€” Abrir: botÃµes, contadores e atualizaÃ§Ã£o a cada 30 s', metaConf(ITEM, 'CT-CONF-SUP-01', ['RF-47']), async ({ page }) => {
      await abrir(page, '/');
      await abrirItemMenu(page, 'ConferÃªncia manual: supervisÃ£o');
      await expect(tituloH1(page)).toHaveText(ci('ConferÃªncia manual: supervisÃ£o'));
      await expect.soft(botao(page, 'AlocaÃ§Ã£o de equipa')).toBeVisible();
      await expect.soft(botao(page, 'Gerir prestadores prioritÃ¡rios')).toBeVisible();
      await contadores(page);
      const segundo = page.waitForRequest((r) => /\/conferencia-manual\/tarefas\/contadores/.test(r.url()), { timeout: 45_000 });
      await segundo;
    });

    test('CT-CONF-SUP-02 â€” Painel de escaladas', metaConf(ITEM, 'CT-CONF-SUP-02', ['RF-46']), async ({ page }) => {
      await abrirSupervisao(page);
      await expect(page.getByRole('heading', { name: /^Tarefas a aguardar decisÃ£o \(\d+\) Â· actualiza a cada 30 s$/ })).toBeVisible({ timeout: 30_000 });
      const t = escaladas(page);
      await t.esperar();
      semMassa((await t.linhas().count()) === 0, 'sem tarefas escaladas (â›” repetir na C3 depois do EXE-24)');
      expect.soft(await t.colunas()).toEqual(['Escalada', 'Operador', 'Supervisor', 'Tipo de tarefa', 'Processo', 'PrestaÃ§Ã£o', 'Nome do Prestador', 'Motivo', 'Prioridade']);
      for (const m of await t.valoresColuna('Motivo')) expect.soft(m, 'Motivo Â«[COD] obs â€¦Â»').toMatch(/^\[[^\]]+\]/);
      const atualizacao = page.waitForRequest((r) => /\/conferencia-manual\/tarefas\/escaladas/.test(r.url()), { timeout: 45_000 });
      await atualizacao;
    });

    test('CT-CONF-SUP-03 â€” Pesquisa da pool: filtros coerentes e Limpar repÃµe Â«DisponÃ­velÂ»', metaConf(ITEM, 'CT-CONF-SUP-03', ['RF-47']), async ({ page }) => {
      test.slow();
      await abrirSupervisao(page);
      await expect(combobox(page, 'Estado')).toContainText('DisponÃ­vel');
      await pesquisarPool(page);
      for (const e of await pool(page).valoresColuna('Estado')) expect.soft(e, 'Estado por omissÃ£o').toBe('DisponÃ­vel');

      await test.step('Ãrea de PrestaÃ§Ã£o = Medicamentos', async () => {
        await escolherOpcao(page, 'Ãrea de prestaÃ§Ã£o', 'Medicamentos');
        await pesquisarPool(page);
        for (const a of await pool(page).valoresColuna('Ãrea de prestaÃ§Ã£o')) expect.soft(a, 'Ã¡rea').toMatch(/^Medicamentos|^MED/);
      });
      await test.step('Prioridade = Alta', async () => {
        await escolherOpcao(page, 'Prioridade', 'Alta');
        await pesquisarPool(page);
        for (const p of await pool(page).valoresColuna('Prioridade')) expect.soft(p, 'prioridade').toMatch(/Alta/);
        await escolherOpcao(page, 'Prioridade', /^Selec/);
      });
      await test.step('CÃ³digo do Prestador (exato) e NÂº Fatura (contÃ©m)', async () => {
        await pesquisarPool(page);
        const codigo = (await pool(page).valoresColuna('CÃ³digo do Prestador'))[0];
        const fatura = (await pool(page).valoresColuna('NÂº Factura'))[0];
        if (codigo) {
          await page.getByRole('textbox', { name: 'CÃ³digo do Prestador' }).fill(codigo);
          await pesquisarPool(page);
          for (const c of await pool(page).valoresColuna('CÃ³digo do Prestador')) expect.soft(c, 'cÃ³digo exato').toBe(codigo);
          await page.getByRole('textbox', { name: 'CÃ³digo do Prestador' }).fill('');
        }
        if (fatura && fatura.length > 3) {
          const parte = fatura.slice(1, -1);
          await page.getByRole('textbox', { name: 'NÂº Factura' }).fill(parte);
          await pesquisarPool(page);
          for (const f of await pool(page).valoresColuna('NÂº Factura')) expect.soft(f, `factura contÃ©m Â«${parte}Â»`).toContain(parte);
        }
      });
      await test.step('Limpar', async () => {
        await limpar(page).click();
        await expect(combobox(page, 'Estado')).toContainText('DisponÃ­vel');
        await expect(combobox(page, 'Ãrea de prestaÃ§Ã£o')).not.toContainText('Medicamentos');
      });
    });

    test('CT-CONF-SUP-04 â€” Totais da pesquisa = contadores', metaConf(ITEM, 'CT-CONF-SUP-04', ['RF-47']), async ({ page }) => {
      await abrirSupervisao(page);
      const casos: [string | RegExp, number, string][] = [
        ['Em execuÃ§Ã£o', 1, 'em execuÃ§Ã£o'],
        ['Suspensa', 3, 'suspensas'],
        [/^Selec/, 5, 'totais'],
      ];
      for (const [estado, idx, rotulo] of casos) {
        await test.step(`Estado ${estado}`, async () => {
          await escolherOpcao(page, 'Estado', estado);
          const total = await pesquisarPool(page);
          const c = await contadores(page);
          expect.soft(total, `total da pesquisa = contador Â«${rotulo}Â» (${c[idx]})`).toBe(c[idx]);
        });
      }
    });

    test('CT-CONF-SUP-05 â€” Filtro Supervisor e o painel de escaladas', metaConf(ITEM, 'CT-CONF-SUP-05', ['RF-46']), async ({ page }) => {
      await abrirSupervisao(page);
      await escaladas(page).esperar();
      const antes = await escaladas(page).linhas().count();
      await page.getByRole('textbox', { name: 'Supervisor' }).fill('qa.inexistente');
      const pedido = page.waitForRequest((r) => /\/tarefas\/escaladas\?.*supervisor=qa\.inexistente/.test(r.url()));
      await pesquisarPool(page);
      await pedido;
      await escaladas(page).esperar();
      const depois = await escaladas(page).linhas().count();
      observar(`Escaladas no painel: ${antes} sem filtro â†’ ${depois} com Â«SupervisorÂ» = qa.inexistente (escaladas sem supervisor alvo ${depois < antes ? 'desaparecem' : 'mantÃªm-se'})`);
    });

    test('CT-CONF-SUP-16 â€” SeleÃ§Ã£o de tarefas por pÃ¡gina e limite de 100', metaConf(ITEM, 'CT-CONF-SUP-16', ['RF-47', 'RN-18']), async ({ page }) => {
      // `develop` 14d7c2b: seleÃ§Ã£o nativa da tabela (Â«Marcar/Desmarcar TodasÂ», Â«{n} itens selecionadosÂ»),
      // limpa ao mudar de pÃ¡gina/tamanho/ordem; o limite de 100 sÃ³ Ã© verificado ao clicar
      // Â«Alterar prioridadeÂ» (que nÃ£o se clica). Com 20 por pÃ¡gina, nÃ£o se passa de 20.
      test.slow();
      await abrirSupervisao(page);
      const total = await pesquisarPool(page);
      semMassa(total <= 20, `sÃ³ ${total} tarefas DisponÃ­veis (precisa de mais de uma pÃ¡gina de 20)`);
      await pool(page).mudarTamanhoPagina(20);
      const marcarPagina = pool(page).raiz.locator('thead .Traceability Suite-tablev2-header-select-checkbox input, thead [title="Marcar/Desmarcar Todas"] input').first();
      await marcarPagina.check();
      const contador = page.getByText(/^\d+ itens selecionados$/).first();
      await expect(contador).toHaveText(`${await pool(page).linhas().count()} itens selecionados`);
      await pool(page).paginaSeguinte().click();
      await pool(page).esperar();
      const depois = (await contador.isVisible().catch(() => false)) ? (await contador.innerText()).trim() : '0 itens selecionados';
      const perdeu = /^0 /.test(depois);
      observar(
        `PÃ¡gina de 20 marcada; depois de mudar de pÃ¡gina: Â«${depois}Â». ` +
          (perdeu
            ? 'A seleÃ§Ã£o perde-se ao mudar de pÃ¡gina: o limite de 100 tarefas por operaÃ§Ã£o nÃ£o Ã© alcanÃ§Ã¡vel na UI.'
            : 'A seleÃ§Ã£o mantÃ©m-se entre pÃ¡ginas.'),
      );
      await page.getByRole('button', { name: 'Limpar seleÃ§Ã£o' }).first().click().catch(() => undefined);
    });

    test('CT-CONF-SUP-30 â€” Â«Resultados por pÃ¡ginaÂ» altera o nÃºmero de linhas da pool (anotaÃ§Ãµes 08-10)', metaConf(ITEM, 'CT-CONF-SUP-30', ['RF-47', 'TR'], { interface: true }), async ({ page }) => {
      await abrirSupervisao(page);
      const total = await pesquisarPool(page);
      semMassa(total <= 10, `sÃ³ ${total} tarefas DisponÃ­veis (precisa de mais de 10)`);
      await expect(pool(page).linhas()).toHaveCount(10);
      await pool(page).mudarTamanhoPagina(20);
      await expect(pool(page).linhas(), '20 linhas por pÃ¡gina').toHaveCount(Math.min(20, total));
    });

    test('CT-CONF-SUP-17 â€” BotÃµes do drawer conforme o estado (sÃ³ observar)', metaConf(ITEM, 'CT-CONF-SUP-17', ['RF-47']), async ({ page }) => {
      test.slow();
      await abrirSupervisao(page);
      const esperados: Record<string, string[]> = {
        'DisponÃ­vel (sem dono)': ['Reservar e abrir para executar', 'Atribuir a operador', 'Alterar prioridade', 'Suspender', 'Adicionar nota'],
        'DisponÃ­vel (com dono)': ['Reatribuir a operador', 'Alterar prioridade', 'Suspender', 'Adicionar nota'],
        'Em execuÃ§Ã£o': ['Suspender', 'ForÃ§ar libertaÃ§Ã£o', 'Adicionar nota'],
        Suspensa: ['Voltar para Fila', 'Adicionar nota'],
        'Escalada ao supervisor': ['Decidir destino', 'Suspender', 'Adicionar nota'],
        Fechada: ['Adicionar nota'],
      };
      const vistos: string[] = [];
      for (const estado of ['DisponÃ­vel', 'Em execuÃ§Ã£o', 'Suspensa', 'Escalada ao supervisor', 'Fechada']) {
        await test.step(estado, async () => {
          await escolherOpcao(page, 'Estado', estado);
          await pesquisarPool(page);
          const t = pool(page);
          const n = await t.linhas().count();
          if (n === 0) {
            vistos.push(`${estado}: sem tarefas`);
            return;
          }
          const operadores = await t.valoresColuna('Operador');
          const indices = estado === 'DisponÃ­vel'
            ? [operadores.findIndex((o) => !o || o === 'â€”'), operadores.findIndex((o) => o && o !== 'â€”')].filter((i) => i >= 0)
            : [0];
          for (const i of indices) {
            const chave = estado === 'DisponÃ­vel' ? `DisponÃ­vel (${!operadores[i] || operadores[i] === 'â€”' ? 'sem' : 'com'} dono)` : estado;
            await t.acaoNaLinha(i, 'Ver detalhe').click();
            const d = drawer(page);
            await expect(d).toBeVisible();
            const botoes = (await d.getByRole('button').allInnerTexts()).map((b) => b.trim()).filter(Boolean);
            vistos.push(`${chave}: ${botoes.join(', ')}`);
            const min = (l: string[]) => l.map((b) => b.toLowerCase());
            expect.soft(min(botoes), chave).toEqual(expect.arrayContaining(min(esperados[chave])));
            if (estado === 'Fechada') await expect.soft(d.getByText(/^Tarefa encerrada em /)).toBeVisible();
            await d.getByRole('button', { name: 'Fechar' }).click();
            await expect(d).toBeHidden();
          }
        });
      }
      observar(vistos.join(' | '));
    });

    test('CT-CONF-SUP-20 â€” Exportar escaladas e pool', metaConf(ITEM, 'CT-CONF-SUP-20', ['TR']), async ({ page }) => {
      test.slow();
      await abrirSupervisao(page);
      await escaladas(page).esperar();
      if ((await escaladas(page).linhas().count()) > 0) {
        expect.soft(await exportar(page, escaladas(page).botaoExportar())).toBe('tarefas-a-aguardar-decisao.xlsx');
      } else {
        await escaladas(page).botaoExportar().click();
        observar(`Sem escaladas: Â«ExportarÂ» das escaladas mostra Â«${MSG.exportarSemResultados}Â»${(await page.getByText(MSG.exportarSemResultados).isVisible()) ? '' : ' (mensagem nÃ£o vista)'}`);
      }
      await pesquisarPool(page);
      semMassa((await pool(page).linhas().count()) === 0, 'pool sem tarefas DisponÃ­veis');
      expect(await exportar(page, pool(page).botaoExportar())).toBe('pool-tarefas.xlsx');
    });
  });

  // ---------------------------------------------------------------------------------
  test.describe('AlocaÃ§Ã£o de Equipa', () => {
    const grelha = (page: Page) => Tabela.comColuna(page, 'SugestÃ£o');
    async function abrirAlocacao(page: Page): Promise<void> {
      await abrir(page, '/conferencia/alocacao');
      await expect(tituloH1(page)).toHaveText(ci('AlocaÃ§Ã£o de equipa por grupo de tarefas'), { timeout: 30_000 });
    }
    async function pesquisarAlocacao(page: Page): Promise<void> {
      await pesquisar(page).click();
      await grelha(page).esperar();
    }

    test('CT-CONF-ALO-01 â€” Abrir a grelha de grupos a partir da SupervisÃ£o', metaConf(ITEM, 'CT-CONF-ALO-01', ['RF-48']), async ({ page }) => {
      await abrirSupervisao(page);
      await botao(page, 'AlocaÃ§Ã£o de equipa').click();
      await expect(tituloH1(page)).toHaveText(ci('AlocaÃ§Ã£o de equipa por grupo de tarefas'));
      expect.soft(await trilhoBreadcrumb(page)).toEqual(trilho('ConferÃªncia', 'ConferÃªncia Manual: SupervisÃ£o', 'AlocaÃ§Ã£o de Equipa'));
      await pesquisarAlocacao(page);
      expect.soft(await grelha(page).colunas()).toEqual(['Ãrea', 'Prioridade', 'Origem', 'Ciclo', 'Data limite', 'Na fila', 'Alocados', 'SugestÃ£o']);
      semMassa((await grelha(page).linhas().count()) === 0, 'sem grupos de alocaÃ§Ã£o');
      const anteriores = (await grelha(page).valoresColuna('Prioridade')).filter((p) => p === 'Ciclo anterior').length;
      observar(`${await grelha(page).linhas().count()} grupos na 1.Âª pÃ¡gina; ${anteriores} com Â«Ciclo anteriorÂ»`);
    });

    test('CT-CONF-ALO-02 â€” SugestÃ£o = âŒˆNa fila / 40âŒ‰', metaConf(ITEM, 'CT-CONF-ALO-02', ['RF-48']), async ({ page }) => {
      await abrirAlocacao(page);
      await pesquisarAlocacao(page);
      const fila = (await grelha(page).valoresColuna('Na fila')).map((v) => Number(v.replace(/\D/g, '')));
      const sug = (await grelha(page).valoresColuna('SugestÃ£o')).map((v) => Number(v.replace(/\D/g, '')));
      semMassa(fila.length === 0, 'sem grupos de alocaÃ§Ã£o');
      fila.forEach((f, i) => expect.soft(sug[i], `linha ${i + 1}: âŒˆ${f}/40âŒ‰`).toBe(Math.ceil(f / 40)));
    });

    test('CT-CONF-ALO-03 â€” Filtros Origem e Ciclo; Limpar repÃµe', metaConf(ITEM, 'CT-CONF-ALO-03', ['TR']), async ({ page }) => {
      await abrirAlocacao(page);
      await pesquisarAlocacao(page);
      const total = await grelha(page).linhas().count();
      semMassa(total === 0, 'sem grupos de alocaÃ§Ã£o');
      for (const [filtro, coluna] of [['Origem', 'Origem'], ['Ciclo', 'Ciclo']] as const) {
        await test.step(filtro, async () => {
          const opcao = (await opcoesDe(page, filtro)).find((o) => !/^Selec/.test(o));
          if (!opcao) return;
          await escolherOpcao(page, filtro, opcao);
          await pesquisarAlocacao(page);
          for (const v of await grelha(page).valoresColuna(coluna)) expect.soft(v, `${coluna} = ${opcao}`).toContain(opcao);
          await escolherOpcao(page, filtro, /^Selec/);
        });
      }
      await limpar(page).click();
      await expect(combobox(page, 'Origem')).toContainText(/^\s*Selec/);
      await expect(combobox(page, 'Ciclo')).toContainText(/^\s*Selec/);
    });

    test('CT-CONF-ALO-09 â€” Abrir um grupo (sÃ³ leitura, sem tocar nos operadores)', metaConf(ITEM, 'CT-CONF-ALO-09', ['RF-48']), async ({ page }) => {
      await abrirAlocacao(page);
      await pesquisarAlocacao(page);
      semMassa((await grelha(page).linhas().count()) === 0, 'sem grupos de alocaÃ§Ã£o');
      await grelha(page).acaoNaLinha(0, 'AlocaÃ§Ã£o').click();
      await expect(page).toHaveURL(/\/conferencia\/alocacao\/grupo\?.*area=/);
      await expect(tituloH1(page)).toHaveText(ci('Alocar operadores ao grupo'));
      for (const c of ['Grupo de tarefas', 'Ciclo', 'Data limite', 'Na fila', 'SugestÃ£o']) {
        await expect.soft(valorCampo(page, c), c).toBeVisible();
      }
      await expect.soft(page.getByText('Operadores', { exact: true }).first()).toBeVisible();
      await expect.soft(page.getByText(/^\d+ de \d+$/).first(), 'chip Â«{marcados} de {total}Â»').toBeVisible();
      await expect.soft(page.getByRole('textbox', { name: 'Operador' })).toBeVisible();
      const atual = await trilhoBreadcrumb(page);
      expect.soft(atual.slice(0, 3)).toEqual(trilho('ConferÃªncia', 'ConferÃªncia Manual: SupervisÃ£o', 'AlocaÃ§Ã£o de Equipa'));
    });

    test('CT-CONF-ALO-07 â€” Grupo sem Ã¡rea na URL volta Ã  grelha', metaConf(ITEM, 'CT-CONF-ALO-07', ['TR'], { tipo: 'negativo' }), async ({ page }) => {
      await abrir(page, '/conferencia/alocacao/grupo');
      await expect(page).toHaveURL(/\/conferencia\/alocacao$/, { timeout: 30_000 });
      await expect(tituloH1(page)).toHaveText(ci('AlocaÃ§Ã£o de equipa por grupo de tarefas'));
    });

    test('CT-CONF-ALO-08 â€” Exportar', metaConf(ITEM, 'CT-CONF-ALO-08', ['TR']), async ({ page }) => {
      await abrirAlocacao(page);
      await pesquisarAlocacao(page);
      semMassa((await grelha(page).linhas().count()) === 0, 'sem grupos de alocaÃ§Ã£o');
      expect(await exportar(page, grelha(page).botaoExportar())).toBe('alocacao-equipa.xlsx');
    });
  });

  // ---------------------------------------------------------------------------------
  test.describe('Prestadores PrioritÃ¡rios', () => {
    test('CT-CONF-PRI-01 â€” Abrir e pesquisar por Estado (vazio, Activo, Inactivo)', metaConf(ITEM, 'CT-CONF-PRI-01', ['RF-49']), async ({ page }) => {
      await abrirSupervisao(page);
      await botao(page, 'Gerir prestadores prioritÃ¡rios').click();
      await expect(tituloH1(page)).toHaveText(ci('Prestadores prioritÃ¡rios'), { timeout: 30_000 });
      await expect.soft(page.getByText('As tarefas destes prestadores entram automaticamente com prioridade Alta.')).toBeVisible();
      const t = Tabela.comColuna(page, 'Adicionado por');
      await t.esperar();
      expect.soft(await t.textoVazio(), 'nÃ£o pesquisa ao abrir').toBe(MSG.antesPesquisa);
      for (const [estado, esperado] of [[/^Selec/, undefined], ['Activo', 'Activo'], ['Inactivo', 'Inactivo']] as const) {
        await test.step(`Estado ${estado}`, async () => {
          await escolherOpcao(page, 'Estado', estado);
          await pesquisar(page).click();
          await t.esperar();
          expect.soft(await t.colunas()).toEqual(['CÃ³digo do Prestador', 'Nome do Prestador', 'Motivo', 'InÃ­cio da vigÃªncia', 'Fim da vigÃªncia', 'Estado', 'Adicionado por']);
          if (esperado) for (const e of await t.valoresColuna('Estado')) expect.soft(e, `Estado = ${esperado}`).toBe(esperado);
        });
      }
    });
  });

  // ---------------------------------------------------------------------------------
  // PadrÃ£o de pesquisa da ConferÃªncia (TASK-20260928-08, #1568): os 5 pontos da tarefa.
  test.describe('PadrÃ£o de pesquisa', () => {
    test.use({ viewport: VIEWPORT_PADRAO_PESQUISA });

    test(
      'CT-REG-TASK-20260928-08-SUP â€” SupervisÃ£o no padrÃ£o de pesquisa: breadcrumb, largura dos filtros, chips, placeholders e tÃ­tulo',
      metaPadraoPesquisa('supervisao', 'SUP'),
      async ({ page }) => {
        await verificarPadraoPesquisa(page, {
          itemMenu: 'ConferÃªncia manual: supervisÃ£o',
          titulo: 'ConferÃªncia manual: supervisÃ£o',
          pesquisar: async (p) => {
          await pesquisarPool(p);
          return pool(p).linhas().count();
        },
        });
      },
    );
  });
});

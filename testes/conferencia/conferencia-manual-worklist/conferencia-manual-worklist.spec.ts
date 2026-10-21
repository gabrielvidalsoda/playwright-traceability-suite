import type { APIRequestContext, Page } from '@playwright/test';
import { abrirItemMenu } from '../../../paginas/conferencia/menu';
import { botao, ci, exportar, limpar, MSG, pesquisar, Tabela, tituloH1 } from '../../../paginas/conferencia/Traceability Suite';
import {
  abrir,
  confirmarTarefaFechada,
  expect,
  metaConf,
  observar,
  semMassa,
  tarefas,
  test,
  metaPadraoPesquisa,
  verificarPadraoPesquisa,
  VIEWPORT_PADRAO_PESQUISA,
} from '../apoio-conferencia';

/**
 * ConferÃªncia â†’ ConferÃªncia Manual: Worklist â€” script C1 (VisualizaÃ§Ã£o) de 08-10-2026,
 * S6 (Worklist) e S7 (ExecuÃ§Ã£o de tarefa, que no breadcrumb fica sob a Worklist).
 *
 * Cuidados de escrita (cÃ³digo em `ccmsns-ui` `pages/conferencia/execucao`):
 *   - abrir a execuÃ§Ã£o de uma tarefa **DisponÃ­vel** faz `POST /iniciar` â†’ sÃ³ se abrem
 *     tarefas **Fechadas**, confirmadas pela API antes de navegar;
 *   - o autosave (`PUT /progresso`) dispara ao alterar campos â†’ nenhum campo Ã© editado,
 *     e nunca se usam Ctrl+S / Ctrl+Enter;
 *   - nunca Â«Pegar / Continuar tarefaÂ», Â«Voltar para a filaÂ», Â«SuspenderÂ», Â«Concluirâ€¦Â».
 */

const ITEM = 'worklist' as const;
const ROTA = '/conferencia/worklist';
const COLUNAS_WL = ['Prioridade', 'Ãrea de prestaÃ§Ã£o', 'Tipo de tarefa', 'Processo', 'PrestaÃ§Ã£o', 'Factura', 'Nome do Prestador', 'Criada', 'Prazo', 'Estado'];

const grelha = (page: Page) => Tabela.comColuna(page, 'Tipo de tarefa');
const campo = (page: Page, rotulo: string) => page.getByRole('textbox', { name: rotulo, exact: true });

async function abrirWorklist(page: Page): Promise<void> {
  await abrir(page, ROTA);
  await expect(tituloH1(page)).toHaveText(ci('ConferÃªncia manual: worklist'), { timeout: 30_000 });
}
async function pesquisarWorklist(page: Page): Promise<void> {
  const resp = page.waitForResponse((r) => /\/conferencia-manual\/tarefas\?.*estado=SUSPENSA/.test(r.url()));
  await pesquisar(page).click();
  await resp;
  await grelha(page).esperar();
}

/** Uma tarefa Fechada da Ã¡rea, confirmada como FECHADA (abrir a execuÃ§Ã£o nÃ£o grava). */
async function tarefaFechada(request: APIRequestContext, area: 'MED' | 'MCDT' | 'CRD'): Promise<number | undefined> {
  const r = await tarefas(request, { estado: 'FECHADA', area }, 1);
  const id = r.dados[0]?.id;
  if (id !== undefined) await confirmarTarefaFechada(request, id);
  return id;
}
async function abrirExecucao(page: Page, id: number): Promise<void> {
  await abrir(page, `/conferencia/tarefas/${id}/execucao`);
  await expect(page.getByText('A carregar...')).toHaveCount(0, { timeout: 60_000 });
  await expect(tituloH1(page)).toBeVisible({ timeout: 30_000 });
}

test.describe('ConferÃªncia â†’ ConferÃªncia Manual: Worklist', () => {
  // ---------------------------------------------------------------------------------
  test.describe('Worklist', () => {
    test('CT-CONF-WL-01 â€” Abrir a Worklist: contadores e grelha antes de pesquisar', metaConf(ITEM, 'CT-CONF-WL-01', ['RF-41']), async ({ page }) => {
      await abrir(page, '/');
      await abrirItemMenu(page, 'ConferÃªncia manual: worklist');
      await expect(tituloH1(page)).toHaveText(ci('ConferÃªncia manual: worklist'));
      await expect(page.getByText(/^\d+ em execuÃ§Ã£o Â· \d+ na minha fila pessoal Â· \d+ suspensas$/)).toBeVisible({ timeout: 30_000 });
      await expect.soft(page.getByRole('heading', { name: 'Tarefas suspensas' })).toBeVisible();
      await grelha(page).esperar();
      expect(await grelha(page).textoVazio()).toBe(MSG.antesPesquisa);
    });

    test('CT-CONF-WL-02 â€” Pesquisar devolve sÃ³ as suspensas do prÃ³prio utilizador', metaConf(ITEM, 'CT-CONF-WL-02', ['RF-41']), async ({ page }) => {
      await abrirWorklist(page);
      const pedido = page.waitForRequest((r) => /\/conferencia-manual\/tarefas\?/.test(r.url()) && /estado=SUSPENSA/.test(r.url()) && /suspensaPor=/.test(r.url()));
      await pesquisarWorklist(page);
      const url = new URL((await pedido).url());
      expect.soft(url.searchParams.get('suspensaPor'), 'suspensaPor = utilizador atual').toBe((process.env.E2E_UTILIZADOR ?? 'qa.e2e').slice(0, 20));
      expect.soft(await grelha(page).colunas()).toEqual(COLUNAS_WL);
      const n = await grelha(page).linhas().count();
      if (n === 0) expect.soft(await grelha(page).textoVazio()).toBe(MSG.semResultados);
      for (const e of await grelha(page).valoresColuna('Estado')) expect.soft(e, 'sÃ³ suspensas').toMatch(/Suspensa/i);
    });

    test('CT-CONF-WL-03 â€” Filtros: sÃ³ dÃ­gitos em Processo/PrestaÃ§Ã£o, Factura Â«contÃ©mÂ», Enter e Limpar', metaConf(ITEM, 'CT-CONF-WL-03', ['TR']), async ({ page }) => {
      await abrirWorklist(page);
      await campo(page, 'NÃºmero do processo').pressSequentially('ab1c2');
      await campo(page, 'NÃºmero da prestaÃ§Ã£o').pressSequentially('x3y4');
      await expect.soft(campo(page, 'NÃºmero do processo')).toHaveValue('12');
      await expect.soft(campo(page, 'NÃºmero da prestaÃ§Ã£o')).toHaveValue('34');
      await campo(page, 'NÃºmero do processo').fill('');
      await campo(page, 'NÃºmero da prestaÃ§Ã£o').fill('');
      await campo(page, 'NÃºmero da factura').fill('12');
      let enterPesquisou = false;
      const ouvir = (r: { url(): string }) => {
        if (/\/conferencia-manual\/tarefas\?.*estado=SUSPENSA/.test(r.url()) && /numeroFatura=12/.test(r.url())) enterPesquisou = true;
      };
      page.on('request', ouvir);
      await campo(page, 'NÃºmero da factura').press('Enter');
      await page.waitForTimeout(1_500);
      page.off('request', ouvir);
      observar(`Enter no filtro ${enterPesquisou ? 'pesquisa' : 'nÃ£o pesquisa (sÃ³ o botÃ£o)'}`);
      const pedido = page.waitForRequest((r) => /\/conferencia-manual\/tarefas\?.*numeroFatura=12/.test(r.url()));
      await pesquisarWorklist(page);
      await pedido;
      for (const f of await grelha(page).valoresColuna('Factura')) expect.soft(f, 'factura contÃ©m Â«12Â»').toContain('12');
      await limpar(page).click();
      for (const r of ['NÃºmero do processo', 'NÃºmero da prestaÃ§Ã£o', 'NÃºmero da factura']) await expect.soft(campo(page, r), r).toHaveValue('');
    });

    test('CT-CONF-WL-08 â€” Drawer da tarefa: secÃ§Ãµes IdentificaÃ§Ã£o, Origem, Erros e Notas', metaConf(ITEM, 'CT-CONF-WL-08', ['RF-41']), async ({ page }) => {
      await abrirWorklist(page);
      await pesquisarWorklist(page);
      let origem = 'Worklist';
      if ((await grelha(page).linhas().count()) === 0) {
        // Sem suspensas do utilizador da automaÃ§Ã£o: o script admite o drawer da SupervisÃ£o.
        origem = 'SupervisÃ£o';
        await abrir(page, '/conferencia/supervisao');
        await expect(tituloH1(page)).toHaveText(ci('ConferÃªncia manual: supervisÃ£o'), { timeout: 30_000 });
        await pesquisar(page).click();
        const pool = Tabela.comColuna(page, 'CÃ³digo do Prestador');
        await pool.esperar();
        semMassa((await pool.linhas().count()) === 0, 'sem tarefas suspensas nem tarefas DisponÃ­veis na pool (â›” repetir na C3)');
        await pool.acaoNaLinha(0, 'Ver detalhe').click();
      } else {
        await grelha(page).acaoNaLinha(0, 'Ver detalhe').click();
      }
      const drawer = page.locator('.MuiDrawer-paper');
      await expect(drawer).toBeVisible();
      await expect.soft(drawer.getByRole('heading', { level: 3, name: 'IdentificaÃ§Ã£o' })).toBeVisible();
      await expect.soft(drawer.getByRole('heading', { level: 3, name: origem === 'Worklist' ? 'Origem' : 'Operador e origem' })).toBeVisible();
      if (origem === 'Worklist') await expect.soft(drawer.getByRole('heading', { level: 3, name: /^Notas \(\d+\)$/ })).toBeVisible();
      const erros = drawer.getByRole('heading', { level: 3, name: 'Erros detectados pelo motor' });
      if (await erros.count()) {
        const linhas = await erros.locator('xpath=following-sibling::*[1]').innerText();
        expect.soft(linhas, 'erros no formato Â«CODIGO â€” descriÃ§Ã£oÂ»').toMatch(/\S+ â€” \S/);
      }
      observar(`Drawer aberto a partir da ${origem}; botÃµes: ${(await drawer.getByRole('button').allInnerTexts()).filter(Boolean).join(', ')}`);
      await drawer.getByRole('button', { name: 'Fechar' }).click();
    });

    test('CT-CONF-WL-12 â€” Exportar a grelha; desativado antes de pesquisar e sem resultados', metaConf(ITEM, 'CT-CONF-WL-12', ['TR']), async ({ page }) => {
      await abrirWorklist(page);
      await grelha(page).esperar();
      const exp = grelha(page).botaoExportar();
      const antes = await exp.isDisabled();
      if (!antes) {
        await exp.click();
        await expect.soft(page.getByText(MSG.exportarSemResultados)).toBeVisible();
        observar(`Antes de pesquisar Â«Exportar XLSXÂ» estÃ¡ ativo e mostra Â«${MSG.exportarSemResultados}Â»`);
      }
      expect.soft(antes, 'Exportar desativado antes de pesquisar').toBe(true);
      await pesquisarWorklist(page);
      if ((await grelha(page).linhas().count()) > 0) {
        expect(await exportar(page, exp)).toBe('tarefas-suspensas.xlsx');
      } else {
        expect.soft(await exp.isDisabled(), 'Exportar desativado sem resultados').toBe(true);
        observar('Sem tarefas suspensas do utilizador: a exportaÃ§Ã£o com linhas nÃ£o foi exercitada.');
      }
    });
  });

  // ---------------------------------------------------------------------------------
  test.describe('ExecuÃ§Ã£o de tarefa', () => {
    test('CT-CONF-EXE-02 â€” Imagem lado a lado numa tarefa Fechada de MED (sem editar)', metaConf(ITEM, 'CT-CONF-EXE-02', ['RF-42']), async ({ page, request }) => {
      const id = await tarefaFechada(request, 'MED');
      semMassa(id === undefined, 'nenhuma tarefa Fechada de Medicamentos');
      await abrirExecucao(page, id!);
      for (const separador of ['PrescriÃ§Ã£o / PrestaÃ§Ã£o', 'Capa de Lote']) {
        const tab = page.getByRole('tab', { name: separador });
        await expect.soft(tab, separador).toBeVisible();
        if (await tab.count()) await tab.click();
      }
      const semDoc = page.getByText('Documento nÃ£o disponÃ­vel.').first();
      const img = page.locator('img[src*="/documentos/"]').first();
      await expect(img.or(semDoc)).toBeVisible({ timeout: 30_000 });
      await botao(page, 'Imagem').click();
      const visualizador = page.getByRole('dialog');
      await expect(visualizador).toBeVisible();
      observar(`Tarefa ${id}: ${(await img.isVisible()) ? 'imagem do documento visÃ­vel' : 'Â«Documento nÃ£o disponÃ­vel.Â»'}`);
      await visualizador.getByRole('button', { name: 'Fechar visualizador de documento' }).click();
      await expect(visualizador).toBeHidden();
    });

    for (const [area, rotulo] of [['MCDT', 'MCDT'], ['CRD', 'CRD']] as const) {
      test(`CT-CONF-EXE-03 â€” Imagem e dados numa tarefa Fechada de ${rotulo}`, metaConf(ITEM, 'CT-CONF-EXE-03', ['RF-42', 'Q-45']), async ({ page, request }) => {
        const id = await tarefaFechada(request, area);
        semMassa(id === undefined, `nenhuma tarefa Fechada de ${rotulo}`);
        await abrirExecucao(page, id!);
        const semDoc = await page.getByText('Documento nÃ£o disponÃ­vel.').count();
        observar(`Q-45 â€” ${rotulo}, tarefa ${id}: ${semDoc ? 'Â«Documento nÃ£o disponÃ­vel.Â»' : 'documento apresentado'}`);
        expect.soft(semDoc, `${rotulo}: imagem do documento lado a lado (requisito)`).toBe(0);
      });
    }

    test('CT-CONF-EXE-25 â€” HistÃ³rico da prestaÃ§Ã£o (tecla H, Â«SÃ³ notasÂ», Esc)', metaConf(ITEM, 'CT-CONF-EXE-25', ['RF-52']), async ({ page, request }) => {
      const id = await tarefaFechada(request, 'MED');
      semMassa(id === undefined, 'nenhuma tarefa Fechada de Medicamentos');
      await abrirExecucao(page, id!);
      const verHistorico = botao(page, 'Ver histÃ³rico');
      semMassa(!(await verHistorico.isVisible({ timeout: 10_000 }).catch(() => false)), `prestaÃ§Ã£o da tarefa ${id} sem histÃ³rico (o bloco nÃ£o aparece)`);
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await page.keyboard.press('h');
      const drawer = page.locator('.MuiDrawer-paper').filter({ has: page.getByRole('heading', { name: /^HistÃ³rico Â· PrestaÃ§Ã£o / }) });
      await expect(drawer).toBeVisible();
      const so = drawer.getByRole('checkbox', { name: 'SÃ³ notas' });
      await expect.soft(so).toBeVisible();
      await so.check();
      await page.keyboard.press('Escape');
      await expect(drawer).toBeHidden();
    });

    test('CT-CONF-EXE-28 â€” Tarefa jÃ¡ fechada abre sÃ³ de leitura', metaConf(ITEM, 'CT-CONF-EXE-28', ['RF-44']), async ({ page, request }) => {
      const id = await tarefaFechada(request, 'MED');
      semMassa(id === undefined, 'nenhuma tarefa Fechada de Medicamentos');
      await abrirExecucao(page, id!);
      const acoes = ['Concluir e voltar', 'Concluir e prÃ³xima', 'Suspender', 'Escalar ao supervisor'];
      const ativos: string[] = [];
      for (const a of acoes) {
        const b = botao(page, a);
        if ((await b.count()) && (await b.first().isEnabled())) ativos.push(a);
      }
      const notas = page.getByRole('textbox', { name: 'Notas da execuÃ§Ã£o' });
      const notasEditavel = (await notas.count()) > 0 && (await notas.isEditable());
      observar(`Tarefa Fechada ${id}: botÃµes ativos [${ativos.join(', ') || 'nenhum'}]; Â«Notas da execuÃ§Ã£oÂ» ${notasEditavel ? 'editÃ¡vel' : 'sÃ³ leitura'}`);
      expect.soft(ativos, 'nenhuma aÃ§Ã£o ativa numa tarefa fechada').toEqual([]);
      expect.soft(notasEditavel, 'campos sÃ³ de leitura').toBe(false);
    });

    test('CT-CONF-EXE-29 â€” Ids invÃ¡lidos', metaConf(ITEM, 'CT-CONF-EXE-29', ['Â§5 PRD'], { tipo: 'negativo' }), async ({ page }) => {
      await test.step('abc', async () => {
        await abrir(page, '/conferencia/tarefas/abc/execucao');
        await expect(page.getByText('Identificador de tarefa invÃ¡lido.', { exact: true })).toBeVisible({ timeout: 30_000 });
        if (!(await botao(page, 'Voltar').count())) observar('Id Â«abcÂ»: sem botÃ£o Â«VoltarÂ».');
      });
      await test.step('999999999', async () => {
        await abrir(page, '/conferencia/tarefas/999999999/execucao');
        await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 60_000 });
        await expect.soft(botao(page, 'Voltar')).toBeVisible();
        observar(`Id 999999999: Â«${(await page.getByRole('alert').first().innerText()).trim()}Â»`);
      });
    });
  });

  // ---------------------------------------------------------------------------------
  // PadrÃ£o de pesquisa da ConferÃªncia (TASK-20260928-08, #1568): os 5 pontos da tarefa.
  test.describe('PadrÃ£o de pesquisa', () => {
    test.use({ viewport: VIEWPORT_PADRAO_PESQUISA });

    test(
      'CT-REG-TASK-20260928-08-WL â€” Worklist no padrÃ£o de pesquisa: breadcrumb, largura dos filtros, chips, placeholders e tÃ­tulo',
      metaPadraoPesquisa('worklist', 'WL'),
      async ({ page }) => {
        await verificarPadraoPesquisa(page, {
          itemMenu: 'ConferÃªncia manual: worklist',
          titulo: 'ConferÃªncia manual: worklist',
          pesquisar: async (p) => {
          await pesquisarWorklist(p);
          return grelha(p).linhas().count();
        },
        });
      },
    );
  });
});

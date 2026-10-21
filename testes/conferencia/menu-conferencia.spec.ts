import { botao, combobox, escolherOpcao, MSG, opcoesDe, pesquisar, Tabela, trilho, trilhoBreadcrumb } from '../../paginas/conferencia/Traceability Suite';
import { expandirConferencia, ITENS_MENU_CONFERENCIA, itemMenu, titulosItens } from '../../paginas/conferencia/menu';
import { logs, regras, workflows } from '../../paginas/conferencia/motorRegras';
import { abrir, confirmarTarefaFechada, expect, metaConf, observar, semMassa, tarefas, test } from './apoio-conferencia';

/**
 * ConferÃªncia â€” verificaÃ§Ãµes prÃ©vias (PRE-01, PRE-02) e S15 (itens Â«(em breve)Â» e
 * navegaÃ§Ã£o) do script C1 (VisualizaÃ§Ã£o) de 08-10-2026. Transversal ao grupo: nÃ£o pertence
 * a nenhum Item, por isso fica ao nÃ­vel de `testes/conferencia/`.
 */

const ITEM = 'menu' as const;

test.describe('ConferÃªncia â†’ Menu e navegaÃ§Ã£o', () => {
  test.describe('VerificaÃ§Ãµes prÃ©vias', () => {
    test('PRE-01 â€” O ambiente usa a API real (sem MSW) e responde 200', metaConf(ITEM, 'PRE-01', ['Q-53']), async ({ page }) => {
      const consola: string[] = [];
      page.on('console', (m) => consola.push(m.text()));
      const resposta = page.waitForResponse((r) => /\/ccmsns\/api\/cockpit\//.test(r.url()), { timeout: 60_000 });
      await abrir(page, '/conferencia/cockpit');
      const r = await resposta;
      expect.soft(r.status(), `${r.url()}`).toBe(200);
      expect.soft(consola.filter((t) => /\[MSW\] Mocking enabled/.test(t)), 'sem mensagem do MSW').toEqual([]);
      const versao = await page.request.get('/version.json').catch(() => undefined);
      observar(
        versao?.ok()
          ? `VersÃ£o publicada: ${(await versao.text()).slice(0, 200)}`
          : 'Sem /version.json no DEV: confirmar a versÃ£o (UI â‰¥ 14d7c2b, `develop` de 09-10-2026) com o Walmir.',
      );
    });

    test('PRE-02 â€” Menu Â«ConferÃªnciaÂ» completo, com os Â«(em breve)Â» desativados', metaConf(ITEM, 'PRE-02', ['Â§2.2 PRD'], { interface: true }), async ({ page }) => {
      await abrir(page, '/');
      const titulos = await titulosItens(page);
      const normalizados = titulos.map((t) => t.replace(/^(AprovaÃ§Ãµes pendentes) \(\d+\)$/i, '$1'));
      // Os itens esperados tÃªm de estar todos, por esta ordem; itens a mais ficam anotados.
      const lista = ITENS_MENU_CONFERENCIA as readonly string[];
      expect(normalizados.filter((t) => lista.includes(t))).toEqual([...lista]);
      const extra = normalizados.filter((t) => !lista.includes(t));
      if (extra.length) observar(`Itens no menu que o script nÃ£o lista: ${extra.join(', ')}`);
      for (const t of ITENS_MENU_CONFERENCIA.filter((x) => x.endsWith('(em breve)'))) {
        const item = itemMenu(page, t);
        await expect.soft(item, `${t}: sem destino`).toHaveAttribute('href', '#');
        await expect.soft(item, `${t}: esbatido`).toHaveCSS('pointer-events', 'none');
      }
    });
  });

  test.describe('Itens Â«(em breve)Â» e navegaÃ§Ã£o', () => {
    for (const [caso, titulo, rf] of [
      ['CT-CONF-MENU-01', 'Facturas conferidas com erro (em breve)', 'RF-26'],
      ['CT-CONF-MENU-02', 'AlarmÃ­stica (em breve)', 'RF-25'],
    ] as const) {
      test(`${caso} â€” Â«${titulo}Â» nÃ£o navega (nÃ£o implementado)`, metaConf(ITEM, caso, [rf, 'Q-50']), async ({ page }) => {
        await abrir(page, '/conferencia/cockpit');
        await expandirConferencia(page);
        const antes = new URL(page.url()).pathname;
        await itemMenu(page, titulo).click({ force: true });
        await page.waitForTimeout(1_000);
        expect(new URL(page.url()).pathname).toBe(antes);
        observar(`${rf} nÃ£o implementado (item Â«em breveÂ») â€” registar como nÃ£o implementado, nÃ£o como defeito.`);
      });
    }

    test('CT-CONF-MENU-03 â€” EcrÃ£s sem item de menu: breadcrumb sob a SupervisÃ£o e a Worklist', metaConf(ITEM, 'CT-CONF-MENU-03', ['Â§2.2 PRD']), async ({ page, request }) => {
      await test.step('AlocaÃ§Ã£o de equipa', async () => {
        await abrir(page, '/conferencia/supervisao');
        await botao(page, 'AlocaÃ§Ã£o de equipa').click();
        await expect(page).toHaveURL(/\/conferencia\/alocacao$/);
        await expect.poll(() => trilhoBreadcrumb(page)).toEqual(trilho('ConferÃªncia', 'ConferÃªncia Manual: SupervisÃ£o', 'AlocaÃ§Ã£o de Equipa'));
      });
      await test.step('Prestadores prioritÃ¡rios', async () => {
        await abrir(page, '/conferencia/supervisao');
        await botao(page, 'Gerir prestadores prioritÃ¡rios').click();
        await expect(page).toHaveURL(/\/conferencia\/prestadores-prioritarios$/);
        await expect.poll(() => trilhoBreadcrumb(page)).toEqual(trilho('ConferÃªncia', 'ConferÃªncia Manual: SupervisÃ£o', 'Prestadores PrioritÃ¡rios'));
      });
      await test.step('ExecuÃ§Ã£o de tarefa (Fechada)', async () => {
        // O script abre a execuÃ§Ã£o pelo Â«Pegar / ContinuarÂ» (grava); aqui usa-se uma tarefa Fechada.
        const fechadas = await tarefas(request, { estado: 'FECHADA' }, 1);
        semMassa(fechadas.dados.length === 0, 'nenhuma tarefa Fechada');
        const id = fechadas.dados[0].id;
        await confirmarTarefaFechada(request, id);
        await abrir(page, `/conferencia/tarefas/${id}/execucao`);
        await expect.poll(() => trilhoBreadcrumb(page), { timeout: 30_000 }).toEqual(trilho('ConferÃªncia', 'ConferÃªncia Manual: Worklist', `Tarefa ${id}`));
      });
    });
  });

  test.describe('Negativos transversais', () => {
    test('CT-CONF-NEG-05 â€” Filtros e resultados repostos ao voltar com o browser', metaConf(ITEM, 'CT-CONF-NEG-05', ['TR'], { tipo: 'robustez' }), async ({ page }) => {
      test.slow();
      const voltarEConfirmar = async (tabela: Tabela, url: RegExp) => {
        await page.goBack({ waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(url);
        await tabela.esperar();
        expect.soft(await tabela.celulaVazia().filter({ hasText: MSG.antesPesquisa }).count(), 'resultados repostos').toBe(0);
      };
      await test.step('SupervisÃ£o (Estado = Suspensa â†’ AlocaÃ§Ã£o â†’ voltar)', async () => {
        await abrir(page, '/conferencia/supervisao');
        await escolherOpcao(page, 'Estado', 'Suspensa');
        await pesquisar(page).click();
        const pool = Tabela.comColuna(page, 'CÃ³digo do Prestador');
        await pool.esperar();
        await botao(page, 'AlocaÃ§Ã£o de equipa').click();
        await expect(page).toHaveURL(/\/conferencia\/alocacao$/);
        await voltarEConfirmar(pool, /\/conferencia\/supervisao\?.*estado=SUSPENSA/);
        await expect.soft(combobox(page, 'Estado')).toContainText('Suspensa');
      });
      for (const [nome, lista] of [
        ['Workflows', workflows(page)],
        ['Regras', regras(page)],
      ] as const) {
        await test.step(`${nome} (AcrÃ³nimo = MED â†’ detalhe â†’ voltar)`, async () => {
          await lista.abrir();
          await page.getByRole('textbox', { name: 'AcrÃ³nimo' }).fill('MED');
          await lista.pesquisar();
          if ((await lista.tabela().linhas().count()) === 0) return observar(`${nome}: sem resultados para Â«MEDÂ»`);
          await lista.abrirPrimeiroDetalhe();
          await voltarEConfirmar(lista.tabela(), /[?&]acronimo=MED/);
          await expect.soft(page.getByRole('textbox', { name: 'AcrÃ³nimo' })).toHaveValue('MED');
        });
      }
      await test.step('Logs (Ãrea = Medicamentos â†’ detalhe â†’ voltar)', async () => {
        const lista = logs(page);
        await lista.abrir();
        const area = (await opcoesDe(page, 'Ãrea de ConferÃªncia')).find((o) => /Medicamentos/i.test(o))!;
        await escolherOpcao(page, 'Ãrea de ConferÃªncia', area);
        await lista.pesquisar();
        if ((await lista.tabela().linhas().count()) === 0) return observar('Logs: sem execuÃ§Ãµes de Medicamentos');
        await lista.abrirPrimeiroDetalhe();
        await voltarEConfirmar(lista.tabela(), /\/motor-regras\/execucoes\?.*area=/);
        await expect.soft(combobox(page, 'Ãrea de ConferÃªncia')).toContainText(area);
      });
    });
  });
});

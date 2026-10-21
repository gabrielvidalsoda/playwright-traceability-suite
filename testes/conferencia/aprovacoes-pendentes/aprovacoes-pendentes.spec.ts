import type { Page } from '@playwright/test';
import { expandirConferencia, itemMenu } from '../../../paginas/conferencia/menu';
import { aprovacoes } from '../../../paginas/conferencia/motorRegras';
import { botao, combobox, escolherOpcao, limpar, tituloH1 } from '../../../paginas/conferencia/Traceability Suite';
import {
  abrir,
  expect,
  metaConf,
  obterJson,
  observar,
  semMassa,
  test,
  metaPadraoPesquisa,
  verificarPadraoPesquisa,
  VIEWPORT_PADRAO_PESQUISA,
} from '../apoio-conferencia';

/**
 * ConferÃªncia â†’ AprovaÃ§Ãµes Pendentes (`/motor-regras/aprovacoes`) â€” script C1
 * (VisualizaÃ§Ã£o) de 08-10-2026, S13. SÃ³ leitura: os pedidos pendentes sÃ£o da base de testes
 * do Walmir â€” nunca Â«AprovarÂ», Â«RejeitarÂ», Â«Cancelar pedidoÂ», Â«ReagendarÂ», Â«ReprovarÂ» nem
 * Â«ForÃ§ar vigÃªncia agoraÂ».
 */

const ITEM = 'aprovacoes' as const;
const COLUNAS = ['ID', 'Tipo', 'OperaÃ§Ã£o', 'Entidade', 'Ãrea', 'AlteraÃ§Ã£o', 'Solicitante', 'Solicitado em', 'Decidido por', 'Decidido em', 'Estado'];
const BOTOES_DECISAO = ['Aprovar', 'Rejeitar', 'Cancelar pedido', 'Reagendar', 'Reprovar', 'ForÃ§ar vigÃªncia agora'];

const cartao = (page: Page, nome: 'Pendentes' | 'Agendados') => page.getByRole('button', { name: new RegExp(`^${nome}\\s*\\d+`) });

test.describe('ConferÃªncia â†’ AprovaÃ§Ãµes Pendentes', () => {
  test.describe('Pesquisa', () => {
    test('CT-CONF-APR-01 â€” Contador do menu = cartÃ£o Â«PendentesÂ»', metaConf(ITEM, 'CT-CONF-APR-01', ['RF-35']), async ({ page, request }) => {
      const lista = aprovacoes(page);
      await lista.abrir();
      const { PENDENTE = 0 } = await obterJson<Record<string, number>>(request, '/motor-regras/aprovacoes/contadores');
      await expandirConferencia(page);
      const menu = (await itemMenu(page, /aprovaÃ§Ãµes pendentes/i).innerText()).trim().toLowerCase();
      expect.soft(menu).toBe(PENDENTE > 0 ? `aprovaÃ§Ãµes pendentes (${PENDENTE})` : 'aprovaÃ§Ãµes pendentes');
      const n = Number((await cartao(page, 'Pendentes').innerText()).match(/\d+/)?.[0]);
      expect.soft(n, 'cartÃ£o Â«PendentesÂ»').toBe(PENDENTE);
    });

    test('CT-CONF-APR-02 â€” Lista e filtros: Estado Â«PendenteÂ», cartÃ£o Â«AgendadosÂ», Limpar, Estado vazio', metaConf(ITEM, 'CT-CONF-APR-02', ['RF-35']), async ({ page }) => {
      const lista = aprovacoes(page);
      await lista.abrir();
      const t = lista.tabela();
      await expect(combobox(page, 'Estado')).toContainText('Pendente');
      await test.step('CartÃ£o Â«AgendadosÂ»', async () => {
        const resp = page.waitForResponse((r) => lista.api.test(r.url()) && /estado=AGENDADO/.test(r.url()));
        await cartao(page, 'Agendados').click();
        await resp;
        await t.esperar();
        await expect.soft(combobox(page, 'Estado')).toContainText('Agendado');
        for (const e of await t.valoresColuna('Estado')) expect.soft(e).toBe('Agendado');
      });
      await test.step('Limpar repÃµe Â«PendenteÂ»', async () => {
        await limpar(page).click();
        await expect(combobox(page, 'Estado')).toContainText('Pendente');
      });
      await test.step('Estado vazio mostra todos', async () => {
        await escolherOpcao(page, 'Estado', /^Selec/);
        await lista.pesquisar();
        expect.soft(await t.colunas()).toEqual(COLUNAS);
        const estados = new Set(await t.valoresColuna('Estado'));
        observar(`Estado vazio â€” estados na 1.Âª pÃ¡gina: ${[...estados].join(', ')}`);
      });
    });
  });

  test.describe('Detalhe', () => {
    test('CT-CONF-APR-03 â€” Detalhe de um pedido pendente (sem decidir)', metaConf(ITEM, 'CT-CONF-APR-03', ['RF-35']), async ({ page }) => {
      const lista = aprovacoes(page);
      await lista.abrir();
      await lista.pesquisar();
      semMassa((await lista.tabela().linhas().count()) === 0, 'nenhum pedido pendente');
      await lista.abrirPrimeiroDetalhe('Ver pedido');
      await expect(tituloH1(page)).toHaveText(/^Pedido #\d+( â€” .+)?$/);
      for (const c of ['Tipo', 'OperaÃ§Ã£o', 'Solicitante', 'JustificaÃ§Ã£o']) await expect.soft(page.getByText(c, { exact: true }).first(), c).toBeVisible();
      await expect.soft(page.getByText('AlteraÃ§Ã£o proposta', { exact: true })).toBeVisible();
      const semAlteracoes = await page.getByText('Sem alteraÃ§Ãµes a apresentar.').count();
      if (!semAlteracoes) {
        for (const c of ['Campo', 'Antes', 'Depois']) await expect.soft(page.locator(`th[abbr="${c}"]`).first(), c).toBeVisible();
      }
      await expect.soft(page.getByText('DecisÃ£o', { exact: true }).first(), 'painel Â«DecisÃ£oÂ»').toBeVisible();
      for (const b of ['Aprovar', 'Rejeitar', 'Cancelar pedido']) await expect.soft(botao(page, b), `botÃ£o ${b} presente (nÃ£o clicado)`).toBeVisible();
    });

    test('CT-CONF-APR-10 â€” Pedidos terminais (Aprovado, Rejeitado, Cancelado) sÃ³ de leitura', metaConf(ITEM, 'CT-CONF-APR-10', ['RF-35']), async ({ page }) => {
      const lista = aprovacoes(page);
      const vistos: string[] = [];
      for (const estado of ['Aprovado', 'Rejeitado', 'Cancelado']) {
        await test.step(estado, async () => {
          await lista.abrir();
          await escolherOpcao(page, 'Estado', estado);
          await lista.pesquisar();
          if ((await lista.tabela().linhas().count()) === 0) {
            vistos.push(`${estado}: sem pedidos`);
            return;
          }
          await lista.abrirPrimeiroDetalhe('Ver pedido');
          for (const c of ['Decidido por', 'Decidido em', 'Aplicado em', 'ObservaÃ§Ã£o']) {
            await expect.soft(page.getByText(c, { exact: true }).first(), `${estado}: ${c}`).toBeVisible();
          }
          for (const b of BOTOES_DECISAO) await expect.soft(botao(page, b), `${estado}: sem Â«${b}Â»`).toHaveCount(0);
          vistos.push(`${estado}: ${(await tituloH1(page).innerText()).trim()}`);
        });
      }
      observar(vistos.join(' | '));
      semMassa(vistos.every((v) => v.endsWith('sem pedidos')), 'nenhum pedido Aprovado/Rejeitado/Cancelado');
    });

    test('CT-CONF-APR-13 â€” Ids invÃ¡lidos', metaConf(ITEM, 'CT-CONF-APR-13', ['Â§5 PRD'], { tipo: 'negativo' }), async ({ page }) => {
      await abrir(page, '/motor-regras/aprovacoes/abc');
      await expect(page.getByText('Pedido invÃ¡lido.', { exact: true })).toBeVisible({ timeout: 30_000 });
      await abrir(page, '/motor-regras/aprovacoes/999999');
      const msg = page.getByText(/^(Pedido nÃ£o encontrado\.|NÃ£o foi possÃ­vel carregar o pedido\.)$/);
      await expect(msg.first()).toBeVisible({ timeout: 60_000 });
      const texto = (await msg.first().innerText()).trim();
      observar(`Id 999999: Â«${texto}Â»`);
      expect.soft(texto).toBe('Pedido nÃ£o encontrado.');
    });
  });

  // ---------------------------------------------------------------------------------
  // PadrÃ£o de pesquisa da ConferÃªncia (TASK-20260928-08, #1568). Variante informativa (pendÃªncia
  // P5): corre, mas nÃ£o conta para o veredicto da tarefa.
  test.describe('PadrÃ£o de pesquisa', () => {
    test.use({ viewport: VIEWPORT_PADRAO_PESQUISA });

    test(
      'CT-REG-TASK-20260928-08-APR â€” AprovaÃ§Ãµes Pendentes no padrÃ£o de pesquisa: breadcrumb, largura dos filtros, chips, placeholders e tÃ­tulo (informativo, P5)',
      metaPadraoPesquisa('aprovacoes', 'APR', { informativo: true }),
      async ({ page }) => {
        await verificarPadraoPesquisa(page, {
          itemMenu: /aprovaÃ§Ãµes pendentes/i,
          titulo: 'AprovaÃ§Ãµes Pendentes',
          pesquisar: async (p) => {
          await aprovacoes(p).pesquisar();
          return aprovacoes(p).tabela().linhas().count();
        },
        });
      },
    );
  });
});

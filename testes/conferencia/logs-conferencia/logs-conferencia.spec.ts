import type { Page } from '@playwright/test';
import { PaginaDetalheArea } from '../../../paginas/conferencia/cockpit';
import { abrirItemMenu } from '../../../paginas/conferencia/menu';
import { logs } from '../../../paginas/conferencia/motorRegras';
import { botao, escolherOpcao, exportar, opcoesDe, pesquisar, Tabela, tituloH1, valorCampo } from '../../../paginas/conferencia/Traceability Suite';
import {
  abrir,
  expect,
  massaCiclos,
  metaConf,
  observar,
  semMassa,
  test,
  metaPadraoPesquisa,
  verificarPadraoPesquisa,
  VIEWPORT_PADRAO_PESQUISA,
} from '../apoio-conferencia';

/**
 * ConferÃªncia â†’ Logs de ConferÃªncia (`/motor-regras/execucoes`) â€” script C1 (VisualizaÃ§Ã£o)
 * de 08-10-2026, S14. EcrÃ£ sÃ³ de leitura (nÃ£o hÃ¡ aÃ§Ãµes de escrita).
 */

const ITEM = 'logs' as const;
const AREA = 'Ãrea de ConferÃªncia';

async function opcaoArea(page: Page, re: RegExp): Promise<string> {
  const opcao = (await opcoesDe(page, AREA)).find((o) => re.test(o));
  expect(opcao, `opÃ§Ã£o de Ã¡rea ${re}`).toBeDefined();
  return opcao!;
}
async function pesquisarArea(page: Page, re: RegExp): Promise<void> {
  await escolherOpcao(page, AREA, await opcaoArea(page, re));
  await logs(page).pesquisar();
}
const campoNegocio = (page: Page, rotulo: string) => page.getByLabel(rotulo, { exact: true }).first();

test.describe('ConferÃªncia â†’ Logs de ConferÃªncia', () => {
  test.describe('Pesquisa', () => {
    test('CT-CONF-LOG-01 â€” Ãrea obrigatÃ³ria', metaConf(ITEM, 'CT-CONF-LOG-01', ['RF-37'], { tipo: 'negativo' }), async ({ page }) => {
      await abrir(page, '/');
      await abrirItemMenu(page, 'Logs de ConferÃªncia');
      await expect(tituloH1(page)).toHaveText('Logs de ConferÃªncia');
      let pediu = false;
      page.on('request', (r) => {
        if (/\/motor-regras\/execucoes\?/.test(r.url())) pediu = true;
      });
      await pesquisar(page).click();
      await expect(page.getByText('Seleccione a Ã¡rea de conferÃªncia.', { exact: true })).toBeVisible();
      await page.waitForTimeout(1_000);
      expect(pediu, 'sem pedido ao servidor').toBe(false);
    });

    test('CT-CONF-LOG-02 â€” Filtros de negÃ³cio por Ã¡rea', metaConf(ITEM, 'CT-CONF-LOG-02', ['RF-37']), async ({ page }) => {
      const lista = logs(page);
      await lista.abrir();
      const casos: [RegExp, Record<string, boolean>][] = [
        [/Medicamentos/i, { 'NÂº da Factura': true, 'NIF ou Nome do Prestador': true, 'NÂº do Lote': true, 'NÂº da Receita': true }],
        [/MCDT/i, { 'NÂº da Factura': true, 'NÂº do Lote': false, 'NÂº da RequisiÃ§Ã£o': true }],
        [/CRD|Respirat/i, { 'NÂº da Factura': true, 'NÂº do Lote': true, 'NÂº da PrescriÃ§Ã£o': true }],
      ];
      for (const [re, campos] of casos) {
        await test.step(`${re}`, async () => {
          await escolherOpcao(page, AREA, await opcaoArea(page, re));
          for (const [rotulo, ativo] of Object.entries(campos)) {
            const c = campoNegocio(page, rotulo);
            await expect.soft(c, `${rotulo} visÃ­vel`).toBeVisible();
            if (ativo) await expect.soft(c, `${rotulo} ativo`).toBeEnabled();
            else await expect.soft(c, `${rotulo} desativado`).toBeDisabled();
          }
        });
      }
      await test.step('Outra Ã¡rea (ex.: Termas)', async () => {
        const outra = (await opcoesDe(page, AREA)).find((o) => !/^Selec|Medicamentos|MCDT|CRD|Respirat/i.test(o));
        semMassa(!outra, 'sÃ³ existem as Ã¡reas MED/MCDT/CRD no catÃ¡logo');
        await escolherOpcao(page, AREA, outra!);
        await expect.soft(page.getByText('Seleccione a Ãrea (Medicamentos, MCDT ou CRD) para usar estes filtros.')).toBeVisible();
        for (const r of ['NÂº da Factura', 'NIF ou Nome do Prestador', 'NÂº do Lote']) await expect.soft(campoNegocio(page, r), `${r} desativado`).toBeDisabled();
      });
    });

    test('CT-CONF-LOG-03 â€” Pesquisa pela cadeia: factura + Â«Acusou erroÂ» = Sim; ordem por omissÃ£o', metaConf(ITEM, 'CT-CONF-LOG-03', ['RF-37']), async ({ page }) => {
      const lista = logs(page);
      await lista.abrir();
      await pesquisarArea(page, /Medicamentos/i);
      const t = lista.tabela();
      const execucoes = (await t.valoresColuna('ExecuÃ§Ã£o')).map((e) => Number(e.replace(/\D/g, '')));
      semMassa(execucoes.length === 0, 'sem execuÃ§Ãµes de Medicamentos');
      expect.soft(execucoes, 'mais recente primeiro (execuÃ§Ã£o desc)').toEqual([...execucoes].sort((a, b) => b - a));
      const factura = (await t.valoresColuna('NÂº da Factura')).find((f) => f && f !== 'â€”');
      semMassa(!factura, 'execuÃ§Ãµes sem NÂº da Factura');
      await campoNegocio(page, 'NÂº da Factura').fill(factura!);
      await lista.pesquisar();
      for (const f of await t.valoresColuna('NÂº da Factura')) expect.soft(f, 'sÃ³ essa factura').toBe(factura);
      await escolherOpcao(page, 'Acusou erro', 'Sim');
      await lista.pesquisar();
      for (const v of await t.valoresColuna('Acusou erro')) expect.soft(v, 'Acusou erro = Sim').toBe('Sim');
      for (const f of await t.valoresColuna('NÂº da Factura')) expect.soft(f, 'filtros cumulativos').toBe(factura);
      observar(`Factura ${factura}: o filtro por cÃ³digo de erro nÃ£o foi automatizado (o cÃ³digo nÃ£o aparece na lista)`);
    });

    test('CT-CONF-LOG-04 â€” Data (de) posterior Ã  data (atÃ©)', metaConf(ITEM, 'CT-CONF-LOG-04', ['TR'], { tipo: 'negativo' }), async ({ page }) => {
      const lista = logs(page);
      await lista.abrir();
      await escolherOpcao(page, AREA, await opcaoArea(page, /Medicamentos/i));
      await page.getByLabel('Data de processamento (de)').first().pressSequentially('10/10/2026');
      await page.getByLabel('Data de processamento (atÃ©)').first().pressSequentially('01/10/2026');
      await pesquisar(page).click();
      await page.waitForTimeout(2_000);
      const alertas = (await page.getByRole('alert').allInnerTexts()).map((a) => a.trim()).filter(Boolean);
      const t = lista.tabela();
      await t.esperar();
      const n = await t.linhas().count();
      observar(`De 10/10/2026 atÃ© 01/10/2026: ${alertas.length ? `validaÃ§Ã£o Â«${alertas.join(' / ')}Â»` : 'sem validaÃ§Ã£o'}; ${n} linhas`);
      expect.soft(alertas.length, 'esperada validaÃ§Ã£o de intervalo').toBeGreaterThan(0);
    });

    test('CT-CONF-LOG-05 â€” Lote nÃ£o numÃ©rico: nenhum resultado, sem erro', metaConf(ITEM, 'CT-CONF-LOG-05', ['RF-37'], { tipo: 'negativo' }), async ({ page }) => {
      const lista = logs(page);
      await lista.abrir();
      await escolherOpcao(page, AREA, await opcaoArea(page, /Medicamentos/i));
      await campoNegocio(page, 'NÂº do Lote').fill('abc');
      const valor = await campoNegocio(page, 'NÂº do Lote').inputValue();
      await lista.pesquisar();
      if (valor === 'abc') expect.soft(await lista.tabela().linhas().count(), 'nenhum resultado').toBe(0);
      else observar(`O campo Â«NÂº do LoteÂ» nÃ£o aceita letras (ficou Â«${valor}Â»)`);
      await expect.soft(page.getByRole('alert').filter({ hasText: /erro|nÃ£o foi possÃ­vel/i })).toHaveCount(0);
    });

    test('CT-CONF-LOG-11 â€” Exportar', metaConf(ITEM, 'CT-CONF-LOG-11', ['TR']), async ({ page }) => {
      const lista = logs(page);
      await lista.abrir();
      await pesquisarArea(page, /Medicamentos/i);
      semMassa((await lista.tabela().linhas().count()) === 0, 'sem execuÃ§Ãµes de Medicamentos');
      expect(await exportar(page, lista.tabela().botaoExportar())).toBe('logs-conferencia.xlsx');
    });
  });

  test.describe('Detalhe da execuÃ§Ã£o', () => {
    /** Abre a 1.Âª execuÃ§Ã£o de Medicamentos com Â«Acusou erroÂ» = Sim. */
    async function abrirExecucaoComErro(page: Page): Promise<void> {
      const lista = logs(page);
      await lista.abrir();
      await escolherOpcao(page, AREA, await opcaoArea(page, /Medicamentos/i));
      await escolherOpcao(page, 'Acusou erro', 'Sim');
      await lista.pesquisar();
      semMassa((await lista.tabela().linhas().count()) === 0, 'nenhuma execuÃ§Ã£o de Medicamentos com erro');
      await lista.abrirPrimeiroDetalhe();
    }
    const tabelasPassos = (page: Page) => page.locator('table').filter({ has: page.locator('thead th[abbr="Elegibilidade"]') });

    test('CT-CONF-LOG-06 â€” Detalhe de uma execuÃ§Ã£o com erro', metaConf(ITEM, 'CT-CONF-LOG-06', ['RF-37']), async ({ page }) => {
      await abrirExecucaoComErro(page);
      await expect(tituloH1(page)).toHaveText(/^ExecuÃ§Ã£o #\d+ â€” \S+/);
      for (const c of ['Estado', 'Regras (avaliadas / total)', 'NÃ£o elegÃ­veis / com erro', 'DuraÃ§Ã£o total', 'Entidade', 'Ciclo', 'NÂº da Factura', 'Lote', 'PrestaÃ§Ã£o', 'Prestador']) {
        await expect.soft(page.getByText(c, { exact: true }).first(), c).toBeVisible();
      }
      await expect.soft(page.getByText('Por onde passou', { exact: true })).toBeVisible();
      await expect.soft(page.getByText('Erros capturados', { exact: true })).toBeVisible();
      const t = new Tabela(tabelasPassos(page).first());
      await t.esperar();
      expect.soft(await t.colunas()).toEqual(['Ordem', 'CÃ³digo', 'Regra', 'Elegibilidade', 'Acusou erro', 'DuraÃ§Ã£o']);
    });

    test('CT-CONF-LOG-07 â€” CoerÃªncia entre os passos e o cabeÃ§alho', metaConf(ITEM, 'CT-CONF-LOG-07', ['RF-37']), async ({ page }) => {
      await abrirExecucaoComErro(page);
      let comErro = 0;
      let naoElegiveis = 0;
      const codigosPassos: string[] = [];
      const tabelas = tabelasPassos(page);
      for (let k = 0; k < (await tabelas.count()); k++) {
        const t = new Tabela(tabelas.nth(k));
        await t.esperar();
        const erro = await t.valoresColuna('Acusou erro');
        const eleg = await t.valoresColuna('Elegibilidade');
        const cod = await t.valoresColuna('CÃ³digo');
        erro.forEach((e, i) => {
          if (e === 'Sim') {
            comErro++;
            codigosPassos.push(cod[i]);
          }
        });
        naoElegiveis += eleg.filter((e) => e === 'NÃ£o elegÃ­vel').length;
      }
      const cab = (await valorCampo(page, 'NÃ£o elegÃ­veis / com erro').innerText()).match(/(\d+)\s*\/\s*(\d+)/);
      expect.soft(cab, 'cabeÃ§alho Â«NÃ£o elegÃ­veis / com erroÂ»').not.toBeNull();
      expect.soft(naoElegiveis, 'linhas Â«NÃ£o elegÃ­velÂ» = cabeÃ§alho').toBe(Number(cab?.[1]));
      expect.soft(comErro, 'linhas Â«Acusou erro = SimÂ» = cabeÃ§alho').toBe(Number(cab?.[2]));
      const erros = Tabela.comColuna(page, 'Justificado');
      await erros.esperar();
      const codigosCapturados = await erros.valoresColuna('CÃ³digo');
      observar(`CÃ³digos nos passos com erro: [${codigosPassos.join(', ')}]; em Â«Erros capturadosÂ»: [${codigosCapturados.join(', ')}] â€” comparar com os erros da prestaÃ§Ã£o na ExecuÃ§Ã£o de tarefa/Consulta`);
    });

    test('CT-CONF-LOG-08 â€” Modal do passo com erro', metaConf(ITEM, 'CT-CONF-LOG-08', ['RF-37', 'Q-12']), async ({ page }) => {
      await abrirExecucaoComErro(page);
      const linhaErro = page.locator('table tbody tr').filter({ has: page.locator('td', { hasText: /^Sim$/ }) }).first();
      await linhaErro.getByRole('button', { name: 'Ver detalhes do passo' }).click();
      const dialogo = page.getByRole('dialog');
      await expect(dialogo).toBeVisible();
      for (const t of ['Elegibilidade', 'Estado', 'DuraÃ§Ã£o', 'Tipo', 'Mensagem', 'Erro capturado', 'Estado do contexto (antes â†’ depois)']) {
        await expect.soft(dialogo.getByText(t, { exact: true }).first(), t).toBeVisible();
      }
      await expect.soft(dialogo.getByText(/^(Classe Java|Script JavaScript|ExpressÃ£o SpEL)$/).first(), 'definiÃ§Ã£o').toBeVisible();
      observar('Q-12: confirmar se a definiÃ§Ã£o mostrada Ã© a atual ou a em vigor Ã  data da execuÃ§Ã£o (o modal rotula Â«em vigor Ã  data da execuÃ§Ã£oÂ» sÃ³ a elegibilidade).');
      await dialogo.getByRole('button', { name: 'Fechar' }).click();
    });

    test('CT-CONF-LOG-09 â€” ExecuÃ§Ãµes com estado Â«ErroÂ» / Â«Erro de configuraÃ§Ã£oÂ»', metaConf(ITEM, 'CT-CONF-LOG-09', ['Q-12']), async ({ page }) => {
      const lista = logs(page);
      await lista.abrir();
      await pesquisarArea(page, /Medicamentos/i);
      const t = lista.tabela();
      const estados = await t.valoresColuna('Estado');
      const i = estados.findIndex((e) => /^Erro/.test(e));
      if (i < 0) {
        observar(`Nenhuma execuÃ§Ã£o Â«ErroÂ»/Â«Erro de configuraÃ§Ã£oÂ» na 1.Âª pÃ¡gina (estados vistos: ${[...new Set(estados)].join(', ')})`);
        semMassa(true, 'nenhuma execuÃ§Ã£o em Erro na 1.Âª pÃ¡gina');
      }
      await t.acaoNaLinha(i, 'Ver detalhes').click();
      await expect(tituloH1(page)).toHaveText(/^ExecuÃ§Ã£o #/, { timeout: 30_000 });
      const chip = (await page.locator('.MuiChip-root').filter({ hasText: /^(ConcluÃ­da|Com erro)$/ }).first().innerText()).trim();
      observar(`ExecuÃ§Ã£o Â«${estados[i]}Â»: chip Â«${chip}Â»`);
      expect.soft(chip, `execuÃ§Ã£o em Â«${estados[i]}Â» nÃ£o deve dizer Â«ConcluÃ­daÂ»`).not.toBe('ConcluÃ­da');
    });

    test('CT-CONF-LOG-10 â€” Vindo do Cockpit: Â«Retirar o filtro da execuÃ§Ã£oÂ»', metaConf(ITEM, 'CT-CONF-LOG-10', ['RF-37']), async ({ page, request }) => {
      const { aberto } = await massaCiclos(request);
      semMassa(!aberto, '{CICLO_ABERTO}');
      const det = new PaginaDetalheArea(page);
      await det.abrir('med-continente', `?ciclo=${aberto!.anoMes}`);
      await det.esperarCarregado('Medicamentos Continente');
      const t = det.tabelaRegisto();
      await t.esperar();
      const verLogs = t.raiz.getByRole('button', { name: 'Ver logs', exact: true });
      semMassa((await verLogs.count()) === 0, 'nenhuma execuÃ§Ã£o com Â«Ver logsÂ» na 1.Âª pÃ¡gina do registo');
      await verLogs.first().click();
      const campo = page.getByText('ExecuÃ§Ã£o do cockpit', { exact: true }).first();
      await expect(campo).toBeVisible({ timeout: 30_000 });
      const resp = page.waitForResponse((r) => /\/motor-regras\/execucoes\?/.test(r.url()) && !/correlationIdArranque=/.test(r.url()));
      await botao(page, 'Retirar o filtro da execuÃ§Ã£o').click();
      await resp;
      await expect(campo).toHaveCount(0);
      await expect(page).not.toHaveURL(/execucao=/);
    });
  });

  // ---------------------------------------------------------------------------------
  // PadrÃ£o de pesquisa da ConferÃªncia (TASK-20260928-08, #1568). Variante informativa (pendÃªncia
  // P5): corre, mas nÃ£o conta para o veredicto da tarefa.
  test.describe('PadrÃ£o de pesquisa', () => {
    test.use({ viewport: VIEWPORT_PADRAO_PESQUISA });

    test(
      'CT-REG-TASK-20260928-08-LOG â€” Logs de ConferÃªncia no padrÃ£o de pesquisa: breadcrumb, largura dos filtros, chips, placeholders e tÃ­tulo (informativo, P5)',
      metaPadraoPesquisa('logs', 'LOG', { informativo: true }),
      async ({ page }) => {
        await verificarPadraoPesquisa(page, {
          itemMenu: 'Logs de conferÃªncia',
          titulo: 'Logs de ConferÃªncia',
          pesquisar: async (p) => {
          // A Ãrea de ConferÃªncia Ã© obrigatÃ³ria: usa-se a 1.Âª Ã¡rea (Medicamentos).
          await escolherOpcao(p, AREA, /^Medicamentos$/);
          await logs(p).pesquisar();
          return logs(p).tabela().linhas().count();
        },
        });
      },
    );
  });
});

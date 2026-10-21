import type { Page } from '@playwright/test';
import { abrirItemMenu } from '../../../paginas/conferencia/menu';
import { botao, combobox, escolherOpcao, MSG, opcoesDe, Tabela, trilhoBreadcrumb } from '../../../paginas/conferencia/Traceability Suite';
import { abrir, expect, metaConf, observar, semMassa, test } from '../apoio-conferencia';

/**
 * ConferÃªncia â†’ MovimentaÃ§Ã£o entre ciclos (`/conferencia/movimentacao-ciclos`, `ccmsns-ui`
 * #67, `develop` 14d7c2b). EcrÃ£ novo, sem casos no script C1 de 08-10-2026: os casos
 * `CT-CONF-MOV-*` seguem o cÃ³digo e o banner do prÃ³prio ecrÃ£; o MOV-07 cobre o achado das
 * anotaÃ§Ãµes manuais de 08-10 (Â«a tabela nÃ£o tem ordenaÃ§Ã£o por colunaÂ»).
 *
 * SÃ³ leitura. A Ãºnica escrita do ecrÃ£ Ã© o Â«ConfirmarÂ» do diÃ¡logo Â«Confirmar movimentaÃ§Ã£oÂ»
 * (`POST /conferencia/movimentacao-ciclos`), que nunca Ã© clicado â€” o MOV-05 abre o diÃ¡logo
 * para ler o resumo e fecha-o com Â«CancelarÂ». A proteÃ§Ã£o de `apoio-conferencia.ts` aborta
 * o POST se algum passo o disparar.
 *
 * Os dois separadores ficam montados (o oculto com `display:none`): os localizadores por
 * papel (`getByRole`) jÃ¡ ignoram a cÃ³pia oculta dos filtros.
 */

const ITEM = 'movimentacao' as const;
const ROTA = '/conferencia/movimentacao-ciclos';
const REFS = ['MOV'];
const AREAS = [
  'Todas', 'Medicamentos', 'Medicamentos - AÃ§ores', 'Medicamentos - Madeira', 'MCDT',
  'Cuidados RespiratÃ³rios DomiciliÃ¡rios', 'Cuidados Continuados', 'HemodiÃ¡lise', 'SICAD',
  'Tratamentos Termais', 'Vacinas', 'SaÃºde Oral', 'Dispositivos',
];
const COLUNAS_PROCESSOS = ['Processo', 'Faturas', 'Prestador', 'Ãrea', 'Ciclo atual', 'ReceÃ§Ã£o real', 'SituaÃ§Ã£o'];
const COLUNAS_MOVIMENTOS = ['Data / hora', 'Utilizador', 'Ãrea', 'Processo', 'Faturas', 'Movimento', 'ReceÃ§Ã£o real â†’ ajustada', 'MÃªs de conferÃªncia', 'Motivo'];
const RE_NAO_ELEGIVEL =
  /^(Fatura com conferÃªncia iniciada|Fatura anulada|Processo sem faturas|Data de receÃ§Ã£o fora de qualquer ciclo|Faturas do processo com meses de conferÃªncia diferentes)/;
const RE_DESTINO_INELEGIVEL =
  /(Ciclo fechado: o destino jÃ¡ nÃ£o aceita faturas\.|Fora da tolerÃ¢ncia de \d+ dias|Janela ainda nÃ£o iniciada|Ciclo ainda nÃ£o criado no calendÃ¡rio\.)/;

const processos = (page: Page) => Tabela.comColuna(page, 'SituaÃ§Ã£o');
const movimentos = (page: Page) => Tabela.comColuna(page, 'Movimento');
const separador = (page: Page, nome: 'Movimentar' | 'HistÃ³rico') => page.getByRole('tab', { name: nome, exact: true });
const caixasProcesso = (page: Page) => page.getByRole('checkbox', { name: /^Selecionar o processo / });

async function abrirMovimentacao(page: Page): Promise<void> {
  await abrir(page, ROTA);
  await expect(separador(page, 'Movimentar')).toBeVisible({ timeout: 30_000 });
}
/** Pesquisa no separador Movimentar e espera `GET â€¦/movimentacao-ciclos/pesquisa`. */
async function pesquisarProcessos(page: Page, area = 'Medicamentos'): Promise<void> {
  await escolherOpcao(page, 'Ãrea de ConferÃªncia', area);
  const resp = page.waitForResponse((r) => /\/movimentacao-ciclos\/pesquisa/.test(r.url()), { timeout: 90_000 });
  await botao(page, 'Pesquisar').click();
  const r = await resp;
  expect(r.ok(), `pesquisa de processos â†’ HTTP ${r.status()}`).toBeTruthy();
  await processos(page).esperar();
}
/** Marca o 1.Âº processo elegÃ­vel; devolve false se nÃ£o houver nenhum. */
async function marcarPrimeiroElegivel(page: Page): Promise<boolean> {
  const caixas = caixasProcesso(page);
  for (let i = 0; i < (await caixas.count()); i++) {
    if (await caixas.nth(i).isEnabled()) {
      await caixas.nth(i).check();
      return true;
    }
  }
  return false;
}
/** Abre o painel de destino (GET destinos) para o processo marcado. */
async function abrirDestinos(page: Page): Promise<void> {
  const resp = page.waitForResponse((r) => /\/movimentacao-ciclos\/destinos/.test(r.url()), { timeout: 60_000 });
  await botao(page, 'Movimentar seleÃ§Ã£o').click();
  await resp;
  await expect(page.getByText(/^Ciclo de destino \(1 processo\)$/)).toBeVisible({ timeout: 30_000 });
}

test.describe('ConferÃªncia â†’ MovimentaÃ§Ã£o entre ciclos', () => {
  test.describe('Movimentar', () => {
    test('CT-CONF-MOV-01 â€” Abrir pelo menu: aviso de exceÃ§Ã£o, separadores e grelha antes de pesquisar', metaConf(ITEM, 'CT-CONF-MOV-01', REFS), async ({ page }) => {
      await abrir(page, '/conferencia/cockpit');
      await abrirItemMenu(page, 'MovimentaÃ§Ã£o entre ciclos');
      await expect(page).toHaveURL(new RegExp(`${ROTA}$`));
      await expect(page.getByText(/^AÃ§Ã£o de exceÃ§Ã£o, restrita e auditada\./).or(page.getByText('AÃ§Ã£o de exceÃ§Ã£o, restrita e auditada.')).first()).toBeVisible({ timeout: 30_000 });
      await expect.soft(page.getByText(/Transfere processos \(e todas as faturas que agregam\) para o ciclo adjacente/)).toBeVisible();
      await expect(separador(page, 'Movimentar')).toHaveAttribute('aria-selected', 'true');
      await expect.soft(separador(page, 'HistÃ³rico')).toBeVisible();
      await expect.soft(page.getByText('Pesquisa de faturas', { exact: true })).toBeVisible();
      await expect.soft(page.getByText(MSG.antesPesquisa, { exact: true }).first()).toBeVisible();
      expect.soft(await trilhoBreadcrumb(page), 'sem breadcrumb').toEqual([]);
      if ((await page.getByRole('heading', { level: 1 }).count()) === 0) observar('O ecrÃ£ nÃ£o tem tÃ­tulo h1 (os tÃ­tulos dos painÃ©is sÃ£o h5).');
    });

    test('CT-CONF-MOV-02 â€” Filtros: Ã¡reas disponÃ­veis e NÂº do Processo sÃ³ com dÃ­gitos', metaConf(ITEM, 'CT-CONF-MOV-02', REFS, { tipo: 'negativo' }), async ({ page }) => {
      await abrirMovimentacao(page);
      expect.soft(await opcoesDe(page, 'Ãrea de ConferÃªncia')).toEqual(AREAS);
      let pediu = false;
      page.on('request', (r) => {
        if (/\/movimentacao-ciclos\/pesquisa/.test(r.url())) pediu = true;
      });
      await page.getByRole('textbox', { name: 'NÂº do Processo' }).fill('abc');
      await botao(page, 'Pesquisar').click();
      await expect(page.getByText('SÃ³ sÃ£o permitidos dÃ­gitos.', { exact: true })).toBeVisible();
      await page.waitForTimeout(1_000);
      expect(pediu, 'sem pedido ao servidor').toBe(false);
    });

    test('CT-CONF-MOV-03 â€” Pesquisar: colunas, situaÃ§Ã£o de elegibilidade e seleÃ§Ã£o sÃ³ dos elegÃ­veis', metaConf(ITEM, 'CT-CONF-MOV-03', REFS), async ({ page }) => {
      await abrirMovimentacao(page);
      await pesquisarProcessos(page);
      const t = processos(page);
      if ((await t.linhas().count()) === 0) {
        await expect.soft(page.getByText('Nenhum processo encontrado com os critÃ©rios indicados.')).toBeVisible();
        semMassa(true, 'nenhum processo de Medicamentos devolvido pela pesquisa');
      }
      expect.soft((await t.colunas()).filter((c) => !/^Selecionar todos/.test(c))).toEqual(COLUNAS_PROCESSOS);
      const situacoes = await t.valoresColuna('SituaÃ§Ã£o');
      for (const s of situacoes) expect.soft(s === 'ElegÃ­vel' || RE_NAO_ELEGIVEL.test(s), `situaÃ§Ã£o Â«${s}Â»`).toBe(true);
      for (const a of await t.valoresColuna('Ãrea')) expect.soft(a, 'Ã¡rea filtrada').toBe('Medicamentos');
      const caixas = caixasProcesso(page);
      for (let i = 0; i < (await caixas.count()); i++) {
        const elegivel = situacoes[i] === 'ElegÃ­vel';
        if (elegivel) await expect.soft(caixas.nth(i), `linha ${i + 1} elegÃ­vel: caixa ativa`).toBeEnabled();
        else await expect.soft(caixas.nth(i), `linha ${i + 1} nÃ£o elegÃ­vel: caixa desativada`).toBeDisabled();
      }
      await expect.soft(page.getByText('0 processos selecionados', { exact: true })).toBeVisible();
      await expect.soft(botao(page, 'Movimentar seleÃ§Ã£o')).toBeDisabled();
      if (await page.getByText(/^A pesquisa devolveu o mÃ¡ximo de 200 processos\./).count()) observar('Pesquisa por Medicamentos atingiu o limite de 200 processos.');
      observar(`SituaÃ§Ãµes na 1.Âª pÃ¡gina: ${[...new Set(situacoes)].join(' | ')}`);
    });

    test('CT-CONF-MOV-04 â€” Selecionar um processo elegÃ­vel mostra os 2 ciclos de destino adjacentes', metaConf(ITEM, 'CT-CONF-MOV-04', REFS), async ({ page }) => {
      await abrirMovimentacao(page);
      await pesquisarProcessos(page);
      semMassa(!(await marcarPrimeiroElegivel(page)), 'nenhum processo elegÃ­vel na 1.Âª pÃ¡gina');
      await expect(page.getByText(/^1 processo selecionado \(\d+ faturas?\)$/)).toBeVisible();
      await expect(botao(page, 'Movimentar seleÃ§Ã£o')).toBeEnabled();
      await abrirDestinos(page);
      const vistos: string[] = [];
      for (const posicao of ['Ciclo anterior', 'Ciclo seguinte']) {
        const cartao = page.locator('.MuiCard-root:not(:has(.MuiCard-root)), [aria-disabled]').filter({ hasText: posicao }).first();
        await expect.soft(cartao, posicao).toBeVisible();
        const texto = (await cartao.innerText()).replace(/\s+/g, ' ');
        expect.soft(texto, `${posicao}: tÃ­tulo Â«AAAAMM Â· MÃªs AAAAÂ»`).toMatch(/\d{6} Â· \S+ \d{4}/);
        expect.soft(texto, `${posicao}: janela de receÃ§Ã£o`).toMatch(/Janela de receÃ§Ã£o: \d{2}\/\d{2}\/\d{4} a \d{2}\/\d{2}\/\d{4}/);
        const elegivel = /Destino elegÃ­vel/.test(texto);
        expect.soft(elegivel || RE_DESTINO_INELEGIVEL.test(texto), `${posicao}: elegÃ­vel ou com motivo`).toBe(true);
        vistos.push(`${posicao}: ${texto.slice(0, 160)}`);
      }
      observar(vistos.join(' | '));
    });

    test('CT-CONF-MOV-05 â€” Resumo do diÃ¡logo de confirmaÃ§Ã£o (fechado com Â«CancelarÂ», nada Ã© gravado)', metaConf(ITEM, 'CT-CONF-MOV-05', REFS), async ({ page }) => {
      await abrirMovimentacao(page);
      await pesquisarProcessos(page);
      semMassa(!(await marcarPrimeiroElegivel(page)), 'nenhum processo elegÃ­vel na 1.Âª pÃ¡gina');
      await abrirDestinos(page);
      const radio = page.getByRole('radio').first();
      semMassa(!(await radio.isVisible().catch(() => false)), 'nenhum ciclo de destino elegÃ­vel para o processo');
      await radio.check();
      const movimentar = page.getByRole('button', { name: 'Movimentar', exact: true });
      await expect(movimentar, 'sem motivo o botÃ£o fica desativado').toBeDisabled();
      await page.getByRole('textbox', { name: /^Motivo da movimentaÃ§Ã£o/ }).fill('Teste automÃ¡tico QA â€” sÃ³ leitura, nÃ£o confirmar');
      await expect(movimentar).toBeEnabled();
      await movimentar.click();
      const dialogo = page.getByRole('dialog', { name: 'Confirmar movimentaÃ§Ã£o' });
      await expect(dialogo).toBeVisible();
      await expect.soft(dialogo).toContainText(/O processo \S+ \(\d+ faturas?\) passa do ciclo \d{6}.* para \d{6}/);
      await expect.soft(dialogo).toContainText('a data real de cada processo fica preservada no registo de movimentaÃ§Ã£o');
      await expect.soft(dialogo).toContainText('Ã‰ criado um registo por processo, com o mesmo motivo; a execuÃ§Ã£o Ã© tudo-ou-nada.');
      await expect.soft(dialogo).toContainText('Teste automÃ¡tico QA â€” sÃ³ leitura, nÃ£o confirmar');
      observar(`Resumo: ${(await dialogo.innerText()).replace(/\s+/g, ' ').slice(0, 400)}`);
      await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
      await expect(dialogo).toBeHidden();
    });
  });

  test.describe('HistÃ³rico', () => {
    test('CT-CONF-MOV-06 â€” HistÃ³rico carrega ao abrir, com o movimento Â«origem â†’ destinoÂ»', metaConf(ITEM, 'CT-CONF-MOV-06', REFS), async ({ page }) => {
      const historico = page.waitForResponse((r) => /\/conferencia\/movimentacao-ciclos(\?|$)/.test(r.url()) && r.request().method() === 'GET', { timeout: 90_000 });
      await abrirMovimentacao(page);
      expect((await historico).ok(), 'GET do histÃ³rico ao abrir').toBeTruthy();
      await separador(page, 'HistÃ³rico').click();
      await expect(separador(page, 'HistÃ³rico')).toHaveAttribute('aria-selected', 'true');
      await expect.soft(combobox(page, 'Ciclo')).toBeVisible();
      await expect.soft(page.getByText(/^Registo definitivo: os movimentos nunca sÃ£o alterados nem apagados\./)).toBeVisible();
      const t = movimentos(page);
      await t.esperar();
      expect.soft(await t.colunas()).toEqual(COLUNAS_MOVIMENTOS);
      const linhas = await t.linhas().count();
      if (linhas === 0) {
        expect.soft(await t.textoVazio()).toBe('Sem movimentos para os filtros selecionados.');
        observar('HistÃ³rico sem movimentos em DEV.');
        return;
      }
      for (const m of await t.valoresColuna('Movimento')) expect.soft(m, 'movimento Â«AAAAMM â†’ AAAAMMÂ»').toMatch(/^\d{6} â†’ \d{6}$/);
      observar(`${linhas} movimento(s) na 1.Âª pÃ¡gina do histÃ³rico`);
    });
  });

  test.describe('PadrÃµes da grelha', () => {
    test('CT-CONF-MOV-07 â€” Grelhas com exportaÃ§Ã£o (Manual C.8) e ordenaÃ§Ã£o por coluna (anotaÃ§Ãµes 08-10)', metaConf(ITEM, 'CT-CONF-MOV-07', [...REFS, 'TR'], { interface: true }), async ({ page }) => {
      await abrirMovimentacao(page);
      await pesquisarProcessos(page);
      const verificar = async (nome: string, t: Tabela) => {
        const ordenaveis = await t.raiz.locator('thead th[aria-label^="Ordenar por"]').count();
        const exportar = await t.botaoExportar().count();
        observar(`${nome}: ${ordenaveis} coluna(s) ordenÃ¡vel(is); botÃ£o Â«Exportar XLSXÂ» ${exportar ? 'presente' : 'ausente'}`);
        expect.soft(ordenaveis, `${nome}: colunas ordenÃ¡veis por clique no cabeÃ§alho`).toBeGreaterThan(0);
        expect.soft(exportar, `${nome}: botÃ£o Â«Exportar XLSXÂ» (Manual C.8 â€” todos os grids exportÃ¡veis)`).toBeGreaterThan(0);
      };
      await verificar('Resultados (Movimentar)', processos(page));
      await separador(page, 'HistÃ³rico').click();
      await movimentos(page).esperar();
      await verificar('Movimentos (HistÃ³rico)', movimentos(page));
    });
  });
});

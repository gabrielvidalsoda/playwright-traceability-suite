import type { Page } from '@playwright/test';
import { abrirItemMenu } from '../../../paginas/conferencia/menu';
import { botao, combobox, escolherOpcao, exportar, MSG, opcoesDe, Tabela } from '../../../paginas/conferencia/Traceability Suite';
import { abrir, expect, metaConf, observar, semMassa, test } from '../apoio-conferencia';

/**
 * ConferÃªncia â†’ GestÃ£o de Feriados (`/conferencia/calendario/feriados`) â€” script C1
 * (VisualizaÃ§Ã£o) de 08-10-2026, S5. SÃ³ leitura: nunca Â«Incluir feriadoÂ», Â«InativarÂ» nem
 * Â«ReativarÂ» (este grava logo, sem confirmaÃ§Ã£o). A lista carrega sem Â«PesquisarÂ».
 */

const ITEM = 'feriados' as const;
const ROTA = '/conferencia/calendario/feriados';
const ANO = new Date().getFullYear();

/** Feriados de 2026 esperados pelo script (FER-02). */
const ESPERADOS_2026: Record<string, string[]> = {
  Nacional: ['01/01/2026', '03/04/2026', '05/04/2026', '25/04/2026', '01/05/2026', '04/06/2026', '10/06/2026', '15/08/2026', '05/10/2026', '01/11/2026', '01/12/2026', '08/12/2026', '25/12/2026'],
  AÃ§ores: ['25/05/2026'],
  Madeira: ['01/07/2026', '26/12/2026'],
};

const tabela = (page: Page) => Tabela.comColuna(page, 'Dia da semana');

async function filtrar(page: Page, rotulo: string, opcao: string): Promise<void> {
  const resposta = page.waitForResponse((r) => /\/calendario\/feriados\?/.test(r.url()));
  await escolherOpcao(page, rotulo, opcao);
  await resposta;
  await tabela(page).esperar();
}

test.describe('ConferÃªncia â†’ GestÃ£o de Feriados', () => {
  test('CT-CONF-FER-01 â€” Abrir: tÃ­tulo, nota e filtros por omissÃ£o; a lista carrega sozinha', metaConf(ITEM, 'CT-CONF-FER-01', ['RF-23']), async ({ page }) => {
    await abrir(page, '/');
    const lista = page.waitForResponse((r) => /\/calendario\/feriados\?/.test(r.url()), { timeout: 60_000 });
    await abrirItemMenu(page, 'GestÃ£o de feriados');
    await expect(page).toHaveURL(new RegExp(`${ROTA}$`));
    await expect(page.getByRole('heading', { name: 'Feriados e dias Ãºteis' })).toBeVisible();
    await expect.soft(page.getByText(/^Os feriados nacionais e regionais sÃ£o gerados automaticamente por ano civil\./)).toBeVisible();
    await expect.soft(combobox(page, 'Ano')).toContainText(String(ANO));
    await expect.soft(combobox(page, 'Ã‚mbito')).toContainText('Todos');
    await expect.soft(page.getByRole('checkbox', { name: 'Mostrar inativos' })).toBeChecked();
    await lista;
    await tabela(page).esperar();
    await expect.soft(botao(page, 'Pesquisar'), 'sem botÃ£o Pesquisar').toHaveCount(0);
    expect.soft(await tabela(page).colunas()).toEqual(['Data', 'Dia da semana', 'DescriÃ§Ã£o', 'Ã‚mbito', 'Origem', 'Estado']);
  });

  test('CT-CONF-FER-02 â€” Feriados gerados para 2026 (Nacional, AÃ§ores, Madeira)', metaConf(ITEM, 'CT-CONF-FER-02', ['RF-23', 'RN-16']), async ({ page }) => {
    await abrir(page, ROTA);
    await tabela(page).esperar();
    if (!(await combobox(page, 'Ano').innerText()).includes('2026')) await filtrar(page, 'Ano', '2026');
    for (const [ambito, datas] of Object.entries(ESPERADOS_2026)) {
      await test.step(ambito, async () => {
        await filtrar(page, 'Ã‚mbito', ambito);
        // A grelha pagina a 10: o Nacional tem 13 feriados.
        if ((await tabela(page).tamanhoPagina().innerText()).trim() !== '20') await tabela(page).mudarTamanhoPagina(20);
        const vistas = await tabela(page).valoresColuna('Data');
        const faltam = datas.filter((d) => !vistas.includes(d));
        const aMais = vistas.filter((d) => !datas.includes(d));
        if (faltam.length || aMais.length) observar(`${ambito} 2026 â€” em falta: [${faltam.join(', ')}]; a mais: [${aMais.join(', ')}]`);
        expect.soft(faltam, `${ambito}: feriados em falta`).toEqual([]);
      });
    }
  });

  test('CT-CONF-FER-20 â€” Colunas da lista de feriados ordenÃ¡veis por clique no cabeÃ§alho (anotaÃ§Ãµes 08-10)', metaConf(ITEM, 'CT-CONF-FER-20', ['TR'], { interface: true }), async ({ page }) => {
    await abrir(page, ROTA);
    await tabela(page).esperar();
    const ordenaveis = await tabela(page).raiz.locator('thead th[aria-label^="Ordenar por"]').count();
    observar(`${ordenaveis} coluna(s) ordenÃ¡vel(is) na lista de feriados`);
    expect(ordenaveis, 'colunas ordenÃ¡veis (Manual C.1)').toBeGreaterThan(0);
  });

  test('CT-CONF-FER-13 â€” Exportar as linhas filtradas; sem linhas o botÃ£o fica desativado', metaConf(ITEM, 'CT-CONF-FER-13', ['TR']), async ({ page }) => {
    test.slow();
    await abrir(page, ROTA);
    await tabela(page).esperar();
    await filtrar(page, 'Ã‚mbito', 'Nacional');
    expect(await exportar(page, tabela(page).botaoExportar())).toBe('feriados.xlsx');

    await test.step('Ano/Ã¢mbito sem feriados', async () => {
      const anos = (await opcoesDe(page, 'Ano')).filter((a) => /^\d{4}$/.test(a));
      await filtrar(page, 'Ã‚mbito', 'Maia (municipal)');
      let vazio = (await tabela(page).linhas().count()) === 0;
      for (const ano of anos) {
        if (vazio) break;
        await filtrar(page, 'Ano', ano);
        vazio = (await tabela(page).linhas().count()) === 0;
      }
      semMassa(!vazio, 'todas as combinaÃ§Ãµes Ano Ã— Â«Maia (municipal)Â» tÃªm feriados');
      await expect.soft(tabela(page).celulaVazia()).toContainText('Sem feriados para os filtros selecionados.');
      const exp = tabela(page).botaoExportar();
      const desativado = await exp.isDisabled();
      if (!desativado) {
        await exp.click();
        await expect.soft(page.getByText(MSG.exportarSemResultados)).toBeVisible();
        observar(`Sem linhas, Â«Exportar XLSXÂ» fica ativo e mostra Â«${MSG.exportarSemResultados}Â» (o script espera o botÃ£o desativado).`);
      }
      expect.soft(desativado, 'Exportar desativado sem linhas').toBe(true);
    });
  });
});

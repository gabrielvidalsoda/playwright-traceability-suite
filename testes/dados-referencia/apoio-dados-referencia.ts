import { statSync } from 'node:fs';
import { type Locator, type Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { AMBIENTE } from '../../dados/massa';
import { PaginaPesquisaDadosReferencia } from '../../paginas/dadosReferencia/PaginaPesquisaDadosReferencia';
import { PaginaDetalheDadosReferencia } from '../../paginas/dadosReferencia/PaginaDetalheDadosReferencia';
import { ROTEIRO_PADROES_UI, type TelaDadosReferencia } from '../../paginas/dadosReferencia/telas';
import {
  esperarPedidoComSort,
  naoAplicavel,
  verificarEstadoAntesPesquisa,
  verificarGrelhaResultados,
  verificarOrdenacaoServidor,
  verificarPaginaDetalhe,
} from '../../paginas/dadosReferencia/padraoUi';
import { meta } from '../apoio';

/**
 * Apoio comum aos specs de `testes/dados-referencia/<item>/` â€” roteiro de deploy dos
 * padrÃµes de UI de Dados de ReferÃªncia (PRs front #50/#55, back #31/#34).
 *
 * IDs de caso: `CT-DR-<passo do roteiro>` (`CT-DR-A01`, `CT-DR-A.1.4`, `CT-DR-B5.2`,
 * `CT-DR-C01`â€¦). Os passos da Parte C repetidos noutros formulÃ¡rios levam um sufixo com
 * o formulÃ¡rio (`CT-DR-C02-PAT`).
 */
export function metaDR(
  tela: TelaDadosReferencia,
  caso: string,
  opcoes: {
    tipo?: 'positivo' | 'negativo' | 'robustez';
    interface?: boolean;
    /** Depende do backend real (ordenaÃ§Ã£o/filtro no servidor, exportaÃ§Ã£o, gravaÃ§Ã£oâ€¦). */
    integracao?: boolean;
    posDeploy?: boolean;
    /** Defeito de origem (`BUG-AAAAMMDD-NN`) que o caso tambÃ©m verifica â€” tag `@<bug>`. */
    bug?: string;
    /** Plano de origem, quando nÃ£o Ã© o roteiro de padrÃµes de UI de 24-09. */
    plano?: string;
  } = {},
) {
  return meta({
    caso,
    requisitos: [tela.requisito],
    area: tela.item,
    tipo: opcoes.tipo ?? 'positivo',
    suite: 'dados-referencia',
    tipoTeste: opcoes.interface ? 'interface' : 'caixa-preta',
    camada: opcoes.integracao ? 'integracao' : undefined,
    posDeploy: opcoes.posDeploy,
    bug: opcoes.bug,
    plano: opcoes.plano ?? `${ROTEIRO_PADROES_UI} â€” ${caso.replace(/^CT-DR-/, '')}`,
  });
}

/** Plano dos itens em "Ready for test" no Taiga (09-10-2026) â€” caminho relativo Ã  raiz `mptech/`. */
export const PLANO_READY_FOR_TEST =
  'CCM/ccmsns-qa-e2e/docs/ready-for-test-taiga-09-10-2026/plano-validacao-ready-for-test.md';

/**
 * Metadados de um caso de regressÃ£o do plano "Ready for test" (`CT-REG-BUG-*`/`CT-REG-TASK-*`):
 * `metaDR` com o defeito/tarefa de origem (tag `@BUG-â€¦`/`@TASK-â€¦`) e o plano de 09-10-2026.
 */
export function metaReg(
  tela: TelaDadosReferencia,
  caso: string,
  origem: string,
  opcoes: { tipo?: 'positivo' | 'negativo' | 'robustez'; interface?: boolean; integracao?: boolean } = {},
) {
  return metaDR(tela, caso, { ...opcoes, bug: origem, plano: `${PLANO_READY_FOR_TEST} â€” ${caso}` });
}

/** Colunas (pelo `abbr`) de uma tabela, sem a coluna de aÃ§Ãµes, e se cada uma Ã© ordenÃ¡vel. */
async function colunasDaTabela(tabela: Locator): Promise<{ nome: string; ordenavel: boolean }[]> {
  return tabela.locator('thead th').evaluateAll((ths) =>
    ths
      .filter((th) => th.id !== 'actions')
      .map((th) => ({
        nome: (th.getAttribute('abbr') ?? th.textContent ?? '').trim(),
        ordenavel: /^Ordenar por /.test(th.getAttribute('aria-label') ?? ''),
      }))
      .filter((c) => c.nome !== '' && c.nome !== 'undefined'),
  );
}

/**
 * CT-REG-BUG-20260915-12 â€” clica no cabeÃ§alho de **todas** as colunas de dados de uma tabela
 * (exceto a de aÃ§Ãµes): 1.Âº clique â†’ `aria-sort="ascending"`, 2.Âº â†’ `"descending"`; com
 * `servidor`, cada clique tem de fazer um pedido GET com `sort=<campo>,asc|desc`.
 * VerificaÃ§Ãµes `soft`: o relatÃ³rio lista todas as colunas que falham, nÃ£o sÃ³ a primeira.
 */
export async function todasAsColunasOrdenam(
  page: Page,
  tabela: Locator,
  opcoes: { servidor?: boolean; descricao?: string } = {},
): Promise<void> {
  const nome = opcoes.descricao ?? 'tabela';
  const carregando = tabela.locator('td.Traceability Suite-tablev2-cell-loading');
  await expect(carregando).toHaveCount(0);
  const colunas = await colunasDaTabela(tabela);
  expect(colunas.length, `${nome}: a tabela tem colunas de dados`).toBeGreaterThan(0);
  const semOrdenacao = colunas.filter((c) => !c.ordenavel).map((c) => c.nome);
  const pedidos: string[] = [];

  for (const c of colunas.filter((x) => x.ordenavel)) {
    await test.step(`"${c.nome}" ordena ascendente e descendente`, async () => {
      const th = tabela.getByRole('columnheader', { name: `Ordenar por ${c.nome}`, exact: true });
      for (const [sentido, aria] of [
        ['asc', 'ascending'],
        ['desc', 'descending'],
      ] as const) {
        await expect(carregando).toHaveCount(0);
        const pedido = opcoes.servidor
          ? esperarPedidoComSort(page, new RegExp(`[?&]sort=[^&]+,${sentido}(&|$)`), 8_000).then(
              (r) => new URL(r.url()).searchParams.get('sort'),
              () => null,
            )
          : null;
        await th.click();
        await expect.soft(th, `"${c.nome}": aria-sort depois do clique (${sentido})`).toHaveAttribute('aria-sort', aria);
        if (pedido) {
          const sort = await pedido;
          expect.soft(sort, `"${c.nome}": pedido ao servidor com sort=â€¦,${sentido}`).toBeTruthy();
          if (sort) pedidos.push(`${c.nome} â†’ sort=${sort}`);
        }
      }
    });
  }
  if (pedidos.length > 0) {
    test.info().annotations.push({ type: 'observacao', description: `${nome}: ${pedidos.join(' Â· ')}` });
  }
  expect.soft(semOrdenacao, `${nome}: colunas sem ordenaÃ§Ã£o por clique no cabeÃ§alho`).toEqual([]);
}

/**
 * CT-REG-BUG-20260915-12-<sufixo> â€” numa tela de pesquisa: pesquisa com o filtro da tela e
 * verifica que todas as colunas visÃ­veis ordenam no servidor.
 */
export function testeTodasAsColunasOrdenam(tela: TelaDadosReferencia, sufixo: string): void {
  const caso = `CT-REG-BUG-20260915-12-${sufixo}`;
  test(
    `${caso} â€” Todas as colunas da pesquisa ordenam asc/desc por clique no cabeÃ§alho, com sort no pedido`,
    metaReg(tela, caso, 'BUG-20260915-12', { integracao: true }),
    async ({ page }) => {
      test.setTimeout(300_000);
      const pag = new PaginaPesquisaDadosReferencia(page, tela);
      await pag.abrir();
      await test.step('Pesquisar com o filtro da tela devolve linhas', async () => {
        await pag.pesquisarComFiltro();
        await expect(pag.linhasDados().first()).toBeVisible();
      });
      await todasAsColunasOrdenam(page, pag.tabela(), { servidor: true, descricao: tela.nome });
    },
  );
}

/**
 * Seletor Â«Resultados por pÃ¡ginaÂ» da paginaÃ§Ã£o da tabela (`TableV2`): pelo nome acessÃ­vel ou,
 * sem nome, o combobox da Ã¡rea de conteÃºdo que sÃ³ mostra um nÃºmero (o tamanho atual).
 */
export function seletorTamanhoPagina(page: Page): Locator {
  return page
    .getByRole('combobox', { name: /Resultados por pÃ¡gina/i })
    .or(page.locator('.Traceability SuiteTemplate__content').getByRole('combobox').filter({ hasText: /^\s*\d+\s*$/ }))
    .first();
}

/**
 * CT-REG-BUG-20260915-13-<sufixo> â€” pesquisa uma massa com mais linhas do que o tamanho de
 * pÃ¡gina, vai Ã  pÃ¡gina 2, muda Â«Resultados por pÃ¡ginaÂ» para o valor seguinte e verifica que a
 * tabela recarrega com mais linhas, que o pedido leva o novo tamanho e que volta Ã  pÃ¡gina 1.
 */
export function testeResultadosPorPagina(tela: TelaDadosReferencia, sufixo: string): void {
  const caso = `CT-REG-BUG-20260915-13-${sufixo}`;
  test(
    `${caso} â€” Â«Resultados por pÃ¡ginaÂ» muda o nÃºmero de linhas, o pedido leva o novo tamanho e volta Ã  pÃ¡gina 1`,
    metaReg(tela, caso, 'BUG-20260915-13', { integracao: true }),
    async ({ page }) => {
      test.slow();
      const pag = new PaginaPesquisaDadosReferencia(page, tela);
      await pag.abrir();
      await pag.pesquisarComFiltro();
      await expect(pag.linhasDados().first()).toBeVisible();
      const seguinte = pag.botaoPaginaSeguinte();
      if ((await seguinte.count()) === 0 || (await seguinte.isDisabled())) {
        naoAplicavel(`${tela.nome}: a massa de ${AMBIENTE} sÃ³ tem 1 pÃ¡gina com o filtro da tela â€” tamanho de pÃ¡gina nÃ£o verificÃ¡vel`);
        return;
      }
      const sel = seletorTamanhoPagina(page);
      const atual = Number((await sel.innerText()).trim()) || 10;

      await test.step('Ir para a pÃ¡gina 2', async () => {
        await seguinte.click();
        await pag.esperarResultados();
      });

      let novo = 0;
      await test.step(`Mudar Â«Resultados por pÃ¡ginaÂ» de ${atual} para o valor seguinte`, async () => {
        await sel.click();
        const opcoes = (await page.getByRole('option').allInnerTexts())
          .map((t) => Number(t.trim()))
          .filter((n) => Number.isFinite(n) && n > 0);
        novo = opcoes.find((n) => n > atual) ?? 0;
        expect(novo, `opÃ§Ã£o maior que ${atual} no seletor (opÃ§Ãµes: ${opcoes.join(', ')})`).toBeGreaterThan(0);
        const pedido = page
          .waitForRequest((r) => r.method() === 'GET' && new RegExp(`[?&](size|tamanho)=${novo}(&|$)`).test(r.url()), {
            timeout: 10_000,
          })
          .then((r) => r.url(), () => null);
        await page.getByRole('option', { name: String(novo), exact: true }).click();
        const url = await pedido;
        expect.soft(url, `pedido GET com size/tamanho=${novo}`).toBeTruthy();
        if (url) {
          const pagina = new URL(url).searchParams.get('pagina') ?? new URL(url).searchParams.get('page');
          expect.soft(pagina ?? '0', 'o pedido com o novo tamanho volta Ã  1.Âª pÃ¡gina (pagina=0)').toBe('0');
        }
        await pag.esperarResultados();
      });

      await test.step(`A tabela mostra mais de ${atual} linhas e no mÃ¡ximo o novo tamanho`, async () => {
        await expect
          .poll(async () => pag.linhasDados().count(), { message: `nÂº de linhas depois de escolher ${novo} por pÃ¡gina` })
          .toBeGreaterThan(atual);
        expect.soft(await pag.linhasDados().count(), `no mÃ¡ximo ${novo} linhas`).toBeLessThanOrEqual(novo);
        await expect.soft(sel, `o seletor mostra ${novo}`).toContainText(String(novo));
      });
    },
  );
}

/**
 * CT-REG-BUG-20260915-07-<sufixo> â€” o campo de data vem vazio, continua vazio depois de uma
 * pesquisa com outro filtro, e Ã© o `Datepicker` do `@Traceability Suite/ui-react` (sem `input[type=date]`).
 */
export function testeDataVaziaComDatepicker(tela: TelaDadosReferencia, sufixo: string, rotulo: string): void {
  const caso = `CT-REG-BUG-20260915-07-${sufixo}`;
  test(
    `${caso} â€” "${rotulo}" vem vazio, continua vazio depois de pesquisar e usa o Datepicker do design system`,
    metaReg(tela, caso, 'BUG-20260915-07', { integracao: true }),
    async ({ page }) => {
      const pag = new PaginaPesquisaDadosReferencia(page, tela);
      await pag.abrir();
      const campo = pag.campo(rotulo);
      await test.step(`"${rotulo}" vem vazio ao abrir a pÃ¡gina`, async () => {
        await expect.soft(campo, `valor de "${rotulo}" ao abrir`).toHaveValue('');
      });
      await test.step('O campo Ã© o Datepicker Traceability Suite e nÃ£o hÃ¡ nenhum seletor de data nativo', async () => {
        await expect.soft(page.locator('.Traceability SuiteTemplate__content input[type="date"]'), 'input[type=date] na pÃ¡gina').toHaveCount(0);
        await expect.soft(campo, 'placeholder do Datepicker Traceability Suite').toHaveAttribute('placeholder', 'DD/MM/YYYY');
        await expect
          .soft(pag.formulario().getByRole('button', { name: 'Abrir/fechar calendÃ¡rio' }).first(), 'Ã­cone de calendÃ¡rio do Datepicker Traceability Suite')
          .toBeVisible();
      });
      await test.step('Pesquisar com outro filtro vÃ¡lido devolve linhas', async () => {
        await pag.pesquisarComFiltro();
        await expect(pag.linhasDados().first()).toBeVisible();
      });
      await test.step(`"${rotulo}" continua vazio depois de pesquisar`, async () => {
        await expect.soft(campo, `valor de "${rotulo}" depois de pesquisar`).toHaveValue('');
      });
    },
  );
}

/** Aviso do `TabelaComExport` quando se clica em Exportar com a pesquisa ainda a correr. */
export const MSG_PESQUISA_EM_CURSO = 'Aguarde que a pesquisa termine para exportar.';

/**
 * Clica em Exportar e, se a tabela ainda estiver a carregar (aviso "Aguarde que a pesquisa
 * termine para exportar."), espera e volta a clicar â€” atÃ© o pedido `â€¦/exportar` sair.
 */
export async function clicarExportarQuandoPronto(page: Page, botao: Locator): Promise<void> {
  const aguarde = page.getByText(MSG_PESQUISA_EM_CURSO);
  for (let tentativa = 0; tentativa < 10; tentativa++) {
    const pedido = page
      .waitForRequest((r) => /\/exportar/.test(new URL(r.url()).pathname), { timeout: 3_000 })
      .then(() => true, () => false);
    await botao.click();
    if (await pedido) return;
    if (!(await aguarde.isVisible().catch(() => false))) return;
    await page.waitForTimeout(1_500);
  }
}

/** Espera o download depois de clicar em `botao` e verifica: resposta 200 do exportar, `.xlsx` e tamanho > 0. */
export async function exportarDescarregaXlsx(page: Page, botao: Locator): Promise<void> {
  const resposta = page
    .waitForResponse((r) => /\/exportar/.test(new URL(r.url()).pathname), { timeout: 120_000 })
    .then((r) => r.status(), () => null);
  const download = page.waitForEvent('download', { timeout: 120_000 });
  await clicarExportarQuandoPronto(page, botao);
  const d = await download;
  await test.step('O ficheiro descarregado Ã© um .xlsx com conteÃºdo', async () => {
    expect.soft(d.suggestedFilename(), 'nome do ficheiro').toMatch(/\.xlsx$/);
    const caminho = await d.path();
    const tamanho = caminho ? statSync(caminho).size : 0;
    expect.soft(tamanho, 'tamanho do ficheiro (bytes)').toBeGreaterThan(0);
  });
  const estado = await resposta;
  if (estado !== null) expect.soft(estado, 'estado HTTP da resposta do exportar').toBe(200);
}

/**
 * Passo A.1.x â€” conferÃªncia rÃ¡pida do padrÃ£o numa tela: abrir â†’ A01 â†’ pesquisar â†’
 * A07 + A08 â†’ abrir 1 detalhe â†’ A12. Um sÃ³ teste com um `test.step` por sub-passo
 * (verificaÃ§Ãµes `soft`: o relatÃ³rio lista todos os critÃ©rios que falham).
 *
 * Marcado `@pos-deploy`: sÃ³ lÃª (pesquisa com o filtro da prÃ³pria tela + 1 detalhe) e jÃ¡
 * foi validado contra `ccm-dev` â€” Ã© o conjunto `@pos-deploy` (camada `@integracao`).
 */
export function testeConferenciaRapida(
  tela: TelaDadosReferencia,
  opcoes: { listasEmAbas?: boolean } = {},
): void {
  const caso = `CT-DR-${tela.passoA1}`;
  test(
    `${caso} â€” ConferÃªncia rÃ¡pida do padrÃ£o: A01 â†’ pesquisar â†’ A07 + A08 â†’ detalhe â†’ A12`,
    metaDR(tela, caso, { interface: true, posDeploy: true }),
    async ({ page }) => {
      test.slow();
      const pag = new PaginaPesquisaDadosReferencia(page, tela);
      await pag.abrir();

      await test.step('A01 â€” abrir sem pesquisar', async () => {
        await verificarEstadoAntesPesquisa(pag);
      });
      await test.step('Pesquisar', async () => {
        await pag.pesquisarComFiltro();
        await expect(pag.linhasDados().first()).toBeVisible();
      });
      await test.step('A07 â€” grelha de resultados', async () => {
        await verificarGrelhaResultados(pag);
      });
      await test.step('A08 â€” ordenaÃ§Ã£o no servidor', async () => {
        await verificarOrdenacaoServidor(pag, tela.colunaOrdenavel);
      });
      await test.step('Abrir 1 detalhe', async () => {
        await pag.abrirPrimeiroDetalhe();
      });
      await test.step('A12 â€” pÃ¡gina de detalhe', async () => {
        const det = new PaginaDetalheDadosReferencia(page);
        await det.esperarCarregado();
        await verificarPaginaDetalhe(det, opcoes);
      });
    },
  );
}

/** Pesquisa com o filtro da tela, abre o 1.Âº detalhe e devolve o page object do detalhe. */
export async function abrirPrimeiroDetalhe(
  pag: PaginaPesquisaDadosReferencia,
): Promise<PaginaDetalheDadosReferencia> {
  await pag.abrir();
  await pag.pesquisarComFiltro();
  await pag.abrirPrimeiroDetalhe();
  const det = new PaginaDetalheDadosReferencia(pag.page);
  await det.esperarCarregado();
  return det;
}

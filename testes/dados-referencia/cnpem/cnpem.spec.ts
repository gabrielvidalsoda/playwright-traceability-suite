import { expect, test } from '../../fixtures';
import { PaginaPesquisaDadosReferencia } from '../../../paginas/dadosReferencia/PaginaPesquisaDadosReferencia';
import { PaginaDetalheDadosReferencia } from '../../../paginas/dadosReferencia/PaginaDetalheDadosReferencia';
import { CNPEM, filtroDaTela } from '../../../paginas/dadosReferencia/telas';
import {
  naoAplicavel,
  verificarEstadoAntesPesquisa,
  verificarEstadoComoTexto,
  verificarGrelhaResultados,
  verificarOrdenacaoData,
  verificarOrdenacaoLista,
  verificarOrdenacaoServidor,
  verificarPaginaDetalhe,
  verificarPesquisaSemResultado,
} from '../../../paginas/dadosReferencia/padraoUi';
import { metaDR, testeDataVaziaComDatepicker, testeTodasAsColunasOrdenam } from '../apoio-dados-referencia';

/**
 * Roteiro de deploy dos padrÃµes de UI de Dados de ReferÃªncia (PRs front #50/#55,
 * back #31/#34) â€” **Parte A** (padrÃ£o comum, completo na tela de referÃªncia CNPEM)
 * e **B1** (especÃ­fico de CNPEM).
 */
/**
 * Casos cuja verificaÃ§Ã£o depende do backend real (camada `@integracao`): pesquisa sem
 * resultado, ordenaÃ§Ã£o no servidor, exportaÃ§Ã£o XLSX e erro de id invÃ¡lido. O resto da
 * Parte A Ã© `@front` (ver `meta()` em `testes/apoio.ts`).
 */
const CASOS_INTEGRACAO = new Set(['CT-DR-A06', 'CT-DR-A08', 'CT-DR-A09', 'CT-DR-A11', 'CT-DR-A15']);

const tag = (caso: string, tipo: 'positivo' | 'negativo' | 'robustez' = 'positivo') =>
  metaDR(CNPEM, caso, {
    tipo,
    interface: caso === 'CT-DR-A07' || caso === 'CT-DR-A12',
    integracao: CASOS_INTEGRACAO.has(caso),
  });

/** Data de hoje em ISO no fuso da app (Europe/Lisbon). */
const hojeIso = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(new Date());

test.describe('Dados de ReferÃªncia â†’ CNPEM', () => {
  test.describe('Pesquisa', () => {
    let pag: PaginaPesquisaDadosReferencia;
    test.beforeEach(async ({ page }) => {
      pag = new PaginaPesquisaDadosReferencia(page, CNPEM);
      await pag.abrir();
    });

    test('CT-DR-A01 â€” Abrir a URL sem pesquisar: tabela vazia, sem breadcrumb, tÃ­tulo "Pesquisa â€¦"', tag('CT-DR-A01'), async () => {
      await verificarEstadoAntesPesquisa(pag);
    });

    test('CT-DR-A02 â€” FormulÃ¡rio: placeholders, DescriÃ§Ã£o em 2 colunas, data vazia, Pesquisar ativo, Exportar desativado', tag('CT-DR-A02'), async () => {
      await test.step('Os placeholders seguem "Insira o/aâ€¦" ou "Selecione"', async () => {
        const placeholders = await pag.formulario().locator('input:not([type]), input[type="text"]').evaluateAll((els) =>
          els.map((e) => (e as HTMLInputElement).placeholder),
        );
        const fora = placeholders.filter((p) => !/^(Insira (o|a|os|as) |Selecione$|DD\/MM\/YYYY$)/.test(p));
        expect.soft(fora, 'placeholders fora do padrÃ£o').toEqual([]);
        const selects = pag.formulario().getByRole('combobox');
        for (const s of await selects.all()) {
          await expect.soft(s, 'SelectBox com placeholder "Selecione"').toContainText('Selecione');
        }
      });
      await test.step('A DescriÃ§Ã£o ocupa 2 colunas', async () => {
        const descricao = pag.campo('DescriÃ§Ã£o');
        if ((await descricao.count()) === 0) {
          naoAplicavel('CNPEM nÃ£o tem campo "DescriÃ§Ã£o" (o texto livre Ã© "DesignaÃ§Ã£o", numa sÃ³ coluna)');
          return;
        }
        const larg = (await descricao.boundingBox())?.width ?? 0;
        const outro = (await pag.campo(filtroDaTela(CNPEM)!.rotulo).boundingBox())?.width ?? 0;
        expect.soft(larg / outro).toBeGreaterThan(1.8);
      });
      await test.step('A data de referÃªncia vem vazia', async () => {
        await expect.soft(pag.campo('Data de ReferÃªncia')).toHaveValue('');
      });
      await test.step('O botÃ£o Pesquisar estÃ¡ ativo', async () => {
        await expect.soft(pag.botaoPesquisar()).toBeEnabled();
      });
      await test.step('O botÃ£o Exportar estÃ¡ visÃ­vel mas desativado', async () => {
        await expect.soft(pag.botaoExportar()).toBeVisible();
        await expect.soft(pag.botaoExportar()).toBeDisabled();
      });
    });

    test('CT-DR-A03 â€” Escrever um filtro e carregar Enter faz a pesquisa', tag('CT-DR-A03'), async ({ page }) => {
      await pag.preencherFiltro();
      await pag.campo(filtroDaTela(CNPEM)!.rotulo).press('Enter');
      await expect(page).toHaveURL(/[?&]codigo=5/);
      await pag.esperarResultados();
      await expect(pag.linhasDados().first()).toBeVisible();
    });

    test('CT-DR-A04 â€” Limpar devolve todos os campos ao estado inicial', tag('CT-DR-A04'), async ({ page }) => {
      await pag.campo('CÃ³digo CNPEM').fill('51234');
      await pag.campo('DesignaÃ§Ã£o').fill('Paracetamol');
      await pag.campo('Data de ReferÃªncia').fill('01/01/2025');
      await pag.campo('Data de ReferÃªncia').press('Enter');
      await pag.pesquisar();

      await pag.botaoLimpar().click();

      for (const rotulo of ['CÃ³digo CNPEM', 'DesignaÃ§Ã£o', 'Data de ReferÃªncia']) {
        await expect.soft(pag.campo(rotulo), `"${rotulo}" vazio`).toHaveValue('');
      }
      await expect.soft(page, 'filtros saem da URL').toHaveURL(new RegExp(`${CNPEM.rota}$`));
      await expect.soft(pag.linhasDados()).toHaveCount(0);
    });

    test('CT-DR-A05 â€” Pesquisar com a data vazia usa "hoje" e nÃ£o mostra erro de campo obrigatÃ³rio', tag('CT-DR-A05'), async ({ page }) => {
      await test.step('Sem nenhum filtro: comportamento registado (a tela exige 1 critÃ©rio alÃ©m da data)', async () => {
        await pag.botaoPesquisar().click();
        const aviso = pag.alertas();
        if ((await aviso.count()) > 0) {
          naoAplicavel(`CNPEM exige um critÃ©rio alÃ©m da Data de ReferÃªncia: "${(await aviso.first().textContent())?.trim()}"`);
        }
      });
      await test.step('Com um filtro e a data vazia, a pesquisa funciona e usa a data de hoje', async () => {
        await pag.preencherFiltro();
        await expect(pag.campo('Data de ReferÃªncia')).toHaveValue('');
        await pag.pesquisar();
        await expect(page).toHaveURL(new RegExp(`dataReferencia=${hojeIso()}`));
        await expect(pag.linhasDados().first()).toBeVisible();
        await expect(page.getByText(/Data de ReferÃªncia.*obrigat/i)).toHaveCount(0);
      });
    });

    test('CT-DR-A06 â€” Pesquisar um valor inexistente mostra o texto de "pesquisa sem resultado"', tag('CT-DR-A06', 'negativo'), async () => {
      await pag.campo('DesignaÃ§Ã£o').fill('ZZZ999');
      await pag.pesquisar();
      await verificarPesquisaSemResultado(pag);
    });

    test('CT-DR-A07 â€” Grelha apÃ³s pesquisa vÃ¡lida: compacta, zebrada, Ã  esquerda, aÃ§Ãµes na 1.Âª coluna, Exportar ativo', tag('CT-DR-A07'), async () => {
      await pag.pesquisarComFiltro();
      await verificarGrelhaResultados(pag);
    });

    test('CT-DR-A08 â€” Ordenar asc/desc no servidor, cabeÃ§alho estÃ¡vel, pÃ¡gina 2 continua a sequÃªncia', tag('CT-DR-A08'), async () => {
      await pag.pesquisarComFiltro();
      await verificarOrdenacaoServidor(pag, CNPEM.colunaOrdenavel);
    });

    test('CT-DR-A09 â€” Ordenar uma coluna de data segue a ordem cronolÃ³gica', tag('CT-DR-A09'), async () => {
      await pag.pesquisarComFiltro();
      await verificarOrdenacaoData(pag, CNPEM.colunaData!);
    });

    test('CT-DR-A10 â€” Coluna ocultada no seletor continua oculta apÃ³s recarregar (F5)', tag('CT-DR-A10'), async ({ page }) => {
      await pag.pesquisarComFiltro();
      await expect(pag.cabecalho('DCI')).toHaveCount(1);

      await pag.botaoEscolherColunas().click();
      await page.getByRole('checkbox', { name: 'DCI', exact: true }).click();
      await page.keyboard.press('Escape');
      await expect(pag.cabecalho('DCI')).toHaveCount(0);

      await page.reload({ waitUntil: 'domcontentloaded' });
      await pag.esperarResultados();
      await expect(pag.cabecalho(CNPEM.colunaOrdenavel)).toHaveCount(1);
      await expect(pag.cabecalho('DCI'), 'preferÃªncia guardada apÃ³s F5').toHaveCount(0);
    });

    // ValidaÃ§Ã£o manual de 28-09-2026 (F1): nÃ£o Ã© esperado que a exportaÃ§Ã£o siga a ordenaÃ§Ã£o
    // da tabela â€” o teste sÃ³ confirma que Exportar descarrega o XLSX.
    test('CT-DR-A11 â€” Exportar descarrega o XLSX', tag('CT-DR-A11'), async ({ page }) => {
      await pag.pesquisarComFiltro();
      await pag.ordenarPor(CNPEM.colunaOrdenavel, 'ascending');

      const pedido = page.waitForRequest((r) => r.method() === 'POST' && /\/exportar/.test(r.url()));
      const download = page.waitForEvent('download');
      await pag.botaoExportar().click();
      await pedido;
      expect((await download).suggestedFilename()).toMatch(/\.xlsx$/);
    });

    test('CT-DR-A16 â€” Coluna Estado em texto simples, sem badge', tag('CT-DR-A16'), async () => {
      await pag.pesquisarComFiltro();
      const estados = await pag.valoresColuna('Estado');
      expect(estados.length).toBeGreaterThan(0);
      await verificarEstadoComoTexto(pag.page);
    });

    // RegressÃ£o dos itens em "Ready for test" (plano de 09-10-2026).
    testeDataVaziaComDatepicker(CNPEM, 'CNPEM', 'Data de ReferÃªncia');
    testeTodasAsColunasOrdenam(CNPEM, 'CNPEM');
  });

  test.describe('Detalhe', () => {
    let det: PaginaDetalheDadosReferencia;
    test.beforeEach(async ({ page }) => {
      const pag = new PaginaPesquisaDadosReferencia(page, CNPEM);
      await pag.abrir();
      await pag.pesquisarComFiltro();
      await pag.abrirPrimeiroDetalhe();
      det = new PaginaDetalheDadosReferencia(page);
      await det.esperarCarregado();
    });

    test('CT-DR-A12 â€” Detalhe: h1/h2, cabeÃ§alho colapsÃ¡vel com aÃ§Ãµes, listas num cartÃ£o, Voltar no rodapÃ©', tag('CT-DR-A12'), async () => {
      await verificarPaginaDetalhe(det);
    });

    test('CT-DR-A13 â€” CabeÃ§alho e cada painel recolhem e expandem de forma independente', tag('CT-DR-A13'), async () => {
      const paineis = ['Embalagens', 'HistÃ³rico de Embalagens', 'CNPEM Semelhantes', 'Grupos HomogÃ©neos'];
      const titulo = (await det.titulo().textContent())?.trim() ?? '';
      for (const alvo of [titulo, ...paineis]) {
        await test.step(`Recolher e expandir "${alvo}"`, async () => {
          const toggle = det.toggleDoPainel(alvo);
          await toggle.click();
          await expect(toggle).toHaveAttribute('aria-expanded', 'false');
          for (const outro of [titulo, ...paineis].filter((p) => p !== alvo)) {
            await expect.soft(det.toggleDoPainel(outro), `"${outro}" continua expandido`).toHaveAttribute('aria-expanded', 'true');
          }
          await toggle.click();
          await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        });
      }
    });

    test('CT-DR-A16 â€” Estado do detalhe em texto simples, sem badge', tag('CT-DR-A16'), async ({ page }) => {
      await expect(page.getByText('Estado Ã  Data de ReferÃªncia')).toBeVisible();
      await verificarEstadoComoTexto(page);
    });

    test('CT-DR-B1.1 â€” TÃ­tulo "Detalhe CNPEM â€” <cÃ³digo>" e cabeÃ§alho em "IdentificaÃ§Ã£o" e "VigÃªncia e Estado"', tag('CT-DR-B1.1'), async ({ page }) => {
      await expect(det.titulo()).toHaveText(/^Detalhe CNPEM â€” \d+$/);
      await expect.soft(page.getByRole('heading', { level: 2, name: 'IdentificaÃ§Ã£o' })).toBeVisible();
      await expect.soft(page.getByRole('heading', { level: 2, name: 'VigÃªncia e Estado' })).toBeVisible();
    });

    test('CT-DR-B1.2 â€” Embalagens, HistÃ³rico, Semelhantes e Grupos HomogÃ©neos empilhados num Ãºnico cartÃ£o, sem abas', tag('CT-DR-B1.2'), async ({ page }) => {
      await expect(page.getByRole('tab')).toHaveCount(0);
      const e = await det.estrutura();
      const paineis = e.titulos.filter((t) =>
        ['Embalagens', 'HistÃ³rico de Embalagens', 'CNPEM Semelhantes', 'Grupos HomogÃ©neos'].includes(t.texto),
      );
      expect(paineis.map((p) => p.texto)).toEqual([
        'Embalagens',
        'HistÃ³rico de Embalagens',
        'CNPEM Semelhantes',
        'Grupos HomogÃ©neos',
      ]);
      expect(new Set(paineis.map((p) => p.cartao)).size, 'as 4 listas no mesmo cartÃ£o').toBe(1);
    });

    test('CT-DR-B1.3 â€” Ordenar uma coluna em cada uma das 4 listas', tag('CT-DR-B1.3'), async ({ page }) => {
      for (const painel of ['Embalagens', 'HistÃ³rico de Embalagens', 'CNPEM Semelhantes', 'Grupos HomogÃ©neos']) {
        await test.step(`"${painel}" ordena (no servidor)`, async () => {
          await verificarOrdenacaoLista(page, det.tabelaDoPainel(painel), { servidor: true, descricao: painel });
        });
      }
    });
  });

  test.describe('Estados da pÃ¡gina', () => {
    test('CT-DR-A14 â€” Enquanto carrega, aparece o "A carregar..." padrÃ£o', tag('CT-DR-A14'), async ({ page }) => {
      // A resposta pode ser quase imediata; um observer regista o texto mesmo que
      // sÃ³ esteja no DOM por alguns milissegundos.
      await page.addInitScript(() => {
        const w = window as unknown as { __textosVistos: string[] };
        w.__textosVistos = [];
        new MutationObserver(() => {
          const t = document.body?.innerText ?? '';
          if (t.includes('A carregar...')) w.__textosVistos.push('A carregar...');
        }).observe(document, { childList: true, subtree: true, characterData: true });
      });
      const pag = new PaginaPesquisaDadosReferencia(page, CNPEM);
      await pag.abrir();
      await pag.pesquisarComFiltro();
      await pag.abrirPrimeiroDetalhe();
      const det = new PaginaDetalheDadosReferencia(page);
      await det.esperarCarregado();
      const vistos = await page.evaluate(() => (window as unknown as { __textosVistos: string[] }).__textosVistos);
      expect(vistos, 'o texto "A carregar..." apareceu durante o carregamento').toContain('A carregar...');
    });

    // ValidaÃ§Ã£o manual de 28-09-2026 (F2): a ausÃªncia do tÃ­tulo no ramo de erro foi descartada
    // ("ignorar") â€” o teste sÃ³ confirma o erro em Alert.
    test('CT-DR-A15 â€” Id invÃ¡lido: erro num Alert', tag('CT-DR-A15', 'negativo'), async ({ page }) => {
      const det = new PaginaDetalheDadosReferencia(page);
      await det.abrir(`${CNPEM.rota}/999999999`);
      await expect(det.alertas().first(), 'erro apresentado num Alert').toBeVisible();
      await expect.soft(page.locator('.Traceability SuiteTemplate__content tbody'), 'nÃ£o Ã© uma tabela vazia').toHaveCount(0);
    });
  });
});

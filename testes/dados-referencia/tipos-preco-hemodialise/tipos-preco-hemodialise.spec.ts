import { type Page } from '@playwright/test';
import { expect, test } from '../../fixtures';
import { abrirRota } from '../../../paginas/appMock';
import { PaginaPesquisaDadosReferencia } from '../../../paginas/dadosReferencia/PaginaPesquisaDadosReferencia';
import { PaginaDetalheDadosReferencia } from '../../../paginas/dadosReferencia/PaginaDetalheDadosReferencia';
import { TIPOS_PRECO_HEMODIALISE } from '../../../paginas/dadosReferencia/telas';
import {
  FiltroPrecos,
  verificarIntervaloPrecosValido,
  verificarOrdenacaoLista,
  verificarPrecoMaximoInferior,
  verificarPrecoNegativoEDatas,
} from '../../../paginas/dadosReferencia/padraoUi';
import {
  ESCRITA_PERMITIDA,
  MOTIVO_SEM_ESCRITA,
  PaginaFormularioDadosReferencia,
  verificarFormularioVazio,
  verificarMensagemPrecoExcessivo,
  verificarMensagemPrecoExcessivoServidor,
  verificarObrigatoriosEmFalta,
  verificarVoltarSemGravar,
  vigiarEscritas,
} from '../../../paginas/dadosReferencia/formularios';
import {
  abrirPrimeiroDetalhe,
  metaDR,
  metaReg,
  testeConferenciaRapida,
  testeTodasAsColunasOrdenam,
} from '../apoio-dados-referencia';

/**
 * Roteiro de deploy dos padrÃµes de UI de Dados de ReferÃªncia â€” A.1.8, B9 (Tipos de PreÃ§o
 * HemodiÃ¡lise) e a conferÃªncia rÃ¡pida da Parte C (C01, C02, C06) nos 4 formulÃ¡rios.
 * RegressÃ£o dos itens em "Ready for test" (plano de 09-10-2026): BUG-20260915-12 (HD), -24 e
 * -26 (HD; a variante `-HD-API` grava e sÃ³ corre com `DR_PERMITIR_ESCRITA=1`).
 */
const TELA = TIPOS_PRECO_HEMODIALISE;
const LISTAS = ['Lista de PreÃ§os', 'ConvenÃ§Ãµes que Usam Este Tipo', 'Subsistemas HD'];
const ROTA = TELA.rota;

/** Abre o 1.Âº tipo de preÃ§o e devolve o id (da URL do detalhe). */
async function idDoPrimeiroTipo(page: Page): Promise<string> {
  await abrirPrimeiroDetalhe(new PaginaPesquisaDadosReferencia(page, TELA));
  return /\/(\d+)$/.exec(new URL(page.url()).pathname)![1];
}

/** Abre um tipo de preÃ§o com preÃ§os (para os testes de ediÃ§Ã£o de preÃ§o); false se nenhum tiver. */
async function abrirTipoComPrecos(page: Page): Promise<boolean> {
  const pag = new PaginaPesquisaDadosReferencia(page, TELA);
  await pag.abrir();
  await pag.pesquisarComFiltro();
  const n = await pag.botoesVerDetalhe().count();
  for (let i = 0; i < n; i++) {
    if (i > 0) {
      await pag.abrir();
      await pag.pesquisarComFiltro();
    }
    const respostaPrecos = page.waitForResponse((r) => /\/tipos-preco-hemodialise\/\d+\/precos/.test(r.url()));
    await pag.botoesVerDetalhe().nth(i).click();
    const det = new PaginaDetalheDadosReferencia(page);
    await det.esperarCarregado();
    await respostaPrecos;
    await expect(det.tabelaDoPainel('Lista de PreÃ§os').locator('td.Traceability Suite-tablev2-cell-loading')).toHaveCount(0);
    if ((await page.locator('button[aria-label^="Editar preÃ§o"]').count()) > 0) return true;
  }
  return false;
}

test.describe('Dados de ReferÃªncia â†’ Tipos de PreÃ§o HemodiÃ¡lise', () => {
  test.describe('Pesquisa', () => {
    testeConferenciaRapida(TELA);

    test('CT-DR-B9.1 â€” Ver, Editar e Eliminar numa sÃ³ coluna (a 1.Âª)', metaDR(TELA, 'CT-DR-B9.1'), async ({ page }) => {
      const pag = new PaginaPesquisaDadosReferencia(page, TELA);
      await pag.abrir();
      await pag.pesquisarComFiltro();
      await expect(pag.cabecalhos().first()).toHaveAttribute('id', 'actions');
      await expect.soft(pag.cabecalhoAcoes()).toHaveCount(1);
      const acoes = pag.linhasDados().first().locator('td').first().getByRole('button');
      await expect.soft(acoes.and(page.locator('[aria-label^="Ver detalhe"]'))).toHaveCount(1);
      await expect.soft(acoes.and(page.locator('[aria-label^="Editar"]'))).toHaveCount(1);
      await expect.soft(acoes.and(page.locator('[aria-label^="Eliminar"]'))).toHaveCount(1);
    });

    // RegressÃ£o dos itens em "Ready for test" (plano de 09-10-2026).
    testeTodasAsColunasOrdenam(TELA, 'HD');
  });

  test.describe('Novo preÃ§o â€” regressÃ£o', () => {
    test('CT-REG-BUG-20260915-24 â€” O breadcrumb de "Novo preÃ§o" Ã© o do detalhe do tipo de preÃ§o mais o nÃ­vel "Novo preÃ§o", com o detalhe navegÃ¡vel', metaReg(TELA, 'CT-REG-BUG-20260915-24', 'BUG-20260915-24', { integracao: true }), async ({ page }) => {
      const id = await idDoPrimeiroTipo(page);
      const det = new PaginaDetalheDadosReferencia(page);
      let trilhoDetalhe: { texto: string; href: string | null }[] = [];
      let trilhoNovo: { texto: string; href: string | null }[] = [];
      await test.step('Ler o breadcrumb do detalhe do tipo de preÃ§o', async () => {
        trilhoDetalhe = await det.itensBreadcrumb();
        expect(trilhoDetalhe.length, 'nÃ­veis do breadcrumb do detalhe').toBeGreaterThan(0);
      });
      await test.step('Abrir "Novo preÃ§o" desse tipo e ler o breadcrumb', async () => {
        await abrirRota(page, `${ROTA}/${id}/precos/novo`);
        await new PaginaFormularioDadosReferencia(page).esperarCarregado();
        trilhoNovo = await det.itensBreadcrumb();
      });
      test.info().annotations.push({
        type: 'observacao',
        description: `detalhe: ${trilhoDetalhe.map((t) => t.texto).join(' / ')} Â· novo preÃ§o: ${trilhoNovo.map((t) => t.texto).join(' / ')}`,
      });
      await test.step('O breadcrumb de "Novo preÃ§o" = o do detalhe + "Novo preÃ§o"', async () => {
        expect.soft(trilhoNovo.map((t) => t.texto), 'nÃ­veis do breadcrumb de Novo preÃ§o').toEqual([
          ...trilhoDetalhe.map((t) => t.texto),
          'Novo preÃ§o',
        ]);
      });
      await test.step('O nÃ­vel do detalhe, em "Novo preÃ§o", Ã© um link que abre o detalhe', async () => {
        const nivel = trilhoDetalhe.at(-1)?.texto ?? '';
        const link = det.breadcrumb().getByRole('link', { name: nivel, exact: true });
        await expect.soft(link, `"${nivel}" Ã© um link no breadcrumb de Novo preÃ§o`).toBeVisible();
        if (await link.isVisible().catch(() => false)) {
          await link.click();
          await expect.soft(page, 'o link abre o detalhe do tipo de preÃ§o').toHaveURL(new RegExp(`${ROTA}/${id}$`));
        }
      });
    });

    for (const variante of [
      { sufixo: 'HD', camada: 'front' as const },
      { sufixo: 'HD-API', camada: 'integracao' as const },
    ]) {
      const caso = `CT-REG-BUG-20260915-26-${variante.sufixo}`;
      const titulo =
        variante.camada === 'front'
          ? `${caso} â€” PreÃ§o com dÃ­gitos inteiros a mais (555555555555) mostra a mensagem de dÃ­gitos, nÃ£o sÃ³ de decimais (validaÃ§Ã£o no cliente, nada enviado)`
          : `${caso} â€” O servidor rejeita o preÃ§o com dÃ­gitos inteiros a mais com a mensagem certa, e a UI mostra-a (pode gravar)`;
      test(titulo, metaReg(TELA, caso, 'BUG-20260915-26', { tipo: 'negativo', integracao: variante.camada === 'integracao' }), async ({ page }) => {
        if (variante.camada === 'integracao') test.skip(!ESCRITA_PERMITIDA, MOTIVO_SEM_ESCRITA);
        const escritas = variante.camada === 'front' ? await vigiarEscritas(page) : [];
        const id = await idDoPrimeiroTipo(page);
        await abrirRota(page, `${ROTA}/${id}/precos/novo`);
        const form = new PaginaFormularioDadosReferencia(page);
        if (variante.camada === 'front') {
          await verificarMensagemPrecoExcessivo(form, { rotuloPreco: 'PreÃ§o unitÃ¡rio', excessivo: '555555555555', controlo: '1.2345', escritas });
        } else {
          await verificarMensagemPrecoExcessivoServidor(form, { rotuloPreco: 'PreÃ§o unitÃ¡rio', excessivo: 555555555555 });
        }
      });
    }
  });

  test.describe('Detalhe', () => {
    let det: PaginaDetalheDadosReferencia;
    let filtro: FiltroPrecos;
    let pedidos: string[];
    test.beforeEach(async ({ page }) => {
      pedidos = [];
      page.on('request', (r) => {
        if (r.method() === 'GET' && /\/precos\?.*preco(Minimo|Maximo)=/.test(r.url())) pedidos.push(r.url());
      });
      det = await abrirPrimeiroDetalhe(new PaginaPesquisaDadosReferencia(page, TELA));
      filtro = new FiltroPrecos(page, det.corpoDoPainel('Lista de PreÃ§os'));
    });

    test('CT-DR-B9.2 â€” CabeÃ§alho colapsÃ¡vel; PreÃ§os, ConvenÃ§Ãµes e Subsistemas num Ãºnico cartÃ£o e ordenam', metaDR(TELA, 'CT-DR-B9.2', { interface: true }), async ({ page }) => {
      const e = await det.estrutura();
      expect.soft(e.titulos.find((t) => t.nivel === 1)?.colapsavel, 'cabeÃ§alho colapsÃ¡vel').toBe(true);
      const paineis = e.titulos.filter((t) => LISTAS.includes(t.texto));
      expect.soft(paineis.map((p) => p.texto), 'as 3 listas').toEqual(LISTAS);
      expect.soft(new Set(paineis.map((p) => p.cartao)).size, 'num Ãºnico cartÃ£o').toBe(1);
      for (const lista of LISTAS) {
        await test.step(`"${lista}" ordena`, async () => {
          await verificarOrdenacaoLista(page, det.tabelaDoPainel(lista), { servidor: true, descricao: lista });
        });
      }
    });

    test('CT-DR-B9.3 â€” Filtro de preÃ§os: mesmas validaÃ§Ãµes e filtro de Vacinas (B8.4â€“B8.6)', metaDR(TELA, 'CT-DR-B9.3', { integracao: true }), async () => {
      await test.step('B8.4 â€” preÃ§o mÃ¡ximo < mÃ­nimo', async () => {
        await verificarPrecoMaximoInferior(filtro, pedidos);
      });
      await test.step('B8.5 â€” preÃ§o negativo / datas invertidas', async () => {
        await filtro.corpo.getByRole('button', { name: 'Limpar', exact: true }).click();
        await verificarPrecoNegativoEDatas(filtro);
      });
      await test.step('B8.6 â€” intervalo vÃ¡lido', async () => {
        await filtro.corpo.getByRole('button', { name: 'Limpar', exact: true }).click();
        await verificarIntervaloPrecosValido(filtro);
      });
    });
  });

  test.describe('FormulÃ¡rios (Parte C â€” conferÃªncia rÃ¡pida)', () => {
    const formularios = [
      { sufixo: 'HD', nome: 'Novo tipo de preÃ§o', rota: async () => `${ROTA}/novo`, limpar: [] as string[], mensagens: ['Indique a descriÃ§Ã£o do tipo de preÃ§o.'], voltar: new RegExp(`${ROTA}(\\?.*)?$`) },
      { sufixo: 'HD-EDIT', nome: 'Editar tipo de preÃ§o', rota: async (page: Page) => `${ROTA}/${await idDoPrimeiroTipo(page)}/editar`, limpar: ['DescriÃ§Ã£o'], mensagens: ['Indique a descriÃ§Ã£o do tipo de preÃ§o.'], voltar: new RegExp(`${ROTA}(/\\d+)?(\\?.*)?$`) },
      { sufixo: 'HDP', nome: 'Novo preÃ§o', rota: async (page: Page) => `${ROTA}/${await idDoPrimeiroTipo(page)}/precos/novo`, limpar: [] as string[], mensagens: ['Indique o preÃ§o unitÃ¡rio.', 'Indique a data de inÃ­cio.'], voltar: new RegExp(`${ROTA}/\\d+$`) },
      { sufixo: 'HDP-EDIT', nome: 'Editar preÃ§o', rota: null, limpar: ['PreÃ§o unitÃ¡rio', 'Data InÃ­cio'], mensagens: ['Indique o preÃ§o unitÃ¡rio.', 'Indique a data de inÃ­cio.'], voltar: new RegExp(`${ROTA}/\\d+$`) },
    ];

    for (const f of formularios) {
      test.describe(f.nome, () => {
        let form: PaginaFormularioDadosReferencia;
        let escritas: string[];
        test.beforeEach(async ({ page }) => {
          escritas = await vigiarEscritas(page);
          form = new PaginaFormularioDadosReferencia(page);
          if (f.rota) {
            const rota = await f.rota(page);
            await abrirRota(page, rota);
          } else {
            const temPrecos = await abrirTipoComPrecos(page);
            test.skip(!temPrecos, 'nenhum tipo de preÃ§o da pesquisa tem preÃ§os para editar neste ambiente');
            await page.locator('button[aria-label^="Editar preÃ§o"]').first().click();
            await expect(page).toHaveURL(/\/precos\/\d+\/editar$/);
          }
          await form.esperarCarregado();
        });

        test(`CT-DR-C01-${f.sufixo} â€” ${f.nome}: h1, grid padrÃ£o, Guardar ativo, "Voltar" Ã  esquerda`, metaDR(TELA, `CT-DR-C01-${f.sufixo}`, { interface: true }), async () => {
          await verificarFormularioVazio(form);
        });

        test(`CT-DR-C02-${f.sufixo} â€” ${f.nome}: Guardar com obrigatÃ³rios vazios mostra a mensagem de cada campo e nÃ£o envia`, metaDR(TELA, `CT-DR-C02-${f.sufixo}`, { tipo: 'negativo' }), async () => {
          for (const rotulo of f.limpar) await form.campo(rotulo).fill('');
          await verificarObrigatoriosEmFalta(form, f.mensagens, escritas);
        });

        test(`CT-DR-C06-${f.sufixo} â€” ${f.nome}: "Voltar" regressa Ã  tela anterior sem guardar`, metaDR(TELA, `CT-DR-C06-${f.sufixo}`), async () => {
          await verificarVoltarSemGravar(form, f.voltar, escritas);
        });
      });
    }
  });
});

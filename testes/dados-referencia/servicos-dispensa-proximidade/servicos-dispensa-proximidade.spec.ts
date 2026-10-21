import { type Page } from '@playwright/test';
import { expect, test } from '../../fixtures';
import { AMBIENTE } from '../../../dados/massa';
import { abrirRota } from '../../../paginas/appMock';
import { PaginaPesquisaDadosReferencia } from '../../../paginas/dadosReferencia/PaginaPesquisaDadosReferencia';
import { PaginaDetalheDadosReferencia } from '../../../paginas/dadosReferencia/PaginaDetalheDadosReferencia';
import { SERVICOS_DISPENSA_PROXIMIDADE } from '../../../paginas/dadosReferencia/telas';
import {
  FiltroPrecos,
  naoAplicavel,
  verificarIntervaloPrecosValido,
  verificarOrdenacaoLista,
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
  testeResultadosPorPagina,
  testeTodasAsColunasOrdenam,
} from '../apoio-dados-referencia';

/**
 * Roteiro de deploy dos padrÃµes de UI de Dados de ReferÃªncia â€” A.1.9, B10 (ServiÃ§os de
 * Dispensa em Proximidade) e a **Parte C completa** no formulÃ¡rio "Novo serviÃ§o" (+
 * conferÃªncia rÃ¡pida C01/C02/C06 nos formulÃ¡rios de ediÃ§Ã£o e de preÃ§o).
 *
 * C03, C04 e o "Guardar" de C05 gravam no ambiente: sÃ³ correm com `DR_PERMITIR_ESCRITA=1`
 * (ou em mock). Os registos criados usam o prefixo `E2E-DR-` no cÃ³digo.
 *
 * RegressÃ£o dos itens em "Ready for test" (plano de 09-10-2026): BUG-20260915-12 (DP), -13 (DP)
 * e -26 (DP; a variante `-DP-API` grava e sÃ³ corre com `DR_PERMITIR_ESCRITA=1`).
 */
const TELA = SERVICOS_DISPENSA_PROXIMIDADE;
const ROTA = TELA.rota;
const MSG_SERVICO = ['Indique o cÃ³digo do serviÃ§o.', 'Indique a descriÃ§Ã£o.', 'Indique o IVA.'];
const MSG_PRECO = ['Indique o preÃ§o.', 'Indique a data de inÃ­cio.'];

/** CÃ³digo de um serviÃ§o com preÃ§os (em dev sÃ³ os registos de teste tÃªm preÃ§os). */
const CODIGO_COM_PRECOS = AMBIENTE === 'mock' ? 'DP' : 'teste';

/** Abre o detalhe de um serviÃ§o com preÃ§os e espera a lista de preÃ§os. */
async function abrirServicoComPrecos(page: Page): Promise<PaginaDetalheDadosReferencia> {
  const pag = new PaginaPesquisaDadosReferencia(page, TELA);
  await pag.abrir();
  await pag.campo('CÃ³digo serviÃ§o').fill(CODIGO_COM_PRECOS);
  await pag.pesquisar();
  await pag.abrirPrimeiroDetalhe();
  const d = new PaginaDetalheDadosReferencia(page);
  await d.esperarCarregado();
  await expect(d.tabelaDoPainel('Lista de PreÃ§os').locator('td.Traceability Suite-tablev2-cell-loading')).toHaveCount(0);
  return d;
}

async function idDoPrimeiroServico(page: Page): Promise<string> {
  await abrirPrimeiroDetalhe(new PaginaPesquisaDadosReferencia(page, TELA));
  return /\/(\d+)$/.exec(new URL(page.url()).pathname)![1];
}

test.describe('Dados de ReferÃªncia â†’ ServiÃ§os Dispensa em Proximidade', () => {
  test.describe('Pesquisa', () => {
    testeConferenciaRapida(TELA);

    test('CT-DR-B10.1 â€” AÃ§Ãµes numa sÃ³ coluna; coluna IVA alinhada Ã  esquerda', metaDR(TELA, 'CT-DR-B10.1'), async ({ page }) => {
      const pag = new PaginaPesquisaDadosReferencia(page, TELA);
      await pag.abrir();
      await pag.pesquisarComFiltro();
      await expect.soft(pag.cabecalhos().first()).toHaveAttribute('id', 'actions');
      await expect.soft(pag.cabecalhoAcoes()).toHaveCount(1);
      const acoes = pag.linhasDados().first().locator('td').first().getByRole('button');
      await expect.soft(acoes, 'Ver, Editar e Eliminar na mesma cÃ©lula').toHaveCount(3);
      const alinhamento = await pag.tabela().evaluate((t) => {
        const idx = Array.from(t.querySelectorAll('thead th')).findIndex((th) => th.getAttribute('abbr') === 'IVA (%)');
        const td = t.querySelector('tbody tr')?.querySelectorAll('td')[idx];
        return td ? getComputedStyle(td).textAlign : null;
      });
      expect.soft(['left', 'start'], 'coluna IVA Ã  esquerda').toContain(alinhamento);
    });

    // RegressÃ£o dos itens em "Ready for test" (plano de 09-10-2026).
    testeTodasAsColunasOrdenam(TELA, 'DP');
    testeResultadosPorPagina(TELA, 'DP');
  });

  test.describe('Novo preÃ§o â€” regressÃ£o', () => {
    for (const variante of [
      { sufixo: 'DP', camada: 'front' as const },
      { sufixo: 'DP-API', camada: 'integracao' as const },
    ]) {
      const caso = `CT-REG-BUG-20260915-26-${variante.sufixo}`;
      const titulo =
        variante.camada === 'front'
          ? `${caso} â€” PreÃ§o com dÃ­gitos inteiros a mais (555555555555) mostra a mensagem de dÃ­gitos, nÃ£o sÃ³ de decimais (validaÃ§Ã£o no cliente, nada enviado)`
          : `${caso} â€” O servidor rejeita o preÃ§o com dÃ­gitos inteiros a mais com a mensagem certa, e a UI mostra-a (pode gravar)`;
      test(titulo, metaReg(TELA, caso, 'BUG-20260915-26', { tipo: 'negativo', integracao: variante.camada === 'integracao' }), async ({ page }) => {
        if (variante.camada === 'integracao') test.skip(!ESCRITA_PERMITIDA, MOTIVO_SEM_ESCRITA);
        const escritas = variante.camada === 'front' ? await vigiarEscritas(page) : [];
        // ServiÃ§o "teste" de dev (o do relatÃ³rio de origem); em mock, o cÃ³digo "DP" do seed.
        await abrirServicoComPrecos(page);
        const id = /\/(\d+)$/.exec(new URL(page.url()).pathname)![1];
        await abrirRota(page, `${ROTA}/${id}/precos/novo`);
        const form = new PaginaFormularioDadosReferencia(page);
        if (variante.camada === 'front') {
          await verificarMensagemPrecoExcessivo(form, { rotuloPreco: 'PreÃ§o', excessivo: '555555555555', controlo: '1.234', escritas });
        } else {
          await verificarMensagemPrecoExcessivoServidor(form, { rotuloPreco: 'PreÃ§o', excessivo: 555555555555 });
        }
      });
    }
  });

  test.describe('Detalhe', () => {
    let det: PaginaDetalheDadosReferencia;
    test.beforeEach(async ({ page }) => {
      det = await abrirPrimeiroDetalhe(new PaginaPesquisaDadosReferencia(page, TELA));
    });

    test('CT-DR-B10.2 â€” CabeÃ§alho colapsÃ¡vel; Lista de PreÃ§os, Locais Autorizados e ConvenÃ§Ãµes Habilitadas sÃ£o painÃ©is', metaDR(TELA, 'CT-DR-B10.2', { interface: true }), async () => {
      const e = await det.estrutura();
      expect.soft(e.titulos.find((t) => t.nivel === 1)?.colapsavel, 'cabeÃ§alho colapsÃ¡vel').toBe(true);
      for (const painel of ['Lista de PreÃ§os', 'Locais Autorizados', 'ConvenÃ§Ãµes Habilitadas']) {
        expect.soft(e.titulos.find((t) => t.texto === painel)?.colapsavel, `"${painel}" Ã© um painel colapsÃ¡vel`).toBe(true);
      }
    });

    test('CT-DR-B10.3 â€” Ordenar Locais (autorizado, datas) e ConvenÃ§Ãµes (NIF, prestador, datas)', metaDR(TELA, 'CT-DR-B10.3'), async ({ page }) => {
      for (const coluna of ['Autorizado', 'Data InÃ­cio', 'Data Fim']) {
        await test.step(`Locais Autorizados â†’ "${coluna}"`, async () => {
          await verificarOrdenacaoLista(page, det.tabelaDoPainel('Locais Autorizados'), { coluna, servidor: true });
        });
      }
      const convencoes = det.tabelaDoPainel('ConvenÃ§Ãµes Habilitadas');
      if ((await convencoes.locator('thead th[abbr="NIF"]').count()) === 0) {
        naoAplicavel('a tabela "ConvenÃ§Ãµes Habilitadas" nÃ£o tem coluna NIF (ordena-se "CÃ³digo ConvenÃ§Ã£o")');
      }
      for (const coluna of ['NIF', 'CÃ³digo ConvenÃ§Ã£o', 'Prestador', 'Data InÃ­cio', 'Data Fim']) {
        if (coluna === 'NIF' && (await convencoes.locator('thead th[abbr="NIF"]').count()) === 0) continue;
        await test.step(`ConvenÃ§Ãµes Habilitadas â†’ "${coluna}"`, async () => {
          await verificarOrdenacaoLista(page, convencoes, { coluna, servidor: true });
        });
      }
    });

    test('CT-DR-B10.4 â€” O filtro de preÃ§os filtra a lista de preÃ§os', metaDR(TELA, 'CT-DR-B10.4', { integracao: true }), async ({ page }) => {
      const comPrecos = await abrirServicoComPrecos(page);
      await verificarIntervaloPrecosValido(new FiltroPrecos(page, comPrecos.corpoDoPainel('Lista de PreÃ§os')));
    });
  });

  test.describe('FormulÃ¡rios (Parte C)', () => {
    test.describe('Novo serviÃ§o (formulÃ¡rio completo)', () => {
      let form: PaginaFormularioDadosReferencia;
      test.beforeEach(async ({ page }) => {
        form = new PaginaFormularioDadosReferencia(page);
      });

      test('CT-DR-C01 â€” FormulÃ¡rio vazio: h1, grid padrÃ£o, Guardar ativo, "Voltar" Ã  esquerda', metaDR(TELA, 'CT-DR-C01', { interface: true }), async ({ page }) => {
        await vigiarEscritas(page);
        await abrirRota(page, `${ROTA}/novo`);
        await verificarFormularioVazio(form);
      });

      test('CT-DR-C02 â€” Guardar com obrigatÃ³rios vazios: mensagem por campo, nada enviado', metaDR(TELA, 'CT-DR-C02', { tipo: 'negativo' }), async ({ page }) => {
        const escritas = await vigiarEscritas(page);
        await abrirRota(page, `${ROTA}/novo`);
        await verificarObrigatoriosEmFalta(form, MSG_SERVICO, escritas);
      });

      test('CT-DR-C03 â€” Duplo clique rÃ¡pido em Guardar cria sÃ³ 1 registo', metaDR(TELA, 'CT-DR-C03', { integracao: true, tipo: 'robustez' }), async ({ page }) => {
        test.skip(!ESCRITA_PERMITIDA, MOTIVO_SEM_ESCRITA);
        const codigo = `E2E-DR-${Date.now()}`;
        const posts: string[] = [];
        page.on('request', (r) => {
          if (r.method() === 'POST' && new RegExp(`/api${ROTA}$`).test(new URL(r.url()).pathname.replace('/ccmsns', ''))) posts.push(r.url());
        });
        await abrirRota(page, `${ROTA}/novo`);
        await form.esperarCarregado();
        await form.campo('CÃ³digo').fill(codigo);
        await form.campo('DescriÃ§Ã£o').fill('ServiÃ§o criado pelo teste E2E (duplo clique)');
        await form.campo('IVA (%)').fill('6');
        await form.botaoGuardar().dblclick();
        await expect(page).toHaveURL(new RegExp(`${ROTA}(\\?.*)?$`));
        expect.soft(posts.length, 'pedidos de criaÃ§Ã£o enviados').toBe(1);

        // Pesquisa na lista para onde a app voltou (sem recarregar: em mock o MSW perde os dados).
        const pag = new PaginaPesquisaDadosReferencia(page, TELA);
        await expect(pag.botaoPesquisar()).toBeVisible();
        await pag.campo('CÃ³digo serviÃ§o').fill(codigo);
        await pag.pesquisar();
        await expect(pag.linhasDados(), `sÃ³ 1 serviÃ§o "${codigo}" na lista`).toHaveCount(1);
      });

      test('CT-DR-C04 â€” Erro do servidor (cÃ³digo duplicado) aparece num Alert no topo do formulÃ¡rio', metaDR(TELA, 'CT-DR-C04', { integracao: true, tipo: 'negativo' }), async ({ page }) => {
        test.skip(!ESCRITA_PERMITIDA, MOTIVO_SEM_ESCRITA);
        const pag = new PaginaPesquisaDadosReferencia(page, TELA);
        await pag.abrir();
        await pag.pesquisarComFiltro();
        const existente = (await pag.valoresColuna('CÃ³digo'))[0];
        await abrirRota(page, `${ROTA}/novo`);
        await form.esperarCarregado();
        await form.campo('CÃ³digo').fill(existente);
        await form.campo('DescriÃ§Ã£o').fill('Duplicado propositado (teste E2E)');
        await form.campo('IVA (%)').fill('6');
        await form.botaoGuardar().click();
        await expect(form.alertaErro().first(), 'erro do servidor num Alert').toBeVisible();
        const alerta = await form.alertaErro().first().boundingBox();
        const primeiroCampo = await form.campo('CÃ³digo').boundingBox();
        if ((alerta?.y ?? 0) > (primeiroCampo?.y ?? 0)) {
          test.info().annotations.push({
            type: 'observacao',
            description: 'o Alert do erro aparece abaixo dos campos (junto aos botÃµes), nÃ£o no topo do formulÃ¡rio como diz o roteiro',
          });
        }
      });

      test('CT-DR-C06 â€” "Voltar" regressa Ã  tela anterior sem guardar', metaDR(TELA, 'CT-DR-C06'), async ({ page }) => {
        const escritas = await vigiarEscritas(page);
        await abrirRota(page, `${ROTA}/novo`);
        await form.esperarCarregado();
        await form.campo('CÃ³digo').fill('NAO-GRAVAR');
        await verificarVoltarSemGravar(form, new RegExp(`${ROTA}(\\?.*)?$`), escritas);
      });
    });

    test.describe('Editar serviÃ§o', () => {
      let form: PaginaFormularioDadosReferencia;
      let escritas: string[];
      test.beforeEach(async ({ page }) => {
        escritas = ESCRITA_PERMITIDA ? [] : await vigiarEscritas(page);
        form = new PaginaFormularioDadosReferencia(page);
        await abrirRota(page, `${ROTA}/${await idDoPrimeiroServico(page)}/editar`);
        await form.esperarCarregado();
      });

      test('CT-DR-C05 â€” Editar abre o formulÃ¡rio preenchido e Guardar funciona', metaDR(TELA, 'CT-DR-C05', { integracao: true }), async ({ page }) => {
        for (const rotulo of ['CÃ³digo', 'DescriÃ§Ã£o', 'IVA (%)']) {
          await expect.soft(form.campo(rotulo), `"${rotulo}" preenchido`).not.toHaveValue('');
        }
        if (!ESCRITA_PERMITIDA) {
          naoAplicavel(`"Guardar" nÃ£o executado: ${MOTIVO_SEM_ESCRITA}`);
          return;
        }
        // Guarda sem alteraÃ§Ãµes (PUT com os mesmos valores): nÃ£o muda o registo.
        await form.botaoGuardar().click();
        await expect(form.alertaErro()).toHaveCount(0);
        await expect(page).not.toHaveURL(/\/editar$/);
      });

      test('CT-DR-C01-DP-EDIT â€” Editar serviÃ§o: h1, grid padrÃ£o, Guardar ativo, "Voltar" Ã  esquerda', metaDR(TELA, 'CT-DR-C01-DP-EDIT', { interface: true }), async () => {
        await verificarFormularioVazio(form);
      });

      test('CT-DR-C02-DP-EDIT â€” Editar serviÃ§o: obrigatÃ³rios apagados mostram as mensagens e nada Ã© enviado', metaDR(TELA, 'CT-DR-C02-DP-EDIT', { tipo: 'negativo' }), async ({ page }) => {
        const envios = ESCRITA_PERMITIDA ? await vigiarEscritas(page) : escritas;
        for (const rotulo of ['CÃ³digo', 'DescriÃ§Ã£o', 'IVA (%)']) await form.campo(rotulo).fill('');
        await verificarObrigatoriosEmFalta(form, MSG_SERVICO, envios);
      });

      test('CT-DR-C06-DP-EDIT â€” Editar serviÃ§o: "Voltar" sem guardar', metaDR(TELA, 'CT-DR-C06-DP-EDIT'), async ({ page }) => {
        const envios = ESCRITA_PERMITIDA ? await vigiarEscritas(page) : escritas;
        await verificarVoltarSemGravar(form, new RegExp(`${ROTA}(/\\d+)?(\\?.*)?$`), envios);
      });
    });

    test.describe('Novo preÃ§o', () => {
      let form: PaginaFormularioDadosReferencia;
      let escritas: string[];
      test.beforeEach(async ({ page }) => {
        escritas = await vigiarEscritas(page);
        form = new PaginaFormularioDadosReferencia(page);
        await abrirRota(page, `${ROTA}/${await idDoPrimeiroServico(page)}/precos/novo`);
        await form.esperarCarregado();
      });

      test('CT-DR-C01-DPP â€” Novo preÃ§o: h1, grid padrÃ£o, Guardar ativo, "Voltar" Ã  esquerda', metaDR(TELA, 'CT-DR-C01-DPP', { interface: true }), async () => {
        await verificarFormularioVazio(form);
      });
      test('CT-DR-C02-DPP â€” Novo preÃ§o: obrigatÃ³rios vazios mostram as mensagens e nada Ã© enviado', metaDR(TELA, 'CT-DR-C02-DPP', { tipo: 'negativo' }), async () => {
        await verificarObrigatoriosEmFalta(form, MSG_PRECO, escritas);
      });
      test('CT-DR-C06-DPP â€” Novo preÃ§o: "Voltar" regressa ao detalhe sem guardar', metaDR(TELA, 'CT-DR-C06-DPP'), async () => {
        await verificarVoltarSemGravar(form, new RegExp(`${ROTA}/\\d+$`), escritas);
      });
    });

    test.describe('Editar preÃ§o', () => {
      let form: PaginaFormularioDadosReferencia;
      let escritas: string[];
      test.beforeEach(async ({ page }) => {
        escritas = await vigiarEscritas(page);
        form = new PaginaFormularioDadosReferencia(page);
        await abrirServicoComPrecos(page);
        const editar = page.locator('button[aria-label^="Editar preÃ§o"]').first();
        test.skip((await editar.count()) === 0, 'o serviÃ§o nÃ£o tem preÃ§os para editar neste ambiente');
        await editar.click();
        await expect(page).toHaveURL(/\/precos\/\d+\/editar$/);
        await form.esperarCarregado();
      });

      test('CT-DR-C01-DPP-EDIT â€” Editar preÃ§o: h1, grid padrÃ£o, Guardar ativo, "Voltar" Ã  esquerda', metaDR(TELA, 'CT-DR-C01-DPP-EDIT', { interface: true }), async () => {
        await verificarFormularioVazio(form);
      });
      test('CT-DR-C02-DPP-EDIT â€” Editar preÃ§o: obrigatÃ³rios apagados mostram as mensagens e nada Ã© enviado', metaDR(TELA, 'CT-DR-C02-DPP-EDIT', { tipo: 'negativo' }), async () => {
        for (const rotulo of ['PreÃ§o', 'Data InÃ­cio']) await form.campo(rotulo).fill('');
        await verificarObrigatoriosEmFalta(form, MSG_PRECO, escritas);
      });
      test('CT-DR-C06-DPP-EDIT â€” Editar preÃ§o: "Voltar" regressa ao detalhe sem guardar', metaDR(TELA, 'CT-DR-C06-DPP-EDIT'), async () => {
        await verificarVoltarSemGravar(form, new RegExp(`${ROTA}/\\d+$`), escritas);
      });
    });
  });
});


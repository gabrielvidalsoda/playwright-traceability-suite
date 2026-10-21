import { type Page } from '@playwright/test';
import { expect, test } from '../../fixtures';
import { abrirRota } from '../../../paginas/appMock';
import { PaginaPesquisaDadosReferencia } from '../../../paginas/dadosReferencia/PaginaPesquisaDadosReferencia';
import type { PaginaDetalheDadosReferencia } from '../../../paginas/dadosReferencia/PaginaDetalheDadosReferencia';
import { PATOLOGIAS_TERMAIS } from '../../../paginas/dadosReferencia/telas';
import { verificarOrdenacaoLista } from '../../../paginas/dadosReferencia/padraoUi';
import {
  PaginaFormularioDadosReferencia,
  verificarFormularioVazio,
  verificarObrigatoriosEmFalta,
  verificarVoltarSemGravar,
  vigiarEscritas,
} from '../../../paginas/dadosReferencia/formularios';
import {
  abrirPrimeiroDetalhe,
  metaDR,
  testeConferenciaRapida,
  testeTodasAsColunasOrdenam,
} from '../apoio-dados-referencia';

/**
 * Roteiro de deploy dos padrÃµes de UI de Dados de ReferÃªncia â€” A.1.11, B12 (Patologias
 * Termais) e a conferÃªncia rÃ¡pida da Parte C (C01, C02, C06) nos 4 formulÃ¡rios.
 * O detalhe usa abas (TÃ©cnicas associadas / CondiÃ§Ãµes clÃ­nicas / ComparticipaÃ§Ã£o).
 */
const TELA = PATOLOGIAS_TERMAIS;
const ROTA = TELA.rota;
const MSG_PATOLOGIA = ['Indique o cÃ³digo da patologia.', 'Indique a descriÃ§Ã£o.'];
const MSG_TECNICA = ['Escolha a tÃ©cnica.', 'Indique a data de inÃ­cio.'];

async function idDaPrimeiraPatologia(page: Page): Promise<string> {
  await abrirPrimeiroDetalhe(new PaginaPesquisaDadosReferencia(page, TELA));
  return /\/(\d+)$/.exec(new URL(page.url()).pathname)![1];
}

test.describe('Dados de ReferÃªncia â†’ Patologias Termais', () => {
  test.describe('Pesquisa', () => {
    testeConferenciaRapida(TELA, { listasEmAbas: true });

    test('CT-DR-B12.1 â€” As aÃ§Ãµes estÃ£o numa sÃ³ coluna', metaDR(TELA, 'CT-DR-B12.1'), async ({ page }) => {
      const pag = new PaginaPesquisaDadosReferencia(page, TELA);
      await pag.abrir();
      await pag.pesquisarComFiltro();
      await expect.soft(pag.cabecalhos().first()).toHaveAttribute('id', 'actions');
      await expect.soft(pag.cabecalhoAcoes()).toHaveCount(1);
      await expect.soft(pag.linhasDados().first().locator('td').first().getByRole('button'), 'Ver, Editar e Eliminar na mesma cÃ©lula').toHaveCount(3);
    });

    // RegressÃ£o dos itens em "Ready for test" (plano de 09-10-2026).
    testeTodasAsColunasOrdenam(TELA, 'PAT');
  });

  test.describe('Detalhe', () => {
    let det: PaginaDetalheDadosReferencia;
    test.beforeEach(async ({ page }) => {
      det = await abrirPrimeiroDetalhe(new PaginaPesquisaDadosReferencia(page, TELA));
    });

    test('CT-DR-B12.2 â€” CabeÃ§alho h1, abas no padrÃ£o e "Associar tÃ©cnica" alinhado', metaDR(TELA, 'CT-DR-B12.2', { interface: true }), async ({ page }) => {
      const e = await det.estrutura();
      expect.soft(e.titulos.filter((t) => t.nivel === 1).length, 'um h1').toBe(1);
      expect.soft(e.abas.map((a) => a.rotulo), 'abas').toEqual(
        expect.arrayContaining(['TÃ©cnicas associadas', 'CondiÃ§Ãµes clÃ­nicas']),
      );
      expect.soft(new Set(e.abas.map((a) => a.cartao)).size, 'abas num Ãºnico cartÃ£o').toBe(1);
      const botao = await page.getByRole('button', { name: 'Associar tÃ©cnica', exact: true }).boundingBox();
      const campo = await det.conteudo().getByRole('textbox', { name: 'CÃ³digo tÃ©cnica', exact: true }).boundingBox();
      expect(botao && campo, '"Associar tÃ©cnica" e o campo "CÃ³digo tÃ©cnica" visÃ­veis').toBeTruthy();
      expect
        .soft(Math.abs((botao!.y + botao!.height / 2) - (campo!.y + campo!.height / 2)), 'botÃ£o centrado na linha do campo (Â±4 px)')
        .toBeLessThanOrEqual(4);
    });

    test('CT-DR-B12.3 â€” "CondiÃ§Ãµes clÃ­nicas" ordena', metaDR(TELA, 'CT-DR-B12.3'), async ({ page }) => {
      await page.getByRole('tab', { name: 'CondiÃ§Ãµes clÃ­nicas' }).click();
      await verificarOrdenacaoLista(page, det.conteudo().locator('[role="tabpanel"]:visible table, table:visible').first(), {
        servidor: true,
        descricao: 'CondiÃ§Ãµes clÃ­nicas',
      });
    });
  });

  test.describe('FormulÃ¡rios (Parte C â€” conferÃªncia rÃ¡pida)', () => {
    const formularios = [
      { sufixo: 'PAT', nome: 'Nova patologia', abrir: async () => `${ROTA}/novo`, limpar: [] as string[], mensagens: MSG_PATOLOGIA, voltar: new RegExp(`${ROTA}(\\?.*)?$`) },
      { sufixo: 'PAT-EDIT', nome: 'Editar patologia', abrir: async (page: Page) => `${ROTA}/${await idDaPrimeiraPatologia(page)}/editar`, limpar: ['CÃ³digo', 'DescriÃ§Ã£o'], mensagens: MSG_PATOLOGIA, voltar: new RegExp(`${ROTA}(/\\d+)?(\\?.*)?$`) },
      { sufixo: 'TEC', nome: 'Associar tÃ©cnica', abrir: async (page: Page) => `${ROTA}/${await idDaPrimeiraPatologia(page)}/tecnicas/novo`, limpar: [] as string[], mensagens: MSG_TECNICA, voltar: new RegExp(`${ROTA}/\\d+$`) },
      { sufixo: 'TEC-EDIT', nome: 'Editar associaÃ§Ã£o de tÃ©cnica', abrir: null, limpar: ['Data InÃ­cio'], mensagens: ['Indique a data de inÃ­cio.'], voltar: new RegExp(`${ROTA}/\\d+$`) },
    ];

    for (const f of formularios) {
      test.describe(f.nome, () => {
        let form: PaginaFormularioDadosReferencia;
        let escritas: string[];
        test.beforeEach(async ({ page }) => {
          escritas = await vigiarEscritas(page);
          form = new PaginaFormularioDadosReferencia(page);
          if (f.abrir) {
            await abrirRota(page, await f.abrir(page));
          } else {
            await idDaPrimeiraPatologia(page);
            const editar = page.locator('button[aria-label^="Editar associaÃ§Ã£o da tÃ©cnica"]').first();
            await expect(page.locator('td.Traceability Suite-tablev2-cell-loading')).toHaveCount(0);
            test.skip((await editar.count()) === 0, 'a patologia nÃ£o tem tÃ©cnicas associadas neste ambiente');
            await editar.click();
            await expect(page).toHaveURL(/\/tecnicas\/\d+\/editar$/);
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

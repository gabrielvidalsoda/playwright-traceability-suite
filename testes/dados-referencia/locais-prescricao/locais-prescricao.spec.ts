import { expect, test } from '../../fixtures';
import { PaginaPesquisaDadosReferencia } from '../../../paginas/dadosReferencia/PaginaPesquisaDadosReferencia';
import type { PaginaDetalheDadosReferencia } from '../../../paginas/dadosReferencia/PaginaDetalheDadosReferencia';
import { LOCAIS_PRESCRICAO } from '../../../paginas/dadosReferencia/telas';
import {
  naoAplicavel,
  verificarEstadoComoTexto,
  verificarOrdenacaoLista,
  verificarOrdenacaoServidor,
} from '../../../paginas/dadosReferencia/padraoUi';
import {
  abrirPrimeiroDetalhe,
  exportarDescarregaXlsx,
  metaDR,
  metaReg,
  testeConferenciaRapida,
  testeDataVaziaComDatepicker,
  testeTodasAsColunasOrdenam,
} from '../apoio-dados-referencia';

/**
 * Roteiro de deploy dos padrões de UI de Dados de Referência — A.1.5 e B6 (Locais de Prescrição).
 * Regressão dos itens em "Ready for test" (plano de 09-10-2026): BUG-20260915-07 (LOC), -09,
 * -12 (LOC) e -16 (LOC, LOC-DET).
 */
const TELA = LOCAIS_PRESCRICAO;

/** Código do local sem prefixo de letras nem zeros à esquerda (`normalizarCodigoLocal` do `ccmsns-ui`). */
const normalizarCodigo = (v: string) => v.trim().replace(/^[A-Za-z]+/, '').replace(/^0+/, '');

/**
 * Garante que a coluna está visível (pode estar oculta no "Escolher colunas"); devolve o nome
 * do cabeçalho encontrado, ou `null` se a tabela não tiver nenhuma coluna com esse nome.
 */
async function garantirColuna(pag: PaginaPesquisaDadosReferencia, nome: RegExp): Promise<string | null> {
  const procurar = async () =>
    (await pag.cabecalhos().evaluateAll((ths) => ths.map((th) => th.getAttribute('abbr') ?? ''))).find((a) => nome.test(a)) ??
    null;
  const visivel = await procurar();
  if (visivel) return visivel;
  if ((await pag.botaoEscolherColunas().count()) === 0) return null;
  await pag.botaoEscolherColunas().click();
  const opcao = pag.page.getByRole('checkbox', { name: nome });
  if ((await opcao.count()) === 0) {
    await pag.page.keyboard.press('Escape');
    return null;
  }
  await opcao.first().check();
  await pag.page.keyboard.press('Escape');
  return procurar();
}
const BLOCOS = ['ARS', 'ACES', 'Convenções Associadas', 'Autorizações', 'Centros de Custo Associados', 'Habilitações Específicas'];

test.describe('Dados de Referência → Locais de Prescrição', () => {
  test.describe('Pesquisa', () => {
    testeConferenciaRapida(TELA);

    test('CT-DR-B6.1 — "Autorizado para" no grid de filtros, tabela com título, data de referência vazia', metaDR(TELA, 'CT-DR-B6.1'), async ({ page }) => {
      const pag = new PaginaPesquisaDadosReferencia(page, TELA);
      await pag.abrir();
      await test.step('"Autorizado para" está dentro do grid de filtros', async () => {
        const mesmoGrid = await pag.formulario().evaluate((form) => {
          const rotulo = Array.from(form.querySelectorAll('*')).find((e) => e.childElementCount === 0 && e.textContent?.trim() === 'Autorizado para');
          const campo = form.querySelector('input:not([type]), input[type="text"]');
          const grid = (el: Element | null | undefined) => {
            let x = el?.parentElement ?? null;
            while (x && getComputedStyle(x).display !== 'grid') x = x.parentElement;
            return x;
          };
          const g = grid(rotulo);
          return !!g && !!campo && g.contains(campo);
        });
        expect.soft(mesmoGrid, '"Autorizado para" e os outros filtros partilham a mesma grelha').toBe(true);
      });
      await test.step('A tabela tem título', async () => {
        await expect.soft(page.getByText('Resultados da Pesquisa', { exact: true })).toBeVisible();
      });
      await test.step('A data de referência vem vazia', async () => {
        await expect.soft(pag.campo('Data de Referência')).toHaveValue('');
      });
    });

    test('CT-DR-B6.2 — Ordenar por SNS e por Ativo', metaDR(TELA, 'CT-DR-B6.2', { integracao: true }), async ({ page }) => {
      const pag = new PaginaPesquisaDadosReferencia(page, TELA);
      await pag.abrir();
      await pag.pesquisarComFiltro();
      for (const coluna of ['SNS', 'Ativo']) {
        await test.step(`Ordenar por "${coluna}"`, async () => {
          await verificarOrdenacaoServidor(pag, coluna);
        });
      }
    });

    testeDataVaziaComDatepicker(TELA, 'LOC', 'Data de Referência');
    testeTodasAsColunasOrdenam(TELA, 'LOC');

    test('CT-REG-BUG-20260915-09 — Cada filtro aplicado tem uma coluna correspondente e todas as linhas mostram o valor filtrado', metaReg(TELA, 'CT-REG-BUG-20260915-09', 'BUG-20260915-09', { integracao: true }), async ({ page }) => {
      test.slow();
      const pag = new PaginaPesquisaDadosReferencia(page, TELA);
      let codigo = '';
      await test.step('Obter um código de local da massa (1.ª linha da pesquisa da tela)', async () => {
        await pag.abrir();
        await pag.pesquisarComFiltro();
        codigo = (await pag.valoresColuna('Cód. Local'))[0] ?? '';
        expect(codigo, 'código do local da 1.ª linha').toBeTruthy();
      });

      const filtros: {
        filtro: string;
        valor: string;
        coluna: RegExp;
        aplicar: () => Promise<void>;
        corresponde: (celula: string) => boolean;
      }[] = [
        {
          filtro: 'Código do Local',
          valor: codigo,
          coluna: /^Cód\. Local$/,
          aplicar: async () => pag.campo('Código do Local').fill(codigo),
          corresponde: (c) => normalizarCodigo(c).includes(normalizarCodigo(codigo)),
        },
        {
          filtro: 'Local SNS',
          valor: 'Sim',
          coluna: /^SNS$/,
          aplicar: async () => {
            await pag.seletor('Local SNS').click();
            await page.getByRole('option', { name: 'Sim', exact: true }).click();
          },
          corresponde: (c) => c === 'Sim',
        },
        {
          filtro: 'Estado',
          valor: 'Ativos',
          coluna: /^Ativo$/,
          aplicar: async () => {
            await pag.seletor('Estado').click();
            await page.getByRole('option', { name: 'Ativos', exact: true }).click();
          },
          corresponde: (c) => c === 'Sim',
        },
        {
          filtro: 'Autorizado para',
          valor: 'MCDT',
          coluna: /Autoriza/i,
          aplicar: async () => page.getByRole('checkbox', { name: 'MCDT', exact: true }).check(),
          corresponde: (c) => /MCDT/.test(c),
        },
      ];

      for (const f of filtros) {
        await test.step(`Pesquisar só com "${f.filtro}" = ${f.filtro === 'Código do Local' ? codigo : f.valor}: a coluna correspondente mostra esse valor em todas as linhas`, async () => {
          await pag.abrir();
          await f.aplicar();
          await pag.pesquisar();
          if ((await pag.linhasDados().count()) === 0) {
            naoAplicavel(`"${f.filtro}" = ${f.valor}: a pesquisa não devolveu linhas em dev`);
            return;
          }
          const coluna = await garantirColuna(pag, f.coluna);
          expect.soft(coluna, `coluna da tabela correspondente ao filtro "${f.filtro}"`).not.toBeNull();
          if (!coluna) return;
          const valores = await pag.valoresColuna(coluna);
          const fora = valores.filter((v) => !f.corresponde(v));
          expect.soft(fora, `linhas cuja coluna "${coluna}" não corresponde a "${f.filtro}" (${valores.length} linhas lidas)`).toEqual([]);
        });
      }
    });

    test('CT-REG-BUG-20260915-16-LOC — Exportar (pesquisa) descarrega o XLSX', metaReg(TELA, 'CT-REG-BUG-20260915-16-LOC', 'BUG-20260915-16', { integracao: true }), async ({ page }) => {
      const pag = new PaginaPesquisaDadosReferencia(page, TELA);
      await pag.abrir();
      await pag.pesquisarComFiltro();
      await exportarDescarregaXlsx(page, pag.botaoExportar());
    });
  });

  test.describe('Detalhe', () => {
    let det: PaginaDetalheDadosReferencia;
    test.beforeEach(async ({ page }) => {
      det = await abrirPrimeiroDetalhe(new PaginaPesquisaDadosReferencia(page, TELA));
    });

    test('CT-DR-B6.3 — Breadcrumb com o rótulo novo, cabeçalho h1 com "Exportar Excel" no topo, Voltar no rodapé', metaDR(TELA, 'CT-DR-B6.3', { interface: true }), async () => {
      await expect.soft(det.breadcrumb()).toContainText('Detalhe do Local de Prescrição');
      const e = await det.estrutura();
      const h1 = e.titulos.filter((t) => t.nivel === 1);
      expect.soft(h1.length, 'um h1').toBe(1);
      const exportar = e.botoes.find((b) => b.rotulo === 'Exportar Excel');
      expect.soft(exportar, 'botão "Exportar Excel"').toBeDefined();
      expect.soft(exportar?.cartao, '"Exportar Excel" no cartão do cabeçalho').toBe(h1[0]?.cartao);
      const voltar = e.botoes.find((b) => b.rotulo === 'Voltar');
      expect.soft(voltar?.cartao, '"Voltar" fora dos cartões').toBe(-1);
      expect.soft(voltar?.topo ?? 0, '"Voltar" no rodapé').toBeGreaterThanOrEqual(e.fundoUltimoCartao);
    });

    test('CT-DR-B6.4 — Os 6 blocos são tabelas padrão colapsáveis e ordenáveis; vigência em texto', metaDR(TELA, 'CT-DR-B6.4'), async ({ page }) => {
      const e = await det.estrutura();
      for (const bloco of BLOCOS) {
        await test.step(`"${bloco}"`, async () => {
          const t = e.titulos.find((x) => x.texto === bloco);
          expect.soft(t, `bloco "${bloco}" presente`).toBeDefined();
          expect.soft(t?.colapsavel, `"${bloco}" colapsável`).toBe(true);
          await expect.soft(det.tabelaDoPainel(bloco), `"${bloco}" é uma tabela`).toBeVisible();
          await verificarOrdenacaoLista(page, det.tabelaDoPainel(bloco), { descricao: bloco });
        });
      }
      await test.step('A vigência aparece como texto, sem chip', async () => {
        await verificarEstadoComoTexto(page);
      });
    });

    test('CT-DR-B6.5 — "Exportar Excel" descarrega o XLSX', metaDR(TELA, 'CT-DR-B6.5', { integracao: true }), async ({ page }) => {
      const download = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Exportar Excel' }).click();
      expect((await download).suggestedFilename()).toMatch(/\.xlsx$/);
    });

    test('CT-REG-BUG-20260915-16-LOC-DET — "Exportar Excel" do detalhe descarrega o XLSX', metaReg(TELA, 'CT-REG-BUG-20260915-16-LOC-DET', 'BUG-20260915-16', { integracao: true }), async ({ page }) => {
      await exportarDescarregaXlsx(page, page.getByRole('button', { name: 'Exportar Excel' }));
    });
  });
});

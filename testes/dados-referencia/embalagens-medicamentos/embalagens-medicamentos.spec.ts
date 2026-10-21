import { type Page } from '@playwright/test';
import { expect, test } from '../../fixtures';
import { AMBIENTE } from '../../../dados/massa';
import { abrirRota } from '../../../paginas/appMock';
import {
  MSG_ANTES_PESQUISA,
  PaginaPesquisaDadosReferencia,
} from '../../../paginas/dadosReferencia/PaginaPesquisaDadosReferencia';
import { PaginaDetalheDadosReferencia } from '../../../paginas/dadosReferencia/PaginaDetalheDadosReferencia';
import { CONVENCOES, EMBALAGENS_MEDICAMENTOS } from '../../../paginas/dadosReferencia/telas';
import { naoAplicavel, verificarOrdenacaoLista } from '../../../paginas/dadosReferencia/padraoUi';
import {
  abrirPrimeiroDetalhe,
  clicarExportarQuandoPronto,
  exportarDescarregaXlsx,
  metaDR,
  metaReg,
  testeConferenciaRapida,
  testeTodasAsColunasOrdenam,
} from '../apoio-dados-referencia';

/**
 * Roteiro de deploy dos padrÃµes de UI de Dados de ReferÃªncia â€” A.1.3 e B4
 * (Embalagens e Medicamentos: pesquisa por modo, detalhe da embalagem e de produto).
 * RegressÃ£o dos itens em "Ready for test" (plano de 09-10-2026): BUG-20260928-01 (nos casos
 * B4.1/B4.2), BUG-20260915-12 (EMB), BUG-20260915-16 (EMB, ERRO-UI) e TASK-20260928-02.
 */
const TELA = EMBALAGENS_MEDICAMENTOS;

/**
 * Modos de pesquisa (checkboxes de `FormularioPesquisa.tsx`) e um nome que devolve linhas em dev.
 * TÃ­tulos confirmados no DEV a 13-10-2026 ("SubstÃ¢ncias Manipuladas" passou a iniciais maiÃºsculas).
 */
const MODOS = [
  { checkbox: 'DiabÃ©tico', sufixo: 'DIAB', titulo: 'Pesquisa â€” DiabÃ©ticos', nome: 'agu' },
  { checkbox: 'DietÃ©tico', sufixo: 'DIET', titulo: 'Pesquisa â€” DietÃ©ticos', nome: 'lei' },
  { checkbox: 'Subs. Manipulada', sufixo: 'SUBS', titulo: 'Pesquisa â€” SubstÃ¢ncias Manipuladas', nome: 'aci' },
] as const;

/** Filtros que sÃ³ existem no modo Embalagens. */
const SO_EMBALAGENS = ['DenominaÃ§Ã£o DCI', 'CNPEM', 'Titular AIM'];

const modo = (page: Page, rotulo: string) => page.getByRole('checkbox', { name: rotulo, exact: true });

test.describe('Dados de ReferÃªncia â†’ Embalagens e Medicamentos', () => {
  test.describe('Pesquisa', () => {
    testeConferenciaRapida(TELA);

    for (const [i, m] of MODOS.entries()) {
      const caso = i === 0 ? 'CT-DR-B4.1' : `CT-DR-B4.2-${m.sufixo}`;
      test(`${caso} â€” Trocar para ${m.checkbox}: filtros de embalagem limpos, sem resultados antigos antes da nova pesquisa e a pesquisa nÃ£o exige CNPEM`, metaDR(TELA, caso, { bug: 'BUG-20260928-01' }), async ({ page }) => {
        const pag = new PaginaPesquisaDadosReferencia(page, TELA);
        await pag.abrir();
        await pag.campo('Nome Medicamento').fill('paracetamol');
        await pag.campo('DenominaÃ§Ã£o DCI').fill('Paracetamol');
        await pag.pesquisar();
        await expect(pag.linhasDados().first()).toBeVisible();

        await modo(page, m.checkbox).check();
        await expect(pag.titulo()).toHaveText(m.titulo);
        await test.step('Os resultados da pesquisa anterior nÃ£o aparecem antes de uma nova pesquisa', async () => {
          await expect.soft(pag.linhasDados()).toHaveCount(0);
          await expect.soft(pag.textoTabelaVazia()).toHaveText(MSG_ANTES_PESQUISA);
        });
        // ValidaÃ§Ã£o manual de 28-09-2026 (F6): depois de trocar de modo, a pesquisa exige
        // preencher CNPEM, mas o campo CNPEM fica oculto nesse modo.
        await test.step(`Pesquisar no modo ${m.checkbox} nÃ£o exige o CNPEM (campo oculto)`, async () => {
          await pag.campo('Nome Produto').fill(m.nome);
          await pag.botaoPesquisar().click();
          await expect.soft(pag.formulario().getByText(/CNPEM/i), 'nenhum erro de validaÃ§Ã£o sobre o CNPEM').toHaveCount(0);
          await expect.soft(pag.alertas().filter({ hasText: /CNPEM/i }), 'nenhum Alert a pedir o CNPEM').toHaveCount(0);
          await expect.soft(pag.linhasDados().first(), 'a pesquisa devolve resultados').toBeVisible();
        });
        await test.step('Os filtros sÃ³ de embalagens sÃ£o limpos', async () => {
          for (const rotulo of SO_EMBALAGENS) {
            await expect.soft(pag.campo(rotulo), `"${rotulo}" escondido no modo ${m.checkbox}`).toHaveCount(0);
          }
          await modo(page, m.checkbox).uncheck();
          // Desde a TASK-20260928-02 o tÃ­tulo do modo Embalagens usa o nome do menu (DEV, 13-10-2026).
          await expect(pag.titulo()).toHaveText(/^Pesquisa .*Embalagens/);
          await expect.soft(pag.campo('DenominaÃ§Ã£o DCI'), 'ao voltar a Embalagens o filtro estÃ¡ vazio').toHaveValue('');
        });
      });
    }

    test('CT-DR-B4.3 â€” Cada modo guarda a sua preferÃªncia de colunas', metaDR(TELA, 'CT-DR-B4.3'), async ({ page }) => {
      const pag = new PaginaPesquisaDadosReferencia(page, TELA);
      await pag.abrir();
      const ocultar = async (coluna: string) => {
        await pag.botaoEscolherColunas().click();
        await page.getByRole('checkbox', { name: coluna, exact: true }).click();
        await page.keyboard.press('Escape');
        await expect(pag.cabecalho(coluna)).toHaveCount(0);
      };
      const pesquisarModo = async (checkbox: 'DiabÃ©tico' | null, nome: string) => {
        if (checkbox) await modo(page, checkbox).check();
        else await modo(page, 'DiabÃ©tico').uncheck();
        await pag.campo(checkbox ? 'Nome Produto' : 'Nome Medicamento').fill(nome);
        await pag.pesquisar();
      };
      await test.step('Ocultar "DCI" no modo Embalagens', async () => {
        await pesquisarModo(null, 'paracetamol');
        await ocultar('DCI');
      });
      await test.step('No modo DiabÃ©tico as colunas sÃ£o as dele (todas visÃ­veis); ocultar "CÃ³digo"', async () => {
        await pesquisarModo('DiabÃ©tico', 'agu');
        await expect(pag.cabecalho('Nome do Produto')).toHaveCount(1);
        await expect.soft(pag.cabecalho('CÃ³digo')).toHaveCount(1);
        await ocultar('CÃ³digo');
      });
      await test.step('Voltar a Embalagens recarrega a preferÃªncia de Embalagens', async () => {
        await pesquisarModo(null, 'paracetamol');
        await expect(pag.cabecalho('Nome do medicamento')).toHaveCount(1);
        await expect.soft(pag.cabecalho('DCI'), '"DCI" continua oculta em Embalagens').toHaveCount(0);
      });
      await test.step('E DiabÃ©tico mantÃ©m a sua', async () => {
        await pesquisarModo('DiabÃ©tico', 'agu');
        await expect(pag.cabecalho('Nome do Produto')).toHaveCount(1);
        await expect.soft(pag.cabecalho('CÃ³digo'), '"CÃ³digo" continua oculta em DiabÃ©tico').toHaveCount(0);
      });
    });

    test('CT-DR-B4.4 â€” Exportar sempre visÃ­vel, sÃ³ ativo depois da pesquisa', metaDR(TELA, 'CT-DR-B4.4'), async ({ page }) => {
      const pag = new PaginaPesquisaDadosReferencia(page, TELA);
      await pag.abrir();
      await expect.soft(pag.botaoExportar(), 'antes: visÃ­vel').toBeVisible();
      await expect.soft(pag.botaoExportar(), 'antes: desativado').toBeDisabled();
      await pag.pesquisarComFiltro();
      await expect.soft(pag.botaoExportar(), 'depois: ativo').toBeEnabled();
    });

    testeTodasAsColunasOrdenam(TELA, 'EMB');

    test('CT-REG-BUG-20260915-16-EMB â€” Exportar descarrega o XLSX', metaReg(TELA, 'CT-REG-BUG-20260915-16-EMB', 'BUG-20260915-16', { integracao: true }), async ({ page }) => {
      const pag = new PaginaPesquisaDadosReferencia(page, TELA);
      await pag.abrir();
      await pag.pesquisarComFiltro();
      await exportarDescarregaXlsx(page, pag.botaoExportar());
    });

    test('CT-REG-BUG-20260915-16-ERRO-UI â€” Se o exportar falhar (500), aparece uma mensagem de erro e a consola nÃ£o tem rejeiÃ§Ãµes por tratar', metaReg(TELA, 'CT-REG-BUG-20260915-16-ERRO-UI', 'BUG-20260915-16', { tipo: 'negativo' }), async ({ page }) => {
      if (AMBIENTE === 'mock') {
        naoAplicavel('em mock o MSW responde antes do page.route â€” a falha do exportar nÃ£o Ã© simulÃ¡vel');
        return;
      }
      const erros: string[] = [];
      page.on('pageerror', (e) => erros.push(`${e.name}: ${e.message}`));
      page.on('console', (m) => {
        if (m.type() === 'error' && /Uncaught|HttpError|unhandled/i.test(m.text())) erros.push(m.text());
      });
      await page.route('**/exportar**', (rota) =>
        rota.request().method() === 'POST'
          ? rota.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ detail: 'Erro simulado pelo teste E2E' }) })
          : rota.fallback(),
      );
      const pag = new PaginaPesquisaDadosReferencia(page, TELA);
      await pag.abrir();
      await pag.pesquisarComFiltro();
      await test.step('Clicar em Exportar com o servidor a responder 500', async () => {
        const pedido = page.waitForRequest((r) => r.method() === 'POST' && /\/exportar/.test(r.url()), { timeout: 30_000 });
        await clicarExportarQuandoPronto(page, pag.botaoExportar());
        await pedido;
      });
      await test.step('Aparece uma mensagem de erro visÃ­vel ("NÃ£o foi possÃ­vel exportarâ€¦")', async () => {
        const mensagem = page
          .locator('.Traceability SuiteTemplate__content')
          .getByText(/nÃ£o foi possÃ­vel exportar/i)
          .or(page.locator('[role="alert"]').filter({ hasText: /export|erro/i }));
        await expect.soft(mensagem.first(), 'mensagem de erro do exportar').toBeVisible();
      });
      await test.step('A consola nÃ£o regista rejeiÃ§Ãµes/erros por tratar', async () => {
        await page.waitForTimeout(500);
        expect.soft(erros, 'erros nÃ£o tratados na pÃ¡gina').toEqual([]);
      });
    });

    test('CT-REG-TASK-20260928-02 â€” Aberto pelo menu, o tÃ­tulo da pesquisa Ã© "Pesquisa" + o nome do item de menu', metaReg(TELA, 'CT-REG-TASK-20260928-02', 'TASK-20260928-02'), async ({ page }) => {
      // Parte de outra tela de Dados de ReferÃªncia, para o grupo do menu jÃ¡ estar aberto.
      await abrirRota(page, CONVENCOES.rota);
      const item = page
        .locator(`a[role="menuitem"][href$="${TELA.rota}"]`)
        .or(page.getByRole('menuitem', { name: 'Embalagens e Medicamentos', exact: true }))
        .first();
      let nomeMenu = '';
      await test.step('Ler o nome do item de menu', async () => {
        await expect(item, 'item de menu "Embalagens e Medicamentos"').toBeAttached({ timeout: 30_000 });
        nomeMenu = ((await item.textContent()) ?? '').trim();
        expect(nomeMenu, 'texto do item de menu').toBeTruthy();
      });
      const pag = new PaginaPesquisaDadosReferencia(page, TELA);
      await test.step('Abrir a pesquisa pelo item de menu', async () => {
        await item.click({ timeout: 10_000 }).catch(() => item.dispatchEvent('click'));
        await expect(page).toHaveURL(new RegExp(`${TELA.rota}(\\?.*)?$`));
        await expect(pag.botaoPesquisar()).toBeVisible();
      });
      await test.step('O tÃ­tulo usa o nome do item de menu', async () => {
        await expect.soft(pag.titulo(), `o tÃ­tulo contÃ©m o nome do menu "${nomeMenu}"`).toContainText(nomeMenu);
      });
      await test.step('O tÃ­tulo Ã© exatamente "Pesquisa <nome do item de menu>", como nas outras pesquisas de Dados de ReferÃªncia', async () => {
        await expect.soft(pag.titulo(), `tÃ­tulo esperado: "Pesquisa ${nomeMenu}"`).toHaveText(`Pesquisa ${nomeMenu}`);
      });
    });
  });

  test.describe('Detalhe', () => {
    test('CT-DR-B4.5 â€” Detalhe da embalagem: identificaÃ§Ã£o e 10 listas colapsam cada uma por si e ordenam; Voltar no rodapÃ©', metaDR(TELA, 'CT-DR-B4.5', { interface: true }), async ({ page }) => {
      test.slow();
      const det = await abrirPrimeiroDetalhe(new PaginaPesquisaDadosReferencia(page, TELA));
      const e = await det.estrutura();
      const titulo = e.titulos.find((t) => t.nivel === 1)!.texto;
      const listas = e.titulos.filter((t) => t.nivel === 2 && t.colapsavel).map((t) => t.texto);
      expect.soft(listas.length, `10 listas (${listas.join(', ')})`).toBe(10);

      for (const alvo of [titulo, ...listas]) {
        await test.step(`"${alvo}" recolhe e expande sozinho`, async () => {
          const toggle = det.toggleDoPainel(alvo);
          await toggle.click();
          await expect.soft(toggle).toHaveAttribute('aria-expanded', 'false');
          const outros = [titulo, ...listas].filter((x) => x !== alvo);
          for (const o of outros) {
            await expect.soft(det.toggleDoPainel(o), `"${o}" continua expandido`).toHaveAttribute('aria-expanded', 'true');
          }
          await toggle.click();
          await expect.soft(toggle).toHaveAttribute('aria-expanded', 'true');
        });
      }
      for (const lista of listas) {
        await test.step(`"${lista}" ordena`, async () => {
          await verificarOrdenacaoLista(page, det.tabelaDoPainel(lista), { descricao: lista });
        });
      }
      await test.step('"Voltar" no rodapÃ©', async () => {
        const voltar = e.botoes.find((b) => b.rotulo === 'Voltar');
        expect.soft(voltar?.cartao, '"Voltar" fora dos cartÃµes').toBe(-1);
        expect.soft(voltar?.topo ?? 0, '"Voltar" abaixo do Ãºltimo cartÃ£o').toBeGreaterThanOrEqual(e.fundoUltimoCartao);
      });
    });

    for (const m of MODOS) {
      test(`CT-DR-B4.6-${m.sufixo} â€” Detalhe de produto (${m.checkbox}): cartÃ£o padrÃ£o, datas dd/mm/aaaa, sem ID interno`, metaDR(TELA, `CT-DR-B4.6-${m.sufixo}`), async ({ page }) => {
        const pag = new PaginaPesquisaDadosReferencia(page, TELA);
        await pag.abrir();
        await modo(page, m.checkbox).check();
        await pag.campo('Nome Produto').fill(m.nome);
        await pag.pesquisar();
        if ((await pag.linhasDados().count()) === 0) {
          naoAplicavel(`sem produtos "${m.nome}" no modo ${m.checkbox} neste ambiente`);
          return;
        }
        await pag.abrirPrimeiroDetalhe();
        const det = new PaginaDetalheDadosReferencia(page);
        await det.esperarCarregado();
        const e = await det.estrutura();
        const h1 = e.titulos.find((t) => t.nivel === 1);
        expect.soft(h1?.cartao, 'tÃ­tulo dentro de um cartÃ£o').toBeGreaterThanOrEqual(0);
        expect.soft(h1?.colapsavel, 'cartÃ£o padrÃ£o colapsÃ¡vel').toBe(true);
        const texto = (await det.conteudo().innerText()).replace(/\s+/g, ' ');
        expect.soft(texto, 'sem datas ISO cruas').not.toMatch(/\d{4}-\d{2}-\d{2}/);
        expect.soft(texto, 'datas em dd/mm/aaaa').toMatch(/\d{2}\/\d{2}\/\d{4}/);
        await expect.soft(det.conteudo().getByText(/^ID( interno)?$/), 'o ID interno nÃ£o aparece').toHaveCount(0);
      });
    }
  });
});

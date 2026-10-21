import { expect, test } from '../../fixtures';
import { abrirRota } from '../../../paginas/appMock';
import { PaginaPesquisaDadosReferencia } from '../../../paginas/dadosReferencia/PaginaPesquisaDadosReferencia';
import { PaginaDetalheDadosReferencia } from '../../../paginas/dadosReferencia/PaginaDetalheDadosReferencia';
import { DIPLOMAS } from '../../../paginas/dadosReferencia/telas';
import { naoAplicavel } from '../../../paginas/dadosReferencia/padraoUi';
import {
  ESCRITA_PERMITIDA,
  MOTIVO_SEM_ESCRITA,
  MSG_DIPLOMA_OBRIGATORIOS,
  PaginaFormularioDiploma,
  diplomaDeTeste,
  verificarObrigatoriosEmFalta,
  vigiarEscritas,
} from '../../../paginas/dadosReferencia/formularios';
import {
  metaDR,
  metaReg,
  testeDataVaziaComDatepicker,
  testeTodasAsColunasOrdenam,
} from '../apoio-dados-referencia';

/**
 * Roteiro de deploy dos padrÃµes de UI de Dados de ReferÃªncia â€” B13 (Diplomas / Despachos:
 * sÃ³ ajustes pontuais â€” cor dos Ã­cones de aÃ§Ã£o e botÃ£o "Adicionar" secundÃ¡rio).
 *
 * Estilo dos botÃµes Traceability Suite no DOM: `primary` = fundo na cor primÃ¡ria; `secondary` = fundo
 * transparente com texto na cor primÃ¡ria.
 *
 * RegressÃ£o dos itens em "Ready for test" (plano de 09-10-2026): BUG-20260915-04, -07 (DIP),
 * -12 (DIP), -14 (DIP), -21 e -22.
 */
const TELA = DIPLOMAS;
const TRANSPARENTE = 'rgba(0, 0, 0, 0)';

/** POST de criaÃ§Ã£o de diploma (`diplomas.service.ts`: `POST /dados-referencia/diplomas`). */
const POST_CRIAR_DIPLOMA = /^POST .*\/api\/dados-referencia\/diplomas$/;

test.describe('Dados de ReferÃªncia â†’ Diplomas / Despachos', () => {
  test('CT-DR-B13.1 â€” Ãcones de aÃ§Ã£o na cor primÃ¡ria e botÃ£o "Adicionar" com o estilo secundÃ¡rio', metaDR(TELA, 'CT-DR-B13.1', { interface: true }), async ({ page }) => {
    const pag = new PaginaPesquisaDadosReferencia(page, TELA);
    await pag.abrir();
    // Cor primÃ¡ria de referÃªncia: texto do botÃ£o terciÃ¡rio "Limpar" (fora de hover).
    const primaria = await pag.botaoLimpar().evaluate((b) => getComputedStyle(b).color);
    await pag.pesquisarComFiltro();
    await page.mouse.move(0, 0);

    await test.step('Os Ã­cones de aÃ§Ã£o usam a cor primÃ¡ria', async () => {
      const cores = await pag
        .tabela()
        .locator('tbody button[aria-label]')
        .evaluateAll((bs) => bs.map((b) => `${b.getAttribute('aria-label')}=${getComputedStyle(b).color}`));
      expect(cores.length, 'hÃ¡ Ã­cones de aÃ§Ã£o').toBeGreaterThan(0);
      expect.soft(cores.filter((c) => !c.endsWith(`=${primaria}`)), `Ã­cones fora da cor primÃ¡ria (${primaria})`).toEqual([]);
    });

    await test.step('"Adicionar diploma" (pesquisa): estilo registado para confirmaÃ§Ã£o', async () => {
      // A PR #55 passou a secundÃ¡rio o "Adicionar" da utilizaÃ§Ã£o (detalhe, verificado abaixo);
      // o "Adicionar diploma" da pesquisa Ã© outro botÃ£o â€” regista-se o estilo sem falhar.
      const fundo = await page
        .getByRole('button', { name: 'Adicionar diploma', exact: true })
        .evaluate((b) => getComputedStyle(b).backgroundColor);
      if (fundo !== TRANSPARENTE) {
        test.info().annotations.push({
          type: 'observacao',
          description: `"Adicionar diploma" (pesquisa) Ã© primÃ¡rio (fundo ${fundo}); confirmar se o roteiro B13.1 se refere a este botÃ£o ou ao "Adicionar" do detalhe`,
        });
      }
    });

    await test.step('"Adicionar" (utilizaÃ§Ã£o, no detalhe) com o estilo secundÃ¡rio', async () => {
      await pag.abrirPrimeiroDetalhe();
      const det = new PaginaDetalheDadosReferencia(page);
      await expect(det.conteudo().getByText('A carregar...')).toHaveCount(0);
      const adicionar = det.conteudo().getByRole('button', { name: 'Adicionar', exact: true });
      if ((await adicionar.count()) === 0) {
        naoAplicavel('o detalhe deste diploma nÃ£o mostra o botÃ£o "Adicionar" (utilizaÃ§Ã£o)');
        return;
      }
      const fundo = await adicionar.first().evaluate((b) => getComputedStyle(b).backgroundColor);
      expect.soft(fundo, '"Adicionar" (utilizaÃ§Ã£o) secundÃ¡rio').toBe(TRANSPARENTE);
    });
  });

  test.describe('Pesquisa', () => {
    test('CT-REG-BUG-20260915-04 â€” "SituaÃ§Ã£o" abre em "Selecione", sem opÃ§Ã£o escolhida, e nÃ£o entra no URL', metaReg(TELA, 'CT-REG-BUG-20260915-04', 'BUG-20260915-04'), async ({ page }) => {
      const pag = new PaginaPesquisaDadosReferencia(page, TELA);
      await pag.abrir();
      const situacao = pag.seletor('SituaÃ§Ã£o');
      await test.step('"SituaÃ§Ã£o" mostra "Selecione" ao abrir a pÃ¡gina', async () => {
        const texto = (await situacao.innerText()).trim();
        expect.soft(texto, 'texto do campo "SituaÃ§Ã£o" ao abrir').toContain('Selecione');
        expect.soft(texto, '"SituaÃ§Ã£o" sem opÃ§Ã£o prÃ©-selecionada').not.toMatch(/Vigentes|Expirados/);
      });
      await test.step('O URL da pÃ¡gina nÃ£o leva situacao=', async () => {
        expect.soft(page.url(), 'URL ao abrir').not.toMatch(/[?&]situacao=/);
      });
      await test.step('Pesquisar sÃ³ com a DescriÃ§Ã£o nÃ£o aplica nenhuma situaÃ§Ã£o por omissÃ£o', async () => {
        const pedido = page
          .waitForRequest((r) => r.method() === 'GET' && /\/api\/dados-referencia\/diplomas\?/.test(r.url()), { timeout: 15_000 })
          .then((r) => r.url(), () => '');
        await pag.pesquisarComFiltro();
        expect.soft(page.url(), 'URL depois de pesquisar').not.toMatch(/[?&]situacao=/);
        expect.soft(await pedido, 'pedido de pesquisa ao servidor').not.toMatch(/[?&]situacao=/);
        expect.soft((await situacao.innerText()).trim(), '"SituaÃ§Ã£o" continua em "Selecione"').toContain('Selecione');
      });
    });

    testeDataVaziaComDatepicker(TELA, 'DIP', 'Vigente em');
    testeTodasAsColunasOrdenam(TELA, 'DIP');
  });

  test.describe('Detalhe', () => {
    test('CT-REG-BUG-20260915-14-DIP â€” "Filtrar" as embalagens abrangidas sem preencher o campo mostra uma mensagem do que falta', metaReg(TELA, 'CT-REG-BUG-20260915-14-DIP', 'BUG-20260915-14', { tipo: 'negativo' }), async ({ page }) => {
      const pag = new PaginaPesquisaDadosReferencia(page, TELA);
      await pag.abrir();
      await pag.pesquisarComFiltro();
      await pag.abrirPrimeiroDetalhe();
      const det = new PaginaDetalheDadosReferencia(page);
      const corpo = det.corpoDoPainel('Embalagens Abrangidas');
      const filtro = corpo.getByRole('textbox', { name: 'Filtro rÃ¡pido', exact: true });
      await expect(filtro, 'campo "Filtro rÃ¡pido" da secÃ§Ã£o Embalagens Abrangidas').toBeVisible();
      await expect(corpo.locator('td.Traceability Suite-tablev2-cell-loading')).toHaveCount(0);
      await expect(filtro).toHaveValue('');

      const pedidos: string[] = [];
      page.on('request', (r) => {
        if (r.method() === 'GET' && /\/diplomas\/\d+\/embalagens/.test(r.url())) pedidos.push(r.url());
      });
      await test.step('Clicar em "Filtrar" com o campo vazio mostra uma mensagem a dizer o que falta preencher', async () => {
        await corpo.getByRole('button', { name: 'Filtrar', exact: true }).click();
        const mensagem = corpo
          .locator('[role="alert"], .MuiAlert-root, .Mui-error')
          .or(corpo.getByText(/preencher|indique|obrigat|pelo menos/i));
        await expect.soft(mensagem.first(), 'mensagem de campo em falta junto ao filtro').toBeVisible();
      });
      await test.step('Pedidos enviados ao servidor com o filtro vazio (registados)', async () => {
        await page.waitForTimeout(1_000);
        test.info().annotations.push({
          type: 'observacao',
          description: `pedidos GET â€¦/embalagens depois de "Filtrar" vazio: ${pedidos.length}${pedidos.length ? ` (${pedidos[0]})` : ''}`,
        });
      });
    });
  });

  test.describe('FormulÃ¡rio "Adicionar Diploma"', () => {
    test('CT-REG-BUG-20260915-21 â€” Preencher os campos e sair de cada um com Tab nÃ£o mostra erro nem envia nada antes de Guardar', metaReg(TELA, 'CT-REG-BUG-20260915-21', 'BUG-20260915-21', { tipo: 'robustez' }), async ({ page }) => {
      const escritas = await vigiarEscritas(page);
      const form = new PaginaFormularioDiploma(page);
      await abrirRota(page, PaginaFormularioDiploma.ROTA);
      await form.esperarCarregado();
      const dados = diplomaDeTeste();
      for (const c of form.campos(dados)) {
        await test.step(`Preencher "${c.rotulo}" e sair do campo nÃ£o mostra "NÃ£o foi possÃ­vel criar o diploma."`, async () => {
          if (c.data) {
            const campo = form.campo(c.rotulo);
            await campo.click();
            await campo.pressSequentially(c.valor);
            await campo.press('Tab');
          } else {
            await form.campo(c.rotulo).fill(c.valor);
            await form.campo(c.rotulo).press('Tab');
          }
          await page.waitForTimeout(300);
          await expect.soft(form.erroCriar(), `erro de criaÃ§Ã£o depois de sair de "${c.rotulo}"`).toHaveCount(0);
          await expect.soft(form.alertaErro(), `Alert de erro depois de sair de "${c.rotulo}"`).toHaveCount(0);
        });
      }
      await test.step('Nenhum pedido de gravaÃ§Ã£o foi enviado e a pÃ¡gina continua no formulÃ¡rio', async () => {
        await page.waitForTimeout(500);
        expect.soft(escritas, 'pedidos POST/PUT/PATCH/DELETE antes de Guardar').toEqual([]);
        await expect.soft(page, 'continua em /novo').toHaveURL(/\/dados-referencia\/diplomas\/novo$/);
      });
    });

    test('CT-REG-BUG-20260915-21-NEG â€” Guardar com os campos obrigatÃ³rios vazios mostra os erros de cada campo e nÃ£o envia nada', metaReg(TELA, 'CT-REG-BUG-20260915-21-NEG', 'BUG-20260915-21', { tipo: 'negativo' }), async ({ page }) => {
      const escritas = await vigiarEscritas(page);
      const form = new PaginaFormularioDiploma(page);
      await abrirRota(page, PaginaFormularioDiploma.ROTA);
      await verificarObrigatoriosEmFalta(form, MSG_DIPLOMA_OBRIGATORIOS, escritas);
      await expect.soft(form.erroCriar(), 'sem o erro genÃ©rico de criaÃ§Ã£o').toHaveCount(0);
    });

    test('CT-REG-BUG-20260915-22 â€” Um clique em "Guardar" envia um sÃ³ POST (servidor simulado, nada gravado)', metaReg(TELA, 'CT-REG-BUG-20260915-22', 'BUG-20260915-22', { tipo: 'robustez' }), async ({ page }) => {
      const escritas = await vigiarEscritas(page);
      const dados = diplomaDeTeste();
      // Responde 201 ao POST de criaÃ§Ã£o sem o deixar chegar ao servidor (registado depois do
      // `vigiarEscritas`, por isso tem prioridade sobre o `abort`).
      await page.route('**/api/dados-referencia/diplomas', (rota) =>
        rota.request().method() === 'POST'
          ? rota.fulfill({
              status: 201,
              contentType: 'application/json',
              body: JSON.stringify({
                id: Number(dados.id),
                codigo: dados.codigo,
                descricao: dados.descricao,
                dataInicio: '2030-01-01',
                dataFim: '2030-12-31',
              }),
            })
          : rota.fallback(),
      );
      const form = new PaginaFormularioDiploma(page);
      await abrirRota(page, PaginaFormularioDiploma.ROTA);
      await form.esperarCarregado();
      await form.preencher(dados);

      await test.step('Um clique em "Guardar" envia exatamente um POST de criaÃ§Ã£o', async () => {
        await form.botaoGuardar().click();
        await page.waitForTimeout(1_500);
        const posts = escritas.filter((e) => POST_CRIAR_DIPLOMA.test(e));
        expect.soft(posts.length, `POST de criaÃ§Ã£o enviados (${posts.join(' | ')})`).toBe(1);
        expect.soft(escritas.filter((e) => !POST_CRIAR_DIPLOMA.test(e)), 'outras escritas').toEqual([]);
      });
      await test.step('NÃ£o aparece "NÃ£o foi possÃ­vel criar o diploma." e a app sai do formulÃ¡rio', async () => {
        await expect.soft(form.erroCriar(), 'erro de criaÃ§Ã£o').toHaveCount(0);
        await expect.soft(page, 'sai de /novo para a lista ou o detalhe').toHaveURL(/\/dados-referencia\/diplomas(\/\d+)?(\?.*)?$/);
      });
    });

    test('CT-REG-BUG-20260915-22-INT â€” Um clique em "Guardar" cria o diploma com um sÃ³ POST, sem erro (grava no ambiente)', metaReg(TELA, 'CT-REG-BUG-20260915-22-INT', 'BUG-20260915-22', { integracao: true, tipo: 'robustez' }), async ({ page }) => {
      test.skip(!ESCRITA_PERMITIDA, MOTIVO_SEM_ESCRITA);
      const posts: string[] = [];
      page.on('request', (r) => {
        if (POST_CRIAR_DIPLOMA.test(`${r.method()} ${r.url()}`)) posts.push(r.url());
      });
      const form = new PaginaFormularioDiploma(page);
      await abrirRota(page, PaginaFormularioDiploma.ROTA);
      await form.esperarCarregado();
      await form.preencher(diplomaDeTeste());
      await form.botaoGuardar().click();
      await page.waitForTimeout(2_000);
      expect.soft(posts.length, 'POST de criaÃ§Ã£o enviados').toBe(1);
      await expect.soft(form.erroCriar(), 'erro de criaÃ§Ã£o').toHaveCount(0);
      await expect.soft(page, 'sai de /novo').not.toHaveURL(/\/novo$/);
    });
  });
});

import type { Page } from '@playwright/test';
import {
  AREAS_COCKPIT,
  AREAS_DETALHE,
  CARTOES_ETAPAS,
  fracao,
  numerosAntesDe,
  PaginaCockpit,
  PaginaDetalheArea,
  PaginaDisparar,
} from '../../../paginas/conferencia/cockpit';
import { botao, ci, opcoesDe, trilho, trilhoBreadcrumb, valorCampo } from '../../../paginas/conferencia/Traceability Suite';
import { abrirItemMenu } from '../../../paginas/conferencia/menu';
import {
  cicloComExecucoesMed,
  cicloComPrestacoesMed,
  expect,
  massaCiclos,
  metaConf,
  obterJson,
  observar,
  semMassa,
  test,
  type Ciclo,
  type MassaCiclos,
} from '../apoio-conferencia';

/**
 * ConferÃªncia â†’ Cockpit â€” script C1 (VisualizaÃ§Ã£o) de 08-10-2026, secÃ§Ãµes S1 (Cockpit),
 * S2 (Detalhe de Ã¡rea), S3 (Nova execuÃ§Ã£o e Reprocessar), S16 (E2E-05) e S17 (NEG-01/02).
 *
 * SÃ³ visualiza: nunca clica em Â«Recontar totaisÂ» nem em Â«DispararÂ». Â«Confirmar disparoÂ» sÃ³
 * Ã© usado para ver a validaÃ§Ã£o; se abrir o modal, clica-se Â«CancelarÂ» e o caso falha (âŒ).
 * A massa (`{CICLO_ABERTO}`, `{CICLO_FECHADO}`, Ã¡reas em receÃ§Ã£o) Ã© lida da API de DEV.
 */

const ITEM = 'cockpit' as const;
let ciclos: MassaCiclos;
/** Ciclo ABERTO com prestaÃ§Ãµes / com execuÃ§Ãµes em MED Continente (o por omissÃ£o pode estar a zeros). */
let comPrestacoes: Ciclo | undefined;
let comExecucoes: Ciclo | undefined;

test.beforeAll(async ({ request }) => {
  ciclos = await massaCiclos(request);
  comPrestacoes = await cicloComPrestacoesMed(request, ciclos);
  comExecucoes = await cicloComExecucoesMed(request, ciclos);
});

function exigirAberto(): Ciclo {
  semMassa(!ciclos.aberto, 'nenhum ciclo Â«Em cursoÂ» (ABERTO)');
  return ciclos.aberto!;
}
function exigirComPrestacoes(): Ciclo {
  semMassa(!comPrestacoes, 'nenhum ciclo Â«Em cursoÂ»');
  return comPrestacoes!;
}
function exigirComExecucoes(): Ciclo {
  semMassa(!comExecucoes, 'nenhum ciclo Â«Em cursoÂ»');
  return comExecucoes!;
}
function exigirFechado(): Ciclo {
  semMassa(!ciclos.fechado, 'nenhum ciclo Â«FechadoÂ»');
  return ciclos.fechado!;
}

/** Pedidos GET a `resumo-areas` / `eventos` feitos pela pÃ¡gina (para os casos de atualizaÃ§Ã£o). */
function vigiarPedidos(page: Page) {
  const resumo: number[] = [];
  const eventos: string[] = [];
  page.on('request', (r) => {
    if (/\/cockpit\/ciclos\/\d+\/resumo-areas/.test(r.url())) resumo.push(Date.now());
    if (/\/cockpit\/eventos/.test(r.url())) eventos.push(r.url());
  });
  return { resumo, eventos };
}

interface AreaCalendario {
  area: string;
  rotuloArea: string;
  migrada: boolean;
  janelaHerdada: boolean;
  limiteRececao: string | null;
}
async function areasDoCalendario(request: Parameters<typeof obterJson>[0], anoMes: number) {
  const r = await obterJson<{ fim: string; areas: AreaCalendario[] }>(request, `/calendario/ciclos/${anoMes}/areas`);
  return r;
}

test.describe('ConferÃªncia â†’ Cockpit', () => {
  // ---------------------------------------------------------------------------------
  test.describe('Cockpit', () => {
    test('CT-CONF-CKP-01 â€” Abrir o Cockpit pelo menu: ciclo por omissÃ£o, sem carregar', metaConf(ITEM, 'CT-CONF-CKP-01', ['RF-02']), async ({ page }) => {
      const esperado = ciclos.aberto ?? ciclos.fechado;
      semMassa(!esperado, 'sem ciclos Em curso nem Fechados');
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await abrirItemMenu(page, 'Cockpit');
      const ck = new PaginaCockpit(page);
      await expect(ck.titulo()).toBeVisible();
      await expect(page).toHaveURL(/\/conferencia\/cockpit$/);
      await expect(ck.ciclo()).toContainText(esperado!.rotulo);
      await expect.soft(ck.badgeEstado(), 'crachÃ¡ do estado do ciclo').toContainText(esperado!.estado === 'ABERTO' ? 'Em curso' : 'Fechado');
      await expect(ck.mensagemAntesPesquisa()).toBeVisible();
      await expect(ck.cartoes()).toHaveCount(0);
    });

    test('CT-CONF-CKP-02 â€” Ciclos planeados nÃ£o aparecem no Cockpit', metaConf(ITEM, 'CT-CONF-CKP-02', ['RF-02']), async ({ page, request }) => {
      const ck = new PaginaCockpit(page);
      await ck.abrir();
      const opcoes = (await opcoesDe(page, 'Ciclo')).filter((o) => !/^Selec/i.test(o));
      const planeados = ciclos.todos.filter((c) => c.estado === 'PLANEADO').map((c) => c.rotulo);
      for (const p of planeados) expect.soft(opcoes, `planeado "${p}" nÃ£o deve aparecer`).not.toContain(p);
      // O CalendÃ¡rio lista os planeados (mesma fonte, `GET /calendario/ciclos?futuros=â€¦`).
      const doCalendario = await obterJson<Ciclo[]>(request, '/calendario/ciclos');
      const naoPlaneados = doCalendario.filter((c) => c.estado !== 'PLANEADO').map((c) => c.rotulo);
      expect.soft(opcoes, 'todos os ciclos Em curso/Fechados estÃ£o no Cockpit').toEqual(expect.arrayContaining(naoPlaneados));
      if (planeados.length === 0) observar('NÃ£o hÃ¡ ciclos Planeados em DEV: a exclusÃ£o nÃ£o foi exercitada.');
    });

    test('CT-CONF-CKP-03 â€” Pesquisar mostra a grelha das 14 Ã¡reas pela ordem', metaConf(ITEM, 'CT-CONF-CKP-03', ['RF-01', 'Q-23']), async ({ page }) => {
      const aberto = exigirAberto();
      const ck = new PaginaCockpit(page);
      await ck.abrir();
      await ck.pesquisarCiclo(aberto.rotulo);
      await expect(page).toHaveURL(new RegExp(`[?&]ciclo=${aberto.anoMes}(&|$)`));
      expect.soft(await ck.nomesCartoes(), 'cartÃµes e ordem').toEqual([...AREAS_COCKPIT]);
      for (const nome of AREAS_COCKPIT.slice(0, 5)) {
        await test.step(nome, async () => {
          const c = await ck.lerCartao(nome);
          expect.soft(c.facturas, `${nome}: facturas`).toBeDefined();
          expect.soft(c.prestacoes, `${nome}: prestaÃ§Ãµes`).toBeDefined();
          expect.soft(c.pct, `${nome}: barra Â«ConferÃªncia x%Â»`).toBeDefined();
          expect.soft(c.estado, `${nome}: estado`).toBeDefined();
          expect.soft(c.texto, `${nome}: ponto de saÃºde`).toMatch(/SaÃºde do ciclo:/);
          // Separador de milhares pt-PT: sÃ³ a partir de 5 dÃ­gitos ("10 000").
          const bruto = c.texto.split('\n').find((l, i, a) => a[i + 1]?.trim() === 'prestaÃ§Ãµes') ?? '';
          if ((c.prestacoes ?? 0) >= 10_000) expect.soft(bruto, `${nome}: separador de milhares`).toMatch(/\d[\s  ]\d{3}$/);
        });
      }
      for (const nome of AREAS_COCKPIT.slice(5)) {
        const c = ck.cartao(nome);
        await expect.soft(c, `${nome}: Â«No sistema actualÂ»`).toContainText('No sistema actual');
        await expect.soft(c.getByRole('progressbar'), `${nome}: sem barra`).toHaveCount(0);
      }
    });

    test('CT-CONF-CKP-04 â€” CartÃ£o Â«No sistema actualÂ» nÃ£o navega; Medicamentos Continente abre o detalhe', metaConf(ITEM, 'CT-CONF-CKP-04', ['RF-04']), async ({ page }) => {
      const aberto = exigirAberto();
      const ck = new PaginaCockpit(page);
      await ck.abrir(`?ciclo=${aberto.anoMes}`);
      await ck.esperarCartoes();
      const url = page.url();
      await ck.cartao('HemodiÃ¡lise').click();
      await page.waitForTimeout(1_000);
      expect(page.url(), 'clique num cartÃ£o Â«No sistema actualÂ» nÃ£o navega').toBe(url);
      await ck.cartaoAtivo('Medicamentos Continente').click();
      await expect(page).toHaveURL(new RegExp(`/conferencia/cockpit/detalhe/med-continente\\?ciclo=${aberto.anoMes}$`));
    });

    test('CT-CONF-CKP-05 â€” Pesquisar sem ciclo mostra erro no campo e nÃ£o pede nada', metaConf(ITEM, 'CT-CONF-CKP-05', ['RF-02'], { tipo: 'negativo' }), async ({ page }) => {
      const ck = new PaginaCockpit(page);
      await ck.abrir();
      const pedidos = vigiarPedidos(page);
      await botao(page, 'Limpar').click();
      await botao(page, 'Pesquisar').click();
      await expect(page.getByText('Seleccione o ciclo a pesquisar', { exact: true })).toBeVisible();
      await page.waitForTimeout(1_000);
      expect(pedidos.resumo, 'nenhum pedido resumo-areas').toHaveLength(0);
    });

    test('CT-CONF-CKP-06 â€” Limpar repÃµe o estado inicial', metaConf(ITEM, 'CT-CONF-CKP-06', ['TR']), async ({ page }) => {
      const aberto = exigirAberto();
      const ck = new PaginaCockpit(page);
      await ck.abrir();
      await ck.pesquisarCiclo(aberto.rotulo);
      await botao(page, 'Limpar').click();
      await expect(page).not.toHaveURL(/[?&]ciclo=/);
      await expect(ck.ciclo()).not.toContainText(aberto.rotulo);
      await expect(ck.mensagemAntesPesquisa()).toBeVisible();
    });

    test('CT-CONF-CKP-07 â€” Ciclo no URL: pesquisa sozinho; ciclo inexistente volta ao estado inicial', metaConf(ITEM, 'CT-CONF-CKP-07', ['RF-02']), async ({ page }) => {
      const fechado = exigirFechado();
      const ck = new PaginaCockpit(page);
      await test.step(`?ciclo=${fechado.anoMes}`, async () => {
        await ck.abrir(`?ciclo=${fechado.anoMes}`);
        await ck.esperarCartoes();
        await expect(ck.ciclo()).toContainText(fechado.rotulo);
        await expect.soft(ck.badgeEstado(), 'crachÃ¡ do estado do ciclo').toContainText('Fechado');
      });
      await test.step('?ciclo=999999', async () => {
        await ck.abrir('?ciclo=999999');
        await expect(ck.mensagemAntesPesquisa()).toBeVisible({ timeout: 30_000 });
        await expect(page.getByText('NÃ£o foi possÃ­vel obter o estado das Ã¡reas de conferÃªncia.')).toHaveCount(0);
      });
    });

    test('CT-CONF-CKP-08 â€” Estado da Ã¡rea coerente com o ciclo e o progresso', metaConf(ITEM, 'CT-CONF-CKP-08', ['RN-19', 'Â§3.2 PRD']), async ({ page }) => {
      const fechado = exigirFechado();
      const aberto = exigirAberto();
      const ck = new PaginaCockpit(page);
      await test.step(`Ciclo fechado ${fechado.rotulo}: Ã¡reas ativas Â«FechadaÂ»`, async () => {
        await ck.abrir(`?ciclo=${fechado.anoMes}`);
        await ck.esperarCartoes();
        for (const nome of AREAS_COCKPIT.slice(0, 5)) {
          expect.soft((await ck.lerCartao(nome)).estado, nome).toBe('Fechada');
        }
      });
      await test.step(`Ciclo aberto ${aberto.rotulo}: estado Ã— progresso`, async () => {
        await ck.abrir(`?ciclo=${aberto.anoMes}`);
        await ck.esperarCartoes();
        for (const nome of AREAS_COCKPIT.slice(0, 5)) {
          const { estado, pct } = await ck.lerCartao(nome);
          const regra: Record<string, (p: number) => boolean> = {
            'Em receÃ§Ã£o': (p) => p === 0,
            'A aguardar': (p) => p === 0,
            'Em conferÃªncia': (p) => p > 0 && p < 100,
            ConcluÃ­da: (p) => p === 100,
          };
          expect.soft(estado && estado in regra, `${nome}: estado Â«${estado}Â» vÃ¡lido num ciclo aberto`).toBeTruthy();
          if (estado && regra[estado] && pct !== undefined) {
            expect.soft(regra[estado](pct), `${nome}: Â«${estado}Â» com ${pct}%`).toBe(true);
          }
        }
      });
    });

    test('CT-CONF-CKP-09 â€” KPIs do cartÃ£o MED Continente coerentes com o detalhe', metaConf(ITEM, 'CT-CONF-CKP-09', ['RF-01', 'RF-04', 'Q-18']), async ({ page }) => {
      const aberto = exigirComPrestacoes();
      const ck = new PaginaCockpit(page);
      await ck.abrir(`?ciclo=${aberto.anoMes}`);
      await ck.esperarCartoes();
      const cartao = await ck.lerCartao('Medicamentos Continente');
      await ck.cartaoAtivo('Medicamentos Continente').click();
      const det = new PaginaDetalheArea(page);
      await det.esperarCarregado('Medicamentos Continente');
      const rececionadas = await det.valorCartao(CARTOES_ETAPAS[0]);
      const automatica = await det.valorCartao('ConferÃªncia AutomÃ¡tica');
      const manual = await det.valorCartao('ConferÃªncia Manual');
      expect.soft(cartao.prestacoes, 'prestaÃ§Ãµes do cartÃ£o = Â«PrestaÃ§Ãµes rececionadasÂ»').toBe(rececionadas);
      if (rececionadas > 0 && cartao.pct !== undefined) {
        const esperado = ((automatica + manual) / rececionadas) * 100;
        expect.soft(Math.abs(cartao.pct - esperado), `% do cartÃ£o (${cartao.pct}) â‰ˆ (auto ${automatica} + manual ${manual}) / ${rececionadas}`).toBeLessThanOrEqual(1);
      }
      const pctAuto = (await det.cartaoEtapa('ConferÃªncia AutomÃ¡tica').innerText()).match(/(\d+(?:,\d+)?)%/)?.[1];
      observar(`CartÃ£o MED Continente: ${cartao.pct}% Â· cartÃ£o Â«ConferÃªncia AutomÃ¡ticaÂ» do detalhe: ${pctAuto ?? 'â€”'}% (Q-18)`);
    });

    test('CT-CONF-CKP-10 â€” Â«Actualizar dadosÂ» pede de novo o resumo das Ã¡reas', metaConf(ITEM, 'CT-CONF-CKP-10', ['RF-03']), async ({ page }) => {
      const aberto = exigirAberto();
      const ck = new PaginaCockpit(page);
      await ck.abrir();
      await ck.pesquisarCiclo(aberto.rotulo);
      const actualizar = botao(page, 'Actualizar dados');
      const pedido = page.waitForRequest((r) => /\/resumo-areas/.test(r.url()));
      await actualizar.click();
      await pedido;
      await expect(actualizar).toBeEnabled({ timeout: 60_000 });
    });

    test('CT-CONF-CKP-13 â€” Ciclo aberto Ã© acompanhado (SSE Â«eventosÂ» ou polling)', metaConf(ITEM, 'CT-CONF-CKP-13', ['RF-03', 'RNF-06']), async ({ page }) => {
      test.setTimeout(240_000);
      const aberto = exigirAberto();
      const ck = new PaginaCockpit(page);
      const pedidos = vigiarPedidos(page);
      const params = page.waitForResponse((r) => /\/cockpit\/parametros-actualizacao/.test(r.url()));
      await ck.abrir(`?ciclo=${aberto.anoMes}`);
      const p = (await (await params).json()) as { pushAtivo?: boolean; fallbackPollSeg?: number; stalenessAvisoSeg?: number };
      await ck.esperarCartoes();
      const aviso = page.getByText('Os valores apresentados podem nÃ£o estar actualizados.');
      let avisoVisto = false;
      for (let s = 0; s < 180; s += 15) {
        await page.waitForTimeout(15_000);
        avisoVisto ||= await aviso.isVisible();
      }
      const acompanhado = pedidos.eventos.length > 0 || pedidos.resumo.length >= 2;
      expect(acompanhado, `canal eventos (${pedidos.eventos.length}) ou polling resumo-areas (${pedidos.resumo.length} pedidos em 3 min)`).toBe(true);
      observar(
        `parametros-actualizacao: ${JSON.stringify(p)} Â· pedidos eventos=${pedidos.eventos.length}, resumo-areas=${pedidos.resumo.length} Â· ` +
          `aviso de desatualizaÃ§Ã£o ${avisoVisto ? (await aviso.isVisible() ? 'visÃ­vel e ainda visÃ­vel no fim' : 'visÃ­vel em algum momento') : 'nunca visÃ­vel'}`,
      );
    });

    test('CT-CONF-CKP-14 â€” Ciclo fechado nÃ£o Ã© acompanhado', metaConf(ITEM, 'CT-CONF-CKP-14', ['RF-03']), async ({ page }) => {
      test.setTimeout(180_000);
      const fechado = exigirFechado();
      const ck = new PaginaCockpit(page);
      const pedidos = vigiarPedidos(page);
      await ck.abrir(`?ciclo=${fechado.anoMes}`);
      await ck.esperarCartoes();
      const inicial = pedidos.resumo.length;
      await page.waitForTimeout(120_000);
      expect.soft(pedidos.eventos, 'sem pedidos eventos').toHaveLength(0);
      expect.soft(pedidos.resumo.length, 'sem polling de resumo-areas').toBe(inicial);
      await expect.soft(page.getByText('Os valores apresentados podem nÃ£o estar actualizados.')).toHaveCount(0);
    });

    test('CT-CONF-CKP-15 â€” SaÃºde do ciclo em cada cartÃ£o ativo', metaConf(ITEM, 'CT-CONF-CKP-15', ['RF-09', 'Q-17']), async ({ page }) => {
      const aberto = exigirAberto();
      const ck = new PaginaCockpit(page);
      await ck.abrir(`?ciclo=${aberto.anoMes}`);
      await ck.esperarCartoes();
      const vistos: string[] = [];
      for (const nome of AREAS_COCKPIT.slice(0, 5)) {
        const texto = (await ck.lerCartao(nome)).texto.match(/SaÃºde do ciclo:[^\n]*/)?.[0];
        expect.soft(texto, `${nome}: texto de saÃºde`).toBeDefined();
        vistos.push(`${nome}: ${texto ?? 'â€”'}`);
      }
      observar(`ConstruÃ­do (Q-17): ${vistos.join(' | ')}`);
    });

    test('CT-CONF-CKP-16 â€” Â«VoltarÂ» do browser repÃµe o ciclo pesquisado antes', metaConf(ITEM, 'CT-CONF-CKP-16', ['TR']), async ({ page }) => {
      const a = exigirFechado();
      const b = exigirAberto();
      const ck = new PaginaCockpit(page);
      await ck.abrir();
      await ck.pesquisarCiclo(a.rotulo);
      await ck.pesquisarCiclo(b.rotulo);
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(new RegExp(`/conferencia/cockpit\\?ciclo=${a.anoMes}$`));
      await expect(ck.ciclo()).toContainText(a.rotulo);
    });
  });

  // ---------------------------------------------------------------------------------
  test.describe('Detalhe de Ã¡rea', () => {
    /** Detalhe de MED Continente no ciclo com prestaÃ§Ãµes (cartÃµes) ou com execuÃ§Ãµes (registo). */
    async function abrirMedContinente(page: Page, para: 'prestacoes' | 'execucoes' = 'prestacoes'): Promise<PaginaDetalheArea> {
      const ciclo = para === 'prestacoes' ? exigirComPrestacoes() : exigirComExecucoes();
      const det = new PaginaDetalheArea(page);
      await det.abrir('med-continente', `?ciclo=${ciclo.anoMes}`);
      await det.esperarCarregado('Medicamentos Continente');
      return det;
    }

    test('CT-CONF-DET-01 â€” Abrir o detalhe de Medicamentos Continente', metaConf(ITEM, 'CT-CONF-DET-01', ['RF-04']), async ({ page }) => {
      const aberto = exigirAberto();
      const ck = new PaginaCockpit(page);
      await ck.abrir(`?ciclo=${aberto.anoMes}`);
      await ck.esperarCartoes();
      await ck.cartaoAtivo('Medicamentos Continente').click();
      const det = new PaginaDetalheArea(page);
      await det.esperarCarregado('Medicamentos Continente');
      await expect.soft(det.valorCiclo()).toContainText(aberto.rotulo);
      await expect.soft(ck.badgeEstado(), 'crachÃ¡ do estado do ciclo').toBeVisible();
      expect.soft(await trilhoBreadcrumb(page)).toEqual(trilho('ConferÃªncia', 'Cockpit', 'Medicamentos Continente'));
      for (const t of CARTOES_ETAPAS) await expect.soft(det.cartaoEtapa(t), t).toBeVisible();
      await expect.soft(page.getByText('Fila de processamento', { exact: true })).toBeVisible();
      await expect.soft(page.getByText('Job de start automÃ¡tico', { exact: true })).toBeVisible();
      await expect.soft(page.getByRole('heading', { name: ci('SumÃ¡rio das ExecuÃ§Ãµes') })).toBeVisible();
      await expect.soft(page.getByRole('heading', { name: ci('ExecuÃ§Ã£o dos Workflows de ConferÃªncia') })).toBeVisible();
    });

    test('CT-CONF-DET-02 â€” Â«PrestaÃ§Ãµes rececionadasÂ»: distribuiÃ§Ã£o por lote soma o total', metaConf(ITEM, 'CT-CONF-DET-02', ['RF-04']), async ({ page }) => {
      const det = await abrirMedContinente(page);
      const titulo = CARTOES_ETAPAS[0];
      const valor = await det.valorCartao(titulo);
      expect.soft(await det.cartaoEtapa(titulo).innerText(), 'cartÃ£o sem percentagem').not.toMatch(/%/);
      const dialogo = await det.abrirModalCartao(titulo);
      await expect(dialogo.getByRole('heading', { name: 'DistribuiÃ§Ã£o por lote' })).toBeVisible();
      const [total, ...grupos] = numerosAntesDe(await dialogo.innerText(), 'prestaÃ§Ãµes');
      expect.soft(total, 'Total = valor do cartÃ£o').toBe(valor);
      expect.soft(grupos.reduce((s, n) => s + n, 0), 'soma dos grupos de lote = Total').toBe(total);
      await det.fecharModal(dialogo);
    });

    test('CT-CONF-DET-03 â€” Â«PrestaÃ§Ãµes enriquecidasÂ» â‰¤ rececionadas, com % coerente', metaConf(ITEM, 'CT-CONF-DET-03', ['RF-04', 'RN-01']), async ({ page }) => {
      const det = await abrirMedContinente(page);
      const rec = await det.valorCartao(CARTOES_ETAPAS[0]);
      const enr = await det.valorCartao('PrestaÃ§Ãµes enriquecidas');
      expect.soft(enr, 'enriquecidas â‰¤ rececionadas').toBeLessThanOrEqual(rec);
      const dialogo = await det.abrirModalCartao('PrestaÃ§Ãµes enriquecidas');
      const texto = await dialogo.innerText();
      expect.soft(texto).toContain('PrestaÃ§Ãµes enriquecidas face Ã s rececionadas');
      await expect.soft(dialogo.getByRole('heading', { name: 'Enriquecimento por lote' })).toBeVisible();
      const f = fracao(texto, 'prestaÃ§Ãµes');
      expect.soft(f, 'Â«x / y prestaÃ§ÃµesÂ»').toEqual({ x: enr, y: rec });
      const pct = Number(texto.match(/(\d+(?:,\d+)?)%/)?.[1]?.replace(',', '.'));
      if (rec > 0) expect.soft(Math.abs(pct - (enr / rec) * 100), `% (${pct})`).toBeLessThanOrEqual(1);
      await det.fecharModal(dialogo);
    });

    test('CT-CONF-DET-04 â€” Â«ConferÃªncia AutomÃ¡ticaÂ»: progresso por workflow', metaConf(ITEM, 'CT-CONF-DET-04', ['RF-04', 'RN-03']), async ({ page }) => {
      const det = await abrirMedContinente(page);
      const enr = await det.valorCartao('PrestaÃ§Ãµes enriquecidas');
      const auto = await det.valorCartao('ConferÃªncia AutomÃ¡tica');
      expect.soft(auto, 'automÃ¡tica â‰¤ enriquecidas').toBeLessThanOrEqual(enr);
      const dialogo = await det.abrirModalCartao('ConferÃªncia AutomÃ¡tica');
      const texto = await dialogo.innerText();
      const f = fracao(texto, 'prestaÃ§Ãµes');
      expect.soft(f, 'Â«valor / total prestaÃ§ÃµesÂ» com total = enriquecidas').toEqual({ x: auto, y: enr });
      await expect(dialogo.getByRole('heading', { name: 'Progresso por workflow' })).toBeVisible();
      const workflows = texto.match(/(MED_LOTE[\w]+|Lotes? (?:de papel|9\d)(?: \(Desativado\))?)/g) ?? [];
      expect.soft(workflows.length, 'workflows MED listados').toBeGreaterThan(0);
      observar(`Workflows no modal: ${[...new Set(workflows)].join(', ') || 'â€”'} (o script espera os acrÃ³nimos MED_LOTE96â€¦99 e MED_LOTE_PAPEL)`);
      await det.fecharModal(dialogo);
    });

    test('CT-CONF-DET-05 â€” Â«ConferÃªncia ManualÂ»: tarefas por estado somam o total e o botÃ£o abre a SupervisÃ£o', metaConf(ITEM, 'CT-CONF-DET-05', ['RF-04']), async ({ page }) => {
      const det = await abrirMedContinente(page);
      const dialogo = await det.abrirModalCartao('ConferÃªncia Manual');
      await expect(dialogo.getByRole('heading', { name: 'Tarefas por estado' })).toBeVisible();
      const f = fracao(await dialogo.innerText(), 'tarefas');
      const estados = ['Na fila', 'Em curso', 'Escaladas', 'ConcluÃ­das'];
      const valores: number[] = [];
      for (const e of estados) {
        const v = Number((await valorCampo(dialogo, e).innerText()).replace(/\D/g, ''));
        valores.push(v);
      }
      expect.soft(valores.reduce((s, n) => s + n, 0), `soma ${estados.join('+')} = total do cartÃ£o`).toBe(f?.y);
      await botao(dialogo, 'Ir para Conf. Manual Superv.').click();
      await expect(page).toHaveURL(/\/conferencia\/supervisao$/);
    });

    test('CT-CONF-DET-06 â€” Fila de processamento', metaConf(ITEM, 'CT-CONF-DET-06', ['RF-04']), async ({ page }) => {
      await abrirMedContinente(page);
      const comFila = page.getByText('PrestaÃ§Ãµes a aguardar conferÃªncia automÃ¡tica');
      const vazia = page.getByText('Sem prestaÃ§Ãµes em fila', { exact: true });
      const indisponivel = page.getByText(/^InformaÃ§Ã£o da fila indisponÃ­vel\./);
      await expect(comFila.or(vazia).or(indisponivel).first()).toBeVisible({ timeout: 60_000 });
      if (await comFila.isVisible()) {
        await expect.soft(page.getByText(/^Tempo real Â· actualizado Ã s \d{2}:\d{2}:\d{2}$/).first()).toBeVisible();
        await expect.soft(page.getByText('Primeira conferÃªncia', { exact: true })).toBeVisible();
        await expect.soft(page.getByText('Reprocessamento', { exact: true })).toBeVisible();
      }
      if (await indisponivel.isVisible()) observar('Fila indisponÃ­vel em DEV (Â«InformaÃ§Ã£o da fila indisponÃ­vel.Â»)');
    });

    test('CT-CONF-DET-07 â€” Job de start automÃ¡tico: o clique sÃ³ abre o diÃ¡logo informativo', metaConf(ITEM, 'CT-CONF-DET-07', ['RF-10', 'Q-16']), async ({ page }) => {
      const det = await abrirMedContinente(page);
      const sw = det.interruptorJob();
      await expect(sw).toBeEnabled({ timeout: 30_000 });
      const ligado = await sw.isChecked();
      await sw.click();
      const dialogo = page.getByRole('dialog', { name: ligado ? 'Desligar o start automÃ¡tico' : 'Ligar o start automÃ¡tico' });
      await expect(dialogo).toBeVisible();
      await expect(dialogo).toContainText(
        'A alteraÃ§Ã£o do start automÃ¡tico segue a esteira de aprovaÃ§Ã£o, que ainda nÃ£o recebe pedidos sobre este parÃ¢metro. PeÃ§a a alteraÃ§Ã£o ao administrador do sistema.',
      );
      await botao(dialogo, 'Fechar').click();
      await expect(dialogo).toBeHidden();
      expect(await sw.isChecked(), 'estado do interruptor nÃ£o mudou').toBe(ligado);
    });

    test('CT-CONF-DET-08 â€” SumÃ¡rio das ExecuÃ§Ãµes: estado coerente com processadas Ã— enriquecidas', metaConf(ITEM, 'CT-CONF-DET-08', ['RF-04']), async ({ page }) => {
      const det = await abrirMedContinente(page, 'execucoes');
      const t = det.tabelaSumario();
      await t.esperar();
      expect.soft(await t.colunas()).toEqual(['Workflow', 'Lotes', 'Enriquecidas', 'Processadas', 'Estado', 'Progresso']);
      const enr = await t.valoresColuna('Enriquecidas');
      const proc = await t.valoresColuna('Processadas');
      const est = await t.valoresColuna('Estado');
      const wf = await t.valoresColuna('Workflow');
      semMassa(wf.length === 0, 'SumÃ¡rio das ExecuÃ§Ãµes vazio');
      wf.forEach((w, i) => {
        const p = Number(proc[i].replace(/\D/g, ''));
        const e = Number(enr[i].replace(/\D/g, ''));
        expect.soft(est[i], `${w}: ${p} processadas de ${e}`).toBe(p < e ? 'Em curso' : 'ConcluÃ­do');
      });
    });

    test('CT-CONF-DET-09 â€” Registo de execuÃ§Ãµes: paginaÃ§Ã£o no URL sobrevive ao F5', metaConf(ITEM, 'CT-CONF-DET-09', ['RF-04']), async ({ page }) => {
      const det = await abrirMedContinente(page, 'execucoes');
      const t = det.tabelaRegisto();
      await t.esperar();
      expect.soft(await t.colunas()).toEqual([
        'Identificador', 'Workflow', 'Lotes', 'Ã‚mbito', 'Operador', 'Data/Hora', 'PrestaÃ§Ãµes', 'Acusou erro', 'Progresso', 'Estado',
      ]);
      for (const id of await t.valoresColuna('Identificador')) {
        expect.soft(id, 'identificador EXEC-NNN ou AUTO-AAAAMM-NNN').toMatch(/^(EXEC-\d+|AUTO-\d{6}-\d+)$/);
      }
      await t.mudarTamanhoPagina(15);
      await expect(page).toHaveURL(/[?&]tamanho=15(&|$)/);
      const seguinte = t.paginaSeguinte();
      semMassa(!(await seguinte.isEnabled()), 'registo com â‰¤ 15 execuÃ§Ãµes (sem pÃ¡gina 2)');
      await seguinte.click();
      await expect(page).toHaveURL(/[?&]pagina=2(&|$)/);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await det.esperarCarregado('Medicamentos Continente');
      await expect(page).toHaveURL(/[?&]pagina=2(&|$)/);
      await expect(page).toHaveURL(/[?&]tamanho=15(&|$)/);
      await expect(det.tabelaRegisto().tamanhoPagina()).toContainText('15');
    });

    test('CT-CONF-DET-10 â€” ExecuÃ§Ã£o Â«Em cursoÂ» / Â«SuspensoÂ» sem aÃ§Ã£o de pausar/retomar', metaConf(ITEM, 'CT-CONF-DET-10', ['RF-07', 'Q-14']), async ({ page }) => {
      const det = await abrirMedContinente(page, 'execucoes');
      const t = det.tabelaRegisto();
      await t.esperar();
      const estados = await t.valoresColuna('Estado');
      const i = estados.findIndex((e) => e === 'Em curso' || e === 'Suspenso');
      semMassa(i < 0, 'nenhuma execuÃ§Ã£o Â«Em cursoÂ» ou Â«SuspensoÂ» na 1.Âª pÃ¡gina (repetir na C4, depois do DSP-13)');
      const acoes = await t.linhas().nth(i).locator('td[headers="actions"] button').evaluateAll((b) => b.map((x) => x.getAttribute('aria-label')));
      expect.soft(acoes.filter((a) => /paus|retom/i.test(a ?? ''))).toEqual([]);
      observar(`RF-07 (Q-14): linha Â«${estados[i]}Â» com aÃ§Ãµes [${acoes.join(', ') || 'nenhuma'}] â€” requisito pede pausar/retomar`);
    });

    test('CT-CONF-DET-11 â€” Â«Ver logsÂ» abre os Logs filtrados pela execuÃ§Ã£o', metaConf(ITEM, 'CT-CONF-DET-11', ['RF-37']), async ({ page }) => {
      const det = await abrirMedContinente(page, 'execucoes');
      const t = det.tabelaRegisto();
      await t.esperar();
      const verLogs = t.raiz.getByRole('button', { name: 'Ver logs', exact: true });
      semMassa((await verLogs.count()) === 0, 'nenhuma linha com Â«Acusou erroÂ» na 1.Âª pÃ¡gina do registo');
      const id = (await verLogs.first().locator('xpath=ancestor::tr[1]').innerText()).match(/EXEC-\d+|AUTO-\d{6}-\d+/)?.[0];
      await verLogs.first().click();
      await expect(page).toHaveURL(/\/motor-regras\/execucoes\?.*execucao=/);
      await expect(page).toHaveURL(/[?&]area=MED(&|$)/);
      await expect(page.getByText('ExecuÃ§Ã£o do cockpit', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
      if (id) await expect.soft(page).toHaveURL(new RegExp(`[?&]execucao=${id}(&|$)`));
      await expect(page.getByRole('button', { name: 'Retirar o filtro da execuÃ§Ã£o' })).toBeVisible();
    });

    test('CT-CONF-DET-12 â€” Ã‚mbito de um disparo com recorte abre o modal Â«Recorte por â€¦Â»', metaConf(ITEM, 'CT-CONF-DET-12', ['RF-05']), async ({ page }) => {
      const det = await abrirMedContinente(page, 'execucoes');
      const t = det.tabelaRegisto();
      await t.esperar();
      const ambito = t.raiz.locator('tbody td').getByRole('button', { name: /\(\d+\)/ });
      semMassa((await ambito.count()) === 0, 'nenhum disparo com recorte na 1.Âª pÃ¡gina do registo');
      await ambito.first().click();
      const dialogo = page.getByRole('dialog', { name: /^Recorte por/ });
      await expect(dialogo).toBeVisible();
      await expect.soft(dialogo).toContainText('ForÃ§ar tarefa manual');
      await expect.soft(dialogo).toContainText('Re-enriquecimento');
      for (const c of ['CritÃ©rio', 'Item', 'Detalhe', 'PrestaÃ§Ãµes']) {
        await expect.soft(dialogo.locator(`th[abbr="${c}"]`).or(dialogo.getByRole('columnheader', { name: c })).first(), c).toBeVisible();
      }
      await botao(dialogo, 'Fechar').click();
    });

    test('CT-CONF-DET-13 â€” Ãrea inexistente na rota', metaConf(ITEM, 'CT-CONF-DET-13', ['Â§5 PRD'], { tipo: 'negativo' }), async ({ page }) => {
      const aberto = exigirAberto();
      const det = new PaginaDetalheArea(page);
      await det.abrir('xpto', `?ciclo=${aberto.anoMes}`);
      await expect(page.getByText('Ãrea nÃ£o encontrada.', { exact: true })).toBeVisible();
      await botao(page, 'Voltar').click();
      await expect(page).toHaveURL(/\/conferencia\/cockpit$/);
    });

    test('CT-CONF-DET-14 â€” Detalhe sem ciclo', metaConf(ITEM, 'CT-CONF-DET-14', ['Â§5 PRD'], { tipo: 'negativo' }), async ({ page }) => {
      const det = new PaginaDetalheArea(page);
      await det.abrir('med-continente');
      await expect(page.getByText('Escolha um ciclo no cockpit para ver o detalhe da Ã¡rea.', { exact: true })).toBeVisible();
    });

    test('CT-CONF-DET-15 â€” Detalhe com ciclo inexistente (209912)', metaConf(ITEM, 'CT-CONF-DET-15', ['Q-19'], { tipo: 'negativo' }), async ({ page }) => {
      const det = new PaginaDetalheArea(page);
      await det.abrir('med-continente', '?ciclo=209912');
      await det.esperarCarregado('Medicamentos Continente');
      const aviso = page.getByRole('alert').filter({ hasText: /ciclo/i });
      const temAviso = (await aviso.count()) > 0;
      const rec = await det.valorCartao(CARTOES_ETAPAS[0]);
      observar(
        `Q-19: ciclo 209912 â†’ ${temAviso ? `aviso Â«${(await aviso.first().innerText()).trim()}Â»` : 'sem aviso de ciclo inexistente'}; Â«PrestaÃ§Ãµes rececionadasÂ» = ${rec}`,
      );
      expect.soft(temAviso, 'esperado: aviso de ciclo inexistente').toBe(true);
    });

    test('CT-CONF-DET-16 â€” Outras Ã¡reas ativas: tÃ­tulos, cartÃµes e workflows', metaConf(ITEM, 'CT-CONF-DET-16', ['RF-04', 'RN-02', 'RN-03']), async ({ page }) => {
      test.slow();
      const aberto = exigirComPrestacoes();
      const det = new PaginaDetalheArea(page);
      // Script: MCDT Â«Lote 97 (sem papel)Â», Â«Lotes de papel (0 a 5)Â», Â«AntigÃ©nioÂ»; CRD Â«CRD_CONFERENCIAÂ».
      // Verifica-se no SumÃ¡rio das ExecuÃ§Ãµes, que lista os workflows da Ã¡rea (acrÃ³nimo ou rÃ³tulo).
      const workflowsEsperados: Record<string, RegExp[]> = {
        mcdt: [/MCDT_LOTE97|Lote 97 \(sem papel\)/, /MCDT_LOTE_PAPEL|Lotes de papel/, /MCDT_ANTIGENIO|AntigÃ©nio/],
        crd: [/CRD_CONFERENCIA|ConferÃªncia CRD/],
      };
      for (const a of AREAS_DETALHE.slice(1)) {
        await test.step(a.titulo, async () => {
          await det.abrir(a.slug, `?ciclo=${aberto.anoMes}`);
          await det.esperarCarregado(a.titulo);
          for (const t of CARTOES_ETAPAS) await expect.soft(det.cartaoEtapa(t), `${a.titulo}: ${t}`).toBeVisible();
          const rec = await det.valorCartao(CARTOES_ETAPAS[0]);
          const enr = await det.valorCartao('PrestaÃ§Ãµes enriquecidas');
          const auto = await det.valorCartao('ConferÃªncia AutomÃ¡tica');
          expect.soft(enr, `${a.titulo}: enriquecidas â‰¤ rececionadas`).toBeLessThanOrEqual(rec);
          expect.soft(auto, `${a.titulo}: automÃ¡tica â‰¤ enriquecidas`).toBeLessThanOrEqual(enr);
          const esperados = workflowsEsperados[a.slug];
          if (esperados) {
            const sumario = det.tabelaSumario();
            await sumario.esperar();
            const wfs = (await sumario.valoresColuna('Workflow')).join(' | ');
            for (const re of esperados) expect.soft(wfs, `${a.titulo}: workflow ${re}`).toMatch(re);
            observar(`${a.titulo}: workflows no SumÃ¡rio â€” ${wfs || 'â€”'}`);
          }
        });
      }
    });

    test('CT-CONF-DET-17 â€” Â«VoltarÂ» regressa ao Cockpit com o mesmo ciclo', metaConf(ITEM, 'CT-CONF-DET-17', ['TR']), async ({ page }) => {
      const aberto = exigirComPrestacoes();
      await abrirMedContinente(page);
      await botao(page, 'Voltar').click();
      await expect(page).toHaveURL(new RegExp(`/conferencia/cockpit\\?ciclo=${aberto.anoMes}$`));
      await new PaginaCockpit(page).esperarCartoes();
    });
  });

  // ---------------------------------------------------------------------------------
  test.describe('Nova execuÃ§Ã£o', () => {
    /** `{AREA_REC_ENCERRADA}` / `{AREA_EM_RECECAO}` do ciclo aberto, pelo CalendÃ¡rio. */
    /**
     * `{AREA_REC_ENCERRADA}` / `{AREA_EM_RECECAO}`: 1.Âª Ã¡rea ativa (com detalhe) com a receÃ§Ã£o
     * encerrada / a decorrer, procurada nos ciclos Â«Em cursoÂ» (mais antigo primeiro) pelo CalendÃ¡rio.
     */
    async function areaPorRececao(request: Parameters<typeof obterJson>[0], encerrada: boolean) {
      exigirAberto();
      const agora = Date.now();
      for (const ciclo of ciclos.todos.filter((c) => c.estado === 'ABERTO')) {
        const cal = await areasDoCalendario(request, ciclo.anoMes);
        const area = AREAS_DETALHE.map((a) => ({ ...a, cal: cal.areas.find((x) => x.area === a.calendario) }))
          .filter((a) => a.cal?.migrada)
          .map((a) => ({ ...a, ciclo, limite: a.cal!.limiteRececao ?? (a.cal!.janelaHerdada ? cal.fim : null) }))
          .find((a) => a.limite && (encerrada ? Date.parse(a.limite) < agora : Date.parse(a.limite) >= agora));
        if (area) return area;
      }
      return undefined;
    }
    const q = (ciclo: number, slug: string) => `ciclo=${ciclo}&area=${slug}&modo=disparar`;

    test('CT-CONF-DSP-01 â€” Abrir Â«Nova execuÃ§Ã£oÂ» a partir do detalhe', metaConf(ITEM, 'CT-CONF-DSP-01', ['RF-05']), async ({ page, request }) => {
      const area = await areaPorRececao(request, true);
      semMassa(!area, '{AREA_REC_ENCERRADA}: nenhuma Ã¡rea ativa com receÃ§Ã£o encerrada no ciclo aberto');
      const det = new PaginaDetalheArea(page);
      await det.abrir(area!.slug, `?ciclo=${area!.ciclo.anoMes}`);
      await det.esperarCarregado(area!.titulo);
      await botao(page, 'Nova execuÃ§Ã£o').click();
      await expect(page).toHaveURL(new RegExp(`/conferencia/cockpit/disparar\\?.*modo=disparar`));
      const dsp = new PaginaDisparar(page);
      await expect(dsp.titulo()).toHaveText('Nova execuÃ§Ã£o de conferÃªncia');
      expect.soft(await trilhoBreadcrumb(page)).toEqual(trilho('ConferÃªncia', 'Cockpit', area!.titulo, 'Nova execuÃ§Ã£o'));
      for (const p of ['1. Workflows', '2. Ã‚mbito', '3. Tarefa manual', '4. Re-enriquecimento', 'Resumo do disparo']) {
        await expect.soft(dsp.passo(p), p).toBeVisible();
      }
      const nomes = await dsp.nomesWorkflows();
      expect.soft(nomes.length, 'workflows ativos listados').toBeGreaterThan(0);
      expect.soft(nomes.filter((n) => /Desativado/.test(n)), 'sÃ³ workflows ativos').toEqual([]);
      observar(`${area!.titulo}: workflows listados â€” ${nomes.join(', ')}`);
    });

    test('CT-CONF-DSP-02 â€” Confirmar sem workflow mostra validaÃ§Ã£o e nÃ£o abre o modal', metaConf(ITEM, 'CT-CONF-DSP-02', ['RF-05'], { tipo: 'negativo' }), async ({ page }) => {
      const aberto = exigirAberto();
      const dsp = new PaginaDisparar(page);
      await dsp.abrir(q(aberto.anoMes, 'med-continente'));
      await expect(dsp.titulo()).toHaveText('Nova execuÃ§Ã£o de conferÃªncia');
      expect(await dsp.confirmarEsperandoValidacao(), 'o modal de confirmaÃ§Ã£o nÃ£o deve abrir').toBe(false);
      await expect(page.getByText('Escolha pelo menos um workflow.', { exact: true })).toBeVisible();
    });

    test('CT-CONF-DSP-03 â€” Workflow completo mostra a volumetria', metaConf(ITEM, 'CT-CONF-DSP-03', ['RF-05']), async ({ page }) => {
      const aberto = exigirComPrestacoes();
      const dsp = new PaginaDisparar(page);
      await dsp.abrir(q(aberto.anoMes, 'med-continente'));
      await expect(page.getByText('Escolha pelo menos um workflow para ver a volumetria.')).toBeVisible();
      const wf = await dsp.escolherWorkflow();
      const resumo = dsp.resumo();
      await expect(resumo).not.toContainText('A contar o recorte...', { timeout: 60_000 });
      await expect.soft(resumo).toContainText(/Workflow completo/i);
      await expect.soft(resumo).toContainText(wf);
      await expect.soft(resumo).toContainText('Facturas');
      await expect.soft(resumo).toContainText('PrestaÃ§Ãµes');
      await expect.soft(resumo).not.toContainText('NÃ£o foi possÃ­vel contar o recorte.');
      await expect.soft(page.getByText('Sem critÃ©rio nenhum, o disparo abrange os workflows escolhidos por inteiro.')).toBeVisible();
    });

    test('CT-CONF-DSP-04 â€” Cascata do Ã¢mbito: trocar o prestador limpa facturas e prestaÃ§Ãµes', metaConf(ITEM, 'CT-CONF-DSP-04', ['RF-05']), async ({ page }) => {
      test.slow();
      const aberto = exigirComPrestacoes();
      const dsp = new PaginaDisparar(page);
      await dsp.abrir(q(aberto.anoMes, 'med-continente'));
      await dsp.escolherWorkflow();
      const prestador = await dsp.escolherSugestao('Prestadores', 'farm');
      semMassa(!prestador, 'nenhum prestador encontrado com Â«farmÂ»');
      const factura = await dsp.escolherSugestao('Facturas', '');
      semMassa(!factura, 'o prestador escolhido nÃ£o tem facturas sugeridas');
      const prestacao = await dsp.escolherSugestao('PrestaÃ§Ãµes', '');
      observar(`Recorte: prestador Â«${prestador}Â», factura Â«${factura}Â», prestaÃ§Ã£o Â«${prestacao ?? 'â€”'}Â»`);
      expect(await dsp.chipsRemover().count(), 'chips escolhidos').toBeGreaterThanOrEqual(2);
      await dsp.chipsRemover().first().click(); // remove o prestador
      const outro = await dsp.escolherSugestao('Prestadores', 'farm');
      semMassa(!outro, 'sem segundo prestador');
      expect(await dsp.chipsRemover().count(), 'ao trocar o prestador, facturas e prestaÃ§Ãµes ficam limpas').toBe(1);
    });

    test('CT-CONF-DSP-05 â€” Pesquisa de prestador por NIF e por parte do nome', metaConf(ITEM, 'CT-CONF-DSP-05', ['RF-05']), async ({ page }) => {
      const aberto = exigirComPrestacoes();
      const dsp = new PaginaDisparar(page);
      await dsp.abrir(q(aberto.anoMes, 'med-continente'));
      const campo = dsp.campoAmbito('Prestadores');
      await campo.click();
      await campo.fill('farm');
      const opcoes = page.getByRole('option');
      await expect(opcoes.first()).toBeVisible({ timeout: 15_000 });
      const n = await opcoes.count();
      const primeira = (await opcoes.first().innerText()).trim();
      if (n === 20) observar('A lista de prestadores para Â«farmÂ» corta em 20 opÃ§Ãµes sem aviso.');
      const nif = primeira.match(/\b\d{9}\b/)?.[0];
      await page.keyboard.press('Escape');
      semMassa(!nif, `a sugestÃ£o Â«${primeira}Â» nÃ£o mostra um NIF de 9 dÃ­gitos`);
      await campo.fill(nif!);
      await expect(page.getByRole('option').filter({ hasText: nif! }).first()).toBeVisible({ timeout: 15_000 });
      observar(`Pesquisa por nome Â«farmÂ»: ${n} opÃ§Ãµes; por NIF ${nif}: encontrado. A pesquisa por cÃ³digo do prestador nÃ£o foi automatizada (formato do cÃ³digo nÃ£o identificÃ¡vel na sugestÃ£o).`);
    });

    test('CT-CONF-DSP-06 â€” CÃ³digos de erro do recorte de uma factura', metaConf(ITEM, 'CT-CONF-DSP-06', ['RF-05']), async ({ page }) => {
      const aberto = exigirComPrestacoes();
      const dsp = new PaginaDisparar(page);
      await dsp.abrir(q(aberto.anoMes, 'med-continente'));
      await dsp.escolherWorkflow();
      semMassa(!(await dsp.escolherSugestao('Prestadores', 'farm')), 'nenhum prestador Â«farmÂ»');
      semMassa(!(await dsp.escolherSugestao('Facturas', '')), 'prestador sem facturas');
      const semCodigos = page.getByText('O recorte escolhido nÃ£o tem cÃ³digos de erro sinalizados.');
      const campo = dsp.campoAmbito('CÃ³digos de erro');
      await expect(semCodigos.or(campo).first()).toBeVisible({ timeout: 30_000 });
      if (await campo.isVisible()) {
        await campo.click();
        await expect(page.getByRole('option').first()).toBeVisible({ timeout: 15_000 });
        observar(`CÃ³digos de erro do recorte: ${(await page.getByRole('option').allInnerTexts()).slice(0, 10).join(', ')}`);
        await page.keyboard.press('Escape');
      } else {
        observar('O recorte escolhido nÃ£o tem cÃ³digos de erro sinalizados.');
      }
    });

    test('CT-CONF-DSP-07 â€” Ãrea em receÃ§Ã£o: o disparo fica bloqueado com a data-limite', metaConf(ITEM, 'CT-CONF-DSP-07', ['RF-11', 'RN-01'], { tipo: 'negativo' }), async ({ page, request }) => {
      const area = await areaPorRececao(request, false);
      semMassa(!area, '{AREA_EM_RECECAO}: nenhuma Ã¡rea ativa com receÃ§Ã£o a decorrer no ciclo aberto');
      const dsp = new PaginaDisparar(page);
      await dsp.abrir(q(area!.ciclo.anoMes, area!.slug));
      await dsp.escolherWorkflow();
      const msg = page.getByText(/^A receÃ§Ã£o de .+ no ciclo .+ decorre atÃ© \d{2}\/\d{2}\/\d{4}; a conferÃªncia sÃ³ pode comeÃ§ar depois\.$/);
      await expect(msg.first()).toBeVisible({ timeout: 30_000 });
      const [d, m, a] = area!.limite!.slice(0, 10).split('-').reverse();
      await expect.soft(msg.first()).toContainText(`${d}/${m}/${a}`);
      expect(await dsp.confirmarEsperandoValidacao(), 'o modal de confirmaÃ§Ã£o nÃ£o deve abrir').toBe(false);
      expect.soft(await msg.count(), 'mensagem mostrada uma sÃ³ vez').toBe(1);
    });

    test('CT-CONF-DSP-08 â€” Recorte sem prestaÃ§Ãµes por conferir', metaConf(ITEM, 'CT-CONF-DSP-08', ['RF-14'], { tipo: 'negativo' }), async () => {
      semMassa(true, 'precisa de uma factura toda conferida, combinada Ã  mÃ£o (nÃ£o identificÃ¡vel automaticamente) â€” fazer manualmente');
    });

    test('CT-CONF-DSP-09 â€” Â«Incluir prestaÃ§Ãµes jÃ¡ conferidasÂ»: resumo e ciclo fechado', metaConf(ITEM, 'CT-CONF-DSP-09', ['RF-14', 'RN-22']), async ({ page }) => {
      const aberto = exigirComPrestacoes();
      const dsp = new PaginaDisparar(page);
      await dsp.abrir(q(aberto.anoMes, 'med-continente'));
      await dsp.escolherWorkflow();
      const incluir = page.getByRole('checkbox', { name: 'Incluir prestaÃ§Ãµes jÃ¡ conferidas' });
      const preview = page.waitForResponse((r) => /\/disparos\/preview/.test(r.url()), { timeout: 60_000 });
      await incluir.check();
      await preview;
      await expect.soft(dsp.resumo()).toContainText('Por conferir');
      await expect.soft(dsp.resumo()).toContainText('A reconferir');
      await expect.soft(page.getByText(/^As jÃ¡ conferidas sÃ£o limpas dos erros do motor e conferidas de novo/)).toBeVisible();
      const fechado = ciclos.fechado;
      if (!fechado) {
        observar('Sem ciclo fechado: a 2.Âª parte (opÃ§Ã£o desativada) nÃ£o foi exercitada.');
        return;
      }
      await dsp.abrir(q(fechado.anoMes, 'med-continente'));
      await expect(page.getByRole('checkbox', { name: 'Incluir prestaÃ§Ãµes jÃ¡ conferidas' })).toBeDisabled({ timeout: 30_000 });
      await expect.soft(page.getByText('O ciclo estÃ¡ fechado: as prestaÃ§Ãµes jÃ¡ conferidas nÃ£o voltam a ser conferidas.')).toBeVisible();
    });

    test('CT-CONF-DSP-10 â€” Tarefa manual forÃ§ada: validaÃ§Ã£o em MED e Â«Em breveÂ» em MCDT', metaConf(ITEM, 'CT-CONF-DSP-10', ['RF-13'], { tipo: 'negativo' }), async ({ page }) => {
      const aberto = exigirComPrestacoes();
      const dsp = new PaginaDisparar(page);
      await test.step('MED: Â«Por factura(s)Â» sem factura', async () => {
        await dsp.abrir(q(aberto.anoMes, 'med-continente'));
        await dsp.escolherWorkflow();
        await page.getByRole('checkbox', { name: 'ForÃ§ar tarefa manual' }).check();
        await page.getByRole('radio', { name: 'Por factura(s)' }).check();
        expect(await dsp.confirmarEsperandoValidacao(), 'o modal de confirmaÃ§Ã£o nÃ£o deve abrir').toBe(false);
        await expect(page.getByText('Escolha pelo menos um item a que a tarefa manual forÃ§ada se aplica.', { exact: true })).toBeVisible();
      });
      await test.step('MCDT: passo 3 Â«Em breveÂ»', async () => {
        await dsp.abrir(q(aberto.anoMes, 'mcdt'));
        await expect(page.getByText('Em breve: ainda nÃ£o Ã© possÃ­vel forÃ§ar a tarefa manual a partir do disparo nesta Ã¡rea.')).toBeVisible({ timeout: 30_000 });
      });
    });

    test('CT-CONF-DSP-11 â€” Re-enriquecimento: explicaÃ§Ã£o em MED e Â«Em breveÂ» em MCDT/CRD', metaConf(ITEM, 'CT-CONF-DSP-11', ['RF-12']), async ({ page }) => {
      const aberto = exigirComPrestacoes();
      const dsp = new PaginaDisparar(page);
      await test.step('MED', async () => {
        await dsp.abrir(q(aberto.anoMes, 'med-continente'));
        await dsp.escolherWorkflow();
        await dsp.escolherSugestao('Prestadores', 'farm');
        await dsp.escolherSugestao('Facturas', '');
        const explicacoes = page.getByText(
          /^(As facturas deste recorte cabem no limite de re-enriquecimento\.|As facturas deste recorte sÃ£o mais do que o limite de re-enriquecimento autoriza\.|O recorte Ã© largo de mais para as facturas serem enumeradas, e sem elas nÃ£o hÃ¡ o que refrescar\.)$/,
        );
        await expect(explicacoes.first()).toBeVisible({ timeout: 60_000 });
        observar(`MED: ${(await explicacoes.first().innerText()).trim()}`);
      });
      for (const slug of ['mcdt', 'crd']) {
        await test.step(slug.toUpperCase(), async () => {
          await dsp.abrir(q(aberto.anoMes, slug));
          const passo4 = dsp.passo('4. Re-enriquecimento').locator('xpath=ancestor::*[contains(., "Em breve")][1]');
          await expect(passo4).toContainText('Em breve: ainda nÃ£o disponÃ­vel nesta Ã¡rea.', { timeout: 30_000 });
        });
      }
    });

    test('CT-CONF-DSP-12 â€” Tecto de 10 000 itens', metaConf(ITEM, 'CT-CONF-DSP-12', ['RN-18']), async () => {
      semMassa(true, 'sÃ³ com massa de facturas/prestaÃ§Ãµes > 10 000 combinada Ã  mÃ£o (âž–)');
    });

    test('CT-CONF-DSP-18 â€” URLs incompletas', metaConf(ITEM, 'CT-CONF-DSP-18', ['Â§5 PRD'], { tipo: 'negativo' }), async ({ page }) => {
      const aberto = exigirAberto();
      const dsp = new PaginaDisparar(page);
      await test.step('sem ciclo', async () => {
        await dsp.abrir('area=med-continente&modo=disparar');
        await expect(page.getByText('Escolha um ciclo no cockpit para disparar uma conferÃªncia.', { exact: true })).toBeVisible();
      });
      await test.step('Ã¡rea inexistente', async () => {
        await dsp.abrir(`ciclo=${aberto.anoMes}&area=xpto&modo=disparar`);
        await expect(page.getByText('Ãrea nÃ£o encontrada.', { exact: true })).toBeVisible();
      });
      await test.step('reprocessar sem arranque', async () => {
        await dsp.abrir(`ciclo=${aberto.anoMes}&area=med-continente&modo=reprocessar`);
        await expect(page.getByText('Falta a execuÃ§Ã£o a reprocessar; volte Ã  tela de detalhe e escolha-a no registo.', { exact: true })).toBeVisible();
      });
    });
  });

  // ---------------------------------------------------------------------------------
  test.describe('Fluxos ponta a ponta', () => {
    test('CT-CONF-E2E-05 â€” Data da mensagem de bloqueio = limite de receÃ§Ã£o no CalendÃ¡rio', metaConf(ITEM, 'CT-CONF-E2E-05', ['RN-01', 'Q-19']), async ({ page, request }) => {
      exigirAberto();
      const agora = Date.now();
      let alvo: { slug: string; anoMes: number; limite: string } | undefined;
      for (const ciclo of ciclos.todos.filter((c) => c.estado === 'ABERTO')) {
        const cal = await areasDoCalendario(request, ciclo.anoMes);
        for (const a of AREAS_DETALHE) {
          const x = cal.areas.find((y) => y.area === a.calendario);
          const lim = x?.limiteRececao ?? (x?.janelaHerdada ? cal.fim : null);
          if (x?.migrada && lim && Date.parse(lim) >= agora) {
            alvo = { slug: a.slug, anoMes: ciclo.anoMes, limite: lim };
            break;
          }
        }
        if (alvo) break;
      }
      semMassa(!alvo, 'nenhuma Ã¡rea ativa em receÃ§Ã£o nos ciclos Â«Em cursoÂ» (DSP-07 nÃ£o aplicÃ¡vel)');
      const [d, m, a] = alvo!.limite.slice(0, 10).split('-').reverse();
      const dsp = new PaginaDisparar(page);
      await dsp.abrir(`ciclo=${alvo!.anoMes}&area=${alvo!.slug}&modo=disparar`);
      await dsp.escolherWorkflow();
      await expect(page.getByText(/decorre atÃ© \d{2}\/\d{2}\/\d{4}/).first()).toContainText(`${d}/${m}/${a}`, { timeout: 30_000 });
    });
  });

  // ---------------------------------------------------------------------------------
  test.describe('Negativos transversais', () => {
    test('CT-CONF-NEG-01 â€” Falha do servidor no Cockpit mostra a mensagem, sem ecrÃ£ branco', metaConf(ITEM, 'CT-CONF-NEG-01', ['RNF-07'], { tipo: 'robustez' }), async ({ page }) => {
      const aberto = exigirAberto();
      await page.route('**/resumo-areas', (r) => r.abort('failed'));
      const ck = new PaginaCockpit(page);
      await ck.abrir();
      await ck.escolherCiclo(aberto.rotulo);
      await botao(page, 'Pesquisar').click();
      await expect(page.getByText('NÃ£o foi possÃ­vel obter o estado das Ã¡reas de conferÃªncia.')).toBeVisible({ timeout: 60_000 });
      await expect(ck.titulo()).toBeVisible();
    });

    test('CT-CONF-NEG-02 â€” Fila indisponÃ­vel nunca mostra 0', metaConf(ITEM, 'CT-CONF-NEG-02', ['RF-04'], { tipo: 'robustez' }), async ({ page }) => {
      const aberto = exigirAberto();
      await page.route(/\/cockpit\/areas\/[A-Z]+\/fila/, (r) => r.abort('failed'));
      const det = new PaginaDetalheArea(page);
      await det.abrir('med-continente', `?ciclo=${aberto.anoMes}`);
      await det.esperarCarregado('Medicamentos Continente');
      await expect(page.getByText(/^InformaÃ§Ã£o da fila indisponÃ­vel\./).first()).toBeVisible({ timeout: 60_000 });
      await expect(page.getByText('PrestaÃ§Ãµes a aguardar conferÃªncia automÃ¡tica')).toHaveCount(0);
    });
  });
});

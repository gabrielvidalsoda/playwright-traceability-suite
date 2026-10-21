import type { Page } from '@playwright/test';
import { abrirItemMenu } from '../../../paginas/conferencia/menu';
import { botao, combobox, escolherOpcao, opcoesDe, Tabela, tituloH1, trilho, trilhoBreadcrumb } from '../../../paginas/conferencia/Traceability Suite';
import {
  abrir,
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
 * ConferÃªncia â†’ GestÃ£o de CalendÃ¡rio â€” script C1 (VisualizaÃ§Ã£o) de 08-10-2026, S4.1 a S4.4.
 * SÃ³ leitura: nunca Â«GuardarÂ», Â«Editar perÃ­odoÂ», Â«Adicionar marcoÂ», Â«Novo tipo de marcoÂ»,
 * nem os Ã­cones de editar/remover regras e marcos (a pÃ¡gina Datas da Ã¡rea nÃ£o tem autosave).
 */

const ITEM = 'calendario' as const;
const BASE = '/conferencia/calendario';
const COLUNAS = ['Ãrea', 'Estado', 'Janela de receÃ§Ã£o', 'Limite desp. nÃ£o conferida', 'Limite desp. conferida', 'Marcos'];
const MESES = ['Janeiro', 'Fevereiro', 'MarÃ§o', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

interface AreaCiclo {
  area: string;
  rotuloArea: string;
  estado: string;
  rotuloEstado: string;
  migrada: boolean;
  janelaHerdada: boolean;
  inicioRececao: string | null;
  limiteRececao: string | null;
  limiteDespNaoConf: string | null;
  limiteDespConf: string | null;
  totalMarcos: number;
}
interface CicloAreas {
  anoMes: number;
  rotulo: string;
  estado: string;
  rotuloEstado: string;
  fim: string;
  areas: AreaCiclo[];
}
interface Marco {
  codigo: string;
  planeada: string | null;
  efetiva: string | null;
}

let ciclos: MassaCiclos;
test.beforeAll(async ({ request }) => {
  ciclos = await massaCiclos(request);
});

const areasDe = (request: Parameters<typeof obterJson>[0], anoMes: number) =>
  obterJson<CicloAreas>(request, `/calendario/ciclos/${anoMes}/areas`);

/** dd/mm/aaaa a partir de um ISO (data local). */
const ddmmaaaa = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');

/** Legenda de prazo esperada (`utils.ts`): sÃ³ atÃ© 7 dias. */
function legendaPrazo(iso: string | null, hoje: Date): string | undefined {
  if (!iso) return undefined;
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  const h = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const dias = Math.round((d.getTime() - h.getTime()) / 86_400_000);
  if (dias < 0) return 'prazo ultrapassado';
  if (dias === 0) return 'termina hoje';
  if (dias === 1) return 'falta 1 dia';
  if (dias <= 7) return `faltam ${dias} dias`;
  return undefined;
}

class VisaoGeral {
  constructor(readonly page: Page) {}
  async abrir(anoMes?: number): Promise<void> {
    await abrir(this.page, `${BASE}/visao-geral${anoMes ? `/${anoMes}` : ''}`);
    await expect(tituloH1(this.page)).toHaveText(/^CalendÃ¡rio do ciclo /, { timeout: 30_000 });
    await this.tabela().esperar();
  }
  tabela(): Tabela {
    return Tabela.comColuna(this.page, 'Janela de receÃ§Ã£o');
  }
  linha(area: string) {
    return this.tabela().linhas().filter({ has: this.page.getByText(area, { exact: true }) }).first();
  }
}

test.describe('ConferÃªncia â†’ GestÃ£o de CalendÃ¡rio', () => {
  // ---------------------------------------------------------------------------------
  test.describe('VisÃ£o geral', () => {
    test('CT-CONF-CAL-01 â€” Abrir pelo menu redireciona para o ciclo corrente', metaConf(ITEM, 'CT-CONF-CAL-01', ['RF-15']), async ({ page, request }) => {
      const lista = await obterJson<Ciclo[]>(request, '/calendario/ciclos');
      const corrente = lista.find((c) => c.corrente) ?? lista.find((c) => c.estado === 'ABERTO');
      semMassa(!corrente, 'nenhum ciclo corrente nem Em curso');
      await abrir(page, '/');
      await abrirItemMenu(page, 'GestÃ£o de calendÃ¡rio');
      await expect(page).toHaveURL(new RegExp(`${BASE}/visao-geral/${corrente!.anoMes}$`));
      const det = await areasDe(request, corrente!.anoMes);
      await expect(tituloH1(page)).toHaveText(`CalendÃ¡rio do ciclo ${det.rotulo} Â· ${det.rotuloEstado}`);
      const sub = page.getByText(/^PerÃ­odo do ciclo: \d{2}\/\d{2}\/\d{4} a \d{2}\/\d{2}\/\d{4}\./);
      await expect.soft(sub).toBeVisible();
      await expect.soft(sub).toContainText(/Janela herdada por \d+ das 12 Ã¡reas\./);
      await expect.soft(sub).toContainText(/horizonte: \d+ ciclos/);
      expect.soft(await trilhoBreadcrumb(page)).toEqual(trilho('ConferÃªncia', 'GestÃ£o de CalendÃ¡rio'));
    });

    test('CT-CONF-CAL-02 â€” Seletor de ciclos: estado no rÃ³tulo e Â«Mostrar todos os ciclos cadastradosÂ»', metaConf(ITEM, 'CT-CONF-CAL-02', ['RF-15']), async ({ page }) => {
      const vg = new VisaoGeral(page);
      await vg.abrir();
      const antes = await opcoesDe(page, 'Ciclo');
      expect.soft(antes.at(-1), 'Ãºltima opÃ§Ã£o').toBe('Mostrar todos os ciclos cadastrados');
      for (const o of antes.filter((x) => !/^(Selec|Mostrar todos)/.test(x))) {
        expect.soft(o, 'rÃ³tulo com estado').toMatch(/ \((Planeado|Em curso|Fechado)\)$/);
      }
      const todos = page.waitForRequest((r) => /\/calendario\/ciclos\?.*futuros=240/.test(r.url()));
      await escolherOpcao(page, 'Ciclo', 'Mostrar todos os ciclos cadastrados');
      await todos;
      const lista = page.getByRole('option');
      // O seletor volta a montar e reabre sozinho depois de carregar os ciclos futuros (`futuros=240`).
      await page.waitForTimeout(2_000);
      if (!(await page.getByRole('listbox').isVisible().catch(() => false))) await combobox(page, 'Ciclo').click();
      await expect(lista.filter({ hasText: /\(Planeado\)$/ }).first()).toBeVisible({ timeout: 60_000 });
      const depois = (await lista.allInnerTexts()).map((t) => t.trim());
      expect.soft(depois.length, 'mais ciclos com Â«Mostrar todosÂ»').toBeGreaterThanOrEqual(antes.length);
      expect.soft(depois.some((o) => /\(Planeado\)$/.test(o)), 'inclui planeados').toBe(true);
      const outro = depois.find((o) => / \((Planeado|Em curso|Fechado)\)$/.test(o) && !antes.includes(o)) ??
        depois.find((o) => /\(Fechado\)$/.test(o))!;
      const url = page.url();
      await page.getByRole('option', { name: outro, exact: true }).click();
      await expect(page).not.toHaveURL(url);
      await expect(page).toHaveURL(new RegExp(`${BASE}/visao-geral/\\d{6}$`));
    });

    test('CT-CONF-CAL-03 â€” Tabela das 12 Ã¡reas', metaConf(ITEM, 'CT-CONF-CAL-03', ['RF-15']), async ({ page, request }) => {
      const aberto = ciclos.aberto ?? ciclos.fechado;
      semMassa(!aberto, 'sem ciclos');
      const vg = new VisaoGeral(page);
      await vg.abrir(aberto!.anoMes);
      const t = vg.tabela();
      expect.soft(await t.colunas()).toEqual(COLUNAS);
      await expect.soft(t.linhas()).toHaveCount(12);
      const det = await areasDe(request, aberto!.anoMes);
      for (const a of det.areas) {
        await test.step(a.area, async () => {
          const linha = vg.linha(a.area);
          await expect.soft(linha).toContainText(a.rotuloArea);
          await expect.soft(linha).toContainText(a.migrada ? a.rotuloEstado : 'No sistema atual');
          if (!a.limiteDespNaoConf || !a.limiteDespConf) {
            // O script diz Â«por cadastrarÂ»; o DEV de 08-10 mostra Â«por registarÂ» (padrÃ£o pt-PT).
            await expect.soft(linha).toContainText(/por (cadastrar|registar)/);
          }
          if (a.janelaHerdada) await expect.soft(linha).toContainText('herdada do ciclo');
          await expect.soft(linha.getByRole('button', { name: `Editar as datas de ${a.area}` })).toBeVisible();
        });
      }
    });

    test('CT-CONF-CAL-04 â€” Alertas de prazo sem bloqueio; ciclo fechado sem prazos', metaConf(ITEM, 'CT-CONF-CAL-04', ['RF-22', 'RN-15']), async ({ page, request }) => {
      const vg = new VisaoGeral(page);
      const RE_PRAZO = /prazo ultrapassado|termina hoje|falta 1 dia|faltam \d+ dias/;
      if (ciclos.aberto) {
        await test.step(`Ciclo aberto ${ciclos.aberto.rotulo}`, async () => {
          await vg.abrir(ciclos.aberto!.anoMes);
          const det = await areasDe(request, ciclos.aberto!.anoMes);
          const hoje = new Date();
          for (const a of det.areas.filter((x) => x.estado !== 'FECHADO')) {
            const linha = vg.linha(a.area);
            for (const d of [a.limiteRececao, a.limiteDespNaoConf, a.limiteDespConf]) {
              const leg = legendaPrazo(d, hoje);
              if (leg) await expect.soft(linha, `${a.area} ${d}: Â«${leg}Â»`).toContainText(leg);
            }
            await expect.soft(linha.getByRole('button', { name: `Editar as datas de ${a.area}` }), `${a.area}: ediÃ§Ã£o nÃ£o bloqueada`).toBeEnabled();
          }
        });
      }
      if (ciclos.fechado) {
        await test.step(`Ciclo fechado ${ciclos.fechado.rotulo}`, async () => {
          await vg.abrir(ciclos.fechado!.anoMes);
          expect.soft(await vg.tabela().raiz.innerText()).not.toMatch(RE_PRAZO);
        });
      }
      semMassa(!ciclos.aberto && !ciclos.fechado, 'sem ciclos');
    });

    test('CT-CONF-CAL-05 â€” Banners do ciclo fechado e do planeado', metaConf(ITEM, 'CT-CONF-CAL-05', ['RF-21']), async ({ page }) => {
      const vg = new VisaoGeral(page);
      semMassa(!ciclos.fechado && !ciclos.planeado, 'sem ciclos Fechados nem Planeados');
      if (ciclos.fechado) {
        await vg.abrir(ciclos.fechado.anoMes);
        await expect.soft(page.getByText('Todas as Ã¡reas migradas deste ciclo estÃ£o fechadas. As datas estÃ£o em modo de leitura.')).toBeVisible();
      }
      if (ciclos.planeado) {
        await vg.abrir(ciclos.planeado.anoMes);
        const banner = page.getByText(/^Ciclo planeado: nenhuma Ã¡rea abriu ainda\. As Ã¡reas abrem automaticamente no inÃ­cio da sua janela de receÃ§Ã£o\./);
        await expect.soft(banner).toBeVisible();
        if (await banner.count()) observar(`Banner do ciclo planeado: Â«${(await banner.first().innerText()).trim()}Â»`);
      }
    });

    test('CT-CONF-CAL-06 â€” Marcos de uma Ã¡rea (modal sÃ³ de leitura)', metaConf(ITEM, 'CT-CONF-CAL-06', ['RF-18']), async ({ page, request }) => {
      const ciclo = ciclos.aberto ?? ciclos.fechado;
      semMassa(!ciclo, 'sem ciclos');
      const det = await areasDe(request, ciclo!.anoMes);
      const comMarcos = det.areas.find((a) => a.totalMarcos > 0);
      semMassa(!comMarcos, `nenhuma Ã¡rea com marcos no ciclo ${ciclo!.rotulo}`);
      const vg = new VisaoGeral(page);
      await vg.abrir(ciclo!.anoMes);
      await vg.linha(comMarcos!.area).getByRole('button', { name: `${comMarcos!.totalMarcos} marcos` }).click();
      const dialogo = page.getByRole('dialog', { name: new RegExp(`^Marcos de ${comMarcos!.area}`) });
      await expect(dialogo).toBeVisible();
      const titulo = (await dialogo.getByText(/^Marcos de /).first().innerText()).trim();
      observar(`TÃ­tulo do modal: Â«${titulo}Â» (o script espera Â«Marcos de {Ã¡rea} Â· {ciclo}Â»)`);
      expect.soft(titulo, 'tÃ­tulo com o ciclo').toContain(ciclo!.rotulo);
      const t = new Tabela(dialogo.locator('table').first());
      await t.esperar();
      expect.soft(await t.colunas()).toEqual(['Marco', 'Planeada', 'Efetiva', 'Aviso', 'Ajusta a dia Ãºtil']);
      const marcos = await obterJson<{ marcos: Marco[] }>(request, `/calendario/ciclos/${ciclo!.anoMes}/areas/${comMarcos!.area}`);
      const reclamacao = marcos.marcos.find((m) => m.codigo === 'LIMITE_RECLAMACAO' && !m.planeada);
      if (reclamacao) await expect.soft(dialogo).toContainText('calculada no fecho da Ã¡rea (+40 dias corridos)');
      await botao(dialogo, 'Fechar').click();
      await expect(dialogo).toBeHidden();
    });

    test('CT-CONF-CAL-30 â€” Painel Â«CalendÃ¡rio do ciclo â€¦Â» com botÃ£o colapsar/expandir (anotaÃ§Ãµes 08-10)', metaConf(ITEM, 'CT-CONF-CAL-30', ['TR'], { interface: true }), async ({ page }) => {
      const vg = new VisaoGeral(page);
      await vg.abrir();
      const cabecalho = tituloH1(page).locator('xpath=..');
      await expect(cabecalho.getByRole('button', { name: /^(Colapsar|Expandir)$/ }), 'botÃ£o no cabeÃ§alho do painel principal (Manual A.5)').toHaveCount(1);
    });

    test('CT-CONF-CAL-07 â€” CalendÃ¡rio do mÃªs: navegaÃ§Ã£o, legenda e filtro Â«SÃ³ marcosÂ»', metaConf(ITEM, 'CT-CONF-CAL-07', ['RF-15']), async ({ page, request }) => {
      const ciclo = ciclos.aberto ?? ciclos.fechado;
      semMassa(!ciclo, 'sem ciclos');
      const vg = new VisaoGeral(page);
      await vg.abrir(ciclo!.anoMes);
      const ano = Math.floor(ciclo!.anoMes / 100);
      const mes = (ciclo!.anoMes % 100) - 1;
      const mesH3 = (a: number, m: number) => page.getByRole('heading', { level: 3, name: `${MESES[m]} ${a}`, exact: true });
      await expect(mesH3(ano, mes), 'abre no mÃªs do ciclo').toBeVisible();
      for (const l of ['ReceÃ§Ã£o', 'Despesa nÃ£o conferida', 'Despesa conferida', 'Marco de processo']) {
        await expect.soft(page.getByText(l, { exact: true }).first(), `legenda ${l}`).toBeVisible();
      }
      await test.step('Dias marcados = tabela (limite de receÃ§Ã£o)', async () => {
        const det = await areasDe(request, ciclo!.anoMes);
        const doMes = det.areas.filter((a) => a.migrada && a.limiteRececao?.startsWith(`${ano}-${String(mes + 1).padStart(2, '0')}`));
        for (const a of doMes) {
          const dia = Number(a.limiteRececao!.slice(8, 10));
          await expect.soft(page.getByTestId(`dia-${dia}`), `${a.area} no dia ${dia}`).toContainText(a.area);
        }
      });
      await test.step('â€¹ â€º Â« Â» Hoje', async () => {
        const seg = mes === 11 ? [ano + 1, 0] : [ano, mes + 1];
        await botao(page, 'MÃªs seguinte').click();
        await expect(mesH3(seg[0], seg[1])).toBeVisible();
        await botao(page, 'MÃªs anterior').click();
        await expect(mesH3(ano, mes)).toBeVisible();
        await botao(page, 'AvanÃ§ar 1 ano').click();
        await expect(mesH3(ano + 1, mes)).toBeVisible();
        await botao(page, 'Recuar 1 ano').click();
        await expect(mesH3(ano, mes)).toBeVisible();
        await botao(page, 'Hoje').click();
        const hoje = new Date();
        await expect(mesH3(hoje.getFullYear(), hoje.getMonth())).toBeVisible();
      });
      await test.step('Mostrar = Â«SÃ³ marcosÂ»', async () => {
        await abrir(page, `${BASE}/visao-geral/${ciclo!.anoMes}`);
        await expect(mesH3(ano, mes)).toBeVisible({ timeout: 30_000 });
        const limites = page.locator('[data-testid^="dia-"] [aria-label^="Limite de"]');
        const antes = await limites.count();
        await escolherOpcao(page, 'Mostrar', 'SÃ³ marcos');
        await expect(limites).toHaveCount(0);
        observar(`Datas-limite no mÃªs antes do filtro: ${antes}`);
      });
    });
  });

  // ---------------------------------------------------------------------------------
  test.describe('Datas da Ã¡rea', () => {
    const area = (page: Page, anoMes: number, codigo: string) => abrir(page, `${BASE}/area/${anoMes}/${codigo}`);

    test('CT-CONF-CAL-11 â€” Abrir a Ã¡rea MED de um ciclo planeado', metaConf(ITEM, 'CT-CONF-CAL-11', ['RF-15', 'RN-14']), async ({ page }) => {
      semMassa(!ciclos.planeado, '{CICLO_PLANEADO}');
      const vg = new VisaoGeral(page);
      await vg.abrir(ciclos.planeado!.anoMes);
      await botao(page, 'Editar as datas de MED').click();
      await expect(page).toHaveURL(new RegExp(`${BASE}/area/${ciclos.planeado!.anoMes}/MED$`));
      await expect(tituloH1(page)).toHaveText(/^Datas-limite Â· MED Medicamentos Â· /);
      // Script: Â«Ãrea planeada: abre automaticamente a dd/mm/aaaaâ€¦Â»; DEV 08-10: Â«â€¦ entra em receÃ§Ã£o automaticamente a â€¦Â».
      const bannerPlaneada = page.getByText(/^Ãrea planeada: (abre|entra em receÃ§Ã£o) automaticamente a \d{2}\/\d{2}\/\d{4}/);
      await expect.soft(bannerPlaneada).toBeVisible();
      if (await bannerPlaneada.count()) observar(`Banner: Â«${(await bannerPlaneada.first().innerText()).trim()}Â»`);
      await expect.soft(page.getByLabel(/^InÃ­cio da janela de receÃ§Ã£o/).first()).toBeDisabled();
      await expect.soft(page.getByText(/^SÃ³ leitura: derivado da contiguidade/)).toBeVisible();
    });

    test('CT-CONF-CAL-16 â€” Janela herdada: limite de receÃ§Ã£o sÃ³ de leitura', metaConf(ITEM, 'CT-CONF-CAL-16', ['RN-14']), async ({ page, request }) => {
      let alvo: { anoMes: number; area: string } | undefined;
      for (const c of [ciclos.planeado, ciclos.aberto].filter(Boolean) as Ciclo[]) {
        const a = (await areasDe(request, c.anoMes)).areas.find((x) => x.janelaHerdada && x.migrada);
        if (a) {
          alvo = { anoMes: c.anoMes, area: a.area };
          break;
        }
      }
      semMassa(!alvo, 'nenhuma Ã¡rea com janela herdada');
      await area(page, alvo!.anoMes, alvo!.area);
      await expect(tituloH1(page)).toHaveText(/^Datas-limite Â· /, { timeout: 30_000 });
      await expect.soft(page.getByLabel(/^Limite de receÃ§Ã£o/).first()).toBeDisabled();
      await expect.soft(page.getByText('herdada do perÃ­odo do ciclo', { exact: true })).toBeVisible();
    });

    test('CT-CONF-CAL-17 â€” Ãrea fechada: datas nÃ£o editÃ¡veis, sem gravar', metaConf(ITEM, 'CT-CONF-CAL-17', ['RN-14']), async ({ page, request }) => {
      semMassa(!ciclos.fechado, '{CICLO_FECHADO}');
      const a = (await areasDe(request, ciclos.fechado!.anoMes)).areas.find((x) => x.migrada);
      semMassa(!a, 'ciclo fechado sem Ã¡reas migradas');
      await area(page, ciclos.fechado!.anoMes, a!.area);
      await expect(page.getByText('Ãrea fechada neste ciclo. As datas nÃ£o podem ser alteradas.')).toBeVisible({ timeout: 30_000 });
      for (const r of [/^Limite de receÃ§Ã£o/, /^Limite de despesa nÃ£o conferida/, /^Limite de despesa conferida/]) {
        await expect.soft(page.getByLabel(r).first(), `${r}`).toBeDisabled();
      }
      await expect.soft(botao(page, 'Guardar')).toHaveCount(0);
      await expect.soft(botao(page, 'Adicionar marco')).toHaveCount(0);
    });

    test('CT-CONF-CAL-18 â€” Ãrea nÃ£o migrada (HD): banner do sistema atual', metaConf(ITEM, 'CT-CONF-CAL-18', ['Q-27']), async ({ page }) => {
      const ciclo = ciclos.aberto ?? ciclos.planeado;
      semMassa(!ciclo, 'sem ciclo aberto/planeado');
      await area(page, ciclo!.anoMes, 'HD');
      await expect(page.getByText(/^Ãrea tratada no sistema atual: o ciclo nÃ£o abre nesta soluÃ§Ã£o\./)).toBeVisible({ timeout: 30_000 });
      const editavel = await page.getByLabel(/^Limite de despesa conferida/).first().isEnabled();
      observar(`Q-27: Ã¡rea HD nÃ£o migrada â€” campos ${editavel ? 'editÃ¡veis' : 'desativados'}; Â«GuardarÂ» ${(await botao(page, 'Guardar').count()) ? 'visÃ­vel' : 'ausente'}`);
    });

    test('CT-CONF-CAL-22 â€” Marco com data efetiva: Planeada desativada', metaConf(ITEM, 'CT-CONF-CAL-22', ['RF-18']), async ({ page, request }) => {
      semMassa(!ciclos.aberto, '{CICLO_ABERTO}');
      const det = await areasDe(request, ciclos.aberto!.anoMes);
      let alvo: { area: string; marco: Marco } | undefined;
      for (const a of det.areas.filter((x) => x.totalMarcos > 0 && x.estado !== 'FECHADO')) {
        const m = (await obterJson<{ marcos: Marco[] }>(request, `/calendario/ciclos/${ciclos.aberto!.anoMes}/areas/${a.area}`)).marcos.find((x) => x.efetiva);
        if (m) {
          alvo = { area: a.area, marco: m };
          break;
        }
      }
      semMassa(!alvo, 'nenhum marco com data efetiva no ciclo aberto');
      await area(page, ciclos.aberto!.anoMes, alvo!.area);
      const bloco = page.getByTestId(`marco-${alvo!.marco.codigo}`);
      await expect(bloco).toBeVisible({ timeout: 30_000 });
      await expect.soft(bloco.getByLabel(/^Planeada/).first()).toBeDisabled();
      await expect.soft(bloco).toContainText(ddmmaaaa(alvo!.marco.efetiva!));
    });
  });

  // ---------------------------------------------------------------------------------
  test.describe('Tipos de marco', () => {
    test('CT-CONF-CAL-25 â€” Lista de tipos de marco sem editar/apagar', metaConf(ITEM, 'CT-CONF-CAL-25', ['RF-19', 'Q-29']), async ({ page }) => {
      const vg = new VisaoGeral(page);
      await vg.abrir();
      await botao(page, 'Tipos de marco').click();
      await expect(page).toHaveURL(new RegExp(`${BASE}/tipos-marco$`));
      await expect(tituloH1(page)).toHaveText('Tipos de marco');
      const t = Tabela.comColuna(page, 'Regra de prÃ©-cÃ¡lculo');
      await t.esperar();
      expect.soft(await t.colunas()).toEqual([
        'CÃ³digo', 'DescriÃ§Ã£o', 'Origem', 'Em uso nos ciclos', 'Regra de prÃ©-cÃ¡lculo', 'Ajusta a dia Ãºtil', 'Aviso (por omissÃ£o)',
      ]);
      await expect.soft(page.getByText(/^Dado nÃ£o Ã© comportamento\./)).toBeVisible();
      await expect.soft(t.raiz.locator('tbody button')).toHaveCount(0);
      if (await botao(page, 'Novo tipo de marco').count()) observar('Existe Â«Novo tipo de marcoÂ» (cria tipos; nÃ£o usado).');
    });
  });

  // ---------------------------------------------------------------------------------
  test.describe('Regras de preenchimento', () => {
    test('CT-CONF-CAL-28 â€” Grelha de regras: 12 Ã¡reas Ã— 3 datas', metaConf(ITEM, 'CT-CONF-CAL-28', ['RF-20']), async ({ page }) => {
      const vg = new VisaoGeral(page);
      await vg.abrir();
      await botao(page, 'Regras de preenchimento').click();
      await expect(page).toHaveURL(new RegExp(`${BASE}/regras$`));
      await expect(tituloH1(page)).toHaveText('Regras de preenchimento do ciclo');
      const t = Tabela.comColuna(page, 'Limite de despesa conferida');
      await t.esperar();
      expect.soft(await t.colunas()).toEqual(['Ãrea', 'Limite de receÃ§Ã£o', 'Limite de despesa nÃ£o conferida', 'Limite de despesa conferida']);
      await expect.soft(t.linhas()).toHaveCount(12);
      for (const c of ['Limite de receÃ§Ã£o', 'Limite de despesa nÃ£o conferida', 'Limite de despesa conferida']) {
        for (const v of await t.valoresColuna(c)) expect.soft(v, `${c}: cÃ©lula preenchida`).not.toBe('');
      }
      const banner = page.getByText(/^PerÃ­odo do ciclo \(cabeÃ§alho\): fim da janela = /);
      await expect.soft(banner).toBeVisible();
      await expect.soft(page.getByRole('button', { name: 'Editar', exact: true }).first()).toBeVisible();
    });
  });
});

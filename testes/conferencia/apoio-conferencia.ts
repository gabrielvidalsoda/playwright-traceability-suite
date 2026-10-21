import type { APIRequestContext, Page } from '@playwright/test';
import { expect, test as testBase } from '../fixtures';
import { meta } from '../apoio';
import { abrirItemMenu } from '../../paginas/conferencia/menu';
import { lerPadraoPesquisa, SELETOR_CHIPS, type CampoFiltro, type PadraoPesquisa } from '../../paginas/conferencia/padraoPesquisa';
import { ci, tituloH1 } from '../../paginas/conferencia/Traceability Suite';
import { naoAplicavel } from '../../paginas/dadosReferencia/padraoUi';

/**
 * Apoio comum aos specs de `testes/conferencia/<item>/` â€” automaÃ§Ã£o da camada C1
 * (VisualizaÃ§Ã£o) do script de testes manuais da ConferÃªncia de 08-10-2026:
 * `CCM/QA/Testes/PDT/Testes manuais/08-10-2026-conferencia-funcional/Script-Conferencia-C1-Visualizacao-2026-10-08.md`.
 *
 * Regra da camada: **nenhuma escrita em DEV** (os workflows e regras existentes sÃ£o a base de
 * testes do Walmir). Esta suÃ­te sÃ³ visualiza pÃ¡ginas e elementos e exporta dados. Para o
 * garantir, o `test` daqui intercepta todos os pedidos Ã  API e **aborta** qualquer
 * POST/PUT/PATCH/DELETE que nÃ£o seja de leitura (ver `ESCRITAS_SO_LEITURA`); se algum for
 * bloqueado, o teste falha no fim com a lista dos pedidos â€” sinal de que um passo clicou
 * onde nÃ£o devia (ou de que a app passou a gravar ao abrir um ecrÃ£).
 *
 * IDs de caso: os do script (`CT-CONF-CKP-01`, `PRE-02`, â€¦), sem renumerar.
 */

export const API = '/ccmsns/api';

/** POSTs que nÃ£o alteram dados: exportaÃ§Ã£o XLSX e contagem do recorte do disparo. */
const ESCRITAS_SO_LEITURA = [/\/exportar$/, /\/disparos\/preview$/];

export const test = testBase.extend<{ _semEscrita: void }>({
  _semEscrita: [
    async ({ context }, use, testInfo) => {
      // O DEV responde devagar (pesquisas de 20â€“40 s): mÃ­nimo de 2 min por caso.
      testInfo.setTimeout(Math.max(testInfo.timeout, 120_000));
      const bloqueados: string[] = [];
      await context.route(`**${API}/**`, async (route) => {
        const pedido = route.request();
        const metodo = pedido.method();
        const caminho = new URL(pedido.url()).pathname;
        if (['GET', 'HEAD', 'OPTIONS'].includes(metodo) || ESCRITAS_SO_LEITURA.some((re) => re.test(caminho))) {
          await route.fallback();
          return;
        }
        bloqueados.push(`${metodo} ${caminho}`);
        await route.abort('blockedbyclient');
      });
      await use();
      if (bloqueados.length > 0) {
        testInfo.annotations.push({ type: 'escrita-bloqueada', description: bloqueados.join('; ') });
      }
      expect(bloqueados, 'pedidos de escrita bloqueados â€” o teste sÃ³ pode visualizar').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Item do menu ConferÃªncia a que o caso pertence (vira a tag `@area-<item>`). */
export type ItemConferencia =
  | 'menu'
  | 'cockpit'
  | 'worklist'
  | 'supervisao'
  | 'workflows'
  | 'regras'
  | 'logs'
  | 'aprovacoes'
  | 'calendario'
  | 'feriados'
  | 'movimentacao';

/**
 * Converte a coluna Â«Ref.Â» do script em requisitos: `RF-02` â†’ `CONF-RF-02`, `RN-19` â†’
 * `CONF-RN-19`, `Â§5 PRD` â†’ `CONF-PRD-5`, `[TR]` â†’ `CONF-TR` (transversal). As dÃºvidas `Q-xx`
 * ficam como anotaÃ§Ã£o `questao` (nÃ£o sÃ£o requisitos).
 */
function requisitosDe(refs: string[]): { requisitos: string[]; questoes: string[] } {
  const requisitos: string[] = [];
  const questoes: string[] = [];
  for (const ref of refs) {
    const r = ref.replace(/^âš \s*/, '').trim();
    if (/^Q-\d+/.test(r)) questoes.push(r);
    else if (r === '[TR]' || r === 'TR') requisitos.push('CONF-TR');
    else if (/^Â§/.test(r)) requisitos.push(`CONF-PRD-${r.replace(/^Â§/, '').replace(/\s*PRD$/, '')}`);
    else requisitos.push(`CONF-${r}`);
  }
  return { requisitos, questoes };
}

/** `meta()` dos casos da C1: suÃ­te `conferencia`, camada `integracao` (backend real em DEV). */
export function metaConf(
  item: ItemConferencia,
  caso: string,
  refs: string[],
  opcoes: {
    tipo?: 'positivo' | 'negativo' | 'robustez';
    interface?: boolean;
    /** Defeito ou tarefa de origem (`BUG-â€¦`, `TASK-â€¦`) â€” vira a tag `@<id>` e a anotaÃ§Ã£o `bug`. */
    bug?: string;
    /** Plano de origem, quando nÃ£o Ã© o script C1 de 08-10-2026. */
    plano?: string;
  } = {},
) {
  const { requisitos, questoes } = requisitosDe(refs);
  const m = meta({
    caso,
    requisitos,
    area: item,
    suite: 'conferencia',
    camada: 'integracao',
    tipo: opcoes.tipo ?? 'positivo',
    tipoTeste: opcoes.interface ? 'interface' : 'caixa-preta',
    bug: opcoes.bug,
    plano: opcoes.plano ?? `Script C1 VisualizaÃ§Ã£o (ConferÃªncia, 08-10-2026) â€” ${caso}`,
  });
  return { ...m, annotation: [...m.annotation, ...questoes.map((q) => ({ type: 'questao', description: q }))] };
}

/** Regista um comportamento a confirmar, sem falhar o teste (vai para o relatÃ³rio). */
export function observar(descricao: string): void {
  test.info().annotations.push({ type: 'observacao', description: descricao });
}

/** Marca o caso como nÃ£o aplicÃ¡vel/bloqueado por falta de massa em DEV (âž–/â›” do script). */
export function semMassa(condicao: boolean, motivo: string): void {
  test.skip(condicao, `Sem massa em DEV: ${motivo}`);
}

export async function abrir(page: Page, rota: string): Promise<void> {
  await page.goto(rota, { waitUntil: 'domcontentloaded' });
}

// --- massa de dados, lida da API real (sÃ³ GET) --------------------------------------

const UTILIZADOR = (process.env.E2E_UTILIZADOR ?? 'qa.e2e').slice(0, 20);

/** GET Ã  API real; repete atÃ© 6 vezes (10 s) quando o DEV devolve 5xx (502 intermitentes do gateway). */
export async function obterJson<T>(request: APIRequestContext, caminho: string): Promise<T> {
  let resposta = await request.get(`${API}${caminho}`, { headers: { 'X-Utilizador': UTILIZADOR }, timeout: 60_000 });
  for (let tentativa = 1; tentativa < 6 && resposta.status() >= 500; tentativa++) {
    await new Promise((r) => setTimeout(r, 10_000));
    resposta = await request.get(`${API}${caminho}`, { headers: { 'X-Utilizador': UTILIZADOR }, timeout: 60_000 });
  }
  expect(resposta.ok(), `GET ${API}${caminho} â†’ HTTP ${resposta.status()}`).toBeTruthy();
  return (await resposta.json()) as T;
}

export interface Ciclo {
  anoMes: number;
  rotulo: string;
  inicio: string;
  fim: string;
  estado: 'PLANEADO' | 'ABERTO' | 'FECHADO';
  corrente: boolean;
}

export interface MassaCiclos {
  todos: Ciclo[];
  /** `{CICLO_ABERTO}` â€” o ABERTO mais antigo (= o prÃ©-selecionado pelo Cockpit). */
  aberto?: Ciclo;
  /** `{CICLO_FECHADO}` â€” o FECHADO mais recente. */
  fechado?: Ciclo;
  /** `{CICLO_PLANEADO}` â€” o PLANEADO mais prÃ³ximo. */
  planeado?: Ciclo;
}

/** `{CICLO_*}` do Â§4 do plano geral, a partir de `GET /calendario/ciclos?futuros=240`. */
export async function massaCiclos(request: APIRequestContext): Promise<MassaCiclos> {
  const todos = (await obterJson<Ciclo[]>(request, '/calendario/ciclos?futuros=240')).sort(
    (a, b) => a.anoMes - b.anoMes,
  );
  return {
    todos,
    aberto: todos.find((c) => c.estado === 'ABERTO'),
    fechado: [...todos].reverse().find((c) => c.estado === 'FECHADO'),
    planeado: todos.find((c) => c.estado === 'PLANEADO'),
  };
}

/**
 * Ciclo Â«Em cursoÂ» com dados para os casos do detalhe de Ã¡rea: o prÃ©-selecionado pelo Cockpit
 * (o ABERTO mais antigo) pode estar todo a zeros em DEV. Procura do mais recente para o mais
 * antigo o 1.Âº ciclo ABERTO que satisfaz `temDados`; sem nenhum, devolve o ABERTO por omissÃ£o.
 */
async function cicloAbertoCom(
  ciclos: MassaCiclos,
  temDados: (anoMes: number) => Promise<boolean>,
): Promise<Ciclo | undefined> {
  const abertos = ciclos.todos.filter((c) => c.estado === 'ABERTO').reverse();
  for (const c of abertos) {
    if (await temDados(c.anoMes).catch(() => false)) return c;
  }
  return ciclos.aberto;
}

/** Ciclo ABERTO com prestaÃ§Ãµes em Medicamentos Continente (`resumo-areas`). */
export function cicloComPrestacoesMed(request: APIRequestContext, ciclos: MassaCiclos) {
  return cicloAbertoCom(ciclos, async (anoMes) => {
    const r = await obterJson<{ dados: { area: string; adquirente?: string; prestacoes: number }[] }>(
      request,
      `/cockpit/ciclos/${anoMes}/resumo-areas`,
    );
    return r.dados.some((d) => d.area === 'MED' && (d.adquirente ?? 'CONTINENTE') === 'CONTINENTE' && d.prestacoes > 0);
  });
}

/** Ciclo ABERTO com execuÃ§Ãµes no registo de Medicamentos Continente. */
export function cicloComExecucoesMed(request: APIRequestContext, ciclos: MassaCiclos) {
  return cicloAbertoCom(ciclos, async (anoMes) => {
    const r = await obterJson<{ meta?: { total?: number; totalRegistos?: number } }>(
      request,
      `/cockpit/ciclos/${anoMes}/areas/MED/execucoes?adquirente=CONTINENTE&pagina=0&tamanho=10`,
    );
    return (r.meta?.total ?? r.meta?.totalRegistos ?? 0) > 0;
  });
}

export interface Paginado<T> {
  dados: T[];
  meta: { totalRegistos: number; totalPaginas?: number };
}

export interface TarefaListagem {
  id: number;
  area: 'MED' | 'MCDT' | 'CRD' | 'IPATIMUP';
  estado: string;
  tipo: string;
  tipoDescricao: string | null;
}

/** Tarefas da pool (`GET /conferencia-manual/tarefas`), com os filtros dados. */
export async function tarefas(
  request: APIRequestContext,
  filtros: Record<string, string>,
  size = 5,
): Promise<Paginado<TarefaListagem>> {
  const qs = new URLSearchParams({ ...filtros, page: '0', size: String(size) });
  return obterJson<Paginado<TarefaListagem>>(request, `/conferencia-manual/tarefas?${qs}`);
}

/**
 * Garante que a tarefa estÃ¡ FECHADA antes de abrir o ecrÃ£ de execuÃ§Ã£o: abrir uma tarefa
 * DisponÃ­vel faz `POST /reservar` (sem operador) e `POST /iniciar` (`develop` 14d7c2b) â€” a
 * proteÃ§Ã£o acima abortÃ¡-los-ia, mas nÃ£o se chega lÃ¡.
 */
export async function confirmarTarefaFechada(request: APIRequestContext, id: number): Promise<void> {
  const det = await obterJson<{ tarefa: { estado: string } }>(request, `/conferencia-manual/tarefas/${id}`);
  expect(det.tarefa.estado, `tarefa ${id} tem de estar FECHADA para abrir a execuÃ§Ã£o`).toBe('FECHADA');
}

// --- padrÃ£o de pesquisa (TASK-20260928-08, #1568) -----------------------------------

/** Tarefa de origem do padrÃ£o de pesquisa da ConferÃªncia. */
export const TASK_PADRAO_PESQUISA = 'TASK-20260928-08';
const PLANO_PADRAO_PESQUISA =
  'ValidaÃ§Ã£o Ready for test (09-10-2026) Â§4 â€” CT-REG-TASK-20260928-08 (#1568, Walmir)';

/**
 * `metaConf()` de uma variante do `CT-REG-TASK-20260928-08` (`-WL`, `-SUP`, â€¦). As variantes
 * `informativo` (pendÃªncia P5: Logs e AprovaÃ§Ãµes) correm, mas nÃ£o contam para o veredicto da tarefa.
 */
export function metaPadraoPesquisa(item: ItemConferencia, sufixo: string, opcoes: { informativo?: boolean } = {}) {
  const m = metaConf(item, `CT-REG-TASK-20260928-08-${sufixo}`, ['TR'], {
    interface: true,
    bug: TASK_PADRAO_PESQUISA,
    plano: PLANO_PADRAO_PESQUISA,
  });
  if (!opcoes.informativo) return m;
  return {
    ...m,
    annotation: [
      ...m.annotation,
      {
        type: 'informativo',
        description: 'PendÃªncia P5: ecrÃ£ fora dos 4 da conferÃªncia de 06-10 â€” nÃ£o conta para o veredicto da #1568',
      },
    ],
  };
}

/** ResoluÃ§Ã£o de referÃªncia do sistema (white box de 28-09-2026: Â«resoluÃ§Ã£o mÃ­nima padrÃ£o = 1920x1080Â»). */
export const VIEWPORT_PADRAO_PESQUISA = { width: 1920, height: 1080 } as const;

/** TolerÃ¢ncia (pontos percentuais) da largura dos filtros. */
const TOLERANCIA_LARGURA = 2;

export interface EcraPesquisa {
  /** RÃ³tulo do item no menu lateral Â«ConferÃªnciaÂ». */
  itemMenu: string | RegExp;
  /** TÃ­tulo `h1` esperado (sem distinguir maiÃºsculas). */
  titulo: string;
  /** Pesquisa por omissÃ£o do ecrÃ£ (sÃ³ leitura); devolve o n.Âº de linhas da grelha. */
  pesquisar: (page: Page) => Promise<number>;
}

/** Placeholder fora do padrÃ£o B.7 do Manual (instruÃ§Ã£o Â«Insiraâ€¦Â»/Â«Selecioneâ€¦Â», nunca um exemplo). */
function problemaPlaceholder(campo: CampoFiltro): string | null {
  const p = (campo.placeholder ?? '').trim();
  const valor = `${campo.rotulo}: ${p ? `Â«${p}Â»` : 'sem placeholder'}`;
  if (!p) return `${valor} (sem instruÃ§Ã£o)`;
  if (/^Ex(\.|:|emplo|\b)/i.test(p)) return `${valor} (exemplo em vez de instruÃ§Ã£o)`;
  if (/^[\d\s.,:/-]+$/.test(p)) return `${valor} (sÃ³ dÃ­gitos)`;
  if (campo.tipo === 'data') return null; // mÃ¡scara de formato (ex. DD/MM/YYYY): anotada, nÃ£o avaliada
  if (!/^(Insira|Selecc?ione)\b/i.test(p)) return `${valor} (nÃ£o comeÃ§a por Â«Insiraâ€¦Â»/Â«Selecioneâ€¦Â»)`;
  return null;
}

/**
 * Os 5 pontos da TASK-20260928-08 num ecrÃ£ de pesquisa da ConferÃªncia, um `test.step` por
 * ponto e `expect.soft` para que todos sejam reportados. O ecrÃ£ abre-se pelo menu e o DOM lÃª-se
 * logo a seguir (antes de pesquisar); sÃ³ o ponto 3 (chips) executa a pesquisa por omissÃ£o.
 */
export async function verificarPadraoPesquisa(page: Page, ecra: EcraPesquisa): Promise<void> {
  let leitura!: PadraoPesquisa;
  await test.step('Abrir o ecrÃ£ pelo item de menu', async () => {
    await abrir(page, '/');
    await abrirItemMenu(page, ecra.itemMenu);
    await expect(tituloH1(page)).toHaveText(ci(ecra.titulo), { timeout: 60_000 });
    await expect(page.locator('.Traceability SuiteTemplate__content .Traceability SuiteFormField-root').first()).toBeVisible({ timeout: 30_000 });
    // As opÃ§Ãµes dos SelectBox chegam da API (lenta em DEV): espera o fim dos pedidos, sem falhar.
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
    leitura = await lerPadraoPesquisa(page);
    test.info().annotations.push({
      type: 'padrao-pesquisa',
      description: JSON.stringify({ breadcrumb: leitura.breadcrumb, h1: leitura.h1, blocos: leitura.blocos }),
    });
  });

  await test.step('1. O ecrÃ£ aberto pelo menu nÃ£o mostra breadcrumb', async () => {
    expect.soft(leitura.breadcrumb, `breadcrumb visÃ­vel: Â«${leitura.breadcrumb}Â»`).toBeNull();
  });

  await test.step(`2. Os campos de filtro ocupam ~100% da largura de cada linha (Â±${TOLERANCIA_LARGURA}%)`, async () => {
    expect.soft(leitura.blocos.length, 'blocos de campos de filtro encontrados').toBeGreaterThan(0);
    for (const [i, bloco] of leitura.blocos.entries()) {
      const nome = `bloco ${i + 1}${bloco.tituloCartao ? ` (Â«${bloco.tituloCartao}Â»)` : ''}`;
      if (bloco.totalCampos === 1) {
        // ExceÃ§Ã£o do Manual (B.3): pesquisa com um sÃ³ campo â†’ o campo ocupa 50%.
        const pct = bloco.linhas[0].percentagem;
        expect
          .soft(Math.abs(pct - 50), `${nome}: campo Ãºnico ocupa ${pct}% (esperado 50%)`)
          .toBeLessThanOrEqual(TOLERANCIA_LARGURA);
        continue;
      }
      for (const [j, linha] of bloco.linhas.entries()) {
        const valor = `${nome}, linha ${j + 1} [${linha.campos.join(', ')}]: ${linha.percentagem}% da largura Ãºtil (${bloco.larguraUtil}px)`;
        const ultimaDeVarias = bloco.linhas.length > 1 && j === bloco.linhas.length - 1;
        if (ultimaDeVarias) {
          // A Ãºltima linha de uma grelha que quebra fica com as colunas que sobram: sÃ³ se anota.
          if (linha.percentagem < 100 - TOLERANCIA_LARGURA) observar(`Largura dos filtros â€” Ãºltima linha: ${valor}`);
          continue;
        }
        expect.soft(linha.percentagem, valor).toBeGreaterThanOrEqual(100 - TOLERANCIA_LARGURA);
      }
    }
  });

  await test.step('3. Os textos simples (estado, situaÃ§Ã£o) nÃ£o usam chips nem badges', async () => {
    let linhas = 0;
    try {
      linhas = await ecra.pesquisar(page);
    } catch (e) {
      expect.soft(String(e).split('\n')[0], 'a pesquisa por omissÃ£o nÃ£o concluiu').toBe('');
      return;
    }
    const chips = (await page.locator(SELETOR_CHIPS).allInnerTexts()).map((t) => t.trim() || '(sem texto)');
    if (linhas === 0) {
      naoAplicavel(`${ecra.titulo}: a pesquisa por omissÃ£o nÃ£o devolveu linhas no DEV â€” chips na grelha nÃ£o verificÃ¡veis`);
    }
    expect
      .soft(chips, `chips/badges no conteÃºdo da pÃ¡gina: ${chips.map((c) => `Â«${c}Â»`).join(', ') || 'nenhum'}`)
      .toEqual([]);
  });

  await test.step('4. Os placeholders dÃ£o instruÃ§Ã£o (Â«Insiraâ€¦Â»/Â«Selecioneâ€¦Â»), sem Â«Ex:Â» nem sÃ³ dÃ­gitos', async () => {
    const avaliados = leitura.campos.filter((c) => !c.comValor);
    expect.soft(avaliados.length, 'campos de filtro vazios encontrados').toBeGreaterThan(0);
    const problemas = avaliados.map(problemaPlaceholder).filter((p): p is string => p !== null);
    expect.soft(problemas, `placeholders fora do padrÃ£o: ${problemas.join(' | ') || 'nenhum'}`).toEqual([]);
    const datas = avaliados.filter((c) => c.tipo === 'data').map((c) => `${c.rotulo}: Â«${c.placeholder}Â»`);
    if (datas.length) observar(`Placeholders de data (mÃ¡scara de formato, nÃ£o avaliados): ${datas.join(' | ')}`);
    const comValor = leitura.campos.filter((c) => c.comValor).map((c) => c.rotulo);
    if (comValor.length) observar(`Campos com valor por omissÃ£o (placeholder nÃ£o visÃ­vel): ${comValor.join(', ')}`);
    if (avaliados.some((c) => /^Seleccione/i.test(c.placeholder ?? ''))) {
      observar('Os dropdowns usam Â«SeleccioneÂ» (grafia prÃ©-AO); as restantes pesquisas usam Â«SelecioneÂ»');
    }
  });

  await test.step('5. O tÃ­tulo da pesquisa estÃ¡ dentro do cartÃ£o dos campos de pesquisa', async () => {
    expect.soft(leitura.h1?.dentroDeCartao, `h1 Â«${leitura.h1?.texto ?? '(sem h1)'}Â» dentro de um cartÃ£o`).toBe(true);
    for (const [i, bloco] of leitura.blocos.entries()) {
      expect
        .soft(
          bloco.tituloCartao,
          `bloco de filtros ${i + 1}: tÃ­tulo dentro do cartÃ£o, acima dos campos (obtido: ${bloco.tituloCartao ?? 'sem tÃ­tulo no cartÃ£o'})`,
        )
        .not.toBeNull();
    }
  });
}

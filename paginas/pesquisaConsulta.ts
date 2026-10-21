import { expect, type Locator, type Page, type Response } from '@playwright/test';
import { abrirRota } from './appMock';
import { Tabela } from './conferencia/Traceability Suite';

/**
 * Page object genÃ©rico das pesquisas de **Consulta por Ãrea de PrestaÃ§Ã£o**, para os casos de
 * padrÃ£o (filtros, opÃ§Ãµes, ordenaÃ§Ã£o, resultados por pÃ¡gina) que se repetem nos 24 ecrÃ£s.
 *
 * DOM confirmado em `ccmsns-ui` (sÃ³ leitura) e no `@Traceability Suite/ui-react`:
 *   - campos de texto e de data: `FormField` com `<label for>` â†’ `getByRole('textbox', {name})`;
 *   - SelectBox: `div[role=combobox][aria-label=<rÃ³tulo>]`, opÃ§Ãµes `role=option`, a 1.Âª Ã©
 *     Â«SelecioneÂ» (sem valor);
 *   - autocomplete do prestador: `role=combobox` com `<label for>`, lista `role=listbox`;
 *   - grelha `TableV2` (`TabelaComExport`): `th[abbr]`, cabeÃ§alho ordenÃ¡vel com
 *     `aria-label="Ordenar por <rÃ³tulo>"` e `aria-sort`;
 *   - paginaÃ§Ã£o: Â«Resultados por pÃ¡gina:Â» (combobox com o tamanho atual; o Traceability Suite junta o
 *     tamanho atual Ã s opÃ§Ãµes), total Â«N resultadosÂ», botÃµes Â«Go to next pageÂ»â€¦;
 *   - nÃ£o hÃ¡ `data-testid` nestes ecrÃ£s.
 */

/** Um critÃ©rio da pesquisa: campo de texto ou de data (dd/mm/aaaa) com valor, ou select. */
export type Criterio =
  | { campo: string; valor: string }
  /** Sem `opcao`, a pesquisa de base tenta as opÃ§Ãµes do select pela ordem atÃ© ter linhas. */
  | { select: string; opcao?: string };

export const descreverCriterios = (criterios: Criterio[]): string =>
  criterios
    .map((c) => ('campo' in c ? `Â«${c.campo}Â» = "${c.valor}"` : `Â«${c.select}Â» = "${c.opcao ?? '(1.Âª opÃ§Ã£o)'}"`))
    .join(' + ');

/** Nomes aceites para cada parÃ¢metro (os ecrÃ£s nÃ£o usam todos os mesmos â€” P16). */
export const PARAM = {
  pagina: ['pagina', 'page'],
  tamanho: ['tamanho', 'size'],
  ordem: ['sort', 'ordenar'],
} as const;

export function lerParam(url: URL, nomes: readonly string[]): { nome: string; valor: string } | null {
  for (const nome of nomes) {
    const valor = url.searchParams.get(nome);
    if (valor !== null) return { nome, valor };
  }
  return null;
}

/** ParÃ¢metros de pesquisa (filtros) de um pedido, sem pÃ¡gina, tamanho e ordenaÃ§Ã£o. */
export function filtrosDoPedido(url: URL): Record<string, string> {
  const fora = new Set<string>([...PARAM.pagina, ...PARAM.tamanho, ...PARAM.ordem]);
  const r: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    if (!fora.has(k)) r[k] = v;
  });
  return r;
}

/** RÃ³tulo do autocomplete do prestador, igual em todos os ecrÃ£s (`AutocompletePrestador`). */
export const ROTULO_PRESTADOR = 'NIF ou Nome do Prestador';

/** Entradas da lista que nÃ£o sÃ£o opÃ§Ãµes: Â«SelecioneÂ», vazio, Â«NÃ£o existem opÃ§ÃµesÂ» (lista ainda sem dados). */
const PLACEHOLDER_OPCAO = /^(Selec?cione|â€”|-+|NÃ£o existem opÃ§Ãµes|Sem opÃ§Ãµes)?\s*$/i;
const DATA = /^\d{2}\/\d{2}\/\d{4}$/;

export class PesquisaConsulta {
  /** URLs dos pedidos GET de pesquisa feitos desde a abertura do ecrÃ£. */
  readonly pedidos: URL[] = [];

  constructor(
    readonly page: Page,
    readonly rota: string,
    /** Caminho do pedido GET da pesquisa (ex.: `/medicamentos/facturas$`). */
    readonly endpoint: RegExp,
  ) {
    page.on('request', (r) => {
      if (r.method() !== 'GET') return;
      const url = new URL(r.url());
      if (this.endpoint.test(url.pathname)) this.pedidos.push(url);
    });
  }

  conteudo(): Locator {
    return this.page.locator('.Traceability SuiteTemplate__content').first();
  }

  botaoPesquisar(): Locator {
    return this.conteudo().getByRole('button', { name: 'Pesquisar', exact: true });
  }

  botaoLimpar(): Locator {
    return this.conteudo().getByRole('button', { name: 'Limpar', exact: true });
  }

  async abrir(): Promise<void> {
    this.pedidos.length = 0;
    await abrirRota(this.page, this.rota);
    await expect(this.botaoPesquisar(), `botÃ£o Pesquisar em ${this.rota}`).toBeVisible({ timeout: 60_000 });
  }

  // --- filtros --------------------------------------------------------------------------------

  campoTexto(rotulo: string): Locator {
    return this.conteudo().getByRole('textbox', { name: rotulo, exact: true });
  }

  select(rotulo: string): Locator {
    return this.conteudo().getByRole('combobox', { name: rotulo, exact: true });
  }

  /** Abre o select, devolve os textos das opÃ§Ãµes (sem o Â«SelecioneÂ») e fecha. */
  async opcoesSelect(rotulo: string): Promise<string[]> {
    // As opÃ§Ãµes vÃªm da API (lenta em DEV): a lista pode abrir sÃ³ com Â«SelecioneÂ» ou Â«NÃ£o existem
    // opÃ§ÃµesÂ» e nÃ£o se atualiza aberta â€” fecha e volta a abrir atÃ© ter opÃ§Ãµes (mÃ¡x. 30 s).
    const limite = Date.now() + 30_000;
    let textos: string[] = [];
    do {
      await expect(this.opcoesVisiveis()).toHaveCount(0).catch(() => undefined);
      await this.select(rotulo).click();
      await expect(this.opcoesVisiveis().first(), `lista de opÃ§Ãµes de Â«${rotulo}Â» abre`).toBeVisible({ timeout: 30_000 });
      textos = (await this.opcoesVisiveis().allInnerTexts()).map((t) => t.trim()).filter((t) => !PLACEHOLDER_OPCAO.test(t));
      await this.fecharMenu();
      if (textos.length > 0) break;
      await this.page.waitForTimeout(1_000);
    } while (Date.now() < limite);
    return textos;
  }

  /** Escolhe a opÃ§Ã£o pelo texto exato; falha logo, com as opÃ§Ãµes disponÃ­veis, se ela nÃ£o existir. */
  async escolherOpcao(rotulo: string, opcao: string): Promise<void> {
    const disponiveis = await this.opcoesSelect(rotulo);
    if (!disponiveis.includes(opcao)) {
      throw new Error(`Â«${rotulo}Â» nÃ£o tem a opÃ§Ã£o "${opcao}" (opÃ§Ãµes: ${disponiveis.join(' | ') || 'nenhuma'})`);
    }
    await this.select(rotulo).click();
    await this.opcoesVisiveis().getByText(opcao, { exact: true }).first().click();
    if ((await this.opcoesVisiveis().count()) > 0) await this.fecharMenu();
  }

  async preencher(criterios: Criterio[]): Promise<void> {
    for (const c of criterios) {
      if ('select' in c) {
        const opcao = c.opcao ?? (await this.opcoesSelect(c.select))[0];
        if (!opcao) throw new Error(`Â«${c.select}Â» sem opÃ§Ãµes`);
        await this.escolherOpcao(c.select, opcao);
        continue;
      }
      const campo = this.campoTexto(c.campo);
      await campo.click();
      await campo.fill(c.valor);
      if (DATA.test(c.valor)) {
        // O Datepicker Traceability Suite sÃ³ faz o parse do texto com Enter.
        await campo.press('Enter');
        await this.page.keyboard.press('Escape');
      }
    }
  }

  // --- autocomplete do prestador --------------------------------------------------------------

  campoPrestador(): Locator {
    return this.conteudo().getByRole('combobox', { name: ROTULO_PRESTADOR, exact: true });
  }

  listaPrestador(): Locator {
    return this.page.getByRole('listbox', { name: `OpÃ§Ãµes de ${ROTULO_PRESTADOR}` });
  }

  opcoesPrestador(): Locator {
    return this.listaPrestador().getByRole('option');
  }

  /**
   * Escreve no autocomplete e espera a resposta de `/prestadores` (debounce de 300 ms).
   * Devolve as sugestÃµes mostradas e o URL do pedido.
   */
  async escreverPrestador(termo: string): Promise<{ opcoes: string[]; pedido: URL | null }> {
    const campo = this.campoPrestador();
    await campo.fill('');
    const resposta = this.page
      .waitForResponse(
        (r) =>
          r.request().method() === 'GET' &&
          /\/prestadores$/.test(new URL(r.url()).pathname) &&
          new URL(r.url()).searchParams.get('termo') === termo,
        { timeout: 30_000 },
      )
      .catch(() => null);
    await campo.click();
    await campo.pressSequentially(termo, { delay: 30 });
    const r = await resposta;
    await this.page.waitForTimeout(300);
    const opcoes = (await this.opcoesPrestador().allInnerTexts().catch(() => [])).map((t) => t.trim()).filter(Boolean);
    return { opcoes, pedido: r ? new URL(r.url()) : null };
  }

  async escolherPrimeiroPrestador(): Promise<void> {
    await this.opcoesPrestador().first().click();
  }

  /** Escreve o NIF e escolhe a sugestÃ£o desse NIF. */
  async escolherPrestador(nif: string): Promise<void> {
    // A grelha pode mostrar o NIF com espaÃ§os (Â«502 100 100Â»).
    nif = nif.replace(/\s+/g, '');
    const { opcoes } = await this.escreverPrestador(nif);
    const alvo = opcoes.find((o) => o.replace(/\s+/g, '').startsWith(nif));
    if (!alvo) throw new Error(`Â«${ROTULO_PRESTADOR}Â»: sem sugestÃ£o para o NIF ${nif} (${opcoes.slice(0, 5).join(' | ')})`);
    await this.opcoesPrestador().filter({ hasText: alvo }).first().click();
  }

  /**
   * Valor de cada campo de filtro do formulÃ¡rio (texto, data, autocomplete e selects; nos
   * selects, '' quando mostra o placeholder). Ignora a grelha e a paginaÃ§Ã£o.
   */
  async valoresDosCampos(): Promise<{ campo: string; valor: string }[]> {
    return this.conteudo().evaluate((raiz) => {
      const fora = (el: Element) => !!el.closest('table, .MuiTablePagination-root, [class*="Traceability SuitePagination"], nav.breadcrumb, [role="dialog"]');
      const nomeDe = (el: Element): string => {
        const id = el.getAttribute('id');
        const label = id ? raiz.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
        return label?.textContent?.trim() || el.getAttribute('aria-label')?.trim() || '(sem rÃ³tulo)';
      };
      const textos = Array.from(raiz.querySelectorAll('input'))
        .filter((i) => !fora(i) && ['text', 'search', 'number', 'tel', ''].includes(i.type))
        .filter((i) => i.getAttribute('aria-hidden') !== 'true' && !i.classList.contains('MuiSelect-nativeInput'))
        .map((i) => ({ campo: nomeDe(i), valor: i.value.trim() }));
      const selects = Array.from(raiz.querySelectorAll('.Traceability Suite-select-box-container[role="combobox"]'))
        .filter((s) => !fora(s))
        .map((s) => {
          const v = s.querySelector('.Traceability Suite-select-box-value');
          return { campo: nomeDe(s), valor: !v || v.classList.contains('is-placeholder') ? '' : (v.textContent ?? '').trim() };
        });
      return [...textos, ...selects];
    });
  }

  // --- pesquisa e grelha ----------------------------------------------------------------------

  /** Espera a prÃ³xima resposta da pesquisa (GET no endpoint do ecrÃ£). */
  esperarResposta(timeout = 60_000): Promise<Response | null> {
    return this.page
      .waitForResponse(
        (r) => r.request().method() === 'GET' && this.endpoint.test(new URL(r.url()).pathname),
        { timeout },
      )
      .catch(() => null);
  }

  tabela(): Tabela {
    return new Tabela(this.conteudo().locator('table').first());
  }

  async esperarGrelha(): Promise<void> {
    await this.tabela().esperar();
  }

  async pesquisar(): Promise<void> {
    const resposta = this.esperarResposta(30_000);
    await this.botaoPesquisar().click();
    const r = await resposta;
    if (!r) {
      // Sem pedido: normalmente uma validaÃ§Ã£o do formulÃ¡rio bloqueou â€” junta os avisos Ã  falha.
      const avisos = await this.avisosFormulario();
      expect(r, `${this.rota}: a pesquisa faz o pedido GET ao servidor${avisos.length ? ` (avisos: ${avisos.join(' Â· ')})` : ''}`).not.toBeNull();
    }
    await this.esperarGrelha();
  }

  /** Avisos de validaÃ§Ã£o visÃ­veis no formulÃ¡rio de filtros. */
  async avisosFormulario(): Promise<string[]> {
    const texto = await this.conteudo().innerText().catch(() => '');
    return texto
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /invÃ¡lid|obrigatÃ³ri|Ã‰ necessÃ¡rio|DeverÃ¡ estar preenchido|deve ter/i.test(l));
  }

  /** Linhas `tbody tr` da grelha (inclui a linha de totais, quando existe â€” usar `lerGrelha`). */
  linhas(): Locator {
    return this.tabela().linhas();
  }

  /**
   * CabeÃ§alhos (`abbr`) e cÃ©lulas de cada linha de **dados**: sem a linha de vazio, de
   * carregamento e de **totais** (Ãºltima linha com metade ou mais das cÃ©lulas vazias, como em
   * SaÃºde Oral â†’ Facturas e Tratamentos Termais â†’ Lotes).
   */
  async lerGrelha(): Promise<{ colunas: string[]; linhas: string[][] }> {
    return this.tabela().raiz.evaluate((t) => {
      const colunas = Array.from(t.querySelectorAll('thead th')).map((th) => (th.getAttribute('abbr') ?? '').trim());
      const trs = Array.from(t.querySelectorAll('tbody tr')).filter(
        (tr) => !tr.querySelector('td.Traceability Suite-tablev2-cell-empty-rows, td.Traceability Suite-tablev2-cell-loading'),
      );
      const linhas = trs.map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => (td.textContent ?? '').replace(/\s+/g, ' ').trim()));
      const ultima = linhas.at(-1);
      if (ultima && linhas.length > 1 && ultima.filter((c) => c === '').length >= ultima.length / 2) linhas.pop();
      return { colunas, linhas };
    });
  }

  /** NÂº de linhas de dados (sem a de totais). */
  async contarLinhas(): Promise<number> {
    return (await this.lerGrelha()).linhas.length;
  }

  /** Texto de cada linha de dados (identidade das linhas para comparar pÃ¡ginas). */
  async textosLinhas(): Promise<string[]> {
    return (await this.lerGrelha()).linhas.map((l) => l.filter(Boolean).join(' '));
  }

  /** Total Â«N resultadosÂ» da paginaÃ§Ã£o, ou `null` se nÃ£o aparecer. */
  async total(): Promise<number | null> {
    const el = this.conteudo().getByText(/^\s*\d[\d\s.]*\s+resultados?\s*$/).first();
    if ((await el.count()) === 0) return null;
    return Number((await el.innerText()).replace(/\D/g, '')) || 0;
  }

  // --- paginaÃ§Ã£o ------------------------------------------------------------------------------

  seletorTamanho(): Locator {
    return this.conteudo()
      .getByRole('combobox', { name: /Resultados por pÃ¡gina|quantidade de itens por pÃ¡gina/i })
      .or(this.conteudo().getByRole('combobox').filter({ hasText: /^\s*\d+\s*$/ }))
      .first();
  }

  async tamanhoAtual(): Promise<number> {
    return Number((await this.seletorTamanho().innerText()).trim());
  }

  /** OpÃ§Ãµes do seletor Â«Resultados por pÃ¡ginaÂ», como nÃºmeros, pela ordem do ecrÃ£. */
  /** OpÃ§Ãµes visÃ­veis do menu aberto (o MUI deixa o menu anterior no DOM enquanto fecha). */
  private opcoesVisiveis(): Locator {
    return this.page.getByRole('option').filter({ visible: true });
  }

  private async fecharMenu(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await expect(this.opcoesVisiveis()).toHaveCount(0).catch(() => undefined);
  }

  async opcoesTamanho(): Promise<number[]> {
    await this.seletorTamanho().click();
    await expect(this.opcoesVisiveis().first()).toBeVisible();
    const textos = await this.opcoesVisiveis().allInnerTexts();
    await this.fecharMenu();
    return textos.map((t) => Number(t.trim())).filter((n) => Number.isFinite(n) && n > 0);
  }

  /** Escolhe um tamanho de pÃ¡gina; devolve o URL do pedido que a escolha fez (ou `null`). */
  async escolherTamanho(n: number): Promise<URL | null> {
    const antes = this.pedidos.length;
    await expect(this.opcoesVisiveis()).toHaveCount(0).catch(() => undefined);
    // Espera curta: o seletor sem efeito (#1510/#1588) nÃ£o faz pedido nenhum.
    const resposta = this.esperarResposta(8_000);
    await this.seletorTamanho().click();
    const opcao = this.opcoesVisiveis().filter({ hasText: new RegExp(`^\\s*${n}\\s*$`) }).first();
    await expect(opcao).toBeVisible();
    await opcao.click();
    await resposta;
    await this.esperarGrelha();
    return this.pedidos.length > antes ? this.pedidos[this.pedidos.length - 1] : null;
  }

  botaoPaginaSeguinte(): Locator {
    return this.page.getByRole('button', { name: /^(Go to next page|AvanÃ§ar uma pÃ¡gina)$/ }).first();
  }

  async temPaginaSeguinte(): Promise<boolean> {
    const b = this.botaoPaginaSeguinte();
    return (await b.count()) > 0 && (await b.isEnabled());
  }

  /** Vai Ã  pÃ¡gina seguinte; devolve o URL do pedido feito (ou `null`). */
  async irParaPaginaSeguinte(): Promise<URL | null> {
    const antes = this.pedidos.length;
    const resposta = this.esperarResposta(30_000);
    await this.botaoPaginaSeguinte().click();
    await resposta;
    await this.esperarGrelha();
    return this.pedidos.length > antes ? this.pedidos[this.pedidos.length - 1] : null;
  }

  // --- ordenaÃ§Ã£o ------------------------------------------------------------------------------

  /** Colunas da grelha (pelo `abbr`) que mostram indicador de ordenaÃ§Ã£o. */
  async colunasOrdenaveis(): Promise<string[]> {
    return this.tabela().raiz.locator('thead th').evaluateAll((ths) =>
      ths
        .filter((th) => th.id !== 'actions' && /^Ordenar por /.test(th.getAttribute('aria-label') ?? ''))
        .map((th) => (th.getAttribute('abbr') ?? '').trim())
        .filter((n) => n !== '' && n !== 'undefined'),
    );
  }

  cabecalho(coluna: string): Locator {
    return this.tabela().raiz.locator(`thead th[abbr="${coluna.replace(/"/g, '\\"')}"]`).first();
  }

  /** Clica no cabeÃ§alho; devolve o URL do pedido que o clique fez (ou `null` se nÃ£o fez nenhum). */
  async clicarCabecalho(coluna: string, timeout = 8_000): Promise<URL | null> {
    const antes = this.pedidos.length;
    const resposta = this.esperarResposta(timeout);
    await this.cabecalho(coluna).click();
    await resposta;
    await this.esperarGrelha();
    return this.pedidos.length > antes ? this.pedidos[this.pedidos.length - 1] : null;
  }

  /** Textos de uma coluna (pelo `abbr`), nas linhas de dados. */
  async valoresColuna(coluna: string): Promise<string[]> {
    const { colunas, linhas } = await this.lerGrelha();
    const i = colunas.indexOf(coluna);
    if (i < 0) throw new Error(`Coluna "${coluna}" nÃ£o encontrada (${colunas.filter(Boolean).join(', ')})`);
    return linhas.map((l) => l[i] ?? '');
  }

  ultimoPedido(): URL | null {
    return this.pedidos.at(-1) ?? null;
  }
}

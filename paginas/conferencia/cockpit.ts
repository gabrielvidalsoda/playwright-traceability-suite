import { expect, type Locator, type Page } from '@playwright/test';
import { botao, ci, combobox, escolherOpcao, Tabela, valorCampo } from './Traceability Suite';

/**
 * Page objects da ConferÃªncia â†’ Cockpit (`/conferencia/cockpit`, `/detalhe/:area`,
 * `/disparar`). Textos e estrutura confirmados em `ccmsns-ui` `develop` (14d7c2b):
 * `pages/conferencia/cockpit/**` (sÃ³ leitura).
 */

/** Ordem e nomes dos cartÃµes (`catalogoAreas.ts`); os 5 primeiros tÃªm detalhe. */
export const AREAS_COCKPIT = [
  'Medicamentos Continente',
  'Medicamentos AÃ§ores',
  'Medicamentos Madeira',
  'MCDT',
  'CRD',
  'HemodiÃ¡lise',
  'Termas',
  'Vacinas',
  'SICAD',
  'SaÃºde Oral',
  'Dispensa de Proximidade',
  'Conta Corrente',
  'IPATIMUP',
  'Hemoderivados',
] as const;

/** Ãreas com pÃ¡gina de detalhe: slug da rota, tÃ­tulo, cÃ³digo da Ã¡rea no CalendÃ¡rio. */
export const AREAS_DETALHE = [
  { slug: 'med-continente', titulo: 'Medicamentos Continente', calendario: 'MED' },
  { slug: 'med-acores', titulo: 'Medicamentos AÃ§ores', calendario: 'SA_MED' },
  { slug: 'med-madeira', titulo: 'Medicamentos Madeira', calendario: 'IA_MED' },
  { slug: 'mcdt', titulo: 'MCDT', calendario: 'MCDT' },
  { slug: 'crd', titulo: 'CRD', calendario: 'CRD' },
] as const;

export const ESTADOS_AREA = ['Em receÃ§Ã£o', 'A aguardar', 'Em conferÃªncia', 'ConcluÃ­da', 'Fechada'] as const;

/** CartÃµes MUI sem outro cartÃ£o dentro (o painel de filtros e as secÃ§Ãµes tambÃ©m sÃ£o `Card`). */
const CARTAO_INTERIOR = '.MuiCard-root:not(:has(.MuiCard-root))';

/** NÃºmero formatado em pt-PT ("10 000", "1000") â†’ inteiro. */
export function numero(texto: string): number {
  return Number(texto.replace(/[\s  .]/g, '').replace(',', '.'));
}
const RE_NUMERO = /\d{1,3}(?:[\s  ]\d{3})+|\d+/;

// --- Cockpit ---------------------------------------------------------------------------

export class PaginaCockpit {
  constructor(readonly page: Page) {}

  async abrir(query = ''): Promise<void> {
    await this.page.goto(`/conferencia/cockpit${query}`, { waitUntil: 'domcontentloaded' });
    await expect(this.titulo()).toBeVisible({ timeout: 30_000 });
  }
  titulo(): Locator {
    return this.page.getByRole('heading', { level: 1, name: ci('Cockpit de conferÃªncia') });
  }
  ciclo(): Locator {
    return combobox(this.page, 'Ciclo');
  }
  /**
   * CrachÃ¡ do estado do ciclo (`role=status`, Â«Estado do ciclo: â€¦Â»). Pedido pelo script no Cockpit
   * (CKP-01/07), mas desde `develop` 14d7c2b sÃ³ existe no detalhe de Ã¡rea â€” ver BUG-20261008-02.
   */
  badgeEstado(): Locator {
    return this.page
      .getByRole('status', { name: /^Estado do ciclo:/ })
      .or(this.page.locator('.MuiChip-root').filter({ hasText: /^(Em curso|Fechado|Planeado)$/ }))
      .first();
  }
  async escolherCiclo(rotulo: string): Promise<void> {
    await escolherOpcao(this.page, 'Ciclo', rotulo);
  }
  /** Pesquisa e espera a resposta de `resumo-areas` e o 1.Âº cartÃ£o. */
  async pesquisar(): Promise<void> {
    const resposta = this.page.waitForResponse((r) => /\/cockpit\/ciclos\/\d+\/resumo-areas/.test(r.url()));
    await botao(this.page, 'Pesquisar').click();
    await resposta;
    await this.esperarCartoes();
  }
  async pesquisarCiclo(rotulo: string): Promise<void> {
    await this.escolherCiclo(rotulo);
    await this.pesquisar();
  }
  async esperarCartoes(): Promise<void> {
    await expect(this.page.getByTestId('cartao-esqueleto')).toHaveCount(0, { timeout: 60_000 });
    await expect(this.cartoes().first()).toBeVisible({ timeout: 60_000 });
  }
  mensagemAntesPesquisa(): Locator {
    return this.page.getByText('Utilize os filtros acima e clique em pesquisar', { exact: true });
  }
  cartoes(): Locator {
    return this.page.locator(`${CARTAO_INTERIOR}:has(.MuiTypography-subtitle1)`);
  }
  cartao(nome: string): Locator {
    return this.cartoes().filter({ has: this.page.locator('.MuiTypography-subtitle1').getByText(nome, { exact: true }) }).first();
  }
  /** CartÃ£o ativo = `CardActionArea` (button) cujo nome comeÃ§a pelo nome da Ã¡rea. */
  cartaoAtivo(nome: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^${nome}`) });
  }
  async nomesCartoes(): Promise<string[]> {
    return this.cartoes().evaluateAll((els) =>
      els.map((e) => (e.querySelector('.MuiTypography-subtitle1')?.textContent ?? '').trim()),
    );
  }
  /** Facturas, prestaÃ§Ãµes, % e estado lidos do cartÃ£o. */
  async lerCartao(nome: string): Promise<{ facturas?: number; prestacoes?: number; pct?: number; estado?: string; texto: string }> {
    const c = this.cartao(nome);
    const texto = await c.innerText();
    const linhas = texto.split('\n').map((l) => l.trim()).filter(Boolean);
    const antes = (rotulo: string) => {
      const i = linhas.findIndex((l) => l.toLowerCase() === rotulo);
      return i > 0 && RE_NUMERO.test(linhas[i - 1]) ? numero(linhas[i - 1]) : undefined;
    };
    const barra = c.getByRole('progressbar');
    const pctTexto = (await barra.count()) ? await barra.getAttribute('aria-label') : null;
    const pct = pctTexto?.match(/(\d+(?:,\d+)?)%$/)?.[1];
    return {
      facturas: antes('facturas'),
      prestacoes: antes('prestaÃ§Ãµes'),
      pct: pct !== undefined ? Number(pct.replace(',', '.')) : undefined,
      estado: [...ESTADOS_AREA, 'No sistema actual'].find((e) => linhas.includes(e)),
      texto,
    };
  }
}

// --- Detalhe de Ã¡rea ------------------------------------------------------------------

export const CARTOES_ETAPAS = [
  'PrestaÃ§Ãµes rececionadas atÃ© ao momento',
  'PrestaÃ§Ãµes enriquecidas',
  'ConferÃªncia AutomÃ¡tica',
  'ConferÃªncia Manual',
] as const;

export class PaginaDetalheArea {
  constructor(readonly page: Page) {}

  async abrir(slug: string, query = ''): Promise<void> {
    await this.page.goto(`/conferencia/cockpit/detalhe/${slug}${query}`, { waitUntil: 'domcontentloaded' });
  }
  async esperarCarregado(titulo: string): Promise<void> {
    await expect(this.page.getByRole('heading', { level: 1, name: ci(titulo) })).toBeVisible({ timeout: 30_000 });
    await expect(this.cartaoEtapa(CARTOES_ETAPAS[0])).toBeVisible({ timeout: 60_000 });
  }
  cartaoEtapa(titulo: string): Locator {
    return this.page.locator(CARTAO_INTERIOR).filter({ has: this.page.getByText(ci(titulo)) }).first();
  }
  /** Valor principal do cartÃ£o de etapa (1.Âº nÃºmero depois do tÃ­tulo). */
  async valorCartao(titulo: string): Promise<number> {
    await expect(this.cartaoEtapa(titulo)).not.toContainText('A carregar', { timeout: 60_000 });
    // O tÃ­tulo vem em maiÃºsculas (CSS) e a % do cartÃ£o aparece antes dele: lÃª-se sÃ³ o que vem depois.
    const bruto = await this.cartaoEtapa(titulo).innerText();
    const i = bruto.toLowerCase().indexOf(titulo.toLowerCase());
    const texto = i >= 0 ? bruto.slice(i + titulo.length) : bruto;
    const m = texto.match(RE_NUMERO);
    if (!m) throw new Error(`Sem valor no cartÃ£o "${titulo}": ${texto}`);
    return numero(m[0]);
  }
  async abrirModalCartao(titulo: string): Promise<Locator> {
    await botao(this.cartaoEtapa(titulo), 'Ver detalhes').click();
    const dialogo = this.page.getByRole('dialog', { name: ci(titulo) });
    await expect(dialogo).toBeVisible();
    return dialogo;
  }
  async fecharModal(dialogo: Locator): Promise<void> {
    await botao(dialogo, 'Fechar').click();
    await expect(dialogo).toBeHidden();
  }
  tabelaSumario(): Tabela {
    return Tabela.comColuna(this.page, 'Enriquecidas');
  }
  tabelaRegisto(): Tabela {
    return Tabela.comColuna(this.page, 'Identificador');
  }
  interruptorJob(): Locator {
    return this.page.getByRole('checkbox', { name: /^Job de start automÃ¡tico: (Ligado|Desligado)$/ });
  }
  valorCiclo(): Locator {
    return valorCampo(this.page, 'Ciclo');
  }
}

/** Todos os nÃºmeros "N prestaÃ§Ãµes" / "x / y â€¦" de um texto, pela ordem. */
export function numerosAntesDe(texto: string, unidade: string): number[] {
  const re = new RegExp(`(\\d{1,3}(?:[\\s\\u00a0\\u202f]\\d{3})+|\\d+)\\s*${unidade}`, 'g');
  return [...texto.matchAll(re)].map((m) => numero(m[1]));
}
export function fracao(texto: string, unidade: string): { x: number; y: number } | undefined {
  const re = new RegExp(
    `(\\d{1,3}(?:[\\s\\u00a0\\u202f]\\d{3})+|\\d+)\\s*/\\s*(\\d{1,3}(?:[\\s\\u00a0\\u202f]\\d{3})+|\\d+)\\s*${unidade}`,
  );
  const m = texto.match(re);
  return m ? { x: numero(m[1]), y: numero(m[2]) } : undefined;
}

// --- Nova execuÃ§Ã£o / Reprocessar --------------------------------------------------------

/** Interruptores (role checkbox) da pÃ¡gina que nÃ£o sÃ£o workflows. */
const INTERRUPTORES_DISPARO = /^(Incluir prestaÃ§Ãµes jÃ¡ conferidas|ForÃ§ar tarefa manual|Re-enriquecer os dados antes de conferir)/;

export class PaginaDisparar {
  constructor(readonly page: Page) {}

  async abrir(query: string): Promise<void> {
    await this.page.goto(`/conferencia/cockpit/disparar?${query}`, { waitUntil: 'domcontentloaded' });
  }
  titulo(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }
  passo(titulo: string): Locator {
    return this.page.getByRole('heading', { name: titulo, exact: true });
  }
  /** Checkboxes de workflow do passo 1. */
  workflows(): Locator {
    return this.passo('1. Workflows')
      .locator('xpath=ancestor::*[.//input[@type="checkbox"]][1]')
      .getByRole('checkbox')
      .filter({ hasNotText: INTERRUPTORES_DISPARO });
  }
  async nomesWorkflows(): Promise<string[]> {
    const cb = this.workflows();
    const nomes: string[] = [];
    for (let i = 0; i < (await cb.count()); i++) {
      const n = await cb.nth(i).evaluate((e) => e.closest('label')?.textContent?.trim() ?? '');
      if (!INTERRUPTORES_DISPARO.test(n)) nomes.push(n);
    }
    return nomes;
  }
  resumo(): Locator {
    return this.passo('Resumo do disparo').locator('xpath=ancestor::*[.//button[normalize-space()="Confirmar disparo"]][1]');
  }
  /** Marca um workflow e espera a contagem (`POST â€¦/disparos/preview`, sÃ³ leitura). */
  async escolherWorkflow(nome?: string): Promise<string> {
    const alvo = nome ? this.page.getByRole('checkbox', { name: nome, exact: true }) : this.workflows().first();
    const rotulo = nome ?? (await alvo.evaluate((e) => e.closest('label')?.textContent?.trim() ?? ''));
    const preview = this.page.waitForResponse((r) => /\/disparos\/preview/.test(r.url()), { timeout: 60_000 });
    await alvo.check();
    await preview;
    return rotulo;
  }
  confirmar(): Locator {
    return botao(this.page, 'Confirmar disparo');
  }
  /**
   * Clica Â«Confirmar disparoÂ» para ver a validaÃ§Ã£o. Se abrir o modal de confirmaÃ§Ã£o,
   * clica **Cancelar** (nunca Â«DispararÂ») e devolve `true` (= âŒ no script).
   */
  async confirmarEsperandoValidacao(): Promise<boolean> {
    await this.confirmar().click();
    const modal = this.page.getByRole('dialog', { name: 'Confirmar o disparo da conferÃªncia' });
    if (await modal.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await botao(modal, 'Cancelar').click();
      await expect(modal).toBeHidden();
      return true;
    }
    return false;
  }
  campoAmbito(rotulo: string): Locator {
    return this.page.getByRole('combobox', { name: rotulo, exact: true });
  }
  /** Escreve no autocomplete e escolhe a 1.Âª sugestÃ£o; devolve o texto escolhido (ou undefined). */
  async escolherSugestao(rotulo: string, termo: string): Promise<string | undefined> {
    const campo = this.campoAmbito(rotulo);
    await campo.click();
    await campo.fill(termo);
    const opcao = this.page.getByRole('option').first();
    if (!(await opcao.isVisible({ timeout: 15_000 }).catch(() => false))) {
      await this.page.keyboard.press('Escape');
      return undefined;
    }
    const texto = (await opcao.innerText()).trim();
    await opcao.click();
    await this.page.keyboard.press('Escape');
    return texto;
  }
  chipsRemover(): Locator {
    return this.page.getByRole('button', { name: /^Remover / });
  }
}

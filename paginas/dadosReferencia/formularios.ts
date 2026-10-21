import { expect, test, type Locator, type Page } from '@playwright/test';
import { AMBIENTE } from '../../dados/massa';

/**
 * FormulÃ¡rios de criar/editar de Dados de ReferÃªncia (Parte C do roteiro): Patologias
 * Termais (patologia e associaÃ§Ã£o de tÃ©cnica), ServiÃ§os DP (serviÃ§o e preÃ§o) e Tipos de
 * PreÃ§o HemodiÃ¡lise (tipo e preÃ§o). PadrÃ£o confirmado no cÃ³digo (`origin/develop`):
 * `Seccao nivelTitulo="h1"` + campos em `COLUNAS_FILTROS` (grelha 1/3/6 colunas),
 * "Voltar" (`variant="secondary"`) Ã  esquerda e "Guardar" Ã  direita, sempre clicÃ¡vel,
 * com validaÃ§Ã£o por campo (`hint` de erro) e `Alert` para o erro do servidor.
 */

/** Os testes que gravam dados sÃ³ correm em mock ou com `DR_PERMITIR_ESCRITA=1`. */
export const ESCRITA_PERMITIDA = AMBIENTE === 'mock' || process.env.DR_PERMITIR_ESCRITA === '1';
export const MOTIVO_SEM_ESCRITA =
  'grava dados no ambiente partilhado â€” correr com DR_PERMITIR_ESCRITA=1 para ativar';

/**
 * Regista (e, fora do mock, bloqueia) todos os pedidos de escrita Ã  API
 * (POST/PUT/PATCH/DELETE), para provar que "nada Ã© enviado" sem nunca gravar no ambiente.
 * Em mock o MSW (service worker) responde antes do `page.route`; aÃ­ sÃ³ se contam.
 */
export async function vigiarEscritas(page: Page): Promise<string[]> {
  const escritas: string[] = [];
  const eEscrita = (metodo: string, url: string) =>
    /\/api\//.test(url) && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(metodo);
  page.on('request', (r) => {
    if (eEscrita(r.method(), r.url())) escritas.push(`${r.method()} ${r.url()}`);
  });
  await page.route('**/api/**', (rota) =>
    eEscrita(rota.request().method(), rota.request().url()) ? rota.abort() : rota.fallback(),
  );
  return escritas;
}

export class PaginaFormularioDadosReferencia {
  constructor(readonly page: Page) {}

  conteudo(): Locator {
    return this.page.locator('.Traceability SuiteTemplate__content');
  }
  titulo(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }
  campo(rotulo: string): Locator {
    return this.conteudo().getByRole('textbox', { name: rotulo, exact: true });
  }
  botaoGuardar(): Locator {
    return this.conteudo().getByRole('button', { name: /^(Guardar|A guardar\.\.\.)$/ });
  }
  botaoVoltar(): Locator {
    return this.conteudo().getByRole('button', { name: 'Voltar', exact: true });
  }
  botaoCancelar(): Locator {
    return this.conteudo().getByRole('button', { name: 'Cancelar', exact: true });
  }
  alertaErro(): Locator {
    return this.conteudo().locator('.MuiAlert-root');
  }
  /** Toggle Colapsar/Expandir de qualquer secÃ§Ã£o do formulÃ¡rio (`PainelColapsavel collapsible`). */
  togglesColapsar(): Locator {
    return this.conteudo().getByRole('button', { name: /^(Colapsar|Expandir)$/ });
  }

  async esperarCarregado(): Promise<void> {
    await expect(this.conteudo().getByText('A carregar...')).toHaveCount(0);
    await expect(this.titulo()).toBeVisible();
    await expect(this.botaoGuardar()).toBeVisible();
  }

  /** NÂº de colunas da grelha que contÃ©m o 1.Âº campo de texto do formulÃ¡rio. */
  async colunasDaGrelha(): Promise<number> {
    return this.conteudo()
      .locator('input')
      .first()
      .evaluate((input) => {
        let el: HTMLElement | null = input as HTMLElement;
        while (el && getComputedStyle(el).display !== 'grid') el = el.parentElement;
        if (!el) return 0;
        return getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length;
      });
  }
}

/**
 * Escreve uma data `dd/mm/aaaa` num `Datepicker` Traceability Suite e sai do campo com Tab (Enter submeteria
 * o formulÃ¡rio).
 */
export async function preencherDatepicker(campo: Locator, ddmmaaaa: string): Promise<void> {
  await campo.click();
  await campo.pressSequentially(ddmmaaaa);
  await campo.press('Tab');
  await expect(campo).toHaveValue(ddmmaaaa);
}

/** Valores de um diploma de teste (os campos "NÂº Diploma (ID)" e "CÃ³digo do Diploma" sÃ³ aceitam dÃ­gitos). */
export interface DadosDiploma {
  id: string;
  codigo: string;
  descricao: string;
  dataInicio: string;
  dataFim?: string;
}

/** Mensagens por campo do formulÃ¡rio de diploma (`ccmsns-ui` `diplomas.mensagens.ts`, `origin/develop`). */
export const MSG_DIPLOMA_OBRIGATORIOS = [
  'Indique o nÃºmero do diploma.',
  'Indique o cÃ³digo do diploma.',
  'Indique a descriÃ§Ã£o.',
  'Indique a data de inÃ­cio.',
];

/** Erro genÃ©rico de criaÃ§Ã£o (`DiplomaNovoPage.tsx`) â€” o texto do BUG-20260915-21/-22. */
export const MSG_ERRO_CRIAR_DIPLOMA = 'NÃ£o foi possÃ­vel criar o diploma.';

/**
 * FormulÃ¡rio "Adicionar Diploma" (`/dados-referencia/diplomas/novo` â€” `DiplomaNovoPage.tsx` +
 * `DiplomaFormulario.tsx`, `origin/develop`): `Seccao nivelTitulo="h1"`, campos "NÂº Diploma (ID)",
 * "CÃ³digo do Diploma", "DescriÃ§Ã£o", "SituaÃ§Ã£o" (sÃ³ leitura), "Data InÃ­cio" e "Data Fim"
 * (`Datepicker`), "Voltar" e "Guardar" (`type="submit"`). O erro do servidor aparece num
 * `Alert` (`erroApi`).
 */
export class PaginaFormularioDiploma extends PaginaFormularioDadosReferencia {
  static readonly ROTA = '/dados-referencia/diplomas/novo';

  /** Os campos pela ordem do formulÃ¡rio, com o valor a escrever. */
  campos(d: DadosDiploma): { rotulo: string; valor: string; data?: boolean }[] {
    return [
      { rotulo: 'NÂº Diploma (ID)', valor: d.id },
      { rotulo: 'CÃ³digo do Diploma', valor: d.codigo },
      { rotulo: 'DescriÃ§Ã£o', valor: d.descricao },
      { rotulo: 'Data InÃ­cio', valor: d.dataInicio, data: true },
      ...(d.dataFim ? [{ rotulo: 'Data Fim', valor: d.dataFim, data: true }] : []),
    ];
  }

  async preencher(d: DadosDiploma): Promise<void> {
    for (const c of this.campos(d)) {
      if (c.data) await preencherDatepicker(this.campo(c.rotulo), c.valor);
      else await this.campo(c.rotulo).fill(c.valor);
    }
  }

  /** Texto do erro de criaÃ§Ã£o (mensagem do BUG-20260915-21/-22), em qualquer ponto do conteÃºdo. */
  erroCriar(): Locator {
    return this.conteudo().getByText(MSG_ERRO_CRIAR_DIPLOMA);
  }
}

/** Diploma de teste com ID e cÃ³digo numÃ©ricos Ãºnicos (sufixo do relÃ³gio). */
export function diplomaDeTeste(): DadosDiploma {
  const sufixo = String(Date.now()).slice(-9);
  return {
    id: `9${sufixo}`,
    codigo: `99${sufixo}`,
    descricao: 'Diploma de teste E2E â€” nÃ£o gravar',
    dataInicio: '01/01/2030',
    dataFim: '31/12/2030',
  };
}

/** Mensagem antiga do BUG-20260915-26 (`@Digits` do backend, sÃ³ sobre casas decimais). */
export const MSG_PRECO_SO_DECIMAIS = /^O preÃ§o admite no mÃ¡ximo \d casas decimais\.?$/;

/**
 * CT-REG-BUG-20260915-26 â€” num formulÃ¡rio de preÃ§o (ServiÃ§os DP / Tipos de PreÃ§o HemodiÃ¡lise):
 * um preÃ§o com dÃ­gitos inteiros a mais mostra uma mensagem sobre o limite de dÃ­gitos inteiros (nÃ£o
 * sÃ³ sobre casas decimais); o controlo com casas decimais a mais mostra a mensagem de decimais; e,
 * se a validaÃ§Ã£o for do cliente, nenhum pedido de gravaÃ§Ã£o Ã© enviado.
 */
export async function verificarMensagemPrecoExcessivo(
  form: PaginaFormularioDadosReferencia,
  o: { rotuloPreco: string; excessivo: string; controlo: string; escritas: string[] },
): Promise<void> {
  await form.esperarCarregado();
  const campo = form.campo(o.rotuloPreco);
  const mensagem = form.conteudo().getByText(/dÃ­gitos|demasiado elevado|excede|casas decimais/i).first();
  await preencherDatepicker(form.campo('Data InÃ­cio'), '01/01/2030');

  await test.step(`Guardar com o preÃ§o ${o.excessivo} mostra que o valor excede o nÂº mÃ¡ximo de dÃ­gitos inteiros`, async () => {
    await campo.fill(o.excessivo);
    await expect(campo).toHaveValue(o.excessivo);
    await form.botaoGuardar().click();
    await expect.soft(mensagem, 'mensagem de validaÃ§Ã£o do preÃ§o').toBeVisible();
    const texto = ((await mensagem.textContent().catch(() => '')) ?? '').trim();
    expect.soft(texto, 'a mensagem refere o limite de dÃ­gitos inteiros (ou valor demasiado elevado)').toMatch(/dÃ­gitos inteiros|demasiado elevado|excede/i);
    expect.soft(texto, 'nÃ£o Ã© a mensagem antiga, sÃ³ sobre casas decimais').not.toMatch(MSG_PRECO_SO_DECIMAIS);
    test.info().annotations.push({ type: 'observacao', description: `mensagem para ${o.excessivo}: "${texto}"` });
  });
  await test.step(`Controlo: o preÃ§o ${o.controlo} mostra a mensagem de casas decimais`, async () => {
    await campo.fill(o.controlo);
    await form.botaoGuardar().click();
    await expect.soft(mensagem).toBeVisible();
    const texto = ((await mensagem.textContent().catch(() => '')) ?? '').trim();
    expect.soft(texto, 'mensagem para o controlo com decimais a mais').toMatch(/casas decimais/i);
  });
  await test.step('Nenhum pedido de gravaÃ§Ã£o enviado (a validaÃ§Ã£o Ã© feita no cliente)', async () => {
    await form.page.waitForTimeout(500);
    expect.soft(o.escritas, 'pedidos POST/PUT/PATCH/DELETE').toEqual([]);
  });
}

/**
 * CT-REG-BUG-20260915-26 (variante com o servidor) â€” preenche um preÃ§o vÃ¡lido e troca-o por
 * `excessivo` no corpo do POST (o cliente jÃ¡ nÃ£o deixa enviar o valor), para ler a mensagem do
 * servidor. **Pode gravar** se a validaÃ§Ã£o do servidor tiver sido removida: sÃ³ com escrita permitida.
 */
export async function verificarMensagemPrecoExcessivoServidor(
  form: PaginaFormularioDadosReferencia,
  o: { rotuloPreco: string; excessivo: number },
): Promise<void> {
  const page = form.page;
  await form.esperarCarregado();
  await form.campo(o.rotuloPreco).fill('1');
  await preencherDatepicker(form.campo('Data InÃ­cio'), '01/01/2030');
  await page.route('**/precos', (rota) => {
    const pedido = rota.request();
    if (pedido.method() !== 'POST') return rota.fallback();
    const corpo = { ...(pedido.postDataJSON() as Record<string, unknown>), preco: o.excessivo };
    return rota.continue({ postData: JSON.stringify(corpo) });
  });
  const resposta = page.waitForResponse((r) => r.request().method() === 'POST' && /\/precos$/.test(new URL(r.url()).pathname));
  await form.botaoGuardar().click();
  const r = await resposta;
  const corpo = await r.text();
  expect.soft(r.status(), `estado HTTP da gravaÃ§Ã£o com preÃ§o ${o.excessivo}`).toBe(400);
  expect.soft(corpo, 'mensagem do servidor refere o limite de dÃ­gitos inteiros').toMatch(/dÃ­gitos|demasiado elevado|excede/i);
  expect.soft(corpo, 'mensagem do servidor nÃ£o Ã© sÃ³ sobre casas decimais').not.toMatch(/admite no mÃ¡ximo \d casas decimais"/);
  await expect.soft(form.alertaErro().first(), 'a mensagem do servidor aparece na UI').toBeVisible();
}

/**
 * C01 â€” formulÃ¡rio vazio: h1, grelha padrÃ£o, Guardar ativo, "Voltar" Ã  esquerda (sem "Cancelar")
 * e nenhuma secÃ§Ã£o com Colapsar/Expandir (secÃ§Ãµes com "Guardar" nÃ£o colapsam â€” Manual A.5 v4.3,
 * DEC-182, 08-10-2026; substitui a DEC-022).
 */
export async function verificarFormularioVazio(form: PaginaFormularioDadosReferencia): Promise<void> {
  await form.esperarCarregado();
  await test.step('O tÃ­tulo Ã© h1', async () => {
    await expect.soft(form.titulo()).toHaveCount(1);
  });
  await test.step('SecÃ§Ã£o de ediÃ§Ã£o sem Colapsar/Expandir (Manual A.5, DEC-182)', async () => {
    await expect.soft(form.togglesColapsar(), 'secÃ§Ã£o com "Guardar" nÃ£o tem Colapsar/Expandir').toHaveCount(0);
  });
  await test.step('Os campos estÃ£o no grid padrÃ£o (6 colunas em ecrÃ£ largo)', async () => {
    expect.soft(await form.colunasDaGrelha(), 'colunas da grelha dos campos').toBe(6);
  });
  await test.step('O botÃ£o Guardar estÃ¡ ativo', async () => {
    await expect.soft(form.botaoGuardar()).toBeEnabled();
    await expect.soft(form.botaoGuardar()).not.toHaveAttribute('aria-disabled', 'true');
  });
  await test.step('"Voltar" Ã  esquerda, em vez de "Cancelar"', async () => {
    await expect.soft(form.botaoVoltar()).toBeVisible();
    await expect.soft(form.botaoCancelar()).toHaveCount(0);
    const voltar = await form.botaoVoltar().boundingBox();
    const guardar = await form.botaoGuardar().boundingBox();
    expect.soft((voltar?.x ?? 0) < (guardar?.x ?? 0), '"Voltar" Ã  esquerda de "Guardar"').toBe(true);
  });
}

/** C02 â€” Guardar com obrigatÃ³rios vazios: mensagem por campo e nenhum pedido enviado. */
export async function verificarObrigatoriosEmFalta(
  form: PaginaFormularioDadosReferencia,
  mensagens: string[],
  escritas: string[],
): Promise<void> {
  await form.esperarCarregado();
  await form.botaoGuardar().click();
  for (const msg of mensagens) {
    await expect.soft(form.conteudo().getByText(msg, { exact: true }), `mensagem "${msg}"`).toBeVisible();
  }
  await form.page.waitForTimeout(500);
  expect(escritas, 'nenhum pedido de gravaÃ§Ã£o enviado').toEqual([]);
}

/** C06 â€” "Voltar" regressa Ã  tela anterior sem gravar. */
export async function verificarVoltarSemGravar(
  form: PaginaFormularioDadosReferencia,
  destino: RegExp,
  escritas: string[],
): Promise<void> {
  await form.esperarCarregado();
  await form.botaoVoltar().click();
  await expect(form.page).toHaveURL(destino);
  expect(escritas, 'nenhum pedido de gravaÃ§Ã£o enviado').toEqual([]);
}

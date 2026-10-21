import { test as base } from '@playwright/test';

/**
 * `test` da suíte — o do Playwright com o log de execução automático. Os specs importam
 * `test`/`expect` DAQUI e não de `@playwright/test` (o ESLint obriga: ver eslint.config.mjs).
 *
 * Log de execução (práticas de "Referências e exemplos/Logs": consola do browser, erros e
 * chamadas externas falhadas, contexto do caso, sem PII, anexado ao relatório):
 *   - consola do browser: mensagens `error` e `warning`;
 *   - erros da página: exceções JavaScript não apanhadas (`pageerror`);
 *   - pedidos: falhados na rede (`requestfailed`) e respostas HTTP >= 400, com método, URL,
 *     estado e duração;
 *   - contexto: id da execução (`E2E_EXECUCAO`), lote, caso, projeto, ambiente, tentativa.
 *
 * Só informativo — nunca faz um teste falhar. Anexado como `log-execucao` (JSON) **apenas
 * quando o teste falha** (estado diferente do esperado), para não pesar o relatório.
 * Cobre as páginas do `context` do próprio teste; páginas abertas à mão em `beforeAll`
 * (`browser.newPage()`) ficam de fora.
 */

type Nivel = 'WARN' | 'ERROR';

interface EventoLog {
  /** Milissegundos desde o início do teste. */
  t: number;
  nivel: Nivel;
  tipo: 'consola' | 'erro-pagina' | 'pedido-falhado' | 'resposta-erro';
  mensagem: string;
  metodo?: string;
  url?: string;
  estado?: number;
  duracaoMs?: number;
}

/** Máximo de eventos por teste — uma página em loop de erros não enche o relatório. */
const MAX_EVENTOS = 200;

/**
 * Mascara dados pessoais antes de irem para o log: NIF / nº de utente / CC (9 dígitos
 * isolados), emails e IBAN. Mesma ideia do masking em runtime do backend (padrões por regex);
 * não apanha nomes em texto livre.
 */
export function mascararPii(texto: string): string {
  return texto
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '***@***')
    .replace(/\b[A-Z]{2}\d{2}(?:\s?\d{4}){4,7}\b/g, '[IBAN]')
    .replace(/(?<![\d])\d{9}(?![\d])/g, '*********');
}

const curto = (texto: string, max = 500) => (texto.length > max ? `${texto.slice(0, max)}…` : texto);

export const test = base.extend<{ _logExecucao: void }>({
  _logExecucao: [
    async ({ context }, use, testInfo) => {
      const inicio = Date.now();
      const eventos: EventoLog[] = [];
      let descartados = 0;
      const registar = (e: Omit<EventoLog, 't'>) => {
        if (eventos.length >= MAX_EVENTOS) {
          descartados++;
          return;
        }
        eventos.push({
          t: Date.now() - inicio,
          ...e,
          mensagem: curto(mascararPii(e.mensagem)),
          url: e.url ? mascararPii(e.url) : undefined,
        });
      };

      context.on('console', (msg) => {
        const tipo = msg.type();
        if (tipo !== 'error' && tipo !== 'warning') return;
        registar({
          nivel: tipo === 'error' ? 'ERROR' : 'WARN',
          tipo: 'consola',
          mensagem: msg.text(),
          url: msg.location().url || undefined,
        });
      });
      context.on('weberror', (erro) => {
        const e = erro.error();
        registar({
          nivel: 'ERROR',
          tipo: 'erro-pagina',
          mensagem: `${e.name}: ${e.message}${e.stack ? `\n${e.stack.split('\n').slice(1, 4).join('\n')}` : ''}`,
        });
      });
      context.on('requestfailed', (pedido) => {
        const motivo = pedido.failure()?.errorText ?? 'falhou';
        // Navegações/recursos cancelados ao mudar de página não são falhas da app.
        if (/ERR_ABORTED|NS_BINDING_ABORTED|cancelled/i.test(motivo)) return;
        registar({
          nivel: 'ERROR',
          tipo: 'pedido-falhado',
          mensagem: motivo,
          metodo: pedido.method(),
          url: pedido.url(),
        });
      });
      context.on('response', (resposta) => {
        if (resposta.status() < 400) return;
        const timing = resposta.request().timing();
        registar({
          nivel: resposta.status() >= 500 ? 'ERROR' : 'WARN',
          tipo: 'resposta-erro',
          mensagem: `HTTP ${resposta.status()} ${resposta.statusText()}`.trim(),
          metodo: resposta.request().method(),
          url: resposta.url(),
          estado: resposta.status(),
          duracaoMs: timing.responseEnd > 0 ? Math.round(timing.responseEnd) : undefined,
        });
      });

      await use();

      if (testInfo.status === testInfo.expectedStatus) return;
      const anotacao = (tipo: string) =>
        testInfo.annotations.find((a) => a.type === tipo)?.description;
      const log = {
        execucao: process.env.E2E_EXECUCAO,
        lote: process.env.E2E_LOTE || undefined,
        caso: anotacao('caso') ?? testInfo.title,
        camada: anotacao('camada'),
        projeto: testInfo.project.name,
        ambiente: process.env.AMBIENTE ?? 'mock',
        baseUrl: testInfo.project.use.baseURL,
        tentativa: testInfo.retry,
        estado: testInfo.status,
        duracaoMs: testInfo.duration,
        resumo: {
          erros: eventos.filter((e) => e.nivel === 'ERROR').length,
          avisos: eventos.filter((e) => e.nivel === 'WARN').length,
          descartados,
        },
        eventos,
      };
      await testInfo.attach('log-execucao', {
        body: JSON.stringify(log, null, 2),
        contentType: 'application/json',
      });
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';

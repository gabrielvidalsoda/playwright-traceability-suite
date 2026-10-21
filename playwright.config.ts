import { defineConfig, devices } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * ConfiguraÃ§Ã£o Playwright â€” suÃ­te E2E "Consulta por Ãrea de PrestaÃ§Ã£o".
 *
 * A app sob teste Ã© o `ccmsns-ui` a correr em modo mock (MSW, sem backend). Por defeito
 * o Playwright arranca-a sozinho (`npm run dev:mock`); ver `webServer` mais abaixo.
 *
 * VariÃ¡veis de ambiente:
 *   BASE_URL        URL da app sob teste            (default http://localhost:<E2E_PORT>)
 *   E2E_PORT        porta do dev server de teste    (default 5179 â€” dedicada, nÃ£o colide
 *                                                    com o "npm run dev" do programador em 5173)
 *   CCMSNS_UI_DIR   caminho do repo ccmsns-ui       (default ../repos/ccmsns-ui)
 *   PW_NO_SERVER=1  nÃ£o arrancar a app (jÃ¡ estÃ¡ a correr noutro lado)
 *   AMBIENTE        mock | qua | dev                (default mock â€” ver dados/massa.ts;
 *                                                    dev = https://app.example.internal, com
 *                                                    PW_NO_SERVER=1 e BASE_URL)
 *   E2E_UTILIZADOR  operador registado pela app     (default qa.e2e â€” sÃ³ fora de `mock`;
 *                                                    ver `sessaoAmbientePublicado` abaixo)
 *   CAMADA          front | integracao              (opcional â€” ver `CAMADA` abaixo; normalmente
 *                                                    definida por `npm run test:front` /
 *                                                    `test:integracao` / `test:tudo`)
 *   CI             (definida pelo Bitbucket)        ativa retries e workers=1
 */

/** URL do ambiente `dev` publicado (sÃ³ acessÃ­vel por VPN). */
const URL_DEV = 'https://app.example.internal';

/**
 * Modo de execuÃ§Ã£o por camada (tags `@front` / `@integracao`, ver `meta()` em testes/apoio.ts):
 *   - `front`      â†’ sÃ³ `@front`, contra o `ccmsns-ui` em modo mock (MSW) arrancado localmente.
 *   - `integracao` â†’ sÃ³ `@integracao`, contra o ambiente publicado: por defeito AMBIENTE=dev,
 *                    BASE_URL=URL_DEV e sem arrancar a app (cada um pode ser sobreposto).
 *   - (vazia)      â†’ comportamento de sempre: todos os testes, no AMBIENTE indicado.
 * Com camada, os relatÃ³rios vÃ£o para `relatorios/<camada>/â€¦`, para que `test:tudo` nÃ£o
 * sobreponha o relatÃ³rio de uma camada com o da outra.
 *
 * Os defaults sÃ£o escritos em `process.env` porque os workers voltam a avaliar este ficheiro
 * e `dados/massa.ts` lÃª `AMBIENTE` do ambiente do processo.
 */
const CAMADA = process.env.CAMADA?.trim() || undefined;
if (CAMADA !== undefined && CAMADA !== 'front' && CAMADA !== 'integracao') {
  throw new Error(`[ccmsns-qa-e2e] CAMADA invÃ¡lida: "${CAMADA}" (use front ou integracao).`);
}
if (CAMADA === 'front') {
  process.env.AMBIENTE ??= 'mock';
}
if (CAMADA === 'integracao') {
  process.env.AMBIENTE ??= 'dev';
  process.env.BASE_URL ??= URL_DEV;
  process.env.PW_NO_SERVER ??= '1';
}
const RELATORIOS = CAMADA ? `relatorios/${CAMADA}` : 'relatorios';

/**
 * **Id da execuÃ§Ã£o** (`E2E_EXECUCAO`) = `teste-<tipo>-<ambiente>-<data>`: `<tipo>` = camada
 * (`geral` sem camada); `<ambiente>` = mock | dev | qua; `<data>` = inÃ­cio da corrida,
 * AAAA-MM-DD_HH-MM-SS. Ã‰ o nome da pasta do relatÃ³rio de execuÃ§Ã£o
 * (`relatorios/playwright/<id>/<id>.{html,md,pdf}`, ver `ferramentas/reporter-execucao.ts`), a
 * chave do histÃ³rico de tempos (`relatorios/historico/`, ver `ferramentas/reporter-historico.ts`)
 * e vai no log de execuÃ§Ã£o de cada teste. `test:tudo` junta as duas corridas num `E2E_LOTE`.
 * Guardado em `process.env` porque os workers voltam a avaliar este ficheiro e o id tem de
 * ser o mesmo em todos os processos.
 */
if (!process.env.E2E_EXECUCAO) {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const data =
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_` +
    `${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
  const ambiente = ['qua', 'dev'].includes(process.env.AMBIENTE ?? '') ? process.env.AMBIENTE : 'mock';
  process.env.E2E_EXECUCAO = `teste-${CAMADA ?? 'geral'}-${ambiente}-${data}`;
}
const PASTA_EXECUCAO = `relatorios/playwright/${process.env.E2E_EXECUCAO}`;
/** `--list` tambÃ©m passa pelos reporters e o `html` criaria uma pasta vazia por listagem. */
const SO_LISTAR = process.argv.includes('--list');
/** Filtro da camada, combinado (E lÃ³gico) com o filtro de cada projeto. */
const comCamada = (filtroProjeto?: string): RegExp | undefined => {
  if (!CAMADA) return filtroProjeto ? new RegExp(filtroProjeto) : undefined;
  return new RegExp(`^(?=.*@${CAMADA}\\b)${filtroProjeto ? `(?=.*(${filtroProjeto}))` : ''}`);
};

const E2E_PORT = process.env.E2E_PORT ?? '5179';
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${E2E_PORT}`;
const SEM_SERVER = process.env.PW_NO_SERVER === '1' || process.env.PW_NO_SERVER === 'true';

/**
 * Enquanto o Keycloak nÃ£o estÃ¡ ligado, a app identifica o operador por
 * `localStorage['ccmsns.utilizador']` (enviado ao backend no cabeÃ§alho `X-Utilizador`, que
 * vai para a auditoria â€” XSUSER, mÃ¡x. 20 caracteres). Num ambiente publicado os testes
 * prÃ©-carregam um utilizador prÃ³prio da automaÃ§Ã£o, para que o que a suÃ­te fizer fique
 * distinguÃ­vel na BD de quem testa Ã  mÃ£o. Em `mock` nada muda.
 *
 * Quando a autenticaÃ§Ã£o Keycloak for ligada, este Ã© o ponto a substituir por um
 * `globalSetup` de login + `storageState` em ficheiro (ver todo.md).
 */
const AMBIENTE_PUBLICADO = process.env.AMBIENTE === 'dev' || process.env.AMBIENTE === 'qua';
const E2E_UTILIZADOR = (process.env.E2E_UTILIZADOR ?? 'qa.e2e').slice(0, 20);
const sessaoAmbientePublicado = AMBIENTE_PUBLICADO
  ? {
      cookies: [],
      origins: [
        {
          origin: new URL(BASE_URL).origin,
          localStorage: [{ name: 'ccmsns.utilizador', value: E2E_UTILIZADOR }],
        },
      ],
    }
  : undefined;

const uiDir = process.env.CCMSNS_UI_DIR
  ? path.resolve(process.env.CCMSNS_UI_DIR)
  : path.resolve(__dirname, '../repos/ccmsns-ui');

if (!SEM_SERVER && !fs.existsSync(path.join(uiDir, 'package.json'))) {
  throw new Error(
    `[ccmsns-qa-e2e] NÃ£o encontrei a app sob teste em "${uiDir}".\n` +
      `  â€¢ defina CCMSNS_UI_DIR com o caminho do repo ccmsns-ui, ou\n` +
      `  â€¢ arranque a UI Ã  mÃ£o ("npm run dev:mock" nesse repo) e corra com PW_NO_SERVER=1.`,
  );
}

export default defineConfig({
  testDir: './testes',
  outputDir: `./${RELATORIOS}/artefactos`,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // 1 retry sempre: absorve a corrida ocasional entre o 1.Âº carregamento da SPA
  // e a ativaÃ§Ã£o do service worker do MSW numa context nova.
  retries: 1,
  // Paralelismo moderado localmente â€” o dev server `dev:mock` (Vite) serve
  // centenas de mÃ³dulos ES Ã  medida e nÃ£o aguenta uma rajada de contexts.
  workers: process.env.CI ? 1 : 2,
  timeout: 45_000,
  expect: { timeout: 10_000 },

  reporter: [
    ['list'],
    ...(SO_LISTAR ? [] : ([['html', { outputFolder: PASTA_EXECUCAO, open: 'never' }]] as const)),
    // Pasta `test-reports`: um dos nomes que o Bitbucket Pipelines lÃª sozinho (separador Tests).
    ['junit', { outputFile: `${RELATORIOS}/test-reports/results.xml` }],
    [
      './ferramentas/reporter-rastreabilidade.ts',
      {
        pastaSaida: `${RELATORIOS}/rastreabilidade`,
        relatorioExecucao: `${PASTA_EXECUCAO}/${process.env.E2E_EXECUCAO}.html`,
      },
    ],
    // Depois do `html` (renomeia o index.html dele e gera o .md e o .pdf na mesma pasta).
    ...(SO_LISTAR
      ? []
      : ([
          [
            './ferramentas/reporter-execucao.ts',
            { pasta: PASTA_EXECUCAO, tipo: CAMADA ?? 'geral' },
          ],
          // SÃ³ falhas/instÃ¡veis, em "Passo | Resultado esperado | Resultado do teste" (falhas-<id>.md).
          ['./ferramentas/reporter-falhas.ts', { pasta: PASTA_EXECUCAO, tipo: CAMADA ?? 'geral' }],
          // HistÃ³rico de tempos por execuÃ§Ã£o (relatorios/historico/), para comparar corridas.
          [
            './ferramentas/reporter-historico.ts',
            { pasta: 'relatorios/historico', tipo: CAMADA ?? 'geral', uiDir: SEM_SERVER ? undefined : uiDir },
          ],
        ] as const)),
  ],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    locale: 'pt-PT',
    timezoneId: 'Europe/Lisbon',
    navigationTimeout: 45_000,
    storageState: sessaoAmbientePublicado,
  },

  /**
   * `chromium` corre a suÃ­te toda. `firefox`/`webkit` correm apenas o subconjunto
   * crÃ­tico (`@smoke`) e os testes de compatibilidade (`@compatibilidade`) â€” Ã© o
   * CT-COMPAT-SMOKE do plano (Traceability Suite Â§4.10). Selecionar um motor: `--project=firefox`.
   * Em `CAMADA=integracao` sÃ³ existe `chromium` (o ambiente publicado Ã© validado num motor).
   */
  projects: [
    { name: 'chromium', grep: comCamada(), use: { ...devices['Desktop Chrome'] } },
    ...(CAMADA === 'integracao'
      ? []
      : [
          {
            name: 'firefox',
            grep: comCamada('@smoke|@compatibilidade'),
            use: { ...devices['Desktop Firefox'] },
          },
          {
            name: 'webkit',
            grep: comCamada('@smoke|@compatibilidade'),
            use: { ...devices['Desktop Safari'] },
          },
        ]),
  ],

  webServer: SEM_SERVER
    ? undefined
    : {
        // Porta dedicada + --strictPort: nunca reutiliza (nem colide com) o dev server
        // do programador em :5173, que pode estar em modo `dev:api` (sem MSW).
        command: `npx vite build --mode mock && npx vite preview --port ${E2E_PORT} --strictPort`,
        cwd: uiDir,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});

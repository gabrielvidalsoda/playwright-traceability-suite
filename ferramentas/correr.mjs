/* global console */
/**
 * Corre a suíte por camada — só front, só integração (front + back), ou as duas.
 *
 *   node ferramentas/correr.mjs front       [args do playwright…]
 *   node ferramentas/correr.mjs integracao  [args do playwright…]
 *   node ferramentas/correr.mjs tudo        [args do playwright…]
 *
 * (atalhos: `npm run test:front`, `npm run test:integracao`, `npm run test:tudo`; os args
 * extra vão depois de `--`, ex. `npm run test:front -- testes/dados-referencia/vacinas`).
 *
 * Existe porque os scripts npm correm no cmd.exe no Windows, onde `CAMADA=front playwright
 * test` não funciona. Aqui só se define `CAMADA` e se chama o Playwright; os defaults de
 * cada camada (AMBIENTE, BASE_URL, arrancar ou não a app, filtro por tag, pasta dos
 * relatórios) estão em `playwright.config.ts`.
 *
 *   front       `@front`, ccmsns-ui em modo mock (MSW) arrancado localmente — sem VPN.
 *               Relatórios em relatorios/front/.
 *   integracao  `@integracao`, contra o ambiente publicado (default dev,
 *               https://ccmmc-dev.min-saude.pt — só por VPN). Antes de correr, confirma que
 *               o ambiente responde (`aguardar-versao.mjs`, espera curta); se não responder,
 *               não corre os testes e sai com 3. Relatórios em relatorios/integracao/.
 *   tudo        front e depois integração (a integração corre mesmo que o front falhe).
 *
 *   --dev / --url=<URL>  qualquer modo, contra o ambiente publicado em vez do mock local
 *               (ex. `npm run test:front -- --dev testes/dados-referencia`).
 *
 * Código de saída: 0 se tudo passou; senão o 1.º código diferente de 0.
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import process from 'node:process';

const URL_DEV = 'https://ccmmc-dev.min-saude.pt';
const MODOS = { front: ['front'], integracao: ['integracao'], tudo: ['front', 'integracao'] };

const [modo, ...resto] = process.argv.slice(2);
if (!MODOS[modo]) {
  console.error(
    'Uso: node ferramentas/correr.mjs <front|integracao|tudo> [--dev | --url=<URL>] [args do playwright…]',
  );
  process.exit(2);
}

/**
 * `--dev` / `--url=<URL>` (consumidos aqui, não passam ao Playwright): aponta TODAS as
 * camadas para um ambiente publicado em vez de arrancar a app local em mock — AMBIENTE=dev,
 * PW_NO_SERVER=1 e BASE_URL (`--dev` = URL_DEV). Sem eles, `front` corre em mock local e
 * `integracao` no dev (defaults de playwright.config.ts).
 */
let urlAmbiente;
const extra = resto.filter((arg) => {
  if (arg === '--dev') urlAmbiente = URL_DEV;
  else if (arg.startsWith('--url=')) urlAmbiente = arg.slice('--url='.length);
  else return true;
  return false;
});
if (urlAmbiente !== undefined && !/^https?:\/\/\S+$/.test(urlAmbiente)) {
  console.error(`[correr] URL inválida: "${urlAmbiente}".`);
  process.exit(2);
}

/** CLI do Playwright chamado pelo próprio node: sem `npx` nem shell, igual em Windows e Linux. */
const CLI_PLAYWRIGHT = createRequire(import.meta.url).resolve('@playwright/test/cli');

const correrNode = (args, env) =>
  spawnSync(process.execPath, args, { stdio: 'inherit', env }).status ?? 1;

/**
 * `tudo` = duas corridas (cada uma com o seu id `E2E_EXECUCAO`, gerado no
 * playwright.config.ts); o lote liga-as no histórico: `lote-AAAA-MM-DD_HH-MM-SS`.
 */
const agora = new Date();
const p2 = (n) => String(n).padStart(2, '0');
const lote =
  process.env.E2E_LOTE ||
  (modo === 'tudo'
    ? `lote-${agora.getFullYear()}-${p2(agora.getMonth() + 1)}-${p2(agora.getDate())}_` +
      `${p2(agora.getHours())}-${p2(agora.getMinutes())}-${p2(agora.getSeconds())}`
    : '');

let saida = 0;
for (const camada of MODOS[modo]) {
  console.log(`\n=== Camada: ${camada} ===\n`);
  const env = { ...process.env, CAMADA: camada, E2E_LOTE: lote };
  delete env.E2E_EXECUCAO; // cada camada tem o seu id
  if (urlAmbiente) {
    env.AMBIENTE = 'dev';
    env.PW_NO_SERVER = '1';
    env.BASE_URL = urlAmbiente;
  }

  // Ambiente publicado (integração, ou qualquer camada com --dev/--url): confirmar que responde.
  if (camada === 'integracao' || urlAmbiente) {
    env.BASE_URL ??= URL_DEV;
    const acessivel = correrNode(['ferramentas/aguardar-versao.mjs'], {
      ...env,
      ESPERA_MAX_S: env.ESPERA_MAX_S ?? '30',
      INTERVALO_S: env.INTERVALO_S ?? '10',
    });
    if (acessivel !== 0) {
      console.error(
        `\n[correr] ${env.BASE_URL} não respondeu — testes da camada ${camada} não executados ` +
          '(está ligado à VPN?).',
      );
      saida ||= acessivel;
      continue;
    }
  }

  const codigo = correrNode([CLI_PLAYWRIGHT, 'test', ...extra], env);
  saida ||= codigo;
}
process.exit(saida);

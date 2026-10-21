/* global console */
/**
 * Abre no browser o relatório de execução mais recente de `relatorios/playwright/`
 * (pastas `teste-<tipo>-<data>`, ver `reporter-execucao.ts`).
 *
 *   node ferramentas/abrir-relatorio.mjs               # o mais recente, de qualquer tipo
 *   node ferramentas/abrir-relatorio.mjs integracao    # o mais recente desse tipo
 *
 * (atalho: `npm run relatorio [-- <tipo>]`). Usa `playwright show-report`, que serve a pasta
 * por HTTP — necessário para abrir os traces.
 */
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import process from 'node:process';

const BASE = 'relatorios/playwright';
const tipo = process.argv[2];
const prefixo = tipo ? `teste-${tipo}-` : 'teste-';

// O nome termina em AAAA-MM-DD_HH-MM-SS: ordenar pela data dá a execução mais recente.
const dataDe = (nome) => nome.slice(-19);
const pastas = fs.existsSync(BASE)
  ? fs
      .readdirSync(BASE, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith(prefixo))
      .map((d) => d.name)
      .sort((a, b) => dataDe(a).localeCompare(dataDe(b)))
  : [];

const ultima = pastas.at(-1);
if (!ultima) {
  console.error(`[relatorio] nenhuma pasta ${prefixo}* em ${BASE}/.`);
  process.exit(1);
}
console.log(`[relatorio] ${BASE}/${ultima}/${ultima}.html`);
const cli = createRequire(import.meta.url).resolve('@playwright/test/cli');
const r = spawnSync(process.execPath, [cli, 'show-report', path.join(BASE, ultima)], {
  stdio: 'inherit',
});
process.exit(r.status ?? 1);

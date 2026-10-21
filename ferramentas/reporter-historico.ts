import type { FullConfig, FullResult, Reporter, Suite } from '@playwright/test/reporter';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { estatistica, estatisticaPor, fmtDuracao, tempoDoCaso, type TempoCaso } from './estatisticas';

/**
 * Histórico de execuções — um registo por corrida, para comparar corridas entre si
 * (`npm run execucoes:listar`, `npm run execucoes:comparar`).
 *
 * Escreve em `relatorios/historico/` (fora das pastas por camada, para acumular):
 *   - `execucoes/<id>.json`  tudo da corrida: id, lote, tipo, ambiente, URL, filtros usados,
 *                            commits (este repo e, em mock, o ccmsns-ui), contagens,
 *                            estatísticas de tempo (geral, por browser, por ficheiro) e o
 *                            tempo de cada caso;
 *   - `execucoes.csv`        uma linha por corrida (abrir no Excel: separador `;`);
 *   - `testes.csv`           uma linha por caso e corrida (tempo de cada caso ao longo do tempo).
 *
 * `<id>` = `E2E_EXECUCAO` (ver `playwright.config.ts`). A pasta `relatorios/` é git-ignored:
 * o histórico vive só na máquina onde se corre (numa pipeline, só nos artifacts dessa corrida).
 */

interface OpcoesReporter {
  pasta: string;
  /** Tipo de teste (camada: front | integracao | geral). */
  tipo: string;
  /** Repo do ccmsns-ui quando a app é arrancada localmente (para registar o commit). */
  uiDir?: string;
}

function git(dir: string, ...args: string[]): string | undefined {
  try {
    return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return undefined;
  }
}

function versaoRepo(dir: string) {
  const commit = git(dir, 'rev-parse', '--short', 'HEAD');
  if (!commit) return undefined;
  return {
    commit,
    branch: git(dir, 'rev-parse', '--abbrev-ref', 'HEAD'),
    alteracoesLocais: Boolean(git(dir, 'status', '--porcelain', '--untracked-files=no')),
  };
}

/** Campo CSV com `;` como separador (Excel pt). */
function csv(valor: unknown): string {
  const s = String(valor ?? '');
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function acrescentarCsv(ficheiro: string, cabecalho: string[], linhas: unknown[][]): void {
  const novo = !fs.existsSync(ficheiro);
  const texto = linhas.map((l) => l.map(csv).join(';')).join('\n') + '\n';
  // BOM na criação: o Excel abre o UTF-8 com os acentos certos.
  fs.appendFileSync(ficheiro, (novo ? '﻿' + cabecalho.join(';') + '\n' : '') + texto);
}

export default class ReporterHistorico implements Reporter {
  private readonly pasta: string;
  private readonly tipo: string;
  private readonly uiDir?: string;
  private suite?: Suite;
  private config?: FullConfig;
  private inicio = new Date();

  constructor(opcoes: OpcoesReporter) {
    this.pasta = path.resolve(process.cwd(), opcoes.pasta);
    this.tipo = opcoes.tipo;
    this.uiDir = opcoes.uiDir;
  }

  printsToStdio(): boolean {
    return false;
  }

  onBegin(config: FullConfig, suite: Suite): void {
    this.config = config;
    this.suite = suite;
    this.inicio = new Date();
  }

  onEnd(resultado: FullResult): void {
    const testes = this.suite?.allTests() ?? [];
    // `--list` também chama onEnd — sem casos executados não há registo.
    if (!testes.some((t) => t.results.length > 0)) return;

    const rootDir = this.config?.rootDir ?? process.cwd();
    const casos: TempoCaso[] = testes.map((t) => tempoDoCaso(t, rootDir));
    const id = process.env.E2E_EXECUCAO ?? `teste-${this.tipo}-${Date.now()}`;
    const inicio = resultado.startTime ?? this.inicio;
    const contar = (estado: TempoCaso['estado']) => casos.filter((c) => c.estado === estado).length;

    const registo = {
      execucao: id,
      lote: process.env.E2E_LOTE || undefined,
      tipo: this.tipo,
      ambiente: ['qua', 'dev'].includes(process.env.AMBIENTE ?? '') ? process.env.AMBIENTE : 'mock',
      baseUrl: process.env.BASE_URL ?? this.config?.projects[0]?.use.baseURL,
      inicio: inicio.toISOString(),
      fim: new Date(inicio.getTime() + resultado.duration).toISOString(),
      /** Tempo de relógio da corrida inteira (inclui build/arranque da app e paralelismo). */
      duracaoMs: Math.round(resultado.duration),
      resultado: resultado.status,
      /** Argumentos do `playwright test` (filtros por pasta, --grep, --project…). */
      filtro: process.argv.slice(process.argv.indexOf('test') + 1).join(' '),
      projetos: [...new Set(casos.map((c) => c.projeto))],
      workers: this.config?.workers,
      versoes: {
        e2e: versaoRepo(rootDir),
        app: this.uiDir ? versaoRepo(this.uiDir) : undefined,
      },
      contagens: {
        total: casos.length,
        passou: contar('passou'),
        falhou: contar('falhou'),
        instavel: contar('instável'),
        ignorado: contar('ignorado'),
        naoExecutado: contar('não executado'),
      },
      tempos: {
        geral: estatistica(casos),
        porProjeto: estatisticaPor(casos, (c) => c.projeto),
        porCamada: estatisticaPor(casos, (c) => c.camada ?? '—'),
        porFicheiro: estatisticaPor(casos, (c) => c.ficheiro),
      },
      casos,
    };

    fs.mkdirSync(path.join(this.pasta, 'execucoes'), { recursive: true });
    fs.writeFileSync(path.join(this.pasta, 'execucoes', `${id}.json`), JSON.stringify(registo, null, 2));

    const g = registo.tempos.geral;
    acrescentarCsv(
      path.join(this.pasta, 'execucoes.csv'),
      [
        'execucao', 'lote', 'inicio', 'tipo', 'ambiente', 'base_url', 'filtro', 'projetos',
        'commit_e2e', 'commit_app', 'resultado', 'total', 'passou', 'falhou', 'instavel', 'ignorado',
        'duracao_corrida_ms', 'soma_casos_ms', 'media_caso_ms', 'mediana_caso_ms', 'min_caso_ms', 'max_caso_ms',
      ],
      [[
        id, registo.lote, registo.inicio, registo.tipo, registo.ambiente, registo.baseUrl, registo.filtro,
        registo.projetos.join(','), registo.versoes.e2e?.commit, registo.versoes.app?.commit, registo.resultado,
        registo.contagens.total, registo.contagens.passou, registo.contagens.falhou, registo.contagens.instavel,
        registo.contagens.ignorado, registo.duracaoMs, g.somaMs, g.mediaMs, g.medianaMs, g.minMs, g.maxMs,
      ]],
    );
    acrescentarCsv(
      path.join(this.pasta, 'testes.csv'),
      ['execucao', 'tipo', 'ambiente', 'caso', 'titulo', 'projeto', 'ficheiro', 'camada', 'estado', 'duracao_ms', 'duracao_total_ms', 'tentativas'],
      casos.map((c) => [
        id, registo.tipo, registo.ambiente, c.caso, c.titulo, c.projeto, c.ficheiro, c.camada,
        c.estado, c.duracaoMs, c.duracaoTotalMs, c.tentativas,
      ]),
    );

    console.log(
      `[histórico] ${id} · corrida ${fmtDuracao(registo.duracaoMs)} · por caso: média ${fmtDuracao(g.mediaMs)}, ` +
        `mediana ${fmtDuracao(g.medianaMs)}, mín. ${fmtDuracao(g.minMs)}, máx. ${fmtDuracao(g.maxMs)} (${g.n} casos) · ` +
        `${path.relative(process.cwd(), this.pasta)}/`,
    );
  }
}

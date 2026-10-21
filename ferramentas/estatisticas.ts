import type { TestCase } from '@playwright/test/reporter';
import * as path from 'node:path';

/**
 * Tempos por caso e estatísticas (média, mediana, mín., máx.) — partilhado pelo relatório de
 * execução (`reporter-execucao.ts`) e pelo histórico (`reporter-historico.ts`).
 *
 * Tempo de um caso = duração da **última tentativa** (a que decide o resultado); a soma de
 * todas as tentativas vai à parte (`duracaoTotalMs`), para os retries não distorcerem a média.
 * Casos ignorados ou não executados ficam fora das estatísticas.
 */

export type EstadoCaso = 'passou' | 'falhou' | 'instável' | 'ignorado' | 'não executado';

export interface TempoCaso {
  /** Chave estável entre execuções: projeto + ficheiro + caminho de títulos. */
  chave: string;
  caso: string;
  titulo: string;
  projeto: string;
  ficheiro: string;
  camada?: string;
  estado: EstadoCaso;
  /** Duração da última tentativa. */
  duracaoMs: number;
  /** Soma de todas as tentativas. */
  duracaoTotalMs: number;
  tentativas: number;
}

export interface Estatistica {
  n: number;
  somaMs: number;
  mediaMs: number;
  medianaMs: number;
  minMs: number;
  maxMs: number;
  /** Caso mais rápido / mais lento (título). */
  min?: string;
  max?: string;
}

export function estadoDoCaso(test: TestCase): EstadoCaso {
  if (test.results.length === 0) return 'não executado';
  switch (test.outcome()) {
    case 'expected':
      return 'passou';
    case 'flaky':
      return 'instável';
    case 'skipped':
      return 'ignorado';
    default:
      return 'falhou';
  }
}

export function tempoDoCaso(test: TestCase, rootDir: string): TempoCaso {
  const anotacao = (tipo: string) => test.annotations.find((a) => a.type === tipo)?.description;
  const ficheiro = path.relative(rootDir, test.location.file).replace(/\\/g, '/');
  const projeto = test.parent.project()?.name ?? '';
  const ultima = test.results.at(-1);
  return {
    // titlePath: ['', projeto, ficheiro, ...describes, título]
    chave: [projeto, ficheiro, ...test.titlePath().slice(3)].join(' › '),
    caso: anotacao('caso') ?? test.title,
    titulo: test.title,
    projeto,
    ficheiro,
    camada: anotacao('camada'),
    estado: estadoDoCaso(test),
    duracaoMs: ultima?.duration ?? 0,
    duracaoTotalMs: test.results.reduce((t, r) => t + r.duration, 0),
    tentativas: test.results.length,
  };
}

/** Só os casos que correram (passou / falhou / instável). */
export const executados = (casos: TempoCaso[]) =>
  casos.filter((c) => c.estado !== 'ignorado' && c.estado !== 'não executado');

export function estatistica(casos: TempoCaso[]): Estatistica {
  const validos = executados(casos);
  if (validos.length === 0) return { n: 0, somaMs: 0, mediaMs: 0, medianaMs: 0, minMs: 0, maxMs: 0 };
  const ordenados = [...validos].sort((a, b) => a.duracaoMs - b.duracaoMs);
  const soma = ordenados.reduce((t, c) => t + c.duracaoMs, 0);
  const meio = Math.floor(ordenados.length / 2);
  const mediana =
    ordenados.length % 2 ? ordenados[meio].duracaoMs : (ordenados[meio - 1].duracaoMs + ordenados[meio].duracaoMs) / 2;
  return {
    n: ordenados.length,
    somaMs: soma,
    mediaMs: Math.round(soma / ordenados.length),
    medianaMs: Math.round(mediana),
    minMs: ordenados[0].duracaoMs,
    maxMs: ordenados.at(-1)!.duracaoMs,
    min: ordenados[0].titulo,
    max: ordenados.at(-1)!.titulo,
  };
}

/** Estatística por grupo (ex. por projeto, por ficheiro), ordenada pelo nome do grupo. */
export function estatisticaPor(
  casos: TempoCaso[],
  grupo: (c: TempoCaso) => string,
): Array<{ grupo: string } & Estatistica> {
  const grupos = new Map<string, TempoCaso[]>();
  for (const c of casos) grupos.set(grupo(c), [...(grupos.get(grupo(c)) ?? []), c]);
  return [...grupos.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([g, lista]) => ({ grupo: g, ...estatistica(lista) }))
    .filter((e) => e.n > 0);
}

/** Duração legível: 1234 → "1,2 s"; 83000 → "1 m 23 s". */
export function fmtDuracao(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 60_000) return `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return `${m} m ${s} s`;
}

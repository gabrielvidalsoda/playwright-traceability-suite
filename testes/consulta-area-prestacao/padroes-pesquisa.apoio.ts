import { test } from '../fixtures';
import type { Page } from '@playwright/test';
import { naoAplicavel } from '../../paginas/dadosReferencia/padraoUi';
import { PesquisaConsulta, descreverCriterios, type Criterio } from '../../paginas/pesquisaConsulta';
import { meta } from '../apoio';
import { ecrasDoItem, type AreaConsulta, type EcraConsulta } from './apoio-consulta';
import { CONFIG_PESQUISAS, type ConfigPesquisa } from './padroes-pesquisa.config';

/**
 * Apoio comum aos casos de padrão das pesquisas de Consulta por Área de Prestação
 * (`padroes-paginacao-ordenacao.ts`, `padroes-filtros-opcoes.ts`): configuração de cada ecrã,
 * metadados dos casos e pesquisa de base. Plano:
 * `docs/padroes-pesquisa-consulta-16-10-2026/plano-padroes-pesquisa.md`.
 *
 * IDs: `CT-CON-<FIL|OPC|ORD|PAG>-<NN>-<sufixo do ecrã>` (NN = nº do caso de uso UC-…-NN).
 */

export const PLANO_PADROES_PESQUISA =
  'CCM/ccmsns-qa-e2e/docs/padroes-pesquisa-consulta-16-10-2026/plano-padroes-pesquisa.md';

/** Padrão decidido em 15-10-2026 (TASK-20261015-12): opções e valor inicial. */
export const TAMANHOS_PADRAO = [10, 15, 25, 50];
export const TAMANHO_INICIAL_PADRAO = 25;

/** Itens fora desta fase (UTS sai do menu — TASK-20261015-01). */
export const AREAS_FORA: ReadonlySet<AreaConsulta> = new Set(['uts']);

export function configDe(ecra: EcraConsulta): ConfigPesquisa {
  const cfg = CONFIG_PESQUISAS[ecra.rota];
  if (!cfg) throw new Error(`Sem configuração de pesquisa para ${ecra.rota} (padroes-pesquisa.config.ts)`);
  return cfg;
}

export function ecrasComPadroes(): EcraConsulta[] {
  return Object.keys(CONFIG_PESQUISAS).map((rota) => {
    const e = ecrasDoItem(CONFIG_PESQUISAS[rota].area).find((x) => x.rota === rota);
    if (!e) throw new Error(`Rota ${rota} não está em ECRAS_CONSULTA`);
    return e;
  });
}

export function metaPadrao(
  ecra: EcraConsulta,
  caso: string,
  uc: string,
  opcoes: { integracao?: boolean; bug?: string; tipo?: 'positivo' | 'negativo' | 'robustez' } = {},
) {
  return meta({
    caso,
    requisitos: ['RF29'],
    plano: `${PLANO_PADROES_PESQUISA} — ${uc}`,
    tipoTeste: 'caixa-preta',
    camada: opcoes.integracao ? 'integracao' : 'front',
    area: ecra.area,
    bug: opcoes.bug,
    tipo: opcoes.tipo ?? 'positivo',
  });
}

export const nomeCaso = (familia: string, nn: string, ecra: EcraConsulta) => `CT-CON-${familia}-${nn}-${ecra.sufixo}`;

// --- pesquisa de base -------------------------------------------------------------------------

export interface ResultadoBase {
  criterios: Criterio[];
  total: number;
}

/**
 * Abre o ecrã e faz a 1.ª pesquisa de base da configuração que devolva **mais de** `minTotal`
 * registos (as que têm um select sem opção tentam cada opção). Fica com a grelha dessa
 * pesquisa. Devolve a pesquisa usada, ou `null` se nenhuma chegar ao mínimo (o ecrã fica com a
 * que devolveu mais).
 */
export async function pesquisarBase(
  pq: PesquisaConsulta,
  cfg: ConfigPesquisa,
  minTotal: number,
): Promise<ResultadoBase | null> {
  let melhor: ResultadoBase | null = null;
  const tentar = async (criterios: Criterio[]): Promise<boolean> => {
    await pq.abrir();
    await pq.preencher(criterios);
    await pq.pesquisar();
    const total = (await pq.total()) ?? (await pq.contarLinhas());
    if (!melhor || total > melhor.total) melhor = { criterios, total };
    return total > minTotal;
  };
  for (const base of cfg.bases) {
    const semOpcao = base.find((c): c is { select: string } => 'select' in c && !c.opcao);
    if (!semOpcao) {
      if (await tentar(base)) return { criterios: base, total: melhor!.total };
      continue;
    }
    await pq.abrir();
    for (const opcao of await pq.opcoesSelect(semOpcao.select)) {
      const criterios = base.map((c) => (c === semOpcao ? { select: semOpcao.select, opcao } : c));
      if (await tentar(criterios)) return { criterios, total: melhor!.total };
    }
  }
  if (melhor) {
    // Deixa o ecrã com a pesquisa que devolveu mais registos.
    const m: ResultadoBase = melhor;
    await pq.abrir();
    await pq.preencher(m.criterios);
    await pq.pesquisar();
  }
  return null;
}

/** Pesquisa de base com mais de `minTotal` registos, ou marca o caso como não aplicável. */
export async function base(page: Page, ecra: EcraConsulta, minTotal: number, motivo: string): Promise<PesquisaConsulta | null> {
  const cfg = configDe(ecra);
  const pq = new PesquisaConsulta(page, ecra.rota, cfg.endpoint);
  // A pesquisa de base pode tentar várias opções de um select (lento no dev).
  test.setTimeout(Math.max(test.info().timeout, 240_000));
  let r: ResultadoBase | null = null;
  await test.step(`Pesquisa de base com mais de ${minTotal} registos`, async () => {
    r = await pesquisarBase(pq, cfg, minTotal);
  });
  if (!r) {
    naoAplicavel(`${ecra.rota}: nenhuma pesquisa de base devolve mais de ${minTotal} registos — ${motivo}`);
    return null;
  }
  const rb: ResultadoBase = r;
  test.info().annotations.push({
    type: 'observacao',
    description: `${ecra.rota}: pesquisa de base ${descreverCriterios(rb.criterios)} → ${rb.total} registos`,
  });
  return pq;
}

/**
 * Garante que há página seguinte: se o tamanho atual mostrar tudo, escolhe o menor tamanho
 * disponível. Devolve `false` (e marca o caso como não aplicável) se mesmo assim só houver uma.
 */
export async function garantirPagina2(pq: PesquisaConsulta, ecra: EcraConsulta): Promise<boolean> {
  if (await pq.temPaginaSeguinte()) return true;
  const menor = Math.min(...(await pq.opcoesTamanho()));
  if (menor < (await pq.tamanhoAtual())) await pq.escolherTamanho(menor);
  if (await pq.temPaginaSeguinte()) return true;
  naoAplicavel(`${ecra.rota}: a pesquisa de base só tem uma página, mesmo com ${menor} por página`);
  return false;
}

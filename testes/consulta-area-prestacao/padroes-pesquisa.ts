import { test } from '../fixtures';
import { ecrasDoItem, type AreaConsulta } from './apoio-consulta';
import { AREAS_FORA, configDe, ecrasComPadroes } from './padroes-pesquisa.apoio';
import {
  casoAutocompletePrestador,
  casoAutocompleteSemResultados,
  casoCriterioMinimo,
  casoFiltro,
  casoLimpar,
  casoMesmoDominio,
  casoModoComparacao,
  casoOpcoesCarregam,
  casoOpcoesDoServidor,
  casoRecarregar,
  casoRotuloCorrespondeConteudo,
  casoSemResultados,
} from './padroes-filtros-opcoes';
import {
  casoOrdCicloCliques,
  casoOrdContinuidade,
  casoOrdEstado,
  casoOrdMantem,
  casoOrdTodasColunas,
  casoOrdUrl,
  casoPagCadaOpcao,
  casoPagInicial,
  casoPagMantemFiltros,
  casoPagNavegacao,
  casoPagOpcoes,
  casoPagUrl,
  casoPagVoltaPrimeira,
} from './padroes-paginacao-ordenacao';
import { CONFIG_PESQUISAS } from './padroes-pesquisa.config';

/**
 * Registo dos casos de padrão das pesquisas de Consulta por Área de Prestação — filtros,
 * opções, ordenação e resultados por página, iguais nos 24 ecrãs (plano
 * `docs/padroes-pesquisa-consulta-16-10-2026/plano-padroes-pesquisa.md`, a partir da
 * validação com o Douglas de 15-10-2026).
 *
 * Cada `<item>.spec.ts` chama `casosPadroesPesquisaItem('<item>')`; os quadros transversais
 * estão em `testes/plano-de-testes/quadro-paginacao-consulta.spec.ts`.
 *   - `padroes-pesquisa.apoio.ts`         — configuração, metadados, pesquisa de base;
 *   - `padroes-pesquisa.config.ts`        — os 24 ecrãs (pedido, pesquisas de base, filtros);
 *   - `padroes-filtros-opcoes.ts`         — famílias A (filtros) e B (opções);
 *   - `padroes-paginacao-ordenacao.ts`    — famílias D (paginação) e C (ordenação).
 */

/** Pares de ecrãs com o mesmo domínio num select (UC-OPC-05). */
const MESMO_DOMINIO: { a: string; b: string; rotulo: string; rotuloB?: string }[] = [
  { a: '/medicamentos/lote', b: '/medicamentos/prestacoes', rotulo: 'Tipo de Lote' },
  { a: '/cuidados-respiratorios/lote', b: '/cuidados-respiratorios/prestacao', rotulo: 'Tipo de Lote' },
  { a: '/mcdts/lote', b: '/mcdts/prescricao', rotulo: 'Natureza da Prestação', rotuloB: 'Área da Prestação' },
];

/** Regista, para cada Rótulo do Item, os casos das famílias A, B, C e D. */
export function casosPadroesPesquisaItem(area: AreaConsulta): void {
  if (AREAS_FORA.has(area)) return;
  for (const ecra of ecrasDoItem(area)) {
    if (!CONFIG_PESQUISAS[ecra.rota]) continue;
    const filtros = configDe(ecra).filtros ?? [];
    test.describe(`${ecra.rotulo} — padrões da pesquisa (filtros, opções, ordenação, paginação)`, () => {
      test.describe('Filtros', () => {
        for (const f of filtros.filter((x) => x.coluna)) {
          casoFiltro(ecra, f);
          casoModoComparacao(ecra, f);
        }
        casoSemResultados(ecra);
        casoCriterioMinimo(ecra);
        casoLimpar(ecra);
        casoRecarregar(ecra);
      });
      test.describe('Opções', () => {
        casoOpcoesCarregam(ecra);
        casoOpcoesDoServidor(ecra);
        casoAutocompletePrestador(ecra);
        casoAutocompleteSemResultados(ecra);
        casoRotuloCorrespondeConteudo(ecra);
        for (const par of MESMO_DOMINIO.filter((p) => p.a === ecra.rota)) {
          const outro = ecrasComPadroes().find((e) => e.rota === par.b);
          if (outro) casoMesmoDominio(ecra, outro, par.rotulo, par.rotuloB);
        }
      });
      test.describe('Ordenação', () => {
        casoOrdTodasColunas(ecra);
        casoOrdCicloCliques(ecra);
        casoOrdContinuidade(ecra);
        casoOrdEstado(ecra);
        casoOrdMantem(ecra);
        casoOrdUrl(ecra);
      });
      test.describe('Resultados por página', () => {
        casoPagOpcoes(ecra);
        casoPagInicial(ecra);
        casoPagCadaOpcao(ecra);
        casoPagVoltaPrimeira(ecra);
        casoPagNavegacao(ecra);
        casoPagUrl(ecra);
        casoPagMantemFiltros(ecra);
      });
    });
  }
}

import { test } from '../fixtures';
import { casoQuadroSemResultados } from '../consulta-area-prestacao/padroes-filtros-opcoes';
import { casoQuadroComparativo } from '../consulta-area-prestacao/padroes-paginacao-ordenacao';

/**
 * UC-PAG-08 — quadro comparativo da paginação e dos parâmetros no URL nas 24 pesquisas de
 * Consulta por Área de Prestação (transversal: não pertence a um Item). Plano:
 * `docs/padroes-pesquisa-consulta-16-10-2026/plano-padroes-pesquisa.md`.
 */
test.describe('Consulta por Área de Prestação — padrões transversais das pesquisas', () => {
  casoQuadroComparativo();
  casoQuadroSemResultados();
});

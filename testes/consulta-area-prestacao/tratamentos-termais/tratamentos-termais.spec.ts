import { test } from '../../fixtures';
import { casosPadraoPesquisaItem } from '../apoio-consulta';
import { casosPadroesPesquisaItem } from '../padroes-pesquisa';

/**
 * Consulta por Área de Prestação → Tratamentos Termais (menu lateral: «Área de Prestação → Tratamentos Termais»; Item e
 * rotas confirmados em `ccmsns-ui` `origin/develop` `src/layout/MainLayout.tsx`).
 *
 * Por agora só tem os casos de padrão das pesquisas do plano «Ready for test» de 09-10-2026
 * (§4.1): `CT-REG-TASK-20260928-04` (sem breadcrumb na pesquisa aberta pelo menu) e
 * `CT-REG-TASK-20260928-05` (placeholders com instrução), uma variante por Rótulo.
 */
test.describe('Consulta por Área de Prestação → Tratamentos Termais', () => {
  casosPadraoPesquisaItem('tratamentos-termais');
  // Padrões das pesquisas (filtros, opções, ordenação, resultados por página) — plano
  // docs/padroes-pesquisa-consulta-16-10-2026/plano-padroes-pesquisa.md. Ver ../padroes-pesquisa.ts.
  casosPadroesPesquisaItem('tratamentos-termais');
});

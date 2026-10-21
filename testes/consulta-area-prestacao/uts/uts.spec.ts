import { test } from '../../fixtures';
import { casosPadraoPesquisaItem } from '../apoio-consulta';

/**
 * Consulta por Área de Prestação → Unidades Terapêuticas de Sangue (menu lateral: «Área de Prestação → Unidades Terapêuticas de Sangue»; Item e
 * rotas confirmados em `ccmsns-ui` `origin/develop` `src/layout/MainLayout.tsx`).
 *
 * Por agora só tem os casos de padrão das pesquisas do plano «Ready for test» de 09-10-2026
 * (§4.1): `CT-REG-TASK-20260928-04` (sem breadcrumb na pesquisa aberta pelo menu) e
 * `CT-REG-TASK-20260928-05` (placeholders com instrução), uma variante por Rótulo.
 */
test.describe('Consulta por Área de Prestação → Unidades Terapêuticas de Sangue', () => {
  casosPadraoPesquisaItem('uts');
});

import { expect, test } from '../../fixtures';
import { PaginaPesquisaDadosReferencia } from '../../../paginas/dadosReferencia/PaginaPesquisaDadosReferencia';
import { TROCA_SERINGAS } from '../../../paginas/dadosReferencia/telas';
import { naoAplicavel } from '../../../paginas/dadosReferencia/padraoUi';
import { meta } from '../../apoio';
import {
  GRUPO_MENU_CONSULTA,
  PLANO_READY_FOR_TEST_CONSULTA,
  abrirPeloMenu,
  abrirPrimeiroDetalheDaPesquisa,
  breadcrumb,
  casoPlaceholders,
  casoSemBreadcrumb,
  ecraConsulta,
  textoBreadcrumb,
  verificarBreadcrumbNavegavel,
} from '../apoio-consulta';
import { casosPadroesPesquisaItem } from '../padroes-pesquisa';

const FACTURAS = ecraConsulta('/troca-seringas/factura');

/**
 * Consulta por Área de Prestação → Programa Troca de Seringas (menu lateral: «Área de
 * Prestação → Programa Troca de Seringas → Facturas», `/troca-seringas/factura`; Item e rota
 * confirmados em `ccmsns-ui` `origin/develop` `src/layout/MainLayout.tsx`).
 *
 * Casos do plano «Ready for test» de 09-10-2026: `CT-REG-BUG-20260915-28` (§3) e as variantes
 * `-PTS-FAT` das `TASK-20260928-04`/`-05` (§4.1).
 */
test.describe('Consulta por Área de Prestação → Programa Troca de Seringas', () => {
  test.describe('Facturas', () => {
    casoSemBreadcrumb(FACTURAS);
    casoPlaceholders(FACTURAS);

    test(
      'CT-REG-BUG-20260915-28 — Breadcrumb navegável no caminho DR → Programa Troca de Seringas → Ver → "Ir para facturas"',
      meta({
        caso: 'CT-REG-BUG-20260915-28',
        requisitos: ['RF29', 'RF57'],
        plano: `${PLANO_READY_FOR_TEST_CONSULTA} — CT-REG-BUG-20260915-28`,
        tipoTeste: 'interface',
        camada: 'integracao',
        area: 'troca-seringas',
        bug: 'BUG-20260915-28',
        tipo: 'positivo',
      }),
      async ({ page }) => {
        test.slow();
        const dr = new PaginaPesquisaDadosReferencia(page, TROCA_SERINGAS);
        let codigo = '';

        await test.step('Dados de Referência → Programa Troca de Seringas: pesquisar e abrir o 1.º registo (Ver)', async () => {
          await dr.abrir();
          await dr.pesquisarComFiltro();
          codigo = (await dr.valoresColuna('Código SICAD'))[0] ?? '';
          expect(codigo, 'código SICAD da 1.ª linha').toBeTruthy();
          await dr.abrirPrimeiroDetalhe();
        });

        await test.step('No detalhe, cada nível do breadcrumb antes do atual é um link que abre a página correspondente', async () => {
          await verificarBreadcrumbNavegavel(page, 'Detalhe Troca de Seringas (DR)', ['Dados de Referência']);
        });

        await test.step('"Ir para facturas" abre a pesquisa de Facturas filtrada pelo código SICAD', async () => {
          await page.getByRole('button', { name: 'Ir para facturas' }).click();
          await expect(page).toHaveURL(new RegExp(`/troca-seringas/factura\\?codigoSicad=${codigo}`));
          await expect(page.getByRole('button', { name: 'Pesquisar', exact: true })).toBeVisible({ timeout: 30_000 });
        });

        await test.step('Em Facturas, nenhum nível do breadcrumb fica por navegar (cada nível antes do atual é um link)', async () => {
          if ((await breadcrumb(page).count()) === 0) {
            // A rota está em ROTAS_SEM_BREADCRUMB (Manual A.1 / TASK-20260928-04): sem
            // breadcrumb, o defeito (níveis não clicáveis neste ecrã) deixa de se reproduzir.
            naoAplicavel(
              `Facturas (${new URL(page.url()).pathname}, aberta por "Ir para facturas") não mostra breadcrumb — não há níveis a navegar neste ecrã`,
            );
            return;
          }
          await verificarBreadcrumbNavegavel(page, 'Facturas (Troca de Seringas)', [
            GRUPO_MENU_CONSULTA,
            'Programa Troca de Seringas',
          ]);
        });

        await test.step('No detalhe de uma factura, cada nível do breadcrumb antes do atual é um link que abre a página correspondente', async () => {
          await abrirPeloMenu(page, FACTURAS);
          const motivo = await abrirPrimeiroDetalheDaPesquisa(page, FACTURAS);
          if (motivo) {
            naoAplicavel(`${motivo} — breadcrumb do detalhe da factura não verificável`);
            return;
          }
          const trilho = await textoBreadcrumb(page);
          expect.soft(trilho, 'o detalhe da factura mostra o breadcrumb').not.toBeNull();
          if (trilho === null) return;
          await verificarBreadcrumbNavegavel(page, 'Detalhe da factura (Troca de Seringas)', [
            GRUPO_MENU_CONSULTA,
            'Programa Troca de Seringas',
          ]);
        });
      },
    );
  });
  // Padrões das pesquisas (filtros, opções, ordenação, resultados por página) — plano
  // docs/padroes-pesquisa-consulta-16-10-2026/plano-padroes-pesquisa.md. Ver ../padroes-pesquisa.ts.
  casosPadroesPesquisaItem('troca-seringas');
});

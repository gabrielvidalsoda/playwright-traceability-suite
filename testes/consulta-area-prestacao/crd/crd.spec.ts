import { expect, test } from '../../fixtures';
import { PaginaPesquisaFaturasCrd } from '../../../paginas/PaginaPesquisaFaturasCrd';
import { meta } from '../../apoio';
import { casosPadraoPesquisaItem } from '../apoio-consulta';
import { casosPadroesPesquisaItem } from '../padroes-pesquisa';

const PLANO = 'CCM/QA/Testes/Testes manuais/10-09-2026/Relatorio-Testes-Manuais-2026-09-10.md';

test.describe('Consulta por Área de Prestação → Cuidados Respiratórios Domiciliários', () => {
  test.describe('Facturas', () => {
    test.describe('Pesquisa', () => {
      test(
        'CT-REG-BUG-20260910-04 — Digitar a data completa em "Data da Facturação" é aceite',
        meta({
          caso: 'CT-REG-BUG-20260910-04',
          requisitos: ['RF29'],
          area: 'crd',
          tipo: 'robustez',
          bug: 'BUG-20260910-04',
          plano: `${PLANO} — BUG-20260910-04`,
        }),
        async ({ page }) => {
          const pag = new PaginaPesquisaFaturasCrd(page);
          await pag.abrir();

          await test.step('Escrever a data completa "31/12/2024"', async () => {
            await pag.preencherData('31/12/2024');
          });

          await test.step('O campo mantém a data digitada — não fica vazio', async () => {
            await expect(pag.campoDataFacturacao()).toHaveValue('31/12/2024');
          });
        },
      );

      test(
        'CT-REG-BUG-20260910-05 — Abrir o calendário sem outros filtros não dispara erro de critério mínimo',
        meta({
          caso: 'CT-REG-BUG-20260910-05',
          requisitos: ['RF29'],
          area: 'crd',
          tipo: 'robustez',
          bug: 'BUG-20260910-05',
          plano: `${PLANO} — BUG-20260910-05`,
        }),
        async ({ page }) => {
          const pag = new PaginaPesquisaFaturasCrd(page);
          await pag.abrir();

          await test.step('Todos os campos de filtro começam vazios', async () => {
            await expect(pag.campoNumeroFatura()).toHaveValue('');
            await expect(pag.campoDataFacturacao()).toHaveValue('');
          });

          await test.step('Clicar no ícone de calendário', async () => {
            await pag.botaoCalendarioData().click();
          });

          await test.step('O date-picker abre e nenhuma mensagem de critério mínimo aparece', async () => {
            await expect(pag.botaoMesAnteriorCalendario()).toBeVisible();
            await expect(pag.mensagemCriterioMinimo()).toHaveCount(0);
          });
        },
      );
    });
  });

  // TASK-20260928-04 (#1565) e -05 (#1566): padrão das pesquisas abertas pelo menu, uma
  // variante por Rótulo (plano Ready for test de 09-10-2026, §4.1). Ver ../apoio-consulta.ts.
  casosPadraoPesquisaItem('crd', (e) => `${e.rotulo} — padrão da pesquisa aberta pelo menu`);
  // Padrões das pesquisas (filtros, opções, ordenação, resultados por página) — plano
  // docs/padroes-pesquisa-consulta-16-10-2026/plano-padroes-pesquisa.md. Ver ../padroes-pesquisa.ts.
  casosPadroesPesquisaItem('crd');
});

import { expect, test } from '../../fixtures';
import { PaginaPesquisaFaturasMedicamentos } from '../../../paginas/PaginaPesquisaFaturasMedicamentos';
import { PaginaDetalheFaturaMedicamentos } from '../../../paginas/PaginaDetalheFaturaMedicamentos';
import { PaginaErrosDiferencasFatura } from '../../../paginas/PaginaErrosDiferencasFatura';
import { PaginaPesquisaLotesMedicamentos } from '../../../paginas/PaginaPesquisaLotesMedicamentos';
import { PaginaDetalheLoteMedicamentos } from '../../../paginas/PaginaDetalheLoteMedicamentos';
import { PaginaPesquisaPrestacoesMedicamentos } from '../../../paginas/PaginaPesquisaPrestacoesMedicamentos';
import { massa } from '../../../dados/massa';
import { meta } from '../../apoio';
import { casosPadraoPesquisaItem } from '../apoio-consulta';
import { casosPadroesPesquisaItem } from '../padroes-pesquisa';

const PLANO_FATURA_PESQUISA = 'CCM/QA/Consulta-Area-Prestacao.md §3 — Família Fatura';
const PLANO_FATURA_DETALHE = 'CCM/QA/Consulta-Area-Prestacao.md §3 — Detalhe da fatura';
const PLANO_BUGS_10_09 = 'CCM/QA/Testes/Testes manuais/10-09-2026/Relatorio-Testes-Manuais-2026-09-10.md';

test.describe('Consulta por Área de Prestação → Medicamentos', () => {
  test.describe('Facturas', () => {
    test.describe('Pesquisa', () => {
      test(
        'CT-FAT-NUMERO — Pesquisar fatura pelo Número da Fatura',
        meta({
          caso: 'CT-FAT-NUMERO',
          requisitos: ['RF29', 'RF32'],
          familia: 'fatura',
          tipo: 'positivo',
          plano: `${PLANO_FATURA_PESQUISA} — @CT-FAT-NUMERO`,
          smoke: true,
        }),
        async ({ page }, testInfo) => {
          const d = massa().faturaPorNumero;
          const pag = new PaginaPesquisaFaturasMedicamentos(page);

          await test.step('Dado o painel de filtros vazio', async () => {
            await pag.abrir();
            await expect(pag.campoNumeroFatura()).toHaveValue('');
          });

          await test.step(`Quando pesquiso pelo Número da Fatura "${d.numeroFatura}"`, async () => {
            await pag.pesquisarPorNumero(d.numeroFatura);
          });

          await test.step('Então a grade exibe apenas essa fatura', async () => {
            await expect(pag.linhasResultado()).toHaveCount(1);
            await expect(pag.celulaFatura(d.numeroFatura)).toHaveCount(1);
            await expect(page).toHaveURL(new RegExp(`[?&]numeroFactura=${d.numeroFatura}(&|$)`));
          });

          await test.step('E cada linha traz os grupos "Comunicado" e "Apurado" (RF#32)', async () => {
            await expect(pag.cabecalho('Total PVP (Comunicado)')).toBeVisible();
            await expect(pag.cabecalho('Total PVP (Apurado)')).toBeVisible();
          });

          await test.step('E os valores da linha correspondem à massa', async () => {
            const linha = pag.linhasResultado().first();
            if (d.nifPrestador) await expect(linha).toContainText(d.nifPrestador);
            if (d.estadoDescricao) await expect(linha).toContainText(d.estadoDescricao);
          });

          const ev = testInfo.outputPath('grade-resultado.png');
          await pag.tabela().screenshot({ path: ev });
          await testInfo.attach('grade-resultado', { path: ev, contentType: 'image/png' });
        },
      );

      test(
        'CT-FAT-NIF — Pesquisar faturas pelo NIF do Prestador',
        meta({
          caso: 'CT-FAT-NIF',
          requisitos: ['RF29'],
          familia: 'fatura',
          tipo: 'positivo',
          plano: `${PLANO_FATURA_PESQUISA} — @CT-FAT-NIF`,
        }),
        async ({ page }) => {
          const d = massa().faturaPorNif;
          const pag = new PaginaPesquisaFaturasMedicamentos(page);
          await pag.abrir();

          await pag.pesquisarPorNif(d.nifPrestador);

          await expect(page).toHaveURL(new RegExp(`[?&]nifPrestador=${d.nifPrestador}(&|$)`));
          const linhas = pag.linhasResultado();
          const n = await linhas.count();
          expect(n).toBeGreaterThan(0);
          for (let i = 0; i < n; i++) {
            await expect(linhas.nth(i)).toContainText(d.nifPrestador);
          }
          // total (todas as páginas) coincide com a massa
          await expect(page.getByText(new RegExp(`${d.totalEsperado}\\s+resultados?`))).toBeVisible();
        },
      );

      test(
        'CT-FAT-ESTADO — Pesquisar faturas por Estado',
        meta({
          caso: 'CT-FAT-ESTADO',
          requisitos: ['RF29', 'RF32'],
          familia: 'fatura',
          tipo: 'positivo',
          plano: `${PLANO_FATURA_PESQUISA} — @CT-FAT-ESTADO`,
        }),
        async ({ page }) => {
          const d = massa().faturaPorEstado;
          const pag = new PaginaPesquisaFaturasMedicamentos(page);
          await pag.abrir();

          await test.step(`Quando filtro por Estado = "${d.opcao}"`, async () => {
            await pag.selecionarEstado(d.opcao);
            await pag.pesquisar();
          });

          await test.step(`Então todas as linhas estão no estado "${d.descricaoNaGrelha}"`, async () => {
            const linhas = pag.linhasResultado();
            const n = await linhas.count();
            expect(n).toBeGreaterThan(0);
            for (let i = 0; i < n; i++) {
              await expect(linhas.nth(i)).toContainText(d.descricaoNaGrelha);
            }
            await expect(page).toHaveURL(/[?&]idEstado=\d+/);
          });
        },
      );

      test(
        'CT-FAT-SEM-CRITERIO — Pesquisar sem nenhum filtro é bloqueado',
        meta({
          caso: 'CT-FAT-SEM-CRITERIO',
          requisitos: ['RF29'],
          familia: 'fatura',
          tipo: 'negativo',
          plano: `${PLANO_FATURA_PESQUISA} — @CT-FAT-SEM-CRITERIO`,
          smoke: true,
        }),
        async ({ page }) => {
          const pag = new PaginaPesquisaFaturasMedicamentos(page);
          await pag.abrir();

          let houveChamada = false;
          page.on('request', (r) => {
            if (/\/medicamentos\/facturas\?/.test(r.url())) houveChamada = true;
          });

          await pag.botaoPesquisar().click();

          await expect(pag.mensagemCriterioMinimo()).toBeVisible();
          await expect(pag.linhasResultado()).toHaveCount(0);
          await page.waitForTimeout(500);
          expect(houveChamada, 'nenhuma chamada GET /medicamentos/facturas deve ser feita').toBe(false);
          await expect(page).not.toHaveURL(/numeroFactura=|nifPrestador=|idEstado=/);
        },
      );

      test(
        'CT-FAT-LIMPAR — Limpar filtros repõe a tela ao estado inicial',
        meta({
          caso: 'CT-FAT-LIMPAR',
          requisitos: ['RF29'],
          familia: 'fatura',
          tipo: 'positivo',
          plano: `${PLANO_FATURA_PESQUISA} — @CT-FAT-LIMPAR`,
        }),
        async ({ page }) => {
          const d = massa().faturaPorNumero;
          const pag = new PaginaPesquisaFaturasMedicamentos(page);
          await pag.abrir();
          await pag.pesquisarPorNumero(d.numeroFatura);
          await expect(pag.linhasResultado()).toHaveCount(1);

          await pag.botaoLimpar().click();

          // "Repor ao estado inicial" = campos vazios + URL sem parâmetros de pesquisa.
          // (A grelha mantém o último resultado em cache até nova pesquisa — ver
          //  docs/casos-de-teste.md, desvio observado no CT-FAT-LIMPAR.)
          await expect(pag.campoNumeroFatura()).toHaveValue('');
          await expect(pag.mensagemCriterioMinimo()).toHaveCount(0);
          await expect(page).toHaveURL(/\/medicamentos\/factura$/);
        },
      );

      test(
        'CT-FAT-PAGINACAO — Paginação da grade de faturas (CA-G-04)',
        meta({
          caso: 'CT-FAT-PAGINACAO',
          requisitos: ['RF29'],
          familia: 'fatura',
          tipo: 'positivo',
          plano: 'CCM/QA/Consulta-Area-Prestacao.md §2.5 CA-G-04 — Paginação obrigatória',
        }),
        async ({ page }) => {
          const d = massa().faturaAmpla;
          const pag = new PaginaPesquisaFaturasMedicamentos(page);
          await pag.abrir();
          await pag.pesquisarPorNumero(d.numeroFatura);

          const ultimaPagina = d.totalEsperado % d.tamanhoPagina || d.tamanhoPagina;

          await test.step(`Página 1 mostra ${d.tamanhoPagina} linhas de ${d.totalEsperado}`, async () => {
            await expect(pag.linhasResultado()).toHaveCount(d.tamanhoPagina);
            await expect(page.getByText(new RegExp(`${d.totalEsperado}\\s+resultados?`))).toBeVisible();
            await expect(pag.botaoPagina('next')).toBeEnabled();
            await expect(pag.botaoPagina('first')).toBeDisabled();
          });

          const faturaP1 = await pag.primeiroNumeroFatura();

          await test.step('Ir para a última página muda o conteúdo e desativa "seguinte"', async () => {
            await pag.irParaPagina('last');
            await expect(pag.linhasResultado()).toHaveCount(ultimaPagina);
            await expect(pag.botaoPagina('next')).toBeDisabled();
            await expect(pag.botaoPagina('last')).toBeDisabled();
            expect(await pag.primeiroNumeroFatura()).not.toBe(faturaP1);
          });

          await test.step('Voltar à primeira página repõe o conteúdo inicial', async () => {
            await pag.irParaPagina('first');
            await expect(pag.linhasResultado()).toHaveCount(d.tamanhoPagina);
            await expect(pag.botaoPagina('first')).toBeDisabled();
            expect(await pag.primeiroNumeroFatura()).toBe(faturaP1);
          });
        },
      );

      test(
        'CT-FAT-PROCESSO — Pesquisar fatura pelo Número do Processo',
        meta({
          caso: 'CT-FAT-PROCESSO',
          requisitos: ['RF29'],
          familia: 'fatura',
          tipo: 'positivo',
          plano: `${PLANO_FATURA_PESQUISA} — @CT-FAT-PROCESSO`,
        }),
        async ({ page }) => {
          const d = massa().faturaPorProcesso;
          const pag = new PaginaPesquisaFaturasMedicamentos(page);
          await pag.abrir();

          await pag.pesquisarPorProcesso(d.numeroProcesso);

          await expect(page).toHaveURL(new RegExp(`[?&]numeroProcesso=${d.numeroProcesso}(&|$)`));
          const linhas = pag.linhasResultado();
          const n = await linhas.count();
          expect(n).toBeGreaterThan(0);
          for (let i = 0; i < n; i++) {
            await expect(linhas.nth(i)).toContainText(d.numeroProcesso);
          }
          if (d.numeroFaturaEsperado) {
            await expect(pag.celulaFatura(d.numeroFaturaEsperado)).toHaveCount(1);
          }
        },
      );

      test(
        'CT-FAT-DATA-MES — Data da Fatura filtra o mês inteiro',
        meta({
          caso: 'CT-FAT-DATA-MES',
          requisitos: ['RF29'],
          familia: 'fatura',
          tipo: 'positivo',
          plano: `${PLANO_FATURA_PESQUISA} — @CT-FAT-DATA-MES`,
        }),
        async ({ page }) => {
          const d = massa().faturaPorMes;
          const pag = new PaginaPesquisaFaturasMedicamentos(page);
          await pag.abrir();

          await pag.preencherData(d.dia);
          await pag.pesquisar();

          await test.step('A URL usa o 1.º dia do mês e a grade traz o mês inteiro', async () => {
            await expect(page).toHaveURL(new RegExp(`[?&]dataFactura=${d.mesIso}-01(&|$)`));
            const linhas = pag.linhasResultado();
            const n = await linhas.count();
            expect(n).toBeGreaterThan(0);
            // as células "Data Factura" mostram MM/AAAA
            const [ano, mes] = d.mesIso.split('-');
            for (let i = 0; i < n; i++) {
              await expect(linhas.nth(i)).toContainText(`${mes}/${ano}`);
            }
          });
        },
      );

      test(
        'CT-FAT-COMBINADO — Pesquisa combinando NIF + Estado (E lógico)',
        meta({
          caso: 'CT-FAT-COMBINADO',
          requisitos: ['RF29'],
          familia: 'fatura',
          tipo: 'positivo',
          plano: `${PLANO_FATURA_PESQUISA} — @CT-FAT-COMBINADO`,
        }),
        async ({ page }) => {
          const d = massa().faturaCombinado;
          const pag = new PaginaPesquisaFaturasMedicamentos(page);
          await pag.abrir();

          await pag.selecionarEstado(d.estadoOpcao);
          await pag.campoNif().fill(d.nifPrestador);
          await pag.pesquisar();

          await test.step('A URL contém ambos os critérios e o resultado é a interseção', async () => {
            await expect(page).toHaveURL(new RegExp(`[?&]nifPrestador=${d.nifPrestador}(&|$)`));
            await expect(page).toHaveURL(/[?&]idEstado=\d+/);
            const linhas = pag.linhasResultado();
            const n = await linhas.count();
            expect(n).toBeGreaterThan(0);
            for (let i = 0; i < n; i++) {
              await expect(linhas.nth(i)).toContainText(d.nifPrestador);
              await expect(linhas.nth(i)).toContainText(d.estadoNaGrelha);
            }
          });
        },
      );

      test(
        'CT-FAT-ORDENACAO — Ordenar a grade por uma coluna (CA-G-04)',
        meta({
          caso: 'CT-FAT-ORDENACAO',
          requisitos: ['RF29'],
          familia: 'fatura',
          tipo: 'positivo',
          plano: 'CCM/QA/Consulta-Area-Prestacao.md §2.5 CA-G-04 — @CT-FAT-ORDENACAO',
        }),
        async ({ page }) => {
          const d = massa().faturaAmpla;
          const pag = new PaginaPesquisaFaturasMedicamentos(page);
          await pag.abrir();
          await pag.pesquisarPorNumero(d.numeroFatura);
          await expect(pag.linhasResultado()).toHaveCount(d.tamanhoPagina);

          const primeiraAntes = await pag.primeiroNumeroFatura();
          await pag.ordenarPor('Factura');

          await expect(page).toHaveURL(/[?&]ordenar=numeroFactura(%2C|,)asc/);
          await expect(page).toHaveURL(/[?&]pagina=1(&|$)/); // ordenar repõe a página 1
          await expect(pag.linhasResultado()).toHaveCount(d.tamanhoPagina);
          // por nº asc, a 1.ª linha passa a ser F20250001 (topo) — diferente da ordenação inicial
          expect(await pag.primeiroNumeroFatura()).not.toBe(primeiraAntes);
        },
      );

      test(
        'CT-REG-BUG-20260910-02 — Alterar o tamanho de página recarrega a grade e repõe a página 1',
        meta({
          caso: 'CT-REG-BUG-20260910-02',
          requisitos: ['RF29'],
          familia: 'fatura',
          tipo: 'robustez',
          bug: 'BUG-20260910-02',
          plano: `${PLANO_BUGS_10_09} — BUG-20260910-02`,
        }),
        async ({ page }) => {
          const d = massa().faturaAmpla;
          const pag = new PaginaPesquisaFaturasMedicamentos(page);
          await pag.abrir();
          await pag.pesquisarPorNumero(d.numeroFatura);
          await expect(pag.linhasResultado()).toHaveCount(d.tamanhoPagina);

          const novoTamanho = d.tamanhoPagina === 10 ? 20 : 10;

          await test.step(`Mudar "Resultados por página" de ${d.tamanhoPagina} para ${novoTamanho}`, async () => {
            await pag.seletorTamanhoPagina().click();
            await page.getByRole('option', { name: String(novoTamanho), exact: true }).click();
          });

          await test.step('A grade recarrega com o novo tamanho e repõe a página 1', async () => {
            const linhasEsperadas = Math.min(novoTamanho, d.totalEsperado);
            await expect(pag.linhasResultado()).toHaveCount(linhasEsperadas);
            await expect(page).toHaveURL(new RegExp(`[?&]tamanho=${novoTamanho}(&|$)`));
            await expect(page).toHaveURL(/[?&]pagina=1(&|$)/);
          });
        },
      );

      test(
        'CT-FAT-EXPORTAR — Botão "Exportar XLSX" só ativo com pesquisa e resultados (CA-G-07)',
        meta({
          caso: 'CT-FAT-EXPORTAR',
          requisitos: ['RF29'],
          familia: 'fatura',
          tipo: 'positivo',
          plano: 'CCM/QA/Consulta-Area-Prestacao.md §2.5 CA-G-07 — @CT-FAT-EXPORTAR',
        }),
        async ({ page }) => {
          const pag = new PaginaPesquisaFaturasMedicamentos(page);
          await pag.abrir();

          await test.step('Sem pesquisa ativa → desativado', async () => {
            await expect(pag.botaoExportar()).toBeDisabled();
          });

          await test.step('Pesquisa com 0 resultados → desativado', async () => {
            await pag.pesquisarPorNumero('ZZZ-INEXISTENTE-000');
            await expect(pag.estadoVazio()).toBeVisible();
            await expect(pag.botaoExportar()).toBeDisabled();
          });

          await test.step('Pesquisa com resultados → ativado', async () => {
            await pag.campoNumeroFatura().fill(massa().faturaPorNumero.numeroFatura);
            await pag.pesquisar();
            await expect(pag.linhasResultado()).toHaveCount(1);
            await expect(pag.botaoExportar()).toBeEnabled();
          });
        },
      );
    });

    test.describe('Detalhe', () => {
      test(
        'CT-FAT-DETALHE-ABRIR — Cabeçalho somente leitura e totais Comunicado/Apurado',
        meta({
          caso: 'CT-FAT-DETALHE-ABRIR',
          requisitos: ['RF21', 'RF32'],
          familia: 'fatura',
          tipo: 'positivo',
          plano: `${PLANO_FATURA_DETALHE} — @CT-FAT-DETALHE-ABRIR`,
          smoke: true,
        }),
        async ({ page }, testInfo) => {
          const d = massa().faturaComDetalhe;
          const pesquisa = new PaginaPesquisaFaturasMedicamentos(page);
          const detalhe = new PaginaDetalheFaturaMedicamentos(page);

          await pesquisa.abrir();
          await pesquisa.pesquisarPorNumero(d.numeroFatura);
          await pesquisa.abrirDetalheDaPrimeiraLinha();

          await test.step('Navego para <rota>/:id', async () => {
            await expect(page).toHaveURL(/\/medicamentos\/factura\/\d+$/);
            await expect(detalhe.titulo()).toBeVisible();
          });

          await test.step('O cabeçalho e totais estão presentes (RF#21)', async () => {
            await expect(page.getByText(d.numeroFatura, { exact: true }).first()).toBeVisible();
            await expect(detalhe.blocoTotaisComunicados()).toBeVisible();
            await expect(detalhe.blocoTotaisApurados()).toBeVisible();
          });

          await test.step('A tela é somente leitura — sem campos de dados editáveis nem ações de estado', async () => {
            await expect(detalhe.camposDadosEditaveis()).toHaveCount(0);
            await expect(detalhe.botoesDeAccaoProibidos()).toHaveCount(0);
          });

          await test.step('As abas "Informações" e "Lotes" existem', async () => {
            await expect(detalhe.abaInformacoes()).toBeVisible();
            await expect(detalhe.abaLotes()).toBeVisible();
          });

          const ev = testInfo.outputPath('detalhe-fatura.png');
          await page.screenshot({ path: ev, fullPage: true });
          await testInfo.attach('detalhe-fatura', { path: ev, contentType: 'image/png' });
        },
      );

      test(
        'CT-FAT-DETALHE-INEXISTENTE — Identificador inexistente mostra mensagem amigável',
        meta({
          caso: 'CT-FAT-DETALHE-INEXISTENTE',
          requisitos: ['RF21'],
          familia: 'fatura',
          tipo: 'robustez',
          plano: `${PLANO_FATURA_DETALHE} — @CT-FAT-DETALHE-INEXISTENTE`,
        }),
        async ({ page }) => {
          const detalhe = new PaginaDetalheFaturaMedicamentos(page);
          await detalhe.abrirPorId(massa().faturaIdInexistente);

          await expect(detalhe.mensagemNaoEncontrada()).toBeVisible();
          await expect(detalhe.titulo()).toHaveCount(0);
          await expect(page.getByRole('table')).toHaveCount(0);
        },
      );

      test(
        'CT-FAT-CCE — Fatura Conferida Com Erros: aba Informações com Diferenças e Erros',
        meta({
          caso: 'CT-FAT-CCE',
          requisitos: ['RF32'],
          familia: 'fatura',
          tipo: 'positivo',
          plano: `${PLANO_FATURA_DETALHE} — @CT-FAT-CCE`,
        }),
        async ({ page }) => {
          const d = massa().faturaComErros;
          const pesquisa = new PaginaPesquisaFaturasMedicamentos(page);
          const detalhe = new PaginaDetalheFaturaMedicamentos(page);

          await pesquisa.abrir();
          await pesquisa.pesquisarPorNumero(d.numeroFatura);

          await test.step(`A linha mostra o estado "${d.estadoNaGrelha}"`, async () => {
            await expect(pesquisa.linhasResultado().first()).toContainText(d.estadoNaGrelha);
          });

          await pesquisa.abrirDetalheDaPrimeiraLinha();

          await test.step('Na aba "Informações" existem Comunicada/Conferida, Diferenças e Erros', async () => {
            await expect(detalhe.titulo()).toBeVisible();
            await expect(detalhe.abaInformacoes()).toHaveAttribute('aria-selected', 'true');
            await expect(detalhe.blocoInformacaoComunicada()).toBeVisible();
            await expect(detalhe.blocoInformacaoConferida()).toBeVisible();
            await expect(detalhe.blocoDiferencas()).toBeVisible();
            await expect(detalhe.blocoErros()).toBeVisible();
          });
        },
      );

      test(
        'CT-REG-BUG-20260910-08 — "Informação Comunicada"/"Conferida" mostram a linha de totais',
        meta({
          caso: 'CT-REG-BUG-20260910-08',
          requisitos: ['RF32'],
          familia: 'fatura',
          tipo: 'robustez',
          bug: 'BUG-20260910-08',
          plano: `${PLANO_BUGS_10_09} — BUG-20260910-08 (CA-FAT-32-01)`,
        }),
        async ({ page }) => {
          const d = massa().faturaComErros;
          const pesquisa = new PaginaPesquisaFaturasMedicamentos(page);
          const detalhe = new PaginaDetalheFaturaMedicamentos(page);

          await pesquisa.abrir();
          await pesquisa.pesquisarPorNumero(d.numeroFatura);
          await pesquisa.abrirDetalheDaPrimeiraLinha();

          await test.step('As três tabelas ("Comunicada", "Conferida", "Diferenças") mostram a linha "Total"', async () => {
            await expect(detalhe.blocoInformacaoComunicada()).toBeVisible();
            await expect(detalhe.linhaTotal('comunicada')).toHaveCount(1);
            await expect(detalhe.linhaTotal('conferida')).toHaveCount(1);
            await expect(detalhe.linhaTotal('diferencas')).toHaveCount(1);
          });
        },
      );
    });

    test.describe('Erros e diferenças', () => {
      test(
        'CT-REG-BUG-20260910-09 — "Erros e diferenças" mostra os mesmos dados do detalhe',
        meta({
          caso: 'CT-REG-BUG-20260910-09',
          requisitos: ['RF32'],
          familia: 'fatura',
          tipo: 'robustez',
          bug: 'BUG-20260910-09',
          plano: `${PLANO_BUGS_10_09} §5.2 — BUG-20260910-09`,
        }),
        async ({ page }) => {
          const d = massa().faturaComErros;
          const pesquisa = new PaginaPesquisaFaturasMedicamentos(page);
          const detalhe = new PaginaDetalheFaturaMedicamentos(page);
          const errosDiferencas = new PaginaErrosDiferencasFatura(page);

          await pesquisa.abrir();
          await pesquisa.pesquisarPorNumero(d.numeroFatura);
          await pesquisa.abrirDetalheDaPrimeiraLinha();

          const codigosNoDetalhe = await test.step(
            'A secção "Erros" da aba "Informações" tem pelo menos uma linha',
            async () => {
              await expect(detalhe.blocoErros()).toBeVisible();
              await expect(detalhe.linhasErros()).not.toHaveCount(0);
              return detalhe.linhasErros().allTextContents();
            },
          );

          await test.step('A tela dedicada "Erros e diferenças" mostra os mesmos dados — não abre vazia', async () => {
            await detalhe.abrirErrosDiferencas();
            await expect(errosDiferencas.titulo()).toBeVisible();
            await expect(errosDiferencas.linhas()).toHaveCount(codigosNoDetalhe.length);
            await expect(errosDiferencas.linhas().first()).not.toHaveCount(0);
          });
        },
      );

      test(
        'CT-REG-BUG-20260910-10 — "Erros e diferenças" mostra o número real da fatura, não o id da rota',
        meta({
          caso: 'CT-REG-BUG-20260910-10',
          requisitos: ['RF21'],
          familia: 'fatura',
          tipo: 'robustez',
          bug: 'BUG-20260910-10',
          plano: `${PLANO_BUGS_10_09} §5.2 — BUG-20260910-10`,
        }),
        async ({ page }) => {
          const d = massa().faturaComErros;
          const pesquisa = new PaginaPesquisaFaturasMedicamentos(page);
          const detalhe = new PaginaDetalheFaturaMedicamentos(page);
          const errosDiferencas = new PaginaErrosDiferencasFatura(page);

          await pesquisa.abrir();
          await pesquisa.pesquisarPorNumero(d.numeroFatura);
          await pesquisa.abrirDetalheDaPrimeiraLinha();

          const idDaRota = await test.step('Ler o :id interno a partir da URL do detalhe', async () => {
            const url = page.url();
            const match = /\/medicamentos\/factura\/(\d+)/.exec(url);
            expect(match, 'a URL do detalhe deve conter o id numérico interno').not.toBeNull();
            return match![1];
          });

          await detalhe.abrirErrosDiferencas();

          await test.step(`O título mostra o número real "${d.numeroFatura}", não o id interno "${idDaRota}"`, async () => {
            await expect(errosDiferencas.titulo()).toContainText(d.numeroFatura);
            await expect(errosDiferencas.titulo()).not.toContainText(idDaRota);
          });
        },
      );
    });
  });

  test.describe('Lotes', () => {
    test.describe('Pesquisa', () => {
      test(
        'CT-LOT-NUMERO-FATURA — Pesquisar lotes pelo Número da Fatura',
        meta({
          caso: 'CT-LOT-NUMERO-FATURA',
          requisitos: ['RF29'],
          familia: 'lote',
          tipo: 'positivo',
          plano: 'CCM/QA/Consulta-Area-Prestacao.md §4 — @CT-LOT-NUMERO-FATURA',
          smoke: true,
        }),
        async ({ page }, testInfo) => {
          const d = massa().lotePorNumeroFatura;
          const pag = new PaginaPesquisaLotesMedicamentos(page);

          await pag.abrir();
          await pag.pesquisarPorNumeroFatura(d.numeroFatura);

          await test.step(`A grade exibe os ${d.totalLotesEsperado} lotes da fatura`, async () => {
            await expect(pag.linhasResultado()).toHaveCount(d.totalLotesEsperado);
            const linhas = pag.linhasResultado();
            const n = await linhas.count();
            for (let i = 0; i < n; i++) {
              await expect(linhas.nth(i)).toContainText(d.numeroFatura);
            }
          });

          await test.step('Cada linha traz os totais dos grupos "Comunicado" e "Apurado"', async () => {
            await expect(pag.cabecalho('Total PVP (Comunicado)')).toBeVisible();
            await expect(pag.cabecalho('Total PVP (Apurado)')).toBeVisible();
          });

          const ev = testInfo.outputPath('grade-lotes.png');
          await pag.tabela().screenshot({ path: ev });
          await testInfo.attach('grade-lotes', { path: ev, contentType: 'image/png' });
        },
      );

      test(
        'CT-LOT-TIPO-NUMERO-LOTE — Pesquisar por Tipo de Lote + Número de Lote',
        meta({
          caso: 'CT-LOT-TIPO-NUMERO-LOTE',
          requisitos: ['RF29'],
          familia: 'lote',
          tipo: 'positivo',
          plano: 'CCM/QA/Consulta-Area-Prestacao.md §4 — @CT-LOT-TIPO-NUMERO-LOTE',
        }),
        async ({ page }) => {
          const d = massa().lotePorTipoNumero;
          const pag = new PaginaPesquisaLotesMedicamentos(page);
          await pag.abrir();

          await pag.pesquisarPorTipoENumero(d.tipoLote, d.numeroLote);

          await expect(page).toHaveURL(/[?&]tipoLote=\d+/);
          await expect(page).toHaveURL(new RegExp(`[?&]numeroLote=${d.numeroLote}(&|$)`));
          const linhas = pag.linhasResultado();
          const n = await linhas.count();
          expect(n).toBeGreaterThan(0);
          for (let i = 0; i < n; i++) {
            await expect(linhas.nth(i)).toContainText(d.tipoLote);
          }
        },
      );

      test(
        'CT-LOT-SEM-CRITERIO — Pesquisar sem filtro não executa a consulta',
        meta({
          caso: 'CT-LOT-SEM-CRITERIO',
          requisitos: ['RF29'],
          familia: 'lote',
          tipo: 'negativo',
          plano: 'CCM/QA/Consulta-Area-Prestacao.md §4 / §2.4 — @CT-LOT-SEM-CRITERIO',
        }),
        async ({ page }) => {
          const pag = new PaginaPesquisaLotesMedicamentos(page);
          await pag.abrir();

          let houveGet = false;
          page.on('request', (r) => {
            if (/\/medicamentos\/lotes\?/.test(r.url())) houveGet = true;
          });

          await pag.botaoPesquisar().click();
          await page.waitForTimeout(700);

          expect(
            houveGet,
            'sem critério mínimo, nenhuma chamada GET /medicamentos/lotes deve ocorrer',
          ).toBe(false);
          await expect(pag.linhasResultado()).toHaveCount(0);
          await expect(page).toHaveURL(/\/medicamentos\/lote$/);
        },
      );
    });

    test.describe('Detalhe', () => {
      test(
        'CT-LOT-DETALHE — Abrir o detalhe do lote: identificação, totais e abas',
        meta({
          caso: 'CT-LOT-DETALHE',
          requisitos: ['RF21', 'RF32'],
          familia: 'lote',
          tipo: 'positivo',
          plano: 'CCM/QA/Consulta-Area-Prestacao.md §4 — @CT-LOT-DETALHE',
        }),
        async ({ page }, testInfo) => {
          const d = massa().loteComDetalhe;
          const pesquisa = new PaginaPesquisaLotesMedicamentos(page);
          const detalhe = new PaginaDetalheLoteMedicamentos(page);

          await pesquisa.abrir();
          await pesquisa.pesquisarPorNumeroFatura(d.numeroFatura);
          await pesquisa.abrirDetalheDoPrimeiroLote();

          await test.step('Navego para <rota>/:id e vejo o cabeçalho do lote', async () => {
            await expect(page).toHaveURL(/\/medicamentos\/lote\/\d+$/);
            await expect(detalhe.titulo()).toBeVisible();
            await expect(page.getByText(d.numeroFatura, { exact: true }).first()).toBeVisible();
          });

          await test.step('Totais Comunicado vs Apurado (RF#21/RF#32)', async () => {
            await expect(detalhe.blocoTotaisComunicados()).toBeVisible();
            await expect(detalhe.blocoTotaisApurados()).toBeVisible();
          });

          await test.step('Abas "Detalhe do Lote" e "Prestações"; navegação para a fatura-mãe', async () => {
            await expect(detalhe.abaDetalheDoLote()).toBeVisible();
            await expect(detalhe.abaPrestacoes()).toBeVisible();
            await expect(detalhe.botaoIrParaFactura()).toBeVisible();
          });

          await test.step('Nenhum campo de dados do lote é editável', async () => {
            await expect(detalhe.camposDadosEditaveis()).toHaveCount(0);
          });

          const ev = testInfo.outputPath('detalhe-lote.png');
          await page.screenshot({ path: ev, fullPage: true });
          await testInfo.attach('detalhe-lote', { path: ev, contentType: 'image/png' });
        },
      );
    });
  });

  test.describe('Prestações', () => {
    test.describe('Pesquisa', () => {
      test(
        'CT-PRE-RECEITA — Pesquisar prestação pelo Número de Receita',
        meta({
          caso: 'CT-PRE-RECEITA',
          requisitos: ['RF29', 'RF32'],
          familia: 'prestacao',
          tipo: 'positivo',
          plano: 'CCM/QA/Consulta-Area-Prestacao.md §5 — @CT-PRE-RECEITA',
          smoke: true,
        }),
        async ({ page }, testInfo) => {
          const d = massa().prestacaoPorReceita;
          const pag = new PaginaPesquisaPrestacoesMedicamentos(page);

          await pag.abrir();
          await pag.pesquisarPorNumeroReceita(d.numeroReceita);

          await test.step('A grade retorna exatamente 1 prestação com essa receita', async () => {
            await expect(pag.linhasResultado()).toHaveCount(1);
            await expect(pag.linhasResultado().first()).toContainText(d.numeroReceita);
            await expect(page).toHaveURL(new RegExp(`[?&]numeroReceita=${d.numeroReceita}(&|$)`));
          });

          await test.step('Os grupos de colunas "Comunicado" e "Apurado" estão presentes (RF#32)', async () => {
            await expect(pag.cabecalho('Total PVP (Comunicado)')).toBeVisible();
            await expect(pag.cabecalho('Total PVP (Apurado)')).toBeVisible();
          });

          const ev = testInfo.outputPath('grade-prestacoes.png');
          await pag.tabela().screenshot({ path: ev });
          await testInfo.attach('grade-prestacoes', { path: ev, contentType: 'image/png' });
        },
      );

      test(
        'CT-PRE-NUMERO-FATURA — Pesquisar prestações pelo Número da Fatura',
        meta({
          caso: 'CT-PRE-NUMERO-FATURA',
          requisitos: ['RF29'],
          familia: 'prestacao',
          tipo: 'positivo',
          plano: 'CCM/QA/Consulta-Area-Prestacao.md §5 — @CT-PRE-NUMERO-FATURA',
        }),
        async ({ page }) => {
          const d = massa().prestacaoPorNumeroFatura;
          const pag = new PaginaPesquisaPrestacoesMedicamentos(page);
          await pag.abrir();

          await pag.pesquisarPorNumeroFatura(d.numeroFatura);

          await expect(page).toHaveURL(new RegExp(`[?&]numeroFatura=${d.numeroFatura}(&|$)`));
          const linhas = pag.linhasResultado();
          const n = await linhas.count();
          expect(n).toBeGreaterThanOrEqual(d.totalMinimoEsperado);
          for (let i = 0; i < n; i++) {
            await expect(linhas.nth(i)).toContainText(d.numeroFatura);
          }
          await expect(pag.cabecalho('Total PVP (Comunicado)')).toBeVisible();
          await expect(pag.cabecalho('Total PVP (Apurado)')).toBeVisible();
        },
      );

      test(
        'CT-PRE-SEM-CRITERIO — Pesquisar sem critério mínimo é bloqueado',
        meta({
          caso: 'CT-PRE-SEM-CRITERIO',
          requisitos: ['RF29'],
          familia: 'prestacao',
          tipo: 'negativo',
          plano: 'CCM/QA/Consulta-Area-Prestacao.md §5 / §2.4 — @CT-PRE-SEM-CRITERIO',
        }),
        async ({ page }) => {
          const pag = new PaginaPesquisaPrestacoesMedicamentos(page);
          await pag.abrir();

          let houveGet = false;
          page.on('request', (r) => {
            if (/\/medicamentos\/prestacoes\?/.test(r.url())) houveGet = true;
          });

          await pag.botaoPesquisar().click();

          await expect(pag.mensagemCriterioMinimo()).toBeVisible();
          await expect(pag.mensagemCriterioMinimo()).toContainText('número de receita');
          await page.waitForTimeout(500);
          expect(houveGet, 'a consulta não deve ser executada').toBe(false);
          await expect(pag.linhasResultado()).toHaveCount(0);
        },
      );
    });
  });

  // TASK-20260928-04 (#1565) e -05 (#1566): padrão das pesquisas abertas pelo menu, uma
  // variante por Rótulo (plano Ready for test de 09-10-2026, §4.1). Ver ../apoio-consulta.ts.
  casosPadraoPesquisaItem('medicamentos', (e) => `${e.rotulo} — padrão da pesquisa aberta pelo menu`);
  // Padrões das pesquisas (filtros, opções, ordenação, resultados por página) — plano
  // docs/padroes-pesquisa-consulta-16-10-2026/plano-padroes-pesquisa.md. Ver ../padroes-pesquisa.ts.
  casosPadroesPesquisaItem('medicamentos');
});

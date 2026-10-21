import { stat } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { meta } from '../apoio';
import { massa } from '../../dados/massa';
import { PaginaPesquisaDadosReferencia } from '../../paginas/dadosReferencia/PaginaPesquisaDadosReferencia';
import {
  ECRAS_PESQUISA,
  NOME_GRUPO,
  ecrasDoGrupo,
  nomeEcra,
  type EcraPesquisa,
  type GrupoPesquisa,
} from '../../paginas/rotasPesquisa';
import {
  BOTAO_PESQUISA,
  abrirEcraPesquisa,
  blocoFiltros,
  bloquearEscritasExcetoExportar,
  esperarResultado,
  exportarEsperarDownload,
  medirFiltros,
  type MedidaFiltros,
} from '../../paginas/padroesTransversais';
import {
  TITULOS_LONGOS,
  TITULOS_MENU,
  abrirTodosOsGrupos,
  medirTitulosMenu,
  semContador,
} from '../../paginas/menuLateral';
import { abrirRota } from '../../paginas/appMock';

/**
 * Tarefas de padrÃ£o transversais em "Ready for test" no Taiga (TASK-20260928-01, -10, -11, -13),
 * que se aplicam a todos os grupos e por isso ficam fora da hierarquia Grupo/Item/RÃ³tulo
 * (regra 4 de `CCM/.claude/rules/qa-e2e-organizacao-testes.md`).
 *
 * Fonte: `docs/ready-for-test-taiga-09-10-2026/plano-validacao-ready-for-test.md` Â§4.
 * EcrÃ£s: os 52 da Â§4.1 (`paginas/rotasPesquisa.ts`). Todos os casos sÃ£o sÃ³ de leitura: nenhum
 * formulÃ¡rio de gravaÃ§Ã£o Ã© submetido; na exportaÃ§Ã£o, os pedidos de escrita Ã  API ficam bloqueados
 * (exceto o `POST â€¦/exportar`).
 */

const PLANO = 'docs/ready-for-test-taiga-09-10-2026/plano-validacao-ready-for-test.md Â§4';
/** O Manual de PadrÃµes CCM nÃ£o tem entrada prÃ³pria em `requisitos.yaml`. */
const REQUISITOS = ['MANUAL-PADROES'];

/** Larguras "suportadas" usadas pelo plano (pendÃªncia P4), com a altura habitual de cada uma. */
const RESOLUCOES = [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1280, h: 800 },
  { w: 1024, h: 768 },
] as const;

function anotar(tipo: string, descricao: string): void {
  test.info().annotations.push({ type: tipo, description: descricao });
}
const naoAplicavel = (motivo: string) => anotar('nao-aplicavel', motivo);
const observar = (descricao: string) => anotar('observacao', descricao);

const metaTask = (caso: string, task: string, camada: 'front' | 'integracao', grupo?: GrupoPesquisa) =>
  meta({
    caso,
    requisitos: REQUISITOS,
    bug: task,
    suite: 'plano-de-testes',
    tipoTeste: 'interface',
    camada,
    area: grupo,
    plano: `${PLANO} â€” ${caso}`,
  });

/** Resumo de uma mediÃ§Ã£o para as mensagens das asserÃ§Ãµes. */
const resumoMedida = (m: MedidaFiltros) =>
  `bloco ${m.bloco.w}px, ${m.campos.length} campo(s), overflow do bloco ${m.overflowBloco}px`;

test.describe('PadrÃµes transversais â€” tarefas TASK-20260928 (Ready for test)', () => {
  // -------------------------------------------------------------------------------------------
  // TASK-20260928-01 (#1562) â€” filtros nÃ£o se sobrepÃµem em nenhuma resoluÃ§Ã£o suportada
  // -------------------------------------------------------------------------------------------
  test.describe('CT-REG-TASK-20260928-01 â€” Filtros sem sobreposiÃ§Ã£o em vÃ¡rias resoluÃ§Ãµes', () => {
    for (const ecra of ECRAS_PESQUISA) {
      test(
        `CT-REG-TASK-20260928-01 â€” Filtros sem sobreposiÃ§Ã£o a 1920/1366/1280/1024 px â€” ${nomeEcra(ecra)}`,
        metaTask('CT-REG-TASK-20260928-01', 'TASK-20260928-01', 'front', ecra.grupo),
        async ({ page }, testInfo) => {
          testInfo.setTimeout(240_000);
          for (const { w, h } of RESOLUCOES) {
            await test.step(`A ${w}Ã—${h} os campos de filtro nÃ£o se sobrepÃµem, os rÃ³tulos nÃ£o sÃ£o cortados e nÃ£o hÃ¡ scroll horizontal`, async () => {
              await page.setViewportSize({ width: w, height: h });
              await abrirEcraPesquisa(page, ecra.rota);
              const m = await medirFiltros(page);
              expect.soft(m.encontrado, `bloco de filtros encontrado em ${ecra.rota} a ${w}px (${m.motivo ?? ''})`).toBe(true);
              if (!m.encontrado) return;
              const contexto = `${ecra.rota} a ${w}px â€” ${resumoMedida(m)}`;
              expect.soft(m.sobreposicoes, `campos que se sobrepÃµem em ${contexto}`).toEqual([]);
              expect.soft(m.textosCortados, `rÃ³tulos/valores cortados em ${contexto}`).toEqual([]);
              expect.soft(m.foraDoBloco, `campos/botÃµes fora do bloco de filtros em ${contexto}`).toEqual([]);
              expect.soft(m.overflowPagina, `scroll horizontal da pÃ¡gina (px) em ${contexto}`).toBeLessThanOrEqual(1);
              if (m.placeholdersCortados.length > 0)
                observar(`${ecra.rota} a ${w}px â€” placeholder maior do que o campo: ${m.placeholdersCortados.join('; ')}`);
              const falhou =
                m.sobreposicoes.length + m.textosCortados.length + m.foraDoBloco.length > 0 || m.overflowPagina > 1;
              if (falhou) {
                await testInfo.attach(`filtros-${w}x${h}`, {
                  body: await blocoFiltros(page).screenshot(),
                  contentType: 'image/png',
                });
              }
            });
          }
        },
      );
    }
  });

  // -------------------------------------------------------------------------------------------
  // TASK-20260928-10 (#1570) â€” Exportar em todas as pÃ¡ginas com resultado de pesquisa
  // -------------------------------------------------------------------------------------------
  test.describe('CT-REG-TASK-20260928-10 â€” Exportar em todas as pÃ¡ginas com resultado de pesquisa', () => {
    /** Campo Â«NÃºmero da FacturaÂ» (e variantes: Â«N. facturaÂ», Â«NÂº FacturaÂ», Â«NÃºmero da FaturaÂ»). */
    const RE_CAMPO_FACTURA = /^(n[Ãºu]mero d[ao]|n\.|nÂº|n\.Âº)\s*fa(c)?tura$/i;

    /**
     * Pesquisa com a massa do ecrÃ£. Devolve a descriÃ§Ã£o da massa usada.
     *   - Dados de ReferÃªncia: o filtro de `telas.ts` (EFR pesquisa sem critÃ©rios);
     *   - Medicamentos â€º Facturas: `dados/massa.ts` (`AMBIENTE=dev` usa a de `qua`); se nÃ£o existir
     *     no dev, cai para a massa ampla;
     *   - restantes ecrÃ£s da Ãrea de PrestaÃ§Ã£o: massa ampla de dev â€” Â«NÃºmero da FacturaÂ» contÃ©m Â«1Â»
     *     (o dev tem facturas, ex. `SMK-MED-1`; confirmado na API a 13-10-2026);
     *   - ConferÃªncia e GestÃ£o de ArmazÃ©m: pesquisa por omissÃ£o (Pesquisar sem critÃ©rios).
     */
    async function pesquisarComMassa(page: Page, ecra: EcraPesquisa): Promise<string> {
      const conteudo = page.locator('.Traceability SuiteTemplate__content');
      const pesquisar = conteudo.getByRole('button', { name: BOTAO_PESQUISA }).first();
      if (ecra.telaDR) {
        const pag = new PaginaPesquisaDadosReferencia(page, ecra.telaDR);
        await pag.preencherFiltro();
        await pesquisar.click();
        const f = ecra.telaDR.filtros?.dev;
        return f ? `telas.ts: ${f.rotulo} = Â«${f.valor}Â»` : 'telas.ts: sem critÃ©rios';
      }
      if (ecra.grupo === 'area-prestacao') {
        const campo = conteudo.getByRole('textbox', { name: RE_CAMPO_FACTURA }).first();
        if (ecra.rota === '/medicamentos/factura') {
          const numero = massa().faturaPorNumero.numeroFatura;
          await campo.fill(numero);
          await pesquisar.click();
          const r = await esperarResultado(page);
          if (r.linhas > 0) return `dados/massa.ts: NÃºmero da Factura = Â«${numero}Â»`;
          observar(`A massa de dados/massa.ts (qua) Â«${numero}Â» nÃ£o existe no dev (${r.texto || '0 linhas'}); usada a massa ampla.`);
        }
        if ((await campo.count()) === 0) return 'sem massa (o ecrÃ£ nÃ£o tem campo Â«NÃºmero da FacturaÂ»)';
        await campo.fill('1');
        await pesquisar.click();
        return 'massa ampla de dev: NÃºmero da Factura contÃ©m Â«1Â»';
      }
      await pesquisar.click();
      return 'pesquisa por omissÃ£o (sem critÃ©rios)';
    }

    for (const ecra of ECRAS_PESQUISA) {
      test(
        `CT-REG-TASK-20260928-10 â€” Exportar descarrega o XLSX â€” ${nomeEcra(ecra)}`,
        metaTask('CT-REG-TASK-20260928-10', 'TASK-20260928-10', 'integracao', ecra.grupo),
        async ({ page }) => {
          test.setTimeout(420_000);
          const escritasBloqueadas = await bloquearEscritasExcetoExportar(page);
          const conteudo = page.locator('.Traceability SuiteTemplate__content');
          const exportar = conteudo.getByRole('button', { name: /^Exportar/ }).first();

          let temExportar = false;
          await test.step('O ecrÃ£ tem a aÃ§Ã£o Exportar', async () => {
            await abrirEcraPesquisa(page, ecra.rota);
            temExportar = (await exportar.count()) > 0;
            const temGrelha = (await conteudo.locator('table').count()) > 0;
            if (!temExportar) {
              anotar('sem-exportar', `${ecra.rota}${temGrelha ? '' : ' (sem grelha de resultados antes de pesquisar)'}`);
            }
            if (temGrelha) {
              expect.soft(temExportar, `botÃ£o Â«Exportar XLSXÂ» em ${ecra.rota} (hÃ¡ grelha de resultados)`).toBe(true);
            } else if (!temExportar) {
              naoAplicavel(`${ecra.rota}: sem grelha de resultados ao abrir; Exportar nÃ£o verificÃ¡vel sem resultado`);
            }
          });
          if (!temExportar) return;

          let linhas = 0;
          await test.step('Pesquisar com a massa do ecrÃ£ devolve linhas', async () => {
            const massaUsada = await pesquisarComMassa(page, ecra);
            const r = await esperarResultado(page);
            linhas = r.linhas;
            anotar('massa', `${ecra.rota}: ${massaUsada} â†’ ${r.linhas} linha(s)${r.linhas ? '' : ` (Â«${r.texto}Â»)`}`);
            if (linhas === 0) naoAplicavel(`download em ${ecra.rota}: sem linhas no dev com ${massaUsada} (Â«${r.texto}Â»)`);
          });
          if (linhas === 0) return;

          await test.step('Com resultados, Exportar estÃ¡ ativo e descarrega um ficheiro .xlsx', async () => {
            await expect.soft(exportar, `Exportar ativo em ${ecra.rota} depois de pesquisar`).toBeEnabled();
            const r = await exportarEsperarDownload(page);
            if (!r.download && /limite|20\.?000/i.test(r.aviso ?? '')) {
              naoAplicavel(`download em ${ecra.rota}: a pesquisa excede o limite de exportaÃ§Ã£o (Â«${r.aviso}Â»)`);
              return;
            }
            expect.soft(r.download, `download do XLSX em ${ecra.rota} â€” em vez dele: Â«${r.aviso ?? ''}Â»`).toBeTruthy();
            if (!r.download) return;
            const nome = r.download.suggestedFilename();
            expect.soft(nome, `nome do ficheiro exportado em ${ecra.rota}`).toMatch(/\.xlsx$/i);
            const caminho = await r.download.path();
            const tamanho = caminho ? (await stat(caminho)).size : 0;
            expect.soft(tamanho, `tamanho (bytes) de Â«${nome}Â» em ${ecra.rota}`).toBeGreaterThan(0);
            anotar('exportado', `${ecra.rota}: ${nome} (${tamanho} bytes, ${linhas} linha(s) na 1.Âª pÃ¡gina)`);
          });

          expect.soft(escritasBloqueadas, `pedidos de escrita bloqueados em ${ecra.rota} (o caso sÃ³ pode ler)`).toEqual([]);
        },
      );
    }
  });

  // -------------------------------------------------------------------------------------------
  // TASK-20260928-11 (#1571) â€” tÃ­tulos do menu lateral quebram a linha sem cortar
  // -------------------------------------------------------------------------------------------
  test.describe('CT-REG-TASK-20260928-11 â€” TÃ­tulos do menu lateral quebram a linha sem cortar', () => {
    for (const { w, h } of [RESOLUCOES[0], RESOLUCOES[1]]) {
      test(
        `CT-REG-TASK-20260928-11 â€” TÃ­tulos do menu lateral quebram a linha sem cortar a ${w}Ã—${h}`,
        metaTask('CT-REG-TASK-20260928-11', 'TASK-20260928-11', 'front'),
        async ({ page }) => {
          await page.setViewportSize({ width: w, height: h });
          await abrirRota(page, '/dados-referencia/convencoes');

          await test.step('Todos os grupos do menu lateral abrem (incluindo os de 2.Âº nÃ­vel)', async () => {
            const fechados = await abrirTodosOsGrupos(page);
            expect.soft(fechados, `grupos que ficaram fechados a ${w}px`).toEqual([]);
          });

          const medida = await medirTitulosMenu(page);
          const visiveis = medida.titulos.filter((t) => t.largura > 0 && t.altura > 0);

          await test.step('O menu estÃ¡ expandido e mostra os tÃ­tulos de todos os itens', async () => {
            expect.soft(medida.opened, `menu lateral expandido (.ccmsns-menu.opened) a ${w}px`).toBe(true);
            expect.soft(visiveis.length, `tÃ­tulos visÃ­veis no menu a ${w}px`).toBe(TITULOS_MENU.length);
          });

          await test.step('Nenhum tÃ­tulo com white-space: nowrap', async () => {
            const nowrap = visiveis.filter((t) => t.whiteSpace === 'nowrap').map((t) => t.texto);
            expect.soft(nowrap, `tÃ­tulos com white-space: nowrap a ${w}px`).toEqual([]);
          });

          await test.step('Nenhum tÃ­tulo cortado nem com reticÃªncias (o texto cabe na caixa: scrollWidth â‰¤ clientWidth e sem linhas escondidas)', async () => {
            const cortados = visiveis
              .filter((t) => t.scrollWidth > t.clientWidth + 1 || t.scrollHeight > t.clientHeight + 1)
              .map(
                (t) =>
                  `Â«${t.texto}Â» (precisa de ${Math.round(t.scrollHeight / t.alturaLinha)} linhas, mostra ${t.linhas}; ` +
                  `scroll ${t.scrollWidth}Ã—${t.scrollHeight} > cliente ${t.clientWidth}Ã—${t.clientHeight}; ` +
                  `text-overflow: ${t.textOverflow}; line-clamp: ${t.lineClamp || 'â€”'})`,
              );
            expect.soft(cortados, `tÃ­tulos cortados com reticÃªncias a ${w}px (menu com ${medida.larguraMenu}px)`).toEqual([]);
            const comEllipsis = visiveis.filter((t) => t.textOverflow === 'ellipsis').length;
            if (comEllipsis > 0) {
              observar(
                `A ${w}px, ${comEllipsis} de ${visiveis.length} tÃ­tulos tÃªm text-overflow: ellipsis e ` +
                  `-webkit-line-clamp: ${visiveis[0]?.lineClamp || 'â€”'} no estilo calculado (PR #71: limite de 2 linhas); ` +
                  'sÃ³ sÃ£o falha quando o texto nÃ£o cabe (passo anterior).',
              );
            }
          });

          await test.step('O texto de cada tÃ­tulo Ã© igual ao tÃ­tulo do menu (MainLayout.tsx)', async () => {
            const textos = visiveis.map((t) => semContador(t.texto));
            expect.soft(textos, `tÃ­tulos do menu a ${w}px comparados com o MainLayout.tsx`).toEqual([...TITULOS_MENU]);
            const truncadosNoTexto = textos.filter((t) => /(â€¦|\.\.\.)$/.test(t));
            expect.soft(truncadosNoTexto, 'tÃ­tulos com reticÃªncias no prÃ³prio texto').toEqual([]);
          });

          await test.step('Os tÃ­tulos longos citados no plano ocupam mais de uma linha quando nÃ£o cabem numa', async () => {
            const problemas: string[] = [];
            for (const titulo of TITULOS_LONGOS) {
              const t = visiveis.find((x) => x.texto === titulo);
              if (!t) {
                problemas.push(`Â«${titulo}Â» nÃ£o encontrado no menu`);
                continue;
              }
              const cabeNumaLinha = t.linhas <= 1 && t.scrollWidth <= t.clientWidth + 1 && t.scrollHeight <= t.clientHeight + 1;
              const quebrouSemCortar = t.linhas >= 2 && t.scrollHeight <= t.clientHeight + 1;
              if (!cabeNumaLinha && !quebrouSemCortar)
                problemas.push(`Â«${titulo}Â»: ${t.linhas} linha(s) visÃ­veis de ${Math.round(t.scrollHeight / t.alturaLinha)} necessÃ¡rias (altura ${t.altura}px)`);
              else observar(`Â«${titulo}Â» a ${w}px: ${t.linhas} linha(s), ${t.largura}Ã—${t.altura}px`);
            }
            expect.soft(problemas, `tÃ­tulos longos a ${w}px`).toEqual([]);
          });
        },
      );
    }
  });

  // -------------------------------------------------------------------------------------------
  // TASK-20260928-13 (#1574) â€” pesquisa com um sÃ³ campo: campo a 50% e botÃµes Ã  direita
  // -------------------------------------------------------------------------------------------
  test.describe('CT-REG-TASK-20260928-13 â€” Pesquisa com um sÃ³ campo: campo a 50% e botÃµes Ã  direita', () => {
    const grupos = [...new Set(ECRAS_PESQUISA.map((e) => e.grupo))];

    /** Verifica as trÃªs regras da tarefa numa mediÃ§Ã£o de um ecrÃ£ com um sÃ³ campo. */
    function verificarUmCampo(m: MedidaFiltros, contexto: string): void {
      const campo = m.campos[0];
      const proporcao = campo.caixa.w / m.bloco.w;
      expect
        .soft(Math.abs(proporcao - 0.5), `${contexto}: largura do campo Â«${campo.rotulo}Â» = ${campo.caixa.w}px de ${m.bloco.w}px (${(proporcao * 100).toFixed(1)}%; esperado 50% Â± 2%)`)
        .toBeLessThanOrEqual(0.02);
      const centroCampo = campo.controlo.y + campo.controlo.h / 2;
      const desalinhados = m.botoes
        .map((b) => ({ nome: b.nome, delta: b.caixa.y + b.caixa.h / 2 - centroCampo }))
        .filter((b) => Math.abs(b.delta) > 4)
        .map((b) => `Â«${b.nome}Â» ${b.delta > 0 ? '+' : ''}${b.delta.toFixed(1)}px`);
      expect.soft(desalinhados, `${contexto}: botÃµes fora da altura do campo (centro vertical Â± 4px)`).toEqual([]);
      const ultimo = m.botoes[m.botoes.length - 1];
      expect.soft(ultimo, `${contexto}: linha de botÃµes encontrada`).toBeTruthy();
      if (ultimo) {
        const folga = m.bloco.x + m.bloco.w - (ultimo.caixa.x + ultimo.caixa.w);
        expect
          .soft(Math.abs(folga), `${contexto}: distÃ¢ncia do botÃ£o Â«${ultimo.nome}Â» Ã  margem direita do bloco = ${folga.toFixed(1)}px (Â± 8px)`)
          .toBeLessThanOrEqual(8);
      }
    }

    for (const grupo of grupos) {
      test(
        `CT-REG-TASK-20260928-13 â€” Pesquisa com um sÃ³ campo: campo a 50% e botÃµes Ã  direita na mesma linha â€” ${NOME_GRUPO[grupo]}`,
        metaTask('CT-REG-TASK-20260928-13', 'TASK-20260928-13', 'front', grupo),
        async ({ page }, testInfo) => {
          testInfo.setTimeout(900_000);
          const detetados: EcraPesquisa[] = [];

          await test.step('Detetar os ecrÃ£s de pesquisa do grupo com um sÃ³ campo de filtro (a 1366Ã—768)', async () => {
            await page.setViewportSize({ width: 1366, height: 768 });
            const resumo: string[] = [];
            for (const ecra of ecrasDoGrupo(grupo)) {
              await abrirEcraPesquisa(page, ecra.rota);
              const m = await medirFiltros(page);
              resumo.push(`${ecra.rota}=${m.encontrado ? m.campos.length : '?'}`);
              if (m.encontrado && m.campos.length === 1) {
                detetados.push(ecra);
                anotar('um-so-campo', `${ecra.rota} (Â«${m.campos[0].rotulo}Â»)`);
              }
            }
            anotar('campos-por-ecra', resumo.join(', '));
            if (detetados.length === 0) naoAplicavel(`${NOME_GRUPO[grupo]}: nenhum ecrÃ£ de pesquisa com um sÃ³ campo`);
          });

          for (const ecra of detetados) {
            for (const { w, h } of [RESOLUCOES[0], RESOLUCOES[1]]) {
              await test.step(`${ecra.rota} a ${w}Ã—${h}: o campo ocupa 50% do bloco e os botÃµes ficam na mesma linha, encostados Ã  direita`, async () => {
                await page.setViewportSize({ width: w, height: h });
                await abrirEcraPesquisa(page, ecra.rota);
                const m = await medirFiltros(page);
                expect.soft(m.campos.length, `${ecra.rota} a ${w}px: nÂº de campos`).toBe(1);
                if (m.campos.length !== 1) return;
                const falhasAntes = testInfo.errors.length;
                verificarUmCampo(m, `${ecra.rota} a ${w}px`);
                if (testInfo.errors.length > falhasAntes) {
                  await testInfo.attach(`um-campo-${ecra.rota.replace(/\//g, '_')}-${w}`, {
                    body: await blocoFiltros(page).screenshot(),
                    contentType: 'image/png',
                  });
                }
              });
            }
          }
        },
      );
    }
  });
});

import { expect, test } from '../fixtures';
import { naoAplicavel } from '../../paginas/dadosReferencia/padraoUi';
import { PARAM, PesquisaConsulta, filtrosDoPedido, lerParam } from '../../paginas/pesquisaConsulta';
import { meta } from '../apoio';
import type { EcraConsulta } from './apoio-consulta';
import {
  PLANO_PADROES_PESQUISA,
  TAMANHOS_PADRAO,
  TAMANHO_INICIAL_PADRAO,
  base,
  configDe,
  ecrasComPadroes,
  garantirPagina2,
  metaPadrao,
  nomeCaso,
  pesquisarBase,
} from './padroes-pesquisa.apoio';

/**
 * Famílias D (resultados por página) e C (ordenação) do plano
 * `docs/padroes-pesquisa-consulta-16-10-2026/plano-padroes-pesquisa.md`, mais o quadro
 * comparativo entre ecrãs (UC-PAG-08).
 */

// --- D. Resultados por página -----------------------------------------------------------------

/** UC-PAG-01 — o seletor mostra exatamente 10 / 15 / 25 / 50. */
export function casoPagOpcoes(ecra: EcraConsulta): void {
  const caso = nomeCaso('PAG', '01', ecra);
  test(
    `${caso} — ${ecra.rotulo}: «Resultados por página» tem as opções ${TAMANHOS_PADRAO.join(' / ')}`,
    metaPadrao(ecra, caso, 'UC-PAG-01', { bug: 'TASK-20261015-12' }),
    async ({ page }) => {
      const pq = await base(page, ecra, 0, 'grelha sem paginação');
      if (!pq) return;
      const opcoes = await pq.opcoesTamanho();
      test.info().annotations.push({ type: 'observacao', description: `${ecra.rota}: opções ${opcoes.join(' / ')}` });
      expect.soft(opcoes, `${ecra.rota}: opções de «Resultados por página»`).toEqual(TAMANHOS_PADRAO);
    },
  );
}

/** UC-PAG-02 — a grelha abre com 25 por página. */
export function casoPagInicial(ecra: EcraConsulta): void {
  const caso = nomeCaso('PAG', '02', ecra);
  test(
    `${caso} — ${ecra.rotulo}: a grelha abre com ${TAMANHO_INICIAL_PADRAO} resultados por página`,
    metaPadrao(ecra, caso, 'UC-PAG-02', { bug: 'TASK-20261015-12' }),
    async ({ page }) => {
      const pq = await base(page, ecra, 0, 'grelha sem paginação');
      if (!pq) return;
      const atual = await pq.tamanhoAtual();
      const pedido = pq.ultimoPedido();
      const noPedido = pedido ? lerParam(pedido, PARAM.tamanho) : null;
      test.info().annotations.push({
        type: 'observacao',
        description: `${ecra.rota}: seletor mostra ${atual}; 1.º pedido ${noPedido ? `${noPedido.nome}=${noPedido.valor}` : 'sem tamanho'}`,
      });
      expect.soft(atual, `${ecra.rota}: tamanho mostrado no seletor ao abrir`).toBe(TAMANHO_INICIAL_PADRAO);
      expect.soft(Number(noPedido?.valor), `${ecra.rota}: tamanho pedido ao servidor na 1.ª pesquisa`).toBe(TAMANHO_INICIAL_PADRAO);
      const linhas = await pq.contarLinhas();
      const total = (await pq.total()) ?? linhas;
      expect.soft(linhas, `${ecra.rota}: nº de linhas na 1.ª página`).toBe(Math.min(atual, total));
    },
  );
}

/** UC-PAG-03 — cada opção mostra min(N, total) linhas, pede N ao servidor e não muda o total. */
export function casoPagCadaOpcao(ecra: EcraConsulta): void {
  const caso = nomeCaso('PAG', '03', ecra);
  test(
    `${caso} — ${ecra.rotulo}: cada opção de «Resultados por página» mostra o nº certo de linhas`,
    metaPadrao(ecra, caso, 'UC-PAG-03', { integracao: true }),
    async ({ page }) => {
      test.slow();
      const pq = await base(page, ecra, 10, 'sem registos para mais de uma página');
      if (!pq) return;
      const total = (await pq.total()) ?? 0;
      const opcoes = await pq.opcoesTamanho();
      const atual = await pq.tamanhoAtual();
      // A opção atual fica por último, para a escolha fazer sempre um pedido novo.
      for (const n of [...opcoes.filter((o) => o !== atual), ...opcoes.filter((o) => o === atual)]) {
        await test.step(`${n} por página`, async () => {
          const pedido = await pq.escolherTamanho(n);
          const tamanho = pedido ? lerParam(pedido, PARAM.tamanho) : null;
          expect.soft(tamanho?.valor, `${ecra.rota}: o pedido leva o tamanho ${n}`).toBe(String(n));
          await expect
            .configure({ soft: true })
            .poll(() => pq.contarLinhas(), { message: `${ecra.rota}: ${n} por página → ${Math.min(n, total)} linhas`, timeout: 10_000 })
            .toBe(Math.min(n, total));
          expect.soft(await pq.total(), `${ecra.rota}: o total não muda com o tamanho da página`).toBe(total);
          await expect.soft(pq.seletorTamanho(), `${ecra.rota}: o seletor mostra ${n}`).toHaveText(new RegExp(`^\\s*${n}\\s*$`));
        });
      }
    },
  );
}

/** UC-PAG-04 — mudar o tamanho na página 2 volta à 1.ª página. */
export function casoPagVoltaPrimeira(ecra: EcraConsulta): void {
  const caso = nomeCaso('PAG', '04', ecra);
  test(
    `${caso} — ${ecra.rotulo}: mudar o tamanho da página na página 2 volta à 1.ª página`,
    metaPadrao(ecra, caso, 'UC-PAG-04', { integracao: true }),
    async ({ page }) => {
      const pq = await base(page, ecra, 10, 'sem página 2');
      if (!pq) return;
      if (!(await garantirPagina2(pq, ecra))) return;
      const primeira = lerParam(pq.ultimoPedido()!, PARAM.pagina);
      const linhasPagina1 = await pq.textosLinhas();
      await pq.irParaPaginaSeguinte();
      const atual = await pq.tamanhoAtual();
      const outro = (await pq.opcoesTamanho()).find((n) => n !== atual)!;
      const pedido = await pq.escolherTamanho(outro);
      const pagina = pedido ? lerParam(pedido, PARAM.pagina) : null;
      expect.soft(pagina?.valor, `${ecra.rota}: o pedido com o novo tamanho pede a 1.ª página`).toBe(primeira?.valor);
      const agora = await pq.textosLinhas();
      expect
        .soft(agora[0], `${ecra.rota}: a 1.ª linha volta a ser a 1.ª linha da página 1`)
        .toBe(linhasPagina1[0]);
    },
  );
}

/** UC-PAG-05 — a página 2 é pedida ao servidor e tem registos diferentes da página 1. */
export function casoPagNavegacao(ecra: EcraConsulta): void {
  const caso = nomeCaso('PAG', '05', ecra);
  test(
    `${caso} — ${ecra.rotulo}: a página seguinte mostra outros registos`,
    metaPadrao(ecra, caso, 'UC-PAG-05', { integracao: true }),
    async ({ page }) => {
      const pq = await base(page, ecra, 10, 'sem página 2');
      if (!pq) return;
      if (!(await garantirPagina2(pq, ecra))) return;
      const p1 = lerParam(pq.ultimoPedido()!, PARAM.pagina);
      const linhas1 = await pq.textosLinhas();
      const pedido = await pq.irParaPaginaSeguinte();
      expect(pedido, `${ecra.rota}: a página seguinte é pedida ao servidor`).not.toBeNull();
      const p2 = lerParam(pedido!, PARAM.pagina);
      expect.soft(Number(p2?.valor), `${ecra.rota}: o pedido da página seguinte leva ${p1?.nome ?? 'pagina'}+1`).toBe(Number(p1?.valor ?? 0) + 1);
      const linhas2 = await pq.textosLinhas();
      expect.soft(linhas2.length, `${ecra.rota}: a página 2 tem linhas`).toBeGreaterThan(0);
      const repetidas = linhas2.filter((l) => linhas1.includes(l));
      expect.soft(repetidas, `${ecra.rota}: linhas da página 2 que já estavam na página 1`).toEqual([]);
    },
  );
}

/** UC-PAG-06 — página e tamanho no URL; recarregar mantém a pesquisa. */
export function casoPagUrl(ecra: EcraConsulta): void {
  const caso = nomeCaso('PAG', '06', ecra);
  test(
    `${caso} — ${ecra.rotulo}: página e tamanho ficam no URL e recarregar mantém a pesquisa`,
    metaPadrao(ecra, caso, 'UC-PAG-06', { bug: 'TASK-20261015-14' }),
    async ({ page }) => {
      const pq = await base(page, ecra, 0, 'sem registos');
      if (!pq) return;
      const url = new URL(page.url());
      const pagina = lerParam(url, PARAM.pagina);
      const tamanho = lerParam(url, PARAM.tamanho);
      test.info().annotations.push({ type: 'observacao', description: `${ecra.rota}: URL ${url.search}` });
      expect.soft(pagina, `${ecra.rota}: a página está no URL`).not.toBeNull();
      expect.soft(tamanho, `${ecra.rota}: o tamanho está no URL`).not.toBeNull();
      const linhas = await pq.textosLinhas();
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(pq.botaoPesquisar()).toBeVisible({ timeout: 60_000 });
      await pq.esperarGrelha();
      expect.soft(await pq.textosLinhas(), `${ecra.rota}: depois de recarregar, a grelha mostra as mesmas linhas`).toEqual(linhas);
      expect.soft(new URL(page.url()).search, `${ecra.rota}: o URL mantém-se ao recarregar`).toBe(url.search);
    },
  );
}

/** UC-PAG-07 — mudar de página ou de tamanho mantém os filtros no pedido. */
export function casoPagMantemFiltros(ecra: EcraConsulta): void {
  const caso = nomeCaso('PAG', '07', ecra);
  test(
    `${caso} — ${ecra.rotulo}: mudar de página ou de tamanho mantém os filtros da pesquisa`,
    metaPadrao(ecra, caso, 'UC-PAG-07', { integracao: true }),
    async ({ page }) => {
      const pq = await base(page, ecra, 10, 'sem página 2');
      if (!pq) return;
      const filtros = filtrosDoPedido(pq.ultimoPedido()!);
      expect(Object.keys(filtros).length, `${ecra.rota}: o pedido da pesquisa leva filtros`).toBeGreaterThan(0);
      if (await garantirPagina2(pq, ecra)) {
        const p = await pq.irParaPaginaSeguinte();
        expect.soft(p && filtrosDoPedido(p), `${ecra.rota}: filtros no pedido da página seguinte`).toEqual(filtros);
      }
      const atual = await pq.tamanhoAtual();
      const outro = (await pq.opcoesTamanho()).find((n) => n !== atual)!;
      const t = await pq.escolherTamanho(outro);
      expect.soft(t && filtrosDoPedido(t), `${ecra.rota}: filtros no pedido com o novo tamanho`).toEqual(filtros);
    },
  );
}

// --- C. Ordenação -----------------------------------------------------------------------------

/** Valores sem os vazios («—», «--», «»). */
const comValor = (v: string[]) => v.filter((x) => x !== '' && !/^[—–-]+$/.test(x));

function paraNumero(t: string): number | null {
  const s = t.replace(/[€%\s]/g, '');
  if (!/^-?[\d.]+(,\d+)?$/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = /,/.test(s) || /\.\d{3}(\.|$)/.test(s) ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s);
  return Number.isFinite(n) ? n : null;
}

function paraData(t: string): number | null {
  let m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(t);
  if (m) return Number(`${m[3]}${m[2]}${m[1]}`);
  m = /^(\d{2})\/(\d{4})$/.exec(t); // mm/aaaa
  if (m) return Number(`${m[2]}${m[1]}00`);
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return Number(`${m[1]}${m[2]}${m[3]}`);
  return null;
}

/** Compara pela natureza da coluna: data, número ou texto (pt-PT, sem distinguir maiúsculas). */
export function comparadorColuna(valores: string[]): { tipo: 'data' | 'numero' | 'texto'; cmp: (a: string, b: string) => number } {
  const v = comValor(valores);
  if (v.length > 0 && v.every((x) => paraData(x) !== null)) return { tipo: 'data', cmp: (a, b) => paraData(a)! - paraData(b)! };
  if (v.length > 0 && v.every((x) => paraNumero(x) !== null)) return { tipo: 'numero', cmp: (a, b) => paraNumero(a)! - paraNumero(b)! };
  return { tipo: 'texto', cmp: (a, b) => a.localeCompare(b, 'pt-PT', { sensitivity: 'base', numeric: true }) };
}

export function ordenadoPor(valores: string[], sentido: 'asc' | 'desc'): boolean {
  const v = comValor(valores);
  const { cmp } = comparadorColuna(v);
  return v.every((x, i) => i === 0 || (sentido === 'asc' ? cmp(v[i - 1], x) <= 0 : cmp(v[i - 1], x) >= 0));
}

/** A coluna tem pelo menos 2 valores diferentes (senão a ordem não é observável). */
const variada = (v: string[]) => new Set(comValor(v)).size > 1;

/** UC-ORD-01 / UC-ORD-07 — cada coluna com indicador ordena ascendente, no servidor. */
export function casoOrdTodasColunas(ecra: EcraConsulta): void {
  const caso = nomeCaso('ORD', '01', ecra);
  test(
    `${caso} — ${ecra.rotulo}: todas as colunas com indicador ordenam por clique no cabeçalho (servidor)`,
    metaPadrao(ecra, caso, 'UC-ORD-01', { integracao: true, bug: 'BUG-20261015-14' }),
    async ({ page }) => {
      test.setTimeout(600_000);
      const pq = await base(page, ecra, 1, 'sem registos para ordenar');
      if (!pq) return;
      const colunas = await pq.colunasOrdenaveis();
      expect(colunas.length, `${ecra.rota}: a grelha tem colunas ordenáveis`).toBeGreaterThan(0);
      const semPedido: string[] = [];
      const foraDeOrdem: string[] = [];
      const naoObservavel: string[] = [];
      for (const coluna of colunas) {
        await test.step(`«${coluna}» ordena ascendente`, async () => {
          const pedido = await pq.clicarCabecalho(coluna);
          const ordem = pedido ? lerParam(pedido, PARAM.ordem) : null;
          await expect.soft(pq.cabecalho(coluna), `«${coluna}»: aria-sort depois do 1.º clique`).toHaveAttribute('aria-sort', 'ascending');
          if (!ordem || !/,?asc$/i.test(ordem.valor)) semPedido.push(`${coluna}${ordem ? ` (${ordem.nome}=${ordem.valor})` : ''}`);
          const valores = await pq.valoresColuna(coluna);
          if (!variada(valores)) naoObservavel.push(coluna);
          else if (!ordenadoPor(valores, 'asc')) foraDeOrdem.push(`${coluna}: ${comValor(valores).slice(0, 6).join(' | ')}…`);
        });
      }
      if (naoObservavel.length > 0) {
        test.info().annotations.push({
          type: 'observacao',
          description: `${ecra.rota}: colunas com um só valor na página 1 (ordem não observável): ${naoObservavel.join(', ')}`,
        });
      }
      expect.soft(semPedido, `${ecra.rota}: colunas cujo clique não pede ao servidor a ordenação ascendente`).toEqual([]);
      expect.soft(foraDeOrdem, `${ecra.rota}: colunas que não ficam em ordem ascendente na página 1`).toEqual([]);
    },
  );
}

/** 1.ª coluna ordenável com valores variados na página 1 (ou a 1.ª ordenável). */
async function colunaDeTeste(pq: PesquisaConsulta, preferida?: string): Promise<string | null> {
  const colunas = await pq.colunasOrdenaveis();
  if (colunas.length === 0) return null;
  if (preferida && colunas.includes(preferida)) return preferida;
  for (const c of colunas) if (variada(await pq.valoresColuna(c))) return c;
  return colunas[0];
}

/** UC-ORD-02 — 2.º clique ordena descendente; 3.º repõe. */
export function casoOrdCicloCliques(ecra: EcraConsulta): void {
  const caso = nomeCaso('ORD', '02', ecra);
  test(
    `${caso} — ${ecra.rotulo}: 2.º clique ordena descendente e 3.º retira a ordenação`,
    metaPadrao(ecra, caso, 'UC-ORD-02', { integracao: true, bug: 'BUG-20261015-14' }),
    async ({ page }) => {
      const pq = await base(page, ecra, 1, 'sem registos para ordenar');
      if (!pq) return;
      const coluna = await colunaDeTeste(pq, configDe(ecra).colunaOrdenacao);
      if (!coluna) {
        naoAplicavel(`${ecra.rota}: a grelha não tem colunas ordenáveis`);
        return;
      }
      await test.step(`1.º clique em «${coluna}»: ascendente`, async () => {
        await pq.clicarCabecalho(coluna);
        await expect.soft(pq.cabecalho(coluna)).toHaveAttribute('aria-sort', 'ascending');
      });
      await test.step(`2.º clique em «${coluna}»: descendente, no servidor`, async () => {
        const pedido = await pq.clicarCabecalho(coluna);
        await expect.soft(pq.cabecalho(coluna)).toHaveAttribute('aria-sort', 'descending');
        const ordem = pedido ? lerParam(pedido, PARAM.ordem) : null;
        expect.soft(ordem?.valor ?? "", `«${coluna}»: o pedido leva a ordenação descendente`).toMatch(/desc$/i);
        const valores = await pq.valoresColuna(coluna);
        if (variada(valores)) expect.soft(ordenadoPor(valores, 'desc'), `«${coluna}» em ordem descendente (${comValor(valores).slice(0, 6).join(' | ')}…)`).toBe(true);
      });
      await test.step(`3.º clique em «${coluna}»: sem ordenação`, async () => {
        const pedido = await pq.clicarCabecalho(coluna);
        const aria = await pq.cabecalho(coluna).getAttribute('aria-sort');
        expect.soft(aria === null || aria === 'none', `«${coluna}»: aria-sort depois do 3.º clique ("${aria}")`).toBe(true);
        const ordem = pedido ? lerParam(pedido, PARAM.ordem) : null;
        expect.soft(ordem?.valor ?? '', `«${coluna}»: o pedido do 3.º clique já não leva ordenação desta coluna`).not.toMatch(/(asc|desc)$/i);
      });
    },
  );
}

/** UC-ORD-03 — a ordenação continua na página 2. */
export function casoOrdContinuidade(ecra: EcraConsulta): void {
  const caso = nomeCaso('ORD', '03', ecra);
  test(
    `${caso} — ${ecra.rotulo}: a ordenação continua na página seguinte`,
    metaPadrao(ecra, caso, 'UC-ORD-03', { integracao: true, bug: 'BUG-20261015-14' }),
    async ({ page }) => {
      const pq = await base(page, ecra, 10, 'sem página 2');
      if (!pq) return;
      const coluna = await colunaDeTeste(pq, configDe(ecra).colunaOrdenacao);
      if (!coluna) {
        naoAplicavel(`${ecra.rota}: a grelha não tem colunas ordenáveis`);
        return;
      }
      if (!(await garantirPagina2(pq, ecra))) return;
      await pq.clicarCabecalho(coluna);
      const p1 = await pq.valoresColuna(coluna);
      const pedido = await pq.irParaPaginaSeguinte();
      const ordem = pedido ? lerParam(pedido, PARAM.ordem) : null;
      expect.soft(ordem?.valor ?? "", `«${coluna}»: o pedido da página 2 mantém a ordenação`).toMatch(/asc$/i);
      const p2 = await pq.valoresColuna(coluna);
      expect
        .soft(ordenadoPor([...p1, ...p2], 'asc'), `«${coluna}»: a página 2 continua a ordem da página 1 (${comValor(p1).at(-1)} → ${comValor(p2)[0]})`)
        .toBe(true);
    },
  );
}

/** UC-ORD-04 — a coluna Estado ordena pela descrição. */
export function casoOrdEstado(ecra: EcraConsulta): void {
  const coluna = configDe(ecra).colunaEstado;
  if (!coluna) return;
  const caso = nomeCaso('ORD', '04', ecra);
  test(
    `${caso} — ${ecra.rotulo}: «${coluna}» ordena pela descrição do estado`,
    metaPadrao(ecra, caso, 'UC-ORD-04', { integracao: true, bug: 'BUG-20261015-14' }),
    async ({ page }) => {
      test.slow();
      const pq = await base(page, ecra, 1, 'sem registos para ordenar');
      if (!pq) return;
      if (!(await pq.colunasOrdenaveis()).includes(coluna)) {
        naoAplicavel(`${ecra.rota}: «${coluna}» não está na grelha como coluna ordenável`);
        return;
      }
      // Mais linhas → mais estados diferentes na página.
      const maior = Math.max(...(await pq.opcoesTamanho()));
      if (maior > (await pq.tamanhoAtual())) await pq.escolherTamanho(maior);
      await pq.clicarCabecalho(coluna);
      const valores = comValor(await pq.valoresColuna(coluna));
      if (new Set(valores).size < 2) {
        naoAplicavel(`${ecra.rota}: só um estado na página — ordem não observável`);
        return;
      }
      const alfabetica = [...valores].sort((a, b) => a.localeCompare(b, 'pt-PT', { sensitivity: 'base' }));
      expect.soft(valores, `«${coluna}» em ordem alfabética da descrição`).toEqual(alfabetica);
    },
  );
}

/** UC-ORD-05 — a ordenação mantém-se ao mudar de página e de tamanho. */
export function casoOrdMantem(ecra: EcraConsulta): void {
  const caso = nomeCaso('ORD', '05', ecra);
  test(
    `${caso} — ${ecra.rotulo}: a ordenação mantém-se ao mudar de página e de tamanho`,
    metaPadrao(ecra, caso, 'UC-ORD-05', { integracao: true, bug: 'BUG-20261015-14' }),
    async ({ page }) => {
      const pq = await base(page, ecra, 10, 'sem página 2');
      if (!pq) return;
      const coluna = await colunaDeTeste(pq, configDe(ecra).colunaOrdenacao);
      if (!coluna) {
        naoAplicavel(`${ecra.rota}: a grelha não tem colunas ordenáveis`);
        return;
      }
      if (!(await garantirPagina2(pq, ecra))) return;
      const pedidoOrdem = await pq.clicarCabecalho(coluna);
      const ordem = pedidoOrdem ? lerParam(pedidoOrdem, PARAM.ordem) : null;
      expect(ordem, `«${coluna}»: o clique pede a ordenação ao servidor`).not.toBeNull();
      if (await pq.temPaginaSeguinte()) {
        const p = await pq.irParaPaginaSeguinte();
        expect.soft(p && lerParam(p, PARAM.ordem)?.valor, `${ecra.rota}: ordenação no pedido da página seguinte`).toBe(ordem!.valor);
      }
      const atual = await pq.tamanhoAtual();
      const outro = (await pq.opcoesTamanho()).find((n) => n !== atual)!;
      const t = await pq.escolherTamanho(outro);
      expect.soft(t && lerParam(t, PARAM.ordem)?.valor, `${ecra.rota}: ordenação no pedido com o novo tamanho`).toBe(ordem!.valor);
      await expect.soft(pq.cabecalho(coluna), `«${coluna}» continua marcada como ordenada`).toHaveAttribute('aria-sort', 'ascending');
    },
  );
}

/** UC-ORD-06 — a ordenação fica no URL e mantém-se ao recarregar. */
export function casoOrdUrl(ecra: EcraConsulta): void {
  const caso = nomeCaso('ORD', '06', ecra);
  test(
    `${caso} — ${ecra.rotulo}: a ordenação fica no URL e mantém-se ao recarregar`,
    metaPadrao(ecra, caso, 'UC-ORD-06', { bug: 'TASK-20261015-14' }),
    async ({ page }) => {
      const pq = await base(page, ecra, 1, 'sem registos para ordenar');
      if (!pq) return;
      const coluna = await colunaDeTeste(pq, configDe(ecra).colunaOrdenacao);
      if (!coluna) {
        naoAplicavel(`${ecra.rota}: a grelha não tem colunas ordenáveis`);
        return;
      }
      await pq.clicarCabecalho(coluna);
      const url = new URL(page.url());
      const ordem = lerParam(url, PARAM.ordem);
      test.info().annotations.push({ type: 'observacao', description: `${ecra.rota}: URL depois de ordenar ${url.search}` });
      expect.soft(ordem, `${ecra.rota}: a ordenação está no URL (${PARAM.ordem.join(' ou ')})`).not.toBeNull();
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(pq.botaoPesquisar()).toBeVisible({ timeout: 60_000 });
      await pq.esperarGrelha();
      await expect.soft(pq.cabecalho(coluna), `«${coluna}» continua ordenada depois de recarregar`).toHaveAttribute('aria-sort', 'ascending');
    },
  );
}

// --- quadro comparativo (todos os ecrãs) ------------------------------------------------------

interface LinhaQuadro {
  ecra: string;
  opcoes: string;
  inicial: string;
  pagina: string;
  primeiraPagina: string;
  tamanho: string;
  ordem: string;
}

/**
 * UC-PAG-08 — percorre todos os ecrãs e monta o quadro de opções, valor inicial e nomes dos
 * parâmetros no URL; anexa-o ao relatório e falha se os ecrãs não forem todos iguais.
 */
export function casoQuadroComparativo(): void {
  const caso = 'CT-CON-PAG-08';
  test(
    `${caso} — Quadro comparativo da paginação e dos parâmetros no URL nos ${ecrasComPadroes().length} ecrãs`,
    meta({
      caso,
      requisitos: ['RF29'],
      plano: `${PLANO_PADROES_PESQUISA} — UC-PAG-08`,
      tipoTeste: 'caixa-preta',
      bug: 'TASK-20261015-12',
      tipo: 'positivo',
    }),
    async ({ page }) => {
      test.setTimeout(900_000);
      const linhas: LinhaQuadro[] = [];
      for (const ecra of ecrasComPadroes()) {
        await test.step(`${ecra.item} → ${ecra.rotulo}`, async () => {
          const cfg = configDe(ecra);
          const pq = new PesquisaConsulta(page, ecra.rota, cfg.endpoint);
          const nome = `${ecra.item} → ${ecra.rotulo}`;
          const r = await pesquisarBase(pq, cfg, 0).catch(() => null);
          if (!r) {
            linhas.push({ ecra: nome, opcoes: '(sem resultados)', inicial: '', pagina: '', primeiraPagina: '', tamanho: '', ordem: '' });
            return;
          }
          const url = new URL(page.url());
          const pagina = lerParam(url, PARAM.pagina);
          const tamanho = lerParam(url, PARAM.tamanho);
          const seletor = String(await pq.tamanhoAtual());
          const pedido = lerParam(pq.pedidos[0] ?? url, PARAM.tamanho)?.valor ?? '?';
          // O seletor pode não mostrar o tamanho em vigor (ex.: mostra 10 e pede 20).
          const inicial = seletor === pedido ? seletor : `${seletor} (pedido: ${pedido})`;
          const opcoes = (await pq.opcoesTamanho()).join('/');
          let ordem = '—';
          const coluna = (await pq.colunasOrdenaveis())[0];
          if (coluna) {
            await pq.clicarCabecalho(coluna, 3_000);
            ordem = lerParam(new URL(page.url()), PARAM.ordem)?.nome ?? '(fora do URL)';
          }
          linhas.push({
            ecra: nome,
            opcoes,
            inicial,
            pagina: pagina?.nome ?? '(fora do URL)',
            primeiraPagina: pagina?.valor ?? '',
            tamanho: tamanho?.nome ?? '(fora do URL)',
            ordem,
          });
        });
      }
      const md = [
        '| Ecrã | Opções | Abre com (seletor) | Parâmetro da página | 1.ª página | Parâmetro do tamanho | Parâmetro da ordenação |',
        '|---|---|---|---|---|---|---|',
        ...linhas.map((l) => `| ${l.ecra} | ${l.opcoes} | ${l.inicial} | ${l.pagina} | ${l.primeiraPagina} | ${l.tamanho} | ${l.ordem} |`),
      ].join('\n');
      await test.info().attach('quadro-paginacao-url.md', { body: md, contentType: 'text/markdown' });

      const distintos = (campo: keyof LinhaQuadro) => [...new Set(linhas.map((l) => l[campo]))];
      const padrao = TAMANHOS_PADRAO.join('/');
      expect.soft(linhas.filter((l) => l.opcoes !== padrao).map((l) => `${l.ecra}: ${l.opcoes}`), `ecrãs com opções diferentes de ${padrao}`).toEqual([]);
      expect
        .soft(linhas.filter((l) => l.inicial !== String(TAMANHO_INICIAL_PADRAO)).map((l) => `${l.ecra}: ${l.inicial}`), `ecrãs que não abrem com ${TAMANHO_INICIAL_PADRAO}`)
        .toEqual([]);
      for (const campo of ['pagina', 'primeiraPagina', 'tamanho', 'ordem'] as const) {
        expect.soft(distintos(campo), `valores diferentes entre ecrãs em «${campo}» (devia haver um só)`).toHaveLength(1);
      }
    },
  );
}

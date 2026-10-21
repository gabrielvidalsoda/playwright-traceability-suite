import { chromium } from '@playwright/test';
import type { FullConfig, FullResult, Reporter, Suite, TestCase } from '@playwright/test/reporter';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { estatistica, estatisticaPor, tempoDoCaso, type Estatistica, type TempoCaso } from './estatisticas';

/**
 * Reporter do relatório de execução — `relatorios/playwright/teste-<tipo>-<data>/`.
 *
 * Tem de vir DEPOIS do reporter `html` em `playwright.config.ts` (o Playwright chama o
 * `onEnd` dos reporters por ordem): quando corre, o `index.html` do Playwright já existe na
 * pasta. Então:
 *   - renomeia `index.html` → `teste-<tipo>-<data>.html` e deixa no lugar um `index.html`
 *     mínimo que redireciona para ele (para `playwright show-report <pasta>` continuar a abrir);
 *   - escreve `teste-<tipo>-<data>.md`  (resumo + casos + falhas, com data de geração);
 *   - escreve `teste-<tipo>-<data>.pdf` (o mesmo conteúdo, impresso pelo Chromium do Playwright).
 *
 * `<tipo>` e `<data>` vêm do nome da pasta, calculado uma só vez em `playwright.config.ts`.
 */

interface OpcoesReporter {
  /** Pasta da execução (a mesma `outputFolder` do reporter `html`). */
  pasta: string;
  /** Tipo de teste (camada: front | integracao | geral). */
  tipo: string;
}

type Estado = 'passou' | 'falhou' | 'instável' | 'ignorado' | 'não executado';

interface LinhaCaso {
  titulo: string;
  caminho: string;
  projeto: string;
  ficheiro: string;
  estado: Estado;
  duracaoMs: number;
  tentativas: number;
  erro?: string;
}

interface Dados {
  nome: string;
  tipo: string;
  ambiente: string;
  baseUrl: string;
  geradoEm: Date;
  inicio: Date;
  duracaoMs: number;
  resultado: string;
  lote?: string;
  casos: LinhaCaso[];
  tempos: {
    geral: Estatistica;
    porProjeto: Array<{ grupo: string } & Estatistica>;
    porFicheiro: Array<{ grupo: string } & Estatistica>;
    /** Os 10 casos mais lentos (última tentativa). */
    maisLentos: TempoCaso[];
  };
}

/** Remove codigos de cor ANSI (ESC[...m) de mensagens de erro do Playwright. */
function stripAnsi(texto: string | undefined): string {
  const re = new RegExp(String.fromCharCode(27) + '[[0-9;]*m', 'g');
  return (texto ?? '').replace(re, '');
}

function escaparHtml(valor: unknown): string {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Célula de tabela Markdown: sem quebras de linha nem `|`. */
function celulaMd(valor: string): string {
  return valor.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
}

/** Duração legível: 1234 → "1,2 s"; 83000 → "1 m 23 s". */
function fmtDuracao(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 60_000) return `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return `${m} m ${s} s`;
}

/** Data/hora local legível: "30-09-2026 14:35:12". */
function fmtDataHora(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  );
}

function estadoDoCaso(test: TestCase): Estado {
  if (test.results.length === 0) return 'não executado';
  switch (test.outcome()) {
    case 'expected':
      return 'passou';
    case 'flaky':
      return 'instável';
    case 'skipped':
      return 'ignorado';
    default:
      return 'falhou';
  }
}

const RESULTADO: Record<string, string> = {
  passed: 'passou',
  failed: 'falhou',
  timedout: 'tempo esgotado',
  interrupted: 'interrompido',
};

const ORDEM: Estado[] = ['falhou', 'instável', 'passou', 'ignorado', 'não executado'];

export default class ReporterExecucao implements Reporter {
  private readonly pasta: string;
  private readonly tipo: string;
  private suite?: Suite;
  private rootDir = process.cwd();
  private inicio = new Date();

  constructor(opcoes: OpcoesReporter) {
    this.pasta = path.resolve(process.cwd(), opcoes.pasta);
    this.tipo = opcoes.tipo;
  }

  printsToStdio(): boolean {
    return false;
  }

  onBegin(config: FullConfig, suite: Suite): void {
    this.rootDir = config.rootDir ?? process.cwd();
    this.suite = suite;
    this.inicio = new Date();
  }

  async onEnd(resultado: FullResult): Promise<void> {
    const testes = this.suite?.allTests() ?? [];
    // `--list` também chama onEnd — sem nenhum caso executado não há relatório a gerar.
    if (!testes.some((t) => t.results.length > 0)) return;

    const nome = path.basename(this.pasta);
    const tempos = testes.map((t) => tempoDoCaso(t, this.rootDir));
    const dados: Dados = {
      nome,
      tipo: this.tipo,
      ambiente: ['qua', 'dev'].includes(process.env.AMBIENTE ?? '')
        ? (process.env.AMBIENTE as string)
        : 'mock',
      baseUrl: process.env.BASE_URL ?? 'app local em modo mock',
      geradoEm: new Date(),
      inicio: resultado.startTime ?? this.inicio,
      duracaoMs: resultado.duration,
      resultado: RESULTADO[resultado.status] ?? resultado.status,
      lote: process.env.E2E_LOTE || undefined,
      tempos: {
        geral: estatistica(tempos),
        porProjeto: estatisticaPor(tempos, (c) => c.projeto),
        porFicheiro: estatisticaPor(tempos, (c) => c.ficheiro),
        maisLentos: tempos
          .filter((c) => c.estado !== 'ignorado' && c.estado !== 'não executado')
          .sort((a, b) => b.duracaoMs - a.duracaoMs)
          .slice(0, 10),
      },
      casos: testes
        .map((t) => this.linhaCaso(t))
        .sort((a, b) => ORDEM.indexOf(a.estado) - ORDEM.indexOf(b.estado)),
    };

    fs.mkdirSync(this.pasta, { recursive: true });

    // 1. HTML do Playwright → teste-<tipo>-<data>.html (+ index.html que redireciona).
    const indice = path.join(this.pasta, 'index.html');
    const html = path.join(this.pasta, `${nome}.html`);
    if (fs.existsSync(indice)) {
      fs.renameSync(indice, html);
      fs.writeFileSync(
        indice,
        `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${nome}.html">` +
          `<a href="${nome}.html">${nome}.html</a>\n`,
      );
    } else {
      console.warn(`[execução] não encontrei ${indice} — o reporter html correu antes deste?`);
    }

    // 2. Markdown.
    fs.writeFileSync(path.join(this.pasta, `${nome}.md`), this.renderMarkdown(dados));

    // 3. PDF (não deita a corrida abaixo se o Chromium não arrancar).
    const pdf = path.join(this.pasta, `${nome}.pdf`);
    try {
      const browser = await chromium.launch();
      try {
        const pagina = await browser.newPage();
        await pagina.setContent(this.renderHtml(dados), { waitUntil: 'load' });
        await pagina.pdf({
          path: pdf,
          format: 'A4',
          printBackground: true,
          margin: { top: '14mm', bottom: '16mm', left: '12mm', right: '12mm' },
          displayHeaderFooter: true,
          headerTemplate: '<span></span>',
          footerTemplate:
            `<div style="font-size:8px;width:100%;padding:0 12mm;color:#454e59;display:flex;justify-content:space-between">` +
            `<span>${escaparHtml(nome)} · gerado em ${escaparHtml(fmtDataHora(dados.geradoEm))}</span>` +
            `<span>pág. <span class="pageNumber"></span>/<span class="totalPages"></span></span></div>`,
        });
      } finally {
        await browser.close();
      }
    } catch (erro) {
      console.warn(`[execução] não consegui gerar o PDF: ${(erro as Error).message}`);
    }

    console.log(`[execução] ${path.relative(process.cwd(), this.pasta)}/${nome}.{html,md,pdf}`);
  }

  private linhaCaso(test: TestCase): LinhaCaso {
    const erroFinal = test.results
      .map((r) => stripAnsi(r.error?.message).trim())
      .filter(Boolean)
      .pop();
    const estado = estadoDoCaso(test);
    return {
      titulo: test.title,
      // titlePath: ['', projeto, ficheiro, ...describes, título] → só os describes.
      caminho: test.titlePath().slice(3, -1).join(' › '),
      projeto: test.parent.project()?.name ?? '',
      ficheiro: path.relative(process.cwd(), test.location.file).replace(/\\/g, '/'),
      estado,
      duracaoMs: test.results.reduce((t, r) => t + r.duration, 0),
      tentativas: test.results.length,
      erro: estado === 'falhou' || estado === 'instável' ? erroFinal : undefined,
    };
  }

  private contagens(dados: Dados): Record<Estado, number> {
    const c = Object.fromEntries(ORDEM.map((e) => [e, 0])) as Record<Estado, number>;
    for (const caso of dados.casos) c[caso.estado]++;
    return c;
  }

  // --------------------------------------------------------------------
  /** Tempos: geral, por browser, por ficheiro e casos mais lentos (última tentativa). */
  private linhasTempos(dados: Dados): { rotulo: string; e: Estatistica }[] {
    return [
      { rotulo: 'Todos os casos', e: dados.tempos.geral },
      ...dados.tempos.porProjeto.map((e) => ({ rotulo: `Browser: ${e.grupo}`, e })),
      ...dados.tempos.porFicheiro.map((e) => ({ rotulo: e.grupo, e })),
    ];
  }

  private temposMarkdown(dados: Dados): string {
    const linhas = this.linhasTempos(dados)
      .map(
        ({ rotulo, e }) =>
          `| ${celulaMd(rotulo)} | ${e.n} | ${fmtDuracao(e.mediaMs)} | ${fmtDuracao(e.medianaMs)} | ` +
          `${fmtDuracao(e.minMs)} | ${fmtDuracao(e.maxMs)} | ${fmtDuracao(e.somaMs)} |`,
      )
      .join('\n');
    const lentos = dados.tempos.maisLentos
      .map((c) => `| ${fmtDuracao(c.duracaoMs)} | ${celulaMd(c.titulo)} | ${c.projeto} | ${c.estado} |`)
      .join('\n');
    return `## Tempos

Duração da última tentativa de cada caso executado (ignorados fora). A duração da corrida
(acima) é tempo de relógio: inclui o arranque da app e corre casos em paralelo.

| Grupo | Casos | Média | Mediana | Mín. | Máx. | Soma |
|---|---|---|---|---|---|---|
${linhas}

### 10 casos mais lentos

| Duração | Caso | Browser | Estado |
|---|---|---|---|
${lentos}
`;
  }

  private temposHtml(dados: Dados): string {
    const linhas = this.linhasTempos(dados)
      .map(
        ({ rotulo, e }, i) => `<tr${i === 0 ? ' style="font-weight:700"' : ''}>
        <td class="${rotulo.includes('/') ? 'mono sub' : ''}">${escaparHtml(rotulo)}</td><td class="num">${e.n}</td>
        <td class="num">${fmtDuracao(e.mediaMs)}</td><td class="num">${fmtDuracao(e.medianaMs)}</td>
        <td class="num">${fmtDuracao(e.minMs)}</td><td class="num">${fmtDuracao(e.maxMs)}</td>
        <td class="num">${fmtDuracao(e.somaMs)}</td></tr>`,
      )
      .join('\n');
    const lentos = dados.tempos.maisLentos
      .map(
        (c) => `<tr><td class="num">${fmtDuracao(c.duracaoMs)}</td><td>${escaparHtml(c.titulo)}</td>
        <td>${escaparHtml(c.projeto)}</td><td>${escaparHtml(c.estado)}</td></tr>`,
      )
      .join('\n');
    return `<h2>Tempos</h2>
  <p class="sub">Duração da última tentativa de cada caso executado (ignorados fora). A duração da
  corrida é tempo de relógio: inclui o arranque da app e corre casos em paralelo.</p>
  <table>
    <thead><tr><th>Grupo</th><th>Casos</th><th>Média</th><th>Mediana</th><th>Mín.</th><th>Máx.</th><th>Soma</th></tr></thead>
    <tbody>${linhas}</tbody>
  </table>
  <h3 style="margin-top:12px">10 casos mais lentos</h3>
  <table>
    <thead><tr><th>Duração</th><th>Caso</th><th>Browser</th><th>Estado</th></tr></thead>
    <tbody>${lentos}</tbody>
  </table>`;
  }

  // --------------------------------------------------------------------
  private renderMarkdown(dados: Dados): string {
    const c = this.contagens(dados);
    const linhas = dados.casos
      .map(
        (x) =>
          `| ${x.estado} | ${celulaMd(x.titulo)} | ${celulaMd(x.caminho || '—')} | ${x.projeto} | ` +
          `${fmtDuracao(x.duracaoMs)} | ${x.tentativas} | ${x.ficheiro} |`,
      )
      .join('\n');
    const falhas = dados.casos
      .filter((x) => x.erro)
      .map((x) => `### ${x.titulo} (${x.estado})\n\n\`${x.ficheiro}\`\n\n\`\`\`\n${x.erro}\n\`\`\``)
      .join('\n\n');

    return `# Relatório de execução — ${dados.nome}

| | |
|---|---|
| **Id da execução** | \`${dados.nome}\`${dados.lote ? ` (lote \`${dados.lote}\`)` : ''} |
| **Gerado em** | ${fmtDataHora(dados.geradoEm)} |
| **Tipo** | ${dados.tipo} |
| **Ambiente** | ${dados.ambiente} (${dados.baseUrl}) |
| **Início da execução** | ${fmtDataHora(dados.inicio)} |
| **Duração** | ${fmtDuracao(dados.duracaoMs)} |
| **Resultado** | **${dados.resultado}** |
| **Relatório HTML** | [${dados.nome}.html](${dados.nome}.html) |
| **Falhas (passos para reproduzir)** | [falhas-${dados.nome}.md](falhas-${dados.nome}.md) |

## Resumo

| Passou | Falhou | Instável | Ignorado | Não executado | Total |
|---|---|---|---|---|---|
| ${c['passou']} | ${c['falhou']} | ${c['instável']} | ${c['ignorado']} | ${c['não executado']} | ${dados.casos.length} |

${this.temposMarkdown(dados)}
## Casos

| Estado | Caso | Secção | Browser | Duração | Tentativas | Ficheiro |
|---|---|---|---|---|---|---|
${linhas}
${falhas ? `\n## Falhas\n\n${falhas}\n` : ''}`;
  }

  // --------------------------------------------------------------------
  private renderHtml(dados: Dados): string {
    const c = this.contagens(dados);
    const cor: Record<Estado, string> = {
      passou: '#14532d',
      falhou: '#991b1b',
      instável: '#312e81',
      ignorado: '#3a4351',
      'não executado': '#3a4351',
    };
    const linhas = dados.casos
      .map(
        (x) => `<tr>
        <td><b style="color:${cor[x.estado]}">${escaparHtml(x.estado)}</b></td>
        <td>${escaparHtml(x.titulo)}<div class="sub">${escaparHtml(x.caminho)}</div></td>
        <td>${escaparHtml(x.projeto)}</td>
        <td class="num">${escaparHtml(fmtDuracao(x.duracaoMs))}</td>
        <td class="num">${x.tentativas}</td>
        <td class="mono sub">${escaparHtml(x.ficheiro)}</td>
      </tr>`,
      )
      .join('\n');
    const falhas = dados.casos
      .filter((x) => x.erro)
      .map(
        (x) => `<section class="falha">
        <h3>${escaparHtml(x.titulo)} <span class="sub">(${escaparHtml(x.estado)})</span></h3>
        <div class="mono sub">${escaparHtml(x.ficheiro)}</div>
        <pre>${escaparHtml(x.erro)}</pre></section>`,
      )
      .join('\n');
    const caixa = (n: number, rotulo: string, cr = '#0f1216') =>
      `<div><b style="color:${cr}">${n}</b>${escaparHtml(rotulo)}</div>`;

    return `<!doctype html>
<html lang="pt-PT"><head><meta charset="utf-8">
<title>${escaparHtml(dados.nome)}</title>
<style>
  * { box-sizing: border-box; }
  body { font: 11.5px/1.5 system-ui, -apple-system, Segoe UI, sans-serif; color: #14181d; margin: 0; }
  h1 { font-size: 18px; margin: 0 0 8px; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .05em; margin: 20px 0 8px;
       border-bottom: 2px solid #c9d1da; padding-bottom: 4px; }
  h3 { font-size: 12px; margin: 0 0 2px; }
  .sub { color: #454e59; font-size: 10px; }
  .mono { font-family: ui-monospace, Consolas, Menlo, monospace; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #c2cbd4; padding: 4px 6px; text-align: left; vertical-align: top; }
  th { background: #e7ebef; }
  tr { break-inside: avoid; }
  td.num { white-space: nowrap; text-align: right; }
  table.meta td:first-child { font-weight: 700; width: 170px; background: #f4f6f8; }
  .resumo { display: flex; gap: 8px; margin: 10px 0; }
  .resumo div { border: 1px solid #c9d1da; background: #f4f6f8; border-radius: 6px; padding: 6px 12px; }
  .resumo b { display: block; font-size: 16px; }
  .falha { border: 1px solid #e79b93; border-left: 4px solid #991b1b; border-radius: 6px;
           padding: 8px 10px; margin: 8px 0; break-inside: avoid; }
  pre { white-space: pre-wrap; word-break: break-word; font-size: 9.5px; background: #fbe4e1;
        color: #7f1d1d; padding: 6px; border-radius: 4px; margin: 6px 0 0; }
</style></head>
<body>
  <h1>Relatório de execução — ${escaparHtml(dados.nome)}</h1>
  <table class="meta">
    <tr><td>Id da execução</td><td class="mono">${escaparHtml(dados.nome)}${dados.lote ? ` <span class="sub">(lote ${escaparHtml(dados.lote)})</span>` : ''}</td></tr>
    <tr><td>Gerado em</td><td>${escaparHtml(fmtDataHora(dados.geradoEm))}</td></tr>
    <tr><td>Tipo</td><td>${escaparHtml(dados.tipo)}</td></tr>
    <tr><td>Ambiente</td><td>${escaparHtml(dados.ambiente)} <span class="sub">(${escaparHtml(dados.baseUrl)})</span></td></tr>
    <tr><td>Início da execução</td><td>${escaparHtml(fmtDataHora(dados.inicio))}</td></tr>
    <tr><td>Duração</td><td>${escaparHtml(fmtDuracao(dados.duracaoMs))}</td></tr>
    <tr><td>Resultado</td><td><b>${escaparHtml(dados.resultado)}</b></td></tr>
    <tr><td>Relatório HTML</td><td class="mono">${escaparHtml(dados.nome)}.html</td></tr>
  </table>

  <h2>Resumo</h2>
  <div class="resumo">
    ${caixa(c['passou'], 'passou', cor.passou)}
    ${caixa(c['falhou'], 'falhou', c['falhou'] ? cor.falhou : undefined)}
    ${caixa(c['instável'], 'instável', cor['instável'])}
    ${caixa(c['ignorado'], 'ignorado', cor.ignorado)}
    ${caixa(c['não executado'], 'não executado', cor.ignorado)}
    ${caixa(dados.casos.length, 'total')}
  </div>

  ${this.temposHtml(dados)}

  <h2>Casos</h2>
  <table>
    <thead><tr><th>Estado</th><th>Caso</th><th>Browser</th><th>Duração</th><th>Tent.</th><th>Ficheiro</th></tr></thead>
    <tbody>${linhas}</tbody>
  </table>
  ${falhas ? `<h2>Falhas</h2>${falhas}` : ''}
</body></html>`;
  }
}

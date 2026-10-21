import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestError,
  TestResult,
  TestStep,
} from '@playwright/test/reporter';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Reporter do **relatório de falhas** — `relatorios/playwright/<id>/falhas-<id>.md`.
 *
 * Só olha para os casos que falharam ou ficaram instáveis (passaram no retry) e, para cada um,
 * escreve a tabela usada nos relatórios de bugs do QA:
 *
 *   | # | Passo | Resultado esperado | Resultado do teste |
 *
 * As linhas vêm dos `test.step` do caso (e das ações Playwright dentro deles — abrir, clicar,
 * preencher…), por isso os títulos dos steps devem descrever o comportamento esperado
 * (ex. "Tudo alinhado à esquerda") e as asserções devem levar mensagem própria
 * (`expect.soft(x, 'linhas em ordem ascendente (…)')`) — é o que aparece nas colunas
 * "Resultado esperado" e "Resultado do teste".
 *
 * As evidências (captura, error-context, trace) são copiadas para `evidencias/<caso>/` na
 * mesma pasta, porque `relatorios/<camada>/artefactos/` é apagado na corrida seguinte.
 * A classificação (defeito da aplicação × falha da suíte/massa × instabilidade) e o ID
 * `BUG-AAAAMMDD-NN` ficam por preencher: é a triagem do QA antes de levar ao Taiga.
 */

interface OpcoesReporter {
  /** Pasta da execução (a mesma `outputFolder` do reporter `html`). */
  pasta: string;
  /** Tipo de teste (camada: front | integracao | geral). */
  tipo: string;
}

interface Linha {
  passo: string;
  esperado: string;
  resultado: string;
  falhou: boolean;
}

interface Falha {
  caso: string;
  titulo: string;
  caminho: string;
  estado: 'falhou' | 'instável';
  ficheiro: string;
  rota?: string;
  requisito?: string;
  plano?: string;
  tentativas: string;
  anotacoes: string[];
  linhas: Linha[];
  erro: string;
  evidencias: { rotulo: string; ficheiro: string }[];
}

/** Anotações que já aparecem noutros campos (ou são só metadados da suíte). */
const ANOTACOES_METADADOS = new Set(['caso', 'requisito', 'tipo-teste', 'camada', 'plano', 'massa', 'slow']);

/** Ações Playwright que contam como passo de reprodução (o resto — esperas, leituras — é ruído). */
const ACOES: [RegExp, string][] = [
  [/^Navigate\b/, 'Abrir'],
  [/^Reload\b/, 'Recarregar a página'],
  [/^Go back\b/, 'Voltar (navegador)'],
  [/^Go forward\b/, 'Avançar (navegador)'],
  [/^Double click\b/, 'Duplo clique em'],
  [/^Click\b/, 'Clicar em'],
  [/^Tap\b/, 'Tocar em'],
  [/^Fill\b/, 'Preencher'],
  [/^Clear\b/, 'Limpar'],
  [/^Press\b/, 'Premir'],
  [/^Type\b/, 'Escrever'],
  [/^Select\b/, 'Selecionar'],
  [/^Check\b/, 'Marcar'],
  [/^Uncheck\b/, 'Desmarcar'],
  [/^Set input files\b/, 'Carregar ficheiro em'],
  [/^Drag\b/, 'Arrastar'],
];

function stripAnsi(texto: string | undefined): string {
  const re = new RegExp(String.fromCharCode(27) + '[[0-9;]*m', 'g');
  return (texto ?? '').replace(re, '');
}

/** Célula de tabela Markdown: sem quebras de linha nem `|`. */
function celulaMd(valor: string): string {
  return valor.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
}

function truncar(texto: string, max: number): string {
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto;
}

/** Link Markdown relativo, com espaços e caracteres especiais codificados. */
function linkMd(rotulo: string, destino: string): string {
  return `[${rotulo}](${destino.split('/').map(encodeURIComponent).join('/')})`;
}

/** `getByRole('button', { name: 'Pesquisar' })` → `"Pesquisar"`; senão o locator encurtado. */
function alvoLegivel(subtitulo: string | undefined): string {
  if (!subtitulo) return '';
  const nome =
    /name: ['"]([^'"]+)['"]/.exec(subtitulo) ??
    /getBy(?:Text|Label|Placeholder|Title|AltText|TestId)\(['"]([^'"]+)['"]/.exec(subtitulo);
  return nome ? `"${nome[1]}"` : `\`${truncar(subtitulo, 70)}\``;
}

function descreverAcao(step: TestStep): string | undefined {
  const acao = ACOES.find(([re]) => re.test(step.title));
  if (!acao) return undefined;
  const [re, verbo] = acao;
  // Parte do título depois do verbo (ex. o valor em `Fill "00"`, a tecla em `Press "Enter"`).
  const resto = step.title.replace(re, '').trim();
  if (verbo === 'Abrir') return `Abrir \`${step.subtitle ?? resto}\``;
  const alvo = alvoLegivel(step.subtitle);
  if (verbo === 'Preencher' || verbo === 'Escrever' || verbo === 'Selecionar')
    return `${verbo} ${alvo || 'campo'} = ${resto || '""'}`;
  if (verbo === 'Premir') return `Premir ${resto}${alvo ? ` em ${alvo}` : ''}`;
  return `${verbo} ${alvo || resto}`.trim();
}

/** Asserção com mensagem própria (o título deixa de ser `Expect "…"`). */
function expectativaLegivel(step: TestStep): string | undefined {
  if (step.category !== 'expect') return undefined;
  if (/^Expect "/.test(step.title)) return undefined;
  return step.title;
}

/** Resumo de um erro do Playwright: 1.ª linha + Locator/Expected/Received, sem stack. */
function resumoErro(erro: TestError | undefined): string {
  const linhas = stripAnsi(erro?.message)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (linhas.length === 0) return '';
  const primeira = linhas[0].replace(/^Error:\s*/, '');
  const extra = linhas
    .slice(1)
    .filter((l) => /^(Locator|Expected|Received|Timeout|Error):/.test(l))
    .filter((l) => !l.includes(primeira))
    // "Expected: true · Received: false" não acrescenta nada à mensagem da asserção.
    .filter((l) => !/^(Expected|Received):\s*(true|false)$/.test(l))
    .slice(0, 3);
  // Diff de toEqual (`+   "valor",`): mostra os primeiros valores recebidos.
  const recebidos = linhas.filter((l) => /^\+\s+\S/.test(l) && !/^\+ Received/.test(l)).map((l) => l.replace(/^\+\s+|,$/g, ''));
  const valores = recebidos.filter((v) => v !== 'Array [' && v !== ']' && v !== 'Object {' && v !== '}');
  if (valores.length > 0) {
    const unicos = [...new Set(valores)];
    extra.push(`Recebido: ${unicos.slice(0, 3).join(', ')}${valores.length > 3 ? ` (${valores.length} itens)` : ''}`);
  }
  return truncar([primeira, ...extra].join(' · '), 400);
}

function descendentes(step: TestStep): TestStep[] {
  return step.steps.flatMap((s) => [s, ...descendentes(s)]);
}

/**
 * Linha da tabela para um bloco de steps: um `test.step` folha (`titulo`) ou ações soltas
 * (sem `titulo`). `caminho` são os `test.step` pais.
 *   - Com ações: Passo = caminho › título + ações; Esperado = asserções com mensagem própria.
 *   - Só verificações: Passo = caminho; Esperado = título do step (na suíte, os títulos dos
 *     steps de verificação descrevem o comportamento esperado).
 */
function linhaDoBloco(
  caminho: string[],
  titulo: string | undefined,
  steps: TestStep[],
  erroProprio?: TestError,
): Linha | undefined {
  const todos = steps.flatMap((s) => [s, ...descendentes(s)]);
  const acoes = todos.map(descreverAcao).filter((a): a is string => !!a);
  const esperados = [...new Set(todos.map(expectativaLegivel).filter((e): e is string => !!e))].map((e) =>
    // Tira listas de valores do fim da mensagem ("… (5850466 | 5850474 | …)") — vão para o resultado.
    truncar(e.replace(/\s*\([^)]{40,}\)$/, ''), 160),
  );
  const erros = [...new Set(todos.filter((s) => s.error && s.steps.every((f) => !f.error)).map((s) => resumoErro(s.error)))]
    .filter(Boolean);
  if (erros.length === 0 && erroProprio) erros.push(resumoErro(erroProprio));

  // Bloco só com esperas/leituras internas, sem nada que ajude a reproduzir: não entra.
  if (!titulo && acoes.length === 0 && esperados.length === 0 && erros.length === 0) return undefined;

  let passo: string;
  let esperado: string;
  if (acoes.length > 0) {
    const nome = [...caminho, ...(titulo ? [titulo] : [])].join(' › ');
    passo = [nome ? `**${nome}**` : '', acoes.join('; ')].filter(Boolean).join('<br>');
    esperado = esperados.length > 0 ? esperados.join('; ') : 'Passo concluído sem erro';
  } else {
    passo = caminho.length > 0 ? `**${caminho.join(' › ')}**` : 'Verificação';
    esperado = titulo ?? (esperados.join('; ') || 'Verificações sem erro');
  }
  return {
    passo: celulaMd(passo),
    esperado: celulaMd(esperado),
    resultado: celulaMd(erros.length > 0 ? `❌ ${erros.join(' / ')}` : '✅ OK'),
    falhou: erros.length > 0,
  };
}

/** Percorre a árvore de steps e devolve uma linha por `test.step` folha (+ ações soltas). */
function linhasDosSteps(steps: TestStep[], prefixo: string[] = []): Linha[] {
  const linhas: Linha[] = [];
  let soltos: TestStep[] = [];
  const despejar = () => {
    const l = soltos.length > 0 ? linhaDoBloco(prefixo, undefined, soltos) : undefined;
    if (l && (prefixo.length === 0 || l.falhou || soltos.some(descreverAcao))) linhas.push(l);
    soltos = [];
  };
  for (const s of steps) {
    if (s.category === 'fixture' || s.category === 'test.attach' || s.category === 'attach') continue;
    if (s.category === 'hook') {
      despejar();
      linhas.push(...linhasDosSteps(s.steps, prefixo));
    } else if (s.category === 'test.step') {
      despejar();
      const filhosStep = s.steps.some((f) => f.category === 'test.step');
      if (filhosStep) {
        linhas.push(...linhasDosSteps(s.steps, [...prefixo, s.title]));
      } else {
        const l = linhaDoBloco(prefixo, s.title, s.steps, s.error);
        if (l) linhas.push(l);
      }
    } else {
      soltos.push(s);
    }
  }
  despejar();
  return linhas;
}

function estadoDoCaso(test: TestCase): 'falhou' | 'instável' | undefined {
  const o = test.outcome();
  if (o === 'flaky') return 'instável';
  if (o === 'unexpected') return 'falhou';
  return undefined;
}

function slug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export default class ReporterFalhas implements Reporter {
  private readonly pasta: string;
  private readonly tipo: string;
  private suite?: Suite;
  private baseUrl = '';

  constructor(opcoes: OpcoesReporter) {
    this.pasta = path.resolve(process.cwd(), opcoes.pasta);
    this.tipo = opcoes.tipo;
  }

  printsToStdio(): boolean {
    return false;
  }

  onBegin(config: FullConfig, suite: Suite): void {
    this.suite = suite;
    this.baseUrl = String(config.projects[0]?.use?.baseURL ?? process.env.BASE_URL ?? '');
  }

  onEnd(resultado: FullResult): void {
    const testes = this.suite?.allTests() ?? [];
    // `--list` também chama onEnd — sem nenhum caso executado não há relatório a gerar.
    if (!testes.some((t) => t.results.length > 0)) return;

    fs.mkdirSync(this.pasta, { recursive: true });
    const falhas = testes.filter((t) => estadoDoCaso(t)).map((t) => this.falha(t));
    const nome = path.basename(this.pasta);
    const destino = path.join(this.pasta, `falhas-${nome}.md`);
    fs.writeFileSync(destino, this.renderMarkdown(nome, testes, falhas, resultado));
    console.log(`[falhas] ${path.relative(process.cwd(), destino)} (${falhas.length} caso(s))`);
  }

  private falha(test: TestCase): Falha {
    const estado = estadoDoCaso(test)!;
    const anot = (tipo: string) => test.annotations.find((a) => a.type === tipo)?.description;
    // Instável: a tentativa que falhou; falhou: a última (a que decide o resultado).
    const tentativa: TestResult =
      estado === 'instável'
        ? test.results.find((r) => r.status !== 'passed' && r.status !== 'skipped')!
        : test.results[test.results.length - 1];
    const falhadas = test.results.filter((r) => r.status !== 'passed' && r.status !== 'skipped').length;

    const linhas = linhasDosSteps(tentativa.steps);
    const erroTeste = tentativa.errors.map(resumoErro).filter(Boolean);
    if (!linhas.some((l) => l.falhou) && erroTeste.length > 0) {
      linhas.push({
        passo: 'Fim do teste',
        esperado: 'O caso termina sem erros',
        resultado: celulaMd(`❌ ${erroTeste.join(' / ')}`),
        falhou: true,
      });
    }
    const rota = tentativa.steps
      .flatMap((s) => [s, ...descendentes(s)])
      .find((s) => /^Navigate\b/.test(s.title))?.subtitle;

    const caso = anot('caso') ?? test.tags.find((t) => /^@CT-/.test(t))?.slice(1) ?? test.title.split(' — ')[0];
    return {
      caso,
      titulo: test.title,
      // titlePath: ['', projeto, ficheiro, ...describes, título] → só os describes.
      caminho: test.titlePath().slice(3, -1).join(' › '),
      estado,
      ficheiro: `${path.relative(process.cwd(), test.location.file).replace(/\\/g, '/')}:${test.location.line}`,
      rota,
      requisito: anot('requisito'),
      plano: anot('plano'),
      tentativas: `${falhadas} de ${test.results.length} tentativa(s) falharam`,
      anotacoes: test.annotations
        .filter((a) => !ANOTACOES_METADADOS.has(a.type) && a.description)
        .map((a) => `${a.type}: ${a.description}`)
        .filter((a, i, todas) => todas.indexOf(a) === i),
      linhas,
      erro: stripAnsi(tentativa.error?.message ?? tentativa.errors[0]?.message ?? '')
        .split(/\r?\n/)
        .slice(0, 25)
        .join('\n')
        .trim(),
      evidencias: this.copiarEvidencias(test, caso),
    };
  }

  /** Copia capturas, error-context e trace de todas as tentativas para `evidencias/<caso>/`. */
  private copiarEvidencias(test: TestCase, caso: string): { rotulo: string; ficheiro: string }[] {
    const pasta = path.join(this.pasta, 'evidencias', slug(`${caso}-${test.parent.project()?.name ?? ''}`));
    const copiadas: { rotulo: string; ficheiro: string }[] = [];
    test.results.forEach((r, i) => {
      for (const a of r.attachments) {
        if (!a.path || !fs.existsSync(a.path)) continue;
        const ext = path.extname(a.path);
        const base = `tentativa${i + 1}-${slug(a.name)}${ext}`;
        try {
          fs.mkdirSync(pasta, { recursive: true });
          fs.copyFileSync(a.path, path.join(pasta, base));
          copiadas.push({
            rotulo: `${a.name} (tentativa ${i + 1})`,
            ficheiro: path.relative(this.pasta, path.join(pasta, base)).replace(/\\/g, '/'),
          });
        } catch (erro) {
          console.warn(`[falhas] não consegui copiar ${a.path}: ${(erro as Error).message}`);
        }
      }
    });
    return copiadas;
  }

  private renderMarkdown(nome: string, testes: TestCase[], falhas: Falha[], resultado: FullResult): string {
    const executados = testes.filter((t) => t.results.length > 0 && t.outcome() !== 'skipped').length;
    const ignorados = testes.filter((t) => t.outcome() === 'skipped').length;
    const falhou = falhas.filter((f) => f.estado === 'falhou').length;
    const instavel = falhas.length - falhou;
    const ambiente = ['qua', 'dev'].includes(process.env.AMBIENTE ?? '') ? process.env.AMBIENTE : 'mock';
    const inicio = resultado.startTime ?? new Date();

    const indice = falhas
      .map((f, i) => {
        const primeira = f.linhas.find((l) => l.falhou);
        return (
          `| ${i + 1} | [${celulaMd(f.caso)}](#f${i + 1}) | ${celulaMd(f.caminho)} | ${f.estado} | ` +
          `${primeira ? truncar(primeira.resultado.replace(/^❌\s*/, ''), 140) : '—'} |`
        );
      })
      .join('\n');

    const blocos = falhas
      .map((f, i) => {
        const tabela = f.linhas
          .map((l, n) => `| ${n + 1} | ${l.passo} | ${l.esperado} | ${l.resultado} |`)
          .join('\n');
        const evid = f.evidencias.length
          ? f.evidencias.map((e) => linkMd(e.rotulo, e.ficheiro)).join(' · ')
          : '—';
        return `<a id="f${i + 1}"></a>

### ${i + 1}. ${f.titulo} *(${f.estado})*

- **Tela / secção:** ${f.caminho || '—'}${f.rota ? ` · rota \`${f.rota}\`` : ''}
- **Caso:** \`${f.caso}\`${f.requisito ? ` · requisito ${f.requisito}` : ''} · \`${f.ficheiro}\`
${f.plano ? `- **Plano / roteiro:** ${f.plano}\n` : ''}- **Tentativas:** ${f.tentativas}
${f.anotacoes.length ? `- **Anotações da suíte:** ${f.anotacoes.map(celulaMd).join(' · ')}\n` : ''}- **Classificação (triagem QA):** _a preencher — defeito da aplicação (\`BUG-AAAAMMDD-NN\`, severidade 1/2/3) · falha da suíte/massa · instabilidade_

| # | Passo | Resultado esperado | Resultado do teste |
|---|---|---|---|
${tabela}

- **Evidência:** ${evid}

<details><summary>Erro completo (Playwright)</summary>

\`\`\`
${f.erro || '—'}
\`\`\`

</details>`;
      })
      .join('\n\n---\n\n');

    const p = (n: number) => String(n).padStart(2, '0');
    const data = `${inicio.getFullYear()}-${p(inicio.getMonth() + 1)}-${p(inicio.getDate())} ${p(inicio.getHours())}:${p(inicio.getMinutes())}`;

    return `# Falhas da execução — ${nome}

| Item | Valor |
|---|---|
| Data de execução | ${data} |
| Tipo | ${this.tipo} |
| Ambiente | ${ambiente} (${this.baseUrl || 'app local em modo mock'}) |
| Resultado | ${executados} executados · **${falhou} falharam** · ${instavel} instáveis (passaram no retry) · ${ignorados} ignorados |
| Relatório completo | [${nome}.html](${encodeURIComponent(nome)}.html) · [${nome}.md](${encodeURIComponent(nome)}.md) |

Só os casos que falharam ou ficaram instáveis. Cada tabela reconstrói o caso a partir dos
passos do teste — é a base para registar o defeito (passos para reproduzir, esperado, obtido).
Antes de levar ao Taiga: confirmar se é **defeito da aplicação** ou **falha da suíte/massa de
teste** e atribuir o ID \`BUG-AAAAMMDD-NN\` e a severidade.

${falhas.length === 0 ? '**Nenhuma falha nesta execução.**\n' : `## Índice

| # | Caso | Tela / secção | Estado | 1.ª divergência |
|---|---|---|---|---|
${indice}

## Casos

${blocos}
`}`;
  }
}

import { AMBIENTE } from '../dados/massa';

/** Natureza do caso (do plano funcional Consulta-Area-Prestacao). */
type Natureza = 'positivo' | 'negativo' | 'robustez';

/** Tipo de teste do plano Traceability Suite 20250077 Â§IV (ver docs/plano-de-testes/). */
type TipoTeste = 'caixa-preta' | 'interface' | 'compatibilidade' | 'recuperacao';

/**
 * Camada que o caso exercita â€” decide em que modo de execuÃ§Ã£o ele corre (ver
 * `ferramentas/correr.mjs` e a secÃ§Ã£o "Front vs integraÃ§Ã£o" do README):
 *   - `front`      â€” sÃ³ a interface: layout, validaÃ§Ãµes, navegaÃ§Ã£o, estado do ecrÃ£. Corre
 *                    com o `ccmsns-ui` em modo mock (MSW no lugar da API), sem backend nem VPN.
 *   - `integracao` â€” front + back: o que sÃ³ o backend real prova (dados reais, ordenaÃ§Ã£o,
 *                    paginaÃ§Ã£o e filtros no servidor, exportaÃ§Ã£o, gravaÃ§Ã£o, erros do servidor).
 *                    Corre contra um ambiente publicado (`dev`).
 */
export type Camada = 'front' | 'integracao';

/**
 * Monta `tag` + `annotation` de um caso, no formato que o
 * `reporter-rastreabilidade.ts` consome e que permite seleÃ§Ã£o por `--grep`.
 *
 * Tags geradas (todas com `@`):
 *   @<suite>                   â€” suÃ­te (default `consulta-area-prestacao`)
 *   @front | @integracao       â€” camada (default `front`; `@pos-deploy` implica `integracao`)
 *   @<tipoTeste>               â€” caixa-preta | interface | compatibilidade | recuperacao
 *   @<familia>                 â€” fatura | lote | prestacao      (quando aplicÃ¡vel)
 *   @area-<area>                â€” Ã¡rea da app quando != Medicamentos (ex. `crd`)  (quando aplicÃ¡vel)
 *   @RF29 / @RF21 / @RF32 â€¦    â€” requisitos
 *   @<CT-...>                  â€” id do caso
 *   @<BUG-...>                 â€” id do defeito de origem (casos `CT-REG-BUG-*`)  (quando aplicÃ¡vel)
 *   @<natureza>                â€” positivo | negativo | robustez  (quando aplicÃ¡vel)
 *   @smoke                     â€” pertence ao conjunto smoke      (quando `smoke: true`)
 *   @pos-deploy                â€” corre na pipeline pÃ³s-deploy contra um ambiente publicado
 *                                (quando `posDeploy: true`; ver `bitbucket-pipelines.yml`)
 *
 * Exemplos de execuÃ§Ã£o:
 *   npm run test:front                 (ou test:integracao / test:tudo â€” ferramentas/correr.mjs)
 *   npx playwright test --grep @caixa-preta
 *   npx playwright test --grep "@lote|@prestacao"
 *   npx playwright test --grep @smoke --project=firefox
 *   npx playwright test --grep @pos-deploy --project=chromium
 *   npx playwright test --grep @CT-FAT-NUMERO
 *   npx playwright test --grep-invert @recuperacao
 */
export function meta(args: {
  caso: string;
  requisitos: string[];
  plano: string;
  tipoTeste?: TipoTeste;
  /** Default `front`, ou `integracao` quando `posDeploy: true`. */
  camada?: Camada;
  familia?: 'fatura' | 'lote' | 'prestacao';
  /** Ãrea da app quando != Medicamentos (ex. `crd` para Cuidados RespiratÃ³rios). */
  area?: string;
  /** ID do defeito de origem (`BUG-AAAAMMDD-NN`), para os casos `CT-REG-BUG-*`. */
  bug?: string;
  tipo?: Natureza;
  smoke?: boolean;
  /**
   * Caso estÃ¡vel e sem massa volÃ¡til, seguro para correr contra um ambiente publicado
   * logo apÃ³s um deploy. Tag prÃ³pria (e nÃ£o `@smoke`) para nÃ£o alargar o conjunto que
   * os projetos firefox/webkit correm.
   */
  posDeploy?: boolean;
  suite?: string;
}) {
  const {
    caso,
    requisitos,
    plano,
    tipoTeste = 'caixa-preta',
    familia,
    area,
    bug,
    tipo,
    smoke,
    posDeploy,
    suite = 'consulta-area-prestacao',
  } = args;
  // O conjunto pÃ³s-deploy corre contra um ambiente publicado: Ã© sempre integraÃ§Ã£o.
  const camada: Camada = args.camada ?? (posDeploy ? 'integracao' : 'front');
  return {
    tag: [
      `@${suite}`,
      `@${camada}`,
      `@${tipoTeste}`,
      ...(familia ? [`@${familia}`] : []),
      ...(area ? [`@area-${area}`] : []),
      ...requisitos.map((r) => `@${r}`),
      `@${caso}`,
      ...(bug ? [`@${bug}`] : []),
      ...(tipo ? [`@${tipo}`] : []),
      ...(smoke ? ['@smoke'] : []),
      ...(posDeploy ? ['@pos-deploy'] : []),
    ],
    annotation: [
      { type: 'caso', description: caso },
      ...requisitos.map((r) => ({ type: 'requisito', description: r })),
      { type: 'tipo-teste', description: tipoTeste },
      { type: 'camada', description: camada },
      { type: 'plano', description: plano },
      ...(bug ? [{ type: 'bug', description: bug }] : []),
      { type: 'massa', description: `ambiente=${AMBIENTE}` },
    ],
  };
}

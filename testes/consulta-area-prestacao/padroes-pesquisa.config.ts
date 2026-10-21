import type { Criterio } from '../../paginas/pesquisaConsulta';
import type { AreaConsulta } from './apoio-consulta';

/**
 * Configuração das 24 pesquisas de Consulta por Área de Prestação para os casos de padrão
 * (`padroes-pesquisa.ts`). Fontes, só leitura em `CCM/repos/ccmsns-ui` (16-10-2026):
 *   - pedido da pesquisa: `src/services/<área>/*.service.ts` (base `/ccmsns/api`);
 *   - critério mínimo: `*.validation.ts` de cada ecrã;
 *   - massa do mock: `src/mocks/<área>/handlers.ts` + `seed*.ts`.
 *
 * **Pesquisas de base** — tentadas por ordem até a grelha ter registos suficientes:
 *   1.º o valor que devolve todo o seed do **mock** (só 3 ecrãs passam de 50 linhas: Med Lotes,
 *       Med Prestações e Termas Prestações);
 *   2.º alternativas para o **dev**: um select aceite sozinho (cada opção é tentada) ou as
 *       sondas de «Número da Factura» já usadas em `apoio-consulta.ts`. A massa do dev ainda
 *       não foi calibrada (sem VPN em 16-10-2026): a 1.ª corrida de integração diz quais
 *       servem — os casos sem pesquisa de base ficam «não aplicável», não falham.
 */
export interface ConfigPesquisa {
  area: AreaConsulta;
  /** Caminho do pedido GET da pesquisa (`URL.pathname`). */
  endpoint: RegExp;
  bases: Criterio[][];
  /** Coluna preferida nos casos de ordenação de uma só coluna (default: a 1.ª com valores variados). */
  colunaOrdenacao?: string;
  /** Coluna do estado na grelha (UC-ORD-04). */
  colunaEstado?: string;
  /** Filtros do formulário (famílias A e B), com a coluna da grelha que mostra o valor. */
  filtros?: FiltroConfig[];
  /** Combinações que o ecrã não aceita (UC-FIL-09), além de «sem filtros». */
  insuficientes?: Criterio[][];
  /** Autocomplete do prestador: `areaConferenciaId` do ecrã e termos a tentar (mock, depois dev). */
  prestador?: { area: number; termos: string[] };
  /** UC-OPC-08 — domínio que cada select deve mostrar, pelo rótulo. */
  rotulosDominio?: { rotulo: string; dominio: RegExp; descricao: string }[];
}

/**
 * Um filtro do formulário. `coluna` é o `abbr` do cabeçalho da grelha onde o valor aparece
 * (sem coluna, o filtro não entra nos casos «filtro a filtro»). `modo` é o do documento
 * funcional 5.2: identificadores por conteúdo parcial, códigos por igualdade exata.
 */
export interface FiltroConfig {
  rotulo: string;
  tipo: 'texto' | 'data' | 'select' | 'prestador';
  coluna?: string;
  modo?: 'parcial' | 'exato';
  /** Outros filtros (pelo rótulo) que o ecrã exige com este; preenchidos com a mesma linha. */
  com?: string[];
  /** Defeito/tarefa já conhecido que o caso apanha (tag). */
  bug?: string;
}

const T = (rotulo: string, coluna?: string, modo?: FiltroConfig['modo'], com?: string[]): FiltroConfig => ({ rotulo, tipo: 'texto', coluna, modo, com });
const D = (rotulo: string, coluna?: string, com?: string[], bug?: string): FiltroConfig => ({ rotulo, tipo: 'data', coluna, com, bug });
const S = (rotulo: string, coluna?: string, com?: string[], bug?: string): FiltroConfig => ({ rotulo, tipo: 'select', coluna, com, bug });
const P = (coluna = 'NIF Prestador', com?: string[]): FiltroConfig => ({ rotulo: 'NIF ou Nome do Prestador', tipo: 'prestador', coluna, com });
/** Termos do autocomplete: o do mock primeiro, depois um prefixo de NIF para o dev. */
const prest = (area: number, termoMock: string) => ({ area, termos: [termoMock, '50'] });

const api = (caminho: string) => new RegExp(`/ccmsns/api(/v\\d+)?${caminho}$`);
const estado = (rotulo = 'Estado'): Criterio[] => [{ select: rotulo }];
const factura = (rotulo: string, ...valores: string[]): Criterio[][] => valores.map((valor) => [{ campo: rotulo, valor }]);

export const CONFIG_PESQUISAS: Record<string, ConfigPesquisa> = {
  // --- Medicamentos ---------------------------------------------------------------------------
  '/medicamentos/factura': {
    area: 'medicamentos',
    endpoint: api('/medicamentos/facturas'),
    bases: [...factura('Número da Factura', 'F2025'), estado(), ...factura('Número da Factura', '1')],
    colunaOrdenacao: 'Factura',
    colunaEstado: 'Estado',
  },
  '/medicamentos/lote': {
    area: 'medicamentos',
    endpoint: api('/medicamentos/lotes'),
    // Sozinho só o Nº da Factura é aceite (loteMed.validation.ts).
    bases: factura('Número da Factura', 'F2025', 'E003-261', 'E017-1'),
  },
  '/medicamentos/prestacoes': {
    area: 'medicamentos',
    endpoint: api('/medicamentos/prestacoes'),
    bases: factura('Número da Factura', 'F2025', 'E003-261', 'E017-1'),
  },

  // --- MCDT -----------------------------------------------------------------------------------
  '/mcdts/factura': {
    area: 'mcdt',
    endpoint: api('/mcdt/facturas'),
    bases: [...factura('Número da Factura', 'FT'), estado(), ...factura('Número da Factura', '1')],
    colunaEstado: 'Estado',
  },
  '/mcdts/lote': {
    area: 'mcdt',
    endpoint: api('/mcdt/lotes'),
    bases: [...factura('Número da Factura', 'FT'), [{ select: 'Natureza da Prestação' }], ...factura('Número da Factura', '1')],
  },
  '/mcdts/prescricao': {
    area: 'mcdt',
    endpoint: api('/mcdt/prestacoes'),
    bases: factura('Número da Factura', 'FT', '1'),
  },
  '/mcdts/prestacoes-ipatimup': {
    area: 'mcdt',
    endpoint: api('/mcdt/prestacoes/ipatimup'),
    bases: factura('Número da Factura', 'FT', '1'),
  },

  // --- Cuidados Respiratórios Domiciliários ---------------------------------------------------
  '/cuidados-respiratorios/factura': {
    area: 'crd',
    endpoint: api('/crd/facturas'),
    bases: [[{ campo: 'Código do Prestador', valor: '30' }], estado(), ...factura('Número da Factura', '1')],
    colunaEstado: 'Estado',
  },
  '/cuidados-respiratorios/lote': {
    area: 'crd',
    endpoint: api('/crd/lotes/pesquisa'),
    bases: [[{ campo: 'Código da Convenção', valor: '30' }], [{ select: 'Tipo de Lote' }], ...factura('Número da Factura', '1')],
    colunaEstado: 'Estado',
  },
  '/cuidados-respiratorios/prestacao': {
    area: 'crd',
    endpoint: api('/crd/prestacoes'),
    bases: [[{ campo: 'Código da Convenção', valor: '30' }], [{ select: 'Tipo de Lote' }], ...factura('Número da Factura', '1')],
    colunaEstado: 'Estado',
  },

  // --- Cuidados Continuados -------------------------------------------------------------------
  '/cuidados-continuados/factura': {
    area: 'cuidados-continuados',
    endpoint: api('/cc/facturas'),
    bases: [...factura('Número da Factura', 'CC2025'), estado(), ...factura('Número da Factura', '1')],
    colunaEstado: 'Estado',
  },

  // --- Hemodiálise ----------------------------------------------------------------------------
  '/hemodialise/factura': {
    area: 'hemodialise',
    endpoint: api('/hemodialise/facturas'),
    bases: [...factura('Número da Factura', 'HD2025'), estado(), ...factura('Número da Factura', '1')],
    colunaEstado: 'Estado',
  },
  '/hemodialise/prestacao': {
    area: 'hemodialise',
    endpoint: api('/hemodialise/prestacoes'),
    bases: factura('Número da Factura', 'HD2025', '1'),
  },

  // --- Tratamentos Termais --------------------------------------------------------------------
  '/tratamentos-termais/factura': {
    area: 'tratamentos-termais',
    endpoint: api('/tratamentos-termais/facturas'),
    bases: [[{ campo: 'Cod. Prestador', valor: '40' }], estado(), ...factura('N. factura', '1')],
    colunaEstado: 'Estado',
  },
  '/tratamentos-termais/lote': {
    area: 'tratamentos-termais',
    endpoint: api('/tratamentos-termais/lotes'),
    bases: factura('N. factura', 'FT TT', '1'),
    colunaEstado: 'Estado',
  },
  '/tratamentos-termais/prestacao': {
    area: 'tratamentos-termais',
    endpoint: api('/tratamentos-termais/prestacoes'),
    bases: factura('N. Factura', 'FT TT', '1'),
    colunaEstado: 'Estado',
  },

  // --- Saúde Oral -----------------------------------------------------------------------------
  '/saude-oral/factura': {
    area: 'saude-oral',
    endpoint: api('/saude-oral/facturas'),
    bases: [...factura('Número da Factura', 'FT 2024'), estado(), ...factura('Número da Factura', '1')],
    colunaEstado: 'Estado',
  },
  '/saude-oral/prestacoes': {
    area: 'saude-oral',
    endpoint: api('/saude-oral/prestacoes'),
    bases: factura('Número da Factura', 'F2024', '1'),
  },

  // --- Vacinas --------------------------------------------------------------------------------
  '/vacinas/factura': {
    area: 'vacinas',
    endpoint: api('/vacinas/facturas'),
    bases: [...factura('Número da Fatura', 'FV/2025'), estado(), ...factura('Número da Fatura', '1')],
    colunaEstado: 'Estado',
  },
  '/vacinas/prestacao': {
    area: 'vacinas',
    endpoint: api('/vacinas/prestacoes'),
    bases: factura('Número da factura', 'FV-2026', '1'),
  },

  // --- Dispensa em Proximidade ----------------------------------------------------------------
  '/dispensa-proximidade/factura': {
    area: 'dispensa-proximidade',
    endpoint: api('/dispensa-proximidade/facturas'),
    bases: [...factura('Número da Factura', 'FDP/2026'), estado(), ...factura('Número da Factura', '1')],
    colunaEstado: 'Estado',
  },
  '/dispensa-proximidade/lote': {
    area: 'dispensa-proximidade',
    endpoint: api('/dispensa-proximidade/lotes'),
    bases: factura('N. Factura', 'FT DP', '1'),
  },
  '/dispensa-proximidade/prestacao': {
    area: 'dispensa-proximidade',
    endpoint: api('/dispensa-proximidade/prestacoes'),
    bases: factura('N. Factura', 'FT DP', '1'),
  },

  // --- Programa Troca de Seringas -------------------------------------------------------------
  '/troca-seringas/factura': {
    area: 'troca-seringas',
    endpoint: api('/troca-seringas/facturas'),
    bases: [...factura('Número da Factura', 'PTS2026'), estado(), ...factura('Número da Factura', '1')],
    colunaEstado: 'Estado',
  },
};

// --- filtros de cada ecrã (famílias A e B) ------------------------------------------------------
// Rótulos dos campos e cabeçalhos da grelha lidos em `ccmsns-ui` (formulário e `columns` de cada
// ecrã). Sem coluna: o valor não aparece na grelha (ex.: Valor SNS) ou a grelha mostra outra
// granularidade (Data da Factura em mm/aaaa em Medicamentos/Vacinas/Dispensa → Facturas).
// Datas que comparam com a meia-noite exata (P13): BUG-20261015-19 (Med), -20 (MCDT), -21 (Termas).

const DATA_SOZINHA: Criterio[][] = [[{ campo: 'Data da Factura', valor: '01/01/2025' }]];

const FILTROS: Record<string, Pick<ConfigPesquisa, 'filtros' | 'insuficientes' | 'prestador' | 'rotulosDominio'>> = {
  '/medicamentos/factura': {
    filtros: [T('Número da Factura', 'Factura', 'parcial'), D('Data da Factura'), T('Número do Processo', 'Processo'), P(), T('Código do Prestador', 'Farmácia', 'exato'), S('Estado', 'Estado', undefined, 'BUG-20261015-15')],
    prestador: prest(1, 'Farmácia'),
  },
  '/medicamentos/lote': {
    filtros: [
      T('Número da Factura', 'Nº da Factura', 'parcial'),
      D('Data da Factura', 'Data Factura', ['Tipo de Lote'], 'BUG-20261015-19'),
      P('NIF Prestador', ['Data da Factura']),
      T('Código do Prestador', 'Cód. Farmácia', 'exato', ['Data da Factura']),
      S('Tipo de Lote', 'Tipo Lote', ['Data da Factura']),
      T('Número de Lote', 'Nº Lote', 'parcial', ['Tipo de Lote']),
    ],
    insuficientes: DATA_SOZINHA,
    prestador: prest(1, 'Farmácia'),
  },
  '/medicamentos/prestacoes': {
    filtros: [
      T('Número da Factura', 'Nº da Factura', 'parcial'),
      D('Data da Factura', 'Data Factura', ['Tipo de Lote'], 'BUG-20261015-19'),
      P('NIF Prestador', ['Data da Factura']),
      T('Código do Prestador', 'Cód. Convenc.', 'exato', ['Data da Factura']),
      S('Tipo de Lote', 'Tipo de Lote', ['Data da Factura']),
      T('Número do Lote', 'Nº Lote', 'parcial', ['Tipo de Lote']),
      T('Número de Receita', 'N° Receita', 'parcial'),
      T('Valor SNS'),
      T('Nº Linha RSP'),
    ],
    insuficientes: DATA_SOZINHA,
    prestador: prest(1, 'Farmácia'),
  },
  '/mcdts/factura': {
    filtros: [T('Número da Factura', 'Nº da Factura', 'parcial'), D('Data da Factura', 'Data Factura'), T('Número do Processo', 'Nº do Processo'), P(), T('Código do Prestador', 'Cód. Convenção', 'exato'), S('Estado', 'Estado')],
    prestador: prest(2, 'Laboratório'),
  },
  '/mcdts/lote': {
    filtros: [
      T('Número da Factura', 'Nº da Factura', 'parcial'),
      D('Data da Factura', 'Data Factura', undefined, 'BUG-20261015-20'),
      P(),
      T('Código do Prestador', 'Cód. Convenção', 'exato'),
      S('Natureza da Prestação', 'Natureza Prest.'),
      T('Número do Lote', 'Nº Lote', 'parcial'),
    ],
    prestador: prest(2, 'Laboratório'),
  },
  '/mcdts/prescricao': {
    filtros: [
      T('Número da Factura', 'Nº da Factura', 'parcial'),
      D('Data da Factura', 'Data Factura', ['Código do Prestador'], 'BUG-20261015-20'),
      P('NIF Prestador', ['Data da Factura']),
      T('Código do Prestador', 'Cód. Convenção', 'exato', ['Data da Factura']),
      S('Área da Prestação', 'Área prest.', ['Data da Factura']),
      T('Número de Lote', 'Nº lote', 'parcial', ['Data da Factura']),
      T('Número da Requisição', 'Nº requisição', 'parcial'),
      T('Nº Linha RSP'),
    ],
    insuficientes: DATA_SOZINHA,
    prestador: prest(2, 'Laboratório'),
  },
  '/mcdts/prestacoes-ipatimup': {
    filtros: [T('Número da Factura', 'Nº da Factura', 'parcial'), D('Data da Factura', 'Data Factura'), P(), T('Código do Prestador', 'Cód. Convenção', 'exato'), T('Número de Cheque', 'N° Cheque'), T('Número de Utente', 'N° Utente')],
    prestador: prest(2, 'IPATIMUP'),
  },
  '/cuidados-respiratorios/factura': {
    filtros: [T('Número da Factura', 'Nº da Factura', 'parcial'), D('Data da Facturação', 'Data Facturação'), P(), T('Código do Prestador', 'Cód. Prestador', 'exato'), S('Estado', 'Estado')],
    prestador: prest(3, 'Gás'),
  },
  '/cuidados-respiratorios/lote': {
    filtros: [T('Número da Factura', 'Nº da Factura', 'parcial'), D('Data da Factura', 'Data Factura'), P(), T('Código da Convenção', 'Cód. Convenção', 'exato'), T('Número do Lote', 'Nº Lote', 'parcial'), S('Tipo de Lote', 'Tipo de Lote')],
    prestador: prest(3, 'Gás'),
  },
  '/cuidados-respiratorios/prestacao': {
    filtros: [
      T('Número da Factura', 'Nº da Factura', 'parcial'),
      D('Data da Factura', 'Data Factura'),
      P(),
      T('Código da Convenção', 'Cód. Convenção', 'exato'),
      T('Número do Lote', 'Nº Lote', 'parcial'),
      S('Tipo de Lote', 'Tipo de Lote'),
      T('Número da Prescrição', 'Nº Prescrição', 'parcial'),
      S('Tipo de Prescrição', 'Tipo Prescrição'),
    ],
    prestador: prest(3, 'Gás'),
  },
  '/cuidados-continuados/factura': {
    filtros: [T('Número da Factura', 'N° Factura', 'parcial'), D('Data da Facturação', 'Data Facturação'), S('Tipologia Cuidados'), P(), T('Nº Contrato'), S('Tipo Factura', 'Tipo Factura'), S('Estado', 'Estado')],
    prestador: prest(5, 'Paliativ'),
    rotulosDominio: [
      { rotulo: 'Tipologia Cuidados', dominio: /Convalesc|Duração|Paliativ|Reabilita|Manutenção|Cuidados/i, descricao: 'tipologias de cuidados' },
      { rotulo: 'Tipo Factura', dominio: /^(?!.*(Convalesc|Duração|Paliativ|Reabilita|Manutenção)).*$/i, descricao: 'tipos de factura, não tipologias de cuidados' },
    ],
  },
  '/hemodialise/factura': {
    filtros: [T('Número da Factura', 'Nº Factura', 'parcial'), D('Data da Factura', 'Data Factura'), D('Data da Facturação', 'Data Facturação'), P(), T('Código do Prestador', 'Cód. Prestador', 'exato'), S('Estado', 'Estado')],
    prestador: prest(4, 'Hemodiálise'),
  },
  '/hemodialise/prestacao': {
    filtros: [T('Número da Factura', 'Nº da Factura', 'parcial'), D('Data da Factura', 'Data Factura'), P(), T('Código da Convenção', 'Cód. Convenção', 'exato'), T('Número do Lote'), T('Número de Beneficiário', 'Número de Beneficiário')],
    prestador: prest(4, 'Hemodiálise'),
  },
  '/tratamentos-termais/factura': {
    filtros: [
      T('N. factura', 'N. Factura', 'parcial'),
      D('Data factura', 'Data Factura'),
      D('Data facturação', 'Data Facturação'),
      T('N. Processo'),
      P('NIF'),
      T('Cod. Prestador', 'Cód. Prest.', 'exato'),
      S('Estado', 'Estado', undefined, 'TASK-20261015-10'),
    ],
    prestador: prest(9, 'Termas'),
  },
  '/tratamentos-termais/lote': {
    filtros: [T('N. factura', 'N. Factura', 'parcial'), D('Data factura', 'Data Factura', undefined, 'BUG-20261015-21'), T('N. Lote', undefined, 'parcial', ['N. factura']), P('NIF'), T('Cod. Prestador', 'Cód. Prest.', 'exato')],
    insuficientes: [[{ campo: 'N. Lote', valor: '1' }]],
    prestador: prest(9, 'Termas'),
  },
  '/tratamentos-termais/prestacao': {
    filtros: [T('N. Factura', 'N. Factura', 'parcial'), D('Data Factura', 'Data Factura'), T('N. Lote', 'N. Lote', 'parcial'), P('NIF'), T('Cód. Convenção', 'Cód. Convenção', 'exato'), T('N. Requisição', 'N. Requisição', 'parcial')],
    prestador: prest(9, 'Termas'),
  },
  '/saude-oral/factura': {
    filtros: [
      T('Número da Factura', 'N. Factura', 'parcial'),
      D('Data da Factura'),
      D('Data da Facturação', 'Data Facturação'),
      P(),
      T('Cód. Prestador', 'Cód. Prestador', 'exato'),
      S('Estado', 'Estado', undefined, 'BUG-20261015-16'),
      T('Número de Pedido Pagamento', 'N. Ped. Pagamento'),
    ],
    prestador: prest(10, '50'),
  },
  '/saude-oral/prestacoes': {
    filtros: [
      T('Número da Factura', 'N. Factura', 'parcial'),
      D('Data da Factura'),
      D('Data da Facturação', 'Data Facturação'),
      P(),
      T('Cód. Convenção', 'Cód. Convenção', 'exato'),
      T('Número de Pedido Pagamento', 'N. Ped. Pagamento'),
      T('Número do Cheque', 'N. de Cheque'),
      T('Número do Utente', 'N. Utente'),
    ],
    prestador: prest(10, '50'),
  },
  '/vacinas/factura': {
    filtros: [T('Número da Fatura', 'Factura', 'parcial'), D('Data da Factura'), T('Número do processo', 'Processo'), P('NIF'), T('Cod. Prestador', 'Cod.', 'exato'), S('Estado', 'Estado', undefined, 'TASK-20261015-09')],
    prestador: prest(1, 'Farmácia'),
  },
  '/vacinas/prestacao': {
    filtros: [
      T('Número da factura', 'N. Factura', 'parcial'),
      D('Data da factura'),
      P(),
      T('Código convenção', 'Cod. Convenção', 'exato'),
      T('Número do lote', 'N. lote', 'parcial'),
      T('Número receita', 'Número receita', 'parcial'),
      T('Valor SNS'),
      T('Número linha RSP'),
    ],
    prestador: prest(1, 'Farmácia'),
  },
  '/dispensa-proximidade/factura': {
    filtros: [T('Número da Factura', 'Factura', 'parcial'), D('Data da Factura'), T('Número do processo'), P('NIF'), T('Cod. Prestador', 'Código', 'exato'), S('Estado', 'Estado')],
    prestador: prest(1, 'Farmácia'),
  },
  '/dispensa-proximidade/lote': {
    filtros: [
      T('N. Factura', 'N. Factura', 'parcial'),
      D('Data da Factura', 'Data Factura', ['Cod. Convenção']),
      P('NIF Prestador', ['Data da Factura']),
      T('Cod. Convenção', 'Cód. Conv.', 'exato', ['Data da Factura']),
      S('Tipo de Lote', 'Tipo Lote', ['Data da Factura']),
    ],
    insuficientes: DATA_SOZINHA,
    prestador: prest(1, 'Farmácia'),
  },
  '/dispensa-proximidade/prestacao': {
    filtros: [
      T('N. Factura', 'N. Factura', 'parcial'),
      D('Data da Factura', 'Data Factura', ['Cod. Convenção']),
      P('NIF Prestador', ['Data da Factura']),
      T('Cod. Convenção', 'Cód. Conv.', 'exato', ['Data da Factura']),
      T('N. Receita', 'N. Receita', 'parcial'),
    ],
    insuficientes: DATA_SOZINHA,
    prestador: prest(1, 'Farmácia'),
  },
  '/troca-seringas/factura': {
    filtros: [
      T('Número da Factura', 'Nº da Factura', 'parcial'),
      T('Código Prestador', 'Código Prestador', 'exato'),
      { rotulo: 'NIF ou Nome do Prestador', tipo: 'prestador' },
      T('Código SICAD (Kit)', 'Código SICAD'),
      T('Convenção SICAD', 'Convenção', 'exato'),
      T('Mês de Conferência', 'Mês Conferência'),
      D('Data da Factura', 'Data Factura'),
      S('Estado', 'Estado', undefined, 'TASK-20261015-11'),
    ],
    prestador: prest(1, 'Farmácia'),
  },
};

for (const [rota, extra] of Object.entries(FILTROS)) Object.assign(CONFIG_PESQUISAS[rota], extra);

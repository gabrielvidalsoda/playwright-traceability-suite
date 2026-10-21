/**
 * ConfiguraÃ§Ã£o das telas de pesquisa de **Dados de ReferÃªncia** (menu
 * "Dados de ReferÃªncia" de `ccmsns-ui`, `src/layout/MainLayout.tsx`) cobertas
 * pelo roteiro de deploy dos padrÃµes de UI (PRs front #50/#55, back #31/#34):
 * `CCM/QA/Testes/PDT/Testes manuais/24-09-2026-ajustes-gerais/roteiro-testes-deploy-dados-referencia-padroes-ui.md`.
 *
 * Rotas confirmadas em `src/router/routes.types.ts` (branch `origin/develop`, sÃ³
 * leitura). Quase todas as pesquisas exigem pelo menos um critÃ©rio (ver
 * `AvisoFiltrosObrigatorios` de cada formulÃ¡rio), por isso cada tela tem um filtro que
 * devolve linhas, por ambiente:
 *   - `dev`  â€” dados reais do dev publicado (https://app.example.internal; confirmados na API em
 *              24-09-2026, quando ainda era http://app.example.internal);
 *   - `mock` â€” seed MSW (`src/mocks/dadosReferencia/<tela>/seed.ts`), para validar a suÃ­te
 *              localmente contra um build `--mode mock`.
 * Em `qua` usa-se o filtro de `dev` (rever se os dados diferirem).
 */
import { AMBIENTE } from '../../dados/massa';

/** Filtro mÃ­nimo que faz a pesquisa devolver linhas. */
export interface FiltroTela {
  /** RÃ³tulo do campo (nome acessÃ­vel). */
  rotulo: string;
  valor: string;
  /** `textbox` (TextInput) ou `combobox` (SelectBox â€” `valor` Ã© o rÃ³tulo da opÃ§Ã£o). */
  tipo?: 'textbox' | 'combobox';
}

export interface TelaDadosReferencia {
  /** Pasta do Item em `testes/dados-referencia/<item>/`. */
  item: string;
  /** Nome da tela como aparece no roteiro. */
  nome: string;
  /** Passo do roteiro na tabela A.1 (conferÃªncia rÃ¡pida), quando aplicÃ¡vel. */
  passoA1?: string;
  /** Requisito do Documento de Requisitos (RF#26 ConvenÃ§Ãµes, RF#27 Medicamentos, RF#28 MCDT, RF#57 restantes). */
  requisito: 'RF26' | 'RF27' | 'RF28' | 'RF57';
  rota: string;
  /** Filtro por ambiente; sem filtro, a tela pesquisa sem critÃ©rios. */
  filtros?: { dev: FiltroTela; mock: FiltroTela };
  /** Coluna ordenÃ¡vel usada nas verificaÃ§Ãµes A08. */
  colunaOrdenavel: string;
  /** Coluna de data ordenÃ¡vel (A09), quando existir. */
  colunaData?: string;
}

export const CNPEM: TelaDadosReferencia = {
  item: 'cnpem',
  nome: 'CNPEM',
  requisito: 'RF27',
  rota: '/dados-referencia/cnpem',
  filtros: {
    dev: { rotulo: 'CÃ³digo CNPEM', valor: '5' },
    mock: { rotulo: 'CÃ³digo CNPEM', valor: '5' },
  },
  colunaOrdenavel: 'CÃ³d. CNPEM',
  colunaData: 'Data InÃ­cio',
};

export const CONVENCOES: TelaDadosReferencia = {
  item: 'convencoes',
  nome: 'ConvenÃ§Ãµes',
  passoA1: 'A.1.1',
  requisito: 'RF26',
  rota: '/dados-referencia/convencoes',
  filtros: {
    dev: { rotulo: 'CÃ³digo ConvenÃ§Ã£o', valor: '1' },
    mock: { rotulo: 'CÃ³digo ConvenÃ§Ã£o', valor: 'CONV' },
  },
  colunaOrdenavel: 'CÃ³d. ConvenÃ§Ã£o',
  colunaData: 'Data InÃ­cio',
};

export const TROCA_SERINGAS: TelaDadosReferencia = {
  item: 'troca-seringas',
  nome: 'ConvenÃ§Ãµes SICAD (Troca de Seringas)',
  passoA1: 'A.1.2',
  requisito: 'RF57',
  rota: '/dados-referencia/troca-seringas',
  filtros: {
    dev: { rotulo: 'CÃ³digo / prestador', valor: 'a' },
    mock: { rotulo: 'CÃ³digo / prestador', valor: 'a' },
  },
  colunaOrdenavel: 'CÃ³digo SICAD',
  colunaData: 'Data inÃ­cio',
};

export const EMBALAGENS_MEDICAMENTOS: TelaDadosReferencia = {
  item: 'embalagens-medicamentos',
  nome: 'Embalagens e Medicamentos',
  passoA1: 'A.1.3',
  requisito: 'RF27',
  rota: '/dados-referencia/embalagens-medicamentos',
  filtros: {
    dev: { rotulo: 'Nome Medicamento', valor: 'paracetamol' },
    mock: { rotulo: 'N.Âº Registo', valor: '560' },
  },
  colunaOrdenavel: 'NÃºmero Registo',
};

export const EFR: TelaDadosReferencia = {
  item: 'efr',
  nome: 'EFR',
  passoA1: 'A.1.4',
  requisito: 'RF57',
  rota: '/dados-referencia/efr',
  colunaOrdenavel: 'CÃ³digo',
  colunaData: 'Data InÃ­cio',
};

export const LOCAIS_PRESCRICAO: TelaDadosReferencia = {
  item: 'locais-prescricao',
  nome: 'Locais de PrescriÃ§Ã£o',
  passoA1: 'A.1.5',
  requisito: 'RF57',
  rota: '/dados-referencia/locais-prescricao',
  filtros: {
    dev: { rotulo: 'CÃ³digo do Local', valor: '00' },
    mock: { rotulo: 'CÃ³digo do Local', valor: '00' },
  },
  colunaOrdenavel: 'CÃ³d. Local',
  colunaData: 'Data InÃ­cio',
};

export const MEDICOS_PRESCRITORES: TelaDadosReferencia = {
  item: 'medicos-prescritores',
  nome: 'MÃ©dicos/Prescritores',
  passoA1: 'A.1.6',
  requisito: 'RF57',
  rota: '/dados-referencia/medicos-prescritores',
  filtros: {
    dev: { rotulo: 'N.Âº de Ordem / CÃ©dula', valor: 'M' },
    mock: { rotulo: 'N.Âº de Ordem / CÃ©dula', valor: 'M' },
  },
  colunaOrdenavel: 'N.Âº Prescritor',
  colunaData: 'Data InÃ­cio',
};

export const VACINAS: TelaDadosReferencia = {
  item: 'vacinas',
  nome: 'Vacinas',
  passoA1: 'A.1.7',
  requisito: 'RF57',
  rota: '/dados-referencia/vacinas',
  filtros: {
    dev: { rotulo: 'DescriÃ§Ã£o', valor: 'vac' },
    mock: { rotulo: 'CÃ³digo vacina', valor: 'VAC' },
  },
  colunaOrdenavel: 'CÃ³digo',
};

export const TIPOS_PRECO_HEMODIALISE: TelaDadosReferencia = {
  item: 'tipos-preco-hemodialise',
  nome: 'Tipos de PreÃ§o HemodiÃ¡lise',
  passoA1: 'A.1.8',
  requisito: 'RF57',
  rota: '/dados-referencia/tipos-preco-hemodialise',
  filtros: {
    dev: { rotulo: 'DescriÃ§Ã£o', valor: 'pre' },
    mock: { rotulo: 'DescriÃ§Ã£o', valor: 'Tabela' },
  },
  colunaOrdenavel: 'DescriÃ§Ã£o',
};

export const SERVICOS_DISPENSA_PROXIMIDADE: TelaDadosReferencia = {
  item: 'servicos-dispensa-proximidade',
  nome: 'ServiÃ§os de Dispensa em Proximidade',
  passoA1: 'A.1.9',
  requisito: 'RF57',
  rota: '/dados-referencia/servicos-dispensa-proximidade',
  filtros: {
    dev: { rotulo: 'DescriÃ§Ã£o', valor: 'dis' },
    mock: { rotulo: 'CÃ³digo serviÃ§o', valor: 'DP' },
  },
  colunaOrdenavel: 'CÃ³digo',
};

export const SISTEMAS_CRD: TelaDadosReferencia = {
  item: 'sistemas-crd',
  nome: 'Sistemas CRD',
  passoA1: 'A.1.10',
  requisito: 'RF57',
  rota: '/dados-referencia/sistemas-crd',
  filtros: {
    dev: { rotulo: 'DescriÃ§Ã£o', valor: 'oxi' },
    mock: { rotulo: 'CÃ³digo do Sistema', valor: 'V' },
  },
  colunaOrdenavel: 'CÃ³digo Sistema',
};

export const PATOLOGIAS_TERMAIS: TelaDadosReferencia = {
  item: 'patologias-termais',
  nome: 'Patologias Termais',
  passoA1: 'A.1.11',
  requisito: 'RF57',
  rota: '/dados-referencia/patologias-termais',
  filtros: {
    dev: { rotulo: 'CÃ³digo patologia', valor: '0' },
    mock: { rotulo: 'CÃ³digo patologia', valor: 'R' },
  },
  colunaOrdenavel: 'CÃ³digo',
};

export const EXAMES_MCDT: TelaDadosReferencia = {
  item: 'exames-mcdt',
  nome: 'Exames MCDT',
  passoA1: 'A.1.12',
  requisito: 'RF28',
  rota: '/mcdts/exames',
  filtros: {
    dev: { rotulo: 'Ãrea MCDT', valor: 'AnÃ¡lises ClÃ­nicas', tipo: 'combobox' },
    mock: { rotulo: 'Ãrea MCDT', valor: 'Patologia ClÃ­nica', tipo: 'combobox' },
  },
  colunaOrdenavel: 'CÃ³digo Exame',
};

export const DIPLOMAS: TelaDadosReferencia = {
  item: 'diplomas',
  nome: 'Diplomas',
  requisito: 'RF57',
  rota: '/dados-referencia/diplomas',
  filtros: {
    dev: { rotulo: 'DescriÃ§Ã£o', valor: 'despacho' },
    mock: { rotulo: 'CÃ³digo do Diploma', valor: 'DESP' },
  },
  colunaOrdenavel: 'CÃ³digo',
};

/** Filtro da tela no ambiente corrente (`qua` usa o de `dev`). */
export function filtroDaTela(tela: TelaDadosReferencia): FiltroTela | undefined {
  if (!tela.filtros) return undefined;
  return AMBIENTE === 'mock' ? tela.filtros.mock : tela.filtros.dev;
}

/** Roteiro de origem â€” caminho relativo Ã  raiz `mptech/`. */
export const ROTEIRO_PADROES_UI =
  'CCM/QA/Testes/PDT/Testes manuais/24-09-2026-ajustes-gerais/roteiro-testes-deploy-dados-referencia-padroes-ui.md';

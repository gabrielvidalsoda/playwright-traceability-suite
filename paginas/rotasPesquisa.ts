import {
  CNPEM,
  CONVENCOES,
  DIPLOMAS,
  EFR,
  EMBALAGENS_MEDICAMENTOS,
  EXAMES_MCDT,
  LOCAIS_PRESCRICAO,
  MEDICOS_PRESCRITORES,
  PATOLOGIAS_TERMAIS,
  SERVICOS_DISPENSA_PROXIMIDADE,
  SISTEMAS_CRD,
  TIPOS_PRECO_HEMODIALISE,
  TROCA_SERINGAS,
  VACINAS,
  type TelaDadosReferencia,
} from './dadosReferencia/telas';

/**
 * Os **52 ecrãs de pesquisa** usados nos casos transversais das tarefas de padrão
 * (`TASK-20260928-01`, `-10`, `-13`): lista da §4.1 do plano
 * `docs/ready-for-test-taiga-09-10-2026/plano-validacao-ready-for-test.md`.
 *
 * Rotas e rótulos confirmados em `ccmsns-ui` `origin/develop` (só leitura):
 * `src/layout/MainLayout.tsx` (menu) e `src/router/routes.types.ts` (rotas), a 13-10-2026.
 * Desde a PR #71 (08-10) o grupo «Consulta por Área de Prestação» chama-se «Área de Prestação».
 *
 * Definida num só sítio para reuso — não duplicar esta lista noutros specs.
 */

export type GrupoPesquisa = 'area-prestacao' | 'dados-referencia' | 'conferencia' | 'gestao-armazem';

export const NOME_GRUPO: Record<GrupoPesquisa, string> = {
  'area-prestacao': 'Área de Prestação',
  'dados-referencia': 'Dados de Referência',
  conferencia: 'Conferência',
  'gestao-armazem': 'Gestão de Armazém',
};

export interface EcraPesquisa {
  grupo: GrupoPesquisa;
  /** Caminho no menu abaixo do grupo (Item › Rótulo), com os títulos do `MainLayout.tsx`. */
  menu: string;
  rota: string;
  /** Tela de Dados de Referência com massa de dev (`telas.ts`), quando existe. */
  telaDR?: TelaDadosReferencia;
}

const ap = (menu: string, rota: string): EcraPesquisa => ({ grupo: 'area-prestacao', menu, rota });
const dr = (menu: string, tela: TelaDadosReferencia): EcraPesquisa => ({
  grupo: 'dados-referencia',
  menu,
  rota: tela.rota,
  telaDR: tela,
});
const conf = (menu: string, rota: string): EcraPesquisa => ({ grupo: 'conferencia', menu, rota });
const arm = (menu: string, rota: string): EcraPesquisa => ({ grupo: 'gestao-armazem', menu, rota });

export const ECRAS_PESQUISA: readonly EcraPesquisa[] = [
  // --- Área de Prestação (26; a §4.1 diz 27 no cabeçalho, mas enumera 26) ---------------------
  ap('Medicamentos › Facturas', '/medicamentos/factura'),
  ap('Medicamentos › Lotes', '/medicamentos/lote'),
  ap('Medicamentos › Prestações', '/medicamentos/prestacoes'),
  ap('MCDT › Facturas', '/mcdts/factura'),
  ap('MCDT › Lotes', '/mcdts/lote'),
  ap('MCDT › Prestações', '/mcdts/prescricao'),
  ap('MCDT › Prestação IPATIMUP', '/mcdts/prestacoes-ipatimup'),
  ap('Cuidados Respiratórios Domiciliários › Facturas', '/cuidados-respiratorios/factura'),
  ap('Cuidados Respiratórios Domiciliários › Lotes', '/cuidados-respiratorios/lote'),
  ap('Cuidados Respiratórios Domiciliários › Prestações', '/cuidados-respiratorios/prestacao'),
  ap('Cuidados Continuados › Facturas', '/cuidados-continuados/factura'),
  ap('Hemodiálise › Facturas', '/hemodialise/factura'),
  ap('Hemodiálise › Prestações', '/hemodialise/prestacao'),
  ap('Unidades Terapêuticas de Sangue › Facturas', '/uts/factura'),
  ap('Unidades Terapêuticas de Sangue › Prestações', '/uts/prestacao'),
  ap('Tratamentos Termais › Facturas', '/tratamentos-termais/factura'),
  ap('Tratamentos Termais › Lotes', '/tratamentos-termais/lote'),
  ap('Tratamentos Termais › Prestações', '/tratamentos-termais/prestacao'),
  ap('Saúde Oral › Facturas', '/saude-oral/factura'),
  ap('Saúde Oral › Prestações', '/saude-oral/prestacoes'),
  ap('Vacinas › Facturas', '/vacinas/factura'),
  ap('Vacinas › Prestações', '/vacinas/prestacao'),
  ap('Dispensa em Proximidade › Facturas', '/dispensa-proximidade/factura'),
  ap('Dispensa em Proximidade › Lotes', '/dispensa-proximidade/lote'),
  ap('Dispensa em Proximidade › Prestações', '/dispensa-proximidade/prestacao'),
  ap('Programa Troca de Seringas › Facturas', '/troca-seringas/factura'),

  // --- Dados de Referência (14: as 13 de telas.ts + Exames MCDT; total 26+14+4+8 = 52) ----------
  // «Tipos de Cuidados Continuados» está no menu mas não na §4.1 nem em telas.ts — fica de fora.
  dr('Convenções', CONVENCOES),
  dr('Embalagens e Medicamentos', EMBALAGENS_MEDICAMENTOS),
  dr('CNPEM', CNPEM),
  dr('Diplomas / Despachos', DIPLOMAS),
  dr('Médicos / Prescritores', MEDICOS_PRESCRITORES),
  dr('Exames MCDT', EXAMES_MCDT),
  dr('Sistemas CRD', SISTEMAS_CRD),
  dr('Tipos de Preço Hemodiálise', TIPOS_PRECO_HEMODIALISE),
  dr('Patologias Termais', PATOLOGIAS_TERMAIS),
  dr('Vacinas', VACINAS),
  dr('Serviços Dispensa em Proximidade', SERVICOS_DISPENSA_PROXIMIDADE),
  dr('Programa Troca de Seringas', TROCA_SERINGAS),
  dr('Locais de Prescrição', LOCAIS_PRESCRICAO),
  dr('EFR — Entidade Financeira Responsável', EFR),

  // --- Conferência (4, âmbito da TASK-08) -----------------------------------------------------
  conf('Conferência manual: worklist', '/conferencia/worklist'),
  conf('Conferência manual: supervisão', '/conferencia/supervisao'),
  conf('Workflows de conferência', '/motor-regras/workflows'),
  conf('Regras de conferência', '/motor-regras/regras'),

  // --- Gestão de Armazém (8) ------------------------------------------------------------------
  arm('Registo de Entrada', '/armazem/registo-entrada'),
  arm('Registo de Entrada ANF', '/armazem/guia-anf'),
  arm('Associação à Caixa — Listagem', '/armazem/associacao-caixa/listagem'),
  arm('Preparação', '/armazem/preparacao'),
  arm('Transferência para Arquivo Temporário', '/armazem/transferencia-arquivo-temporario'),
  arm('Picking para Expedição', '/picking-expedicao'),
  arm('Facturas com Incidência', '/gestao-armazem/faturas-incidencia'),
  arm('Localizar / Corrigir', '/arquivo'),
];

/** Ecrãs de um grupo, pela ordem do menu. */
export function ecrasDoGrupo(grupo: GrupoPesquisa): EcraPesquisa[] {
  return ECRAS_PESQUISA.filter((e) => e.grupo === grupo);
}

/** Nome legível do ecrã para títulos de teste: «Grupo › Item › Rótulo (rota)». */
export function nomeEcra(e: EcraPesquisa): string {
  return `${NOME_GRUPO[e.grupo]} › ${e.menu} (${e.rota})`;
}

/**
 * Massa de teste por ambiente.
 *
 *  - `mock` : valores do seed determinÃ­stico do ccmsns-ui
 *             (`src/mocks/medicamentos/seed.ts`):
 *               Â· faturas  `F20250001`..`F20250035` (35), estado em ciclo de 5,
 *                 NIF/farmÃ¡cia em ciclo de 5 â†’ 7 faturas por NIF.
 *               Â· lotes    60, `factura = faturas[idx % 35]` â†’ `F20250001` tem 2 lotes.
 *               Â· receitas `R<nÂºLote><NNN>` â†’ lote 1 â‡’ `R1001`..`R1004`.
 *  - `qua`  : valores reais a extrair da BD QUA com
 *             `CCM/QA/consultas/massa-consulta-area-prestacao.sql` (VPN Traceability Suite, ACCQUA).
 *
 * Ambiente escolhido por `process.env.AMBIENTE` (default `mock`).
 */

/**
 * `dev` â€” ambiente de desenvolvimento publicado (https://app.example.internal, antes http://app.example.internal), usado
 * pelos testes de Dados de ReferÃªncia (`testes/dados-referencia/`, massa prÃ³pria em
 * `paginas/dadosReferencia/telas.ts`). Para a massa de Medicamentos usa a de `qua`.
 */
export type Ambiente = 'mock' | 'qua' | 'dev';

interface MassaAmbiente {
  /** CT-FAT-NUMERO â€” pesquisa de fatura por nÃºmero. */
  faturaPorNumero: {
    numeroFatura: string;
    nifPrestador: string;
    estadoDescricao: string;
  };
  /** CT-FAT-NIF â€” pesquisa de faturas por NIF do prestador. */
  faturaPorNif: {
    nifPrestador: string;
    /** NÂº de faturas esperadas para este NIF (mock: 35/5). */
    totalEsperado: number;
  };
  /** CT-FAT-ESTADO â€” filtro por Estado. */
  faturaPorEstado: {
    /** RÃ³tulo da opÃ§Ã£o no dropdown (mock: catÃ¡logo `ESTADOS_MOCK`). */
    opcao: string;
    /** Texto do estado na cÃ©lula da grelha (mock: `descricaoEstado`). */
    descricaoNaGrelha: string;
  };
  /** CT-FAT-PAGINACAO â€” pesquisa ampla que devolve vÃ¡rias pÃ¡ginas. */
  faturaAmpla: {
    numeroFatura: string;
    totalEsperado: number;
    tamanhoPagina: number;
  };
  /** CT-FAT-DETALHE-ABRIR â€” abertura do detalhe a partir da pesquisa. */
  faturaComDetalhe: {
    numeroFatura: string;
  };
  /** CT-FAT-DETALHE-INEXISTENTE â€” id que nÃ£o existe. */
  faturaIdInexistente: string;
  /** CT-LOT-NUMERO-FATURA â€” pesquisa de lotes por nÃºmero de fatura. */
  lotePorNumeroFatura: {
    numeroFatura: string;
    totalLotesEsperado: number;
  };
  /** CT-PRE-RECEITA â€” pesquisa de prestaÃ§Ã£o por nÃºmero de receita. */
  prestacaoPorReceita: {
    numeroReceita: string;
  };

  // --- casos adicionais (plano-de-testes / caixa-preta) ---

  /** CT-FAT-PROCESSO â€” pesquisa de fatura por nÃºmero do processo. */
  faturaPorProcesso: {
    numeroProcesso: string;
    numeroFaturaEsperado: string;
  };
  /** CT-FAT-DATA-MES â€” Data da Fatura filtra o mÃªs inteiro. */
  faturaPorMes: {
    dia: string; // dd/mm/aaaa introduzido no datepicker
    mesIso: string; // aaaa-mm esperado nas linhas
  };
  /** CT-FAT-COMBINADO â€” NIF + Data + Estado (E lÃ³gico). */
  faturaCombinado: {
    nifPrestador: string;
    dia: string; // dd/mm/aaaa
    estadoOpcao: string;
    estadoNaGrelha: string;
  };
  /** CT-FAT-CCE â€” fatura Conferida Com Erros (detalhe). */
  faturaComErros: {
    numeroFatura: string;
    estadoNaGrelha: string;
  };
  /** CT-LOT-TIPO-NUMERO-LOTE â€” Tipo de Lote + NÃºmero de Lote. */
  lotePorTipoNumero: {
    tipoLote: string;
    numeroLote: string;
  };
  /** CT-LOT-DETALHE â€” abertura do detalhe de um lote. */
  loteComDetalhe: {
    numeroFatura: string;
  };
  /** CT-PRE-NUMERO-FATURA â€” pesquisa de prestaÃ§Ãµes por nÃºmero de fatura. */
  prestacaoPorNumeroFatura: {
    numeroFatura: string;
    totalMinimoEsperado: number;
  };
}

const MASSA: Record<Exclude<Ambiente, 'dev'>, MassaAmbiente> = {
  mock: {
    faturaPorNumero: {
      numeroFatura: 'F20250002',
      nifPrestador: '503456789',
      estadoDescricao: 'Verificada',
    },
    faturaPorNif: { nifPrestador: '501234567', totalEsperado: 7 },
    faturaPorEstado: { opcao: 'Conferida', descricaoNaGrelha: 'Conferida Sem Erros' },
    faturaAmpla: { numeroFatura: 'F2025', totalEsperado: 35, tamanhoPagina: 10 },
    faturaComDetalhe: { numeroFatura: 'F20250002' },
    faturaIdInexistente: '000000000',
    lotePorNumeroFatura: { numeroFatura: 'F20250001', totalLotesEsperado: 2 },
    prestacaoPorReceita: { numeroReceita: 'R1001' },

    faturaPorProcesso: { numeroProcesso: '10001', numeroFaturaEsperado: 'F20250002' },
    faturaPorMes: { dia: '15/02/2025', mesIso: '2025-02' },
    faturaCombinado: {
      nifPrestador: '501234567',
      dia: '15/01/2025',
      estadoOpcao: 'Rececionada',
      estadoNaGrelha: 'Recepcionada',
    },
    faturaComErros: { numeroFatura: 'F20250005', estadoNaGrelha: 'Conferida Com Erros' },
    lotePorTipoNumero: { tipoLote: 'Receita Manual', numeroLote: '1' },
    loteComDetalhe: { numeroFatura: 'F20250001' },
    prestacaoPorNumeroFatura: { numeroFatura: 'F20250001', totalMinimoEsperado: 1 },
  },

  // [A PREENCHER] com valores reais de QUA (ver .sql). Deixado incompleto de propÃ³sito.
  qua: {
    faturaPorNumero: { numeroFatura: 'E017-1', nifPrestador: '', estadoDescricao: '' },
    faturaPorNif: { nifPrestador: '', totalEsperado: 0 },
    faturaPorEstado: { opcao: 'Conferida Sem Erros', descricaoNaGrelha: 'Conferida Sem Erros' },
    faturaAmpla: { numeroFatura: '', totalEsperado: 0, tamanhoPagina: 10 },
    faturaComDetalhe: { numeroFatura: 'E017-1' },
    faturaIdInexistente: '000000000',
    lotePorNumeroFatura: { numeroFatura: '', totalLotesEsperado: 0 },
    prestacaoPorReceita: { numeroReceita: '' },
    faturaPorProcesso: { numeroProcesso: '', numeroFaturaEsperado: '' },
    faturaPorMes: { dia: '', mesIso: '' },
    faturaCombinado: { nifPrestador: '', dia: '', estadoOpcao: '', estadoNaGrelha: '' },
    faturaComErros: { numeroFatura: '', estadoNaGrelha: 'Conferida Com Erros' },
    lotePorTipoNumero: { tipoLote: '', numeroLote: '' },
    loteComDetalhe: { numeroFatura: '' },
    prestacaoPorNumeroFatura: { numeroFatura: '', totalMinimoEsperado: 1 },
  },
};

export const AMBIENTE: Ambiente =
  process.env.AMBIENTE === 'qua' || process.env.AMBIENTE === 'dev' ? process.env.AMBIENTE : 'mock';

export function massa(): MassaAmbiente {
  return MASSA[AMBIENTE === 'dev' ? 'qua' : AMBIENTE];
}

import { type Locator, type Page } from '@playwright/test';
import { abrirRota } from './appMock';

/**
 * Page object do detalhe da fatura de Medicamentos (`/medicamentos/factura/:id`).
 *
 * Tela **somente leitura**: os campos são `paragraph`, não inputs. As únicas ações
 * são navegação (breadcrumb "Facturas", abas "Informações"/"Lotes") e o visualizador
 * de documento. Não há botões "Guardar"/"Conferir"/"Devolver"/"Anular"/"Marcar como…".
 */
export class PaginaDetalheFaturaMedicamentos {
  constructor(private readonly page: Page) {}

  async abrirPorId(id: string | number): Promise<void> {
    await abrirRota(this.page, `/medicamentos/factura/${id}`);
  }

  titulo(): Locator {
    return this.page.getByRole('heading', { name: 'Factura de Medicamentos' });
  }
  blocoTotaisComunicados(): Locator {
    return this.page.getByRole('heading', { name: 'Totais Comunicados' });
  }
  blocoTotaisApurados(): Locator {
    return this.page.getByRole('heading', { name: 'Totais Apurados' });
  }
  abaInformacoes(): Locator {
    return this.page.getByRole('tab', { name: 'Informações' });
  }
  abaLotes(): Locator {
    return this.page.getByRole('tab', { name: 'Lotes' });
  }
  mensagemNaoEncontrada(): Locator {
    return this.page.getByText('Factura não encontrada.');
  }

  // --- aba "Informações" (resultados de conferência — RF#32) ---
  blocoInformacaoComunicada(): Locator {
    return this.page.getByRole('heading', { name: 'Informação Comunicada' });
  }
  blocoInformacaoConferida(): Locator {
    return this.page.getByRole('heading', { name: 'Informação Conferida' });
  }
  blocoDiferencas(): Locator {
    return this.page.getByRole('heading', { name: 'Diferenças' });
  }
  blocoErros(): Locator {
    return this.page.getByRole('heading', { name: 'Erros' });
  }

  /**
   * Tabela de uma das quatro primeiras secções da aba "Informações" (ordem fixa
   * no JSX de `FacturaMedDetalhePage.tsx`: Comunicada, Conferida, Diferenças,
   * Erros — cada uma o seu próprio `<table>`, sem `data-testid` nem landmark a
   * associar ao título). Indexada pela posição porque a `Seccao` não expõe
   * `role=region`.
   */
  tabelaInformacao(secao: 'comunicada' | 'conferida' | 'diferencas' | 'erros'): Locator {
    const indice = { comunicada: 0, conferida: 1, diferencas: 2, erros: 3 }[secao];
    return this.page.getByRole('table').nth(indice);
  }

  /** Linhas de dados (exclui o cabeçalho) da tabela "Erros" da aba "Informações". */
  linhasErros(): Locator {
    return this.tabelaInformacao('erros')
      .getByRole('row')
      .filter({ has: this.page.getByRole('cell') });
  }

  /**
   * Botão "Erros e diferenças" (`FacturaMedDetalhePage.tsx`, rodapé da tela) que
   * navega para a tela dedicada `/medicamentos/factura/:id/erros-diferencas`.
   */
  botaoErrosDiferencas(): Locator {
    return this.page.getByRole('button', { name: 'Erros e diferenças' });
  }

  async abrirErrosDiferencas(): Promise<void> {
    await this.botaoErrosDiferencas().click();
    await this.page.waitForURL(/\/medicamentos\/factura\/\d+\/erros-diferencas$/);
  }

  /**
   * Linha "Total" de uma tabela da aba "Informações" (`buildDetalheLoteRows`
   * acrescenta uma linha com `tipoLote: 'Total'` quando há dados — BUG-20260910-08:
   * hoje só a tabela "Diferenças" mostra essa linha).
   */
  linhaTotal(secao: 'comunicada' | 'conferida' | 'diferencas'): Locator {
    return this.tabelaInformacao(secao)
      .getByRole('row')
      .filter({ has: this.page.getByRole('cell', { name: 'Total', exact: true }) });
  }

  /**
   * Inputs editáveis para os campos de DADOS da fatura (deve ser 0: a tela é de
   * consulta, os valores aparecem como texto). Não conta os inputs utilitários
   * das tabelas (filtro/paginação), que não são campos da fatura.
   */
  camposDadosEditaveis(): Locator {
    return this.page.getByRole('textbox', {
      name: /Número da Factura|Estado|Data da Factura|Data da Facturação|NIF|Total (PVP|PVU|Comp|Fee)/i,
    });
  }

  /**
   * Botões de ação de ESTADO da fatura que não podem existir numa tela de consulta
   * (§1.1 / CA-G-02 do plano). Nome ancorado para não apanhar ações do visualizador
   * de documento (ex. "Guardar imagem").
   */
  botoesDeAccaoProibidos(): Locator {
    return this.page.getByRole('button', {
      name: /^(Guardar|Marcar como verificada|Conferir( factura)?|Devolver( factura)?|Anular( factura)?|Verificar( factura)?)$/i,
    });
  }
}

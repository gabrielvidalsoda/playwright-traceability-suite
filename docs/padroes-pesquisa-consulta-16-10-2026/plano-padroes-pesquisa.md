# Plano de testes automatizados — padrões das pesquisas (Consulta por Área de Prestação)

Generalização, para **todos os ecrãs de pesquisa**, das verificações feitas à mão pelo Douglas na
validação de 15-10-2026: filtros, campos com opções, ordenação e resultados por página. Começa
pelo grupo **Consulta por Área de Prestação**; os outros grupos ficam para uma 2.ª fase (§7).

| Item | Valor |
|---|---|
| Origem | Validação com o Douglas, 15-10-2026 — [transcrição](../../../QA/Testes/Valida%C3%A7%C3%A3o%20Douglas/falhas-ccm-douglas-15-10-2026-transcript.txt), [Pendências de código](../../../QA/Testes/Valida%C3%A7%C3%A3o%20Douglas/CCMSNS_ConsultaPorAreaDePrestacao_Pendencias_de_Codigo.md) (P5, P7, P8, P12, P13, P16), [Rastreio de issues](../../../QA/Testes/Valida%C3%A7%C3%A3o%20Douglas/CCMSNS_ConsultaPorAreaDePrestacao_Rastreio_Issues_2026-10-15.md) |
| Referência do esperado | Documento funcional v02.1 (5.2, 5.3, 5.7); TASK-20261015-03 (parcial vs. exato), TASK-20261015-12 (10/15/25/50, abre com 25), TASK-20261015-14 (parâmetros no URL), TASK-20261015-16 (mensagem de vazio), BUG-20261015-14 (ordenação), TASK-20261015-09/10/11 (listas fixas de Estado) |
| Implementação | [`testes/consulta-area-prestacao/`](../../testes/consulta-area-prestacao/): registo em [`padroes-pesquisa.ts`](../../testes/consulta-area-prestacao/padroes-pesquisa.ts) (chamado em cada `<item>.spec.ts`), famílias em [`padroes-filtros-opcoes.ts`](../../testes/consulta-area-prestacao/padroes-filtros-opcoes.ts) (A, B) e [`padroes-paginacao-ordenacao.ts`](../../testes/consulta-area-prestacao/padroes-paginacao-ordenacao.ts) (C, D), configuração dos 24 ecrãs em [`padroes-pesquisa.config.ts`](../../testes/consulta-area-prestacao/padroes-pesquisa.config.ts), page object [`paginas/pesquisaConsulta.ts`](../../paginas/pesquisaConsulta.ts); quadros transversais em [`quadro-paginacao-consulta.spec.ts`](../../testes/plano-de-testes/quadro-paginacao-consulta.spec.ts) |
| Casos | 703 testes (chromium): uma variante por ecrã e, nos filtros, por campo — ver §9 |
| Data | 16-10-2026 |
| Autor | Gabriel Vidal (QA) |

Legenda do estado: ✅ implementado · 🔜 por implementar · ➖ fora desta fase.

---

## 1. Âmbito

24 ecrãs de pesquisa: os 26 de `ECRAS_CONSULTA` menos os 2 de Unidades Terapêuticas de Sangue,
que saem do menu (TASK-20261015-01).

| Item | Ecrãs | Selects | Ordenação chega ao servidor? (código, 15-10) | Resultados por página hoje |
|---|---|---|---|---|
| Medicamentos | Facturas · Lotes · Prestações | Estado · Tipo de Lote · Tipo de Lote | Sim (Facturas: só 5 das 18 colunas) | 10/15/20 · 10/15/20/50 · 10/15/20/50 (abre com 10) |
| MCDT | Facturas · Lotes · Prestações · Prestação IPATIMUP | Estado · Natureza da Prestação · Área da Prestação | Sim; IPATIMUP **não**; «Factura Papel» ignorada | 10/15/20/50; IPATIMUP 10/15/20 |
| Cuidados Respiratórios Domiciliários | Facturas · Lotes · Prestações | Estado · Tipo de Lote · Tipo de Lote e Tipo de Prescrição | **Não** | 10/25/50/100 (abre com 10) |
| Cuidados Continuados | Facturas | Tipologia Cuidados · Tipo Factura · Estado | **Não** | 10/20/25/50/100 (abre com 20) |
| Hemodiálise | Facturas · Prestações | Estado | **Não** | 10/20/25/50/100 (abre com 20) |
| Tratamentos Termais | Facturas · Lotes · Prestações | Estado (lista fixa) | **Não** | 10/20/25/50/100 · 10/15/20/50 · 10/20/25/50/100 |
| Saúde Oral | Facturas · Prestações | Estado | Sim | 10/15/20/50 (abre com 10) |
| Vacinas | Facturas · Prestações | Estado (lista fixa) | Sim | 10/15/20 (abre com 10) |
| Dispensa em Proximidade | Facturas · Lotes · Prestações | Estado · Tipo de Lote | Sim | 10/20/25/50/100 (abre com 20) |
| Programa Troca de Seringas | Facturas | Estado (lista fixa) | **Não** | 10/20/25/50/100 (abre com 20) |

Todos os ecrãs têm o autocomplete «NIF ou Nome do Prestador».

## 2. Decisões tomadas para este plano

1. **UTS fica fora** (sai do menu pela TASK-20261015-01).
2. **Padrão de resultados por página:** 10 / 15 / 25 / 50, abre com 25 (Rastreio de 15-10, P12).
3. **Parâmetros no URL:** enquanto a TASK-20261015-14 não escolher o nome, os casos verificam a
   **uniformidade** entre ecrãs (o mesmo nome de parâmetro e a mesma numeração da 1.ª página),
   e não um nome em particular.
4. **Falhas já conhecidas:** o caso falha e leva a tag do BUG/TASK conhecido; não se usa
   `test.fail()`. Quando o defeito for corrigido, o caso passa a verde sem alterações.
5. **UC-OPC-04** (comparar as opções com a tabela de domínio por `SELECT`) fica como opcional.
6. **Valores dos filtros:** tirados de uma linha real de uma pesquisa de base, e não de massa
   fixa, para os casos funcionarem no dev sem depender de dados conhecidos.

## 3. Casos de uso — A. Filtros (cada campo filtra, um de cada vez)

Quando o ecrã exige uma combinação mínima de filtros, o campo em teste é combinado com o filtro
mínimo da pesquisa de base.

| ID | Caso de uso | Aplica-se a | Resultado esperado | Camada | Estado |
|---|---|---|---|---|---|
| UC-FIL-01 | Filtro de texto/número por valor exato | Cada campo de texto de cada ecrã | Todas as linhas devolvidas têm o valor pesquisado na coluna correspondente; o registo de origem está entre elas | integração | ✅ |
| UC-FIL-02 | Identificador por conteúdo parcial | Nº factura, nº lote, nº receita/requisição/prescrição | Um excerto do valor devolve o registo de origem e todas as linhas contêm o excerto | integração | ✅ |
| UC-FIL-03 | Código por igualdade exata | NIF, código de prestador, código de convenção | Um excerto **não** devolve o registo; o valor completo devolve | integração | ✅ |
| UC-FIL-04 | Data apanha o dia inteiro | Cada campo de data | Todas as linhas têm essa data; os registos com hora diferente de 00:00 estão incluídos (P13) | integração | ✅ |
| UC-FIL-05 | Filtro select | Cada opção de cada select | Todas as linhas mostram a **descrição** da opção escolhida | integração | ✅ |
| UC-FIL-06 | Prestador (autocomplete) | Cada ecrã | Escolhido um prestador, todas as linhas têm o NIF dele | integração | ✅ |
| UC-FIL-07 | Valor do detalhe usado como filtro | Um identificador por ecrã | Copiar o identificador do detalhe e pesquisar por ele devolve o mesmo registo | integração | 🔜 falta mapear, ecrã a ecrã, o campo do detalhe que corresponde a cada filtro |
| UC-FIL-08 | Filtro sem correspondência | Um campo de texto por ecrã | Grelha vazia com a mensagem padrão de «sem resultados», igual em todos os ecrãs (TASK-20261015-16) | front + integração | ✅ |
| UC-FIL-09 | Pesquisa sem filtros ou com combinação insuficiente | Cada ecrã | Aviso de critério mínimo e nenhum pedido de pesquisa ao servidor | front | ✅ |
| UC-FIL-10 | Limpar | Cada ecrã | «Limpar» esvazia todos os campos, incluindo os selects e o autocomplete | front | ✅ |
| UC-FIL-11 | Filtros sobrevivem ao recarregamento | Cada ecrã | Depois de pesquisar e recarregar, os campos e os resultados mantêm-se (P16) | front | ✅ |

## 4. Casos de uso — B. Campos que carregam opções

| ID | Caso de uso | Aplica-se a | Resultado esperado | Camada | Estado |
|---|---|---|---|---|---|
| UC-OPC-01 | O select abre e mostra opções | Cada select de cada ecrã | A lista tem pelo menos 1 opção, sem opções vazias nem repetidas | front + integração | ✅ |
| UC-OPC-02 | As opções mostram a descrição, não o código | Cada select | Nenhuma opção é só um número nem um identificador interno (ex.: `CONFERIDA_COM_ERROS`) | integração | ✅ |
| UC-OPC-03 | As opções vêm do servidor | Cada select | Há um pedido ao endpoint de domínio e as opções coincidem com a resposta. Falha esperada nas listas fixas de Vacinas, Tratamentos Termais e Troca de Seringas (P8) | integração | ✅ |
| UC-OPC-04 | As opções coincidem com a tabela de domínio | Estado (`TRCFESTADO`) e Tipo de Lote | Opções do ecrã = descrições da tabela, lidas por `SELECT` | integração (opcional) | ➖ |
| UC-OPC-05 | O mesmo domínio mostra as mesmas opções | Tipo de Lote em Lotes e Prestações de Medicamentos; Estado entre áreas | Listas iguais | integração | ✅ |
| UC-OPC-06 | O autocomplete do prestador carrega sugestões | Cada ecrã | Parte do NIF/nome → sugestões da área do ecrã; «Página seguinte» traz mais; «Limpar campo» esvazia | integração | ✅ |
| UC-OPC-07 | Autocomplete sem correspondência | Cada ecrã | Texto inexistente → lista vazia com mensagem, sem erro | front + integração | ✅ |
| UC-OPC-08 | O rótulo do select corresponde ao conteúdo | Cuidados Continuados («Tipologia Cuidados» e «Tipo Factura») | Cada select mostra opções do domínio que o rótulo indica | integração | ✅ |

## 5. Casos de uso — C. Ordenação

| ID | Caso de uso | Aplica-se a | Resultado esperado | Camada | Estado |
|---|---|---|---|---|---|
| UC-ORD-01 | Todas as colunas com indicador ordenam (ascendente) | Cada coluna ordenável de cada ecrã (um teste por ecrã, uma verificação por coluna) | O clique no cabeçalho faz um pedido com a ordenação dessa coluna, `aria-sort="ascending"` e a página 1 fica ordenada | integração | ✅ |
| UC-ORD-02 | O 2.º clique ordena descendente; o 3.º repõe | Cada ecrã | Ordem descendente; ao 3.º clique, sem `aria-sort` | integração | ✅ |
| UC-ORD-03 | A ordenação continua na página seguinte | Cada ecrã | Último valor da página 1 ≤ primeiro valor da página 2 (ascendente) | integração | ✅ |
| UC-ORD-04 | Estado ordena pela descrição | Ecrãs com a coluna Estado | Ordem alfabética da descrição, não do código (P7) | integração | ✅ |
| UC-ORD-05 | A ordenação mantém-se ao mudar de página ou de tamanho | Cada ecrã | Os pedidos seguintes mantêm a ordenação | integração | ✅ |
| UC-ORD-06 | Ordenação no URL | Cada ecrã | A ordenação fica no URL, com o mesmo nome de parâmetro em todos os ecrãs, e mantém-se ao recarregar (P16) | front | ✅ |
| UC-ORD-07 | Só as colunas ordenáveis mostram indicador | Cada ecrã | Derivado do UC-ORD-01: uma coluna com indicador que não ordena é falha (sem caso próprio) | integração | ✅ (no UC-ORD-01) |

## 6. Casos de uso — D. Resultados por página

| ID | Caso de uso | Aplica-se a | Resultado esperado | Camada | Estado |
|---|---|---|---|---|---|
| UC-PAG-01 | Opções do seletor padronizadas | Cada ecrã | «Resultados por página» mostra exatamente 10 / 15 / 25 / 50 | front | ✅ |
| UC-PAG-02 | Valor inicial | Cada ecrã | A grelha abre com 25 | front | ✅ |
| UC-PAG-03 | Cada opção mostra o nº certo de linhas | Cada opção de cada ecrã | Escolher N → pedido com o tamanho N; nº de linhas = mínimo entre N e o total; o total não muda | integração | ✅ |
| UC-PAG-04 | Mudar o tamanho volta à 1.ª página | Cada ecrã | Na página 2, trocar o tamanho leva à 1.ª página | integração | ✅ |
| UC-PAG-05 | Navegação entre páginas | Cada ecrã | A página 2 tem registos diferentes da 1 | integração | ✅ |
| UC-PAG-06 | Página e tamanho no URL, com numeração uniforme | Cada ecrã | Página e tamanho no URL; recarregar mantém-nos; a 1.ª página tem o mesmo número em todos os ecrãs (P16) | front | ✅ |
| UC-PAG-07 | Mudar tamanho ou página mantém os filtros | Cada ecrã | Os pedidos seguintes levam os mesmos filtros | integração | ✅ |
| UC-PAG-08 | Quadro comparativo entre ecrãs | Todos os ecrãs, num só caso | Quadro (anexo ao relatório) com as opções e o valor inicial de cada ecrã; falha se houver mais de um conjunto | front | ✅ |

## 7. Fora desta fase

- Exportação com a ordenação e os filtros em vigor (P7, N4).
- Data em Medicamentos → Facturas (filtra o mês): à espera da decisão dia vs. mês
  (TASK-20261015-19); o caso existente `CT-FAT-DATA-MES` mantém-se.
- Navegação entre factura, lote e prestação (P6), que o Douglas considerou específica de cada área.
- 2.ª fase: as mesmas famílias nos outros grupos (Dados de Referência já tem
  `testeTodasAsColunasOrdenam`/`testeResultadosPorPagina`; Conferência e Gestão de Armazém a
  partir de `paginas/rotasPesquisa.ts`).

## 8. Convenção dos IDs

`CT-CON-<família>-<NN>-<SUFIXO>`, com a família `FIL`, `OPC`, `ORD` ou `PAG`, o número do caso
de uso e o sufixo do ecrã já usado na suíte (`MED-FAT`, `CRD-LOT`, …). Exemplo:
`CT-CON-PAG-01-MED-FAT` = UC-PAG-01 em Medicamentos → Facturas.

## 9. Execução em mock local (16-10-2026)

Execução para **validar os próprios testes**, não para registar defeitos: `ccmsns-ui` local em
modo mock (MSW), ramo `feature/armazem-padronizacao-qa-2309`, 16 commits atrás de
`origin/develop`. Chromium, 6 workers, `--retries=0`, 23 min.

**703 casos: 445 passam, 258 falham, nenhum por timeout nem por rótulo de campo/coluna
inexistente** (a configuração dos 24 ecrãs bate com o DOM).

| Família | Passam | Falham | Leitura das falhas |
|---|---:|---:|---|
| FIL-01 / 04 / 05 / 06 (filtro a filtro) | 99 | 39 | Na maioria, o mock ignora o filtro (MCDT ignora todos; IPATIMUP lê outros nomes de parâmetro; datas ignoradas em Hemodiálise, Termas, Saúde Oral). Achados a confirmar no dev: ver abaixo |
| FIL-02 (parcial) | 33 | 5 | Mock (filtros ignorados) |
| FIL-03 (exato) | 0 | 24 | O mock compara os códigos por conteúdo parcial (`includes`): sem significado em mock |
| FIL-08 a 11 | 92 | 5 | Mock MCDT/IPATIMUP devolve sempre as mesmas linhas |
| OPC-01 a 08 | 98 | 5 | OPC-03: listas fixas de Estado em Vacinas, Termas e Seringas (TASK-20261015-09/10/11) e Saúde Oral; OPC-08: rótulos trocados em Cuidados Continuados |
| ORD-01 a 06 | 49 | 85 | Ordenação não enviada ao servidor em 10 ecrãs, 13 colunas ignoradas em Med Facturas, Estado pelo código (BUG-20261015-14 / P7), ordenação fora do URL (TASK-20261015-14 / P16) |
| PAG-01 a 08 | 74 | 96 | Opções e valor inicial fora do padrão em todos os ecrãs (TASK-20261015-12); seletor de tamanho sem efeito neste build (#1510/#1588); paginação do mock de Termas Facturas |

**Achados a confirmar no dev** (não registados — dependem do código atual e dos dados reais):

1. **O seletor «Resultados por página» não mostra o tamanho em vigor.** Em Cuidados Continuados
   o pedido sai com `tamanho=20` e o URL também, mas o seletor mostra 10.
2. **Estado em Medicamentos → Facturas:** o filtro mostra a descrição da tabela («Rececionada»)
   e a grelha mostra outra tradução fixa («Recepcionada», «Verificada») — confirma o
   BUG-20261015-15 (P8).
3. **Tipo de Lote em Dispensa em Proximidade → Lotes:** as opções do filtro têm o código
   («90 - Dispensa Proximidade») e a grelha não («Dispensa Proximidade»).
4. **MCDT → Facturas:** o valor da coluna «Cód. Convenção» é recusado no filtro «Código do
   Prestador» («Código do prestador inválido (até 20 caracteres alfanuméricos)»).
5. **Medicamentos → Facturas:** a ordenação fica no URL (`ordenar`), mas depois de recarregar o
   cabeçalho deixa de a indicar (`aria-sort="none"`).

**Pesquisas de base no dev:** ainda por calibrar (sem VPN em 16-10-2026). A 1.ª corrida de
integração indica quais servem; os casos sem pesquisa de base ficam «não aplicável», não falham.

### Como correr

```bash
cd CCM/ccmsns-qa-e2e
npm run test:front -- --grep "CT-CON-"          # mock local: só os casos @front
npm run test:integracao -- --grep "CT-CON-"     # dev (VPN): os casos @integracao
```

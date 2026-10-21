# CT-DR-VAC â€” PadrÃµes de UI de Dados de ReferÃªncia: Vacinas

Plano de teste por caso do Item **Vacinas** (`/dados-referencia/vacinas`), para a verificaÃ§Ã£o do deploy das PRs front #50 e #55 e back #31 e #34.

| Campo | Valor |
|---|---|
| Roteiro de origem | [roteiro-testes-deploy-dados-referencia-padroes-ui.md](../../../../QA/Testes/PDT/Testes%20manuais/24-09-2026-ajustes-gerais/roteiro-testes-deploy-dados-referencia-padroes-ui.md), passos A.1.7 e B8 |
| Requisito | RF#57 |
| ImplementaÃ§Ã£o | [`vacinas.spec.ts`](vacinas.spec.ts) |
| Page objects | `paginas/dadosReferencia/` (`PaginaPesquisaDadosReferencia`, `PaginaDetalheDadosReferencia`, `padraoUi`, `formularios`) |
| Ambiente alvo | `dev` â€” http://app.example.internal (tambÃ©m corre em `mock`) |
| Estado | Implementado em 24-09-2026; resultados da 1.Âª execuÃ§Ã£o no [documento-Ã­ndice](../../../docs/deploy-dados-referencia-padroes-ui-24-09-2026/validacao-padroes-ui.md) |

## Casos

| ID | O que verifica | Natureza | Tipo |
|---|---|---|---|
| `CT-DR-A.1.7` | ConferÃªncia rÃ¡pida do padrÃ£o: A01 â†’ pesquisar â†’ A07 + A08 â†’ detalhe â†’ A12 | positivo | interface |
| `CT-DR-B8.1` | Exportar descarrega o XLSX com as colunas cÃ³digo, descriÃ§Ã£o e cÃ³digo de origem | positivo | caixa-preta |
| `CT-DR-B8.2` | Ordenar e ir para a pÃ¡gina 2: ordenaÃ§Ã£o no servidor | positivo | caixa-preta |
| `CT-DR-B8.3` | PreÃ§os, Regras de Idade e ConvenÃ§Ãµes colapsÃ¡veis e ordenÃ¡veis | positivo | caixa-preta |
| `CT-DR-B8.4` | PreÃ§o mÃ¡ximo menor que o mÃ­nimo: validaÃ§Ã£o e o filtro nÃ£o Ã© aplicado | negativo | caixa-preta |
| `CT-DR-B8.5` | PreÃ§o negativo ou data fim anterior Ã  data inÃ­cio: validaÃ§Ã£o | negativo | caixa-preta |
| `CT-DR-B8.6` | Intervalo de preÃ§os vÃ¡lido mostra sÃ³ os preÃ§os dentro do intervalo | positivo | caixa-preta |

## Notas de implementaÃ§Ã£o

- B8.1: verifica as colunas pedidas no corpo do POST de exportaÃ§Ã£o (`codigo`, `descricao`, `codigoOrigem`).
- B8.5: se o campo de preÃ§o nÃ£o aceitar o sinal "-", o teste regista "nÃ£o aplicÃ¡vel" (o preÃ§o negativo nem chega a ser introduzido) em vez de procurar a mensagem.
- As datas do filtro de preÃ§os sÃ£o escritas e confirmadas com Tab: Enter no campo "Data InÃ­cio" apaga a data (ver observaÃ§Ã£o no documento-Ã­ndice).

## Como correr

```bash
AMBIENTE=dev PW_NO_SERVER=1 BASE_URL=http://app.example.internal \
  npx playwright test testes/dados-referencia/vacinas --project=chromium
```

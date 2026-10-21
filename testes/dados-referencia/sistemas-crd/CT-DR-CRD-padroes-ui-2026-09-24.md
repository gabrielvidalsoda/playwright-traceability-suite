# CT-DR-CRD â€” PadrÃµes de UI de Dados de ReferÃªncia: Sistemas CRD

Plano de teste por caso do Item **Sistemas CRD** (`/dados-referencia/sistemas-crd`), para a verificaÃ§Ã£o do deploy das PRs front #50 e #55 e back #31 e #34.

| Campo | Valor |
|---|---|
| Roteiro de origem | [roteiro-testes-deploy-dados-referencia-padroes-ui.md](../../../../QA/Testes/PDT/Testes%20manuais/24-09-2026-ajustes-gerais/roteiro-testes-deploy-dados-referencia-padroes-ui.md), passos A.1.10 e B11 |
| Requisito | RF#57 |
| ImplementaÃ§Ã£o | [`sistemas-crd.spec.ts`](sistemas-crd.spec.ts) |
| Page objects | `paginas/dadosReferencia/` (`PaginaPesquisaDadosReferencia`, `PaginaDetalheDadosReferencia`, `padraoUi`, `formularios`) |
| Ambiente alvo | `dev` â€” http://app.example.internal (tambÃ©m corre em `mock`) |
| Estado | Implementado em 24-09-2026; resultados da 1.Âª execuÃ§Ã£o no [documento-Ã­ndice](../../../docs/deploy-dados-referencia-padroes-ui-24-09-2026/validacao-padroes-ui.md) |

## Casos

| ID | O que verifica | Natureza | Tipo |
|---|---|---|---|
| `CT-DR-A.1.10` | ConferÃªncia rÃ¡pida do padrÃ£o: A01 â†’ pesquisar â†’ A07 + A08 â†’ detalhe â†’ A12 | positivo | interface |
| `CT-DR-B11.1` | Ordenar e Exportar: descarrega o XLSX | positivo | caixa-preta |
| `CT-DR-B11.2` | CabeÃ§alho h1 e as 4 listas sÃ£o painÃ©is colapsÃ¡veis num cartÃ£o | positivo | interface |
| `CT-DR-B11.3` | Ordenar PreÃ§os, Locais e Semelhantes; em Semelhantes a ordem mantÃ©m-se entre pÃ¡ginas | positivo | caixa-preta |

## Notas de implementaÃ§Ã£o

- B11.1: sÃ³ verifica que o XLSX Ã© descarregado. ValidaÃ§Ã£o manual de 28-09-2026 (F1/F7): **nÃ£o Ã© esperado que a exportaÃ§Ã£o siga a ordenaÃ§Ã£o da tabela** â€” a verificaÃ§Ã£o do `sort` no pedido de exportaÃ§Ã£o foi retirada.

## Como correr

```bash
AMBIENTE=dev PW_NO_SERVER=1 BASE_URL=http://app.example.internal \
  npx playwright test testes/dados-referencia/sistemas-crd --project=chromium
```

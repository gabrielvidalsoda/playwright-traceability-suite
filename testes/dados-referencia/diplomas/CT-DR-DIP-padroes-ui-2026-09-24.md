# CT-DR-DIP â€” PadrÃµes de UI de Dados de ReferÃªncia: Diplomas / Despachos

Plano de teste por caso do Item **Diplomas / Despachos** (`/dados-referencia/diplomas`), para a verificaÃ§Ã£o do deploy das PRs front #50 e #55 e back #31 e #34.

| Campo | Valor |
|---|---|
| Roteiro de origem | [roteiro-testes-deploy-dados-referencia-padroes-ui.md](../../../../QA/Testes/PDT/Testes%20manuais/24-09-2026-ajustes-gerais/roteiro-testes-deploy-dados-referencia-padroes-ui.md), passos B13 |
| Requisito | RF#57 |
| ImplementaÃ§Ã£o | [`diplomas.spec.ts`](diplomas.spec.ts) |
| Page objects | `paginas/dadosReferencia/` (`PaginaPesquisaDadosReferencia`, `PaginaDetalheDadosReferencia`, `padraoUi`, `formularios`) |
| Ambiente alvo | `dev` â€” http://app.example.internal (tambÃ©m corre em `mock`) |
| Estado | Implementado em 24-09-2026; resultados da 1.Âª execuÃ§Ã£o no [documento-Ã­ndice](../../../docs/deploy-dados-referencia-padroes-ui-24-09-2026/validacao-padroes-ui.md) |

## Casos

| ID | O que verifica | Natureza | Tipo |
|---|---|---|---|
| `CT-DR-B13.1` | Ãcones de aÃ§Ã£o na cor primÃ¡ria e botÃ£o "Adicionar" com o estilo secundÃ¡rio | positivo | interface |

## Notas de implementaÃ§Ã£o

- B13.1: o critÃ©rio de "Adicionar secundÃ¡rio" aplica-se ao "Adicionar" da utilizaÃ§Ã£o (detalhe), alterado na PR #55. O "Adicionar diploma" da pesquisa Ã© primÃ¡rio e fica registado como `observacao` para confirmar.

## Como correr

```bash
AMBIENTE=dev PW_NO_SERVER=1 BASE_URL=http://app.example.internal \
  npx playwright test testes/dados-referencia/diplomas --project=chromium
```

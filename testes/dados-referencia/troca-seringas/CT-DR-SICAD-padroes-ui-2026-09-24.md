# CT-DR-SICAD â€” PadrÃµes de UI de Dados de ReferÃªncia: Programa Troca de Seringas (ConvenÃ§Ãµes SICAD)

Plano de teste por caso do Item **Programa Troca de Seringas (ConvenÃ§Ãµes SICAD)** (`/dados-referencia/troca-seringas`), para a verificaÃ§Ã£o do deploy das PRs front #50 e #55 e back #31 e #34.

| Campo | Valor |
|---|---|
| Roteiro de origem | [roteiro-testes-deploy-dados-referencia-padroes-ui.md](../../../../QA/Testes/PDT/Testes%20manuais/24-09-2026-ajustes-gerais/roteiro-testes-deploy-dados-referencia-padroes-ui.md), passos A.1.2 e B3 |
| Requisito | RF#57 |
| ImplementaÃ§Ã£o | [`troca-seringas.spec.ts`](troca-seringas.spec.ts) |
| Page objects | `paginas/dadosReferencia/` (`PaginaPesquisaDadosReferencia`, `PaginaDetalheDadosReferencia`, `padraoUi`, `formularios`) |
| Ambiente alvo | `dev` â€” http://app.example.internal (tambÃ©m corre em `mock`) |
| Estado | Implementado em 24-09-2026; resultados da 1.Âª execuÃ§Ã£o no [documento-Ã­ndice](../../../docs/deploy-dados-referencia-padroes-ui-24-09-2026/validacao-padroes-ui.md) |

## Casos

| ID | O que verifica | Natureza | Tipo |
|---|---|---|---|
| `CT-DR-A.1.2` | ConferÃªncia rÃ¡pida do padrÃ£o: A01 â†’ pesquisar â†’ A07 + A08 â†’ detalhe â†’ A12 | positivo | interface |
| `CT-DR-B3.1` | TÃ­tulo "Pesquisa ConvenÃ§Ãµes SICAD / Kits" | positivo | caixa-preta |
| `CT-DR-B3.2` | Aviso de filtros e erro do serviÃ§o aparecem em mensagens separadas | negativo | caixa-preta |
| `CT-DR-B3.3` | "Ir para facturas" no cabeÃ§alho (nÃ£o no rodapÃ©) e preÃ§os unitÃ¡rios num painel colapsÃ¡vel e ordenÃ¡vel | positivo | interface |
| `CT-DR-B3.4` | "Ir para facturas" abre as faturas filtradas por esse cÃ³digo | positivo | caixa-preta |

## Notas de implementaÃ§Ã£o

- B3.2: o erro do serviÃ§o Ã© simulado com `page.route` (resposta 500 Ã  pesquisa) â€” sÃ³ possÃ­vel fora do modo mock.
- B3.3: a lista de preÃ§os unitÃ¡rios ordena no cliente (nÃ£o Ã© paginada pelo core-api).

## Como correr

```bash
AMBIENTE=dev PW_NO_SERVER=1 BASE_URL=http://app.example.internal \
  npx playwright test testes/dados-referencia/troca-seringas --project=chromium
```

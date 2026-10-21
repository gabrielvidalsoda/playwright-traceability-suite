# CT-DR-LOC â€” PadrÃµes de UI de Dados de ReferÃªncia: Locais de PrescriÃ§Ã£o

Plano de teste por caso do Item **Locais de PrescriÃ§Ã£o** (`/dados-referencia/locais-prescricao`), para a verificaÃ§Ã£o do deploy das PRs front #50 e #55 e back #31 e #34.

| Campo | Valor |
|---|---|
| Roteiro de origem | [roteiro-testes-deploy-dados-referencia-padroes-ui.md](../../../../QA/Testes/PDT/Testes%20manuais/24-09-2026-ajustes-gerais/roteiro-testes-deploy-dados-referencia-padroes-ui.md), passos A.1.5 e B6 |
| Requisito | RF#57 |
| ImplementaÃ§Ã£o | [`locais-prescricao.spec.ts`](locais-prescricao.spec.ts) |
| Page objects | `paginas/dadosReferencia/` (`PaginaPesquisaDadosReferencia`, `PaginaDetalheDadosReferencia`, `padraoUi`, `formularios`) |
| Ambiente alvo | `dev` â€” http://app.example.internal (tambÃ©m corre em `mock`) |
| Estado | Implementado em 24-09-2026; resultados da 1.Âª execuÃ§Ã£o no [documento-Ã­ndice](../../../docs/deploy-dados-referencia-padroes-ui-24-09-2026/validacao-padroes-ui.md) |

## Casos

| ID | O que verifica | Natureza | Tipo |
|---|---|---|---|
| `CT-DR-A.1.5` | ConferÃªncia rÃ¡pida do padrÃ£o: A01 â†’ pesquisar â†’ A07 + A08 â†’ detalhe â†’ A12 | positivo | interface |
| `CT-DR-B6.1` | "Autorizado para" no grid de filtros, tabela com tÃ­tulo, data de referÃªncia vazia | positivo | caixa-preta |
| `CT-DR-B6.2` | Ordenar por SNS e por Ativo | positivo | caixa-preta |
| `CT-DR-B6.3` | Breadcrumb com o rÃ³tulo novo, cabeÃ§alho h1 com "Exportar Excel" no topo, Voltar no rodapÃ© | positivo | interface |
| `CT-DR-B6.4` | Os 6 blocos sÃ£o tabelas padrÃ£o colapsÃ¡veis e ordenÃ¡veis; vigÃªncia em texto | positivo | caixa-preta |
| `CT-DR-B6.5` | "Exportar Excel" descarrega o XLSX | positivo | caixa-preta |

## Como correr

```bash
AMBIENTE=dev PW_NO_SERVER=1 BASE_URL=http://app.example.internal \
  npx playwright test testes/dados-referencia/locais-prescricao --project=chromium
```

# CT-DR-HD â€” PadrÃµes de UI de Dados de ReferÃªncia: Tipos de PreÃ§o HemodiÃ¡lise

Plano de teste por caso do Item **Tipos de PreÃ§o HemodiÃ¡lise** (`/dados-referencia/tipos-preco-hemodialise`), para a verificaÃ§Ã£o do deploy das PRs front #50 e #55 e back #31 e #34.

| Campo | Valor |
|---|---|
| Roteiro de origem | [roteiro-testes-deploy-dados-referencia-padroes-ui.md](../../../../QA/Testes/PDT/Testes%20manuais/24-09-2026-ajustes-gerais/roteiro-testes-deploy-dados-referencia-padroes-ui.md), passos A.1.8, B9 e Parte C (C01/C02/C06) |
| Requisito | RF#57 |
| ImplementaÃ§Ã£o | [`tipos-preco-hemodialise.spec.ts`](tipos-preco-hemodialise.spec.ts) |
| Page objects | `paginas/dadosReferencia/` (`PaginaPesquisaDadosReferencia`, `PaginaDetalheDadosReferencia`, `padraoUi`, `formularios`) |
| Ambiente alvo | `dev` â€” http://app.example.internal (tambÃ©m corre em `mock`) |
| Estado | Implementado em 24-09-2026; resultados da 1.Âª execuÃ§Ã£o no [documento-Ã­ndice](../../../docs/deploy-dados-referencia-padroes-ui-24-09-2026/validacao-padroes-ui.md) |

## Casos

| ID | O que verifica | Natureza | Tipo |
|---|---|---|---|
| `CT-DR-A.1.8` | ConferÃªncia rÃ¡pida do padrÃ£o: A01 â†’ pesquisar â†’ A07 + A08 â†’ detalhe â†’ A12 | positivo | interface |
| `CT-DR-B9.1` | Ver, Editar e Eliminar numa sÃ³ coluna (a 1.Âª) | positivo | caixa-preta |
| `CT-DR-B9.2` | CabeÃ§alho colapsÃ¡vel; PreÃ§os, ConvenÃ§Ãµes e Subsistemas num Ãºnico cartÃ£o e ordenam | positivo | interface |
| `CT-DR-B9.3` | Filtro de preÃ§os: mesmas validaÃ§Ãµes e filtro de Vacinas (B8.4â€“B8.6) | positivo | caixa-preta |
| `CT-DR-C01-HD` | Novo tipo de preÃ§o: h1, grid padrÃ£o, Guardar ativo, "Voltar" Ã  esquerda | positivo | interface |
| `CT-DR-C02-HD` | Novo tipo de preÃ§o: Guardar com obrigatÃ³rios vazios mostra a mensagem de cada campo e nÃ£o envia | negativo | caixa-preta |
| `CT-DR-C06-HD` | Novo tipo de preÃ§o: "Voltar" regressa Ã  tela anterior sem guardar | positivo | caixa-preta |
| `CT-DR-C01-HD-EDIT` | Editar tipo de preÃ§o: h1, grid padrÃ£o, Guardar ativo, "Voltar" Ã  esquerda | positivo | interface |
| `CT-DR-C02-HD-EDIT` | Editar tipo de preÃ§o: Guardar com obrigatÃ³rios vazios mostra a mensagem de cada campo e nÃ£o envia | negativo | caixa-preta |
| `CT-DR-C06-HD-EDIT` | Editar tipo de preÃ§o: "Voltar" regressa Ã  tela anterior sem guardar | positivo | caixa-preta |
| `CT-DR-C01-HDP` | Novo preÃ§o: h1, grid padrÃ£o, Guardar ativo, "Voltar" Ã  esquerda | positivo | interface |
| `CT-DR-C02-HDP` | Novo preÃ§o: Guardar com obrigatÃ³rios vazios mostra a mensagem de cada campo e nÃ£o envia | negativo | caixa-preta |
| `CT-DR-C06-HDP` | Novo preÃ§o: "Voltar" regressa Ã  tela anterior sem guardar | positivo | caixa-preta |
| `CT-DR-C01-HDP-EDIT` | Editar preÃ§o: h1, grid padrÃ£o, Guardar ativo, "Voltar" Ã  esquerda | positivo | interface |
| `CT-DR-C02-HDP-EDIT` | Editar preÃ§o: Guardar com obrigatÃ³rios vazios mostra a mensagem de cada campo e nÃ£o envia | negativo | caixa-preta |
| `CT-DR-C06-HDP-EDIT` | Editar preÃ§o: "Voltar" regressa Ã  tela anterior sem guardar | positivo | caixa-preta |

## Notas de implementaÃ§Ã£o

- C01 (todas as variantes): desde 08-10-2026 tambÃ©m verifica que nenhuma secÃ§Ã£o do formulÃ¡rio tem Colapsar/Expandir. As secÃ§Ãµes com "Guardar" nÃ£o colapsam (Manual A.5 v4.3, DEC-182, que substitui a DEC-022). Um formulÃ¡rio com colapsar falha este passo e Ã© registÃ¡vel como defeito.
- Parte C: os 4 formulÃ¡rios (tipo e preÃ§o, novo e editar) sÃ³ sÃ£o abertos e validados; todos os POST/PUT/DELETE Ã  API sÃ£o bloqueados e contados (`vigiarEscritas`).
- "Editar preÃ§o" procura, entre os resultados, um tipo de preÃ§o com preÃ§os.

## Como correr

```bash
AMBIENTE=dev PW_NO_SERVER=1 BASE_URL=http://app.example.internal \
  npx playwright test testes/dados-referencia/tipos-preco-hemodialise --project=chromium
```

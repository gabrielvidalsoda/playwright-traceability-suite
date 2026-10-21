# CT-DR-PAT â€” PadrÃµes de UI de Dados de ReferÃªncia: Patologias Termais

Plano de teste por caso do Item **Patologias Termais** (`/dados-referencia/patologias-termais`), para a verificaÃ§Ã£o do deploy das PRs front #50 e #55 e back #31 e #34.

| Campo | Valor |
|---|---|
| Roteiro de origem | [roteiro-testes-deploy-dados-referencia-padroes-ui.md](../../../../QA/Testes/PDT/Testes%20manuais/24-09-2026-ajustes-gerais/roteiro-testes-deploy-dados-referencia-padroes-ui.md), passos A.1.11, B12 e Parte C (C01/C02/C06) |
| Requisito | RF#57 |
| ImplementaÃ§Ã£o | [`patologias-termais.spec.ts`](patologias-termais.spec.ts) |
| Page objects | `paginas/dadosReferencia/` (`PaginaPesquisaDadosReferencia`, `PaginaDetalheDadosReferencia`, `padraoUi`, `formularios`) |
| Ambiente alvo | `dev` â€” http://app.example.internal (tambÃ©m corre em `mock`) |
| Estado | Implementado em 24-09-2026; resultados da 1.Âª execuÃ§Ã£o no [documento-Ã­ndice](../../../docs/deploy-dados-referencia-padroes-ui-24-09-2026/validacao-padroes-ui.md) |

## Casos

| ID | O que verifica | Natureza | Tipo |
|---|---|---|---|
| `CT-DR-A.1.11` | ConferÃªncia rÃ¡pida do padrÃ£o: A01 â†’ pesquisar â†’ A07 + A08 â†’ detalhe â†’ A12 | positivo | interface |
| `CT-DR-B12.1` | As aÃ§Ãµes estÃ£o numa sÃ³ coluna | positivo | caixa-preta |
| `CT-DR-B12.2` | CabeÃ§alho h1, abas no padrÃ£o e "Associar tÃ©cnica" alinhado | positivo | interface |
| `CT-DR-B12.3` | "CondiÃ§Ãµes clÃ­nicas" ordena | positivo | caixa-preta |
| `CT-DR-C01-PAT` | Nova patologia: h1, grid padrÃ£o, Guardar ativo, "Voltar" Ã  esquerda | positivo | interface |
| `CT-DR-C02-PAT` | Nova patologia: Guardar com obrigatÃ³rios vazios mostra a mensagem de cada campo e nÃ£o envia | negativo | caixa-preta |
| `CT-DR-C06-PAT` | Nova patologia: "Voltar" regressa Ã  tela anterior sem guardar | positivo | caixa-preta |
| `CT-DR-C01-PAT-EDIT` | Editar patologia: h1, grid padrÃ£o, Guardar ativo, "Voltar" Ã  esquerda | positivo | interface |
| `CT-DR-C02-PAT-EDIT` | Editar patologia: Guardar com obrigatÃ³rios vazios mostra a mensagem de cada campo e nÃ£o envia | negativo | caixa-preta |
| `CT-DR-C06-PAT-EDIT` | Editar patologia: "Voltar" regressa Ã  tela anterior sem guardar | positivo | caixa-preta |
| `CT-DR-C01-TEC` | Associar tÃ©cnica: h1, grid padrÃ£o, Guardar ativo, "Voltar" Ã  esquerda | positivo | interface |
| `CT-DR-C02-TEC` | Associar tÃ©cnica: Guardar com obrigatÃ³rios vazios mostra a mensagem de cada campo e nÃ£o envia | negativo | caixa-preta |
| `CT-DR-C06-TEC` | Associar tÃ©cnica: "Voltar" regressa Ã  tela anterior sem guardar | positivo | caixa-preta |
| `CT-DR-C01-TEC-EDIT` | Editar associaÃ§Ã£o de tÃ©cnica: h1, grid padrÃ£o, Guardar ativo, "Voltar" Ã  esquerda | positivo | interface |
| `CT-DR-C02-TEC-EDIT` | Editar associaÃ§Ã£o de tÃ©cnica: Guardar com obrigatÃ³rios vazios mostra a mensagem de cada campo e nÃ£o envia | negativo | caixa-preta |
| `CT-DR-C06-TEC-EDIT` | Editar associaÃ§Ã£o de tÃ©cnica: "Voltar" regressa Ã  tela anterior sem guardar | positivo | caixa-preta |

## Notas de implementaÃ§Ã£o

- C01 (todas as variantes): desde 08-10-2026 tambÃ©m verifica que nenhuma secÃ§Ã£o do formulÃ¡rio tem Colapsar/Expandir. As secÃ§Ãµes com "Guardar" nÃ£o colapsam (Manual A.5 v4.3, DEC-182, que substitui a DEC-022). Um formulÃ¡rio com colapsar falha este passo e Ã© registÃ¡vel como defeito.
- O detalhe usa abas; A12 verifica abas num sÃ³ cartÃ£o.
- B12.2: "Associar tÃ©cnica" alinhado = centro vertical do botÃ£o na linha do campo "CÃ³digo tÃ©cnica" (Â±4 px).

## Como correr

```bash
AMBIENTE=dev PW_NO_SERVER=1 BASE_URL=http://app.example.internal \
  npx playwright test testes/dados-referencia/patologias-termais --project=chromium
```

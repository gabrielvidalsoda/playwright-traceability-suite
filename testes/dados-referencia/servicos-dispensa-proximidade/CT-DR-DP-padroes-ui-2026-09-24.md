# CT-DR-DP â€” PadrÃµes de UI de Dados de ReferÃªncia: ServiÃ§os Dispensa em Proximidade

Plano de teste por caso do Item **ServiÃ§os Dispensa em Proximidade** (`/dados-referencia/servicos-dispensa-proximidade`), para a verificaÃ§Ã£o do deploy das PRs front #50 e #55 e back #31 e #34.

| Campo | Valor |
|---|---|
| Roteiro de origem | [roteiro-testes-deploy-dados-referencia-padroes-ui.md](../../../../QA/Testes/PDT/Testes%20manuais/24-09-2026-ajustes-gerais/roteiro-testes-deploy-dados-referencia-padroes-ui.md), passos A.1.9, B10 e Parte C (completa no "Novo serviÃ§o") |
| Requisito | RF#57 |
| ImplementaÃ§Ã£o | [`servicos-dispensa-proximidade.spec.ts`](servicos-dispensa-proximidade.spec.ts) |
| Page objects | `paginas/dadosReferencia/` (`PaginaPesquisaDadosReferencia`, `PaginaDetalheDadosReferencia`, `padraoUi`, `formularios`) |
| Ambiente alvo | `dev` â€” http://app.example.internal (tambÃ©m corre em `mock`) |
| Estado | Implementado em 24-09-2026; resultados da 1.Âª execuÃ§Ã£o no [documento-Ã­ndice](../../../docs/deploy-dados-referencia-padroes-ui-24-09-2026/validacao-padroes-ui.md) |

## Casos

| ID | O que verifica | Natureza | Tipo |
|---|---|---|---|
| `CT-DR-A.1.9` | ConferÃªncia rÃ¡pida do padrÃ£o: A01 â†’ pesquisar â†’ A07 + A08 â†’ detalhe â†’ A12 | positivo | interface |
| `CT-DR-B10.1` | AÃ§Ãµes numa sÃ³ coluna; coluna IVA alinhada Ã  esquerda | positivo | caixa-preta |
| `CT-DR-B10.2` | CabeÃ§alho colapsÃ¡vel; Lista de PreÃ§os, Locais Autorizados e ConvenÃ§Ãµes Habilitadas sÃ£o painÃ©is | positivo | interface |
| `CT-DR-B10.3` | Ordenar Locais (autorizado, datas) e ConvenÃ§Ãµes (NIF, prestador, datas) | positivo | caixa-preta |
| `CT-DR-B10.4` | O filtro de preÃ§os filtra a lista de preÃ§os | positivo | caixa-preta |
| `CT-DR-C01` | FormulÃ¡rio vazio: h1, grid padrÃ£o, Guardar ativo, "Voltar" Ã  esquerda | positivo | interface |
| `CT-DR-C02` | Guardar com obrigatÃ³rios vazios: mensagem por campo, nada enviado | negativo | caixa-preta |
| `CT-DR-C03` | Duplo clique rÃ¡pido em Guardar cria sÃ³ 1 registo | robustez | caixa-preta |
| `CT-DR-C04` | Erro do servidor (cÃ³digo duplicado) aparece num Alert no topo do formulÃ¡rio | negativo | caixa-preta |
| `CT-DR-C06` | "Voltar" regressa Ã  tela anterior sem guardar | positivo | caixa-preta |
| `CT-DR-C05` | Editar abre o formulÃ¡rio preenchido e Guardar funciona | positivo | caixa-preta |
| `CT-DR-C01-DP-EDIT` | Editar serviÃ§o: h1, grid padrÃ£o, Guardar ativo, "Voltar" Ã  esquerda | positivo | interface |
| `CT-DR-C02-DP-EDIT` | Editar serviÃ§o: obrigatÃ³rios apagados mostram as mensagens e nada Ã© enviado | negativo | caixa-preta |
| `CT-DR-C06-DP-EDIT` | Editar serviÃ§o: "Voltar" sem guardar | positivo | caixa-preta |
| `CT-DR-C01-DPP` | Novo preÃ§o: h1, grid padrÃ£o, Guardar ativo, "Voltar" Ã  esquerda | positivo | interface |
| `CT-DR-C02-DPP` | Novo preÃ§o: obrigatÃ³rios vazios mostram as mensagens e nada Ã© enviado | negativo | caixa-preta |
| `CT-DR-C06-DPP` | Novo preÃ§o: "Voltar" regressa ao detalhe sem guardar | positivo | caixa-preta |
| `CT-DR-C01-DPP-EDIT` | Editar preÃ§o: h1, grid padrÃ£o, Guardar ativo, "Voltar" Ã  esquerda | positivo | interface |
| `CT-DR-C02-DPP-EDIT` | Editar preÃ§o: obrigatÃ³rios apagados mostram as mensagens e nada Ã© enviado | negativo | caixa-preta |
| `CT-DR-C06-DPP-EDIT` | Editar preÃ§o: "Voltar" regressa ao detalhe sem guardar | positivo | caixa-preta |

## Notas de implementaÃ§Ã£o

- C01 (todas as variantes): desde 08-10-2026 tambÃ©m verifica que nenhuma secÃ§Ã£o do formulÃ¡rio tem Colapsar/Expandir. As secÃ§Ãµes com "Guardar" nÃ£o colapsam (Manual A.5 v4.3, DEC-182, que substitui a DEC-022). Um formulÃ¡rio com colapsar falha este passo e Ã© registÃ¡vel como defeito.
- C03 (duplo clique), C04 (cÃ³digo duplicado) e o "Guardar" de C05 gravam no ambiente: sÃ³ correm com `DR_PERMITIR_ESCRITA=1`. C03 cria um serviÃ§o com o cÃ³digo `E2E-DR-<timestamp>` (nÃ£o Ã© apagado pelo teste).
- B10.3: a tabela "ConvenÃ§Ãµes Habilitadas" nÃ£o tem coluna NIF; ordena-se "CÃ³digo ConvenÃ§Ã£o" e regista-se "nÃ£o aplicÃ¡vel" para o NIF.
- B10.4 e "Editar preÃ§o": em dev sÃ³ os serviÃ§os de teste (cÃ³digo "teste") tÃªm preÃ§os.

## Como correr

```bash
AMBIENTE=dev PW_NO_SERVER=1 BASE_URL=http://app.example.internal \
  npx playwright test testes/dados-referencia/servicos-dispensa-proximidade --project=chromium
```

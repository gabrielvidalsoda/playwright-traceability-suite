# CT-DR-CONV â€” PadrÃµes de UI de Dados de ReferÃªncia: ConvenÃ§Ãµes

Plano de teste por caso do Item **ConvenÃ§Ãµes** (`/dados-referencia/convencoes`), para a verificaÃ§Ã£o do deploy das PRs front #50 e #55 e back #31 e #34.

| Campo | Valor |
|---|---|
| Roteiro de origem | [roteiro-testes-deploy-dados-referencia-padroes-ui.md](../../../../QA/Testes/PDT/Testes%20manuais/24-09-2026-ajustes-gerais/roteiro-testes-deploy-dados-referencia-padroes-ui.md), passos A.1.1 e B2 |
| Requisito | RF#26 |
| ImplementaÃ§Ã£o | [`convencoes.spec.ts`](convencoes.spec.ts) |
| Page objects | `paginas/dadosReferencia/` (`PaginaPesquisaDadosReferencia`, `PaginaDetalheDadosReferencia`, `padraoUi`, `formularios`) |
| Ambiente alvo | `dev` â€” http://app.example.internal (tambÃ©m corre em `mock`) |
| Estado | Implementado em 24-09-2026; resultados da 1.Âª execuÃ§Ã£o no [documento-Ã­ndice](../../../docs/deploy-dados-referencia-padroes-ui-24-09-2026/validacao-padroes-ui.md) |

## Casos

| ID | O que verifica | Natureza | Tipo |
|---|---|---|---|
| `CT-DR-A.1.1` | ConferÃªncia rÃ¡pida do padrÃ£o: A01 â†’ pesquisar â†’ A07 + A08 â†’ detalhe â†’ A12 | positivo | interface |
| `CT-DR-B2.1` | TÃ­tulo "Pesquisa ConvenÃ§Ãµes" e campo "NIF Prestador" | positivo | caixa-preta |
| `CT-DR-B2.2` | "Ir paraâ€¦" no cabeÃ§alho, identificaÃ§Ã£o no cartÃ£o da Entidade com subtÃ­tulos, sub-tabelas num cartÃ£o prÃ³prio | positivo | interface |
| `CT-DR-B2.3` | "Alterar" Ã© clicÃ¡vel e avisa que a alteraÃ§Ã£o ainda nÃ£o estÃ¡ disponÃ­vel | positivo | caixa-preta |
| `CT-DR-B2.4` | Sub-tabelas com moeda, % e datas formatadas; datas vazias como "â€”" | positivo | caixa-preta |
| `CT-DR-B2.5` | Conta Corrente e Processos de ConferÃªncia usam cartÃµes padrÃ£o e as tabelas ordenam | positivo | caixa-preta |

## Notas de implementaÃ§Ã£o

- B2.4: verifica todas as cÃ©lulas das sub-tabelas do detalhe (datas `dd/mm/aaaa` ou "â€”", moeda com "â‚¬", percentagem com "%", sem ISO/`null`). SÃ³ avalia as sub-tabelas que o registo aberto tiver.
- B2.5: Conta Corrente e Processos de ConferÃªncia â€” ordena a 1.Âª coluna ordenÃ¡vel da tabela principal de cada tela.

## Como correr

```bash
AMBIENTE=dev PW_NO_SERVER=1 BASE_URL=http://app.example.internal \
  npx playwright test testes/dados-referencia/convencoes --project=chromium
```

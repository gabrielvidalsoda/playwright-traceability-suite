# CT-DR-MCDT â€” PadrÃµes de UI de Dados de ReferÃªncia: Exames MCDT

Plano de teste por caso do Item **Exames MCDT** (`/mcdts/exames`), para a verificaÃ§Ã£o do deploy das PRs front #50 e #55 e back #31 e #34.

| Campo | Valor |
|---|---|
| Roteiro de origem | [roteiro-testes-deploy-dados-referencia-padroes-ui.md](../../../../QA/Testes/PDT/Testes%20manuais/24-09-2026-ajustes-gerais/roteiro-testes-deploy-dados-referencia-padroes-ui.md), passos A.1.12 e B14 |
| Requisito | RF#28 |
| ImplementaÃ§Ã£o | [`exames-mcdt.spec.ts`](exames-mcdt.spec.ts) |
| Page objects | `paginas/dadosReferencia/` (`PaginaPesquisaDadosReferencia`, `PaginaDetalheDadosReferencia`, `padraoUi`, `formularios`) |
| Ambiente alvo | `dev` â€” http://app.example.internal (tambÃ©m corre em `mock`) |
| Estado | Implementado em 24-09-2026; resultados da 1.Âª execuÃ§Ã£o no [documento-Ã­ndice](../../../docs/deploy-dados-referencia-padroes-ui-24-09-2026/validacao-padroes-ui.md) |

## Casos

| ID | O que verifica | Natureza | Tipo |
|---|---|---|---|
| `CT-DR-A.1.12` | ConferÃªncia rÃ¡pida do padrÃ£o: A01 â†’ pesquisar â†’ A07 + A08 â†’ detalhe â†’ A12 | positivo | interface |
| `CT-DR-B14.1` | Filtros no grid padrÃ£o; Exportar visÃ­vel mas desativado | positivo | caixa-preta |
| `CT-DR-B14.2` | Pesquisar, ordenar e Exportar: ordenaÃ§Ã£o no servidor e XLSX descarregado | positivo | caixa-preta |
| `CT-DR-B14.3` | TÃ­tulo com o cÃ³digo do exame, cabeÃ§alho "IdentificaÃ§Ã£o", 5 blocos num cartÃ£o com tabelas ordenÃ¡veis | positivo | interface |
| `CT-DR-B14.4` | "Voltar" regressa a /mcdts/exames com os filtros e os resultados | positivo | caixa-preta |

## Notas de implementaÃ§Ã£o

- B14.2: verifica a ordenaÃ§Ã£o no servidor e que o XLSX Ã© descarregado. ValidaÃ§Ã£o manual de 28-09-2026 (F7): **nÃ£o Ã© esperado que a exportaÃ§Ã£o siga a ordenaÃ§Ã£o da tabela** â€” a verificaÃ§Ã£o do `sort` no pedido de exportaÃ§Ã£o foi retirada.
- B14.4: pesquisa na prÃ³pria tela (Ãrea "AnÃ¡lises ClÃ­nicas"), abre um detalhe e usa "Voltar".

## Como correr

```bash
AMBIENTE=dev PW_NO_SERVER=1 BASE_URL=http://app.example.internal \
  npx playwright test testes/dados-referencia/exames-mcdt --project=chromium
```

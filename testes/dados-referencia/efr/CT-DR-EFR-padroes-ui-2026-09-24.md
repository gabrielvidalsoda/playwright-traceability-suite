# CT-DR-EFR â€” PadrÃµes de UI de Dados de ReferÃªncia: EFR â€” Entidade Financeira ResponsÃ¡vel

Plano de teste por caso do Item **EFR â€” Entidade Financeira ResponsÃ¡vel** (`/dados-referencia/efr`), para a verificaÃ§Ã£o do deploy das PRs front #50 e #55 e back #31 e #34.

| Campo | Valor |
|---|---|
| Roteiro de origem | [roteiro-testes-deploy-dados-referencia-padroes-ui.md](../../../../QA/Testes/PDT/Testes%20manuais/24-09-2026-ajustes-gerais/roteiro-testes-deploy-dados-referencia-padroes-ui.md), passos A.1.4 e B5 |
| Requisito | RF#57 |
| ImplementaÃ§Ã£o | [`efr.spec.ts`](efr.spec.ts) |
| Page objects | `paginas/dadosReferencia/` (`PaginaPesquisaDadosReferencia`, `PaginaDetalheDadosReferencia`, `padraoUi`, `formularios`) |
| Ambiente alvo | `dev` â€” http://app.example.internal (tambÃ©m corre em `mock`) |
| Estado | Implementado em 24-09-2026; resultados da 1.Âª execuÃ§Ã£o no [documento-Ã­ndice](../../../docs/deploy-dados-referencia-padroes-ui-24-09-2026/validacao-padroes-ui.md) |

## Casos

| ID | O que verifica | Natureza | Tipo |
|---|---|---|---|
| `CT-DR-A.1.4` | ConferÃªncia rÃ¡pida do padrÃ£o: A01 â†’ pesquisar â†’ A07 + A08 â†’ detalhe â†’ A12 | positivo | interface |
| `CT-DR-B5.1` | Ordenar por Tipo Entidade, Ativa CRD e Valida RNU; Estado em texto | positivo | caixa-preta |
| `CT-DR-B5.2` | CabeÃ§alho colapsÃ¡vel com Exportar no topo, "IdentificaÃ§Ã£o" e "VigÃªncia e Estado", sem ID interno | positivo | interface |

## Notas de implementaÃ§Ã£o

- O detalhe da EFR usa abas (padrÃ£o das outras telas); A12 verifica abas num sÃ³ cartÃ£o em vez de painÃ©is.
- B5.1: na grelha as colunas chamam-se "CRD" (Ativa CRD) e "RNU" (Valida RNU).

## Como correr

```bash
AMBIENTE=dev PW_NO_SERVER=1 BASE_URL=http://app.example.internal \
  npx playwright test testes/dados-referencia/efr --project=chromium
```

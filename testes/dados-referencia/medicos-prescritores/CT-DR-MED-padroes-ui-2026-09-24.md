# CT-DR-MED â€” PadrÃµes de UI de Dados de ReferÃªncia: MÃ©dicos / Prescritores

Plano de teste por caso do Item **MÃ©dicos / Prescritores** (`/dados-referencia/medicos-prescritores`), para a verificaÃ§Ã£o do deploy das PRs front #50 e #55 e back #31 e #34.

| Campo | Valor |
|---|---|
| Roteiro de origem | [roteiro-testes-deploy-dados-referencia-padroes-ui.md](../../../../QA/Testes/PDT/Testes%20manuais/24-09-2026-ajustes-gerais/roteiro-testes-deploy-dados-referencia-padroes-ui.md), passos A.1.6 e B7 |
| Requisito | RF#57 |
| ImplementaÃ§Ã£o | [`medicos-prescritores.spec.ts`](medicos-prescritores.spec.ts) |
| Page objects | `paginas/dadosReferencia/` (`PaginaPesquisaDadosReferencia`, `PaginaDetalheDadosReferencia`, `padraoUi`, `formularios`) |
| Ambiente alvo | `dev` â€” http://app.example.internal (tambÃ©m corre em `mock`) |
| Estado | Implementado em 24-09-2026; resultados da 1.Âª execuÃ§Ã£o no [documento-Ã­ndice](../../../docs/deploy-dados-referencia-padroes-ui-24-09-2026/validacao-padroes-ui.md) |

## Casos

| ID | O que verifica | Natureza | Tipo |
|---|---|---|---|
| `CT-DR-A.1.6` | ConferÃªncia rÃ¡pida do padrÃ£o: A01 â†’ pesquisar â†’ A07 + A08 â†’ detalhe â†’ A12 | positivo | interface |
| `CT-DR-B7.1` | Data de ReferÃªncia vazia e com o Datepicker padrÃ£o | positivo | caixa-preta |
| `CT-DR-B7.2` | Ordenar por NÂº Prescritor e por Tipo, tambÃ©m na pÃ¡gina 2; Estado em texto | positivo | caixa-preta |
| `CT-DR-B7.3` | Especialidades, SuspensÃµes e UtilizaÃ§Ã£o colapsÃ¡veis; SuspensÃµes e UtilizaÃ§Ã£o ordenam; Estado em texto | positivo | caixa-preta |

## Notas de implementaÃ§Ã£o

- A ordenaÃ§Ã£o por "N.Âº Prescritor" Ã© feita pelo nÃºmero sem o prefixo de letras (D1, C1, D10â€¦); o teste aceita-a e regista uma anotaÃ§Ã£o `observacao` para confirmaÃ§Ã£o.

## Como correr

```bash
AMBIENTE=dev PW_NO_SERVER=1 BASE_URL=http://app.example.internal \
  npx playwright test testes/dados-referencia/medicos-prescritores --project=chromium
```

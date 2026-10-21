# CT-DR-EMB â€” PadrÃµes de UI de Dados de ReferÃªncia: Embalagens e Medicamentos

Plano de teste por caso do Item **Embalagens e Medicamentos** (`/dados-referencia/embalagens-medicamentos`), para a verificaÃ§Ã£o do deploy das PRs front #50 e #55 e back #31 e #34.

| Campo | Valor |
|---|---|
| Roteiro de origem | [roteiro-testes-deploy-dados-referencia-padroes-ui.md](../../../../QA/Testes/PDT/Testes%20manuais/24-09-2026-ajustes-gerais/roteiro-testes-deploy-dados-referencia-padroes-ui.md), passos A.1.3 e B4 |
| Requisito | RF#27 |
| ImplementaÃ§Ã£o | [`embalagens-medicamentos.spec.ts`](embalagens-medicamentos.spec.ts) |
| Page objects | `paginas/dadosReferencia/` (`PaginaPesquisaDadosReferencia`, `PaginaDetalheDadosReferencia`, `padraoUi`, `formularios`) |
| Ambiente alvo | `dev` â€” http://app.example.internal (tambÃ©m corre em `mock`) |
| Estado | Implementado em 24-09-2026; resultados da 1.Âª execuÃ§Ã£o no [documento-Ã­ndice](../../../docs/deploy-dados-referencia-padroes-ui-24-09-2026/validacao-padroes-ui.md) |

## Casos

| ID | O que verifica | Natureza | Tipo |
|---|---|---|---|
| `CT-DR-A.1.3` | ConferÃªncia rÃ¡pida do padrÃ£o: A01 â†’ pesquisar â†’ A07 + A08 â†’ detalhe â†’ A12 | positivo | interface |
| `CT-DR-B4.1` | Trocar para DiabÃ©tico: filtros de embalagem limpos, sem resultados antigos antes da nova pesquisa e a pesquisa nÃ£o exige CNPEM | positivo | caixa-preta |
| `CT-DR-B4.2-DIET` | Trocar para DietÃ©tico: filtros de embalagem limpos, sem resultados antigos antes da nova pesquisa e a pesquisa nÃ£o exige CNPEM | positivo | caixa-preta |
| `CT-DR-B4.2-SUBS` | Trocar para Subs. Manipulada: filtros de embalagem limpos, sem resultados antigos antes da nova pesquisa e a pesquisa nÃ£o exige CNPEM | positivo | caixa-preta |
| `CT-DR-B4.3` | Cada modo guarda a sua preferÃªncia de colunas | positivo | caixa-preta |
| `CT-DR-B4.4` | Exportar sempre visÃ­vel, sÃ³ ativo depois da pesquisa | positivo | caixa-preta |
| `CT-DR-B4.5` | Detalhe da embalagem: identificaÃ§Ã£o e 10 listas colapsam cada uma por si e ordenam; Voltar no rodapÃ© | positivo | interface |
| `CT-DR-B4.6-DIAB` | Detalhe de produto (DiabÃ©tico): cartÃ£o padrÃ£o, datas dd/mm/aaaa, sem ID interno | positivo | caixa-preta |
| `CT-DR-B4.6-DIET` | Detalhe de produto (DietÃ©tico): cartÃ£o padrÃ£o, datas dd/mm/aaaa, sem ID interno | positivo | caixa-preta |
| `CT-DR-B4.6-SUBS` | Detalhe de produto (Subs. Manipulada): cartÃ£o padrÃ£o, datas dd/mm/aaaa, sem ID interno | positivo | caixa-preta |

## Notas de implementaÃ§Ã£o

- B4.1/B4.2: pesquisa embalagens ("paracetamol"), troca de modo e verifica que a grelha volta ao estado "antes da pesquisa" e que os filtros sÃ³ de embalagem ficam vazios.
- B4.1/B4.2 (acrescentado apÃ³s a validaÃ§Ã£o manual de 28-09-2026, F6): depois de trocar de modo, pesquisa por "Nome Produto" e verifica que **nÃ£o** Ã© pedido o CNPEM. Bug confirmado Ã  mÃ£o: nos modos DiabÃ©tico, DietÃ©tico e Subs. Manipulada a pesquisa exige o CNPEM, mas o campo CNPEM fica oculto.
- B4.3: as colunas sÃ³ mudam depois de pesquisar no novo modo (seguem o `modo` da URL); o teste pesquisa em cada modo.
- B4.6: um caso por tipo de produto (DiabÃ©tico "agu", DietÃ©tico "lei", SubstÃ¢ncia "aci" â€” dados de dev).

## Como correr

```bash
AMBIENTE=dev PW_NO_SERVER=1 BASE_URL=http://app.example.internal \
  npx playwright test testes/dados-referencia/embalagens-medicamentos --project=chromium
```

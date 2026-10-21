# CT-DR-CNPEM â€” PadrÃµes de UI de Dados de ReferÃªncia: CNPEM

Plano de teste por caso do Item **CNPEM** (`/dados-referencia/cnpem`), para a verificaÃ§Ã£o do deploy das PRs front #50 e #55 e back #31 e #34.

| Campo | Valor |
|---|---|
| Roteiro de origem | [roteiro-testes-deploy-dados-referencia-padroes-ui.md](../../../../QA/Testes/PDT/Testes%20manuais/24-09-2026-ajustes-gerais/roteiro-testes-deploy-dados-referencia-padroes-ui.md), passos Parte A (completa) e B1 |
| Requisito | RF#27 |
| ImplementaÃ§Ã£o | [`cnpem.spec.ts`](cnpem.spec.ts) |
| Page objects | `paginas/dadosReferencia/` (`PaginaPesquisaDadosReferencia`, `PaginaDetalheDadosReferencia`, `padraoUi`, `formularios`) |
| Ambiente alvo | `dev` â€” http://app.example.internal (tambÃ©m corre em `mock`) |
| Estado | Implementado em 24-09-2026; resultados da 1.Âª execuÃ§Ã£o no [documento-Ã­ndice](../../../docs/deploy-dados-referencia-padroes-ui-24-09-2026/validacao-padroes-ui.md) |

## Casos

| ID | O que verifica | Natureza | Tipo |
|---|---|---|---|
| `CT-DR-A01` | Abrir a URL sem pesquisar: tabela vazia, sem breadcrumb, tÃ­tulo "Pesquisa â€¦" | positivo | caixa-preta |
| `CT-DR-A02` | FormulÃ¡rio: placeholders, DescriÃ§Ã£o em 2 colunas, data vazia, Pesquisar ativo, Exportar desativado | positivo | caixa-preta |
| `CT-DR-A03` | Escrever um filtro e carregar Enter faz a pesquisa | positivo | caixa-preta |
| `CT-DR-A04` | Limpar devolve todos os campos ao estado inicial | positivo | caixa-preta |
| `CT-DR-A05` | Pesquisar com a data vazia usa "hoje" e nÃ£o mostra erro de campo obrigatÃ³rio | positivo | caixa-preta |
| `CT-DR-A06` | Pesquisar um valor inexistente mostra o texto de "pesquisa sem resultado" | negativo | caixa-preta |
| `CT-DR-A07` | Grelha apÃ³s pesquisa vÃ¡lida: compacta, zebrada, Ã  esquerda, aÃ§Ãµes na 1.Âª coluna, Exportar ativo | positivo | interface |
| `CT-DR-A08` | Ordenar asc/desc no servidor, cabeÃ§alho estÃ¡vel, pÃ¡gina 2 continua a sequÃªncia | positivo | caixa-preta |
| `CT-DR-A09` | Ordenar uma coluna de data segue a ordem cronolÃ³gica | positivo | caixa-preta |
| `CT-DR-A10` | Coluna ocultada no seletor continua oculta apÃ³s recarregar (F5) | positivo | caixa-preta |
| `CT-DR-A11` | Exportar descarrega o XLSX | positivo | caixa-preta |
| `CT-DR-A16` | Coluna Estado em texto simples, sem badge | positivo | caixa-preta |
| `CT-DR-A12` | Detalhe: h1/h2, cabeÃ§alho colapsÃ¡vel com aÃ§Ãµes, listas num cartÃ£o, Voltar no rodapÃ© | positivo | interface |
| `CT-DR-A13` | CabeÃ§alho e cada painel recolhem e expandem de forma independente | positivo | caixa-preta |
| `CT-DR-A16` | Estado do detalhe em texto simples, sem badge | positivo | caixa-preta |
| `CT-DR-B1.1` | TÃ­tulo "Detalhe CNPEM â€” <cÃ³digo>" e cabeÃ§alho em "IdentificaÃ§Ã£o" e "VigÃªncia e Estado" | positivo | caixa-preta |
| `CT-DR-B1.2` | Embalagens, HistÃ³rico, Semelhantes e Grupos HomogÃ©neos empilhados num Ãºnico cartÃ£o, sem abas | positivo | caixa-preta |
| `CT-DR-B1.3` | Ordenar uma coluna em cada uma das 4 listas | positivo | caixa-preta |
| `CT-DR-A14` | Enquanto carrega, aparece o "A carregar..." padrÃ£o | positivo | caixa-preta |
| `CT-DR-A15` | Id invÃ¡lido: erro num Alert | negativo | caixa-preta |

## Notas de implementaÃ§Ã£o

- Tela de referÃªncia do padrÃ£o comum: os passos A01â€“A16 correm aqui completos.
- A05: a CNPEM exige pelo menos um critÃ©rio alÃ©m da Data de ReferÃªncia; o teste pesquisa com um filtro e a data vazia (o aviso de "sem filtros" fica registado como anotaÃ§Ã£o).
- A11: sÃ³ verifica que o XLSX Ã© descarregado. ValidaÃ§Ã£o manual de 28-09-2026 (F1): **nÃ£o Ã© esperado que a exportaÃ§Ã£o siga a ordenaÃ§Ã£o da tabela** â€” a verificaÃ§Ã£o do `sort` no pedido de exportaÃ§Ã£o foi retirada.
- A14: um observador de DOM regista o texto "A carregar..." durante o carregamento do detalhe.
- A15: usa o id invÃ¡lido `999999999` na URL do detalhe. ValidaÃ§Ã£o manual de 28-09-2026 (F2): a falta do tÃ­tulo do detalhe no ramo de erro foi descartada ("ignorar") â€” o teste jÃ¡ nÃ£o a verifica.

## Como correr

```bash
AMBIENTE=dev PW_NO_SERVER=1 BASE_URL=http://app.example.internal \
  npx playwright test testes/dados-referencia/cnpem --project=chromium
```

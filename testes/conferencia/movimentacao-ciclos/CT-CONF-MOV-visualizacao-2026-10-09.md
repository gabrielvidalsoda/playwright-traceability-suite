# CT-CONF-MOV â€” ConferÃªncia C1 (VisualizaÃ§Ã£o): MovimentaÃ§Ã£o entre ciclos

Plano de teste por caso do Item **MovimentaÃ§Ã£o entre ciclos** (`/conferencia/movimentacao-ciclos`), automaÃ§Ã£o da camada C1 (VisualizaÃ§Ã£o) do script de testes manuais da ConferÃªncia de 08-10-2026.

| Campo | Valor |
|---|---|
| Script de origem | [Script-Conferencia-C1-Visualizacao-2026-10-08.md](../../../../QA/Testes/PDT/Testes%20manuais/08-10-2026-conferencia-funcional/Script-Conferencia-C1-Visualizacao-2026-10-08.md), sem secÃ§Ã£o no script C1 (ecrÃ£ novo, `ccmsns-ui` #67); MOV-07 cobre o achado das anotaÃ§Ãµes manuais de 08-10 |
| Requisitos | PRD - ConferÃªncia v0.1 (`CONF-RF-*`, `CONF-RN-*`, `CONF-RNF-*`, `CONF-PRD-*`, `CONF-TR`); as dÃºvidas `Q-xx` ficam como anotaÃ§Ã£o `questao` |
| ImplementaÃ§Ã£o | [`movimentacao-ciclos.spec.ts`](movimentacao-ciclos.spec.ts) |
| Page objects | `paginas/conferencia/Traceability Suite.ts` (`Tabela`), `paginas/conferencia/menu.ts` |
| Camada | `@integracao` â€” corre contra o DEV publicado, https://app.example.internal (VPN) |
| Escrita em DEV | **Nenhuma.** O `test` de `apoio-conferencia.ts` aborta qualquer POST/PUT/PATCH/DELETE Ã  API (exceto exportaÃ§Ãµes e a contagem do disparo) e o caso falha se algum for bloqueado |
| Estado | Implementado em 09-10-2026; resultados no [documento-Ã­ndice](../../../docs/conferencia-c1-visualizacao-08-10-2026/validacao-c1-visualizacao.md) |

## Casos

| ID | O que verifica | Natureza | Requisitos | DÃºvidas |
|---|---|---|---|---|
| `CT-CONF-MOV-01` | Abrir pelo menu: aviso de exceÃ§Ã£o, separadores e grelha antes de pesquisar | positivo | CONF-MOV | â€” |
| `CT-CONF-MOV-02` | Filtros: Ã¡reas disponÃ­veis e NÂº do Processo sÃ³ com dÃ­gitos | negativo | CONF-MOV | â€” |
| `CT-CONF-MOV-03` | Pesquisar: colunas, situaÃ§Ã£o de elegibilidade e seleÃ§Ã£o sÃ³ dos elegÃ­veis | positivo | CONF-MOV | â€” |
| `CT-CONF-MOV-04` | Selecionar um processo elegÃ­vel mostra os 2 ciclos de destino adjacentes | positivo | CONF-MOV | â€” |
| `CT-CONF-MOV-05` | Resumo do diÃ¡logo de confirmaÃ§Ã£o (fechado com Â«CancelarÂ», nada Ã© gravado) | positivo | CONF-MOV | â€” |
| `CT-CONF-MOV-06` | HistÃ³rico carrega ao abrir, com o movimento Â«origem â†’ destinoÂ» | positivo | CONF-MOV | â€” |
| `CT-CONF-MOV-07` | Grelhas com exportaÃ§Ã£o (Manual C.8) e ordenaÃ§Ã£o por coluna (anotaÃ§Ãµes 08-10) | positivo | CONF-MOV, CONF-TR | â€” |

## Notas de implementaÃ§Ã£o

- A Ãºnica escrita do ecrÃ£ Ã© o Â«ConfirmarÂ» do diÃ¡logo Â«Confirmar movimentaÃ§Ã£oÂ» (`POST /conferencia/movimentacao-ciclos`): nunca Ã© clicado. O MOV-05 abre o diÃ¡logo para ler o resumo e fecha-o com Â«CancelarÂ».
- Os dois separadores ficam montados (o oculto com `display:none`): os localizadores por papel ignoram a cÃ³pia oculta dos filtros.
- Requisito: o PRD ConferÃªncia v0.1 nÃ£o tem RF para este ecrÃ£ â€” os casos usam `CONF-MOV`.
- Casos marcados Â«RegistarÂ» no script (requisito Ã— construÃ­do) verificam o requisito com `expect.soft` e anotam o observado (`observacao`) no relatÃ³rio.
- Sem massa em DEV, o caso fica Â«skippedÂ» com o motivo (â›”/âž– do script).

## Como correr

```bash
npm run test:integracao -- testes/conferencia/movimentacao-ciclos
```

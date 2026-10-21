# CT-CONF-REG â€” ConferÃªncia C1 (VisualizaÃ§Ã£o): Regras de conferÃªncia

Plano de teste por caso do Item **Regras de conferÃªncia** (`/motor-regras/regras`), automaÃ§Ã£o da camada C1 (VisualizaÃ§Ã£o) do script de testes manuais da ConferÃªncia de 08-10-2026.

| Campo | Valor |
|---|---|
| Script de origem | [Script-Conferencia-C1-Visualizacao-2026-10-08.md](../../../../QA/Testes/PDT/Testes%20manuais/08-10-2026-conferencia-funcional/Script-Conferencia-C1-Visualizacao-2026-10-08.md), S12 |
| Requisitos | PRD - ConferÃªncia v0.1 (`CONF-RF-*`, `CONF-RN-*`, `CONF-RNF-*`, `CONF-PRD-*`, `CONF-TR`); as dÃºvidas `Q-xx` ficam como anotaÃ§Ã£o `questao` |
| ImplementaÃ§Ã£o | [`regras-conferencia.spec.ts`](regras-conferencia.spec.ts) |
| Page objects | `paginas/conferencia/motorRegras.ts` (`ListaMotorRegras`) |
| Camada | `@integracao` â€” corre contra o DEV publicado, https://app.example.internal (VPN) |
| Escrita em DEV | **Nenhuma.** O `test` de `apoio-conferencia.ts` aborta qualquer POST/PUT/PATCH/DELETE Ã  API (exceto exportaÃ§Ãµes e a contagem do disparo) e o caso falha se algum for bloqueado |
| Estado | Implementado em 08-10-2026; resultados no [documento-Ã­ndice](../../../docs/conferencia-c1-visualizacao-08-10-2026/validacao-c1-visualizacao.md) |

## Casos

| ID | O que verifica | Natureza | Requisitos | DÃºvidas |
|---|---|---|---|---|
| `CT-CONF-REG-01` | Lista e filtros (implementaÃ§Ã£o, tipo de erro, Ã¢mbito, estado) | positivo | CONF-RF-29 | â€” |
| `CT-CONF-REG-02` | Filtro Erro: por cÃ³digo, por descriÃ§Ã£o e sem correspondÃªncia | positivo | CONF-RF-29 | â€” |
| `CT-CONF-REG-03` | Detalhe de uma regra partilhada por 2 workflows | positivo | CONF-RF-29 | Q-03 |
| `CT-CONF-REG-16` | Enquadramento legal da regra | positivo | CONF-RF-33 | Q-07 |
| `CT-CONF-REG-17` | Ids invÃ¡lidos | negativo | CONF-PRD-5 | â€” |

## Notas de implementaÃ§Ã£o

- Nunca Â«Nova regraÂ», Â«EditarÂ», Â«EliminarÂ», Â«AtivarÂ»/Â«DesativarÂ», nem a seleÃ§Ã£o em massa (Â«Ativar/Desativar selecionadasÂ» gravam sem confirmaÃ§Ã£o).
- `{REGRA_PARTILHADA}` = 1.Âº acrÃ³nimo repetido nas 5 primeiras pÃ¡ginas da pesquisa sem filtros.
- Casos marcados Â«RegistarÂ» no script (requisito Ã— construÃ­do) verificam o requisito com `expect.soft` e anotam o observado (`observacao`) no relatÃ³rio.
- Sem massa em DEV, o caso fica Â«skippedÂ» com o motivo (â›”/âž– do script).

## Como correr

```bash
npm run test:integracao -- testes/conferencia/regras-conferencia
```

# CT-CONF-CAL â€” ConferÃªncia C1 (VisualizaÃ§Ã£o): GestÃ£o de calendÃ¡rio

Plano de teste por caso do Item **GestÃ£o de calendÃ¡rio** (`/conferencia/calendario/visao-geral`), automaÃ§Ã£o da camada C1 (VisualizaÃ§Ã£o) do script de testes manuais da ConferÃªncia de 08-10-2026.

| Campo | Valor |
|---|---|
| Script de origem | [Script-Conferencia-C1-Visualizacao-2026-10-08.md](../../../../QA/Testes/PDT/Testes%20manuais/08-10-2026-conferencia-funcional/Script-Conferencia-C1-Visualizacao-2026-10-08.md), S4.1 a S4.4 |
| Requisitos | PRD - ConferÃªncia v0.1 (`CONF-RF-*`, `CONF-RN-*`, `CONF-RNF-*`, `CONF-PRD-*`, `CONF-TR`); as dÃºvidas `Q-xx` ficam como anotaÃ§Ã£o `questao` |
| ImplementaÃ§Ã£o | [`gestao-calendario.spec.ts`](gestao-calendario.spec.ts) |
| Page objects | `paginas/conferencia/Traceability Suite.ts` (`Tabela`) |
| Camada | `@integracao` â€” corre contra o DEV publicado, https://app.example.internal (VPN) |
| Escrita em DEV | **Nenhuma.** O `test` de `apoio-conferencia.ts` aborta qualquer POST/PUT/PATCH/DELETE Ã  API (exceto exportaÃ§Ãµes e a contagem do disparo) e o caso falha se algum for bloqueado |
| Estado | Implementado em 08-10-2026; resultados no [documento-Ã­ndice](../../../docs/conferencia-c1-visualizacao-08-10-2026/validacao-c1-visualizacao.md) |

## Casos

| ID | O que verifica | Natureza | Requisitos | DÃºvidas |
|---|---|---|---|---|
| `CT-CONF-CAL-01` | Abrir pelo menu redireciona para o ciclo corrente | positivo | CONF-RF-15 | â€” |
| `CT-CONF-CAL-02` | Seletor de ciclos: estado no rÃ³tulo e Â«Mostrar todos os ciclos cadastradosÂ» | positivo | CONF-RF-15 | â€” |
| `CT-CONF-CAL-03` | Tabela das 12 Ã¡reas | positivo | CONF-RF-15 | â€” |
| `CT-CONF-CAL-04` | Alertas de prazo sem bloqueio; ciclo fechado sem prazos | positivo | CONF-RF-22, CONF-RN-15 | â€” |
| `CT-CONF-CAL-05` | Banners do ciclo fechado e do planeado | positivo | CONF-RF-21 | â€” |
| `CT-CONF-CAL-06` | Marcos de uma Ã¡rea (modal sÃ³ de leitura) | positivo | CONF-RF-18 | â€” |
| `CT-CONF-CAL-30` | Painel Â«CalendÃ¡rio do ciclo â€¦Â» com botÃ£o colapsar/expandir (anotaÃ§Ãµes 08-10) | positivo | CONF-TR | â€” |
| `CT-CONF-CAL-07` | CalendÃ¡rio do mÃªs: navegaÃ§Ã£o, legenda e filtro Â«SÃ³ marcosÂ» | positivo | CONF-RF-15 | â€” |
| `CT-CONF-CAL-11` | Abrir a Ã¡rea MED de um ciclo planeado | positivo | CONF-RF-15, CONF-RN-14 | â€” |
| `CT-CONF-CAL-16` | Janela herdada: limite de receÃ§Ã£o sÃ³ de leitura | positivo | CONF-RN-14 | â€” |
| `CT-CONF-CAL-17` | Ãrea fechada: datas nÃ£o editÃ¡veis, sem gravar | positivo | CONF-RN-14 | â€” |
| `CT-CONF-CAL-18` | Ãrea nÃ£o migrada (HD): banner do sistema atual | positivo | â€” | Q-27 |
| `CT-CONF-CAL-22` | Marco com data efetiva: Planeada desativada | positivo | CONF-RF-18 | â€” |
| `CT-CONF-CAL-25` | Lista de tipos de marco sem editar/apagar | positivo | CONF-RF-19 | Q-29 |
| `CT-CONF-CAL-28` | Grelha de regras: 12 Ã¡reas Ã— 3 datas | positivo | CONF-RF-20 | â€” |

## Notas de implementaÃ§Ã£o

- Nunca Â«GuardarÂ», Â«Editar perÃ­odoÂ», Â«Adicionar marcoÂ», Â«Novo tipo de marcoÂ», nem os Ã­cones de editar/remover regras e marcos. A pÃ¡gina Datas da Ã¡rea nÃ£o tem autosave.
- Os valores esperados (estados, prazos, marcos) sÃ£o lidos de `GET /calendario/ciclos/{anoMes}/areas`.
- Casos marcados Â«RegistarÂ» no script (requisito Ã— construÃ­do) verificam o requisito com `expect.soft` e anotam o observado (`observacao`) no relatÃ³rio.
- Sem massa em DEV, o caso fica Â«skippedÂ» com o motivo (â›”/âž– do script).

## Como correr

```bash
npm run test:integracao -- testes/conferencia/gestao-calendario
```

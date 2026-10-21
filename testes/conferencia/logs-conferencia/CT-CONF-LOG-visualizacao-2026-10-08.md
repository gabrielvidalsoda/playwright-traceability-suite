# CT-CONF-LOG â€” ConferÃªncia C1 (VisualizaÃ§Ã£o): Logs de conferÃªncia

Plano de teste por caso do Item **Logs de conferÃªncia** (`/motor-regras/execucoes`), automaÃ§Ã£o da camada C1 (VisualizaÃ§Ã£o) do script de testes manuais da ConferÃªncia de 08-10-2026.

| Campo | Valor |
|---|---|
| Script de origem | [Script-Conferencia-C1-Visualizacao-2026-10-08.md](../../../../QA/Testes/PDT/Testes%20manuais/08-10-2026-conferencia-funcional/Script-Conferencia-C1-Visualizacao-2026-10-08.md), S14 |
| Requisitos | PRD - ConferÃªncia v0.1 (`CONF-RF-*`, `CONF-RN-*`, `CONF-RNF-*`, `CONF-PRD-*`, `CONF-TR`); as dÃºvidas `Q-xx` ficam como anotaÃ§Ã£o `questao` |
| ImplementaÃ§Ã£o | [`logs-conferencia.spec.ts`](logs-conferencia.spec.ts) |
| Page objects | `paginas/conferencia/motorRegras.ts` (`ListaMotorRegras`), `paginas/conferencia/cockpit.ts` (LOG-10) |
| Camada | `@integracao` â€” corre contra o DEV publicado, https://app.example.internal (VPN) |
| Escrita em DEV | **Nenhuma.** O `test` de `apoio-conferencia.ts` aborta qualquer POST/PUT/PATCH/DELETE Ã  API (exceto exportaÃ§Ãµes e a contagem do disparo) e o caso falha se algum for bloqueado |
| Estado | Implementado em 08-10-2026; resultados no [documento-Ã­ndice](../../../docs/conferencia-c1-visualizacao-08-10-2026/validacao-c1-visualizacao.md) |

## Casos

| ID | O que verifica | Natureza | Requisitos | DÃºvidas |
|---|---|---|---|---|
| `CT-CONF-LOG-01` | Ãrea obrigatÃ³ria | negativo | CONF-RF-37 | â€” |
| `CT-CONF-LOG-02` | Filtros de negÃ³cio por Ã¡rea | positivo | CONF-RF-37 | â€” |
| `CT-CONF-LOG-03` | Pesquisa pela cadeia: factura + Â«Acusou erroÂ» = Sim; ordem por omissÃ£o | positivo | CONF-RF-37 | â€” |
| `CT-CONF-LOG-04` | Data (de) posterior Ã  data (atÃ©) | negativo | CONF-TR | â€” |
| `CT-CONF-LOG-05` | Lote nÃ£o numÃ©rico: nenhum resultado, sem erro | negativo | CONF-RF-37 | â€” |
| `CT-CONF-LOG-11` | Exportar | positivo | CONF-TR | â€” |
| `CT-CONF-LOG-06` | Detalhe de uma execuÃ§Ã£o com erro | positivo | CONF-RF-37 | â€” |
| `CT-CONF-LOG-07` | CoerÃªncia entre os passos e o cabeÃ§alho | positivo | CONF-RF-37 | â€” |
| `CT-CONF-LOG-08` | Modal do passo com erro | positivo | CONF-RF-37 | Q-12 |
| `CT-CONF-LOG-09` | ExecuÃ§Ãµes com estado Â«ErroÂ» / Â«Erro de configuraÃ§Ã£oÂ» | positivo | â€” | Q-12 |
| `CT-CONF-LOG-10` | Vindo do Cockpit: Â«Retirar o filtro da execuÃ§Ã£oÂ» | positivo | CONF-RF-37 | â€” |

## Notas de implementaÃ§Ã£o

- EcrÃ£ sÃ³ de leitura. LOG-03 nÃ£o filtra por cÃ³digo de erro (o cÃ³digo nÃ£o aparece na lista); fica anotado.
- Casos marcados Â«RegistarÂ» no script (requisito Ã— construÃ­do) verificam o requisito com `expect.soft` e anotam o observado (`observacao`) no relatÃ³rio.
- Sem massa em DEV, o caso fica Â«skippedÂ» com o motivo (â›”/âž– do script).

## Como correr

```bash
npm run test:integracao -- testes/conferencia/logs-conferencia
```

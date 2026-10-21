# CT-CONF-FER â€” ConferÃªncia C1 (VisualizaÃ§Ã£o): GestÃ£o de feriados

Plano de teste por caso do Item **GestÃ£o de feriados** (`/conferencia/calendario/feriados`), automaÃ§Ã£o da camada C1 (VisualizaÃ§Ã£o) do script de testes manuais da ConferÃªncia de 08-10-2026.

| Campo | Valor |
|---|---|
| Script de origem | [Script-Conferencia-C1-Visualizacao-2026-10-08.md](../../../../QA/Testes/PDT/Testes%20manuais/08-10-2026-conferencia-funcional/Script-Conferencia-C1-Visualizacao-2026-10-08.md), S5 |
| Requisitos | PRD - ConferÃªncia v0.1 (`CONF-RF-*`, `CONF-RN-*`, `CONF-RNF-*`, `CONF-PRD-*`, `CONF-TR`); as dÃºvidas `Q-xx` ficam como anotaÃ§Ã£o `questao` |
| ImplementaÃ§Ã£o | [`gestao-feriados.spec.ts`](gestao-feriados.spec.ts) |
| Page objects | `paginas/conferencia/Traceability Suite.ts` (`Tabela`) |
| Camada | `@integracao` â€” corre contra o DEV publicado, https://app.example.internal (VPN) |
| Escrita em DEV | **Nenhuma.** O `test` de `apoio-conferencia.ts` aborta qualquer POST/PUT/PATCH/DELETE Ã  API (exceto exportaÃ§Ãµes e a contagem do disparo) e o caso falha se algum for bloqueado |
| Estado | Implementado em 08-10-2026; resultados no [documento-Ã­ndice](../../../docs/conferencia-c1-visualizacao-08-10-2026/validacao-c1-visualizacao.md) |

## Casos

| ID | O que verifica | Natureza | Requisitos | DÃºvidas |
|---|---|---|---|---|
| `CT-CONF-FER-01` | Abrir: tÃ­tulo, nota e filtros por omissÃ£o; a lista carrega sozinha | positivo | CONF-RF-23 | â€” |
| `CT-CONF-FER-02` | Feriados gerados para 2026 (Nacional, AÃ§ores, Madeira) | positivo | CONF-RF-23, CONF-RN-16 | â€” |
| `CT-CONF-FER-20` | Colunas da lista de feriados ordenÃ¡veis por clique no cabeÃ§alho (anotaÃ§Ãµes 08-10) | positivo | CONF-TR | â€” |
| `CT-CONF-FER-13` | Exportar as linhas filtradas; sem linhas o botÃ£o fica desativado | positivo | CONF-TR | â€” |

## Notas de implementaÃ§Ã£o

- Nunca Â«Incluir feriadoÂ», Â«InativarÂ» nem Â«ReativarÂ» (este grava logo, sem confirmaÃ§Ã£o).
- Casos marcados Â«RegistarÂ» no script (requisito Ã— construÃ­do) verificam o requisito com `expect.soft` e anotam o observado (`observacao`) no relatÃ³rio.
- Sem massa em DEV, o caso fica Â«skippedÂ» com o motivo (â›”/âž– do script).

## Como correr

```bash
npm run test:integracao -- testes/conferencia/gestao-feriados
```

# CT-CONF-WF â€” ConferÃªncia C1 (VisualizaÃ§Ã£o): Workflows de conferÃªncia

Plano de teste por caso do Item **Workflows de conferÃªncia** (`/motor-regras/workflows`), automaÃ§Ã£o da camada C1 (VisualizaÃ§Ã£o) do script de testes manuais da ConferÃªncia de 08-10-2026.

| Campo | Valor |
|---|---|
| Script de origem | [Script-Conferencia-C1-Visualizacao-2026-10-08.md](../../../../QA/Testes/PDT/Testes%20manuais/08-10-2026-conferencia-funcional/Script-Conferencia-C1-Visualizacao-2026-10-08.md), S11 |
| Requisitos | PRD - ConferÃªncia v0.1 (`CONF-RF-*`, `CONF-RN-*`, `CONF-RNF-*`, `CONF-PRD-*`, `CONF-TR`); as dÃºvidas `Q-xx` ficam como anotaÃ§Ã£o `questao` |
| ImplementaÃ§Ã£o | [`workflows-conferencia.spec.ts`](workflows-conferencia.spec.ts) |
| Page objects | `paginas/conferencia/motorRegras.ts` (`ListaMotorRegras`) |
| Camada | `@integracao` â€” corre contra o DEV publicado, https://app.example.internal (VPN) |
| Escrita em DEV | **Nenhuma.** O `test` de `apoio-conferencia.ts` aborta qualquer POST/PUT/PATCH/DELETE Ã  API (exceto exportaÃ§Ãµes e a contagem do disparo) e o caso falha se algum for bloqueado |
| Estado | Implementado em 08-10-2026; resultados no [documento-Ã­ndice](../../../docs/conferencia-c1-visualizacao-08-10-2026/validacao-c1-visualizacao.md) |

## Casos

| ID | O que verifica | Natureza | Requisitos | DÃºvidas |
|---|---|---|---|---|
| `CT-CONF-WF-01` | Lista e filtros (AcrÃ³nimo, Modo, Estado) | positivo | CONF-RF-27 | â€” |
| `CT-CONF-WF-02` | Filtro Ãrea: Medicamentos, MCDT, CRD | positivo | CONF-RF-27 | Q-13 |
| `CT-CONF-WF-03` | Detalhe de MED_LOTE96: regras por fase somam o N.Âº Regras | positivo | CONF-RF-27, CONF-RN-04 | Q-09 |
| `CT-CONF-WF-12` | Ids invÃ¡lidos | negativo | CONF-PRD-5 | â€” |
| `CT-CONF-WF-15` | Versionamento e eliminaÃ§Ã£o do workflow | positivo | CONF-RF-36 | Q-06 |

## Notas de implementaÃ§Ã£o

- Nunca Â«Novo workflowÂ», Â«EditarÂ», Â«AtivarÂ»/Â«DesativarÂ» nem Â«Adicionar regraÂ» (base de testes do Walmir).
- Casos marcados Â«RegistarÂ» no script (requisito Ã— construÃ­do) verificam o requisito com `expect.soft` e anotam o observado (`observacao`) no relatÃ³rio.
- Sem massa em DEV, o caso fica Â«skippedÂ» com o motivo (â›”/âž– do script).

## Como correr

```bash
npm run test:integracao -- testes/conferencia/workflows-conferencia
```

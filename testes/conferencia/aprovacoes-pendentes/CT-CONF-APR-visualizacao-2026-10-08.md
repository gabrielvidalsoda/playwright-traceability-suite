# CT-CONF-APR â€” ConferÃªncia C1 (VisualizaÃ§Ã£o): AprovaÃ§Ãµes pendentes

Plano de teste por caso do Item **AprovaÃ§Ãµes pendentes** (`/motor-regras/aprovacoes`), automaÃ§Ã£o da camada C1 (VisualizaÃ§Ã£o) do script de testes manuais da ConferÃªncia de 08-10-2026.

| Campo | Valor |
|---|---|
| Script de origem | [Script-Conferencia-C1-Visualizacao-2026-10-08.md](../../../../QA/Testes/PDT/Testes%20manuais/08-10-2026-conferencia-funcional/Script-Conferencia-C1-Visualizacao-2026-10-08.md), S13 |
| Requisitos | PRD - ConferÃªncia v0.1 (`CONF-RF-*`, `CONF-RN-*`, `CONF-RNF-*`, `CONF-PRD-*`, `CONF-TR`); as dÃºvidas `Q-xx` ficam como anotaÃ§Ã£o `questao` |
| ImplementaÃ§Ã£o | [`aprovacoes-pendentes.spec.ts`](aprovacoes-pendentes.spec.ts) |
| Page objects | `paginas/conferencia/motorRegras.ts` (`ListaMotorRegras`) |
| Camada | `@integracao` â€” corre contra o DEV publicado, https://app.example.internal (VPN) |
| Escrita em DEV | **Nenhuma.** O `test` de `apoio-conferencia.ts` aborta qualquer POST/PUT/PATCH/DELETE Ã  API (exceto exportaÃ§Ãµes e a contagem do disparo) e o caso falha se algum for bloqueado |
| Estado | Implementado em 08-10-2026; resultados no [documento-Ã­ndice](../../../docs/conferencia-c1-visualizacao-08-10-2026/validacao-c1-visualizacao.md) |

## Casos

| ID | O que verifica | Natureza | Requisitos | DÃºvidas |
|---|---|---|---|---|
| `CT-CONF-APR-01` | Contador do menu = cartÃ£o Â«PendentesÂ» | positivo | CONF-RF-35 | â€” |
| `CT-CONF-APR-02` | Lista e filtros: Estado Â«PendenteÂ», cartÃ£o Â«AgendadosÂ», Limpar, Estado vazio | positivo | CONF-RF-35 | â€” |
| `CT-CONF-APR-03` | Detalhe de um pedido pendente (sem decidir) | positivo | CONF-RF-35 | â€” |
| `CT-CONF-APR-10` | Pedidos terminais (Aprovado, Rejeitado, Cancelado) sÃ³ de leitura | positivo | CONF-RF-35 | â€” |
| `CT-CONF-APR-13` | Ids invÃ¡lidos | negativo | CONF-PRD-5 | â€” |

## Notas de implementaÃ§Ã£o

- Os pedidos pendentes sÃ£o da base de testes do Walmir: nunca Â«AprovarÂ», Â«RejeitarÂ», Â«Cancelar pedidoÂ», Â«ReagendarÂ», Â«ReprovarÂ» nem Â«ForÃ§ar vigÃªncia agoraÂ».
- Casos marcados Â«RegistarÂ» no script (requisito Ã— construÃ­do) verificam o requisito com `expect.soft` e anotam o observado (`observacao`) no relatÃ³rio.
- Sem massa em DEV, o caso fica Â«skippedÂ» com o motivo (â›”/âž– do script).

## Como correr

```bash
npm run test:integracao -- testes/conferencia/aprovacoes-pendentes
```

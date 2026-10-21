# CT-CONF-MENU â€” ConferÃªncia C1 (VisualizaÃ§Ã£o): ConferÃªncia (menu e navegaÃ§Ã£o)

Plano de teste por caso do Item **ConferÃªncia (menu e navegaÃ§Ã£o)** (`/conferencia`), automaÃ§Ã£o da camada C1 (VisualizaÃ§Ã£o) do script de testes manuais da ConferÃªncia de 08-10-2026.

| Campo | Valor |
|---|---|
| Script de origem | [Script-Conferencia-C1-Visualizacao-2026-10-08.md](../../../QA/Testes/PDT/Testes%20manuais/08-10-2026-conferencia-funcional/Script-Conferencia-C1-Visualizacao-2026-10-08.md), VerificaÃ§Ãµes prÃ©vias (PRE-01, PRE-02), S15 e S17 (NEG-05) |
| Requisitos | PRD - ConferÃªncia v0.1 (`CONF-RF-*`, `CONF-RN-*`, `CONF-RNF-*`, `CONF-PRD-*`, `CONF-TR`); as dÃºvidas `Q-xx` ficam como anotaÃ§Ã£o `questao` |
| ImplementaÃ§Ã£o | [`menu-conferencia.spec.ts`](menu-conferencia.spec.ts) |
| Page objects | `paginas/conferencia/menu.ts`, `paginas/conferencia/motorRegras.ts` |
| Camada | `@integracao` â€” corre contra o DEV publicado, https://app.example.internal (VPN) |
| Escrita em DEV | **Nenhuma.** O `test` de `apoio-conferencia.ts` aborta qualquer POST/PUT/PATCH/DELETE Ã  API (exceto exportaÃ§Ãµes e a contagem do disparo) e o caso falha se algum for bloqueado |
| Estado | Implementado em 08-10-2026; resultados no [documento-Ã­ndice](../../docs/conferencia-c1-visualizacao-08-10-2026/validacao-c1-visualizacao.md) |

## Casos

| ID | O que verifica | Natureza | Requisitos | DÃºvidas |
|---|---|---|---|---|
| `PRE-01` | O ambiente usa a API real (sem MSW) e responde 200 | positivo | â€” | Q-53 |
| `PRE-02` | Menu Â«ConferÃªnciaÂ» completo, com os Â«(em breve)Â» desativados | positivo | CONF-PRD-2.2 | â€” |
| `CT-CONF-MENU-01` | Â«Facturas conferidas com erro (em breve)Â» nÃ£o navega (nÃ£o implementado) | positivo | CONF-RF-26 | Q-50 |
| `CT-CONF-MENU-02` | Â«AlarmÃ­stica (em breve)Â» nÃ£o navega (nÃ£o implementado) | positivo | CONF-RF-25 | Q-50 |
| `CT-CONF-MENU-03` | EcrÃ£s sem item de menu: breadcrumb sob a SupervisÃ£o e a Worklist | positivo | CONF-PRD-2.2 | â€” |
| `CT-CONF-NEG-05` | Filtros e resultados repostos ao voltar com o browser | robustez | CONF-TR | â€” |

## Notas de implementaÃ§Ã£o

- Transversal ao grupo: fica ao nÃ­vel de `testes/conferencia/` (regra 4 da organizaÃ§Ã£o de testes).
- MENU-03 abre a execuÃ§Ã£o de uma tarefa **Fechada** em vez do Â«Pegar / ContinuarÂ» do script (que grava).
- Casos marcados Â«RegistarÂ» no script (requisito Ã— construÃ­do) verificam o requisito com `expect.soft` e anotam o observado (`observacao`) no relatÃ³rio.
- Sem massa em DEV, o caso fica Â«skippedÂ» com o motivo (â›”/âž– do script).

## Como correr

```bash
npm run test:integracao -- testes/conferencia/menu-conferencia.spec.ts
```

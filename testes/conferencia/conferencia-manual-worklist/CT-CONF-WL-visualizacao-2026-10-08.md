# CT-CONF-WL â€” ConferÃªncia C1 (VisualizaÃ§Ã£o): ConferÃªncia manual: worklist

Plano de teste por caso do Item **ConferÃªncia manual: worklist** (`/conferencia/worklist`), automaÃ§Ã£o da camada C1 (VisualizaÃ§Ã£o) do script de testes manuais da ConferÃªncia de 08-10-2026.

| Campo | Valor |
|---|---|
| Script de origem | [Script-Conferencia-C1-Visualizacao-2026-10-08.md](../../../../QA/Testes/PDT/Testes%20manuais/08-10-2026-conferencia-funcional/Script-Conferencia-C1-Visualizacao-2026-10-08.md), S6 (Worklist) e S7 (ExecuÃ§Ã£o de tarefa) |
| Requisitos | PRD - ConferÃªncia v0.1 (`CONF-RF-*`, `CONF-RN-*`, `CONF-RNF-*`, `CONF-PRD-*`, `CONF-TR`); as dÃºvidas `Q-xx` ficam como anotaÃ§Ã£o `questao` |
| ImplementaÃ§Ã£o | [`conferencia-manual-worklist.spec.ts`](conferencia-manual-worklist.spec.ts) |
| Page objects | `paginas/conferencia/Traceability Suite.ts` (`Tabela`) |
| Camada | `@integracao` â€” corre contra o DEV publicado, https://app.example.internal (VPN) |
| Escrita em DEV | **Nenhuma.** O `test` de `apoio-conferencia.ts` aborta qualquer POST/PUT/PATCH/DELETE Ã  API (exceto exportaÃ§Ãµes e a contagem do disparo) e o caso falha se algum for bloqueado |
| Estado | Implementado em 08-10-2026; resultados no [documento-Ã­ndice](../../../docs/conferencia-c1-visualizacao-08-10-2026/validacao-c1-visualizacao.md) |

## Casos

| ID | O que verifica | Natureza | Requisitos | DÃºvidas |
|---|---|---|---|---|
| `CT-CONF-WL-01` | Abrir a Worklist: contadores e grelha antes de pesquisar | positivo | CONF-RF-41 | â€” |
| `CT-CONF-WL-02` | Pesquisar devolve sÃ³ as suspensas do prÃ³prio utilizador | positivo | CONF-RF-41 | â€” |
| `CT-CONF-WL-03` | Filtros: sÃ³ dÃ­gitos em Processo/PrestaÃ§Ã£o, Factura Â«contÃ©mÂ», Enter e Limpar | positivo | CONF-TR | â€” |
| `CT-CONF-WL-08` | Drawer da tarefa: secÃ§Ãµes IdentificaÃ§Ã£o, Origem, Erros e Notas | positivo | CONF-RF-41 | â€” |
| `CT-CONF-WL-12` | Exportar a grelha; desativado antes de pesquisar e sem resultados | positivo | CONF-TR | â€” |
| `CT-CONF-EXE-02` | Imagem lado a lado numa tarefa Fechada de MED (sem editar) | positivo | CONF-RF-42 | â€” |
| `CT-CONF-EXE-03` | Imagem e dados numa tarefa Fechada de MCDT | positivo | CONF-RF-42 | Q-45 |
| `CT-CONF-EXE-03` | Imagem e dados numa tarefa Fechada de CRD | positivo | CONF-RF-42 | Q-45 |
| `CT-CONF-EXE-25` | HistÃ³rico da prestaÃ§Ã£o (tecla H, Â«SÃ³ notasÂ», Esc) | positivo | CONF-RF-52 | â€” |
| `CT-CONF-EXE-28` | Tarefa jÃ¡ fechada abre sÃ³ de leitura | positivo | CONF-RF-44 | â€” |
| `CT-CONF-EXE-29` | Ids invÃ¡lidos | negativo | CONF-PRD-5 | â€” |

## Notas de implementaÃ§Ã£o

- Abrir a execuÃ§Ã£o de uma tarefa **DisponÃ­vel** faz `POST /iniciar`: os casos EXE-* sÃ³ abrem tarefas **Fechadas**, confirmadas por `GET /conferencia-manual/tarefas/{id}` antes de navegar.
- Nenhum campo da execuÃ§Ã£o Ã© editado (autosave `PUT /progresso`) e nunca se usam Ctrl+S / Ctrl+Enter.
- WL-08: sem tarefas suspensas do utilizador da automaÃ§Ã£o, o drawer Ã© aberto na SupervisÃ£o (o script admite as duas origens).
- Casos marcados Â«RegistarÂ» no script (requisito Ã— construÃ­do) verificam o requisito com `expect.soft` e anotam o observado (`observacao`) no relatÃ³rio.
- Sem massa em DEV, o caso fica Â«skippedÂ» com o motivo (â›”/âž– do script).

## Como correr

```bash
npm run test:integracao -- testes/conferencia/conferencia-manual-worklist
```

# CT-CONF-SUP â€” ConferÃªncia C1 (VisualizaÃ§Ã£o): ConferÃªncia manual: supervisÃ£o

Plano de teste por caso do Item **ConferÃªncia manual: supervisÃ£o** (`/conferencia/supervisao`), automaÃ§Ã£o da camada C1 (VisualizaÃ§Ã£o) do script de testes manuais da ConferÃªncia de 08-10-2026.

| Campo | Valor |
|---|---|
| Script de origem | [Script-Conferencia-C1-Visualizacao-2026-10-08.md](../../../../QA/Testes/PDT/Testes%20manuais/08-10-2026-conferencia-funcional/Script-Conferencia-C1-Visualizacao-2026-10-08.md), S8 (SupervisÃ£o), S9 (AlocaÃ§Ã£o de Equipa) e S10 (Prestadores PrioritÃ¡rios) |
| Requisitos | PRD - ConferÃªncia v0.1 (`CONF-RF-*`, `CONF-RN-*`, `CONF-RNF-*`, `CONF-PRD-*`, `CONF-TR`); as dÃºvidas `Q-xx` ficam como anotaÃ§Ã£o `questao` |
| ImplementaÃ§Ã£o | [`conferencia-manual-supervisao.spec.ts`](conferencia-manual-supervisao.spec.ts) |
| Page objects | `paginas/conferencia/Traceability Suite.ts` (`Tabela`) |
| Camada | `@integracao` â€” corre contra o DEV publicado, https://app.example.internal (VPN) |
| Escrita em DEV | **Nenhuma.** O `test` de `apoio-conferencia.ts` aborta qualquer POST/PUT/PATCH/DELETE Ã  API (exceto exportaÃ§Ãµes e a contagem do disparo) e o caso falha se algum for bloqueado |
| Estado | Implementado em 08-10-2026; resultados no [documento-Ã­ndice](../../../docs/conferencia-c1-visualizacao-08-10-2026/validacao-c1-visualizacao.md) |

## Casos

| ID | O que verifica | Natureza | Requisitos | DÃºvidas |
|---|---|---|---|---|
| `CT-CONF-SUP-01` | Abrir: botÃµes, contadores e atualizaÃ§Ã£o a cada 30 s | positivo | CONF-RF-47 | â€” |
| `CT-CONF-SUP-02` | Painel de escaladas | positivo | CONF-RF-46 | â€” |
| `CT-CONF-SUP-03` | Pesquisa da pool: filtros coerentes e Limpar repÃµe Â«DisponÃ­velÂ» | positivo | CONF-RF-47 | â€” |
| `CT-CONF-SUP-04` | Totais da pesquisa = contadores | positivo | CONF-RF-47 | â€” |
| `CT-CONF-SUP-05` | Filtro Supervisor e o painel de escaladas | positivo | CONF-RF-46 | â€” |
| `CT-CONF-SUP-16` | SeleÃ§Ã£o de tarefas por pÃ¡gina e limite de 100 | positivo | CONF-RF-47, CONF-RN-18 | â€” |
| `CT-CONF-SUP-30` | Â«Resultados por pÃ¡ginaÂ» altera o nÃºmero de linhas da pool (anotaÃ§Ãµes 08-10) | positivo | CONF-RF-47, CONF-TR | â€” |
| `CT-CONF-SUP-17` | BotÃµes do drawer conforme o estado (sÃ³ observar) | positivo | CONF-RF-47 | â€” |
| `CT-CONF-SUP-20` | Exportar escaladas e pool | positivo | CONF-TR | â€” |
| `CT-CONF-ALO-01` | Abrir a grelha de grupos a partir da SupervisÃ£o | positivo | CONF-RF-48 | â€” |
| `CT-CONF-ALO-02` | SugestÃ£o = âŒˆNa fila / 40âŒ‰ | positivo | CONF-RF-48 | â€” |
| `CT-CONF-ALO-03` | Filtros Origem e Ciclo; Limpar repÃµe | positivo | CONF-TR | â€” |
| `CT-CONF-ALO-09` | Abrir um grupo (sÃ³ leitura, sem tocar nos operadores) | positivo | CONF-RF-48 | â€” |
| `CT-CONF-ALO-07` | Grupo sem Ã¡rea na URL volta Ã  grelha | negativo | CONF-TR | â€” |
| `CT-CONF-ALO-08` | Exportar | positivo | CONF-TR | â€” |
| `CT-CONF-PRI-01` | Abrir e pesquisar por Estado (vazio, Activo, Inactivo) | positivo | CONF-RF-49 | â€” |

## Notas de implementaÃ§Ã£o

- Os drawers sÃ³ sÃ£o observados: nenhum botÃ£o de aÃ§Ã£o Ã© clicado (Reservar, Atribuir, Suspender, ForÃ§ar libertaÃ§Ã£o, Voltar para Fila, Decidir destino, Alterar prioridade, Adicionar nota).
- Na pÃ¡gina de um grupo da AlocaÃ§Ã£o, clicar num operador grava logo (`PUT /alocacoes`): o caso ALO-09 nÃ£o toca na lista de operadores.
- SUP-16 seleciona pÃ¡ginas (estado local) e nunca clica Â«Alterar prioridadeÂ».
- Casos marcados Â«RegistarÂ» no script (requisito Ã— construÃ­do) verificam o requisito com `expect.soft` e anotam o observado (`observacao`) no relatÃ³rio.
- Sem massa em DEV, o caso fica Â«skippedÂ» com o motivo (â›”/âž– do script).

## Como correr

```bash
npm run test:integracao -- testes/conferencia/conferencia-manual-supervisao
```

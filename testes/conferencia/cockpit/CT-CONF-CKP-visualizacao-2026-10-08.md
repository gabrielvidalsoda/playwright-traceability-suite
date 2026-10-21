# CT-CONF-CKP â€” ConferÃªncia C1 (VisualizaÃ§Ã£o): Cockpit

Plano de teste por caso do Item **Cockpit** (`/conferencia/cockpit`), automaÃ§Ã£o da camada C1 (VisualizaÃ§Ã£o) do script de testes manuais da ConferÃªncia de 08-10-2026.

| Campo | Valor |
|---|---|
| Script de origem | [Script-Conferencia-C1-Visualizacao-2026-10-08.md](../../../../QA/Testes/PDT/Testes%20manuais/08-10-2026-conferencia-funcional/Script-Conferencia-C1-Visualizacao-2026-10-08.md), S1 (Cockpit), S2 (Detalhe de Ã¡rea), S3 (Nova execuÃ§Ã£o), S16 (E2E-05) e S17 (NEG-01/02) |
| Requisitos | PRD - ConferÃªncia v0.1 (`CONF-RF-*`, `CONF-RN-*`, `CONF-RNF-*`, `CONF-PRD-*`, `CONF-TR`); as dÃºvidas `Q-xx` ficam como anotaÃ§Ã£o `questao` |
| ImplementaÃ§Ã£o | [`cockpit.spec.ts`](cockpit.spec.ts) |
| Page objects | `paginas/conferencia/cockpit.ts` (`PaginaCockpit`, `PaginaDetalheArea`, `PaginaDisparar`), `paginas/conferencia/Traceability Suite.ts` |
| Camada | `@integracao` â€” corre contra o DEV publicado, https://app.example.internal (VPN) |
| Escrita em DEV | **Nenhuma.** O `test` de `apoio-conferencia.ts` aborta qualquer POST/PUT/PATCH/DELETE Ã  API (exceto exportaÃ§Ãµes e a contagem do disparo) e o caso falha se algum for bloqueado |
| Estado | Implementado em 08-10-2026; resultados no [documento-Ã­ndice](../../../docs/conferencia-c1-visualizacao-08-10-2026/validacao-c1-visualizacao.md) |

## Casos

| ID | O que verifica | Natureza | Requisitos | DÃºvidas |
|---|---|---|---|---|
| `CT-CONF-CKP-01` | Abrir o Cockpit pelo menu: ciclo por omissÃ£o, sem carregar | positivo | CONF-RF-02 | â€” |
| `CT-CONF-CKP-02` | Ciclos planeados nÃ£o aparecem no Cockpit | positivo | CONF-RF-02 | â€” |
| `CT-CONF-CKP-03` | Pesquisar mostra a grelha das 14 Ã¡reas pela ordem | positivo | CONF-RF-01 | Q-23 |
| `CT-CONF-CKP-04` | CartÃ£o Â«No sistema actualÂ» nÃ£o navega; Medicamentos Continente abre o detalhe | positivo | CONF-RF-04 | â€” |
| `CT-CONF-CKP-05` | Pesquisar sem ciclo mostra erro no campo e nÃ£o pede nada | negativo | CONF-RF-02 | â€” |
| `CT-CONF-CKP-06` | Limpar repÃµe o estado inicial | positivo | CONF-TR | â€” |
| `CT-CONF-CKP-07` | Ciclo no URL: pesquisa sozinho; ciclo inexistente volta ao estado inicial | positivo | CONF-RF-02 | â€” |
| `CT-CONF-CKP-08` | Estado da Ã¡rea coerente com o ciclo e o progresso | positivo | CONF-RN-19, CONF-PRD-3.2 | â€” |
| `CT-CONF-CKP-09` | KPIs do cartÃ£o MED Continente coerentes com o detalhe | positivo | CONF-RF-01, CONF-RF-04 | Q-18 |
| `CT-CONF-CKP-10` | Â«Actualizar dadosÂ» pede de novo o resumo das Ã¡reas | positivo | CONF-RF-03 | â€” |
| `CT-CONF-CKP-13` | Ciclo aberto Ã© acompanhado (SSE Â«eventosÂ» ou polling) | positivo | CONF-RF-03, CONF-RNF-06 | â€” |
| `CT-CONF-CKP-14` | Ciclo fechado nÃ£o Ã© acompanhado | positivo | CONF-RF-03 | â€” |
| `CT-CONF-CKP-15` | SaÃºde do ciclo em cada cartÃ£o ativo | positivo | CONF-RF-09 | Q-17 |
| `CT-CONF-CKP-16` | Â«VoltarÂ» do browser repÃµe o ciclo pesquisado antes | positivo | CONF-TR | â€” |
| `CT-CONF-DET-01` | Abrir o detalhe de Medicamentos Continente | positivo | CONF-RF-04 | â€” |
| `CT-CONF-DET-02` | Â«PrestaÃ§Ãµes rececionadasÂ»: distribuiÃ§Ã£o por lote soma o total | positivo | CONF-RF-04 | â€” |
| `CT-CONF-DET-03` | Â«PrestaÃ§Ãµes enriquecidasÂ» â‰¤ rececionadas, com % coerente | positivo | CONF-RF-04, CONF-RN-01 | â€” |
| `CT-CONF-DET-04` | Â«ConferÃªncia AutomÃ¡ticaÂ»: progresso por workflow | positivo | CONF-RF-04, CONF-RN-03 | â€” |
| `CT-CONF-DET-05` | Â«ConferÃªncia ManualÂ»: tarefas por estado somam o total e o botÃ£o abre a SupervisÃ£o | positivo | CONF-RF-04 | â€” |
| `CT-CONF-DET-06` | Fila de processamento | positivo | CONF-RF-04 | â€” |
| `CT-CONF-DET-07` | Job de start automÃ¡tico: o clique sÃ³ abre o diÃ¡logo informativo | positivo | CONF-RF-10 | Q-16 |
| `CT-CONF-DET-08` | SumÃ¡rio das ExecuÃ§Ãµes: estado coerente com processadas Ã— enriquecidas | positivo | CONF-RF-04 | â€” |
| `CT-CONF-DET-09` | Registo de execuÃ§Ãµes: paginaÃ§Ã£o no URL sobrevive ao F5 | positivo | CONF-RF-04 | â€” |
| `CT-CONF-DET-10` | ExecuÃ§Ã£o Â«Em cursoÂ» / Â«SuspensoÂ» sem aÃ§Ã£o de pausar/retomar | positivo | CONF-RF-07 | Q-14 |
| `CT-CONF-DET-11` | Â«Ver logsÂ» abre os Logs filtrados pela execuÃ§Ã£o | positivo | CONF-RF-37 | â€” |
| `CT-CONF-DET-12` | Ã‚mbito de um disparo com recorte abre o modal Â«Recorte por â€¦Â» | positivo | CONF-RF-05 | â€” |
| `CT-CONF-DET-13` | Ãrea inexistente na rota | negativo | CONF-PRD-5 | â€” |
| `CT-CONF-DET-14` | Detalhe sem ciclo | negativo | CONF-PRD-5 | â€” |
| `CT-CONF-DET-15` | Detalhe com ciclo inexistente (209912) | negativo | â€” | Q-19 |
| `CT-CONF-DET-16` | Outras Ã¡reas ativas: tÃ­tulos, cartÃµes e workflows | positivo | CONF-RF-04, CONF-RN-02, CONF-RN-03 | â€” |
| `CT-CONF-DET-17` | Â«VoltarÂ» regressa ao Cockpit com o mesmo ciclo | positivo | CONF-TR | â€” |
| `CT-CONF-DSP-01` | Abrir Â«Nova execuÃ§Ã£oÂ» a partir do detalhe | positivo | CONF-RF-05 | â€” |
| `CT-CONF-DSP-02` | Confirmar sem workflow mostra validaÃ§Ã£o e nÃ£o abre o modal | negativo | CONF-RF-05 | â€” |
| `CT-CONF-DSP-03` | Workflow completo mostra a volumetria | positivo | CONF-RF-05 | â€” |
| `CT-CONF-DSP-04` | Cascata do Ã¢mbito: trocar o prestador limpa facturas e prestaÃ§Ãµes | positivo | CONF-RF-05 | â€” |
| `CT-CONF-DSP-05` | Pesquisa de prestador por NIF e por parte do nome | positivo | CONF-RF-05 | â€” |
| `CT-CONF-DSP-06` | CÃ³digos de erro do recorte de uma factura | positivo | CONF-RF-05 | â€” |
| `CT-CONF-DSP-07` | Ãrea em receÃ§Ã£o: o disparo fica bloqueado com a data-limite | negativo | CONF-RF-11, CONF-RN-01 | â€” |
| `CT-CONF-DSP-08` | Recorte sem prestaÃ§Ãµes por conferir | negativo | CONF-RF-14 | â€” |
| `CT-CONF-DSP-09` | Â«Incluir prestaÃ§Ãµes jÃ¡ conferidasÂ»: resumo e ciclo fechado | positivo | CONF-RF-14, CONF-RN-22 | â€” |
| `CT-CONF-DSP-10` | Tarefa manual forÃ§ada: validaÃ§Ã£o em MED e Â«Em breveÂ» em MCDT | negativo | CONF-RF-13 | â€” |
| `CT-CONF-DSP-11` | Re-enriquecimento: explicaÃ§Ã£o em MED e Â«Em breveÂ» em MCDT/CRD | positivo | CONF-RF-12 | â€” |
| `CT-CONF-DSP-12` | Tecto de 10 000 itens | positivo | CONF-RN-18 | â€” |
| `CT-CONF-DSP-18` | URLs incompletas | negativo | CONF-PRD-5 | â€” |
| `CT-CONF-E2E-05` | Data da mensagem de bloqueio = limite de receÃ§Ã£o no CalendÃ¡rio | positivo | CONF-RN-01 | Q-19 |
| `CT-CONF-NEG-01` | Falha do servidor no Cockpit mostra a mensagem, sem ecrÃ£ branco | robustez | CONF-RNF-07 | â€” |
| `CT-CONF-NEG-02` | Fila indisponÃ­vel nunca mostra 0 | robustez | CONF-RF-04 | â€” |

## Notas de implementaÃ§Ã£o

- Nunca clica em Â«Recontar totaisÂ» (POST `/recontagens`) nem em Â«DispararÂ». Â«Confirmar disparoÂ» sÃ³ Ã© usado para ver a validaÃ§Ã£o: se o modal abrir, clica Â«CancelarÂ» e o caso falha.
- Escolher workflows e critÃ©rios em Â«Nova execuÃ§Ã£oÂ» faz `POST â€¦/disparos/preview`, que sÃ³ conta o recorte (permitido pelo script).
- `{CICLO_ABERTO}` = ciclo ABERTO mais antigo (o que o Cockpit prÃ©-seleciona). Os casos dos cartÃµes e do registo do detalhe usam o 1.Âº ciclo ABERTO, do mais recente para o mais antigo, que tenha prestaÃ§Ãµes/execuÃ§Ãµes em MED Continente â€” o prÃ©-selecionado estÃ¡ a zeros em DEV.
- `{AREA_REC_ENCERRADA}` / `{AREA_EM_RECECAO}` sÃ£o procuradas pelo CalendÃ¡rio (`GET /calendario/ciclos/{anoMes}/areas`) em todos os ciclos ABERTO.
- CKP-13 e CKP-14 esperam 3 e 2 minutos de propÃ³sito (acompanhamento SSE/polling).
- NEG-01/NEG-02 simulam a falha do servidor com `page.route(...).abort()` (equivale a Â«Block request URLÂ» no DevTools).
- DSP-08 e DSP-12 ficam como âž– (massa combinada Ã  mÃ£o).
- Casos marcados Â«RegistarÂ» no script (requisito Ã— construÃ­do) verificam o requisito com `expect.soft` e anotam o observado (`observacao`) no relatÃ³rio.
- Sem massa em DEV, o caso fica Â«skippedÂ» com o motivo (â›”/âž– do script).

## Como correr

```bash
npm run test:integracao -- testes/conferencia/cockpit
```

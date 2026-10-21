# CT-REG-BUG-20260910-05 â€” Ãcone de calendÃ¡rio dispara erro de "critÃ©rio mÃ­nimo"

Ver Ã­ndice geral em
[`docs/bugs-testes-manuais-16-09-2026/validacao-bugs-manuais.md`](../../../docs/bugs-testes-manuais-16-09-2026/validacao-bugs-manuais.md#grupo-b--mcdt--cuidados-respiratÃ³rios-mesma-app-Ã¡rea-sem-page-object),
Grupo B. Este ficheiro Ã© o plano de teste co-localizado com a implementaÃ§Ã£o
desta pasta (Grupo "Consulta por Ãrea de PrestaÃ§Ã£o" â€º Item "Cuidados
RespiratÃ³rios DomiciliÃ¡rios" â€º RÃ³tulo "Facturas" â€” ver
[`.claude/rules/qa-e2e-organizacao-testes.md`](../../../../.claude/rules/qa-e2e-organizacao-testes.md)) â€”
mantÃ©m-se sincronizado com o Ã­ndice, que continua a ser a fonte de verdade
para o estado geral dos 58 defeitos.

- **Bug de origem:** BUG-20260910-05
- **Ãrea/rota:** Pesquisa Facturas â€” `/cuidados-respiratorios/factura`
- **Requisito:** â€” (fora da matriz atual)
- **Page object:** `PaginaPesquisaFaturasCrd` (mesmo page object do caso `-04`)
- **Passos:**
  1. Abrir a pesquisa com todos os campos vazios.
  2. Clicar no Ã­cone de calendÃ¡rio do campo "Data da FacturaÃ§Ã£o".
- **Comportamento atual (bug):** aparece "Ã‰ necessÃ¡rio preencher pelo menos um dos campos de pesquisa." sÃ³ por abrir o calendÃ¡rio.
- **Resultado esperado (pÃ³s-correÃ§Ã£o):** abre o date-picker, sem mensagem de erro.
- **Estado:** âœ… implementado â€” `crd.spec.ts` (mesma pasta), secÃ§Ã£o Facturas â€º Pesquisa.
- **Nota:** âš ï¸ o seletor do Ã­cone de calendÃ¡rio (`botaoCalendarioData()`) nÃ£o foi confirmado contra o DOM renderizado â€” o `Datepicker` do `@Traceability Suite/ui-react` Ã© distribuÃ­do jÃ¡ compilado (sem JSX legÃ­vel) e nÃ£o hÃ¡ ambiente a correr para inspecionar visualmente. Ancorado pelo grupo do campo, mas o `aria-label` exato do botÃ£o pode precisar de ajuste na primeira corrida real.

**Data de criaÃ§Ã£o:** 2026-09-16
**Autor:** Gabriel Vidal

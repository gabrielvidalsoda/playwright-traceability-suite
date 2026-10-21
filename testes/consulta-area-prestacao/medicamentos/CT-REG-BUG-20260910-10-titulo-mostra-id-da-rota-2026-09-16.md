# CT-REG-BUG-20260910-10 — "Erros e diferenças" mostra o `id` da rota como número da factura

Ver índice geral em
[`docs/bugs-testes-manuais-16-09-2026/validacao-bugs-manuais.md`](../../../docs/bugs-testes-manuais-16-09-2026/validacao-bugs-manuais.md#grupo-a--medicamentos--consulta-área-prestação-área-já-coberta-pela-suíte),
Grupo A. Este ficheiro é o plano de teste co-localizado com a implementação
desta pasta (Grupo "Consulta por Área de Prestação" › Item "Medicamentos" ›
Rótulo "Facturas" — ver [`.claude/rules/qa-e2e-organizacao-testes.md`](../../../../.claude/rules/qa-e2e-organizacao-testes.md)) —
mantém-se sincronizado com o índice, que continua a ser a fonte de verdade
para o estado geral dos 58 defeitos.

- **Bug de origem:** BUG-20260910-10
- **Área/rota:** `/medicamentos/factura/:id/erros-diferencas`
- **Requisito:** RF21
- **Page object:** `PaginaErrosDiferencasFatura` (mesmo page object do caso `-09`)
- **Passos:**
  1. Abrir "Erros e diferenças" de uma fatura conhecida.
  2. Comparar o "número da factura" mostrado com o número real.
- **Comportamento atual (bug):** o título mostra o `:id` da URL (`Erros e diferenças — Factura {id}` em `ErrosDiferencasPage.tsx`, interpola o param bruto), não o número real.
- **Resultado esperado (pós-correção):** mostra o número real da fatura.
- **Estado:** ✅ implementado — `medicamentos.spec.ts` (mesma pasta), secção Facturas › Erros e diferenças. **Confirmado que o bug ainda reproduz no código-fonte atual**; o teste falha até isso ser corrigido, como esperado de um teste de regressão para um bug ainda aberto.

**Data de criação:** 2026-09-16
**Autor:** Gabriel Vidal

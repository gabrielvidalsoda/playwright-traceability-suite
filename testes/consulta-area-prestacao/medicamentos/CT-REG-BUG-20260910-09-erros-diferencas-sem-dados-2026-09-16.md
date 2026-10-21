# CT-REG-BUG-20260910-09 — "Erros e diferenças" abre sem dados

Ver índice geral em
[`docs/bugs-testes-manuais-16-09-2026/validacao-bugs-manuais.md`](../../../docs/bugs-testes-manuais-16-09-2026/validacao-bugs-manuais.md#grupo-a--medicamentos--consulta-área-prestação-área-já-coberta-pela-suíte),
Grupo A. Este ficheiro é o plano de teste co-localizado com a implementação
desta pasta (Grupo "Consulta por Área de Prestação" › Item "Medicamentos" ›
Rótulo "Facturas" — ver [`.claude/rules/qa-e2e-organizacao-testes.md`](../../../../.claude/rules/qa-e2e-organizacao-testes.md)) —
mantém-se sincronizado com o índice, que continua a ser a fonte de verdade
para o estado geral dos 58 defeitos.

- **Bug de origem:** BUG-20260910-09
- **Área/rota:** `/medicamentos/factura/:id/erros-diferencas`
- **Requisito:** RF32
- **Page object:** `PaginaErrosDiferencasFatura` (confirmado contra `ErrosDiferencasPage.tsx`)
- **Passos:**
  1. Abrir o detalhe de uma fatura CCE (a tabela de erros/diferenças aparece preenchida no detalhe).
  2. Clicar em "Erros e diferenças".
- **Comportamento atual (bug):** a tela dedicada abre sem dados.
- **Resultado esperado (pós-correção):** a tela dedicada mostra os mesmos erros/diferenças do detalhe.
- **Estado:** ✅ implementado — `medicamentos.spec.ts` (mesma pasta), secção Facturas › Erros e diferenças.
- **Nota:** as duas telas usam exatamente o mesmo endpoint (`searchErrosDiferencas`) com o mesmo id — o bug parece resolvido no código-fonte atual.

**Data de criação:** 2026-09-16
**Autor:** Gabriel Vidal

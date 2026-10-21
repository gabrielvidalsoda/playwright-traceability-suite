# CT-REG-BUG-20260910-04 — Digitar a data completa esvazia o campo "Data da Facturação"

Ver índice geral em
[`docs/bugs-testes-manuais-16-09-2026/validacao-bugs-manuais.md`](../../../docs/bugs-testes-manuais-16-09-2026/validacao-bugs-manuais.md#grupo-b--mcdt--cuidados-respiratórios-mesma-app-área-sem-page-object),
Grupo B. Este ficheiro é o plano de teste co-localizado com a implementação
desta pasta (Grupo "Consulta por Área de Prestação" › Item "Cuidados
Respiratórios Domiciliários" › Rótulo "Facturas" — ver
[`.claude/rules/qa-e2e-organizacao-testes.md`](../../../../.claude/rules/qa-e2e-organizacao-testes.md)) —
mantém-se sincronizado com o índice, que continua a ser a fonte de verdade
para o estado geral dos 58 defeitos.

- **Bug de origem:** BUG-20260910-04
- **Área/rota:** Pesquisa Facturas — `/cuidados-respiratorios/factura` (`FacturaPage.tsx` / `FacturaFormFiltros.tsx`, área CRD)
- **Requisito:** — (fora da matriz RF29/RF21/RF32 atual)
- **Page object:** `PaginaPesquisaFaturasCrd`
- **Nota de rótulo:** o campo chama-se "Data da Facturação" no código-fonte, não "Data da Factura" como no relatório original — mesmo campo, rótulo real confirmado.
- **Nota de hierarquia:** a área chama-se **Cuidados Respiratórios Domiciliários** no menu real da app (`area-crd`), não só "Cuidados Respiratórios".
- **Passos:**
  1. Abrir a pesquisa.
  2. Escrever `31/12/2024` no campo "Data da Facturação".
- **Comportamento atual (bug):** o campo fica vazio; a data não é aceite por digitação.
- **Resultado esperado (pós-correção):** a data digitada (`DD/MM/AAAA`) é aceite.
- **Estado:** ✅ implementado — `crd.spec.ts` (mesma pasta), secção Facturas › Pesquisa.

**Data de criação:** 2026-09-16
**Autor:** Gabriel Vidal

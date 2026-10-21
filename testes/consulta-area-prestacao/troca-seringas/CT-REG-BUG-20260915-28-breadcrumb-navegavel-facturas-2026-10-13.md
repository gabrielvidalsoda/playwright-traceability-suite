# CT-REG-BUG-20260915-28 â€” Breadcrumb navegÃ¡vel em Troca de Seringas â†’ Facturas

| Campo | Valor |
|---|---|
| Origem | BUG-20260915-28 Â· [#1525](https://tree.taiga.io/project/douglasmorpheus-Traceability Suite-ccm/issue/1525) Â· sev. Normal Â· responsÃ¡vel Henrique Â· rejeitado a 23-09 e 24-09, reaberto a 28-09, Ready for test a 06-10-2026 |
| RelatÃ³rio de origem | `CCM/QA/Taiga/Import feito/2026-09-15/Relatorio-Testes-Manuais-2026-09-15.md` Â§5.6 |
| Plano | [plano-validacao-ready-for-test.md](../../../docs/ready-for-test-taiga-09-10-2026/plano-validacao-ready-for-test.md) Â§3 â€” CT-REG-BUG-20260915-28 |
| Ãrea/rota | Consulta por Ãrea de PrestaÃ§Ã£o (menu Â«Ãrea de PrestaÃ§Ã£oÂ») â†’ Programa Troca de Seringas â†’ Facturas Â· `/troca-seringas/factura` |
| Caminho de entrada | Dados de ReferÃªncia â†’ Programa Troca de Seringas (`/dados-referencia/troca-seringas`) â†’ Ver (1.Âº registo) â†’ "Ir para facturas" (o mesmo do `CT-DR-B3.4`) |
| Requisito | RF29, RF57 |
| Page objects | `PaginaPesquisaDadosReferencia` + `TROCA_SERINGAS` (`paginas/dadosReferencia/`); helpers `verificarBreadcrumbNavegavel`, `abrirPeloMenu`, `abrirPrimeiroDetalheDaPesquisa` (`../apoio-consulta.ts`) |
| CÃ³digo de referÃªncia | `ccmsns-ui` `origin/develop` (`1865324`, 09-10-2026): `src/layout/MainLayout.tsx` (`ROTAS_SEM_BREADCRUMB` inclui `/troca-seringas/factura`; o trilho vem de `trilhoAte` em `menuCorrespondencia.ts`, e sÃ³ os nÃ³s de menu com `url` ganham link) â€” sÃ³ leitura |
| Spec | [`troca-seringas.spec.ts`](troca-seringas.spec.ts) |
| Camada | `@integracao` (depende dos registos de ConvenÃ§Ãµes SICAD do ambiente) |
| Data | 13-10-2026 |

## Passos

1. Dados de ReferÃªncia â†’ Programa Troca de Seringas: pesquisar com "CÃ³digo / prestador" = `a` e abrir o 1.Âº registo (Ver).
2. No detalhe, clicar em cada nÃ­vel do breadcrumb anterior ao atual que tenha link e voltar atrÃ¡s.
3. Clicar em "Ir para facturas": abre `/troca-seringas/factura?codigoSicad=<cÃ³digo>`.
4. Em Facturas, se houver breadcrumb, clicar em cada nÃ­vel anterior ao atual.
5. Abrir Facturas pelo menu, pesquisar (NÃºmero da Factura `1`) e abrir o detalhe de uma factura; clicar em cada nÃ­vel do breadcrumb anterior ao atual.

## Comportamento do defeito

Em `/troca-seringas/factura`, os nÃ­veis do breadcrumb nÃ£o eram clicÃ¡veis.

## Resultado esperado

- Cada nÃ­vel anterior ao atual que corresponde a uma pÃ¡gina Ã© um link e abre essa pÃ¡gina.
- Os nÃ­veis que sÃ£o sÃ³ grupos do menu, sem pÃ¡gina prÃ³pria (`Dados de ReferÃªncia`, `Ãrea de PrestaÃ§Ã£o`, o Item `Programa Troca de Seringas` em Consulta), nÃ£o tÃªm destino. Aparecem como texto e ficam registados como observaÃ§Ã£o no relatÃ³rio, nÃ£o como falha.
- Aberto pelo menu (ou por "Ir para facturas"), o ecrÃ£ de Facturas nÃ£o mostra breadcrumb (Manual A.1, `TASK-20260928-04`). Nesse caso nÃ£o hÃ¡ nÃ­veis a navegar e o passo 4 fica **nÃ£o aplicÃ¡vel**: o defeito deixa de se reproduzir neste ecrÃ£.
- Sem facturas de Troca de Seringas no ambiente, o passo 5 fica **nÃ£o aplicÃ¡vel**.

## Estado

Implementado a 13-10-2026. Resultado no DEV: por executar.

## Como correr

```bash
cd CCM/ccmsns-qa-e2e
node ferramentas/correr.mjs integracao --project=chromium --grep "CT-REG-BUG-20260915-28"
```

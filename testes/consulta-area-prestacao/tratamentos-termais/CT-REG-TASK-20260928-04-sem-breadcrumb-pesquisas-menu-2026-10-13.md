# CT-REG-TASK-20260928-04 â€” Sem breadcrumb nas pesquisas abertas pelo menu (Tratamentos Termais)

| Campo | Valor |
|---|---|
| Origem | TASK-20260928-04 Â· [#1565](https://tree.taiga.io/project/douglasmorpheus-Traceability Suite-ccm/issue/1565) Â· responsÃ¡vel Vinicius Â· Ready for test a 06-10-2026 |
| Plano | [plano-validacao-ready-for-test.md](../../../docs/ready-for-test-taiga-09-10-2026/plano-validacao-ready-for-test.md) Â§4 â€” CT-REG-TASK-20260928-04 (ecrÃ£s em Â§4.1) |
| Ãrea/rota | Consulta por Ãrea de PrestaÃ§Ã£o (menu lateral Â«Ãrea de PrestaÃ§Ã£oÂ») â†’ Tratamentos Termais |
| Variantes | `CT-REG-TASK-20260928-04-TT-FAT` â€” Facturas (`/tratamentos-termais/factura`)<br>`CT-REG-TASK-20260928-04-TT-LOT` â€” Lotes (`/tratamentos-termais/lote`)<br>`CT-REG-TASK-20260928-04-TT-PRE` â€” PrestaÃ§Ãµes (`/tratamentos-termais/prestacao`) |
| PadrÃ£o | Manual de PadrÃµes CCM, A.1 â€” as pesquisas abertas pelo menu nÃ£o mostram breadcrumb; o breadcrumb sÃ³ aparece a partir do segundo nÃ­vel (detalhe, novo, â€¦) |
| Requisito | RF29 |
| CÃ³digo de referÃªncia | `ccmsns-ui` `origin/develop` (`1865324`, 09-10-2026): `src/layout/MainLayout.tsx` (menu e `ROTAS_SEM_BREADCRUMB`) â€” sÃ³ leitura |
| Spec | [`tratamentos-termais.spec.ts`](tratamentos-termais.spec.ts), casos gerados por `casosPadraoPesquisaItem` de `../apoio-consulta.ts` |
| Camada | `@front` (sÃ³ interface); executado tambÃ©m contra o DEV com `--dev` |
| Data | 13-10-2026 |

## Passos

1. Abrir a aplicaÃ§Ã£o e, no menu lateral, escolher Â«Ãrea de PrestaÃ§Ã£o â†’ Tratamentos Termais â†’ <RÃ³tulo>Â».
2. Procurar o breadcrumb no topo do conteÃºdo (`nav.breadcrumb`, componente `Breadcrumb` do `@Traceability Suite/ui-react`).
3. Pesquisar pelo Â«NÃºmero da FacturaÂ» (valor de sonda `1`, que no DEV devolve registos por correspondÃªncia parcial) e abrir o detalhe do 1.Âº registo.
4. Procurar o breadcrumb no detalhe.

## Comportamento anterior

A pesquisa aberta diretamente pelo menu continuava a mostrar o breadcrumb (ex.: Medicamentos â†’ Lotes, `/medicamentos/lote`), na conferÃªncia de padrÃµes de 28-09-2026.

## Resultado esperado

- Passo 2: nÃ£o hÃ¡ breadcrumb. A asserÃ§Ã£o falha com a rota e o texto do breadcrumb visÃ­vel.
- Passo 4: o breadcrumb aparece. Sem registo com detalhe no ambiente (ou sem aÃ§Ã£o de detalhe na grelha), este critÃ©rio fica **nÃ£o aplicÃ¡vel** (anotaÃ§Ã£o `nao-aplicavel` no relatÃ³rio) e nÃ£o faz falhar o caso.

## Estado

Implementado a 13-10-2026.

| Variante | Rota | Resultado no DEV (13-10-2026) |
|---|---|---|
| `CT-REG-TASK-20260928-04-TT-FAT` | `/tratamentos-termais/factura` | por executar |
| `CT-REG-TASK-20260928-04-TT-LOT` | `/tratamentos-termais/lote` | por executar |
| `CT-REG-TASK-20260928-04-TT-PRE` | `/tratamentos-termais/prestacao` | por executar |

## Como correr

```bash
cd CCM/ccmsns-qa-e2e
# contra o DEV publicado (VPN)
node ferramentas/correr.mjs tudo --dev --project=chromium --grep "CT-REG-TASK-20260928-04-TT-"
# em mock local (sem VPN)
npm run test:front -- --grep "CT-REG-TASK-20260928-04-TT-"
```

# CT-REG-TASK-20260928-05 â€” Placeholders com instruÃ§Ã£o de preenchimento (SaÃºde Oral)

| Campo | Valor |
|---|---|
| Origem | TASK-20260928-05 Â· [#1566](https://tree.taiga.io/project/douglasmorpheus-Traceability Suite-ccm/issue/1566) Â· responsÃ¡vel Vinicius Â· Ready for test a 06-10-2026 |
| Plano | [plano-validacao-ready-for-test.md](../../../docs/ready-for-test-taiga-09-10-2026/plano-validacao-ready-for-test.md) Â§4 â€” CT-REG-TASK-20260928-05 (ecrÃ£s em Â§4.1) |
| Ãrea/rota | Consulta por Ãrea de PrestaÃ§Ã£o (menu lateral Â«Ãrea de PrestaÃ§Ã£oÂ») â†’ SaÃºde Oral |
| Variantes | `CT-REG-TASK-20260928-05-SO-FAT` â€” Facturas (`/saude-oral/factura`)<br>`CT-REG-TASK-20260928-05-SO-PRE` â€” PrestaÃ§Ãµes (`/saude-oral/prestacoes`) |
| PadrÃ£o | Manual de PadrÃµes CCM, B.7 â€” o campo vazio mostra uma instruÃ§Ã£o de preenchimento ("Insira o/aâ€¦" nos campos de texto, "Selecione" nos dropdowns), nunca um valor de exemplo ("Ex: 000000000000") |
| Requisito | RF29 |
| Spec | [`saude-oral.spec.ts`](saude-oral.spec.ts), casos gerados por `casosPadraoPesquisaItem` de `../apoio-consulta.ts` |
| Camada | `@front` (sÃ³ interface); executado tambÃ©m contra o DEV com `--dev` |
| Data | 13-10-2026 |

## Passos

1. Abrir a aplicaÃ§Ã£o e, no menu lateral, escolher Â«Ãrea de PrestaÃ§Ã£o â†’ SaÃºde Oral â†’ <RÃ³tulo>Â».
2. Ler o `placeholder` de cada campo de texto vazio do filtro (incluindo o autocomplete Â«PrestadorÂ») e o texto de cada SelectBox sem valor (`.Traceability Suite-select-box-value.is-placeholder`). A grelha, a paginaÃ§Ã£o e o breadcrumb ficam de fora.

## Comportamento anterior

Os campos de filtro vazios mostravam um exemplo de valor em vez de dizer como preencher (ex.: "Ex: 000000000000"), na conferÃªncia de padrÃµes de 28-09-2026.

## Resultado esperado

Nenhum placeholder comeÃ§a por "Ex:" nem Ã© sÃ³ dÃ­gitos/zeros, e todos comeÃ§am por "Insira" ou "Selecione". O caso falha com a lista dos campos fora do padrÃ£o (campo, placeholder e motivo) na mensagem da asserÃ§Ã£o.

**Campos de data:** a mÃ¡scara `DD/MM/YYYY` do Datepicker do design system nÃ£o Ã© texto da aplicaÃ§Ã£o e Ã© a mesma das pesquisas de Dados de ReferÃªncia, dadas como conformes (Manual B.7). Fica fora do critÃ©rio "Insira/Selecione" e Ã© registada como observaÃ§Ã£o no relatÃ³rio. Se a decisÃ£o for outra, basta retirar a exceÃ§Ã£o `MASCARA_DATA` em `apoio-consulta.ts`.

## Estado

Implementado a 13-10-2026.

| Variante | Rota | Resultado no DEV (13-10-2026) |
|---|---|---|
| `CT-REG-TASK-20260928-05-SO-FAT` | `/saude-oral/factura` | por executar |
| `CT-REG-TASK-20260928-05-SO-PRE` | `/saude-oral/prestacoes` | por executar |

## Como correr

```bash
cd CCM/ccmsns-qa-e2e
# contra o DEV publicado (VPN)
node ferramentas/correr.mjs tudo --dev --project=chromium --grep "CT-REG-TASK-20260928-05-SO-"
# em mock local (sem VPN)
npm run test:front -- --grep "CT-REG-TASK-20260928-05-SO-"
```

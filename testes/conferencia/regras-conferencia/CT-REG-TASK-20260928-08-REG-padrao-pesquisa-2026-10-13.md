# CT-REG-TASK-20260928-08-REG â€” PadrÃ£o de pesquisa: Regras de conferÃªncia

Plano de teste por caso da variante `-REG` do `CT-REG-TASK-20260928-08`, que verifica se o ecrÃ£
**Regras de conferÃªncia** cumpre os 5 pontos da TASK-20260928-08 (pesquisas do grupo ConferÃªncia no padrÃ£o).

| Campo | Valor |
|---|---|
| Origem | [TASK-20260928-08 â€” #1568](https://tree.taiga.io/project/douglasmorpheus-Traceability Suite-ccm/issue/1568) (Enhancement, responsÃ¡vel Walmir) Â· [Import Taiga 28-09](../../../../QA/Taiga/Import%20feito/2026-09-28-conferencia-padroes/Taiga-Import-2026-09-28-conferencia-padroes.md) Â· white box de 28-09-2026, Â§Ajustar 8 (8.1â€“8.5) |
| Plano de origem | [ValidaÃ§Ã£o Ready for test (09-10-2026)](../../../docs/ready-for-test-taiga-09-10-2026/plano-validacao-ready-for-test.md), Â§4 â€” `CT-REG-TASK-20260928-08` |
| Ãrea/rota | ConferÃªncia â†’ Regras de conferÃªncia Â· `/motor-regras/regras` (aberto pelo item de menu) Â· tÃ­tulo `h1` Â«Pesquisa de RegrasÂ» |
| PadrÃ£o | Manual de PadrÃµes CCM (30-09-2026): A.1 (breadcrumb sÃ³ fora do menu), B.3 (filtros a 100% da largura), C.3 (estado em texto simples, critÃ©rio do `CT-DR-A16`), B.7 (placeholder com instruÃ§Ã£o), A.2 (tÃ­tulo dentro do container) |
| ImplementaÃ§Ã£o | [`regras-conferencia.spec.ts`](regras-conferencia.spec.ts) â€º `PadrÃ£o de pesquisa` Â· helper `verificarPadraoPesquisa()` em [`apoio-conferencia.ts`](../apoio-conferencia.ts) Â· leitura do DOM em `paginas/conferencia/padraoPesquisa.ts` |
| Tags | `@CT-REG-TASK-20260928-08-REG`, `@TASK-20260928-08`, `@integracao`, `@interface`, `@area-regras` |
| Camada | `@integracao` â€” corre contra o DEV publicado (https://app.example.internal, VPN); o ponto 3 precisa de dados reais na grelha. ResoluÃ§Ã£o 1920Ã—1080 (resoluÃ§Ã£o mÃ­nima padrÃ£o do sistema, white box de 28-09) |
| Escrita em DEV | **Nenhuma.** O `test` de `apoio-conferencia.ts` aborta qualquer POST/PUT/PATCH/DELETE; os dropdowns sÃ³ sÃ£o abertos e fechados (sem escolher), exceto o filtro obrigatÃ³rio indicado na pesquisa por omissÃ£o |

## Passos

1. Abrir `/` e clicar no item de menu Â«Regras de conferÃªnciaÂ»; esperar o `h1` Â«Pesquisa de RegrasÂ» e os campos de filtro.
2. Ler o DOM antes de pesquisar: breadcrumb (`nav.breadcrumb`), caixas dos campos de filtro (cÃ©lulas da grelha `Seccao`) e Ã¡rea Ãºtil do cartÃ£o, placeholders (texto, SelectBox vazio, Datepicker) e tÃ­tulos do cartÃ£o.
3. **Ponto 1 â€” Breadcrumb:** nÃ£o existe breadcrumb.
4. **Ponto 2 â€” Largura dos filtros:** em cada linha de campos, do 1.Âº ao Ãºltimo, a largura ocupada Ã© â‰¥ 98% da Ã¡rea Ãºtil do cartÃ£o (tolerÃ¢ncia de 2%). Um bloco com um sÃ³ campo segue a exceÃ§Ã£o de 50% (B.3). A Ãºltima linha de uma grelha com vÃ¡rias linhas fica sÃ³ anotada (`observacao`), porque recebe as colunas que sobram.
5. **Ponto 3 â€” Chips:** Pesquisar sem filtros; depois, nenhum elemento com classe de chip/badge (`MuiChip`, `MuiBadge`, `badge`, `chip`) no conteÃºdo da pÃ¡gina. Sem linhas na grelha, o ponto fica `nao-aplicavel`.
6. **Ponto 4 â€” Placeholders:** em cada campo vazio, o placeholder nÃ£o comeÃ§a por Â«ExÂ»/Â«ExemploÂ», nÃ£o Ã© sÃ³ dÃ­gitos e comeÃ§a por Â«Insiraâ€¦Â» ou Â«Selecioneâ€¦Â» (aceita-se Â«SeleccioneÂ»). Datas: aceita-se a mÃ¡scara de formato (anotada). Campos com valor por omissÃ£o nÃ£o se avaliam.
7. **Ponto 5 â€” TÃ­tulo:** o `h1` estÃ¡ dentro de um cartÃ£o e o cartÃ£o dos campos de pesquisa tem um tÃ­tulo acima dos campos.

Cada ponto Ã© um `test.step` com `expect.soft`: o relatÃ³rio mostra todos os pontos fora do padrÃ£o, com o valor obtido.

## Comportamento anterior (white box de 28-09-2026)

- o breadcrumb aparecia nas pesquisas do grupo ConferÃªncia;
- os filtros nÃ£o preenchiam o espaÃ§o horizontal;
- havia chips em textos que deviam ser sÃ³ texto;
- os placeholders mostravam exemplos em vez de instruÃ§Ã£o de preenchimento;
- o tÃ­tulo estava fora do bloco dos campos de pesquisa.

## Resultado esperado

Os 5 pontos corrigidos neste ecrÃ£: sem breadcrumb; filtros a ~100% da largura em cada linha;
estado/situaÃ§Ã£o em texto simples; placeholders Â«Insiraâ€¦Â»/Â«Selecioneâ€¦Â»; tÃ­tulo dentro do cartÃ£o
dos campos de pesquisa.

## Estado

Implementado a 13-10-2026. **Falha â€” ponto 4 fora do padrÃ£o** na execuÃ§Ã£o `teste-integracao-dev-2026-10-13_09-33-53` (DEV, chromium):

| Ponto | Resultado no DEV (13-10-2026) |
|---|---|
| 1. Breadcrumb | âœ… sem breadcrumb |
| 2. Largura dos filtros | âœ… 6 campos em 6 colunas, 100% |
| 3. Chips | âœ… grelha com linhas, sem chips nem badges |
| 4. Placeholders | âŒ AcrÃ³nimo: Â«Ex.: MED_D399Â» (exemplo); Erro: Â«Pesquise por ID, cÃ³digo ou descriÃ§Ã£oÂ» (instruÃ§Ã£o, mas fora do formato Â«Insiraâ€¦Â») |
| 5. TÃ­tulo | âœ… h1 dentro do cartÃ£o dos filtros |

Falhas: `relatorios/playwright/teste-integracao-dev-2026-10-13_09-33-53/falhas-teste-integracao-dev-2026-10-13_09-33-53.md`.

## Como correr

```bash
cd CCM/ccmsns-qa-e2e
node ferramentas/correr.mjs tudo --dev --project=chromium --retries=0 --grep "CT-REG-TASK-20260928-08-REG"
# todas as variantes da tarefa
node ferramentas/correr.mjs tudo --dev --project=chromium --retries=0 --workers=2 --grep "CT-REG-TASK-20260928-08"
```

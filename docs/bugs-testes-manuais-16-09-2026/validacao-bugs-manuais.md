# Plano de testes â€” ValidaÃ§Ã£o dos bugs reportados nos testes manuais

Casos de teste para repetir o comportamento do utilizador que expÃ´s cada
defeito e confirmar se o resultado passou a ser o esperado. Segue o modelo
`CT-REG-<nÂº do defeito>` jÃ¡ previsto em
[`regressao.md`](regressao.md#ct-reg---casos-de-regressÃ£o-por-defeito-modelo),
preenchido aqui pela primeira vez com os 58 defeitos abertos em
[`CCM/QA/Levantamento-Bugs-Status-Criticidade-2026-09-16.md`](../../../QA/Levantamento-Bugs-Status-Criticidade-2026-09-16.md).

| Item | Valor |
|---|---|
| Fontes | [10-09-2026](../../../QA/Testes/Testes%20manuais/10-09-2026/Relatorio-Testes-Manuais-2026-09-10.md) Â· [11-09-2026](../../../QA/Testes/Testes%20manuais/11-09-2026/Relatorio-Testes-Manuais-2026-09-11.md) Â· [Taiga-Import 14-09-2026](../../../QA/Testes/Testes%20manuais/11-09-2026/Taiga-Import-2026-09-14.md) Â· [15-09-2026](../../../QA/Testes/Testes%20manuais/15-09-2026/Relatorio-Testes-Manuais-2026-09-15.md) |
| ConvenÃ§Ã£o de ID | `CT-REG-BUG-<AAAAMMDD>-<NN>` (mesmo ID do defeito, com prefixo `CT-REG-`) |
| Ambiente | **API real** (`dev:api` ou `AMBIENTE=qua`) â€” ver [Â§0.1](#01-ambiente-api-real-nÃ£o-mock) |
| CritÃ©rio de aprovaÃ§Ã£o | o teste **passa** quando o "Resultado esperado" ocorre e o "Comportamento atual (bug)" deixa de se reproduzir |
| Data de criaÃ§Ã£o | 16-09-2026 |
| Autor | Gabriel Vidal |

---

## 0. Antes de implementar

### 0.1 Ambiente: API real, nÃ£o mock

Esta suÃ­te de validaÃ§Ã£o corre contra a **API real** (`AMBIENTE=qua` ou
`dev:api`, ver [`README.md`](../../README.md#apontar-para-qua-em-vez-do-mock)),
nÃ£o em modo mock. Isso resolve, por decisÃ£o, a questÃ£o de cobertura de MSW â€”
nÃ£o precisamos de mocks para nenhuma das Ã¡reas abaixo, incluindo as que hoje
nÃ£o tÃªm handler em `CCM/repos/ccmsns-ui`.

Continua a valer que **`CCM/repos` Ã© intocÃ¡vel** por QA: nada neste plano
(nem a implementaÃ§Ã£o) edita esse repositÃ³rio â€” Ã© sÃ³ lido, para confirmar
rotas e seletores reais antes de escrever os `page objects`.

ConsequÃªncia prÃ¡tica: os testes assumem dados jÃ¡ existentes no ambiente (ou
criados pelo prÃ³prio teste, quando o bug Ã© sobre uma aÃ§Ã£o de escrita) â€” nÃ£o
hÃ¡ seed determinÃ­stico como o do modo mock. Onde o caso depende de um
identificador real (fatura, caixa, prescriÃ§Ã£o), o campo fica com um
placeholder `[A PREENCHER]`, no mesmo padrÃ£o jÃ¡ usado no bloco `qua` de
`dados/massa.ts`.

### 0.2 A maioria dos bugs estÃ¡ fora da Ã¡rea hoje coberta

A suÃ­te sÃ³ tem *page objects* para Fatura/Lote/PrestaÃ§Ã£o de Medicamentos
(`paginas/`). Dos 58 bugs, **apenas 5** caem nessa Ã¡rea. Os outros 53
exigem pÃ¡gina nova, marcada ðŸ”´ **novo page object**. Implementar isso Ã© o
grosso do esforÃ§o desta validaÃ§Ã£o â€” nÃ£o Ã© uma extensÃ£o pequena da suÃ­te
atual.

### 0.3 Formato real do nÃºmero da fatura â€” nÃ£o Ã© puramente numÃ©rico

O caso original sobre o campo "NÃºmero da Factura" aceitar letras
(`BUG-20260910-01`) foi **removido** deste plano: o nÃºmero de fatura nÃ£o Ã©
um campo numÃ©rico por definiÃ§Ã£o â€” o formato observado inclui prefixo de
letra e traÃ§o (ex. `F12-316`, tambÃ©m `F20250002` no seed mock). Um campo
rotulado "NÃºmero da Factura" aceitar letras nÃ£o Ã©, por si, um defeito;
o que os outros trÃªs campos (Processo, NIF, CÃ³digo da FarmÃ¡cia) fazem
(sÃ³ dÃ­gitos) nÃ£o implica que "NÃºmero da Factura" deva seguir a mesma regra.
Isto fica registado aqui para nÃ£o se perder â€” se surgir uma regra de negÃ³cio
que contradiga isto (e.g. confirmaÃ§Ã£o de que sÃ³ um subconjunto de letras Ã©
vÃ¡lido), o caso pode voltar a ser especificado com a regra correta.

### 0.4 ConvenÃ§Ã£o de pastas e ficheiros por teste implementado

A partir de 2026-09-17, a suÃ­te `testes/` Ã© organizada pela **hierarquia real
do menu da app** (confirmada em `CCM/repos/ccmsns-ui`, sÃ³ leitura), nÃ£o mais
por lote/data de levantamento de bugs:

| NÃ­vel do sistema | Exemplo real | Unidade de organizaÃ§Ã£o |
|---|---|---|
| **Grupo** (menu de topo) | "Consulta por Ãrea de PrestaÃ§Ã£o" | **pasta** em `testes/<grupo>/` |
| **Item** (Ã¡rea dentro do grupo) | "Medicamentos", "MCDT", "Cuidados RespiratÃ³rios DomiciliÃ¡rios" | **subpasta** em `testes/<grupo>/<item>/` |
| **RÃ³tulo** (ecrÃ£ dentro do item) | "Facturas" (a mesma MCDT tem Lotes, PrestaÃ§Ãµes, â€¦) | **secÃ§Ã£o** (`test.describe`) dentro do ficheiro do item â€” **nÃ£o** um ficheiro Ã  parte |

Ou seja: **um ficheiro `.spec.ts` por Item**, nomeado como o Item
(`medicamentos.spec.ts`, `crd.spec.ts`, `mcdt.spec.ts`, â€¦), dentro de
`testes/<grupo>/<item>/`. Todos os RÃ³tulos desse Item (Facturas, Lotes,
PrestaÃ§Ãµes, sub-telas como Detalhe/Erros e diferenÃ§as) ficam **no mesmo
ficheiro**, como `test.describe` aninhados â€” nÃ£o se cria um ficheiro por
RÃ³tulo nem por bug individual. Exemplo real jÃ¡ migrado:
`testes/consulta-area-prestacao/medicamentos/medicamentos.spec.ts` reÃºne
Facturas (Pesquisa/Detalhe/Erros e diferenÃ§as), Lotes (Pesquisa/Detalhe) e
PrestaÃ§Ãµes (Pesquisa) â€” 25 casos, um sÃ³ ficheiro.

Cada pasta de Item tambÃ©m guarda um `.md` de **plano de teste por caso**, no
formato de ficha jÃ¡ usado nas secÃ§Ãµes abaixo (Bug de origem, Ãrea/rota,
Requisito, Page object, Passos, Comportamento atual, Resultado esperado,
Estado), nomeado:

```
<identificador-Ãºnico>-<pequena-descriÃ§Ã£o-kebab>-<data-de-criaÃ§Ã£o AAAA-MM-DD>.md
```

onde `<identificador-Ãºnico>` Ã© o mesmo ID jÃ¡ usado no resto deste plano
(`CT-REG-BUG-<AAAAMMDD>-<NN>`, ou o ID de caso equivalente para testes que
nÃ£o validam um bug). Exemplo real:
`CT-REG-BUG-20260910-09-erros-diferencas-sem-dados-2026-09-16.md`.

**Camada (desde 2026-09-30).** A separaÃ§Ã£o entre testes sÃ³ de front e testes
front + back **nÃ£o** se faz por pastas (a hierarquia acima mantÃ©m-se), mas por
tag: cada caso declara `@front` (sÃ³ interface, corre em mock/MSW) ou
`@integracao` (depende do backend real â€” ordenaÃ§Ã£o/filtros no servidor,
exportaÃ§Ã£o, gravaÃ§Ã£o, erros do servidor â€” e corre contra o dev publicado). No
`meta()`: `camada: 'integracao'` (ou `metaDR(..., { integracao: true })`); sem
nada fica `@front`. Correr: `npm run test:front`, `test:integracao` ou
`test:tudo` (ver README do repo).

A mesma convenÃ§Ã£o estÃ¡ registada, para uso automÃ¡tico pelo Claude Code, em
[`.claude/rules/qa-e2e-organizacao-testes.md`](../../../.claude/rules/qa-e2e-organizacao-testes.md).

> **Nota de terminologia:** os "Grupo A/B/C/D/E" usados no [Â§1](#1-resumo) e
> abaixo sÃ£o agrupamentos deste relatÃ³rio de bugs (por origem/data de
> levantamento) â€” **nÃ£o** sÃ£o o mesmo conceito que "Grupo" na tabela acima
> (nÃ­vel de menu do sistema). NÃ£o confundir: um "Grupo A/B/â€¦" deste plano
> pode espalhar-se por vÃ¡rios Itens/RÃ³tulos do sistema, e vice-versa.

Este documento continua a ser o **Ã­ndice/fonte de verdade** do estado geral
dos 58 defeitos (resumo, grupos de bugs, TODO); os `.md` por pasta de Item
sÃ£o a cÃ³pia co-localizada com o cÃ³digo, para quem sÃ³ abre `testes/` nÃ£o
precisar de saltar para `docs/`. Ao corrigir o estado de um caso, atualizar
os dois.

---

## 1. Resumo

| Grupo | Ãrea | NÂº de bugs | Prontos para implementar | Em TODO (Â§6) |
|---|---|---:|---:|---:|
| A | Medicamentos Â· Consulta-Ãrea-PrestaÃ§Ã£o (Ã¡rea jÃ¡ coberta) | 5 | 4 | 1 |
| B | MCDT / Cuidados RespiratÃ³rios (mesma app, Ã¡rea nÃ£o coberta) | 3 | 2 | 1 |
| C | Transversais (padrÃ£o em mÃºltiplas telas) | 2 | 0 | 2 |
| D | Dados de ReferÃªncia (ConvenÃ§Ãµes, CNPEM, Diplomas, MÃ©dicos/Prescritores, HemodiÃ¡lise, ServiÃ§os Dispensa Proximidade, Troca de Seringas, Locais de PrescriÃ§Ã£o, EFR) | 32 | 26 | 6 |
| E | GestÃ£o de ArmazÃ©m (Registo de Entrada, ANF, AssociaÃ§Ã£o de Caixa, PreparaÃ§Ã£o, Picking, Localizar/Corrigir) | 16 | 11 | 5 |
| **Total** | | **58** | **43** | **15** |

Os 15 itens em TODO estÃ£o registados na [secÃ§Ã£o 6](#6-todo--itens-bloqueados-aguardando-resposta)
como pendÃªncias do plano, nÃ£o como casos especificados â€” **ainda nÃ£o temos
resposta** de quem decide (dev/produto) sobre a regra-alvo. Os outros 43
tÃªm passos e critÃ©rio prontos e sÃ£o o alvo desta implementaÃ§Ã£o.

---

## Grupo A â€” Medicamentos Â· Consulta-Ãrea-PrestaÃ§Ã£o (Ã¡rea jÃ¡ coberta pela suÃ­te)

#### CT-REG-BUG-20260910-02 â€” Alterar resultados por pÃ¡gina nÃ£o tem efeito
- **Bug de origem:** BUG-20260910-02
- **Ãrea/rota:** Grade de faturas Â· `/medicamentos/factura`
- **Requisito:** RF29 (Â§2.5 CA-G-04, mesmo critÃ©rio de `CT-FAT-PAGINACAO`)
- **Page object:** âœ… existente (`PaginaPesquisaFaturasMedicamentos`)
- **Passos:** 1. Pesquisar por uma massa ampla (`faturaAmpla`). 2. No seletor de tamanho de pÃ¡gina, mudar de 10 para outro valor.
- **Comportamento atual (bug):** o nÃºmero de linhas por pÃ¡gina nÃ£o muda.
- **Resultado esperado (pÃ³s-correÃ§Ã£o):** a grade recarrega com o novo tamanho e repÃµe a pÃ¡gina 1.
- **Estado:** âœ… implementado (`consulta-area-prestacao/medicamentos/medicamentos.spec.ts`, secÃ§Ã£o Facturas â€º Pesquisa)

#### CT-REG-BUG-20260910-08 â€” Tabelas "InformaÃ§Ã£o Comunicada"/"Conferida" sem linha de totais
- **Bug de origem:** BUG-20260910-08 (tambÃ©m observado em Cuidados RespiratÃ³rios â€” ver Grupo B)
- **Ãrea/rota:** Detalhe de fatura, aba "InformaÃ§Ãµes" â€” Medicamentos
- **Requisito:** RF32 (CA-FAT-32-01)
- **Page object:** âœ… existente, estendido (`PaginaDetalheFaturaMedicamentos`)
- **Passos:** 1. Abrir o detalhe de uma fatura conferida com erros (fatura CCE, `faturaComErros`). 2. Comparar as tabelas "InformaÃ§Ã£o Comunicada", "InformaÃ§Ã£o Conferida" e "DiferenÃ§as".
- **Comportamento atual (bug):** sÃ³ "DiferenÃ§as" mostra a linha de totais.
- **Resultado esperado (pÃ³s-correÃ§Ã£o):** as trÃªs tabelas mostram a linha "Total".
- **Estado:** âœ… implementado (`consulta-area-prestacao/medicamentos/medicamentos.spec.ts`, secÃ§Ã£o Facturas â€º Detalhe)

#### CT-REG-BUG-20260910-09 â€” "Erros e diferenÃ§as" abre sem dados
- **Bug de origem:** BUG-20260910-09
- **Ãrea/rota:** `/medicamentos/factura/:id/erros-diferencas`
- **Requisito:** RF32
- **Page object:** ðŸ”´â†’âœ… novo (`PaginaErrosDiferencasFatura`), confirmado contra `ErrosDiferencasPage.tsx`
- **Passos:** 1. Abrir o detalhe de uma fatura CCE (a tabela de erros/diferenÃ§as aparece preenchida no detalhe). 2. Clicar em "Erros e diferenÃ§as".
- **Comportamento atual (bug):** a tela dedicada abre sem dados.
- **Resultado esperado (pÃ³s-correÃ§Ã£o):** a tela dedicada mostra os mesmos erros/diferenÃ§as do detalhe.
- **Estado:** âœ… implementado (`consulta-area-prestacao/medicamentos/medicamentos.spec.ts`, secÃ§Ã£o Facturas â€º Erros e diferenÃ§as)

#### CT-REG-BUG-20260910-10 â€” "Erros e diferenÃ§as" mostra o `id` da rota como nÃºmero da factura
- **Bug de origem:** BUG-20260910-10
- **Ãrea/rota:** `/medicamentos/factura/:id/erros-diferencas`
- **Requisito:** RF21
- **Page object:** âœ… mesmo novo page object do caso anterior
- **Passos:** 1. Abrir "Erros e diferenÃ§as" de uma fatura conhecida. 2. Comparar o "nÃºmero da factura" mostrado com o nÃºmero real.
- **Comportamento atual (bug):** o tÃ­tulo mostra o `:id` da URL (`Erros e diferenÃ§as â€” Factura {id}` em `ErrosDiferencasPage.tsx`, interpola o param bruto), nÃ£o o nÃºmero real.
- **Resultado esperado (pÃ³s-correÃ§Ã£o):** mostra o nÃºmero real da fatura.
- **Estado:** âœ… implementado (`consulta-area-prestacao/medicamentos/medicamentos.spec.ts`, secÃ§Ã£o Facturas â€º Erros e diferenÃ§as) â€” **confirmado que o bug ainda reproduz no cÃ³digo-fonte atual** (a leitura de `ErrosDiferencasPage.tsx` mostra `Erros e diferenÃ§as â€” Factura {id}`, sem buscar o nÃºmero real); o teste falha atÃ© isso ser corrigido, como esperado de um teste de regressÃ£o para um bug ainda aberto.

---

## Grupo B â€” MCDT / Cuidados RespiratÃ³rios (mesma app, Ã¡rea sem page object)

> **Nota de hierarquia (2026-09-17):** confirmado contra o cÃ³digo-fonte que a
> Ã¡rea chama-se **Cuidados RespiratÃ³rios DomiciliÃ¡rios** no menu real da app
> (Item `area-crd`, sob o Grupo "Consulta por Ãrea de PrestaÃ§Ã£o" â€” o mesmo
> Grupo de Medicamentos, nÃ£o uma Ã¡rea Ã  parte). "MCDT" Ã© um Item diferente e
> irmÃ£o (`area-mcdt`), ainda sem casos implementados nesta suÃ­te â€” os dois
> sÃ³ foram agrupados neste "Grupo B" do relatÃ³rio porque vieram do mesmo
> levantamento de bugs, nÃ£o porque partilhem Item no sistema. Ver Â§0.4.

#### CT-REG-BUG-20260910-04 â€” Digitar a data completa esvazia o campo "Data da FacturaÃ§Ã£o"
- **Bug de origem:** BUG-20260910-04
- **Ãrea/rota:** Pesquisa Facturas â€” `/cuidados-respiratorios/factura` (`FacturaPage.tsx` / `FacturaFormFiltros.tsx`, Ã¡rea CRD)
- **Requisito:** â€” (fora da matriz RF29/RF21/RF32 atual)
- **Page object:** ðŸ”´â†’âœ… novo (`PaginaPesquisaFaturasCrd`)
- **Nota de rÃ³tulo:** o campo chama-se "Data da FacturaÃ§Ã£o" no cÃ³digo-fonte, nÃ£o "Data da Factura" como no relatÃ³rio original â€” mesmo campo, rÃ³tulo real confirmado.
- **Passos:** 1. Abrir a pesquisa. 2. Escrever `31/12/2024` no campo "Data da FacturaÃ§Ã£o".
- **Comportamento atual (bug):** o campo fica vazio; a data nÃ£o Ã© aceite por digitaÃ§Ã£o.
- **Resultado esperado (pÃ³s-correÃ§Ã£o):** a data digitada (`DD/MM/AAAA`) Ã© aceite.
- **Estado:** âœ… implementado (`consulta-area-prestacao/crd/crd.spec.ts`, secÃ§Ã£o Facturas â€º Pesquisa)

#### CT-REG-BUG-20260910-05 â€” Ãcone de calendÃ¡rio dispara erro de "critÃ©rio mÃ­nimo"
- **Bug de origem:** BUG-20260910-05
- **Ãrea/rota:** Pesquisa Facturas â€” `/cuidados-respiratorios/factura`
- **Requisito:** â€” (fora da matriz atual)
- **Page object:** âœ… mesmo novo page object do caso anterior
- **Passos:** 1. Abrir a pesquisa com todos os campos vazios. 2. Clicar no Ã­cone de calendÃ¡rio do campo "Data da FacturaÃ§Ã£o".
- **Comportamento atual (bug):** aparece "Ã‰ necessÃ¡rio preencher pelo menos um dos campos de pesquisa." sÃ³ por abrir o calendÃ¡rio.
- **Resultado esperado (pÃ³s-correÃ§Ã£o):** abre o date-picker, sem mensagem de erro.
- **Estado:** âœ… implementado (`consulta-area-prestacao/crd/crd.spec.ts`, secÃ§Ã£o Facturas â€º Pesquisa)
- **Nota:** âš ï¸ o seletor do Ã­cone de calendÃ¡rio (`botaoCalendarioData()`) nÃ£o foi confirmado contra o DOM renderizado â€” o `Datepicker` do `@Traceability Suite/ui-react` Ã© distribuÃ­do jÃ¡ compilado (sem JSX legÃ­vel) e nÃ£o hÃ¡ ambiente a correr para inspecionar visualmente. Ancorado pelo grupo do campo (botÃ£o dentro do `TextInput`/`Datepicker` "Data da FacturaÃ§Ã£o"), mas o `aria-label` exato do botÃ£o pode precisar de ajuste na primeira corrida real.

*(`BUG-20260910-03` â€” documento MCDT com 502 â€” fica em TODO, ver Â§6.)*

---

## Grupo C â€” Transversais

Os 2 bugs deste grupo (`BUG-20260910-06`, `BUG-20260910-07`) ficam em TODO â€”
ver [Â§6](#6-todo--itens-bloqueados-aguardando-resposta).

---

## Grupo D â€” Dados de ReferÃªncia (26 prontos de 32, Ã¡rea sem page object)

Todos exigem ðŸ”´ **novo page object**. Ambiente sempre API real.

| ID | Bug | Ãrea/rota | PadrÃ£o de referÃªncia | Comportamento atual (bug) | Resultado esperado (pÃ³s-correÃ§Ã£o) |
|---|---|---|---|---|---|
| CT-REG-BUG-20260915-01 | Breadcrumb em pÃ¡ginas de topo | Geral | Manual A.1 | breadcrumb aparece em pÃ¡ginas acessÃ­veis direto pelo menu | breadcrumb sÃ³ aparece quando reflete hierarquia de navegaÃ§Ã£o real |
| CT-REG-BUG-20260915-02 | BotÃ£o "Voltar" fora do padrÃ£o/ausente | Embalagens, CNPEM, MÃ©dicos/Prescritores, Exames MCDT, Sistemas CRD, Vacinas, ServiÃ§os Dispensa Proximidade | Manual A.3 | ausente (Embalagens) ou fora de posiÃ§Ã£o/estilo (demais) | presente, embaixo Ã  esquerda, com borda, em todas as telas de detalhe listadas |
| CT-REG-BUG-20260915-04 | Filtro "SituaÃ§Ã£o" prÃ©-selecionado | Diplomas / Despachos | Manual B.1/B.2 | "SituaÃ§Ã£o" abre em "Vigentes" | abre em "Selecione", sem prÃ©-seleÃ§Ã£o |
| CT-REG-BUG-20260915-05 | BotÃ£o "Limpar" fora do padrÃ£o | MÃ©dicos/Prescritores, Exames MCDT, Sistemas CRD, HemodiÃ¡lise, ServiÃ§os Dispensa Proximidade | Manual B.4 | com borda / fora do padrÃ£o visual | text button, sem borda |
| CT-REG-BUG-20260915-06 | "Limpar" nÃ£o remove "Data de ReferÃªncia" | CNPEM, MÃ©dicos/Prescritores | â€” | campo "Data de ReferÃªncia" permanece preenchido apÃ³s "Limpar" | "Limpar" reseta todos os campos, incl. "Data de ReferÃªncia" |
| CT-REG-BUG-20260915-07 | Data prÃ©-seleciona hoje / seletor nativo do browser | CNPEM, Diplomas, MÃ©dicos/Prescritores, Locais de PrescriÃ§Ã£o | Manual B.8 | prÃ©-seleciona hoje e/ou usa `<input type=date>` nativo | sempre via Datepicker do design system, nunca prÃ©-selecionado |
| CT-REG-BUG-20260915-08 | Placeholder com "exemplo" fixo | ConvenÃ§Ãµes, CNPEM, Diplomas | Manual B.7 | valor de exemplo "pesado" | instruÃ§Ã£o de preenchimento com opacidade reduzida |
| CT-REG-BUG-20260915-09 | Filtros nÃ£o condizem com resultado da tabela | Locais de PrescriÃ§Ã£o | Manual B.11 | filtro aplicado â‰  coluna exibida | coluna reflete o filtro usado |
| CT-REG-BUG-20260915-10 | Estado/SituaÃ§Ã£o como chip | CNPEM, Diplomas, MÃ©dicos/Prescritores, Locais de PrescriÃ§Ã£o | Manual C.3 | exibido como chip/badge | texto simples, sem borda/cor de fundo |
| CT-REG-BUG-20260915-11 | Coluna de aÃ§Ã£o sem cabeÃ§alho e/ou Ã  direita | Sistemas CRD, HemodiÃ¡lise, Diplomas (+ erro "AcÃ§Ãµes"â†’"AÃ§Ãµes"), Vacinas, ServiÃ§os Dispensa Proximidade, Troca de Seringas | Manual C.5 | Ã  direita e/ou sem rÃ³tulo "AÃ§Ã£o"/"AÃ§Ãµes" | Ã  esquerda, Ã­cone sem rÃ³tulo na cÃ©lula, cabeÃ§alho sempre "AÃ§Ã£o"/"AÃ§Ãµes" |
| CT-REG-BUG-20260915-12 | OrdenaÃ§Ã£o por cabeÃ§alho nÃ£o habilitada/parcial | Geral, Sistemas CRD | Manual C.1 (= `TASK-20260914-03`) | nem todas as tabelas ordenam; CRD sÃ³ em algumas colunas | clique no cabeÃ§alho ordena qualquer coluna |
| CT-REG-BUG-20260915-13 | Seletor "Resultados por pÃ¡gina" sem efeito | Exames MCDT, Sistemas CRD, ServiÃ§os Dispensa Proximidade | Manual C.4 (mesma famÃ­lia de `BUG-20260911-03`) | seletor presente, sem efeito | tabela recarrega com o nÂº de linhas selecionado |
| CT-REG-BUG-20260915-14 | Sem mensagem de erro ao pesquisar sem obrigatÃ³rios | Diplomas, EFR | Manual D.1/E.2 | aÃ§Ã£o executa sem preencher campos, sem aviso | mensagem clara do que falta |
| CT-REG-BUG-20260915-17 | Hierarquia de tÃ­tulos incorreta | ConvenÃ§Ãµes â€” Detalhe | â€” | H1/H2 fora de ordem | hierarquia de tÃ­tulos correta |
| CT-REG-BUG-20260915-18 | BotÃ£o de aÃ§Ã£o fora do padrÃ£o | ConvenÃ§Ãµes â€” Processos de ConferÃªncia | â€” | fora do padrÃ£o visual | conforme padrÃ£o do sistema |
| CT-REG-BUG-20260915-19 | Mensagem "aÃ§Ã£o nÃ£o disponÃ­vel" mostra a URL | ConvenÃ§Ãµes â€” Processos de ConferÃªncia | â€” | mostra a rota em vez de texto legÃ­vel | mensagem compreensÃ­vel ao utilizador |
| CT-REG-BUG-20260915-20 | Scroll nÃ£o volta ao topo na navegaÃ§Ã£o | ConvenÃ§Ãµes â€” pÃ¡gina filho (ex. Conta-Corrente) | â€” | mantÃ©m posiÃ§Ã£o de scroll da pÃ¡gina anterior | abre no topo |
| CT-REG-BUG-20260915-21 | ValidaÃ§Ã£o prematura ao clicar fora do campo | Diplomas â€” Novo | â€” | erro de criaÃ§Ã£o aparece antes de submeter | erro sÃ³ apÃ³s tentativa de submissÃ£o |
| CT-REG-BUG-20260915-22 | Duplo submit gera erro de conflito | Diplomas â€” Novo | â€” (causa raiz identificada: `DiplomaFormulario.tsx:155-160`) | um clique dispara `handleSubmit` duas vezes â†’ 409 | um clique = uma submissÃ£o |
| CT-REG-BUG-20260915-24 | Breadcrumb inconsistente entre "Novo preÃ§o" e Detalhe | HemodiÃ¡lise | â€” | dois caminhos diferentes para a mesma hierarquia | breadcrumb consistente entre as duas pÃ¡ginas |
| CT-REG-BUG-20260915-25 | Seletor de data nÃ£o fecha apÃ³s selecionar | ServiÃ§os Dispensa Proximidade | â€” | permanece aberto | fecha ao selecionar uma data |
| CT-REG-BUG-20260915-26 | Mensagem de erro incorreta (preÃ§o acima do limite) | ServiÃ§os Dispensa Proximidade (+ HemodiÃ¡lise, mesmo padrÃ£o) | â€” (causa raiz: `@Digits` com mensagem Ãºnica) | "admite no mÃ¡ximo 2 casas decimais" ao inserir `555555555555` (12 dÃ­gitos inteiros) | mensagem indica que o valor excede o nÂº mÃ¡ximo de dÃ­gitos |
| CT-REG-BUG-20260915-27 | TÃ­tulo da pÃ¡gina â‰  tÃ­tulo da seÃ§Ã£o | Troca de Seringas | â€” | mostra "Pesquisa convenÃ§Ãµes SICAD / kits" | mostra "Programa Troca de Seringas" |
| CT-REG-BUG-20260915-28 | Breadcrumb nÃ£o navegÃ¡vel | Troca de Seringas | â€” | itens do breadcrumb nÃ£o clicÃ¡veis | itens navegam para a pÃ¡gina correspondente |
| CT-REG-BUG-20260915-31 | Checkbox de seleÃ§Ã£o muda pÃ¡gina e filtro | Embalagens â€” pesquisa | â€” | marcar um checkbox navega e altera o filtro aplicado | marcar checkbox nÃ£o altera pÃ¡gina nem filtro |
| CT-REG-BUG-20260915-32 | OpÃ§Ã£o "Todos" nÃ£o retorna resultado | MÃ©dicos/Prescritores | â€” | "Ã‰ necessÃ¡rio preencher..." mesmo com "Todos" selecionado | pesquisa executa normalmente com "Todos" selecionado |

*(`BUG-20260915-03`, `-15`, `-16`, `-23`, `-29`, `-30` ficam em TODO, ver Â§6.)*

**Estado:** ðŸ”² nenhum implementado ainda nesta passagem â€” ver [Â§7](#7-estado-da-implementaÃ§Ã£o-e-prÃ³ximos-passos).

---

## Grupo E â€” GestÃ£o de ArmazÃ©m (11 prontos de 16, Ã¡rea sem page object)

Todos exigem ðŸ”´ **novo page object**.

#### CT-REG-BUG-20260911-02 â€” Erro interno ao carregar ficheiro da Guia de Transporte
- **Ãrea/rota:** `/armazem/guia-anf/pistolagem`
- **Passos:** 1. Abrir a pÃ¡gina. 2. Carregar um ficheiro `.xlsx` vÃ¡lido na Guia de Transporte. 3. Guardar.
- **Comportamento atual (bug):** "Ocorreu um erro interno. ReferÃªncia: dd04421c-...".
- **Resultado esperado (pÃ³s-correÃ§Ã£o):** ficheiro processado e guardado sem erro.

#### CT-REG-BUG-20260911-03 â€” Seletor de resultados por pÃ¡gina sem efeito
- **Ãrea/rota:** `/armazem/guia-anf/pistolagem`
- **Passos:** 1. Abrir com resultados na tabela. 2. Alterar a quantidade de resultados por pÃ¡gina.
- **Comportamento atual (bug):** quantidade de linhas nÃ£o muda.
- **Resultado esperado (pÃ³s-correÃ§Ã£o):** tabela recarrega com o nÂº de linhas selecionado.

#### CT-REG-BUG-20260911-04 â€” Contagem de volumes nÃ£o atualiza apÃ³s exclusÃ£o
- **Ãrea/rota:** `/armazem/guia-anf/pistolagem`
- **Passos:** 1. Abrir a pÃ¡gina. 2. Excluir uma entrada. 3. Observar grÃ¡fico de rosca e contagem.
- **Comportamento atual (bug):** sÃ³ atualiza apÃ³s mudanÃ§a de estado, nÃ£o apÃ³s exclusÃ£o.
- **Resultado esperado (pÃ³s-correÃ§Ã£o):** contagem reflete a exclusÃ£o imediatamente.

#### CT-REG-BUG-20260911-05 â€” Dois itens de menu ativos simultaneamente
- **Ãrea/rota:** AssociaÃ§Ã£o de Caixa â†’ "Ver listagem"
- **Passos:** 1. Abrir AssociaÃ§Ã£o de Caixa. 2. Clicar em "Ver listagem".
- **Comportamento atual (bug):** os dois itens de menu ficam destacados em verde.
- **Resultado esperado (pÃ³s-correÃ§Ã£o):** sÃ³ o item da pÃ¡gina atual fica destacado.

#### CT-REG-BUG-20260911-07 â€” Filtro "ConcluÃ­do" retorna estados diferentes
- **Ãrea/rota:** AssociaÃ§Ã£o de Caixa â€” Listagem
- **Passos:** 1. Aplicar filtro de estado "ConcluÃ­do".
- **Comportamento atual (bug):** tabela mostra tambÃ©m "No ArmazÃ©m TemporÃ¡rio", "Em DigitalizaÃ§Ã£o".
- **Resultado esperado (pÃ³s-correÃ§Ã£o):** sÃ³ itens no estado "ConcluÃ­do".

#### CT-REG-BUG-20260911-09 â€” PrescriÃ§Ã£o nÃ£o carrega e nÃ£o pode ser baixada (404)
- **Ãrea/rota:** `/picking-expedicao/22` (depende de dado de teste com arquivo associado)
- **Passos:** 1. Abrir a ordem de picking. 2. Visualizar o arquivo de prescriÃ§Ã£o. 3. Tentar baixÃ¡-lo.
- **Comportamento atual (bug):** 404 em `.../transferencias-arquivo-temporario`; download indisponÃ­vel.
- **Resultado esperado (pÃ³s-correÃ§Ã£o):** arquivo exibido e disponÃ­vel para download.

#### CT-REG-BUG-20260911-10 â€” Asteriscos redundantes no modal de impressÃ£o
- **Ãrea/rota:** Picking para ExpediÃ§Ã£o â€” modal "Ordens de Picking"
- **Passos:** 1. Abrir o modal. 2. Observar a coluna "NUM LOTE" na tabela de impressÃ£o.
- **Comportamento atual (bug):** itens em negrito **e** com asteriscos.
- **Resultado esperado (pÃ³s-correÃ§Ã£o):** apenas negrito, sem asteriscos.

#### CT-REG-BUG-20260911-11 â€” Coluna de aÃ§Ã£o sem rÃ³tulo
- **Ãrea/rota:** `/picking-expedicao/24/picagem`
- **Passos:** 1. Abrir a pÃ¡gina. 2. Observar os cabeÃ§alhos da tabela.
- **Comportamento atual (bug):** coluna com botÃ£o de aÃ§Ã£o sem rÃ³tulo.
- **Resultado esperado (pÃ³s-correÃ§Ã£o):** todas as colunas, incluindo a de aÃ§Ã£o, tÃªm rÃ³tulo.

#### CT-REG-BUG-20260911-12 â€” Total "a confirmar" soma confirmado + em falta
- **Ãrea/rota:** `/picking-expedicao/24/picagem`
- **Passos:** 1. Abrir a pÃ¡gina com um caso de 18 itens (9 confirmados, 9 em falta). 2. Observar "total a confirmar".
- **Comportamento atual (bug):** mostra 18 (soma tudo).
- **Resultado esperado (pÃ³s-correÃ§Ã£o):** mostra sÃ³ os itens de facto pendentes (9).

#### CT-REG-BUG-20260911-14 â€” Fatura criada nÃ£o Ã© localizada na pesquisa por cÃ³digo
- **Ãrea/rota:** `/armazem/registo-entrada/detalhe` â†’ `/arquivo`
- **Passos:** 1. Criar uma fatura com cÃ³digo de teste em Registo de Entrada. 2. Pesquisar pelo mesmo cÃ³digo em `/arquivo`.
- **Comportamento atual (bug):** fatura nÃ£o Ã© localizada.
- **Resultado esperado (pÃ³s-correÃ§Ã£o):** fatura criada Ã© localizada pela pesquisa por cÃ³digo.

#### CT-REG-BUG-20260914-01 â€” Mensagem de "Alterar contador" com parÃªnteses desnecessÃ¡rios
- **Ãrea/rota:** TransferÃªncia para Arquivo TemporÃ¡rio â€” `/armazem/transferencia-arquivo-temporario`
- **Passos:** 1. Executar a aÃ§Ã£o "Alterar contador". 2. Observar a mensagem retornada.
- **Comportamento atual (bug):** mensagem com parÃªnteses supÃ©rfluos.
- **Resultado esperado (pÃ³s-correÃ§Ã£o):** mensagem sem formataÃ§Ã£o de parÃªnteses desnecessÃ¡ria.

*(`BUG-20260911-01`, `-06`, `-08`, `-13` e `BUG-20260914-02` ficam em TODO, ver Â§6.)*

**Estado:** ðŸ”² nenhum implementado ainda nesta passagem â€” ver [Â§7](#7-estado-da-implementaÃ§Ã£o-e-prÃ³ximos-passos).

---

## 6. TODO â€” itens bloqueados, aguardando resposta

Estes 15 casos **nÃ£o estÃ£o especificados para implementaÃ§Ã£o** â€” ficam
registados como pendÃªncia do plano de testes. Cada um depende de uma
resposta de quem decidiu ou vai decidir a correÃ§Ã£o (dev/produto), que
**ainda nÃ£o temos**. Assim que a resposta chegar, o item sai daqui e vira
um `CT-REG-BUG-*` normal nos grupos acima.

- [ ] **CT-REG-BUG-20260910-03** â€” documento MCDT indisponÃ­vel (502): o "esperado" mistura duas correÃ§Ãµes possÃ­veis (backend deixar de devolver 502, ou frontend sÃ³ tratar o 502 com mensagem amigÃ¡vel). Perguntar: qual das duas foi/serÃ¡ a correÃ§Ã£o aplicada?
- [ ] **CT-REG-BUG-20260910-06** â€” mensagem/resultado nÃ£o entra no campo de visÃ£o: falta o critÃ©rio de quanto scroll ou qual elemento-alvo conta como "aparecer".
- [ ] **CT-REG-BUG-20260910-07** â€” "Voltar" do browser nÃ£o restaura o resultado de pesquisa: Ã© uma mudanÃ§a de arquitetura (estado de navegaÃ§Ã£o/histÃ³rico), nÃ£o um ajuste pontual â€” falta a decisÃ£o de desenho.
- [ ] **CT-REG-BUG-20260910-11** â€” layout quebra em "resoluÃ§Ã£o alternativa": falta a largura/breakpoint exato a testar.
- [ ] **CT-REG-BUG-20260911-01** â€” "NÂº de lotes" rejeita "nÃºmero grande": falta o valor de fronteira (limite mÃ¡ximo esperado do campo).
- [ ] **CT-REG-BUG-20260911-06** â€” "CÃ³digo da Caixa" aceita letras: o padrÃ£o de formato vÃ¡lido (ex. `C16724`) foi inferido de um Ãºnico exemplo â€” falta a regra exata (nÂº de letras/dÃ­gitos).
- [ ] **CT-REG-BUG-20260911-08** â€” erro de rede na PreparaÃ§Ã£o: "mensagem de erro tratada" Ã© genÃ©rico â€” falta o texto/comportamento especÃ­fico esperado, e confirmaÃ§Ã£o da causa raiz.
- [ ] **CT-REG-BUG-20260911-13** â€” pesquisa por cÃ³digo de fatura em `/arquivo` aceita texto livre: falta a regra exata de formato do cÃ³digo (mesma pendÃªncia do item anterior).
- [ ] **CT-REG-BUG-20260914-02** â€” coluna "Estado" do filtro ausente na tabela: o prÃ³prio relatÃ³rio de origem marca este item como **bloqueado**, aguardando resposta sobre se "Estado" e "Estado da Caixa" sÃ£o a mesma entidade.
- [ ] **CT-REG-BUG-20260915-03** â€” ausÃªncia de "Colapsar" em seÃ§Ãµes de detalhe: falta decidir *onde* o colapsar deve existir (sÃ³ detalhe, ou tambÃ©m pesquisa).
- [ ] **CT-REG-BUG-20260915-15** â€” mensagem de "sem resultados" nÃ£o padronizada: falta o texto/formato final decidido.
- [ ] **CT-REG-BUG-20260915-16** â€” exportaÃ§Ã£o XLSX falha (500) sem feedback: causa raiz nÃ£o confirmada (build "stale" vs. problema real de streaming); o "esperado" mistura duas correÃ§Ãµes possÃ­veis.
- [ ] **CT-REG-BUG-20260915-23** â€” TypeError nÃ£o tratado ao voltar de Detalhe do Prescritor: causa raiz nÃ£o 100% confirmada â€” os passos exatos de reproduÃ§Ã£o podem mudar apÃ³s investigaÃ§Ã£o.
- [ ] **CT-REG-BUG-20260915-29** â€” "CÃ³digo do local" retorna milhares de resultados: falta decidir a regra de negÃ³cio (match exato vs. prefixo) para a normalizaÃ§Ã£o do cÃ³digo.
- [ ] **CT-REG-BUG-20260915-30** â€” menus fora do padrÃ£o em EFR: o relatÃ³rio de origem diz que nÃ£o detalha qual aspecto estÃ¡ fora do padrÃ£o â€” falta levantamento adicional antes de haver algo especÃ­fico para testar.

---

## 7. Estado da implementaÃ§Ã£o e prÃ³ximos passos

**Implementado nesta passagem (Grupos A e B, 6 casos, todos verificados contra
o cÃ³digo-fonte real de `CCM/repos/ccmsns-ui`, sÃ³ leitura):**
- `paginas/PaginaDetalheFaturaMedicamentos.ts` â€” estendido com `tabelaInformacao()` / `linhaTotal()` / `linhasErros()` / `abrirErrosDiferencas()` (BUG-08, BUG-09, BUG-10).
- `paginas/PaginaErrosDiferencasFatura.ts` â€” novo, confirmado contra `ErrosDiferencasPage.tsx` (BUG-09, BUG-10).
- `paginas/PaginaPesquisaFaturasCrd.ts` â€” novo, Ã¡rea Cuidados RespiratÃ³rios, confirmado contra `FacturaFormFiltros.tsx` e o `Datepicker` do `@Traceability Suite/ui-react` (BUG-04, BUG-05).
- `testes/consulta-area-prestacao/fatura-pesquisa.spec.ts` â€” caso `CT-REG-BUG-20260910-02` acrescentado (rows-per-page confirmado contra `Pagination.mjs`/`useFacturaMedUrlState.ts`).
- `testes/consulta-area-prestacao/fatura-detalhe.spec.ts` â€” caso `CT-REG-BUG-20260910-08` acrescentado.
- `testes/bugs-testes-manuais-16-09-2026/fatura-erros-diferencas/fatura-erros-diferencas.spec.ts` â€” novo ficheiro (BUG-09, BUG-10), com planos `CT-REG-BUG-20260910-09-erros-diferencas-sem-dados-2026-09-16.md` e `CT-REG-BUG-20260910-10-titulo-mostra-id-da-rota-2026-09-16.md` na mesma pasta.
- `testes/bugs-testes-manuais-16-09-2026/factura-pesquisa-crd/factura-pesquisa-crd.spec.ts` â€” novo ficheiro (BUG-04, BUG-05), com planos `CT-REG-BUG-20260910-04-data-completa-esvazia-campo-2026-09-16.md` e `CT-REG-BUG-20260910-05-icone-calendario-erro-criterio-minimo-2026-09-16.md` na mesma pasta.
- `testes/apoio.ts` â€” `meta()` estendido com `area`, `bug` e `suite` (opcionais, retrocompatÃ­veis) para etiquetar/rastrear casos fora de Medicamentos.
- `rastreabilidade/requisitos.yaml` â€” 6 novas entradas em `casos:` (uma por `CT-REG-BUG-*` implementado), caminhos `spec:` atualizados para a pasta por Ã¡rea (Â§0.4).
- `.claude/rules/qa-e2e-organizacao-testes.md` â€” novo, regista a convenÃ§Ã£o de pastas/nomes do Â§0.4 para uso automÃ¡tico pelo Claude Code.

Validado com `npx tsc --noEmit` (limpo), `npx eslint .` (limpo) e
`npx playwright test --list` (os 6 casos aparecem; suÃ­te total passa de 31
para 37 casos). NÃ£o foi possÃ­vel correr os testes de facto â€” isso requer a
API real a correr, que sÃ³ o utilizador tem acesso.

**Achado relevante durante a verificaÃ§Ã£o:** ao ler `ErrosDiferencasPage.tsx`,
o tÃ­tulo ainda interpola `Factura {id}` (o id interno da rota), sem buscar o
nÃºmero real â€” ou seja, **BUG-20260910-10 continua ativo no cÃ³digo-fonte
atual**; o teste `CT-REG-BUG-20260910-10` deve falhar atÃ© isso ser corrigido,
o que Ã© o comportamento esperado de um teste de regressÃ£o para um bug aberto.
JÃ¡ `BUG-20260910-09` (tela vazia) parece resolvido â€” as duas telas usam
exatamente o mesmo endpoint (`searchErrosDiferencas`) com o mesmo id.

**Ainda por implementar:** os 37 casos restantes dos Grupos D (26) e E (11).
Mesma exigÃªncia de rigor usada no Grupo A/B â€” confirmar rota/rÃ³tulo real
contra `CCM/repos/ccmsns-ui` (sÃ³ leitura) antes de escrever cada page
object, em vez de adivinhar seletores. SÃ£o 9 sub-Ã¡reas novas em D e 6 em E;
continua-se sub-Ã¡rea a sub-Ã¡rea.

**ReorganizaÃ§Ã£o por hierarquia do sistema (2026-09-17):** a suÃ­te `testes/`
deixou de ser organizada por lote/data de bug e passou a seguir a
hierarquia real do menu (Grupo â†’ Item â†’ RÃ³tulo, ver Â§0.4). MigraÃ§Ã£o feita
sobre os 6 casos do Grupo A/B (nenhuma lÃ³gica de teste alterada, sÃ³
localizaÃ§Ã£o/organizaÃ§Ã£o):
- `testes/consulta-area-prestacao/fatura-pesquisa.spec.ts`,
  `fatura-detalhe.spec.ts`, `lote-pesquisa.spec.ts`, `lote-detalhe.spec.ts`,
  `prestacao-pesquisa.spec.ts` e
  `bugs-testes-manuais-16-09-2026/fatura-erros-diferencas/fatura-erros-diferencas.spec.ts`
  (37 casos ao todo, Medicamentos) foram **fundidos** num Ãºnico ficheiro por
  Item: `testes/consulta-area-prestacao/medicamentos/medicamentos.spec.ts`
  (secÃ§Ãµes Facturas â€º Pesquisa/Detalhe/Erros e diferenÃ§as, Lotes â€º
  Pesquisa/Detalhe, PrestaÃ§Ãµes â€º Pesquisa).
- `bugs-testes-manuais-16-09-2026/factura-pesquisa-crd/factura-pesquisa-crd.spec.ts`
  passou a `testes/consulta-area-prestacao/crd/crd.spec.ts` (Item "Cuidados
  RespiratÃ³rios DomiciliÃ¡rios", secÃ§Ã£o Facturas â€º Pesquisa).
- Os `.md` de plano por caso (BUG-04, -05, -09, -10) moveram-se junto com o
  respetivo `.spec.ts`, com as referÃªncias de nome de ficheiro corrigidas.
- A pasta `testes/bugs-testes-manuais-16-09-2026/` deixou de existir â€” a
  pasta homÃ³nima em `docs/` (este documento) mantÃ©m-se, pois indexa por
  origem do relatÃ³rio de bugs, um eixo diferente do da suÃ­te de testes.
- `rastreabilidade/requisitos.yaml` â€” todos os `spec:` atualizados para os
  caminhos novos.

Validado de novo com `npx tsc --noEmit` (limpo), `npx eslint .` (limpo) e
`npx playwright test --list --project=chromium` (37 casos chromium, mesma
contagem de antes da fusÃ£o â€” nenhum caso perdido).

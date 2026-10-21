# ValidaÃ§Ã£o automatizada â€” deploy de Dados de ReferÃªncia (padrÃµes de UI)

AutomaÃ§Ã£o (Playwright) do
[roteiro de testes do deploy](../../../QA/Testes/PDT/Testes%20manuais/24-09-2026-ajustes-gerais/roteiro-testes-deploy-dados-referencia-padroes-ui.md)
das PRs front #50 e #55 e back #31 e #34
([resumo](../../../QA/Testes/PDT/Testes%20manuais/24-09-2026-ajustes-gerais/resumo-dados-referencia-padroes-ui.md)).

| Item | Valor |
|---|---|
| Ambiente | `dev` â€” http://app.example.internal (`AMBIENTE=dev PW_NO_SERVER=1 BASE_URL=â€¦`) |
| ImplementaÃ§Ã£o | [`testes/dados-referencia/`](../../testes/dados-referencia/) â€” 1 spec por Item do menu "Dados de ReferÃªncia" (+ Exames MCDT) |
| Page objects | [`paginas/dadosReferencia/`](../../paginas/dadosReferencia/) |
| ConvenÃ§Ã£o de ID | `CT-DR-<passo do roteiro>` (`CT-DR-A01`, `CT-DR-A.1.4`, `CT-DR-B8.4`, `CT-DR-C02-PAT`â€¦) |
| Requisitos | RF#26 (ConvenÃ§Ãµes), RF#27 (Embalagens/CNPEM), RF#28 (Exames MCDT), RF#57 (restantes) |
| 1.Âª execuÃ§Ã£o | 24-09-2026, chromium, `--retries=0`: **110 âœ… Â· 11 âŒ Â· 2 âž– (nÃ£o executados: gravam dados)** â€” 123 testes, 13,3 min |
| ValidaÃ§Ã£o manual dos achados | 28-09-2026 â€” [notas](../../../QA/Testes/PDT/Testes%20manuais/24-09-2026-ajustes-gerais/valida%C3%A7%C3%A3o-p%C3%B3s-teste-automatizado.md); resultado na [Â§2.1](#21-validaÃ§Ã£o-manual-dos-achados-28-09-2026) e testes ajustados em conformidade |
| Autor | Gabriel Vidal |

Legenda (igual Ã  da checklist): âœ… ok Â· âŒ diferente do esperado Â· âž– nÃ£o se aplica / nÃ£o executado.
O relatÃ³rio Playwright regista ainda anotaÃ§Ãµes `nao-aplicavel` (critÃ©rio sem dados nessa tela)
e `observacao` (comportamento a confirmar, que nÃ£o conta como falha).

A coluna **URL (dev)** abre a pÃ¡gina onde comeÃ§a o passo, no ambiente registado acima
(`http://app.example.internal`; noutro ambiente, trocar sÃ³ o domÃ­nio). As rotas com `:id`
nÃ£o tÃªm link fixo: abrir a pesquisa, pesquisar e seguir o caminho indicado (`â†’ Ver (1.Âª linha)`
= Ã­cone Ver da 1.Âª linha dos resultados). O filtro usado em dev para cada tela estÃ¡ em
[`paginas/dadosReferencia/telas.ts`](../../paginas/dadosReferencia/telas.ts) (ex.: CNPEM â†’
"CÃ³digo CNPEM" = `5`; EFR pesquisa sem critÃ©rios).

---

## 1. Resultado por passo do roteiro

### Parte A â€” padrÃ£o comum (CNPEM)

| Passo | Caso | URL (dev) | Resultado | Nota |
|---|---|---|---|---|
| A01 | `CT-DR-A01` | [`/dados-referencia/cnpem`](http://app.example.internal/dados-referencia/cnpem) | âœ… | |
| A02 | `CT-DR-A02` | [`/dados-referencia/cnpem`](http://app.example.internal/dados-referencia/cnpem) | âœ… | CNPEM nÃ£o tem campo "DescriÃ§Ã£o" (Ã© "DesignaÃ§Ã£o") â†’ sub-critÃ©rio âž– |
| A03 | `CT-DR-A03` | [`/dados-referencia/cnpem`](http://app.example.internal/dados-referencia/cnpem) | âœ… | |
| A04 | `CT-DR-A04` | [`/dados-referencia/cnpem`](http://app.example.internal/dados-referencia/cnpem) | âœ… | |
| A05 | `CT-DR-A05` | [`/dados-referencia/cnpem`](http://app.example.internal/dados-referencia/cnpem) | âœ… | exige 1 critÃ©rio alÃ©m da data; com filtro + data vazia usa "hoje" |
| A06 | `CT-DR-A06` | [`/dados-referencia/cnpem`](http://app.example.internal/dados-referencia/cnpem) | âœ… | |
| A07 | `CT-DR-A07` | [`/dados-referencia/cnpem`](http://app.example.internal/dados-referencia/cnpem) | âœ… | |
| A08 | `CT-DR-A08` | [`/dados-referencia/cnpem`](http://app.example.internal/dados-referencia/cnpem) | âœ… | |
| A09 | `CT-DR-A09` | [`/dados-referencia/cnpem`](http://app.example.internal/dados-referencia/cnpem) | âœ… | |
| A10 | `CT-DR-A10` | [`/dados-referencia/cnpem`](http://app.example.internal/dados-referencia/cnpem) | âœ… | |
| A11 | `CT-DR-A11` | [`/dados-referencia/cnpem`](http://app.example.internal/dados-referencia/cnpem) | âŒ | ~~**F1**~~ â€” descartado em 28-09: a exportaÃ§Ã£o nÃ£o tem de seguir a ordenaÃ§Ã£o (teste ajustado) |
| A12 | `CT-DR-A12` | [`/dados-referencia/cnpem`](http://app.example.internal/dados-referencia/cnpem) â†’ Ver (1.Âª linha) | âœ… | o cabeÃ§alho do detalhe CNPEM nÃ£o tem aÃ§Ãµes (Exportar/"Ir paraâ€¦") â†’ sub-critÃ©rio âž– |
| A13 | `CT-DR-A13` | [`/dados-referencia/cnpem`](http://app.example.internal/dados-referencia/cnpem) â†’ Ver (1.Âª linha) | âœ… | |
| A14 | `CT-DR-A14` | [`/dados-referencia/cnpem`](http://app.example.internal/dados-referencia/cnpem) â†’ Ver (1.Âª linha) | âœ… | |
| A15 | `CT-DR-A15` | [`/dados-referencia/cnpem/999999999`](http://app.example.internal/dados-referencia/cnpem/999999999) | âŒ | ~~**F2**~~ â€” descartado em 28-09 ("ignorar"; teste ajustado) |
| A16 | `CT-DR-A16` (pesquisa e detalhe) | [`/dados-referencia/cnpem`](http://app.example.internal/dados-referencia/cnpem) (e detalhe) | âœ… | |

### A.1 â€” conferÃªncia rÃ¡pida nas outras telas

| Passo | Tela | URL (dev) | Resultado | Nota |
|---|---|---|---|---|
| A.1.1 | ConvenÃ§Ãµes | [`/dados-referencia/convencoes`](http://app.example.internal/dados-referencia/convencoes) | âœ… | |
| A.1.2 | ConvenÃ§Ãµes SICAD | [`/dados-referencia/troca-seringas`](http://app.example.internal/dados-referencia/troca-seringas) | âœ… | |
| A.1.3 | Embalagens e Medicamentos | [`/dados-referencia/embalagens-medicamentos`](http://app.example.internal/dados-referencia/embalagens-medicamentos) | âŒ | **F3** colunas GenÃ©rico/Venda livre/Estado centradas Â· **F4** ordenaÃ§Ã£o ignorada pelo servidor â€” nenhum dos dois confirmado Ã  mÃ£o em 28-09 |
| A.1.4 | EFR | [`/dados-referencia/efr`](http://app.example.internal/dados-referencia/efr) | âŒ | **F5** antes de pesquisar a tabela mostra "Nenhum resultado encontrado." â€” Ã  mÃ£o, em 28-09, o resultado real Ã© o esperado |
| A.1.5 | Locais de PrescriÃ§Ã£o | [`/dados-referencia/locais-prescricao`](http://app.example.internal/dados-referencia/locais-prescricao) | âœ… | |
| A.1.6 | MÃ©dicos/Prescritores | [`/dados-referencia/medicos-prescritores`](http://app.example.internal/dados-referencia/medicos-prescritores) | âœ… | `observacao`: "N.Âº Prescritor" ordena pelo nÃºmero sem o prefixo (D1, C1, D10â€¦) |
| A.1.7 | Vacinas | [`/dados-referencia/vacinas`](http://app.example.internal/dados-referencia/vacinas) | âœ… | |
| A.1.8 | Tipos de PreÃ§o HemodiÃ¡lise | [`/dados-referencia/tipos-preco-hemodialise`](http://app.example.internal/dados-referencia/tipos-preco-hemodialise) | âœ… | |
| A.1.9 | ServiÃ§os DP | [`/dados-referencia/servicos-dispensa-proximidade`](http://app.example.internal/dados-referencia/servicos-dispensa-proximidade) | âœ… | |
| A.1.10 | Sistemas CRD | [`/dados-referencia/sistemas-crd`](http://app.example.internal/dados-referencia/sistemas-crd) | âœ… | |
| A.1.11 | Patologias Termais | [`/dados-referencia/patologias-termais`](http://app.example.internal/dados-referencia/patologias-termais) | âœ… | detalhe com abas |
| A.1.12 | Exames MCDT | [`/mcdts/exames`](http://app.example.internal/mcdts/exames) | âœ… | |

### Parte B â€” especÃ­fico de cada tela

| Passo | URL (dev) | Resultado | Nota |
|---|---|---|---|
| B1.1 Â· B1.2 Â· B1.3 | [`/dados-referencia/cnpem`](http://app.example.internal/dados-referencia/cnpem) â†’ Ver (1.Âª linha) | âœ… âœ… âœ… | |
| B2.1 â€“ B2.5 | [`/dados-referencia/convencoes`](http://app.example.internal/dados-referencia/convencoes) â†’ Ver (1.Âª linha) em B2.2â€“B2.5 | âœ… | |
| B3.1 Â· B3.2 Â· B3.3 Â· B3.4 | [`/dados-referencia/troca-seringas`](http://app.example.internal/dados-referencia/troca-seringas) â†’ Ver (1.Âª linha) em B3.3â€“B3.4 | âœ… | B3.2: erro do serviÃ§o simulado (HTTP 500) |
| B4.1 | [`/dados-referencia/embalagens-medicamentos`](http://app.example.internal/dados-referencia/embalagens-medicamentos) | âŒ | **F6** â€” confirmado Ã  mÃ£o em 28-09 com outro sintoma: a pesquisa exige CNPEM, mas o campo estÃ¡ oculto (teste ampliado) |
| B4.2 (DietÃ©tico, Subs. Manipulada) | [`/dados-referencia/embalagens-medicamentos`](http://app.example.internal/dados-referencia/embalagens-medicamentos) | âŒ âŒ | **F6** (mesmo comportamento) |
| B4.3 Â· B4.4 Â· B4.5 | [`/dados-referencia/embalagens-medicamentos`](http://app.example.internal/dados-referencia/embalagens-medicamentos) â†’ Ver (1.Âª linha) em B4.5 | âœ… | |
| B4.6 (DiabÃ©tico, DietÃ©tico, SubstÃ¢ncia) | [`/dados-referencia/embalagens-medicamentos`](http://app.example.internal/dados-referencia/embalagens-medicamentos) â†’ modo DiabÃ©tico/DietÃ©tico/SubstÃ¢ncia â†’ Ver | âœ… | |
| B5.1 Â· B5.2 | [`/dados-referencia/efr`](http://app.example.internal/dados-referencia/efr) â†’ Ver (1.Âª linha) em B5.2 | âœ… | |
| B6.1 â€“ B6.5 | [`/dados-referencia/locais-prescricao`](http://app.example.internal/dados-referencia/locais-prescricao) â†’ Ver (1.Âª linha) em B6.3â€“B6.5 | âœ… | |
| B7.1 Â· B7.2 Â· B7.3 | [`/dados-referencia/medicos-prescritores`](http://app.example.internal/dados-referencia/medicos-prescritores) â†’ Ver (1.Âª linha) em B7.3 | âœ… | B7.2 com a mesma `observacao` de A.1.6 |
| B8.1 â€“ B8.6 | [`/dados-referencia/vacinas`](http://app.example.internal/dados-referencia/vacinas) â†’ Ver (1.Âª linha) em B8.3â€“B8.6 | âœ… | |
| B9.1 Â· B9.2 Â· B9.3 | [`/dados-referencia/tipos-preco-hemodialise`](http://app.example.internal/dados-referencia/tipos-preco-hemodialise) â†’ Ver (1.Âª linha) em B9.2â€“B9.3 | âœ… | |
| B9.4 / B9.5 â†’ Parte C | â€” | ver abaixo | |
| B10.1 â€“ B10.4 | [`/dados-referencia/servicos-dispensa-proximidade`](http://app.example.internal/dados-referencia/servicos-dispensa-proximidade) â†’ Ver (1.Âª linha) em B10.2â€“B10.4 | âœ… | B10.3: a tabela ConvenÃ§Ãµes Habilitadas nÃ£o tem coluna NIF â†’ âž– para o NIF |
| B10.5 â†’ Parte C | â€” | ver abaixo | |
| B11.1 Â· B11.2 Â· B11.3 | [`/dados-referencia/sistemas-crd`](http://app.example.internal/dados-referencia/sistemas-crd) â†’ Ver (1.Âª linha) em B11.2â€“B11.3 | âœ… | B11.3: Semelhantes sÃ³ com 1 pÃ¡gina â†’ continuidade âž– |
| B12.1 Â· B12.2 Â· B12.3 | [`/dados-referencia/patologias-termais`](http://app.example.internal/dados-referencia/patologias-termais) â†’ Ver (1.Âª linha) em B12.2â€“B12.3 | âœ… | |
| B13.1 | [`/dados-referencia/diplomas`](http://app.example.internal/dados-referencia/diplomas) | âœ… | `observacao`: "Adicionar diploma" (pesquisa) Ã© primÃ¡rio; o "Adicionar" do detalhe Ã© secundÃ¡rio |
| B14.1 Â· B14.3 | [`/mcdts/exames`](http://app.example.internal/mcdts/exames) â†’ Ver (1.Âª linha) em B14.3 | âœ… | |
| B14.2 | [`/mcdts/exames`](http://app.example.internal/mcdts/exames) | âŒ | ~~**F7**~~ â€” descartado em 28-09: a exportaÃ§Ã£o nÃ£o tem de seguir a ordenaÃ§Ã£o (teste ajustado) |
| B14.4 | [`/mcdts/exames`](http://app.example.internal/mcdts/exames) â†’ pesquisar â†’ Ver â†’ Voltar | âŒ | **F8** "Voltar" do detalhe regressa a `/mcdts/exames` sem filtros nem resultados |

### Parte C â€” formulÃ¡rios

| FormulÃ¡rio | URL (dev) | C01 | C02 | C03 | C04 | C05 | C06 |
|---|---|---|---|---|---|---|---|
| Novo serviÃ§o DP (completo) | [`/dados-referencia/servicos-dispensa-proximidade/novo`](http://app.example.internal/dados-referencia/servicos-dispensa-proximidade/novo) | âœ… | âœ… | âž–Â¹ | âž–Â¹ | âœ…Â² | âœ… |
| Editar serviÃ§o DP | [`/dados-referencia/servicos-dispensa-proximidade`](http://app.example.internal/dados-referencia/servicos-dispensa-proximidade) â†’ Editar (`â€¦/:id/editar`) | âœ… | âœ… | | | | âœ… |
| Novo / editar preÃ§o DP | [`/dados-referencia/servicos-dispensa-proximidade`](http://app.example.internal/dados-referencia/servicos-dispensa-proximidade) â†’ Ver (serviÃ§o "teste") â†’ preÃ§o novo / editar (`â€¦/:id/precos/novo`, `â€¦/:id/precos/:precoId/editar`) | âœ… âœ… | âœ… âœ… | | | | âœ… âœ… |
| Novo tipo de preÃ§o HD | [`/dados-referencia/tipos-preco-hemodialise/novo`](http://app.example.internal/dados-referencia/tipos-preco-hemodialise/novo) | âŒ **F9** | âœ… | | | | âœ… |
| Editar tipo de preÃ§o HD | [`/dados-referencia/tipos-preco-hemodialise`](http://app.example.internal/dados-referencia/tipos-preco-hemodialise) â†’ Editar (`â€¦/:id/editar`) | âŒ **F9** | âœ… | | | | âœ… |
| Novo / editar preÃ§o HD | [`/dados-referencia/tipos-preco-hemodialise`](http://app.example.internal/dados-referencia/tipos-preco-hemodialise) â†’ Ver (tipo com preÃ§os) â†’ preÃ§o novo / editar (`â€¦/:id/precos/novo`, `â€¦/:id/precos/:precoId/editar`) | âœ… âœ… | âœ… âœ… | | | | âœ… âœ… |
| Nova / editar patologia | [`/dados-referencia/patologias-termais/novo`](http://app.example.internal/dados-referencia/patologias-termais/novo) Â· [`/dados-referencia/patologias-termais`](http://app.example.internal/dados-referencia/patologias-termais) â†’ Editar (`â€¦/:id/editar`) | âœ… âœ… | âœ… âœ… | | | | âœ… âœ… |
| Associar / editar tÃ©cnica | [`/dados-referencia/patologias-termais`](http://app.example.internal/dados-referencia/patologias-termais) â†’ Ver â†’ "Associar tÃ©cnica" / editar (`â€¦/:id/tecnicas/novo`, `â€¦/:id/tecnicas/:associacaoId/editar`) | âœ… âœ… | âœ… âœ… | | | | âœ… âœ… |

Â¹ Gravam no ambiente partilhado â€” nÃ£o executados em dev (ativar com `DR_PERMITIR_ESCRITA=1`).
Validados em mock: passam (o duplo clique criou 1 sÃ³ registo; o erro de cÃ³digo duplicado aparece
em Alert, mas **abaixo dos campos**, nÃ£o "no topo" como diz o roteiro â€” `observacao`).
Â² SÃ³ a parte "vem preenchido"; o "Guardar" sÃ³ corre com `DR_PERMITIR_ESCRITA=1`.

---

## 2. Achados (candidatos a `BUG-20260924-NN`)

Todos confirmados no cÃ³digo de `ccmsns-ui` (`origin/develop`, sÃ³ leitura) e/ou reproduzidos Ã  mÃ£o
em dev. Criticidade por atribuir no registo de defeitos.

| # | Passo | Tela | URL (dev) | Comportamento observado | EvidÃªncia no cÃ³digo / ambiente |
|---|---|---|---|---|---|
| F1 | A11 | CNPEM | [`/dados-referencia/cnpem`](http://app.example.internal/dados-referencia/cnpem) | Exportar ignora a ordenaÃ§Ã£o: o POST `/dados-referencia/cnpem/exportar` nÃ£o leva `sort` (a tabela estÃ¡ ordenada, ex.: `codigo,asc`) | `CnpemPage.tsx` â€” `filtrosExportacao` nÃ£o inclui `sort` (Sistemas CRD e Vacinas incluem) |
| F2 | A15 | CNPEM | [`/dados-referencia/cnpem/999999999`](http://app.example.internal/dados-referencia/cnpem/999999999) | `/dados-referencia/cnpem/999999999`: Alert "CNPEM nÃ£o encontrado", mas sem o tÃ­tulo do detalhe | `CnpemDetalhePage.tsx` â€” o ramo de erro sÃ³ tem `Alert` + "Voltar Ã  pesquisa" (MÃ©dicos mantÃ©m o tÃ­tulo) |
| F3 | A07 (A.1.3) | Embalagens | [`/dados-referencia/embalagens-medicamentos`](http://app.example.internal/dados-referencia/embalagens-medicamentos) | Colunas GenÃ©rico, Venda livre e Estado centradas ("tudo alinhado Ã  esquerda") | `EmbalagensMedicamentosPage.tsx` â€” `cellStyle: { textAlign: 'center' }` nessas 3 colunas |
| F4 | A08 (A.1.3) | Embalagens | [`/dados-referencia/embalagens-medicamentos`](http://app.example.internal/dados-referencia/embalagens-medicamentos) | O pedido leva `sort=numeroRegisto,asc`/`desc`, mas as linhas vÃªm na mesma ordem (ex.: 5850466, 5850474, 2814184â€¦); pÃ¡gina 2 nÃ£o continua a sequÃªncia | reproduzido em dev â€” o back ignora o `sort` desta pesquisa |
| F5 | A01 (A.1.4) | EFR | [`/dados-referencia/efr`](http://app.example.internal/dados-referencia/efr) | Ao abrir, antes de pesquisar, a tabela mostra "Nenhum resultado encontrado." em vez de "Utilize os filtros acima e clique em pesquisar." | dev, 24-09-2026 |
| F6 | B4.1, B4.2 | Embalagens | [`/dados-referencia/embalagens-medicamentos`](http://app.example.internal/dados-referencia/embalagens-medicamentos) | Ao marcar DiabÃ©tico / DietÃ©tico / Subs. Manipulada, os resultados da pesquisa de embalagens continuam na tabela (sÃ³ mudam depois de "Pesquisar") | reproduzido em dev; a grelha segue o `modo` da URL |
| F7 | B14.2 | Exames MCDT | [`/mcdts/exames`](http://app.example.internal/mcdts/exames) | Exportar nÃ£o leva o `sort` da tabela | `ExamePage.tsx` â€” `filtrosExportacao` sÃ³ com `codigoArea`/`codigoExame` |
| F8 | B14.4 | Exames MCDT | [`/mcdts/exames`](http://app.example.internal/mcdts/exames) | Pesquisar na tela â†’ abrir detalhe â†’ "Voltar" regressa a `/mcdts/exames` sem filtros nem resultados | reproduzido Ã  mÃ£o: o detalhe recebe `listaSearch: ""`; sÃ³ funciona se a lista foi aberta jÃ¡ com a query na URL |
| F9 | C01 | Tipos de PreÃ§o HD (tipo) | [`/dados-referencia/tipos-preco-hemodialise/novo`](http://app.example.internal/dados-referencia/tipos-preco-hemodialise/novo) | FormulÃ¡rio novo/editar tipo: o campo DescriÃ§Ã£o nÃ£o estÃ¡ no grid padrÃ£o | `TipoPrecoHemodialiseNovoPage.tsx` â€” `Seccao` sem `colunas` |

### 2.1 ValidaÃ§Ã£o manual dos achados (28-09-2026)

Cada achado foi reverificado Ã  mÃ£o antes de virar `BUG-20260924-NN`
([notas de origem](../../../QA/Testes/PDT/Testes%20manuais/24-09-2026-ajustes-gerais/valida%C3%A7%C3%A3o-p%C3%B3s-teste-automatizado.md)).
Nenhum foi ainda registado no levantamento de bugs.

| # | DecisÃ£o | Nota da validaÃ§Ã£o manual | Efeito nos testes |
|---|---|---|---|
| F1 | âŽ NÃ£o Ã© bug | NÃ£o Ã© esperado que Exportar siga a ordenaÃ§Ã£o da tabela | `CT-DR-A11` deixou de verificar o `sort` no pedido de exportaÃ§Ã£o |
| F2 | âŽ Descartado | "ignorar" | `CT-DR-A15` deixou de verificar o tÃ­tulo do detalhe no ramo de erro |
| F3 | â” NÃ£o confirmado | Bug nÃ£o encontrado Ã  mÃ£o | sem alteraÃ§Ã£o â€” se voltar a falhar, rever o critÃ©rio de alinhamento do teste antes de reportar |
| F4 | â” NÃ£o confirmado | NÃ£o foi possÃ­vel reproduzir | sem alteraÃ§Ã£o â€” se voltar a falhar, reproduzir Ã  mÃ£o antes de reportar |
| F5 | âŽ NÃ£o Ã© bug | O resultado esperado Ã© igual ao real ("Utilize os filtrosâ€¦") | sem alteraÃ§Ã£o â€” se voltar a falhar, suspeitar do teste (momento da verificaÃ§Ã£o) antes de reportar |
| F6 | âœ… Confirmado (sintoma diferente) | Em `/dados-referencia/embalagens-medicamentos`, ao marcar DiabÃ©tico, DietÃ©tico ou Subs. Manipulada, a pesquisa exige preencher o CNPEM, mas o campo CNPEM fica oculto nesses modos | `CT-DR-B4.1`/`B4.2-*` ganharam o passo "Pesquisar no modo X nÃ£o exige o CNPEM" |
| F7 | âŽ NÃ£o Ã© bug | NÃ£o Ã© esperado que o export obedeÃ§a Ã  ordenaÃ§Ã£o | `CT-DR-B14.2` (e, pela mesma regra, `CT-DR-B11.1`) deixaram de verificar o `sort` na exportaÃ§Ã£o |
| F8 | â³ Por validar | â€” | â€” |
| F9 | â³ Por validar | â€” | â€” |

**Regras a aplicar nos prÃ³ximos testes (manuais ou automatizados):**

- **Exportar nÃ£o tem de seguir a ordenaÃ§Ã£o da tabela.** CritÃ©rios do tipo "o Excel sai na mesma
  ordem da tabela" (roteiro A11, B11.1, B14.2 e equivalentes noutras telas) nÃ£o sÃ£o requisito â€”
  verificar sÃ³ que o ficheiro Ã© descarregado (e as colunas, quando o roteiro as indicar).
- **Detalhe com id invÃ¡lido:** basta o erro aparecer num `Alert`; a presenÃ§a do tÃ­tulo do detalhe
  nÃ£o Ã© critÃ©rio.
- **Achados sÃ³ da automaÃ§Ã£o** (F3, F4, F5): antes de registar como bug, reproduzir Ã  mÃ£o; se a
  automaÃ§Ã£o voltar a falhar nestes pontos e Ã  mÃ£o estiver correto, tratar como falso positivo do
  teste e corrigir o teste.

### ObservaÃ§Ãµes a confirmar (nÃ£o contam como falha)

- **MÃ©dicos/Prescritores (A.1.6, B7.2):** ordenar por "N.Âº Prescritor" ordena pelo nÃºmero sem o prefixo de letras, como texto (D00000, M00000, D1, C1, D10, C10â€¦).
- **Diplomas (B13.1):** "Adicionar diploma" (pesquisa) Ã© primÃ¡rio. O "Adicionar" da utilizaÃ§Ã£o (detalhe), que a #55 mudou, Ã© secundÃ¡rio âœ…. Confirmar a que botÃ£o se refere o roteiro.
- **ServiÃ§os DP (C04, mock):** o Alert de erro do servidor fica abaixo dos campos, junto aos botÃµes.
- **Filtro de preÃ§os (Vacinas/HD/DP):** escrever uma data em "Data InÃ­cio" e carregar **Enter** apaga a data (em "Data Fim" nÃ£o). Os testes usam Tab. Vale uma verificaÃ§Ã£o manual.
- **PaginaÃ§Ã£o:** Ã s vezes o 1.Âº clique em "pÃ¡gina seguinte" nÃ£o faz nada; o teste repete e regista `observacao`.

---

## 3. Limites da automaÃ§Ã£o

- **A11/B11.1/B14.2 (exportaÃ§Ã£o):** desde 28-09-2026 sÃ³ se verifica o download do XLSX â€” a exportaÃ§Ã£o seguir a ordenaÃ§Ã£o da tabela deixou de ser critÃ©rio (ver Â§2.1). O conteÃºdo do XLSX nÃ£o Ã© lido.
- **Aspeto visual** (A07 "compactas/zebradas", A13, B12.2 "alinhado"): verificado por propriedades do DOM (classes `odd-row`/`even-row`, `line-clamp`, `aria-expanded`, caixas). NÃ£o hÃ¡ comparaÃ§Ã£o de imagem.
- **PÃ¡ginas 2:** quando a massa sÃ³ tem 1 pÃ¡gina, a continuidade da ordenaÃ§Ã£o fica âž– (`nao-aplicavel`).
- **Massa de dev:** os filtros por tela estÃ£o em `paginas/dadosReferencia/telas.ts`. Em dev, sÃ³ os serviÃ§os DP de teste ("teste") tÃªm preÃ§os, e o 1.Âº tipo de preÃ§o HD de "pre" nÃ£o tem.

## 4. Como correr

```bash
cd CCM/ccmsns-qa-e2e
AMBIENTE=dev PW_NO_SERVER=1 BASE_URL=http://app.example.internal \
  npx playwright test testes/dados-referencia --project=chromium
# relatÃ³rio: npm run relatorio
```

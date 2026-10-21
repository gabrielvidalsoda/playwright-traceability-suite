# Casos de teste — Consulta por Área de Prestação (MVP, 10 casos)

Suíte E2E Playwright do repo `ccmsns-qa-e2e`. Todos os casos correm contra o
`ccmsns-ui` em **modo mock** (MSW, sem backend) — ver `README.md`.

- **Plano de origem:** [`CCM/QA/Consulta-Area-Prestacao.md`](../../QA/Consulta-Area-Prestacao.md)
- **Matriz requisito ↔ caso:** [`rastreabilidade/requisitos.yaml`](../rastreabilidade/requisitos.yaml)
- **Massa:** [`dados/massa.ts`](../dados/massa.ts) (bloco `mock`)
- **Relatório de rastreabilidade:** `relatorios/rastreabilidade/rastreabilidade.html` (gerado a cada `npm test`)

## Resumo

| #   | Caso                       | Família   | Tipo     | Requisitos | Spec                         |
| --- | -------------------------- | --------- | -------- | ---------- | ---------------------------- |
| 1   | CT-FAT-NUMERO              | Fatura    | positivo | RF29, RF32 | `fatura-pesquisa.spec.ts`    |
| 2   | CT-FAT-NIF                 | Fatura    | positivo | RF29       | `fatura-pesquisa.spec.ts`    |
| 3   | CT-FAT-ESTADO              | Fatura    | positivo | RF29, RF32 | `fatura-pesquisa.spec.ts`    |
| 4   | CT-FAT-SEM-CRITERIO        | Fatura    | negativo | RF29       | `fatura-pesquisa.spec.ts`    |
| 5   | CT-FAT-LIMPAR              | Fatura    | positivo | RF29       | `fatura-pesquisa.spec.ts`    |
| 6   | CT-FAT-PAGINACAO           | Fatura    | positivo | RF29       | `fatura-pesquisa.spec.ts`    |
| 7   | CT-FAT-DETALHE-ABRIR       | Fatura    | positivo | RF21, RF32 | `fatura-detalhe.spec.ts`     |
| 8   | CT-FAT-DETALHE-INEXISTENTE | Fatura    | robustez | RF21       | `fatura-detalhe.spec.ts`     |
| 9   | CT-LOT-NUMERO-FATURA       | Lote      | positivo | RF29       | `lote-pesquisa.spec.ts`      |
| 10  | CT-PRE-RECEITA             | Prestação | positivo | RF29, RF32 | `prestacao-pesquisa.spec.ts` |

Cobertura: **RF29** ← 8 casos · **RF21** ← 2 casos · **RF32** ← 3 casos.

**Requisitos**

- **RF29** — Consulta de Documentos por Área de Prestação (pesquisa, filtros, grade Comunicado/Apurado, ordenação, paginação, exportação XLSX).
- **RF21** — Apresentação dos dados de verificação da fatura (detalhe read-only, totais, localização, datas/utilizadores).
- **RF32** — Apresentação dos resultados de conferência (grupo de colunas "Apurado", CSE/CCE).

---

## 1. CT-FAT-NUMERO — Pesquisar fatura pelo Número da Fatura

- **Família / rota:** Fatura · `/medicamentos/factura`
- **Requisitos:** RF29 (pesquisa), RF32 (grupos Comunicado/Apurado)
- **Massa (mock):** `numeroFatura = F20250002` · NIF esperado `503456789` · estado na grelha `Verificada`

**Dado** que estou na tela "Pesquisa de Faturas" com o painel de filtros vazio
**Quando** preencho "Número da Factura" com `F20250002` e clico em "Pesquisar"
**Então** a grade exibe exatamente 1 linha, cuja coluna "Factura" é `F20250002`
**E** a URL contém `numeroFactura=F20250002`
**E** existem os cabeçalhos "Total PVP (Comunicado)" e "Total PVP (Apurado)"
**E** a linha mostra o NIF `503456789` e o estado `Verificada`

---

## 2. CT-FAT-NIF — Pesquisar faturas pelo NIF do Prestador

- **Família / rota:** Fatura · `/medicamentos/factura`
- **Requisitos:** RF29
- **Massa (mock):** `nifPrestador = 501234567` · total esperado `7` (seed: 35 faturas / 5 farmácias)

**Quando** preencho "NIF Prestador" com `501234567` e pesquiso
**Então** a URL contém `nifPrestador=501234567`
**E** todas as linhas visíveis pertencem a esse NIF
**E** o rodapé indica `7 resultados` (total em todas as páginas)

---

## 3. CT-FAT-ESTADO — Pesquisar faturas por Estado

- **Família / rota:** Fatura · `/medicamentos/factura`
- **Requisitos:** RF29 (filtro), RF32 (estado de conferência)
- **Massa (mock):** opção do dropdown `Conferida` → texto na grelha `Conferida Sem Erros`

**Quando** seleciono "Estado" = `Conferida` e clico em "Pesquisar"
**Então** todas as linhas da grade mostram o estado `Conferida Sem Erros`
**E** a URL contém `idEstado=<n>`

> Nota mock: o catálogo do dropdown (`ESTADOS_MOCK`) usa o rótulo curto `Conferida`;
> a célula da grelha usa a descrição longa `Conferida Sem Erros`. Em QUA os dois
> rótulos coincidem (`Conferida Sem Erros`) — ver `dados/massa.ts` bloco `qua`.

---

## 4. CT-FAT-SEM-CRITERIO — Pesquisar sem nenhum filtro é bloqueado (negativo)

- **Família / rota:** Fatura · `/medicamentos/factura`
- **Requisitos:** RF29 (critério mínimo — §2.4/§2.5 CA-G-05)

**Dado** que todos os campos de filtro estão vazios
**Quando** clico em "Pesquisar"
**Então** é exibido o banner "É necessário preencher pelo menos um dos campos de pesquisa."
**E** nenhuma chamada `GET /medicamentos/facturas` é feita
**E** a grade permanece vazia
**E** a URL fica sem parâmetros de pesquisa

---

## 5. CT-FAT-LIMPAR — Limpar filtros repõe a tela ao estado inicial

- **Família / rota:** Fatura · `/medicamentos/factura`
- **Requisitos:** RF29

**Dado** que executei uma pesquisa com resultados na grade
**Quando** clico em "Limpar"
**Então** todos os campos de filtro voltam a vazio
**E** as mensagens de erro desaparecem
**E** a URL fica sem parâmetros de pesquisa (`/medicamentos/factura`)

> **Desvio observado (mock):** a grelha **mantém o último resultado** (cache do
> react-query) até uma nova pesquisa — não é esvaziada de imediato como o plano
> descreve (§3 CT-FAT-LIMPAR: "a grade é esvaziada"). O teste valida o reset de
> campos + URL; a limpeza da grelha fica como observação a confirmar com o dono
> de produto / retestar após correção.

---

## 6. CT-FAT-PAGINACAO — Paginação da grade de faturas (CA-G-04)

- **Família / rota:** Fatura · `/medicamentos/factura`
- **Requisitos:** RF29 (§2.5 CA-G-04)
- **Massa (mock):** `numeroFatura = F2025` (substring) → `35` resultados · página de `10`

**Quando** pesquiso por `F2025` (devolve 35 faturas)
**Então** a página 1 mostra 10 linhas e o rodapé indica `35 resultados`
**E** "primeira página" está desativada e "seguinte" ativa
**Quando** vou para a "última página"
**Então** o conteúdo muda, restam ≤ 10 linhas (5), e "seguinte"/"última" ficam desativadas
**Quando** volto à "primeira página"
**Então** o conteúdo inicial é reposto e "primeira" fica desativada

---

## 7. CT-FAT-DETALHE-ABRIR — Detalhe da fatura somente leitura + totais

- **Família / rota:** Fatura · `/medicamentos/factura/:id`
- **Requisitos:** RF21 (cabeçalho read-only, totais), RF32 (Totais Apurados)
- **Massa (mock):** abre o detalhe da fatura `F20250002`

**Dado** que pesquisei e localizei a fatura `F20250002`
**Quando** clico no ícone "Ver detalhes da factura F20250002"
**Então** navego para `/medicamentos/factura/<id>` e vejo o título "Factura de Medicamentos"
**E** o número `F20250002` aparece como texto (não editável)
**E** existem os blocos "Totais Comunicados" e "Totais Apurados"
**E** não há inputs para os campos de dados da fatura (Número, Estado, Data, Totais, NIF)
**E** não há botões "Guardar" / "Marcar como verificada" / "Conferir" / "Devolver" / "Anular"
**E** existem as abas "Informações" e "Lotes"

---

## 8. CT-FAT-DETALHE-INEXISTENTE — Identificador inexistente (robustez)

- **Família / rota:** Fatura · `/medicamentos/factura/:id`
- **Requisitos:** RF21
- **Massa (mock):** id `000000000`

**Quando** acedo a `/medicamentos/factura/000000000`
**Então** é exibida a mensagem "Factura não encontrada."
**E** não é renderizado o cabeçalho de detalhe nem qualquer tabela (sem stack trace, sem grade enganosa)

---

## 9. CT-LOT-NUMERO-FATURA — Pesquisar lotes pelo Número da Fatura

- **Família / rota:** Lote · `/medicamentos/lote`
- **Requisitos:** RF29
- **Massa (mock):** `numeroFatura = F20250001` → `2` lotes (seed: 60 lotes, `factura = faturas[idx % 35]`)

**Quando** preencho "Número da Factura" com `F20250001` e pesquiso
**Então** a grade exibe 2 lotes, todos da fatura `F20250001`
**E** existem os cabeçalhos "Total PVP (Comunicado)" e "Total PVP (Apurado)"

---

## 10. CT-PRE-RECEITA — Pesquisar prestação pelo Número de Receita

- **Família / rota:** Prestação · `/medicamentos/prestacoes`
- **Requisitos:** RF29, RF32
- **Massa (mock):** `numeroReceita = R1001` (seed: receitas `R<nºLote><NNN>`; lote 1 → `R1001`..`R1004`)

**Quando** preencho "Número de Receita" com `R1001` e pesquiso
**Então** a grade retorna exatamente 1 prestação, cuja linha contém `R1001`
**E** a URL contém `numeroReceita=R1001`
**E** existem os cabeçalhos "Total PVP (Comunicado)" e "Total PVP (Apurado)"

---

## Notas gerais

- **Massa mock vs QUA.** Os valores acima são do seed determinístico do `ccmsns-ui`.
  Para correr contra QUA (`AMBIENTE=qua`), preencher o bloco `qua` de `dados/massa.ts`
  com valores reais extraídos via [`CCM/QA/consultas/massa-consulta-area-prestacao.sql`](../../QA/consultas/massa-consulta-area-prestacao.sql).
- **Formato de montantes.** A grelha mostra `4637,50` (vírgula decimal). Os testes
  não fazem asserções sobre o formato de moeda (defeito conhecido §8 do plano).
- **Sem `data-testid`.** Os page objects (`paginas/`) usam papéis/rótulos ARIA.
- **Próximos casos** (estrutura já suporta): `@CT-FAT-DATA-MES`, `@CT-FAT-COMBINADO`,
  `@CT-LOT-TIPO-LOTE`, `@CT-PRE-LINHA-RSP`, detalhe de lote e de prestação, e as
  variantes de outras áreas (MCDT, CRD, …).

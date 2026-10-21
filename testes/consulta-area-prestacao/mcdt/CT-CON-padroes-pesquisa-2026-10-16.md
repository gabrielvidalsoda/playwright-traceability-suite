# CT-CON — Padrões das pesquisas: filtros, opções, ordenação e resultados por página (MCDT)

| Campo | Valor |
|---|---|
| Origem | Validação com o Douglas, 15-10-2026 (pendências P5, P7, P8, P12, P13, P16) |
| Plano | [plano-padroes-pesquisa.md](../../../docs/padroes-pesquisa-consulta-16-10-2026/plano-padroes-pesquisa.md) — casos de uso UC-FIL, UC-OPC, UC-ORD e UC-PAG |
| Área/rota | Consulta por Área de Prestação (menu lateral «Área de Prestação») → MCDT |
| Variantes (sufixo do ecrã) | `MCDT-FAT` — Facturas (`/mcdts/factura`)<br>`MCDT-LOT` — Lotes (`/mcdts/lote`)<br>`MCDT-PRE` — Prestações (`/mcdts/prescricao`)<br>`MCDT-IPA` — Prestação IPATIMUP (`/mcdts/prestacoes-ipatimup`) |
| IDs | `CT-CON-<FIL\|OPC\|ORD\|PAG>-<NN>-<sufixo>`; na família FIL também o campo (ex.: `CT-CON-FIL-01-MCDT-FAT-numero-da-factura`) |
| Padrão | Documento funcional v02.1 (5.2, 5.3, 5.7); TASK-20261015-03, -12, -14, -16; BUG-20261015-14 |
| Requisito | RF29 |
| Spec | [`mcdt.spec.ts`](mcdt.spec.ts), casos gerados por `casosPadroesPesquisaItem` de `../padroes-pesquisa.ts`; configuração dos ecrãs em `../padroes-pesquisa.config.ts` |
| Camada | `@integracao` (filtros, ordenação, navegação e tamanho de página no servidor) e `@front` (opções do seletor, valor inicial, URL, critério mínimo, Limpar) |
| Data | 16-10-2026 |

## Passos (comuns a todos os casos)

1. Abrir o ecrã e fazer a **pesquisa de base** (`padroes-pesquisa.config.ts`, campo `bases`): a 1.ª que devolva registos suficientes.
2. Conforme a família:
   - **Filtros (UC-FIL):** tirar um valor de uma linha real da grelha, pesquisar só por esse campo (mais os campos que o ecrã exige combinados) e comparar a coluna correspondente em todas as linhas.
   - **Opções (UC-OPC):** abrir cada select e o autocomplete do prestador e ler as opções.
   - **Ordenação (UC-ORD):** clicar nos cabeçalhos e ler o pedido ao servidor, o `aria-sort` e a ordem das linhas.
   - **Resultados por página (UC-PAG):** ler o seletor «Resultados por página», escolher cada opção, mudar de página e recarregar.

## Resultado esperado

O de cada caso de uso no plano (§3 a §6). Cada caso falha com a lista do que está fora do padrão (colunas, opções, linhas ou pedidos); as falhas já conhecidas levam a tag do BUG/TASK correspondente.

## Estado

Implementado a 16-10-2026. Executado em mock local a 16-10-2026 (ver §9 do plano); por executar no DEV.

## Como correr

```bash
cd CCM/ccmsns-qa-e2e
# contra o DEV publicado (VPN)
npm run test:integracao -- --grep "CT-CON-.*-(MCDT-FAT|MCDT-LOT|MCDT-PRE|MCDT-IPA)"
# em mock local (sem VPN) — só os casos @front
npm run test:front -- --grep "CT-CON-.*-(MCDT-FAT|MCDT-LOT|MCDT-PRE|MCDT-IPA)"
```

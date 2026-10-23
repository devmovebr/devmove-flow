# Fechamento: ajuste-troca-plano-arredonda-para-cima

## Entregue
- cobranca: ajuste proporcional em centavos inteiros, arredondado para baixo. Commit `9c1e2aa`.

## Desvios
- Nenhum. QA reexecutou T3 em staging e passou.

## Fora de escopo
- Faturas já emitidas com 1 centavo a mais: descartado no gate (Ana ajusta à mão as 3 de staging; produção ainda sem trocas).

## Conhecimento
- Hipótese H2 assinatura (todo cálculo de dinheiro passa por `Centavos`): evidência [execucao|cobranca-ajuste] (2026-09-15), 1/3.

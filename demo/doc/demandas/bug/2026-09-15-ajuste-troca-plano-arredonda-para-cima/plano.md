# Plano: ajuste da troca de plano arredonda para cima

Porte P · bug · serviço `cobranca`

## Reprodução
Clínica no Básico (14900) troca para Pro (24900) no dia 10 de um ciclo de 30 dias: `uv run pytest tests/faturas/test_proporcional.py -k troca_dia_10` com o cenário novo espera 6666 e hoje recebe 6667.

## Causa
`cobranca` → `app/faturas/` → cálculo do ajuste proporcional usa `round()` sobre o valor fracionário (`caio-consultor-code`, mapa da demanda). Fato de `produtos/assinatura`: diferença cobrada proporcional, em centavos inteiros, arredondada para baixo.

## F1 cobranca
- Onde: `cobranca` → `app/faturas/` (cálculo do ajuste).
- O que muda: arredondamento para baixo em centavos inteiros, sem float no meio do cálculo.
- Restrição: dinheiro em centavos inteiros em todos os serviços (rules/code.md, Padrões).
- Aceite: o teste da reprodução passa; `uv run pytest tests/faturas -q` verde; `grep -rn "round(" app/faturas` sem resultado no cálculo de ajuste.

## Fora de escopo
- Faturas já emitidas com 1 centavo a mais: correção manual pela Ana, se ela quiser.

## Riscos
- Nenhum contrato muda: o evento `assinatura.situacao_alterada` v1 não carrega valor.

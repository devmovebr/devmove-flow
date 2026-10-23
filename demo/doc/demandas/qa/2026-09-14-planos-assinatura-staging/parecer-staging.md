# Parecer: staging

Veredito: REPROVADO · 5 de 6 cenários passaram · 2026-09-14

| Cenário | Esperado | Obtido | Resultado | Evidência |
|---|---|---|---|---|
| T1 | plano básico ativo | igual | PASSOU | staging.md T1 |
| T2 | Pro na hora | igual | PASSOU | staging.md T2 |
| T3 | ajuste 6666 | 6667 | FALHOU | staging.md T3 |
| T4 | 422 PLANO_INVALIDO | igual | PASSOU | staging.md T4 |
| T5 | 403 MODO_LEITURA | igual | PASSOU | staging.md T5 |
| T6 | agenda listada | igual | PASSOU | staging.md T6 |

## Defeitos
- T3: ajuste proporcional arredonda para cima; a regra é para baixo (fato de `produtos/assinatura`). Provável `cobranca/app/faturas/proporcional.py:calcular_ajuste`.

## Observações
- Entrega própria: defeito virou o bug `2026-09-15-ajuste-troca-plano-arredonda-para-cima`.

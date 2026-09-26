# cobranca: mapa

## Onde fica
- ciclo mensal · src/cobranca/tasks/ciclo.py · `cobrar_ciclo` · roda diário, cobra quem vence hoje · arquivista 2026-09-12
- webhook do gateway · src/cobranca/api/webhooks.py · `receber_pagafacil` · valida assinatura HMAC · arquivista 2026-09-12
- proporcional na troca de plano · src/cobranca/dominio/proporcional.py · `calcular_proporcional` · arquivista 2026-09-12

## Armadilhas
- webhook pode chegar duplicado · src/cobranca/api/webhooks.py · `receber_pagafacil` · idempotente por `evento_id` · dev-python 2026-09-10
- tarefa Celery precisa de `clinica_id` no payload (L2 multi-tenancy) · src/cobranca/tasks/ · `@app.task` · arquivista 2026-09-12

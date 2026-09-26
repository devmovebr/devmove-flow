---
tipo: processo
data: 2026-07-01
autor: Ana
---

# Deploy

## Gatilho
PR aprovado em `main` de qualquer serviço.

## Pré-requisitos
CI verde; checklist de LGPD marcado no PR; migration revisada por uma segunda pessoa.

## Passos
1. Merge em `main` publica em staging automaticamente.
2. Smoke test em staging com as 3 clínicas de teste.
3. Promoção para produção pelo botão do pipeline, das 10h às 16h, fora de sexta.

## Critério de pronto
Painel de erros sem alta em 30 minutos.

## Onde costuma travar
Migration longa em tabela de consultas: rodar em janela e com índice criado `CONCURRENTLY`.

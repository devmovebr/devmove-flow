# Evidências: staging

2026-09-14 15:20 · staging · massa `massa/planos.sql` aplicada às 15:05

```bash
export BASE=https://api.staging.consultto.app
export TOKEN=$(~/DevMove/devmove-flow/demo/tools/token.sh staging)
export CLINICA=qa-planos
```

## T1
`curl -sS -H "Authorization: Bearer $TOKEN" -H "X-Clinica: $CLINICA" $BASE/v1/assinatura`
HTTP 200 0,12s · `{"plano":"basico","situacao":"ativa","ciclo_inicio":"2026-09-04"}` · PASSOU

## T2
`curl -sS -X POST ... $BASE/v1/assinatura/troca -d '{"plano":"pro"}'`
HTTP 200 0,31s · `{"plano":"pro","vigente_desde":"2026-09-14"}` · PASSOU

## T3
`curl -sS ... $BASE/v1/faturas/proxima`
HTTP 200 0,09s · `{"itens":[{"tipo":"mensalidade","valor":14900},{"tipo":"ajuste_troca","valor":6667}]}`
Esperado: (24900 - 14900) × 20/30 = 6666,67 → 6666. FALHOU: arredondou para cima (6667).

## T4
HTTP 422 0,05s · `{"codigo":"PLANO_INVALIDO"}` · PASSOU

## T5
`export CLINICA=qa-inadimplente` · HTTP 403 0,07s · `{"codigo":"MODO_LEITURA"}` · PASSOU

## T6
HTTP 200 0,11s · 3 consultas, as mesmas da massa · PASSOU

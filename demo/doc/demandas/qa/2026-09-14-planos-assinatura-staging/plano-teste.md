# Plano de teste: planos-assinatura em staging

## Mudança
Repos `api` e `cobranca`, merges de F1 e F2 de `2026-09-01-planos-assinatura`. Planos Básico e Pro, troca de plano com diferença proporcional, tolerância de 7 dias e modo leitura.

## Ambiente
- URL base: `https://api.staging.consultto.app` (`doc/arquitetura/fatos.md`).
- Autenticação: `TOKEN=$(~/DevMove/devmove-flow/demo/tools/token.sh staging)`.
- Massa: `massa/planos.sql` cria a clínica `qa-planos` no Básico, ciclo de 30 dias iniciado há 10 dias, e uma fatura vencida há 8 dias na clínica `qa-inadimplente`.

## Cenários
- T1 Consultar plano atual. `GET $BASE/v1/assinatura` → 200, `plano=basico`, `situacao=ativa`.
- T2 Troca Básico → Pro no dia 10. `POST $BASE/v1/assinatura/troca {"plano":"pro"}` → 200, `plano=pro` na hora.
- T3 Diferença proporcional da troca. `GET $BASE/v1/faturas/proxima` → item `ajuste_troca` = (Pro - Básico) × 20/30, em centavos, arredondado para baixo.
- T4 Validação. `POST $BASE/v1/assinatura/troca {"plano":"ouro"}` → 422, `codigo=PLANO_INVALIDO`.
- T5 Inadimplente além da tolerância cria consulta. Clínica `qa-inadimplente`: `POST $BASE/v1/consultas` → 403, `codigo=MODO_LEITURA`.
- T6 Regressão: inadimplente ainda lista a agenda. `GET $BASE/v1/consultas?dia=hoje` → 200 com as consultas da massa.

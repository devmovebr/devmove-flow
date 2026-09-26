# Plano: planos de assinatura

Porte G · api, cobranca, web · F1 e F2 em paralelo; F3 depois de F1

## Restrições
- L1 multi-tenancy: "Toda consulta de negócio filtra por `clinica_id`."
- L2 multi-tenancy: "Job assíncrono carrega o `clinica_id` no payload e reabre o contexto de tenant antes de tocar o banco."
- Limite de plano bloqueia criar; nunca esconde nem apaga o que existe.

## F1: api (dev-node)
Onde: `src/planos/` (novo), guard global de escrita, `@RespeitaLimite` nas criações de profissional e consulta, consumidor de `assinatura.situacao_alterada`.
Aceite:
- `pnpm test` passa; `pnpm vitest run src/planos` cobre T1 a T5.
- Rota de criação sem `@RespeitaLimite` falha no teste de metadados (`src/planos/cobertura.spec.ts`).

## F2: cobranca (dev-python)
Onde: `src/cobranca/tasks/ciclo.py`, `src/cobranca/dominio/` (trial, proporcional), webhook.
Aceite:
- `uv run pytest -q` passa; `uv run pytest tests/test_trial.py -q` cobre T6 e T7 com data injetada no service.
- Webhook duplicado não gera segunda transição (T8).

## F3: web (dev-node), depende de F1
Onde: `src/app/(painel)/app/plano/`, faixa de aviso no layout do painel.
Aceite:
- `pnpm test` passa; `pnpm playwright test plano` cobre T9 e T10.

## Riscos
P2 aberta: só cartão no lançamento.

## Fora de escopo
Cupom, nota fiscal, plano anual.

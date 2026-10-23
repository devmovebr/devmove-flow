# Plano: lista de espera

Porte G · api, mensageria, web · F1 e F2 em paralelo; F3 depois de F1

## Restrições
- L2 agenda: "Duas consultas do mesmo profissional nunca se sobrepõem, nem com encaixe."
- L1 agenda: "Horário é gravado em UTC e exibido no fuso da clínica."
- L2 multi-tenancy: job de expiração carrega `clinica_id` e abre contexto de tenant.

## F1: api (dev-node)
Onde: `src/agenda/lista-espera/` (novo), `src/agenda/consultas.service.ts` (publicar `vaga.aberta` no cancelamento), `src/jobs/` (expirar ofertas).
Aceite:
- `pnpm test` passa; `pnpm vitest run src/agenda/lista-espera` cobre T1 a T6.
- `pnpm vitest run src/agenda/reserva.e2e-spec.ts` com dois aceites simultâneos: um vence (T4).

## F2: mensageria (dev-go)
Onde: `internal/consumidor/`, `internal/canais/zap/templates.go`.
Aceite:
- `go test ./internal/...` passa com T7.
- Template `vaga_aberta` aprovado no provedor.

## F3: web (dev-node), depende de F1
Onde: `src/app/(publico)/c/[slug]/`, `src/components/agenda/`.
Aceite:
- `pnpm playwright test lista-espera` cobre T8 a T10.

## Riscos
P1: sem texto aprovado, o template não sai.

## Fora de escopo
Prioridade manual; lista por serviço.

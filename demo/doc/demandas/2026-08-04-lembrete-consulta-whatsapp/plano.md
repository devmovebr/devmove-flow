# Plano: lembrete de consulta por WhatsApp

Porte M · api e mensageria · 2 frentes paralelas

## Restrições
- L1 multi-tenancy: "Toda consulta de negócio filtra por `clinica_id`."
- L1 agenda: "Horário é gravado em UTC e exibido no fuso da clínica."
- Evento `consulta.cancelada` ganha v2 com `motivo`; v1 continua publicado até a web migrar.

## F1: api (dev-node)
Onde: `src/agenda/` (confirmar e cancelar por token), `src/jobs/` (agendar lembrete), `src/eventos/` (v2).
O que muda: endpoint público `POST /c/:slug/consultas/:token/{confirmar,cancelar}`; cancelamento libera o horário; job publica `lembrete.devido`.
Aceite:
- `pnpm test` passa; `pnpm vitest run src/agenda` cobre confirmar, cancelar, token expirado, cancelar a menos de 2 horas.
- Job de lembrete abre contexto de tenant (teste com duas clínicas).

## F2: mensageria (dev-go)
Onde: `internal/lembretes/`, `internal/canais/zap/`.
O que muda: handler de `lembrete.devido` envia template `lembrete_24h` com os dois botões; reserva por SMS.
Aceite:
- `go test ./internal/lembretes/...` passa com os cenários T5 e T6.
- Template `lembrete_24h` aprovado no provedor antes do merge.

## Riscos
Aprovação do template pode levar 48 horas.

## Fora de escopo
Lembrete por e-mail. Reagendamento pelo paciente.

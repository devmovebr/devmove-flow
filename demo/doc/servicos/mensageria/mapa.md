# mensageria: mapa

## Onde fica
- consumidor · internal/consumidor/consumidor.go · `Consumidor.Processar` · um handler por tipo de evento · arquivista 2026-08-12
- WhatsApp · internal/canais/zap/cliente.go · `ClienteZap.EnviarTemplate` · só template aprovado · arquivista 2026-08-12
- reserva por SMS · internal/canais/fallback.go · `EnviarComReserva` · SMS se WhatsApp falhar 2 vezes · arquivista 2026-08-12
- agendamento de lembrete · internal/lembretes/agenda.go · `AgendarLembrete` · 24 horas antes, no fuso da clínica · arquivista 2026-08-12

## Armadilhas
- template novo leva até 48 horas para aprovação no provedor · internal/canais/zap/templates.go · `Templates` · pedir antes de codar · arquivista 2026-08-12

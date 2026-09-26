# Mapa: lembrete-consulta-whatsapp

- cancelamento pela clínica · src/agenda/consultas.service.ts · `ConsultasService.cancelar` · reaproveitado pelo token · consultor-code 2026-08-04
- jobs · src/jobs/ · `@Cron` · não passam pelo `TenantInterceptor` · consultor-code 2026-08-04
- evento de cancelamento · src/eventos/publisher.ts · `consulta.cancelada` · v1 sem motivo · consultor-code 2026-08-04
- canais · internal/canais/ · `EnviarComReserva` · já existe reserva por SMS · consultor-code 2026-08-04
- token público · src/agenda/token.ts · `TokenConsulta` · HMAC, expira na hora da consulta · dev-node 2026-08-05
- template · internal/canais/zap/templates.go · `lembrete_24h` · aprovado 2026-08-05 · dev-go 2026-08-05

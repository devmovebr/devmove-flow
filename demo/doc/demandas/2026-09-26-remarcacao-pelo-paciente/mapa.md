# Mapa: remarcacao-pelo-paciente

Fonte: mapas de doc/ (code/ vazio nesta validação).

- token público · src/agenda/token.ts · `TokenConsulta` · HMAC, expira na hora da consulta · consultor-code 2026-09-26
- cancelamento · src/agenda/consultas.service.ts · `ConsultasService.cancelar` · reaproveitado pelo token; publica `consulta.cancelada` v2 · consultor-code 2026-09-26
- lembrete 24h · internal/lembretes/agenda.go · `AgendarLembrete` · 24 horas antes, no fuso da clínica (mensageria) · consultor-code 2026-09-26
- consumidor de eventos · internal/consumidor/consumidor.go · `Consumidor.Processar` · um handler por tipo de evento · consultor-code 2026-09-26
- template WhatsApp · internal/canais/zap/templates.go · `Templates` · `lembrete_24h` aprovado; template novo leva até 48 horas · consultor-code 2026-09-26
- horários livres · src/agenda/disponibilidade.service.ts · `DisponibilidadeService.listar` · grade menos bloqueios menos consultas · consultor-code 2026-09-26
- reserva · src/agenda/reserva.service.ts · `ReservaService.reservar` · trava `pg_advisory_xact_lock` por profissional · consultor-code 2026-09-26
- seletor de horário · web src/components/agenda/seletor-horario.tsx · `SeletorHorario` · consultor-code 2026-09-26
- página pública · web src/app/(publico)/c/[slug]/page.tsx · `PaginaPublica` · consultor-code 2026-09-26
- eventos · src/eventos/publisher.ts · `EventosPublisher.publicar` · payload versionado · consultor-code 2026-09-26
- limites de plano · src/planos/limites.guard.ts · `LIMITES` · inclui `lista_espera` · consultor-code 2026-09-26
- jobs · src/jobs/ · `@Cron` · abrir tenant com `TenantContext.run` · consultor-code 2026-09-26
- não identificado nos mapas · rota pública do token, confirmar por token, evento `vaga.aberta`, configurações da clínica (api e web), qualquer update de data/hora ou profissional de consulta · consultor-code 2026-09-26

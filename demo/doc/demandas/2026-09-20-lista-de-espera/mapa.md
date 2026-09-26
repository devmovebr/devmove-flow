# Mapa: lista-de-espera

- cancelamento · src/agenda/consultas.service.ts · `ConsultasService.cancelar` · publica `consulta.cancelada` v2 · consultor-code 2026-09-20
- reserva · src/agenda/reserva.service.ts · `ReservaService.reservar` · trava por profissional e horário · consultor-code 2026-09-20
- limites · src/planos/limites.guard.ts · `LIMITES` · incluir `lista_espera` · consultor-code 2026-09-20
- templates · internal/canais/zap/templates.go · `Templates` · aprovação no provedor · consultor-code 2026-09-20
- fila · src/agenda/lista-espera/fila.service.ts · `FilaService.proximos(3)` · dev-node 2026-09-22
- expiração · src/jobs/expirar-ofertas.job.ts · `ExpirarOfertasJob` · abre tenant por clínica · dev-node 2026-09-22

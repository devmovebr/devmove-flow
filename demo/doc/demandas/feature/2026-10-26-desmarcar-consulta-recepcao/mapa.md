# mapa: desmarcar-consulta-recepcao

## Código
- repositórios api, web, mensageria · README.md · origin/main só tem README, sem código · caio-consultor-code 2026-10-26

## Do mapa de serviço (não confirmado no código)
- horários livres · src/agenda/disponibilidade.service.ts · `DisponibilidadeService.listar` · grade menos bloqueios menos consultas; filtro por status não documentado · mapa api, caio-consultor-code 2026-10-26
- reserva de horário · src/agenda/reserva.service.ts · `ReservaService.reservar` · `pg_advisory_xact_lock` por profissional · mapa api, caio-consultor-code 2026-10-26
- eventos · src/eventos/publisher.ts · `EventosPublisher.publicar` · payload versionado · mapa api, caio-consultor-code 2026-10-26
- lembrete WhatsApp · internal/lembretes/agenda.go · `AgendarLembrete` · 24h antes; cancelamento do lembrete não documentado · mapa mensageria, caio-consultor-code 2026-10-26
- consumidor · internal/consumidor/consumidor.go · `Consumidor.Processar` · um handler por tipo de evento · mapa mensageria, caio-consultor-code 2026-10-26
- seletor de horário · src/components/agenda/seletor-horario.tsx · `SeletorHorario` · mapa web, caio-consultor-code 2026-10-26
- agenda do dia · não consta no mapa web (só página pública, seletor, planos) · caio-consultor-code 2026-10-26

## Débito
- 2026-09-27-remover-consulta-cancelada-v1 · doc/demandas/debito-tecnico/ · backlog, porte P proposto, sem descrição do conteúdo no INDEX/CHANGELOG; nome sugere relação com status cancelada · caio-consultor-code 2026-10-26

## Frente 1 api (simulado, não confirmado no código)
- endpoint desmarcar · src/agenda/ (controller da agenda) · `POST /agenda/consultas/:id/desmarcar`, corpo `{motivo}` · 200 `{id,status,desmarcadaEm}`; 400 motivo, 403 perfil, 404 inexistente/outra clínica, 409 estado inválido ou horário passado · allan 2026-10-26
- serviço · src/agenda/consulta.service.ts · `desmarcar` · update condicional a `agendada` com clinica_id · allan 2026-10-26
- estado `cancelada` não aparece em nenhum mapa; `desmarcada` é novo · allan 2026-10-26

## Frente 2 web (simulado, não confirmado no código)
- chamada à api · src/lib/api/agenda.ts · `desmarcarConsulta` · único ponto que fala com POST desmarcar · allan 2026-10-26
- agenda do dia · src/app/(painel)/app/agenda/ · tela ausente nos mapas; previsto criar · allan 2026-10-26

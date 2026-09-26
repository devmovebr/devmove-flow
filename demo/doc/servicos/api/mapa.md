# api: mapa

## Camadas
- módulos por domínio · src/<dominio>/ · `*Module` · agenda, clinicas, pacientes, planos · arquivista 2026-09-12
- regra de negócio · src/<dominio>/*.service.ts · `*Service` · controller só valida e delega · arquivista 2026-09-12
- persistência · prisma/schema.prisma · `model *` · RLS criada em migration SQL à parte · arquivista 2026-09-12

## Onde fica
- reserva de horário · src/agenda/reserva.service.ts · `ReservaService.reservar` · trava `pg_advisory_xact_lock` por profissional · arquivista 2026-09-12
- horários livres · src/agenda/disponibilidade.service.ts · `DisponibilidadeService.listar` · grade menos bloqueios menos consultas · arquivista 2026-09-12
- limite de plano · src/planos/limites.guard.ts · `LimitePlanoGuard` · decorator `@RespeitaLimite('profissionais')` · arquivista 2026-09-12
- tenant · src/tenant/tenant.interceptor.ts · `TenantInterceptor` · `SET app.clinica_id` por transação · arquivista 2026-09-12
- eventos · src/eventos/publisher.ts · `EventosPublisher.publicar` · payload versionado · arquivista 2026-09-12

## Padrões
- DTO de entrada · src/<dominio>/dto/ · `class-validator` · arquivista 2026-09-12
- teste de service · src/<dominio>/*.spec.ts · Prisma mockado com `vitest-mock-extended` · arquivista 2026-09-12

## Armadilhas
- job agendado não passa pelo interceptor · src/jobs/ · `@Cron` · abrir tenant com `TenantContext.run` (L2 multi-tenancy) · arquivista 2026-08-12
- teste de reserva concorrente precisa de banco real · src/agenda/reserva.e2e-spec.ts · `make db-local` antes · dev-node 2026-09-10

## Comandos próprios
- migration local · `pnpm prisma migrate dev` · só com `make db-local` de pé · arquivista 2026-09-12

---
paths:
  - "code/api/**"
---

# Serviço api

- Pasta: `code/api/`. Stack: NestJS 11, Postgres 16 com RLS. Dev: `allan-dev-node`.
- Módulo por domínio (`src/<dominio>/`), regra no service, controller só valida (class-validator) e delega. Migrations com Prisma.
- Subir local: `tools/db-local.sh up` e `pnpm start:dev` (porta 4000), health em `/health`.
- Armadilha: job agendado não tem contexto de tenant; abrir com `withTenant(clinicaId)`.

# Mapa: renomear-medico-profissional

- entidade · prisma/schema.prisma · `model Medico` · 14 relações · consultor-code 2026-08-19
- módulo · src/medicos/ · `MedicosModule` · vira `src/profissionais/` · consultor-code 2026-08-19
- API pública · src/publica/v1/profissionais.controller.ts · `medico_id` · manter alias · consultor-code 2026-08-19
- seeds · prisma/seed.ts · `seedMedicos` · também renomear · dev-node 2026-08-19

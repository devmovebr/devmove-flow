# api: fatos

- Contexto de tenant é aberto pelo `TenantInterceptor` a partir do JWT; rota pública resolve pela `slug` da clínica. *consultor-code, 2026-09-20, verificado 2026-09-20*
- Evento `consulta.cancelada` é publicado em v2 desde 2026-08-12, com `motivo`. *fechamento 2026-08-04-lembrete-consulta-whatsapp, 2026-08-12, verificado 2026-09-20*

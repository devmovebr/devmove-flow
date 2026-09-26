# Fechamento: lembrete-consulta-whatsapp

## Desvios
- Job de lembrete foi escrito sem abrir contexto de tenant; o revisor-code pegou. Terceira ocorrência do mesmo problema.

## Hipóteses exercitadas
- H3 multi-tenancy (job assíncrono perde tenant): evidência nova [revisao|lembrete-job] (2026-08-05) → 3/3, promovida a L2.

## Conhecimento
- Fato em agenda: cancelamento pelo paciente só até 2 horas antes.
- Fato em api: `consulta.cancelada` v2.
- Mapas de api e mensageria atualizados.

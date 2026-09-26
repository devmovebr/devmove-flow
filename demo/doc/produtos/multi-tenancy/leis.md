# multi-tenancy: leis

- **L1 Toda consulta de negócio filtra por `clinica_id`.** Uma rota sem filtro expôs agenda de outra clínica em staging. Escopo: `multi-tenancy`. *promovida 2026-07-10 após 3 confirmações (H1: codigo, revisao, execucao)*
- **L2 Job assíncrono carrega o `clinica_id` no payload e reabre o contexto de tenant antes de tocar o banco.** Worker sem contexto gravou lembrete com tenant nulo. Escopo: `multi-tenancy`. *promovida 2026-08-12 após 3 confirmações (H3: codigo, execucao, execucao)*

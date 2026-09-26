# multi-tenancy: INDEX

Cada clínica é um tenant. Isolamento por `clinica_id` em toda tabela de negócio, reforçado por RLS no Postgres. Vale em todos os serviços.

| Arquivo | Carregue quando |
|---|---|
| [leis.md](leis.md) | sempre |

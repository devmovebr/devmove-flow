# revisao-code-2: rechecagem dos 3 itens de revisao-code-1

Veredito: aprovado

1. api, where sem horário: resolvido. retorno-frente-1.md:8 "where {id, clinica_id, status: agendada, inicio > agora}" com relógio injetável; a busca por {id, clinica_id} separa 404 de 409. retorno-frente-1.md:16 cobre a consulta `agendada` das 08:00, que continua `agendada`.
2. api, T4b fora do aceite: resolvido. retorno-frente-1.md:17: o teste está em desmarcar.concorrencia.spec.ts, dentro do padrão de `pnpm test agenda`, com o banco subido por tools/db-local.sh up.
3. web, tela criada sem gate: resolvido pelo gate de Ana às 22:55 (tela mínima: lista do dia e ação Desmarcar). retorno-frente-2.md:7-10 traz só a lista com o botão Desmarcar, o diálogo com motivo e o tratamento de sucesso e de erro. Não há filtro, navegação entre dias nem outra ação.

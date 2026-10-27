# SIMULADO: retorno frente 1 (api)
Status: feito (simulado, sem código, sem build nem teste)
Estado `cancelada`: o mapa não o mostra (doc/servicos/api/mapa.md, mapa.md da demanda); o plano manda parar só se existir. Seguiu-se com `desmarcada`; o débito remover-consulta-cancelada-v1 segue não confirmado.

## Mudou (previsto, src/agenda/ e prisma/)
- prisma/schema.prisma + migration: enum de status ganha `desmarcada`; colunas desmarcada_por, desmarcada_em (UTC), motivo_desmarcacao. RLS mantida.
- src/agenda/dto/desmarcar-consulta.dto.ts: `motivo` com class-validator (trim, ao menos uma palavra).
- src/agenda/consulta.service.ts: `desmarcar` com updateMany `where {id, clinica_id, status: agendada, inicio > agora}` (agora do relógio injetável); 0 linhas: busca por `{id, clinica_id}` separa 404 (não existe na clínica) de 409 (outro estado ou horário passado).
- controller da agenda: rota nova, guard de perfil recepção e administrador.
- src/agenda/disponibilidade.service.ts e reserva.service.ts: conflito conta só estados que ocupam horário (exclui `desmarcada`); sem tomar a trava de reserva.

## Cobertura prevista (verificação: `pnpm test agenda`, src/agenda/*.spec.ts, relógio fixo 2026-11-10 09:00)
- CA1/T1: desmarcar grava estado, usuário, instante, motivo; sai da lista de ativas.
- CA2/T2: listar não desconta `desmarcada`; reservar 14:00 aceita (L2 preservada).
- CA3/T3: filtro clinica_id no update; consulta de outra clínica dá 404, sem alterar.
- CA4/T4: recusa 409 para desmarcada, realizada e `agendada` das 08:00 (passada), que termina em `agendada`.
- T4b: update condicional; teste concorrente em src/agenda/desmarcar.concorrencia.spec.ts, incluído no padrão de `pnpm test agenda` (banco real subido antes com `<workspace>/tools/db-local.sh up`); a saída lista T4b verde.
- CA5/T5: log só com ids de consulta e clínica; spy de logger sem nome, telefone, CPF, motivo.
- CA6/T6: DTO recusa vazio e só espaços com 400; estado inalterado.

## Contrato para a frente 2
POST /agenda/consultas/:id/desmarcar, corpo {"motivo": string}; 200 {id, status:"desmarcada", desmarcadaEm}.
Erros: 400 motivo inválido, 403 perfil, 404 não encontrado (inclui outra clínica), 409 estado inválido ou horário passado.

## Armadilhas
- Filtro de status em DisponibilidadeService.listar e a tela da agenda do dia seguem não confirmados no código.

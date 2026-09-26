# Plano: remarcação pelo paciente

Porte M · api, mensageria, web · F1 primeiro; F2 e F3 em paralelo depois do contrato de F1; F4 depois da lista de espera
Cenários T1 a T13 em `testes.md`. Todo teste usa relógio injetado; nenhum depende de hora real ou de job rodando.

## Restrições
- L1 agenda: "Horário é gravado em UTC e exibido no fuso da clínica."
- L2 agenda: "Duas consultas do mesmo profissional nunca se sobrepõem, nem com encaixe."
- L1 multi-tenancy: "Toda consulta de negócio filtra por `clinica_id`." Vale para a leitura do token, da config e da grade.
- L2 multi-tenancy: "Job assíncrono carrega o `clinica_id` no payload e reabre o contexto de tenant antes de tocar o banco." Vale para o consumidor da mensageria.
- LGPD: nenhum dado de paciente em log ou em payload de evento além do id.

## Regras assumidas (ver Riscos)
- Corte: o instante atual precisa estar a 24 horas ou mais do início atual da consulta, comparado em UTC.
- O horário novo segue o mesmo corte (24 horas ou mais à frente) e sai da mesma disponibilidade da página pública.
- Mesmo profissional, mesmo serviço, mesma duração. A consulta mantém o id; só data e hora mudam.
- Sem limite de remarcações por consulta.
- Remarcação ligada por padrão; a clínica desliga nas configurações.

## F1: api (dev-node)
Onde: `agenda` (consultas, token, disponibilidade, reserva), `eventos`, configurações da clínica.
O que muda:
- Rota pública por token: lista horários livres do profissional da consulta e remarca para um deles.
- Remarcação passa pela trava de `ReservaService` do profissional; o horário antigo só é liberado na mesma transação.
- Publica `consulta.remarcada` v1 com `clinica_id`, id da consulta, início antigo e início novo (UTC).
- Flag de remarcação nas configurações da clínica, lida pela rota pública.
- Token segue a consulta: o mesmo link continua valendo para cancelar e remarcar e expira no início atual da consulta, lido do banco. Se `TokenConsulta` carrega a hora assinada, a checagem de expiração passa a usar o início atual.
- Recusas com erro distinto: fora do prazo, desligada, horário ocupado, outro profissional, token inválido, token expirado.
Aceite:
- `pnpm vitest run src/agenda/remarcacao` passa cobrindo T1 a T5, T7, T9 e T13.
- `pnpm vitest run src/agenda/reserva.e2e-spec.ts` passa com duas remarcações simultâneas para o mesmo horário (T8).
- `pnpm test` passa.

## F2: mensageria (dev-go), depende do contrato do evento de F1
Onde: `internal/consumidor` (handler novo), `internal/lembretes`.
O que muda: ao consumir `consulta.remarcada`, abre o tenant do payload, descarta o lembrete de 24 horas do horário antigo e agenda um novo com `AgendarLembrete` para o horário novo. Reusa o template `lembrete_24h`; nenhum template novo.
Aceite:
- `go test ./internal/consumidor/... ./internal/lembretes/...` passa cobrindo T10.
- `go test ./...` passa.

## F3: web (dev-node), depende da rota de F1
Onde: página pública (`src/app/(publico)/`), `SeletorHorario`, tela de configurações da clínica.
O que muda: página aberta pelo link do lembrete e da confirmação mostra a consulta atual, o seletor com horários do mesmo profissional no fuso da clínica e a confirmação. Mensagens para cada recusa. Chave liga/desliga nas configurações.
Aceite:
- `pnpm playwright test remarcacao` passa cobrindo T11 e T12.

## F4: api (dev-node), depende de F1 e da F1 de lista-de-espera
Onde: `agenda` (remarcação) e o módulo de lista de espera criado pela demanda 2026-09-20.
O que muda: se a clínica tem `LIMITES.lista_espera` e a lista ativa, o horário liberado pela remarcação entra na lista de espera pelo mecanismo que aquela demanda entregar para vaga liberada. Sem lista de espera, nada muda.
Aceite:
- `pnpm vitest run src/agenda/remarcacao-lista-espera` passa cobrindo T6.

## Fora de escopo
Troca de profissional (segue cancelar e marcar de novo); remarcação pela clínica; mensagem de confirmação da remarcação por WhatsApp; limite de remarcações; cobrança ou multa.

## Riscos
- R1 Regras assumidas acima (corte em UTC, horário novo também a 24 horas, sem limite, ligada por padrão) não estão no relato. Ana confirma no gate.
- R2 Não identificado: evento ou chamada que alimenta a lista de espera com vaga liberada (`vaga.aberta` não aparece no mapa; o cancelamento publica `consulta.cancelada` v2). F4 só começa quando a lista de espera entregar esse mecanismo; F1 a F3 vão para produção sem F4.
- R3 Não identificado: rota pública do token, confirmar por token, config da clínica (api e web), update de data e hora de consulta. F1 e F3 confirmam; se não existem, são criados.
- R4 Não identificado: se `AgendarLembrete` permite descartar ou substituir o lembrete já agendado. F2 confirma; sem isso o paciente recebe dois lembretes.
- R5 Assumido: o token segue a consulta (mesmo link, expira no início novo); nenhum link novo é enviado. Não identificado se `TokenConsulta` assina a hora; F1 confirma e ajusta a checagem de expiração.

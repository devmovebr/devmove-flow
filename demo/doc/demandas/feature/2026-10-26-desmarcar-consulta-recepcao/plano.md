# plano: desmarcar-consulta-recepcao

Feature M · api e web · fonte: `bruto/relato.md`, `mapa.md`

## Critérios de aceite
- CA1 A recepção desmarca uma consulta `agendada` a partir da agenda do dia; a consulta passa a `desmarcada` e some da lista de ativas.
- CA2 O horário desmarcado volta a aparecer como livre na listagem de disponibilidade e aceita nova reserva.
- CA3 Consulta de outra clínica não é desmarcada nem revelada: resposta de não encontrado.
- CA4 Desmarcar consulta que não está `agendada` (já desmarcada, realizada) ou com horário já passado é recusado sem alterar estado.
- CA5 Nenhum log da operação contém dado de paciente nem o motivo.
- CA6 Desmarcar exige motivo em texto livre com ao menos uma palavra; sem motivo, a operação é recusada sem alterar estado.

## Frente 1: api (primeiro)
Onde: api → `agenda` (consulta e disponibilidade) e a camada de rota autenticada da recepção.
O que muda:
- Novo estado `desmarcada` no ciclo da consulta e operação de desmarcar, restrita aos perfis recepção e administrador da clínica, com registro de quem, quando e do motivo.
- Motivo obrigatório em texto livre, com ao menos uma palavra; vazio ou só espaços é recusado.
- Transição só de `agendada` para `desmarcada`, numa atualização condicionada ao estado atual: duas desmarcações simultâneas resultam em uma aplicada e uma recusada.
- `DisponibilidadeService.listar` passa a descontar só consultas em estado que ocupa horário; `desmarcada` não ocupa. O mesmo critério vale na checagem de conflito de `ReservaService.reservar`.
- Desmarcar não toma a trava de `ReservaService.reservar`: é atualização de uma linha e não cria sobreposição.
- Instante de "agora" vem de relógio injetável, para os testes fixarem a data.
Restrições:
- multi-tenancy L1: "Toda consulta de negócio filtra por `clinica_id`." Vale para a busca da consulta, a atualização e a disponibilidade.
- agenda L2: "Duas consultas do mesmo profissional nunca se sobrepõem, nem com encaixe." A liberação do horário não pode abrir brecha para dupla reserva.
- agenda L1: "Horário é gravado em UTC e exibido no fuso da clínica." Data de desmarcação em UTC.
- Dado de paciente nunca vai para log: log da operação leva só ids de consulta e clínica; o motivo nunca vai para log.
Aceite: `pnpm test agenda` no repo api, verde, cobrindo T1 a T6 com relógio fixo.

## Frente 2: web (depende da frente 1)
Onde: web → agenda da recepção (tela da agenda do dia) → ação nova e estado visual.
O que muda:
- Ação "Desmarcar" em cada consulta `agendada` da agenda do dia, com confirmação e campo de motivo obrigatório: o envio fica bloqueado sem ao menos uma palavra.
- Após sucesso, a consulta sai das ativas e o horário aparece livre no `SeletorHorario` sem recarregar a página.
- Erro de não encontrado ou de estado inválido mostra mensagem e recarrega a agenda.
Restrições: horários exibidos no fuso da clínica (agenda L1); nada de dado de paciente em log de console ou telemetria.
Aceite: `pnpm test agenda` no repo web, verde, cobrindo o fluxo de T1, T2 e T6 com a api simulada e data fixa.

## Fora de escopo
- mensageria: cancelar lembrete WhatsApp, avisar paciente, consumir evento.
- Lista de espera e reaproveitamento automático do horário.
- Desmarcação pela página pública pelo paciente.
- Remarcar (desmarcar e agendar em um passo).

## Riscos
- Débito `debito-tecnico/2026-09-27-remover-consulta-cancelada-v1`: o nome sugere um estado `cancelada` legado. Se ele existir, `desmarcada` pode duplicar o conceito, e o débito pode remover o que esta demanda reutiliza. Não identificado; a frente 1 confirma o ciclo de estados antes de criar o novo. Se `cancelada` existir, a frente 1 para sem decidir e devolve `bloqueado` com a pergunta fechada: reaproveitar `cancelada` ou criar `desmarcada`?
- Lembrete WhatsApp: `AgendarLembrete` dispara 24h antes e o cancelamento não é documentado. Sem ação na mensageria, o paciente recebe lembrete de consulta desmarcada. Fica para demanda própria, conforme a decisão P3.
- Filtro por estado em `DisponibilidadeService.listar` não documentado (mapa de serviço, não confirmado em código). Não identificado; a frente 1 confirma.
- Tela da agenda do dia não consta no mapa web. Não identificado; a frente 2 confirma. Se não existir, o porte da frente 2 cresce e volta ao gate.
- Trava por profissional em `ReservaService.reservar` vem do mapa de serviço, não confirmada em código. O plano não depende dela além do que a L2 já exige.

## Decisões de produto
- P1 Motivo obrigatório, texto livre com ao menos uma palavra, nunca em log.
- P2 Consulta com horário já passado é recusada (CA4).
- P3 Cancelar o lembrete WhatsApp fica fora.
- P4 Avisar o paciente fica fora.
- P5 A api não publica evento de consulta desmarcada.
- P6 Recepção e administrador da clínica desmarcam.

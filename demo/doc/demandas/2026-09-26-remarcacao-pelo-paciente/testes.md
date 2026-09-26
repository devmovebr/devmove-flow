# Testes: remarcação pelo paciente

Relógio injetado em todos os cenários: agora = 2026-10-01 09:00 no fuso da clínica (America/Sao_Paulo). Base: clínica A com remarcação ligada, profissional P, consulta C de A com P em 2026-10-03 10:00, token válido de C. O cenário diz o que muda.

## api (F1)
T1 Remarca para horário livre
- Pré: P tem 2026-10-06 14:00 livre. Ação: remarcar C pelo token para esse horário.
- Resultado: C mantém o id, início gravado em UTC 17:00; 10-03 10:00 volta a aparecer em `DisponibilidadeService.listar`; um `consulta.remarcada` v1 publicado com `clinica_id` de A.
T2 Fora do prazo de 24 horas
- Pré: agora = 2026-10-02 10:01. Ação: remarcar C para qualquer horário livre.
- Resultado: recusa "fora do prazo"; C inalterada; nenhum evento. Com agora = 10-02 10:00, a remarcação passa.
T3 Horário novo a menos de 24 horas
- Pré: P tem 2026-10-02 08:00 livre. Ação: remarcar C para esse horário.
- Resultado: recusa; C inalterada.
T4 Clínica desligou a remarcação
- Pré: flag desligada em A. Ação: listar horários e remarcar pelo token.
- Resultado: as duas chamadas recusam "desligada"; C inalterada.
T5 Horário de outro profissional ou ocupado
- Pré: P2 livre em 10-06 14:00; P ocupado em 10-06 15:00. Ação: remarcar C para o horário de P2, depois para 10-06 15:00.
- Resultado: a lista só traz horários de P; as duas remarcações recusam; C inalterada.
T7 Isolamento entre clínicas
- Pré: consulta D da clínica B; token de C adulterado com o id de D. Ação: remarcar D com esse token.
- Resultado: recusa "token inválido"; D inalterada.
T8 Concorrência (L2 agenda)
- Pré: C e C2 de P, ambas remarcáveis; 10-06 14:00 livre. Ação: remarcar as duas para 10-06 14:00 ao mesmo tempo.
- Resultado: exatamente uma vence; a outra recusa "horário ocupado" e fica no horário original.
T9 Remarcar de novo
- Pré: T1 feito; 2026-10-08 09:00 livre. Ação: remarcar C para esse horário.
- Resultado: aceita; 10-06 14:00 volta a ficar livre.
T13 Token segue a consulta
- Pré: T1 feito, mesmo token de C. Ação: cancelar C com agora = 10-03 11:00; em outro caso, com agora = 10-06 14:01.
- Resultado: no primeiro, cancelamento aceito; no segundo, recusa "token expirado" e C inalterada.

## mensageria (F2)
T10 Lembrete segue o horário novo
- Pré: lembrete de C agendado para 10-02 10:00; evento de T1 na fila. Ação: `Consumidor.Processar` do evento.
- Resultado: um único lembrete de C, para 10-05 14:00 no fuso de A, template `lembrete_24h`; o de 10-02 não existe mais. Payload sem `clinica_id`: evento rejeitado, nada gravado.

## web (F3)
T11 Paciente remarca pela página
- Pré: API de teste no cenário T1. Ação: abrir o link do token, escolher 10-06 14:00, confirmar.
- Resultado: horários de P no fuso da clínica e confirmação com 06/10 14:00. Nas recusas de T2 e T4, mensagem correspondente e nenhum seletor.
T12 Clínica desliga nas configurações
- Pré: usuário de A logado. Ação: desligar a remarcação e salvar.
- Resultado: flag salva desligada; T4 passa a valer para A.

## api, lista de espera (F4)
T6 Lista de espera recebe o horário antigo
- Pré: A com `lista_espera` no plano e ativa. Ação: T1.
- Resultado: 10-03 10:00 de P entra na lista de espera de A. Sem lista de espera em A: nada entra.

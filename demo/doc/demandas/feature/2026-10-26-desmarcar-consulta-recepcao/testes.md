# testes: desmarcar-consulta-recepcao

Relógio fixo em todos os cenários: agora = 2026-11-10 09:00 no fuso da clínica. Nenhum cenário depende de relógio real ou job agendado.

## T1 (CA1) Recepção desmarca consulta da agenda do dia
- Pré-condição: clínica A, usuário recepção da clínica A, consulta `agendada` para 2026-11-10 14:00 com o profissional P.
- Ação: na agenda do dia, aciona "Desmarcar" na consulta, informa o motivo "paciente viajou" e confirma.
- Resultado: consulta em `desmarcada`, com usuário, instante 2026-11-10 09:00 e motivo registrados; some da lista de ativas da agenda do dia.

## T2 (CA2) Horário volta a ficar livre
- Pré-condição: estado final de T1.
- Ação: lista disponibilidade de P em 2026-11-10 e reserva 14:00 para outro paciente.
- Resultado: 14:00 aparece livre; a reserva é aceita; só uma consulta ativa de P em 14:00.

## T3 (CA3) Consulta de outra clínica
- Pré-condição: consulta `agendada` da clínica B; usuário recepção da clínica A.
- Ação: pede desmarcar a consulta da clínica B pelo id.
- Resultado: resposta de não encontrado; consulta da clínica B continua `agendada`; disponibilidade da clínica B inalterada.

## T4 (CA4) Estado que não permite desmarcar
- Pré-condição: na clínica A, uma consulta já `desmarcada`, uma `realizada` e uma `agendada` para 2026-11-10 08:00.
- Ação: pede desmarcar cada uma.
- Resultado: as três recusadas com erro de estado inválido; estado e registro de desmarcação inalterados.

## T4b (CA4) Duas desmarcações simultâneas
- Pré-condição: consulta `agendada` da clínica A.
- Ação: duas requisições de desmarcar a mesma consulta ao mesmo tempo.
- Resultado: uma aplicada, outra recusada com estado inválido; um único registro de desmarcação.

## T5 (CA5) Log sem dado de paciente
- Pré-condição: log capturado no teste; paciente com nome, telefone e CPF conhecidos; motivo "paciente viajou".
- Ação: executa T1 e T4.
- Resultado: nenhuma linha de log contém nome, telefone ou CPF do paciente nem o texto do motivo; só ids de consulta e clínica.

## T6 (CA6) Motivo obrigatório
- Pré-condição: consulta `agendada` da clínica A; usuário administrador da clínica A.
- Ação: pede desmarcar com motivo vazio e depois com motivo só de espaços; na web, tenta confirmar sem preencher o motivo.
- Resultado: api recusa as duas com erro de validação e a consulta segue `agendada`; na web o envio fica bloqueado e nenhuma requisição sai.

# Testes: lembrete

| ID | Pré-condição | Ação | Resultado |
|---|---|---|---|
| T1 | consulta amanhã 14h no fuso da clínica | job roda | `lembrete.devido` às 14h do dia anterior, fuso da clínica |
| T2 | token válido | paciente confirma | consulta `confirmada` |
| T3 | token válido, faltam 5 horas | paciente cancela | consulta `cancelada`, horário livre |
| T4 | faltam 90 minutos | paciente cancela | recusado, mensagem para ligar na clínica |
| T5 | WhatsApp falha 2 vezes | enviar lembrete | SMS enviado |
| T6 | duas clínicas com consultas no mesmo horário | job roda | cada lembrete com o `clinica_id` certo |

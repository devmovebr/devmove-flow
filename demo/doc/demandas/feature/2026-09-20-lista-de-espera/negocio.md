# Negócio: lista de espera

## Regra
Quando um horário vaga, os pacientes da lista de espera daquele profissional e período são avisados, e o primeiro que aceitar fica com o horário.

## Decidido
- Entrada na lista pela página pública: profissional, período (manhã, tarde, noite) e janela de datas de até 30 dias.
- Vaga aberta avisa os 3 primeiros da fila ao mesmo tempo; oferta vale 30 minutos.
- Primeiro aceite leva; os outros recebem "vaga preenchida".
- Ninguém aceitou em 30 minutos: avisa os 3 seguintes.
- Vaga a menos de 3 horas do horário não dispara oferta.
- Só planos Pro e Clínica; no Essencial, a opção não aparece.

## Fora de escopo
Lista de espera por serviço sem profissional definido. Prioridade manual pela clínica.

## Pendências
- P1 texto do template `vaga_aberta` (clínica piloto). Não bloqueia o código; bloqueia o envio real.

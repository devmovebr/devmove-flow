# revisao-1: plano.md e testes.md

Veredito: reprovado

## Bloqueante
- plano.md:43 "Se ele existir, `desmarcada` pode duplicar o conceito [...] a frente 1 confirma o ciclo de estados antes de criar o novo e registra no CHANGELOG." Não diz o que o dev faz se `cancelada` existir: reutilizar ou criar `desmarcada` é decisão que fica para ele. Correção: fixar a ação no caso positivo (ex.: "se existir `cancelada`, a frente 1 para e devolve ao gate antes de criar estado").

## Checklist
- Frentes com onde e o que: ok.
- CA verificável e coberto em testes.md (CA1 T1, CA2 T2, CA3 T3, CA4 T4 e T4b, CA5 T5): ok.
- Dev executa sem perguntar: falha no item acima. Sem chave de config nova.
- Lei inline virou restrição: ok (multi-tenancy L1, agenda L1 e L2, LGPD).
- Hipótese no corpo: nenhuma. Fatos não confirmados estão em Riscos.
- Impacto em fluxo existente (disponibilidade, reserva, lembrete): ok.
- pendencias.md: inexistente, sem bloqueante aberta.
- Tetos: plano 55/80, testes 33/50. Sem código, DDL ou lista de arquivo.

## Observações
- P1 sem valor assumido e P6 ("além de administrador") diverge de plano.md:15 ("restrita ao perfil recepção"); alinhar após o gate.
- plano.md:31 usa `SeletorHorario`, que no mapa é componente da página pública; a agenda do dia pode não usá-lo.
- Riscos de fato do mapa (linhas 45 a 47) sem a data 2026-10-26 da fonte.

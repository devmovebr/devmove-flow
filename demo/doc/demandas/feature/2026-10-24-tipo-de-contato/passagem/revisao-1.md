# revisao-1 tipo-de-contato (plano.md, testes.md)

Status: feito
Veredito: aprovado

Verificado:
- Tetos: plano.md 66/80 linhas, testes.md 38/50.
- Frentes 1 e 2 com onde (serviço → módulo), o que muda e aceite por comando.
- CA1 a CA7 com cenário em testes.md (T1 a T7); CA2 só em T2, coberto.
- L1 e regra de migração local com texto inline (plano.md:20-21); LGPD inline (plano.md:22).
- Sem DDL, código, assinatura ou lista arquivo por arquivo. Aceite sem relógio real.
- Não identificados estão em Riscos com ação de parada (plano.md:55-58); fatos de mapa.md datados 2026-10-24, nenhum stale.
- pendencias.md ausente no dossiê: nenhuma bloqueante aberta.
- Impacto em fluxo existente respondido: eventos, cobranca, mensageria, página pública e RLS (plano.md:23, 46-51, 57).

Observações:
- plano.md:60-66 "Premissas de produto" não constam no gate de Ana do CHANGELOG (só "contato = paciente, 3 tipos fixos"); confirmar no gate do plano.
- plano.md:21 cita só `tools/db-local.sh` e plano.md:25 usa `make db-local`; o dev precisa saber que um chama o outro.
- plano.md:28 `grep -rn "Prospecto" src/` pode acusar o padrão na criação se o DTO referenciar o valor por nome; a leitura do aceite fica a critério do dev.

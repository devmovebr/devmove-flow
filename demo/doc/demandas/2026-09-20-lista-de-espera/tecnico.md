# Técnico: lista de espera

## Impacto
- api → módulo `agenda` ganha `lista-espera` (entrada, fila, oferta).
- api → cancelamento de consulta dispara abertura de vaga.
- mensageria → handler de `vaga.aberta`, template `vaga_aberta` com botão aceitar.
- web → formulário na página pública; faixa "você está na lista" no link do paciente.

## Decisões
- Aceite resolvido pela mesma reserva com trava por profissional e horário (L2 agenda). Trade-off: sem fila distribuída, a trava do banco decide o primeiro.
- Oferta com prazo em tabela `ofertas_vaga` e job a cada minuto para expirar. Trade-off: até 1 minuto de atraso na segunda leva.

## Padrões
- L1 multi-tenancy, L2 multi-tenancy (job de expiração abre tenant).
- `@RespeitaLimite('lista_espera')` bloqueia no Essencial.

## Armadilhas
- Template novo leva até 48 horas para aprovação (mapa da mensageria).
- Horário em UTC; período "manhã" é no fuso da clínica (L1 agenda).

## Impacto em fluxo existente
Cancelamento passa a publicar `vaga.aberta` além de `consulta.cancelada`; consumidores atuais não mudam.

## Migração
Tabelas `lista_espera` e `ofertas_vaga`. Ordem: mensageria, api, web.

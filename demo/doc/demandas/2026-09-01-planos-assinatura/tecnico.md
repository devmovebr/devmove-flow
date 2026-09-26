# Técnico: planos de assinatura

## Impacto
- api → módulo novo `planos` (plano, assinatura, limites) e guard de limite nas criações.
- api → modo leitura: guard global que bloqueia escrita quando a assinatura está `suspensa`.
- cobranca → ciclo mensal, trial, webhook do PagaFácil, proporcional.
- web → tela de plano, aviso de trial e de modo leitura.
- evento novo `assinatura.situacao_alterada` (cobranca → api).

## Decisões
- Fonte da verdade da situação da assinatura: `cobranca`. A api guarda cópia atualizada pelo evento. Trade-off: consistência eventual de segundos, em troca de a api não depender do gateway.
- Limite checado por guard declarativo (`@RespeitaLimite`). Trade-off: menos flexível que regra no service, mas impossível esquecer numa rota nova.
- Modo leitura por guard global de escrita, com lista de rotas liberadas (pagar, trocar plano).

## Padrões
- L1 multi-tenancy e L2 multi-tenancy (evento e tarefa carregam `clinica_id`).
- Dinheiro em centavos.

## Armadilhas
- Webhook duplicado do gateway: idempotência por `evento_id`.
- Rebaixamento não pode esconder consulta existente.

## Impacto em fluxo existente
Toda rota de criação da api passa a depender da situação da assinatura. Clínicas atuais entram como `trial_migracao` por 60 dias: nada muda para elas até lá.

## Migração
Migration com tabelas de plano e assinatura; script de carga das clínicas atuais em `trial_migracao`. Ordem: cobranca, api, web.

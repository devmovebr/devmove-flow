---
name: novo-agent
description: Propõe um novo agent para aprovação de {{RESPONSAVEL}} antes de gravar. Uso: /novo-agent <papel>
disable-model-invocation: true
---
Papel pedido: $ARGUMENTS.

1. Algum agent em `.claude/agents/` já cobre o papel? Diz qual e para.
2. Três testes: briefing volta com a mesma forma em tarefas diferentes; o durável é critério, não dado; mais de um fluxo invoca. Falhou em um: é spawn de `general-purpose` ou `Explore` com o modelo certo, não agent. Diz e para.
3. Propõe: nome, modelo, tools, prompt (até 20 linhas, sem nome de serviço).
4. Grava em `.claude/agents/` só depois do "aprovado".

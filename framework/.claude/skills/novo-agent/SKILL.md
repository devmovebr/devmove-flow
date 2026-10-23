---
name: novo-agent
description: Propõe um novo agent para aprovação de {{RESPONSAVEL}} antes de gravar. Uso: /novo-agent <papel>
disable-model-invocation: true
---
Papel pedido: $ARGUMENTS.

1. Algum agent em `.claude/agents/` já cobre o papel? Diz qual e para.
2. Três testes: briefing volta com a mesma forma em tarefas diferentes; o durável é critério, não dado; mais de um fluxo invoca. Falhou em um: é spawn de `general-purpose` ou `Explore` com `model: sonnet`, não agent. Diz e para.
3. Propõe: nome `<apelido>-<papel>`, modelo pela regra de `.claude/fluxo.md` (Agents), tools mínimas (sem `Agent`), `maxTurns`, orçamento, prompt (até 30 linhas, sem nome de serviço).
4. Grava em `.claude/agents/` só depois do "aprovado", acrescenta a linha na tabela de Agents de `.claude/fluxo.md` e avisa que a sessão precisa ser reiniciada.

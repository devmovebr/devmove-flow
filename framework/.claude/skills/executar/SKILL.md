---
name: executar
description: Etapa de execução do fluxo de demanda. Roda um dev-<stack> por serviço e um revisor-code por execução. Chamada pelo /demanda ou /retomar, ou direto: /executar <pasta-do-dossiê>
---
`.claude/fluxo.md` ainda não lido nesta sessão: leia antes.

Dossiê: o corrente, ou `doc/demandas/$ARGUMENTS/`. Registra o início no `CHANGELOG.md`.

1. Lê `CHANGELOG.md` e `plano.md` (até 80 linhas, lê direto). Bloqueante aberta: gate antes.
2. Um `dev-<stack>` por serviço, em background; serviços diferentes em paralelo. As frentes do serviço vão em sequência no mesmo agent: a primeira no briefing, as seguintes por `SendMessage`. Briefing: `CHANGELOG.md`, `mapa.md` da demanda e do serviço, caminho do plano, frentes, aceite, porte com meta, ponto de bastão e limite em chamadas (`.claude/fluxo.md`). Não copie o plano no briefing.
3. Enquanto rodam: responde bloqueio no mesmo turno ou leva a {{RESPONSAVEL}} como pergunta fechada. Retorno `parcial` ou `bloqueado`: registra "Aprendido" ou a passagem no `CHANGELOG.md`, e também `subagent_tokens` e `tool_uses` da notificação, e segue a regra de continuação de `.claude/fluxo.md`. Nunca reenvia o mesmo briefing.
4. Todas as frentes `feito`: um `revisor-code` para a execução inteira, em todos os portes .
5. Reprovado: correção automática, sem perguntar a {{RESPONSAVEL}}. `SendMessage` ao `dev-<stack>` do serviço com todos os itens reprovados juntos, em briefing de correção (`.claude/fluxo.md`). Depois, `SendMessage` ao mesmo `revisor-code` para a rechecagem. Spawn novo só se o agent passou do bastão. Reprovou de novo: fallback só daquela frente; as outras seguem.
6. `CHANGELOG.md`: uma entrada por frente com status e contratos alterados.
7. Gate com frentes, contratos e "Fora de escopo" consolidado. Sem commit. Próxima etapa: `fechar`.

---
name: executar
description: Etapa de execução do fluxo de demanda. Prepara as branches, checa o ambiente, roda um dev por serviço e uma revisão de código por execução, e commita depois do gate. Chamada pelo /demanda ou /retomar, ou direto: /executar <dossiê>
---
`.claude/fluxo.md` ainda não lido nesta sessão: leia antes.

Dossiê: o corrente, ou `$ARGUMENTS`. Registra o início no `CHANGELOG.md`.

1. Lê `CHANGELOG.md` e `plano.md` (até 80 linhas, lê direto). Bloqueante aberta: gate antes.
2. Git (`.claude/fluxo.md`, Git): em cada repositório tocado, `git status --short` limpo e a branch da demanda criada a partir da branch base. Sujo ou sem identificador para o nome da branch: pergunta fechada a {{RESPONSAVEL}}.
3. Ambiente (`.claude/fluxo.md`, Ambiente): frente com aceite em infra local ou em ambiente privado tem a pré-condição conferida antes do spawn. Não sobe: `igor-infra-local`.
4. Um dev por serviço (`.claude/rules/code.md`, tabela de serviços), em background; serviços independentes em paralelo, quem produz contrato antes de quem consome. As frentes do serviço vão em sequência no mesmo agent: a primeira no briefing, as seguintes por `SendMessage`. Portes M e G com 3 ou mais frentes grandes no mesmo serviço: dev novo por frente, em sequência. Briefing: `CHANGELOG.md`, `mapa.md` da demanda e do serviço, caminho do plano, frentes, aceite (com a regra de intenção do `grep` de arquitetura), ferramenta de `tools/` quando o aceite precisa de infra, porte com meta, ponto de bastão e limite em chamadas, caminho do retorno em `passagem/`. Não copie o plano no briefing.
5. Enquanto rodam: responde bloqueio no mesmo turno ou leva a {{RESPONSAVEL}} como pergunta fechada. `bloqueado: ambiente`: resolve o ambiente e segue por `SendMessage`. Retorno `parcial` ou `bloqueado`: registra "Aprendido" ou a passagem no `CHANGELOG.md`, e também o consumo da notificação, e segue a regra de continuação de `.claude/fluxo.md`. Nunca reenvia o mesmo briefing. Config necessária em repositório compartilhado: agent dono daquele repositório, com a lista exata.
6. Todas as frentes `feito`: um `rita-revisor-code` para a execução inteira, em todos os portes. Notificação que não chegou: lê o retorno em `passagem/`.
7. Reprovado: correção automática, sem perguntar a {{RESPONSAVEL}}. `SendMessage` ao dev do serviço com todos os itens reprovados juntos, em briefing de correção (`.claude/fluxo.md`). Depois, `SendMessage` ao mesmo `rita-revisor-code` para a rechecagem. Spawn novo só se o agent passou do bastão. Reprovou de novo: fallback só daquela frente; as outras seguem.
8. `CHANGELOG.md`: uma entrada por frente com status e contratos alterados.
9. Gate com, por serviço: branch, `git diff --stat`, o que mudou em até 3 linhas, aceite verificado, contratos e "Fora de escopo" consolidado. A opção `Aprovar e seguir` leva a descrição "commita e segue para fechar": aprovar é o pedido de commit.
10. Aprovado: um commit por repositório (`git -C <serviço> add` só dos arquivos da demanda), mensagem na convenção de `.claude/rules/code.md`, sem atribuição. Hashes no `CHANGELOG.md`. Sem push. Próxima etapa: `fechar`.

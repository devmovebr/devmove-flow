---
name: brief
description: Resumo do estado atual: demandas em andamento por tipo, backlog de débito e bug, QA, pendências bloqueantes e saúde do conhecimento. Lê só índices e o Estado dos CHANGELOG.md.
disable-model-invocation: true
---
Spawna um `Explore` com `model: sonnet` que lê só `doc/INDEX.md`, os `INDEX.md` de primeiro nível e de cada tipo em `doc/demandas/`, e a seção `Estado` do `CHANGELOG.md` dos dossiês não fechados, e devolve os dados das seções abaixo. Você escreve o resumo, até 40 linhas.

1. **Demandas em andamento**: tipo, dossiê, porte, etapa, status, dias desde o início. `travada` primeiro.
2. **Backlog**: débitos e bugs em `backlog`, com origem e idade.
3. **QA**: testes abertos e o último veredito.
4. **Bloqueios**: pendências bloqueantes abertas e há quantos dias.
5. **Conhecimento**: por domínio, quantas leis e quantos fatos `stale`.
6. **Retro**: das 5 últimas linhas de `.claude/retro.md`, o atraso que mais se repete.
7. **Próximas ações**: até 3, cada uma com o comando (`/retomar <dossiê>` etc.).

Pergunta sobre um assunto da base: spawn da `iris-arquivista` com a pergunta e `doc/INDEX.md` como ponto de partida; ela devolve o resumo com `arquivo:linha`.

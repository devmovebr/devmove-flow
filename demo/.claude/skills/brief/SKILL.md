---
name: brief
description: Resumo do estado atual: demandas em andamento, pendências bloqueantes e saúde do conhecimento. Lê só índices e o Estado dos CHANGELOG.md.
disable-model-invocation: true
---
Spawna um `Explore` com `model: opus` que lê só `doc/INDEX.md`, os `INDEX.md` de primeiro nível e a seção `Estado` do `CHANGELOG.md` dos dossiês não fechados, e devolve os dados das seções abaixo. Você escreve o resumo, até 40 linhas.

1. **Demandas em andamento**: dossiê, porte, etapa, status, dias desde o início. `travada` primeiro.
2. **Bloqueios**: pendências bloqueantes abertas e há quantos dias.
3. **Conhecimento**: por domínio, quantas leis e quantos fatos `stale`.
4. **Retro**: das 5 últimas linhas de `.claude/retro.md`, o atraso que mais se repete.
5. **Próximas ações**: até 3, cada uma com o comando (`/retomar <dossiê>` etc.).

---
name: qa
description: Testa num ambiente real uma entrega já integrada, própria ou de outra pessoa. Monta plano de teste a partir do código, executa, grava evidências e parecer por ambiente em doc/demandas/qa/. Uso: /qa <entrega> [ambiente]
disable-model-invocation: true
---
`.claude/fluxo.md` ainda não lido nesta sessão: leia antes.

`$ARGUMENTS` = a entrega (dossiê próprio, link do PR, branch, identificador ou relato) e, opcional, o ambiente. Ambientes permitidos: `local` e `staging`. Produção nunca. Outro ambiente: recuse. Pasta existente de `doc/demandas/qa/` retoma o teste.

Sem porte e sem `CHANGELOG.md`. O estado mora na linha do `doc/demandas/qa/INDEX.md`: `plano` | `executando` | `aprovado` | `reprovado`.

## Abertura
1. Cria `doc/demandas/qa/<AAAA-MM-DD>-<slug>/` com `bruto/` (relato e anexos originais), `evidencias/` e `massa/`. `INDEX.md` do dossiê com `Origem` quando a entrega é um dossiê próprio. Linha em `doc/demandas/qa/INDEX.md`: data · pasta · serviço · status.
2. Retomada: sem `plano-teste.md`, vai para Plano; com plano e sem `parecer-<ambiente>.md` do ambiente pedido, vai para Execução; com ele, mostra o veredito e para.

## Plano
1. Spawn da `nina-qa` (fase plano) com a pasta e o ambiente. Orçamento: 60 chamadas.
2. Gate: `Aprovar e executar` ou `Reprovar e pedir ajuste`. Ajuste vai à mesma `nina-qa` por `SendMessage`.

## Execução
1. Ambiente (`.claude/fluxo.md`, Ambiente): ambiente remoto, confere credencial e rede pela ferramenta de `tools/`; falhou, pergunta fechada a Ana. Local: `/infra` para o serviço antes.
2. `SendMessage` à `nina-qa` viva (ou spawn novo com a pasta) para a fase execução. Orçamento: 100 chamadas.
3. Mostra em até 8 linhas: veredito, placar, defeitos, caminho do `parecer-<ambiente>.md`. Atualiza o status no índice.
4. Defeito de entrega própria: gate propondo um dossiê de `bug` por defeito, com `Origem` neste QA. Defeito de entrega de outra pessoa: fica no parecer para o autor.

## Regras
- Credencial nunca vai para plano, evidência ou parecer: o curl gravado usa `$TOKEN`.
- Defeito achado não vira correção dentro do QA.

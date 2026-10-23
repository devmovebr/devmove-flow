---
name: revisar-pr
description: Revisa o PR de um par contra as regras de código e arquitetura do workspace e devolve um relatório no terminal. PR aprovado destila o que vale para o projeto na base doc/. Uso: /revisar-pr <link> [foco]
disable-model-invocation: true
---
`$ARGUMENTS` = link do PR e, opcional, o foco da revisão.

Fora do fluxo de demanda: sem dossiê nem CHANGELOG. O relatório não vai para `doc/`. Só o conhecimento destilado de PR aprovado entra na base.

## Preparação
1. Extraia `<repo>` e `<id>` do link. Ache o repositório em `code/` (fora de `code/.revisao/`). Não achou: clone em `code/.revisao/_clones/<repo>`.
2. Busque a ref do PR para uma ref local, sem tocar a cópia de trabalho: `git -C <repo> fetch origin refs/pull/<id>/merge:refs/revisao/pr-<id>` (GitHub sem merge: `refs/pull/<id>/head` e a base pela branch de destino).
3. Fetch falhou (PR concluído, abandonado ou com conflito): pergunte as branches de origem e destino, faça fetch das duas e use `origin/<destino>...origin/<origem>`.
4. `git -C <repo> worktree add --detach <workspace>/code/.revisao/<repo>-pr<id> refs/revisao/pr-<id>`. Base: `pr-<id>^1`. Topo: `pr-<id>^2`.
5. Erro de rede ou SSH: pergunta fechada a Ana (VPN, credencial) e repita.

## Revisão
Spawn do `paul-revisor-pr` com: link, caminho do worktree, base e topo, rule do serviço e do grupo, foco se houver. Orçamento: 60 chamadas.

## Entrega
1. Mostre o relatório como veio.
2. Gate: `PR aprovado, atualizar a base` ou `Encerrar sem atualizar`. Nada é postado no PR: comentário é de Ana.

## Atualizar a base
1. `SendMessage` ao `paul-revisor-pr` vivo pedindo a destilação.
2. Lista vazia: diga e vá para Limpeza.
3. Spawn da `iris-arquivista` com a lista, o worktree para conferência e a fonte `PR <id> <repo> <AAAA-MM-DD>`.
4. Mostre em até 5 linhas: arquivos de `doc/` alterados e contradições, com `arquivo:linha`. Contradição fica para Ana.

## Limpeza
`git -C <repo> worktree remove --force <worktree>` e `git -C <repo> update-ref -d refs/revisao/pr-<id>`. Clone temporário: apague `code/.revisao/_clones/<repo>`.

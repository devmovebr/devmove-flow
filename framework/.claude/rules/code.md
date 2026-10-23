---
paths:
  - "code/**"
---

# Código em code/

Cada `code/<serviço>/` é um repo git próprio. Regras em três níveis, carregadas pelo caminho que o agent toca: este arquivo (todos os serviços), `.claude/rules/code/<grupo>.md` (grupo de serviços, quando houver) e `.claude/rules/code/servicos/<serviço>.md` (stack, comandos e armadilhas do serviço). A rule do serviço é a fonte única dos comandos de build e teste.

## Serviços

| Serviço | Stack | Agent dev | Onde rodar comandos |
|---|---|---|---|
{{TABELA_SERVICOS}}

## Comandos por stack

{{COMANDOS_POR_STACK}}

## Git

- Branch principal `{{BRANCH_PRINCIPAL}}`. {{GIT}}.
- Dev não faz commit, push, stash nem troca de branch. O orquestrador cuida do git (`.claude/fluxo.md`, Git).
- Código, comentário, teste e mensagem de commit nunca citam o harness: arquivo de dossiê (`negocio.md`, `tecnico.md`, `plano.md`, `testes.md`, `mapa.md`), "decisão N", pendência `P<n>`, frente `F<n>`, `.claude/`. O comentário afirma a regra; a origem fica no dossiê.

## Padrões

- Padrão do repositório vence preferência. Copie o código vizinho mais parecido: nome, pasta, teste.
- Sem lib nova sem pedido do briefing.
- Não altere teste existente para passar sem entender a falha.
{{PADROES}}

## Ambiente

- Ferramentas em `tools/` (`tools/README.md`), chamadas por `<workspace>/tools/<nome>`. Teste que precisa de infra real (banco, fila) roda pela ferramenta do serviço, nunca contra ambiente compartilhado.
- Falha de rede em dependência (registry privado, host interno, timeout de download): pare e devolva `bloqueado: ambiente` com o trecho do erro.
{{AMBIENTE}}

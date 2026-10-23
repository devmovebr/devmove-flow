---
paths:
  - "code/**"
---

# Código em code/

Cada `code/<serviço>/` é um repo git próprio. Regras em três níveis, carregadas pelo caminho que o agent toca: este arquivo (todos os serviços), `.claude/rules/code/<grupo>.md` (grupo de serviços, quando houver) e `.claude/rules/code/servicos/<serviço>.md` (stack, comandos e armadilhas do serviço). A rule do serviço é a fonte única dos comandos de build e teste.

## Serviços

| Serviço | Stack | Agent dev | Onde rodar comandos |
|---|---|---|---|
| `web` | Next.js 15, TypeScript | `allan-dev-node` | `code/web/` |
| `api` | NestJS 11, TypeScript, Postgres 16 | `allan-dev-node` | `code/api/` |
| `cobranca` | Python 3.12, FastAPI, Celery | `sam-dev-python` | `code/cobranca/` |
| `mensageria` | Go 1.23 | `greg-dev-go` | `code/mensageria/` |

## Comandos por stack

- Node (`web`, `api`): `pnpm build`, `pnpm test`, `pnpm vitest run <arquivo>`, `pnpm lint --fix`. E2E da web: `pnpm playwright test` (só no fim).
- Python (`cobranca`): `uv run pytest -q`, `uv run pytest <arquivo> -q`, `uv run ruff check --fix`, `uv run mypy src`.
- Go (`mensageria`): `go build ./...`, `go test ./...`, `go test ./<pacote> -run <Teste>`, `gofmt -w`, `go vet ./...`.

## Git

- Branch principal `main`. Branch da demanda `feat/<id>-<slug>` ou `fix/<id>-<slug>` a partir de `main`. Commit em Conventional Commits, sem atribuição. PR no GitHub com checklist de LGPD.
- Dev não faz commit, push, stash nem troca de branch. O orquestrador cuida do git (`.claude/fluxo.md`, Git).
- Código, comentário, teste e mensagem de commit nunca citam o harness: arquivo de dossiê (`negocio.md`, `tecnico.md`, `plano.md`, `testes.md`, `mapa.md`), "decisão N", pendência `P<n>`, frente `F<n>`, `.claude/`. O comentário afirma a regra; a origem fica no dossiê.

## Padrões

- Padrão do repositório vence preferência. Copie o código vizinho mais parecido: nome, pasta, teste.
- Sem lib nova sem pedido do briefing.
- Não altere teste existente para passar sem entender a falha.
- Dinheiro em centavos inteiros em todos os serviços. Datas em UTC no banco, fuso da clínica só na borda.
- Eventos entre serviços pelo tópico `consultto.eventos` (Redis Streams), payload versionado (`v1`, `v2`).

## Ambiente

- Ferramentas em `tools/` (`tools/README.md`), chamadas por `<workspace>/tools/<nome>`. Teste que precisa de infra real (banco, fila) roda pela ferramenta do serviço, nunca contra ambiente compartilhado.
- Falha de rede em dependência (registry privado, host interno, timeout de download): pare e devolva `bloqueado: ambiente` com o trecho do erro.
- `PAGAFACIL_SANDBOX=true` e `ZAPCONNECT_SANDBOX=true` fora de produção. `TENANT_DEBUG` nunca em commit.
- Banco local: `tools/db-local.sh up|seed|reset`. Seed cria 3 clínicas de teste.

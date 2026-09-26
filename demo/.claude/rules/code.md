---
paths:
  - "code/**"
---

# Código em code/

Cada `code/<serviço>/` é um repo git próprio (branch principal `main`).

## Serviços

| Serviço | Stack | Agent dev | Onde rodar comandos |
|---|---|---|---|
| `web` | Next.js 15, TypeScript | `dev-node` | `code/web/` |
| `api` | NestJS 11, TypeScript, Postgres 16 | `dev-node` | `code/api/` |
| `cobranca` | Python 3.12, FastAPI, Celery | `dev-python` | `code/cobranca/` |
| `mensageria` | Go 1.23 | `dev-go` | `code/mensageria/` |

## Comandos por stack

- Node (`web`, `api`): `pnpm build`, `pnpm test`, `pnpm vitest run <arquivo>`, `pnpm lint --fix`. E2E da web: `pnpm playwright test` (só no fim).
- Python (`cobranca`): `uv run pytest -q`, `uv run pytest <arquivo> -q`, `uv run ruff check --fix`, `uv run mypy src`.
- Go (`mensageria`): `go build ./...`, `go test ./...`, `go test ./<pacote> -run <Teste>`, `gofmt -w`, `go vet ./...`.

## Padrões

- `api`: módulo NestJS por domínio (`src/<dominio>/`), regra no service, controller só valida (class-validator) e delega. Migrations com Prisma.
- `web`: App Router; chamada à API só por `src/lib/api/`; componentes de UI em `src/components/ui/`.
- Dinheiro em centavos inteiros em todos os serviços. Datas em UTC no banco, fuso da clínica só na borda.
- Eventos entre serviços pelo tópico `consultto.eventos` (Redis Streams), payload versionado (`v1`, `v2`).
- Commits: Conventional Commits. Branch `feat/<id>-desc`. PR com checklist de LGPD.

## Ambiente

`PAGAFACIL_SANDBOX=true` e `ZAPCONNECT_SANDBOX=true` fora de produção. `TENANT_DEBUG` nunca em commit. Seed local: `make seed` cria 3 clínicas de teste.

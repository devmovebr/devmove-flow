## PROJETO
Consultto
## DESCRICAO
SaaS multi-tenant de agenda online e cobrança para clínicas de saúde independentes, com página pública de agendamento, lembretes por WhatsApp e assinatura mensal por plano
## RESPONSAVEL
Ana
## IDIOMA
português do Brasil
## REGRAS_FIXAS
- Toda consulta ao banco filtra por `clinica_id` (lei L1 de `produtos/multi-tenancy`).
- Node: pnpm. Python: uv. Go: módulos padrão. Nunca misturar gerenciador.
- Nunca rodar migration contra staging ou produção; só `tools/db-local.sh`.
- Dado de paciente nunca vai para log (LGPD).
## BRANCH_PRINCIPAL
main
## GIT
Branch da demanda `feat/<id>-<slug>` ou `fix/<id>-<slug>` a partir de `main`. Commit em Conventional Commits, sem atribuição. PR no GitHub com checklist de LGPD
## REPOS
web git@github.com:consultto/web.git
api git@github.com:consultto/api.git
cobranca git@github.com:consultto/cobranca.git
mensageria git@github.com:consultto/mensageria.git
## AMBIENTES_QA
`local` e `staging`. Produção nunca
## INFRA_LOCAL
`code/docker-compose.yml` (Postgres, Redis, mock do PagaFácil e da ZapConnect), `tools/db-local.sh` e os seeds em `code/api/prisma/seed/`
## MEM0
nao
## TABELA_SERVICOS
| `web` | Next.js 15, TypeScript | `allan-dev-node` | `code/web/` |
| `api` | NestJS 11, TypeScript, Postgres 16 | `allan-dev-node` | `code/api/` |
| `cobranca` | Python 3.12, FastAPI, Celery | `sam-dev-python` | `code/cobranca/` |
| `mensageria` | Go 1.23 | `greg-dev-go` | `code/mensageria/` |
## COMANDOS_POR_STACK
- Node (`web`, `api`): `pnpm build`, `pnpm test`, `pnpm vitest run <arquivo>`, `pnpm lint --fix`. E2E da web: `pnpm playwright test` (só no fim).
- Python (`cobranca`): `uv run pytest -q`, `uv run pytest <arquivo> -q`, `uv run ruff check --fix`, `uv run mypy src`.
- Go (`mensageria`): `go build ./...`, `go test ./...`, `go test ./<pacote> -run <Teste>`, `gofmt -w`, `go vet ./...`.
## PADROES
- Dinheiro em centavos inteiros em todos os serviços. Datas em UTC no banco, fuso da clínica só na borda.
- Eventos entre serviços pelo tópico `consultto.eventos` (Redis Streams), payload versionado (`v1`, `v2`).
## AMBIENTE
- `PAGAFACIL_SANDBOX=true` e `ZAPCONNECT_SANDBOX=true` fora de produção. `TENANT_DEBUG` nunca em commit.
- Banco local: `tools/db-local.sh up|seed|reset`. Seed cria 3 clínicas de teste.
## STACK node
apelido: allan
nome: TypeScript (Next.js 15 e NestJS 11)
teste_arquivo: pnpm vitest run <arquivo> 2>&1 | tail -40
antes_de_devolver: No serviço (`code/web/` ou `code/api/`): `pnpm build`, `pnpm test` (resumo via `tail`; só na última frente), `pnpm lint` e os comandos de aceite do briefing. O hook já roda `eslint --fix` a cada edição.
## STACK python
apelido: sam
nome: Python 3.12 (FastAPI, Celery)
teste_arquivo: uv run pytest <arquivo> -q 2>&1 | tail -40
antes_de_devolver: Em `code/cobranca/`: `uv run ruff check`, `uv run mypy src`, `uv run pytest -q` (só na última frente) e os comandos de aceite do briefing.
## STACK go
apelido: greg
nome: Go 1.23
teste_arquivo: go test ./<pacote> -run <Teste> 2>&1 | tail -40
antes_de_devolver: Em `code/mensageria/`: `go build ./...`, `go vet ./...`, `go test ./...` (só na última frente) e os comandos de aceite do briefing. O hook já roda `gofmt -w` a cada edição.
## SERVICO web
- Pasta: `code/web/`. Stack: Next.js 15 (App Router). Dev: `allan-dev-node`.
- Chamada à API só por `src/lib/api/`; componentes de UI em `src/components/ui/`.
- Subir local: `pnpm dev` (porta 3000), depende da `api` no ar.
## SERVICO api
- Pasta: `code/api/`. Stack: NestJS 11, Postgres 16 com RLS. Dev: `allan-dev-node`.
- Módulo por domínio (`src/<dominio>/`), regra no service, controller só valida (class-validator) e delega. Migrations com Prisma.
- Subir local: `tools/db-local.sh up` e `pnpm start:dev` (porta 4000), health em `/health`.
- Armadilha: job agendado não tem contexto de tenant; abrir com `withTenant(clinicaId)`.
## SERVICO cobranca
- Pasta: `code/cobranca/`. Stack: Python 3.12, FastAPI, Celery. Dev: `sam-dev-python`.
- Integração com o PagaFácil: contrato em `doc/integracoes/pagafacil/referencia/`.
- Subir local: `uv run uvicorn app.main:app --port 4100` e `uv run celery -A app.worker worker`.
## SERVICO mensageria
- Pasta: `code/mensageria/`. Stack: Go 1.23. Dev: `greg-dev-go`.
- Integração com a ZapConnect: template de mensagem precisa de aprovação prévia do provedor.
- Subir local: `go run ./cmd/mensageria` com `ZAPCONNECT_SANDBOX=true`.
## HOOK
*/code/web/*.ts|svc="${f%%/src/*}"; [ -x "$svc/node_modules/.bin/eslint" ] && "$svc/node_modules/.bin/eslint" --fix "$f"
*/code/web/*.tsx|svc="${f%%/src/*}"; [ -x "$svc/node_modules/.bin/eslint" ] && "$svc/node_modules/.bin/eslint" --fix "$f"
*/code/api/*.ts|svc="${f%%/src/*}"; [ -x "$svc/node_modules/.bin/eslint" ] && "$svc/node_modules/.bin/eslint" --fix "$f"
*/code/mensageria/*.go|gofmt -w "$f"

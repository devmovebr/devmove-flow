## PROJETO
Estoca
## DESCRICAO
SaaS de controle de estoque para pequenos varejistas, com leitura de código de barras pelo celular e alerta de reposição
## RESPONSAVEL
Carla
## IDIOMA
português do Brasil
## REGRAS_FIXAS
- Node: pnpm. Python: uv.
- Nunca commitar `.env`.
- Quantidade de estoque nunca fica negativa no banco.
## BRANCH_PRINCIPAL
main
## GIT
Branch da demanda `feat/<slug>` ou `fix/<slug>` a partir de `main`. Commit em Conventional Commits, assunto até 72 caracteres, sem atribuição.
## REPOS
app git@github.com:estoca/app.git
api git@github.com:estoca/api.git
## AMBIENTES_QA
`local` e `staging`. Produção nunca
## INFRA_LOCAL
`code/api/docker-compose.yml` e os scripts de seed em `code/api/scripts/seed/`.
## MEM0
nao
## TABELA_SERVICOS
| `app` | React Native (Expo), TypeScript | `rafa-dev-rn` | `code/app/` |
| `api` | Python 3.12, FastAPI, Postgres | `sam-dev-python` | `code/api/` |
## COMANDOS_POR_STACK
- rn (`app`): `pnpm test`, `pnpm jest <arquivo>`, `pnpm lint --fix`, `pnpm tsc --noEmit`.
- python (`api`): `uv run pytest -q`, `uv run pytest <arquivo> -q`, `uv run ruff check --fix`, `uv run mypy src`.
## PADROES
- api: um módulo por domínio em `src/<dominio>/`; regra no service; testes em `tests/`.
- app: telas em `app/`, chamadas à api só por `src/api/`.
- Commits: Conventional Commits.
## AMBIENTE
- A definir na demanda de esqueleto
## STACK rn
apelido: rafa
nome: TypeScript (React Native com Expo)
teste_arquivo: pnpm jest <arquivo> --silent 2>&1 | tail -40
antes_de_devolver: Em `code/app/`: `pnpm tsc --noEmit`, `pnpm test` (resumo via `tail`), teste do pre-commit se existir, e os comandos de aceite do briefing.
## STACK python
apelido: sam
nome: Python 3.12 (FastAPI)
teste_arquivo: uv run pytest <arquivo> -q 2>&1 | tail -40
antes_de_devolver: Em `code/api/`: `uv run ruff check`, `uv run mypy src`, `uv run pytest -q` e os comandos de aceite do briefing.
## SERVICO app
- Pasta: `code/app/`. Stack: rn. Dev: `rafa-dev-rn`.
- Comandos: `pnpm test`, `pnpm jest <arquivo>`, `pnpm lint --fix`, `pnpm tsc --noEmit`.
- Armadilhas: a definir na demanda de esqueleto.
## SERVICO api
- Pasta: `code/api/`. Stack: python. Dev: `sam-dev-python`.
- Comandos: `uv run pytest -q`, `uv run pytest <arquivo> -q`, `uv run ruff check --fix`, `uv run mypy src`.
- Subir local: `docker compose up -d` em `code/api/`, health em `http://localhost:8000/health`.
- Armadilhas: quantidade de estoque nunca negativa (constraint no banco).
## HOOK
# Só inclua linha de hook para formatador que já existe no repositório. Formato: padrão|comando
# */code/api/*.py|cd "${f%%/src/*}" && uv run ruff format "$f"

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
## TABELA_SERVICOS
| `app` | React Native (Expo), TypeScript | `dev-rn` | `code/app/` |
| `api` | Python 3.12, FastAPI, Postgres | `dev-python` | `code/api/` |
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
nome: TypeScript (React Native com Expo)
teste_arquivo: pnpm jest <arquivo> --silent 2>&1 | tail -40
antes_de_devolver: Em `code/app/`: `pnpm tsc --noEmit`, `pnpm test` (resumo via `tail`), teste do pre-commit se existir, e os comandos de aceite do briefing.
## STACK python
nome: Python 3.12 (FastAPI)
teste_arquivo: uv run pytest <arquivo> -q 2>&1 | tail -40
antes_de_devolver: Em `code/api/`: `uv run ruff check`, `uv run mypy src`, `uv run pytest -q` e os comandos de aceite do briefing.
## HOOK
# Só inclua linha de hook para formatador que já existe no repositório. Formato: padrão|comando
# */code/api/*.py|cd "${f%%/src/*}" && uv run ruff format "$f"

# Fatos: arquitetura

- Ambientes: `local` (máquina, `tools/db-local.sh`), `staging` (`https://api.staging.consultto.app`), produção. QA só em local e staging. *Ana, 2026-09-14, verificado 2026-09-14*
- Autenticação: JWT emitido pela `api` em `/auth/token`; tenant no cabeçalho `X-Clinica`. *consultor-code, 2026-08-04, verificado 2026-09-14*
- Erro de negócio: corpo `{"codigo": "<CONSTANTE>", "mensagem": "..."}` com 4xx. *consultor-code, 2026-09-01, verificado 2026-09-14*

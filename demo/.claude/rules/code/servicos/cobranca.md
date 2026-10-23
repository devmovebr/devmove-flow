---
paths:
  - "code/cobranca/**"
---

# Serviço cobranca

- Pasta: `code/cobranca/`. Stack: Python 3.12, FastAPI, Celery. Dev: `sam-dev-python`.
- Integração com o PagaFácil: contrato em `doc/integracoes/pagafacil/referencia/`.
- Subir local: `uv run uvicorn app.main:app --port 4100` e `uv run celery -A app.worker worker`.

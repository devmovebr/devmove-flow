# tools/

Scripts que operam o código e o ambiente do workspace: clonar repositórios, subir serviço, banco local, credencial de teste. Um arquivo por ferramenta. Regras em `.claude/fluxo.md`, seção Ferramentas.

- Cabeçalho com uso, entrada validada, saída curta.
- Agent chama por `<workspace>/tools/<nome>` (diretório de trabalho inicial da sessão), liberado no `allow` do `.claude/settings.json` por padrão (`*/tools/*.sh*`), sem caminho fixo de máquina.
- Credencial, chave e cache em `tools/.local/` (fora do git). Artefato grava só a variável.
- Ferramenta nova entra nesta tabela e no `allow` no mesmo turno.

| Ferramenta | Uso | Quem chama |
|---|---|---|
| `clonar-repos.sh` | `tools/clonar-repos.sh`: clona ou atualiza os repositórios de `repos.txt` em `code/` | setup, pessoa |
| `consumo.py` | `python3 tools/consumo.py <dossiê>`: soma tokens e chamadas do dossiê a partir dos transcripts do Claude Code e grava `<dossiê>/consumo.json` | `/fechar` |

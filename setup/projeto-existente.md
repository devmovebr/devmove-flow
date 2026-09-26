# Assistente: aplicar em projeto existente

Uso: abra o Claude Code na pasta que vai ser o workspace (onde os repositórios foram clonados, soltos ou já em `code/`) e peça "Siga `<devmove-flow>/setup/projeto-existente.md`".

Leia antes `<devmove-flow>/setup/comum.md`.

## Fase 1: inventário (sem perguntar nada ainda)

- Liste as pastas com `.git` até 2 níveis. Cada uma é um serviço candidato.
- Para cada repo: nome, remote, branch principal, stack (pelo manifesto: `package.json`, `pom.xml`, `pyproject.toml`, `go.mod`, `*.csproj` etc.), comandos declarados (scripts do manifesto, Makefile), formatador e testes existentes.
- Documentação que já existe: `README`, `docs/`, `CLAUDE.md`, `AGENTS.md`, `.claude/` de cada repo.
- Tudo isso por spawns `Explore` em paralelo, um por repo, cada um devolvendo até 20 linhas. Nenhum lê código de negócio nesta fase.

Gate: tabela repo · stack · comandos · documentação encontrada, e a proposta de organização.

## Fase 2: organizar o workspace

- Repositórios vão para `code/<serviço>/` (mover pasta, sem mexer no git de cada um).
- `doc/` na raiz. Documentação solta que já existia (fora dos repos) vai para `doc/` na área certa ou para `doc/demandas/<data>-legado/bruto/`, sem reescrever.
- Harness que já existe em algum repo ou subpasta (`.claude/`, `CLAUDE.md`): não apague. Liste para o merge da Fase 4.
- `git init -b <branch principal>` na raiz se ainda não houver (antes, `git rev-parse --show-toplevel` para não aninhar em outro repo), com `code/*/` e `.env*` no `.gitignore`.

Gate: árvore antes e depois. Só move depois do "aprovar".

## Fase 3: entender o projeto

- Um spawn `Explore` por serviço, em paralelo, com esta tarefa: devolver até 25 linhas com o que o serviço faz, entradas (endpoints, filas, jobs), saídas e integrações, onde fica cada camada (arquivo e símbolo) e armadilhas visíveis (config obrigatória, TODO crítico). Escopo: README, manifesto, pasta de rotas ou handlers, config. Orçamento de 25 chamadas.
- Com os retornos, um lote de perguntas ao usuário só sobre o que o código não responde: nome e descrição do produto, quem aprova, idioma, regras fixas, o que está em produção.

Gate: descrição do produto, uma linha por serviço, lacunas.

## Fase 4: instalar e adaptar

Passos de `comum.md`, com duas diferenças:
- `mapa.md` de cada serviço nasce do retorno da Fase 3, só com o que o `Explore` viu, com data e origem `setup`.
- Merge do harness antigo: regra do projeto que não conflita entra em `.claude/rules/code.md` ou no `CLAUDE.md`; agent antigo com papel coberto pelo framework é substituído (o prompt dele é lido e o que for específico vai para o agent novo); agent com papel que o framework não tem fica, e é listado na entrega.

Gate final e entrega (`comum.md`). Sugira uma primeira demanda pequena (porte P) para calibrar a retro.

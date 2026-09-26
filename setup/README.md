# setup

Assistentes que aplicam o DevMove Flow adaptado a um projeto. Cada um é um roteiro para o Claude Code seguir, aberto na pasta do workspace alvo.

| Arquivo | Cenário | O que faz |
|---|---|---|
| `novo-projeto.md` | projeto do zero | até 3 rodadas de perguntas, cria workspace, instala e adapta |
| `projeto-existente.md` | repos já clonados | inventário, organiza em `code/` e `doc/`, entende cada serviço, instala e adapta com merge do harness antigo |
| `atualizar.md` | workspace já no framework | detecta a versão, aplica só as Novidades que faltam, preserva o que a retro calibrou |
| `comum.md` | todos | regras do assistente, instalação, verificação, entrega |
| `lib/instalar.sh` | todos | copia `framework/` sem sobrescrever e marca versão e data; com `--valores`, também preenche tudo |
| `lib/aplicar_valores.py` | todos | chamado pelo `instalar.sh --valores`: marcadores, um `dev-<stack>` por stack, hooks |
| `lib/valores-exemplo.md` | todos | modelo do arquivo de valores que o assistente escreve |
| `lib/marcadores.md` | todos | o que preencher em cada `{{...}}` |

Pedido típico: "Siga `/caminho/devmove-flow/setup/projeto-existente.md`".

Todo assistente trabalha por gates (`Aprovar e seguir` ou `Reprovar e pedir ajuste`), pergunta em lote e não faz commit.

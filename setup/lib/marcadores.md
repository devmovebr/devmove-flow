# Marcadores do framework

Todo `{{...}}` que sobrar depois da instalação é preenchido pelo assistente. Nenhum pode ficar no workspace final (a última linha do `instalar.sh --valores` diz `sobrou nada`).

Preenchidos pelo `instalar.sh` na cópia: `{{VERSAO}}` e `{{DATA}}`. Caminho de máquina nunca entra no harness: ferramentas são chamadas por `<workspace>/tools/<nome>` e liberadas por padrão (`*/tools/*.sh*`), porque o mesmo workspace roda em mais de uma máquina.

| Marcador | Onde | O que vai |
|---|---|---|
| `{{PROJETO}}` | CLAUDE.md, rules/conhecimento.md, doc/INDEX.md | nome curto do projeto ou produto |
| `{{DESCRICAO}}` | CLAUDE.md, rules/conhecimento.md | uma frase: o que é, para quem, com quais parceiros |
| `{{RESPONSAVEL}}` | CLAUDE.md, skills, fluxo.md, rules | nome de quem aprova os gates |
| `{{IDIOMA}}` | rules/conhecimento.md | idioma dos documentos |
| `{{REGRAS_FIXAS}}` | CLAUDE.md | 2 a 5 regras do projeto (gerenciador de pacote, ferramenta obrigatória, o que nunca fazer) |
| `{{BRANCH_PRINCIPAL}}` | rules/code.md | branch principal dos repos |
| `{{GIT}}` | rules/code.md | uma frase: branch base da demanda, nome da branch, convenção de commit, provedor de PR |
| `{{TABELA_SERVICOS}}` | rules/code.md | uma linha por serviço: `\| nome \| stack \| <apelido>-dev-<stack> \| pasta dos comandos \|` |
| `{{COMANDOS_POR_STACK}}` | rules/code.md | build, teste, teste de um arquivo, lint, por stack |
| `{{PADROES}}` | rules/code.md | lista: formatação, libs fixas, onde ficam testes, padrão de arquitetura |
| `{{AMBIENTE}}` | rules/code.md | lista: variáveis e armadilhas de ambiente que o dev precisa saber |
| `{{AMBIENTES_QA}}` | skills/qa | ambientes onde o `/qa` pode rodar (ex.: `local` e `staging`; produção nunca) |
| `{{INFRA_LOCAL}}` | agents/igor-infra-local.md | o que o agent de infra pode tocar: compose, inits, stubs, perfil local |
| `{{REPOS}}` | tools/repos.txt | uma linha por repositório: `<pasta em code/> <url git>` |
| `{{STACK_ID}}`, `{{STACK_NOME}}`, `{{STACK_APELIDO}}` | agents/dev.md | ex.: `node`, `TypeScript (Node 22, Fastify)`, `allan`. Um dev por runtime ou framework com comandos ou padrões próprios: api Fastify e web Next.js viram `allan-dev-node` e `nora-dev-next` se os comandos ou convenções diferirem; se forem iguais, um agent só. Vão no arquivo de valores como `## STACK <id>`; sem `apelido`, o script usa o padrão da stack |
| `{{CMD_TESTE_ARQUIVO}}` | agents/dev.md | comando para rodar um arquivo de teste com saída curta |
| `{{CMD_ANTES_DE_DEVOLVER}}` | agents/dev.md | build, suíte (só na última frente), teste do pre-commit se existir, e aceite, com a pasta onde rodar |
| `{{SERVICO}}`, `{{SERVICO_CONTEUDO}}` | rules/code/servicos/servico.md | um `## SERVICO <nome>` por serviço: pasta, stack, dev, comandos próprios, como subir local e health, armadilhas |

Sem informação para um marcador (projeto novo sem código): use "A definir na demanda de esqueleto." em vez de deixar vazio.

`## MEM0` com `nao` remove a skill `mem0` (só fica em workspace com o MCP do Mem0).

Hooks (em `.claude/settings.json`, via `## HOOK` no arquivo de valores): lint após `Write|Edit` por padrão de caminho, nunca por nome de serviço, saindo quieto quando a ferramenta não está instalada. Não inventar hook sem ferramenta confirmada no repo.

Apelidos de agent: fixos no framework (`caio-consultor-code`, `theo-arquiteto`, `vera-revisor`, `rita-revisor-code`, `iris-arquivista`, `nina-qa`, `paul-revisor-pr`, `igor-infra-local`). Devs por stack: `allan` node, `nora` next, `sam` python, `greg` go, `jack` java, `dora` devops, `rafa` rn, `dani` dotnet; outras stacks pegam um nome livre da reserva do script.

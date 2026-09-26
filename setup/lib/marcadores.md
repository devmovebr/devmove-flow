# Marcadores do framework

Todo `{{...}}` que sobrar depois da instalação é preenchido pelo assistente. Nenhum pode ficar no workspace final (`grep -rn "{{" CLAUDE.md .claude doc` sem resultado).

| Marcador | Onde | O que vai |
|---|---|---|
| `{{PROJETO}}` | CLAUDE.md, rules/conhecimento.md, doc/INDEX.md | nome curto do projeto ou produto |
| `{{DESCRICAO}}` | CLAUDE.md, rules/conhecimento.md | uma frase: o que é, para quem, com quais parceiros |
| `{{RESPONSAVEL}}` | CLAUDE.md, skills, fluxo.md, rules | nome de quem aprova os gates |
| `{{IDIOMA}}` | rules/conhecimento.md | idioma dos documentos |
| `{{REGRAS_FIXAS}}` | CLAUDE.md | 2 a 5 regras do projeto (gerenciador de pacote, ferramenta obrigatória, o que nunca fazer) |
| `{{BRANCH_PRINCIPAL}}` | rules/code.md | branch principal dos repos |
| `{{TABELA_SERVICOS}}` | rules/code.md | uma linha por serviço: `\| nome \| stack \| dev-<stack> \| pasta dos comandos \|` |
| `{{COMANDOS_POR_STACK}}` | rules/code.md | build, teste, teste de um arquivo, lint, por stack |
| `{{PADROES}}` | rules/code.md | formatação, libs fixas, onde ficam testes, convenção de commit e branch |
| `{{AMBIENTE}}` | rules/code.md | variáveis e armadilhas de ambiente que o dev precisa saber |
| `{{STACK_ID}}`, `{{STACK_NOME}}` | agents/dev.md | ex.: `node` e `TypeScript (Node 22, Fastify)`. Um `dev-<stack>.md` por runtime ou framework com comandos ou padrões próprios: api Fastify e web Next.js, mesmo ambos em TypeScript, viram `dev-node` e `dev-next` se os comandos ou convenções diferirem; se forem iguais, um agent só. Vão no arquivo de valores como `## STACK <id>` |
| `{{CMD_TESTE_ARQUIVO}}` | agents/dev.md | comando para rodar um arquivo de teste com saída curta |
| `{{CMD_ANTES_DE_DEVOLVER}}` | agents/dev.md | build, suíte, teste do pre-commit se existir, e aceite, com a pasta onde rodar |

Sem informação para um marcador (projeto novo sem código): use "A definir na demanda de esqueleto." em vez de deixar vazio.

Hooks (em `.claude/settings.json`, via `## HOOK` no arquivo de valores): lint após `Write|Edit` para cada stack, se a stack tiver formatador. Não inventar hook sem ferramenta confirmada no repo.

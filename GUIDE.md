# Guia de uso do DevMove Flow

Este guia mostra, passo a passo, como instalar o framework num projeto e como usá-lo depois. Para entender o que o framework é, leia o `README.md`. Para ver um projeto já instalado, abra o `demo/`.

## Antes de começar

- Claude Code 2.1.246 ou mais novo (`claude --version`). Versões antigas ignoram o `maxTurns` dos agents.
- `git` e `bash`.
- Este repositório num lugar fixo da sua máquina. Nos exemplos: `~/DevMove/devmove-flow`.

## As três peças

| Peça | O que é | Você mexe nela? |
|---|---|---|
| `framework/` | o harness genérico, com marcadores como `{{PROJETO}}` no lugar do que é de cada projeto | só quando for evoluir o framework |
| `setup/lib/instalar.sh` | script que copia o `framework/` para um workspace, sem sobrescrever nada | não; o assistente roda por você |
| `setup/*.md` | roteiros que o Claude Code segue para instalar e adaptar | não; você só pede para o Claude seguir |

Os assistentes não são comandos. São arquivos de instrução: você abre o Claude Code na pasta do projeto e pede para ele seguir um deles. Ele conversa com você, roda o script, preenche os marcadores e adapta tudo ao projeto.

## Onde ficam as skills e os agents

Tudo mora em `framework/.claude/`:

```
framework/
  CLAUDE.md                  papel do orquestrador (com marcadores)
  .claude/
    fluxo.md                 regras do fluxo, lidas só pelo orquestrador
    retro.md                 retro vazia
    settings.json            modelo do orquestrador, permissões base, sem hooks
    rules/                   principios, escopo, comunicacao, conhecimento, code
      code/servicos/         modelo de rule por serviço
    agents/                  caio-consultor-code, theo-arquiteto, vera-revisor, rita-revisor-code,
                             iris-arquivista, nina-qa, paul-revisor-pr, igor-infra-local, dev (modelo)
    skills/                  demanda, retomar, negocio, tecnico, plano, executar, fechar,
                             qa, revisar-pr, infra, brief, faq, processo, entregavel, ingerir,
                             mem0, novo-agent
  doc/                       esqueleto de conhecimento com INDEX em cada pasta
    demandas/                feature, bug, debito-tecnico, qa
  tools/                     README, clonar-repos.sh, repos.txt, .local/ (fora do git)
  code/                      README
  .gitignore
```

Na instalação, o assistente monta o harness do projeto assim:

| Passo | O que acontece | Quem faz |
|---|---|---|
| 1 | escreve `devmove-valores.md` na raiz do workspace com tudo o que levantou na conversa ou no código | assistente |
| 2 | copia `framework/` inteiro para a raiz do workspace: `framework/.claude/skills/demanda/` vira `<workspace>/.claude/skills/demanda/`, e assim por diante | `instalar.sh` |
| 3 | preenche os marcadores (`{{PROJETO}}`, `{{RESPONSAVEL}}`, comandos, padrões) com os valores | `instalar.sh --valores` |
| 4 | transforma o modelo `agents/dev.md` em um agent por stack (`allan-dev-node.md`, `sam-dev-python.md`, `greg-dev-go.md`), gera uma rule por serviço em `rules/code/servicos/`, apaga os modelos e cria o hook de lint de cada stack | `instalar.sh --valores` |
| 5 | cria `doc/servicos/<serviço>/` com INDEX e mapa de cada serviço, e junta harness antigo se houver | assistente |

O preenchimento de `.claude/` fica com o script porque o Claude Code pede aprovação para cada edição do modelo dentro de `.claude/`.

As skills e os agents do framework são os mesmos em todo projeto. O que muda é o que o passo 2 preenche e os agents dev do passo 3. Quando você reabre o Claude Code no workspace, ele carrega `.claude/skills/` e `.claude/agents/`, e `/demanda` passa a existir.

Para ver o resultado de uma instalação, compare `framework/.claude/` com `demo/.claude/`. No demo, o `dev.md` virou `allan-dev-node.md`, `sam-dev-python.md` e `greg-dev-go.md`, e os marcadores viraram Consultto, Ana, pnpm, uv etc.

## Qual assistente usar

| Situação | Assistente |
|---|---|
| Projeto novo, ainda sem código | `setup/novo-projeto.md` |
| Já tenho repositórios (cliente novo, projeto antigo) | `setup/projeto-existente.md` |
| O projeto já usa o DevMove Flow e saiu versão nova | `setup/atualizar.md` |

## Cenário 1: projeto do zero

1. Crie a pasta do workspace e abra o Claude Code nela:
   ```bash
   mkdir ~/Workspace/meu-saas && cd ~/Workspace/meu-saas
   claude
   ```
2. Peça:
   ```
   Siga ~/DevMove/devmove-flow/setup/novo-projeto.md
   ```
3. Responda às perguntas. São no máximo três rodadas, sempre com opções para escolher:
   - o produto: nome, para quem é, parceiros, quem aprova, idioma;
   - a técnica: serviços, stack de cada um, repositórios, regras fixas;
   - o que ainda faltar.
4. Aprove cada gate. Ao fim de cada fase aparecem duas opções: `Aprovar e seguir` ou `Reprovar e pedir ajuste`. Para ajustar, escreva o que quer mudar.
5. Ao final, ele entrega um resumo com o que foi criado. Feche e abra o Claude Code de novo para carregar o harness.
6. Primeira demanda:
   ```
   /demanda criar o esqueleto do serviço api com health check
   ```

Resultado: `code/<serviço>/` com `git init`, `doc/` com a estrutura de conhecimento, `tools/` e `.claude/` adaptado, com um dev para cada stack.

## Cenário 2: projeto existente

1. Clone os repositórios numa pasta. Podem ficar soltos ou já dentro de `code/`:
   ```bash
   mkdir ~/Workspace/cliente-x && cd ~/Workspace/cliente-x
   git clone <repo-api> && git clone <repo-web>
   claude
   ```
2. Peça:
   ```
   Siga ~/DevMove/devmove-flow/setup/projeto-existente.md
   ```
3. O que acontece, fase por fase:

| Fase | O assistente faz | Você faz |
|---|---|---|
| 1. Inventário | acha os repositórios, a stack e os comandos de cada um, e a documentação existente, sem ler código de negócio | aprova a tabela |
| 2. Organização | propõe mover os repos para `code/`, criar `doc/` e o `.gitignore` | aprova antes de qualquer arquivo ser movido |
| 3. Entendimento | uma busca por serviço, em paralelo, para descobrir o que ele faz, entradas, saídas e onde fica cada camada | responde só o que o código não mostra |
| 4. Instalação | instala, preenche os marcadores, cria os mapas dos serviços e junta o harness antigo | decide os conflitos, se houver |

4. Reinicie o Claude Code. Comece com uma demanda pequena (porte P), para a primeira retro calibrar os números.

Harness antigo (`.claude/`, `CLAUDE.md` ou `AGENTS.md` em algum repo) não é apagado. Regra que não conflita entra no harness novo. O que conflita aparece para você decidir, com as duas versões lado a lado.

## Cenário 3: atualizar

1. Abra o Claude Code na raiz do workspace que já usa o framework.
2. Peça:
   ```
   Siga ~/DevMove/devmove-flow/setup/atualizar.md
   ```
3. Ele lê a versão instalada (primeira linha do `.claude/fluxo.md`), compara com `VERSION` e lista o que falta, a partir do `CHANGELOG.md`. Cada item aparece como `presente`, `falta` ou `conflito`.
4. Aprove a lista. Em cada conflito, escolha entre a regra do projeto e a do framework.
5. Ele aplica só o que falta, com edição pontual. Nomes, números calibrados pela retro e regras locais são preservados.

Instalação antiga, feita com o prompt de refatoração que existia antes do framework (marca `Versão do harness: N`), também é reconhecida.

## O script instalar.sh

Você normalmente não roda o script: o assistente roda. Se quiser ver o que ele faz:

```bash
~/DevMove/devmove-flow/setup/lib/instalar.sh ~/Workspace/meu-saas
```

Saída:

```
copiado CLAUDE.md
copiado .claude/fluxo.md
existe  .claude/settings.json
...
```

- `copiado`: o arquivo não existia e foi copiado. A versão e a data já saem preenchidas; os outros marcadores `{{...}}` ficam.
- `existe`: o arquivo já existia e **não foi tocado**. O assistente faz a junção depois.

Com um arquivo de valores (modelo em `setup/lib/valores-exemplo.md`), o script faz tudo de uma vez:

```bash
~/DevMove/devmove-flow/setup/lib/instalar.sh ~/Workspace/meu-saas --valores ~/Workspace/meu-saas/devmove-valores.md
```

Saída extra: `preenchido <arquivo>`, `agent .claude/agents/<apelido>-dev-<stack>.md`, `rule .claude/rules/code/servicos/<serviço>.md`, `hook .claude/settings.json` e, por último, `sobrou nada` (ou os marcadores que faltaram no arquivo de valores). Dá para rodar de novo depois de completar o arquivo; o que já foi copiado é mantido.

## Depois de instalado: o dia a dia

| Você quer | Digite |
|---|---|
| começar uma feature, bug ou débito | `/demanda <relato em texto livre>` |
| continuar uma demanda, ou priorizar um débito do backlog | `/retomar <pasta-do-dossiê>` |
| testar uma entrega num ambiente | `/qa <entrega> [ambiente]` |
| revisar o PR de um colega | `/revisar-pr <link>` |
| subir ou consertar a infra local de um serviço | `/infra <serviço>` |
| guardar material novo numa demanda ou na base | `/ingerir <caminho>` |
| ver o estado geral | `/brief` |
| registrar uma dúvida e a resposta | `/faq <pergunta>` |
| documentar um processo do time | `/processo <narrativa>` |
| gerar documento para alguém de fora | `/entregavel <módulo> para <audiência>` |

O que esperar de uma demanda:
1. O orquestrador decide o tipo (feature, bug, débito) e o porte (P, M ou G) e pergunta se concorda.
2. Cada etapa termina num gate: você aprova ou pede ajuste.
3. Na execução, o orquestrador cria a branch, os devs trabalham um por serviço e a revisora de código manda corrigir o que ficou errado sem te perguntar. Depois do seu gate, o orquestrador commita.
4. No fechamento, o que ficou fora de escopo vira débito ou bug no backlog (você decide), o conhecimento vai para `doc/` e uma linha entra em `.claude/retro.md`, com tempo, tokens e o ajuste proposto ao harness.

Onde olhar:
- estado de uma demanda: `doc/demandas/<tipo>/<dossiê>/CHANGELOG.md`;
- backlog de débito e bug: `doc/demandas/debito-tecnico/INDEX.md` e `doc/demandas/bug/INDEX.md`;
- consumo de cada agent: o Registro do mesmo arquivo;
- tendência de custo: `.claude/retro.md`.

Quando a sessão chega a 45% do contexto, o orquestrador pede `/clear` e `/retomar`. O CHANGELOG garante que nada se perde.

## Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `/demanda` não aparece | sessão aberta antes da instalação | feche e abra o Claude Code |
| sobrou `{{...}}` | assistente interrompido | peça para retomar a Fase de instalação do assistente |
| dev para cedo com `parcial` | frente grande demais para o porte | aprove a continuação no gate ou divida a frente no plano |
| custo alto numa demanda | muitos spawns ou releitura | veja o Registro do CHANGELOG; a retro propõe o ajuste |
| agent lendo o que não devia | briefing sem caminhos exatos | reporte na retro; o ajuste vai para o harness |

## Evoluir o framework

Resumo, com o detalhe no `README.md`:
1. Mude `framework/`.
2. Suba o `VERSION`.
3. Registre as novidades no `CHANGELOG.md`.
4. Rode `setup/atualizar.md` no `demo/`.
5. Faça commit com a tag.

Os projetos se atualizam com o cenário 3.

# DevMove Flow

Framework de harness para Claude Code que leva uma demanda do relato ao código com um orquestrador e agents por papel, gastando o mínimo de tempo e de tokens.

Versão: ver `VERSION`. Histórico: `CHANGELOG.md`. Como usar: `GUIDE.md`.

## Princípios

1. Escopo fechado.
2. Rodada tem fim.
3. Mais rápido que à mão.
4. Mais barato que uma pessoa.

Planejamento aponta o caminho; quem percorre é o dev.

## Como funciona

Workspace com duas pastas e o harness na raiz:

```
<workspace>/
  CLAUDE.md          papel do orquestrador
  .claude/           fluxo.md, rules, agents, skills, retro.md
  code/<serviço>/    um repositório git por serviço
  doc/               conhecimento (servicos, produtos, integracoes, arquitetura) e demandas por tipo
  tools/             scripts que operam o código e o ambiente
```

Demanda tem tipo, e cada tipo tem pasta em `doc/demandas/`: `feature` (inclui melhoria e épico), `bug`, `debito-tecnico` (nasce em backlog) e `qa` (teste de entrega integrada).

O usuário digita só `/demanda <relato>`. O orquestrador decide tipo e porte e conduz as etapas, com um gate de aprovação no fim de cada uma:

| Porte | Quando | Etapas |
|---|---|---|
| P | rename, bug com causa conhecida, débito autoexplicativo | plano curto → executar → fechar |
| M | regra clara, 1 ou 2 serviços | plano → executar → fechar |
| G | regra ambígua, vários serviços, contrato novo | negocio → tecnico → plano → executar → fechar |

Papéis, com apelido no nome do agent: `caio-consultor-code` (fatos do código), `theo-arquiteto` (técnico, plano, testes), `vera-revisor` (plano), `<apelido>-dev-<stack>` (implementa), `rita-revisor-code` (árbitro do diff), `iris-arquivista` (conhecimento e mapas), `nina-qa` (teste em ambiente), `paul-revisor-pr` (PR de par), `igor-infra-local` (infra na máquina). Opus em quem julga e orquestra, Sonnet em quem implementa e lê.

Fora do fluxo de demanda: `/qa`, `/revisar-pr`, `/infra`.

Mecanismos que seguram custo e prazo:
- teto de linhas por documento;
- teto de rodadas com fallback;
- agents vivos por papel;
- orçamento de contexto com passagem de bastão;
- mapas de código compartilhados;
- CHANGELOG por demanda e retro por demanda;
- retorno de agent gravado em disco;
- ferramentas em `tools/` como único caminho até recurso sensível.

Regras completas: `framework/.claude/fluxo.md`.

## Estrutura deste repositório

| Pasta | O quê |
|---|---|
| `framework/` | o harness genérico, com marcadores `{{...}}`. É o que os assistentes instalam |
| `setup/` | assistentes de implantação e o script de instalação |
| `framework-ui/` | painel visual do harness (módulo Testes), em Docker |
| `tools/` | o que mantém o framework: `instancias.txt`, coleta das cópias, checagem de vazamento, registro das melhorias |
| `.claude/skills/melhoria/` | o `/melhoria` |
| `demo/` | workspace fictício (Consultto, SaaS de agenda para clínicas) com o framework instalado e o histórico de demandas de cada tipo |

## Implantar

Abra o Claude Code na pasta do workspace alvo e peça para seguir um assistente:

| Cenário | Assistente |
|---|---|
| projeto do zero | `setup/novo-projeto.md` |
| projeto existente (repos já clonados) | `setup/projeto-existente.md` |
| migrar de major ou ligar a atualização automática num workspace antigo | `setup/atualizar.md` |

Versão minor e patch chegam sozinhas: o `/demanda` de cada workspace puxa a última tag e faz merge de 3 vias com o que é local.

Os três terminam com o harness adaptado ao projeto: nomes, stacks, comandos e regras fixas. Detalhes em `setup/README.md`.

## Evoluir o framework

O framework evolui pelas retros das cópias.

1. Na cópia, todo ajuste de harness aprovado no `/fechar` vira um commit próprio, separado do commit da demanda: `chore(harness): [framework] <assunto>` quando vale para qualquer projeto, `[local]` quando não.
2. Aqui, `/melhoria` (rotina semanal) lê as cópias de `tools/instancias.txt` desde a última leitura, absorve em `framework/` os commits `[framework]` na forma genérica, sobe a versão, atualiza o `demo/`, passa o `tools/vazamento.py` (termos proibidos tirados do `devmove-valores.md` de cada cópia, que a cópia mantém vivo pelo `/fechar`) e publica commit e tag `v<versão>`. O registro de cada commit lido fica em `tools/melhorias.md`.
3. Cada cópia recebe a versão no próximo `/demanda`.

Versão: major muda estrutura e pede Migração no `CHANGELOG.md` (assistida, `setup/atualizar.md`); minor acrescenta regra, skill, agent ou tool; patch corrige texto.

Mudança feita direto aqui segue os mesmos passos à mão: `framework/`, `VERSION`, `CHANGELOG.md`, `python3 framework/tools/atualizar_framework.py --fonte . --workspace demo`, `tools/vazamento.py`, commit e tag.

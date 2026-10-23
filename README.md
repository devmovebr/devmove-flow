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
| `demo/` | workspace fictício (Consultto, SaaS de agenda para clínicas) com o framework instalado e o histórico de demandas de cada tipo |

## Implantar

Abra o Claude Code na pasta do workspace alvo e peça para seguir um assistente:

| Cenário | Assistente |
|---|---|
| projeto do zero | `setup/novo-projeto.md` |
| projeto existente (repos já clonados) | `setup/projeto-existente.md` |
| atualizar um workspace que já usa o framework | `setup/atualizar.md` |

Os três terminam com o harness adaptado ao projeto: nomes, stacks, comandos e regras fixas. Detalhes em `setup/README.md`.

## Evoluir o framework

1. Mude os arquivos em `framework/`. Ajuste que nasceu da retro de um projeto entra aqui quando vale para qualquer projeto.
2. Suba `VERSION`: major muda estrutura, minor acrescenta regra compatível, patch corrige texto.
3. Registre no `CHANGELOG.md` as Novidades da versão como itens verificáveis. Em versão major, inclua também a Migração. É dessa lista que o `setup/atualizar.md` sai.
4. Rode `setup/atualizar.md` no `demo/` para ele refletir a versão nova.
5. Commit e tag `v<versão>`.

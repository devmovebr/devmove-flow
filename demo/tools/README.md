# tools/

Scripts que operam o código e o ambiente do workspace: clonar repositórios, subir serviço, banco local, credencial de teste. Um arquivo por ferramenta. Regras em `.claude/fluxo.md`, seção Ferramentas.

- Cabeçalho com uso, entrada validada, saída curta.
- Agent chama por `<workspace>/tools/<nome>` (diretório de trabalho inicial da sessão), liberado no `allow` do `.claude/settings.json` por padrão (`*/tools/*.sh*`), sem caminho fixo de máquina.
- Credencial, chave e cache em `tools/.local/` (fora do git). Artefato grava só a variável.
- Ferramenta nova entra nesta tabela e no `allow` no mesmo turno.

| Ferramenta | Uso | Quem chama |
|---|---|---|
| `clonar-repos.sh` | `tools/clonar-repos.sh`: clona ou atualiza os repositórios de `repos.txt` em `code/` | setup, pessoa |
| `db-local.sh` | `up`, `seed`, `reset`, `sql <arquivo>` no Postgres local descartável | dev, `igor-infra-local`, orquestrador antes do spawn |
| `token.sh` | `token.sh <local\|staging>`: token com cache, para curl de QA | `nina-qa`, dev |
| `consumo.py` | `python3 tools/consumo.py <dossiê>`: soma tokens e chamadas do dossiê a partir dos transcripts do Claude Code e grava `<dossiê>/consumo.json` | `/fechar` |
| `qa.sh` | `tools/qa.sh <validar\|run\|veredito\|rodadas> <dossiê> ...`: valida e executa o `plano-teste.md` de um dossiê de QA, grava a rodada em `.devmove/devmove.db` e regera `evidencias/<ambiente>.md`. Roda dentro do container da UI quando ele está de pé (o banco fica com um lado só gravando), senão com o Node da máquina (≥ 22.13) | `nina-qa`, painel |
| `apps.sh` | `tools/apps.sh <listar\|up\|down\|restart\|logs> [app]`: sobe e para no host as aplicações de `code/` pelo roteiro de `tools/.local/apps.json` (gerado pelo `/apps`), log em `.devmove/apps/logs/`. `ligar\|desligar` controla o supervisor que atende o play da UI; `inicializacao <instalar\|remover\|status>` o liga junto com a máquina. `repo adicionar <pasta> <url>` clona e registra no `repos.txt` com commit. Node ≥ 22.13 | `/apps`, `igor-infra-local`, `nina-qa`, `devmove-ui.sh`, pessoa |
| `devmove-ui.sh` | `tools/devmove-ui.sh <registrar\|remover\|atualizar\|status> [--ui <pasta>]`: registra este workspace na DevMove Flow UI da máquina (padrão `../devmove-flow-ui`, instalada se não existir), baixa a imagem nova e mostra a URL | `instalar.sh`, `atualizar_framework.py`, pessoa |
| `atualizar_framework.py` | `python3 tools/atualizar_framework.py [--checar]`: atualiza o harness para a última tag do DevMove Flow com merge de 3 vias a partir de `devmove-valores.md` | `/demanda` |

## Ambientes

`tools/ambientes/<ambiente>.env` (no git) define `BASE` e o que não é segredo. `tools/.local/ambientes/<ambiente>.env` (fora do git) define segredos. `<NOME>_CMD=<comando>` roda o comando e usa a saída como `<NOME>`, ex.: `TOKEN_CMD=tools/token.sh staging`. Segredo nunca é gravado: no banco e na evidência aparece `{{NOME}}`.

## Plano de teste

Formato que `tools/qa.sh` lê no `plano-teste.md`:

~~~md
## Variáveis
```env
CLINICA=qa-planos
```

## Cenários

### T1 Consultar plano atual
Pré-condição: clínica qa-planos no Básico.
```env
CLINICA=qa-planos
```
```http
GET {{BASE}}/v1/assinatura
Authorization: Bearer {{TOKEN}}
X-Clinica: {{CLINICA}}
```
Espera:
- status 200
- `$.plano` == "basico"
- `$.itens[?(@.tipo=="ajuste_troca")].valor` == 6666
- `$.codigo` ausente
- texto livre vira asserção manual (PENDENTE até o veredito)
~~~

- Bloco `env` em `## Variáveis` vale para a suíte; dentro do cenário, só para ele.
- Bloco `http`: `MÉTODO URL`, cabeçalhos, linha vazia, corpo.
- Asserção: `status <n>`; `` `<jsonpath>` `` com `==`, `!=`, `>`, `>=`, `<`, `<=`, `contém` e valor JSON; `` `<jsonpath>` existe `` ou `ausente`.

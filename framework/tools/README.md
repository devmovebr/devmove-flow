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
| `qa.sh` | `tools/qa.sh <validar\|run\|veredito\|rodadas> <dossiê> ...`: valida e executa o `plano-teste.md` de um dossiê de QA, grava a rodada em `.devmove/devmove.db` e regera `evidencias/<ambiente>.md`. Roda dentro do container da UI quando ele está de pé (o banco fica com um lado só gravando), senão com o Node da máquina (≥ 22.13) | `nina-qa`, painel |
| `apps.sh` | `tools/apps.sh <listar\|up\|down\|restart\|logs> [app]`: sobe e para no host as aplicações de `code/` pelo roteiro de `tools/.local/apps.json` (gerado pelo `/apps`), log em `.devmove/apps/logs/`. `ligar\|desligar` controla o supervisor que atende o play da UI; `inicializacao <instalar\|remover\|status>` o liga junto com a máquina. `repo adicionar <pasta> <url>` clona e registra no `repos.txt` com commit. Node ≥ 22.13 | `/apps`, `igor-infra-local`, `nina-qa`, `devmove-ui.sh`, pessoa |
| `devmove-ui.sh` | `tools/devmove-ui.sh <registrar\|remover\|atualizar\|status> [--ui <pasta>]`: registra este workspace na DevMove Flow UI da máquina (padrão `../devmove-flow-ui`, instalada se não existir), baixa a imagem nova e mostra a URL | `instalar.sh`, `atualizar_framework.py`, pessoa |
| `ponte.sh` | `tools/ponte.sh <instalar\|atualizar\|status\|desinstalar> [--escopo <key>] [--amqp-url <url>]`: clona a ponte de agentes do Mission Control em `.agents-bridge/`, preenche o `.env`, cria o `commands.local.json` com `/demanda` e registra o serviço que sobe com a máquina. Node ≥ 22.18 | pessoa |
| `atualizar_framework.py` | `python3 tools/atualizar_framework.py [--checar]`: atualiza o harness para a última tag do DevMove Flow com merge de 3 vias a partir de `devmove-valores.md` | `/demanda` |

## Ponte de agentes

A ponte liga este workspace ao Mission Control: história ou bug criado no MC abre uma sessão `/demanda` aqui, e as perguntas da sessão voltam como pendência no MC. Repositório: [github.com/devmovebr/mission-control-agents-bridge](https://github.com/devmovebr/mission-control-agents-bridge) (privado: o git da máquina precisa de acesso à org `devmovebr`). Um clone por workspace, em `.agents-bridge/` (fora do git).

```bash
tools/ponte.sh instalar --escopo cst      # key do projeto no Work; a URL AMQP é pedida sem eco
cd .agents-bridge && npm run claude       # 1ª vez na máquina: /login e aceitar a confiança na pasta; /exit
tools/ponte.sh status
```

- `--escopo`: key do projeto no Work em minúsculas; define a fila `mission-control.agents.project.<key>`.
- `--amqp-url` ou `PONTE_AMQP_URL`: URL do RabbitMQ no CloudAMQP, `amqps://<usuario>:<senha>@<host>/<vhost>`, com as credenciais. É o único dado de conexão; a ponte declara fila e bindings ao conectar. Precisa de saída para a porta 5671.
- `--mc-url`, `--mc-key-id`, `--mc-key-secret`: API key do MC restrita ao projeto, para mover o card e o medidor de tempo. Opcional.
- Rodar `instalar` de novo atualiza o clone e só troca no `.env` o que foi passado. `atualizar` faz pull, `npm install` e reinicia o serviço.
- Serviço sem admin: pasta Inicializar no Windows, unidade de usuário do systemd no Linux, agente do launchd no macOS. Log em `.agents-bridge/data/bridge.log`.

## Ponte e UI de pé

Para conferir se uma cópia está operante:

| O quê | Comando | Esperado |
|---|---|---|
| Ponte | `tools/ponte.sh status` | `ponte rodando · pid <n> · conectada ao broker`; sai com 1 quando parada ou sem broker |
| Log da ponte | `tail -f .agents-bridge/data/bridge.log` | `[bus] conectado, ouvindo mission-control.agents.project.<key>` depois de cada subida |
| Sessões ao vivo | `cd .agents-bridge && npm run watch` | eventos das sessões abertas pelo MC |
| UI | `tools/devmove-ui.sh status` | `· running · versão <x>` e este workspace na lista |
| API da UI | `curl -s localhost:4800/api/info` | JSON com `versao`; sem resposta no Docker Desktop: Enable host networking |
| Supervisor das apps | `tools/apps.sh listar` | apps com a situação; supervisor desligado: `tools/apps.sh ligar` |

Na UI (`http://localhost:4800/<workspace>`), a aba Logs de agentes mostra a ponte ligada (lê `.agents-bridge/data/bridge.pid`) e uma sessão por demanda vinda do MC; a aba Mensagens mostra o barramento de cada demanda.

| Sintoma | Causa | Correção |
|---|---|---|
| `ponte parada` | serviço não subiu desde o logon | `tools/ponte.sh atualizar`, ou `cd .agents-bridge && npm start` em primeiro plano |
| `sem broker` com `ACCESS_REFUSED` | URL AMQP com senha velha | `tools/ponte.sh instalar --amqp-url <url nova>` |
| `sem broker` com `ETIMEDOUT` | rede bloqueia a 5671 | liberar saída para o host do CloudAMQP |
| UI `parado` | Docker parado ou container removido | `tools/devmove-ui.sh atualizar` |

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

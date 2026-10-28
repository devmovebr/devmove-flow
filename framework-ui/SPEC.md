# DevMove Painel: especificação

Ferramenta visual do harness. Módulos: Testes, Mensagens (troca com o Mission Control, de `<dossiê>/mensagens-mc.md`) e Logs de agentes (sessões da ponte, de `<workspace>/.agents-bridge/data/logs/<ITEM>.jsonl`, desenhadas como o terminal do Claude Code e acompanhadas por SSE). Um usuário, sem login.

## Stack

- Um pacote em `framework-ui/app/`: `src/web` (React + Vite + Tailwind + TanStack Query + React Router), `src/server` (Fastify), `src/runner` (parser, executor, banco).
- Node 24. Banco com `node:sqlite` (embutido, sem dependência nativa). SQL puro, sem ORM.
- Em produção, um processo: o Fastify serve `/api` e o front buildado (`dist/web`).
- `npm run build:cli` gera `framework/tools/qa.mjs` com esbuild: um arquivo, sem dependências, roda com `node` ≥ 22.13.

## Conceitos

| Termo | O que é | Onde mora |
|---|---|---|
| Projeto | uma cópia do framework (workspace) | pasta montada em `/workspaces/<nome>` |
| Demanda | dossiê com `plano-teste.md` | `doc/demandas/<tipo>/<slug>/` |
| Suíte | os cenários `T1..Tn` do `plano-teste.md` | MD, relido quando o arquivo muda (mtime e tamanho) |
| Rodada | uma execução de parte ou de toda a suíte num ambiente | SQLite |
| Execução | um cenário dentro de uma rodada | SQLite |

Projeto é toda subpasta de `/workspaces` (ou de `DEVMOVE_WORKSPACES`) que tem `CLAUDE.md`, `devmove-valores.md` e `doc/demandas/`. A CLI usa o workspace do diretório atual.

## Formato do plano-teste.md

~~~md
# Plano de teste: <título>

## Mudança
<texto livre>

## Variáveis
```env
CLINICA=qa-planos
```

## Cenários

### T3 Diferença proporcional da troca
Pré-condição: clínica qa-planos no Básico, dia 10 do ciclo.
```env
CLINICA=qa-planos
```
```http
POST {{BASE}}/v1/assinatura/troca
Authorization: Bearer {{TOKEN}}
X-Clinica: {{CLINICA}}
Content-Type: application/json

{"plano":"pro"}
```
Espera:
- status 200
- `$.plano` == "pro"
- `$.itens[?(@.tipo=="ajuste_troca")].valor` == 6666
- valor arredondado para baixo
~~~

Regras do parser:
- Cenário: cabeçalho `### T<n> <título>` dentro de `## Cenários`. Seções fora disso viram texto livre (`mudanca` e demais).
- `Pré-condição:` e `Objetivo:` são opcionais, uma linha cada.
- Bloco ```` ```env ```` em `## Variáveis` vale para a suíte; dentro do cenário sobrescreve só nele.
- Bloco ```` ```http ````: linha 1 `MÉTODO URL`, cabeçalhos até a linha vazia, depois o corpo. `{{NOME}}` é variável.
- `Espera:` seguido de lista. Cada item é uma asserção:
  - `status <n>`
  - `` `<jsonpath>` <op> <valor JSON> ``, op em `==`, `!=`, `>`, `>=`, `<`, `<=`, `contém`
  - `` `<jsonpath>` existe `` e `` `<jsonpath>` ausente ``
  - qualquer outro texto é asserção manual (não avaliada).
- JSONPath com `jsonpath-plus`. Resultado com um elemento compara o elemento; vazio é `undefined`.
- Erro de formato não derruba a suíte: o cenário vem com `erros: string[]` e não executa.

## Variáveis e ambientes

Ordem de resolução, a última vence:
1. `tools/ambientes/<amb>.env` (no git, sem segredo: `BASE=...`)
2. `tools/.local/ambientes/<amb>.env` (fora do git, segredos)
3. `## Variáveis` da suíte
4. `env` do cenário

Variável `<NOME>_CMD=<comando>` roda o comando com `bash -c` no workspace e o stdout (trim) vira `<NOME>`. Ex.: `TOKEN_CMD=tools/token.sh staging`. Resultado em cache por processo durante 5 minutos.

Segredo: toda variável vinda de `tools/.local/` ou de `_CMD`. O valor de segredo nunca vai para o banco, para o MD nem para o browser: na gravação vira `{{NOME}}`.

Ambientes listados: nomes dos arquivos em `tools/ambientes/`.

## Banco

`<workspace>/.devmove/devmove.db`, modo WAL. A pasta `.devmove/` entra no `.gitignore`. Migrações numeradas em `src/runner/migracoes.ts`, tabela `migracoes`.

```sql
create table rodadas (
  id integer primary key,
  dossie text not null,          -- 'qa/2026-09-14-planos-assinatura-staging'
  ambiente text not null,
  origem text not null,          -- 'agent' | 'manual'
  autor text not null,           -- 'nina-qa' | usuário da UI
  status text not null,          -- 'executando' | 'concluida' | 'interrompida'
  iniciada_em text not null,     -- ISO
  finalizada_em text
);
create table execucoes (
  id integer primary key,
  rodada_id integer not null references rodadas(id),
  cenario text not null,         -- 'T3'
  titulo text not null,
  ordem integer not null,
  cenario_md text not null,      -- trecho do MD do cenário como estava
  request json not null,         -- {method,url,headers,body} já resolvido, segredos como {{NOME}}
  resposta json,                 -- {status,headers,body,tempo_ms,tamanho}
  erro text,                     -- falha de rede, timeout, variável faltando
  assercoes json not null,       -- [{texto,tipo:'auto'|'manual',ok:boolean|null,obtido}]
  veredito text not null,        -- 'PASSOU' | 'FALHOU' | 'BLOQUEADO' | 'PENDENTE'
  veredito_auto text not null,
  nota text,
  executada_em text not null
);
```

Veredito automático: alguma asserção auto falhou ou houve `erro` → `FALHOU`; todas auto passaram e há manual → `PENDENTE`; todas passaram → `PASSOU`. `BLOQUEADO` só por veredito manual.

Placar de uma rodada: contagem por veredito das execuções + `nao_executado` (cenários da suíte sem execução na rodada).

Estado atual de um ambiente: última execução de cada cenário, juntando rodadas parciais. É o que a Suíte mostra por padrão, o placar da lista de Demandas e o conteúdo da evidência em MD.

## Evidência em MD

Ao fim de toda rodada, o runner regrava `<dossiê>/evidencias/<amb>.md` com a última execução de cada cenário naquele ambiente (juntando rodadas parciais). Formato:

~~~md
# Evidências: staging

Gerado pelo painel. Rodadas: #12 (agent, 2026-09-14 15:20), #14 (manual, 2026-09-15 10:02)

```bash
export BASE=https://api.staging.consultto.app
export TOKEN=$(<workspace absoluto>/tools/token.sh staging)
export CLINICA=qa-planos
```

## T1 Consultar plano atual
`curl -sS -X GET -H 'Authorization: Bearer $TOKEN' ... "$BASE/v1/assinatura"`
HTTP 200 · 0,12s · rodada #12
```json
{ corpo formatado, cortado em 60 linhas }
```
- [x] status 200
- [ ] `$.plano` == "basico" (obtido: "pro")
PASSOU
~~~

O curl usa variáveis de shell (`$BASE`, `$TOKEN`), nunca valor de segredo. `parecer-<amb>.md` continua escrito pela `nina-qa`.

## CLI (`tools/qa.sh` → `node tools/qa.mjs`)

| Comando | Faz |
|---|---|
| `qa.sh validar <dossiê>` | parseia o plano e lista erros por cenário. Sai 1 se houver erro |
| `qa.sh run <dossiê> <amb> [T1,T3] [--autor nina-qa]` | cria rodada com origem `agent`, executa em ordem, grava banco e evidência, imprime uma linha por cenário: `T3 FALHOU 200 0,09s $.itens[...].valor == 6666 (obtido 6667)` |
| `qa.sh veredito <dossiê> <amb> <Tn> <VEREDITO> "<nota>"` | muda o veredito da última execução do cenário no ambiente e regrava a evidência |
| `qa.sh rodadas <dossiê>` | lista rodadas com placar |

`<dossiê>` aceita caminho relativo ao workspace (`doc/demandas/qa/<slug>`) ou só `qa/<slug>`.

## API

Prefixo `/api`. `:p` = nome do projeto. `:d` = `<tipo>/<slug>` codificado com `encodeURIComponent`.

| Método e rota | Retorno |
|---|---|
| `GET /projetos` | `[{nome, caminho}]` |
| `GET /projetos/:p/ambientes` | `[nome]` |
| `GET /projetos/:p/demandas` | `[{dossie, tipo, slug, titulo, data, servicos, status, origem, total_cenarios, ultima_rodada: Rodada \| null, estado_atual}]` (status e serviço vêm do `INDEX.md` do tipo) |
| `GET /projetos/:p/demandas/:d` | `{demanda, suite: {titulo, mudanca, variaveis, cenarios: Cenario[]}, rodadas: Rodada[], estados: EstadoAtual[]}` (um estado por ambiente, mais recente primeiro) |
| `GET /projetos/:p/demandas/:d/matriz?ambiente=` | `{rodadas: Rodada[], linhas: [{cenario, titulo, vereditos: {[rodadaId]: veredito}}]}` |
| `GET /projetos/:p/demandas/:d/cenarios/:c/historico` | `Execucao[]` com `rodada` embutida, mais recente primeiro |
| `POST /projetos/:p/demandas/:d/executar` `{ambiente, cenarios?}` | `{rodada_id}`. Origem `manual`, autor `DEVMOVE_USUARIO` (usuário da máquina) |
| `GET /projetos/:p/rodadas/:id` | `Rodada & {execucoes: Execucao[]}` |
| `GET /projetos/:p/rodadas/:id/eventos` | SSE: `execucao` (Execucao), `fim` (Rodada) |
| `POST /projetos/:p/rodadas/:id/parar` | `Rodada` com status `interrompida` |
| `PATCH /projetos/:p/execucoes/:id` `{veredito, nota}` | `Execucao`; regrava a evidência |
| `POST /projetos/:p/enviar` `{ambiente, dossie?, cenario?, request: {method,url,headers,body}, env?}` | `{request, resposta, erro, assercoes}` sem gravar. Variáveis resolvidas no servidor |

Tipos:

```ts
type Veredito = 'PASSOU' | 'FALHOU' | 'BLOQUEADO' | 'PENDENTE'
type Placar = { passou: number; falhou: number; bloqueado: number; pendente: number; nao_executado: number; total: number }
type Rodada = { id: number; dossie: string; ambiente: string; origem: 'agent' | 'manual'; autor: string; status: 'executando' | 'concluida' | 'interrompida'; iniciada_em: string; finalizada_em: string | null; placar: Placar }
type Cenario = { id: string; titulo: string; precondicao?: string; objetivo?: string; env: Record<string, string>; request: { raw: string; method: string; url: string; headers: [string, string][]; body: string }; assercoes: string[]; erros: string[] }
type Assercao = { texto: string; tipo: 'auto' | 'manual'; ok: boolean | null; obtido?: unknown }
type Execucao = { id: number; rodada_id: number; cenario: string; titulo: string; ordem: number; request: { method: string; url: string; headers: [string, string][]; body: string }; resposta: { status: number; headers: [string, string][]; body: string; tempo_ms: number; tamanho: number } | null; erro: string | null; assercoes: Assercao[]; veredito: Veredito; veredito_auto: Veredito; nota: string | null; executada_em: string; rodada?: Rodada }
type ExecucaoResumo = Pick<Execucao, 'id' | 'rodada_id' | 'cenario' | 'titulo' | 'ordem' | 'veredito' | 'executada_em' | 'rodada'> & { resposta: { status: number; tempo_ms: number } | null }
type EstadoAtual = { ambiente: string; atualizado_em: string; placar: Placar; execucoes: ExecucaoResumo[] }
```

## Telas

Referências em `framework-ui/referencias/`. Seguir à risca: tema escuro, fundo quase preto, cards com borda fina, acento rosa/magenta, tipografia Poppins, badges de status verde/vermelho/laranja, contadores com ícone circular, donut de %.

Shell (todas as referências): sidebar com logo, seletor de projeto, menu `Testes`, `Mensagens` e `Logs de agentes`. Topo com breadcrumb `Projeto > Testes > <tela>` e título "Testes". Rótulos em português.

| Rota | Referência | Conteúdo |
|---|---|---|
| `/:p/testes` | `16.29.30` | Demandas. Linha: ícone, slug curto, título, data, serviço, contadores da última rodada (não executado, passou, falhou, pendente, bloqueado), donut de % passou, ambiente e status do INDEX. Filtro por status |
| `/:p/testes/:d` | `16.29.02` | Suíte. Esquerda: "Estado atual" por ambiente (padrão) e rodadas ("#14 · staging · manual · 15 set 10:02", check com % e falhas). Direita: cenários da rodada selecionada com status, último tempo e quem executou. Botões `Executar suíte` (escolhe ambiente) e `Comparar rodadas`. Árvore da `16.29.14` como alternativa de navegação no toggle de layout |
| `/:p/testes/:d/rodadas/:id` | `16.28.41` | Rodada. Card por cenário: número, chamada (método + caminho), pré-condição, esperado, badge de resultado. Ícone de bug no falho. Faixa "#14 · EXECUTANDO" com `Parar` durante SSE. Clique no card abre o cenário |
| `/:p/testes/:d/cenarios/:c` | sem referência, mesmo estilo | Cenário (substituto do Postman). Ambiente, editor de método/URL/headers/body com `{{VAR}}` destacado, `Enviar` (efêmero, `/enviar`), `Executar cenário` (grava rodada). Resposta: status, tempo, tamanho, abas corpo (JSON formatado e colapsável), headers, asserções. Painel de histórico do cenário. Editar veredito e nota da última execução |
| `/:p/testes/:d/comparar` | `16.28.51` | Matriz cenário × rodada com badge por célula, filtro por ambiente |

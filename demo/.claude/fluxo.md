# Fluxo de demanda

Versão do DevMove Flow: 2.6.0 (atualizado em 2026-10-27).

Lido pelo orquestrador via `/demanda`, `/retomar`, `/qa` e skills de etapa. Agents não leem este arquivo.

## Tipo e pasta

Toda demanda tem um tipo. O tipo decide a pasta e o fluxo.

| Tipo | Pasta | Quando | Fluxo |
|---|---|---|---|
| feature | `doc/demandas/feature/` | funcionalidade nova ou melhoria, mesmo pequena. Épico também | porte P, M ou G |
| bug | `doc/demandas/bug/` | comportamento errado em algo que já existe | porte P ou M, com reprodução |
| debito-tecnico | `doc/demandas/debito-tecnico/` | refatoração, rename, limpeza, atualização de dependência, sem mudar comportamento | `backlog` até ser priorizado, depois porte P, M ou G |
| qa | `doc/demandas/qa/` | teste de uma entrega já integrada (própria ou de outra pessoa) num ambiente real | plano de teste → execução → parecer (`/qa`) |

Dossiê: `doc/demandas/<tipo>/<AAAA-MM-DD>-<slug>/`. Tudo da demanda mora nele, inclusive arquivo temporário. Nunca criar nada fora dele. Agent que cria temporário (`tmp/`) apaga antes de devolver.

Cada pasta de tipo tem o seu `INDEX.md`, uma linha por dossiê. `doc/demandas/INDEX.md` é o roteador dos tipos. Link entre dossiês é relativo e atravessa o tipo: `../../bug/<dossiê>/`.

**Épico.** Feature grande demais para um dossiê vira dossiê de épico em `feature/`: produz `fases.md` (fases, ordem, dependência) no lugar de `plano.md`, e cada fase vira um dossiê de feature próprio, com `Épico: <dossiê>` no `INDEX.md`.

**Bug.** O plano traz a reprodução (comando ou cenário que falha hoje), a causa com fonte ou "a confirmar na frente", e o aceite: a reprodução passa e um teste de regressão cobre o caso. Causa conhecida: porte P. Causa desconhecida: porte M, com o `caio-consultor-code` localizando antes do plano.

**Débito técnico.** Nasce de três jeitos: "Fora de escopo encontrado" aprovado no `/fechar`, análise pedida por Ana, ou `/demanda` com relato de débito. Dossiê com `bruto/relato.md`, `Origem: <dossiê>` no `INDEX.md` e `Status: backlog`. Priorizado: `/retomar <dossiê>` faz o gate de porte e segue o fluxo normal.

**Integração com parceiro.** Contrato de parceiro mora em `doc/integracoes/<parceiro>/referencia/`. Feature ou bug que toca a integração confere o campo no contrato antes do gate do plano (lote do `caio-consultor-code` ou `Explore`). Sem acesso ao contrato: pendência, sem presumir campo, unidade ou verbo.

## Porte

Decidido no `/demanda`, confirmado no primeiro gate. Muda quando Ana pede, quando o fallback sobe o porte ou na reclassificação abaixo.

| Porte | Quando | Etapas |
|---|---|---|
| **P** | rename, débito técnico autoexplicativo, bug com causa conhecida, ajuste de config. 1 serviço, sem regra nova | plano curto → executar → fechar |
| **M** | regra clara, 1 ou 2 serviços, sem contrato novo entre serviços | plano → executar → fechar |
| **G** | regra ambígua, vários serviços, contrato, tabela ou integração nova | negocio → tecnico → plano → executar → fechar |

Critério mais alto vence: contrato novo entre serviços (evento, endpoint consumido por outro serviço, schema compartilhado) ou 3 serviços ou mais é G, mesmo com regra clara. Fora disso, na dúvida entre dois portes, o menor. Relato que diz "não precisa refinar" é P.

**Reclassificação.** Depois do primeiro lote do `caio-consultor-code`, e de novo quando o arquiteto devolver o plano, o orquestrador confere a tabela com os fatos: serviços tocados e contratos novos. Cruzou a linha de outro porte: gate de reclassificação com o porte proposto e o motivo. Subir de M para G roda só as etapas que faltam (negocio e tecnico), aproveitando o que já existe.

## Artefatos e teto de linhas

Cada arquivo tem uma função. Nenhum repete o outro: referencia.

| Arquivo | Diz | Teto |
|---|---|---|
| `negocio.md` | o que precisa ser feito e a regra | 60 |
| `tecnico.md` | o que é impactado, decisões de arquitetura, padrões a seguir, armadilhas | 80 |
| `testes.md` | cenários e comportamento esperado | 50 |
| `plano.md` | onde e o que implementar, por frente, com aceite | P: 40 · M/G: 80 |
| `fases.md` | só em épico: fases, ordem e dependência | 60 |
| `pendencias.md` | perguntas abertas e quem responde | 20 |
| `CHANGELOG.md` | estado e registro de cada passagem. Permanente | Estado 5 · Registro 40 |
| `mapa.md` | onde está no código o que a demanda toca | 40 |
| `fechamento.md` | entregue, desvios, hipóteses exercitadas, fatos errados | 30 |
| `passagem/*.md` | bastão, retorno e revisão de agent | 30 cada |
| `consumo.json` | tokens e chamadas por agent e passada, gerado pelo `tools/consumo.py`. Não editar | - |
| `INDEX.md` | uma linha por arquivo | 15 |

Plano aponta, não executa. Proibido no plano e no técnico: DDL completo, código, assinatura de método, lista de arquivo por arquivo com linha, inventário exaustivo do código. Superfície vai no nível serviço → pasta ou módulo → tipo de mudança. O dev acha os arquivos.

Plano que cria chave de config fixa o valor de cada ambiente (URL alvo literal). O dev não infere valor de config.

Rename e refatoração mecânica: tabela de-para + aceite por comando (`build`, `test`, `grep -ri <nome antigo>` sem resultado). O `grep` do aceite usa símbolos específicos, nunca trecho de nome que outro conceito compartilha. Nome antigo que fica (vocabulário de parceiro, interface externa) entra no plano como lista de símbolos, nunca como pasta.

Aceite por `grep` de arquitetura (camada, dependência, interface) mede a intenção, não o texto: mover arquivo inteiro de pasta, trocar `interface` por alias ou criar tipo só para o `grep` sair vazio é contorno e reprova. O briefing do dev diz isso; o `rita-revisor-code` roda o `grep` e dá veredito sobre a intenção.

## CHANGELOG.md

Memória da demanda entre passagens. Nasce no `/demanda` e fica para sempre no dossiê. Todo agent spawnado começa por ele e não recebe histórico por outro meio. Dossiê de QA não tem CHANGELOG: o estado mora na linha do `qa/INDEX.md`.

```
# CHANGELOG <slug>

## Estado
Tipo: feature | bug | debito-tecnico · Porte: P | M | G · Etapa: <etapa> · Status: backlog | em andamento | aguardando gate | ajuste pedido | travada | fechada
Próximo passo: <uma linha>
Início: <data hora> · Fallback usado em: <etapas ou nenhum> · Depende de: <dossiês ou nenhum>
Reprovado em aberto: <itens exatos, só se travada>

## Registro
- <data hora> · <etapa> · <quem> · <o que mudou ou foi decidido, com caminho> · <resultado>
```

- `Estado`: reescrito a cada passagem. Até 5 linhas.
- `Registro`: só anexa, mais nova embaixo. Uma entrada por passagem (agent devolveu, gate, ajuste, fallback), até 2 linhas. Registra decisão e resultado, nunca processo, raciocínio ou saída de comando.
- Registro passou de 40 linhas: o orquestrador compacta as etapas já aprovadas em uma linha cada.
- Quem escreve é o orquestrador, a partir do retorno do agent.
- Agent que criou arquivo no dossiê: o orquestrador acrescenta a linha no `INDEX.md` do dossiê no mesmo turno.
- Consumo: medido no `/fechar` pelo `tools/consumo.py`, que lê os transcripts do Claude Code e grava `consumo.json` no dossiê. A linha-resumo que ele imprime entra no Registro.
- O transcript some em 30 dias: rode o script antes disso. Sessão em outra máquina: rode o script lá e commite o `consumo.json`. A coleta seguinte mantém as sessões já gravadas.
- Fallback, quando o script devolve `n/d`: anote por passada o delta de `subagent_tokens` da notificação (acumulado quando o agent foi retomado por `SendMessage`: atual menos o da passada anterior) e os `tool_uses` da passada.
- Ajuste de harness aprovado durante a demanda entra no Registro com o gate, mesmo quando foi aplicado em outra máquina.
- Trabalho pedido depois do gate final (correção, análise, revisão externa): etapa `pós-fechamento`, `Status: em andamento`, mesmas regras de agent e gate. Termina com novo gate final, `Status: fechada` e a linha da retro atualizada.

Sessão nova começa pelo `/retomar`, que lê só este arquivo.

## Agents

Agent é papel, nunca serviço. Conhecimento de serviço entra pelo briefing (mapa, rule do serviço), nunca no prompt do agent. Cada agent tem apelido e papel no nome.

| Papel | Agent | Modelo | Orçamento (chamadas) |
|---|---|---|---|
| orquestrador | esta sessão | opus | meta 40%, bastão 45% |
| consultor de código | `caio-consultor-code` | sonnet | 25 por lote |
| arquiteto | `theo-arquiteto` | opus | 60 |
| revisor de plano e entregável | `vera-revisor` | opus | 60 |
| revisor de código | `rita-revisor-code` | opus | 60 |
| arquivista | `iris-arquivista` | sonnet | 40 |
| dev, um por stack | `<apelido>-dev-<stack>` (`.claude/rules/code.md`) | sonnet | tabela de orçamento |
| infra local | `igor-infra-local` | sonnet | 60 |
| QA | `nina-qa` | sonnet | plano 60 · execução 100 |
| revisor de PR de par | `paul-revisor-pr` | opus | 60 |

Modelo por natureza da tarefa: julgar, decidir arquitetura ou orquestrar → opus; implementar, ler, extrair, indexar ou testar → sonnet. Spawn de `Explore` ou `general-purpose`: sempre `model: sonnet`. Esforço por agent não é configurável; vale o esforço da sessão. Trocar de modelo dentro da mesma conversa invalida o cache.

A retro registra tokens, chamadas e minutos por demanda. Papel acima do orçamento em duas demandas seguidas: propor modelo mais forte para ele, ou orçamento novo, num gate.

Repositório compartilhado com outros times (config da empresa, deploy): agent próprio com lista branca de arquivos, criado pelo `/novo-agent`. O dev de feature não toca esse repositório; lista em "Mudou" a config necessária.

Trabalho mecânico em muitos arquivos ou serviços: poucos spawns, cada um com escopo largo. Paralelo só quando os serviços são independentes; quem produz contrato vai antes de quem consome.

## Contexto

- Agent vivo: correção, ajuste, rechecagem e nova passada vão por `SendMessage` ao agent do mesmo papel que já trabalhou na demanda. Spawn novo só quando ele passou do ponto de bastão, travou ou foi interrompido; o novo nasce lendo `CHANGELOG.md` e a passagem.
- Um agent por papel e por demanda: um `caio-consultor-code`, um `theo-arquiteto` do técnico ao plano, um `vera-revisor`, um `rita-revisor-code` por execução.
- Um dev por serviço. As frentes do mesmo serviço rodam em sequência no mesmo agent. Paralelo só entre serviços.
- Exceção: portes M e G com 3 ou mais frentes grandes no mesmo serviço usam um dev novo por frente, em sequência. Cada um nasce do `CHANGELOG.md`, dos mapas e do retorno da frente anterior. Contexto acumulado custa mais que um nascimento.
- Frente é a subtarefa: pequena o bastante para caber na meta do porte.
- Cache de agent parado vence (1 hora; 5 minutos em alguns planos). Depois disso, o próximo `SendMessage` paga o contexto inteiro sem desconto. Por isso: `rita-revisor-code` sobe assim que o dev devolve `feito`, e a correção sai assim que a revisão devolve. Agent parado além do prazo com mais de 75 chamadas: spawn novo do mesmo papel com `CHANGELOG.md`, `mapa.md` e os itens, em vez de `SendMessage`.
- Retorno em disco: dev, revisores e QA gravam o retorno também em `passagem/` (`retorno-<frente>.md`, `revisao-<n>.md`, `revisao-code-<n>.md`). A mensagem do agent pode não chegar; o arquivo é o registro. Esperou a notificação e ela não veio: leia o arquivo.

## Ambiente

Pré-condição de ambiente é checada pelo orquestrador antes do spawn, nunca descoberta pelo dev no meio da frente.

- Frente com aceite em infra local (banco, fila, container): o orquestrador confere com a ferramenta de `tools/` ou `docker ps` e sobe o que estiver parado. Não sobe: `igor-infra-local` (`/infra`).
- Frente ou QA que depende de rede privada, credencial ou VPN: confere antes (ex.: o script de token responde). Falhou: pergunta fechada a Ana.
- Falha de rede em dependência durante o trabalho (registry privado, host interno, timeout de download): o agent para e devolve `bloqueado: ambiente` com o trecho do erro. Resolvido o ambiente, segue por `SendMessage`.

## Ferramentas em `tools/`

Script que opera o código ou o ambiente mora em `tools/` na raiz do workspace, um arquivo por ferramenta, listado em `tools/README.md`. Credencial e cache ficam em `tools/.local/`, fora do git.

- A ferramenta é o único caminho do agent até um recurso sensível (banco local, credencial, subida de serviço). Entrada validada, uso no cabeçalho, liberada no `settings.json` pelo padrão `*/tools/*.sh*` (os `.py` têm regra própria).
- Agent chama pelo caminho absoluto, `<workspace>/tools/<nome>`, onde `<workspace>` é o diretório de trabalho inicial da sessão. O mesmo workspace roda em mais de uma máquina: caminho de máquina nunca entra no harness.
- Artefato grava só a variável, nunca token ou senha: `TOKEN=$(<workspace>/tools/token.sh <ambiente>)`.
- Ferramenta nova nasce na demanda que precisou dela e entra no `tools/README.md` e no allow no mesmo turno.

## Versão do harness

O `/demanda` roda `python3 <workspace>/tools/atualizar_framework.py` antes de tudo. Ele compara a marca do topo deste arquivo com a última tag do DevMove Flow e, se houver versão nova da mesma major, faz o merge de 3 vias: regra local fica, regra nova do framework entra.
- `em dia` ou `sem acesso ao framework`: segue.
- `atualizado` sem conflito: commit `chore(harness): atualiza devmove flow para <versão>` só dos arquivos listados, uma linha a Ana com a versão, e segue.
- Conflito (código 1): os arquivos têm marcadores `<<<<<<< aqui` / `>>>>>>> framework`. Gate com cada trecho lado a lado; aprovado, resolve, commita como acima e segue.
- Bloqueado (código 2: major, harness sujo, sem `devmove-valores.md`): uma linha a Ana e segue a demanda na versão atual.
- Linha `aviso` de valores desatualizado: entra no `/fechar` desta demanda.

`devmove-valores.md` na raiz fica vivo. Dele saem a renderização de cada versão e a lista de termos que o `/melhoria` do framework nunca deixa sair desta cópia: projeto, responsável, serviços e repositórios. Serviço, repositório, stack, comando ou regra fixa que mudou numa demanda muda nele também, no commit `[local]` do `/fechar`.

## Mapas: memória compartilhada de código

Subagent não compartilha cache com ninguém. O que um agent descobre no código só chega ao próximo pelo mapa. Dois níveis:

| Mapa | Onde | Teto | Quem escreve |
|---|---|---|---|
| da demanda | `<dossiê>/mapa.md` | 40 linhas | `caio-consultor-code` cria; dev completa |
| do serviço | `doc/servicos/<serviço>/mapa.md` | 60 linhas | só a `iris-arquivista`, no `/fechar` |

Formato de linha: `- <conceito> · <arquivo> · <símbolo> · <nota curta> · <quem> <data>`. Símbolo, nunca número de linha. Seções do mapa do serviço: Camadas · Onde fica · Padrões · Armadilhas · Comandos próprios.

Comandos e regras fixas do serviço moram na rule `.claude/rules/code/servicos/<serviço>.md`, carregada sozinha quando o agent toca o serviço. O mapa diz onde fica; a rule diz como trabalhar.

Qualidade:
- Só entra o que foi visto no código na mesma sessão. Nada deduzido, nada do relato.
- Quem lê e encontra linha errada corrige na hora (dev na demanda) ou registra no retorno (`rita-revisor-code`, `caio-consultor-code` no mapa do serviço). Linha corrigida leva o novo `<quem> <data>`.
- Mapa do serviço com linha verificada há mais de 90 dias: vale como ponto de partida, não como fato; confirme antes de apoiar decisão nele.
- Passou do teto: compacta. Mapa longo volta a custar o que ele economiza.

Uso:
- `caio-consultor-code`: começa pelo mapa do serviço; lê o código pela branch de integração (`git show origin/<branch>:<arquivo>`), não pelo checkout local; grava no mapa da demanda o que achou para responder, além de responder.
- `theo-arquiteto`: lê o mapa da demanda no lugar de perguntar de novo.
- dev: começa pelos dois mapas, vai ao código depois. Anexa ao mapa da demanda o que descobriu e que outro agent vai precisar.
- `rita-revisor-code`: parte do mapa da demanda e do `git diff --stat`.
- `/fechar`: a `iris-arquivista` leva ao mapa do serviço só o que é estrutural (sobrevive à demanda), corrige o que a demanda provou errado e compacta.

Serviço sem mapa: a primeira demanda que o tocar cria, pelo caminho normal (demanda → `/fechar`).

## Teto de rodadas

| Ciclo | Teto | Ao atingir |
|---|---|---|
| Revisão de plano (`vera-revisor`) | 1 passada + 1 rechecagem | fallback (abaixo) |
| Revisão de código (`rita-revisor-code`) | 1 passada + 1 rechecagem | fallback (abaixo) |
| Rodada de `negocio.md` ou `tecnico.md` | 2 | gate com Ana |
| Perguntas ao `caio-consultor-code` | 1 lote por etapa | segue com o que tem, risco no plano |
| Perguntas a Ana | 1 lote por etapa | segue com a leitura mais simples |

Premissa de produto que o arquiteto assumiu no plano (padrão ligado ou desligado, limite, prazo) não fica só em Riscos: vira pergunta fechada no gate do plano, dentro do lote da etapa.

## Orçamento de contexto

Janela: Opus 5.5 e Sonnet 5.5 têm 1M tokens. O teto é em % da janela do agent. O agent não enxerga os próprios tokens, então mede por chamadas de ferramenta, com a conversão abaixo.

**Conversão**: início ≈ 30k (depende do harness carregado) + ≈ 1,6k por chamada. A primeira retro de cada projeto mede e fixa o valor. Ajustada pela retro com o consumo real: `contexto_final` e `chamadas` de cada agent no `consumo.json` (no fallback, a notificação de término).

| Porte (dev) | Meta | Limite | Passagem de bastão em | Em chamadas: meta · bastão · limite |
|---|---|---|---|---|
| P | 25% | 30%, rodada única | 25% | 137 · 137 · 168 |
| M | 30% | 40% | 35% | 168 · 200 · 231 |
| G | 40% | 50% | 45% | 231 · 262 · 293 |

Outros papéis: tabela de Agents.

Regras:
- Meta é o esperado. Passar da meta só quando o que falta cabe antes do ponto de bastão.
- Ponto de bastão (limite menos 5%): o agent para de trabalhar e usa o que resta para escrever a passagem. Nunca chega ao limite sem ela.
- Porte P é rodada única: sem continuação. Não terminou: gate com Ana.
- Briefing traz o porte e as três chamadas da tabela.
- Correção pontual (trace ou `arquivo:linha`): meta de 20 chamadas dentro do mesmo limite. Sem causa em 10: `bloqueado` com "Aprendido".
- `maxTurns` no agent é só rede de segurança acima do limite. Quem para é o agent, no ponto de bastão.

## Passagem de bastão entre agents

Agent que para no ponto de bastão escreve `passagem/<frente>-<n>.md` no dossiê, até 30 linhas:
- Feito: o que está pronto e verificado.
- Falta: um item por linha, cada um executável sem investigar de novo.
- Decisões tomadas e por quê, em uma linha cada.
- Armadilhas encontradas, com `arquivo:linha`.
- Estado do repo: build e testes passando ou não, e qual.

Devolve `parcial` apontando o arquivo. O orquestrador registra no `CHANGELOG.md`, e a continuação nasce lendo `CHANGELOG.md` e a passagem, sem redescobrir. O arquivo fica no dossiê.

Depois de um `parcial`:
- portes M e G, com progresso: **uma** continuação, spawn novo do mesmo papel com a passagem;
- sem progresso, ou a continuação também voltou `parcial`: gate com Ana mostrando a passagem. `Aprovar e seguir` (continuação no rumo indicado) ou `Reprovar e pedir ajuste` (frente manual).

Proibido criar instância nova com o mesmo briefing de quem falhou. Cada spawn custa cerca de 30k tokens só para nascer: correções pequenas do mesmo serviço vão juntas num agent só.

## Orquestrador

A sessão do orquestrador segue a mesma lógica, sobre 1M: meta de 40%, ponto de bastão em 45%. No ponto de bastão, atualiza o `CHANGELOG.md` com o `Estado` e o próximo passo exato e pede a Ana `/clear` e `/retomar`. Fora disso, sessão nova só quando o limite é atingido.

## Git

- Antes do primeiro dev, em cada repositório tocado: `git status --short` limpo (sujo: pare e avise), branch da demanda criada a partir da branch base, com o nome da convenção de `.claude/rules/code.md`. Identificador externo (work item, issue) vem do `bruto/` ou do `CHANGELOG.md`; sem ele, pergunte antes de criar a branch.
- Dev não faz commit, push, stash nem troca de branch.
- Commit é do orquestrador, depois do gate do `/executar`: um commit por repositório, `git -C <serviço> add` só dos arquivos da demanda, mensagem na convenção de `.claude/rules/code.md`. Plano que pede commit por frente: o orquestrador commita ao fim de cada frente aprovada pelo `rita-revisor-code`.
- Push, PR e merge só com pedido de Ana.
- Repositório do workspace: o commit da demanda (`doc/`, `retro.md`) é separado do commit de melhoria do harness (`CLAUDE.md`, `.claude/` fora `retro.md`, `tools/`). Melhoria de harness: um commit por classe, `chore(harness): [framework] <assunto>` para a que vale para qualquer projeto e `chore(harness): [local] <assunto>` para a que só vale aqui. Commit `[framework]` só toca harness e tem o assunto e o corpo sem nome de cliente, serviço ou parceiro: é o que o `/melhoria` do framework lê.
- Código, comentário, teste e mensagem de commit nunca citam o harness: arquivo de dossiê, "decisão N", pendência `P<n>`, frente `F<n>`, `.claude/`. O comentário afirma a regra; a origem fica no dossiê.

## Briefing de correção

Correção com trace de erro ou `arquivo:linha` (vinda de Ana, do `rita-revisor-code` ou de uma passagem): o briefing leva o trace e as linhas **literalmente**. É a exceção à regra de não copiar conteúdo. Meta de 20 chamadas. Sem plano, sem frente inteira: só os itens.

## Fluxo assistido

O `/demanda` conduz a demanda inteira. Ana não digita comando entre etapas: aprova ou pede ajuste.

Ao fim de cada etapa, o orquestrador:
1. registra a passagem no `CHANGELOG.md`, com `Status: aguardando gate`;
2. mostra o resumo da etapa em até 8 linhas: o que foi produzido (caminho e número de linhas), decisões, riscos, próxima etapa;
3. faz o gate com `AskUserQuestion` (sem a ferramenta disponível, em texto com as mesmas opções), pergunta única, duas opções:
   - `Aprovar e seguir` (descrição: nome da próxima etapa)
   - `Reprovar e pedir ajuste` (descrição: "diga o ajuste em Other ou nas notas")

Aprovado: segue direto para a próxima etapa, no mesmo turno.

Reprovado:
1. Sem texto de ajuste: uma pergunta fechada pedindo o ajuste.
2. `CHANGELOG.md` com `Status: ajuste pedido` e o ajuste no registro.
3. `SendMessage` ao agent que produziu a etapa, com o ajuste. Faz só o que Ana pediu. Spawn novo só se ele passou do bastão.
4. Novo gate.

Ajuste pedido por Ana não conta no teto de rodadas do agent.

## Fallback: teto atingido

Entra quando uma revisão (`vera-revisor` ou `rita-revisor-code`) reprova depois da rechecagem. A etapa para. Nada de terceira passada.

1. `CHANGELOG.md` com `Status: travada` e os itens reprovados, com o trecho exato.
2. O orquestrador classifica cada item em uma causa, sem abrir código:

| Causa | Sinal | Correção |
|---|---|---|
| **informação** | falta fato de código ou decisão | pergunta fechada ao `caio-consultor-code` ou a Ana |
| **artefato** | peça ou código não atende o critério | agent produtor, por `SendMessage`, recebe só os itens |
| **critério** | aceite inviável, contraditório ou mal escrito | Ana reescreve ou corta o critério |
| **porte** | a demanda é maior que o porte decidido | sobe o porte e roda só a etapa que faltou, com o delta |

3. Gate de fallback, mesmo formato do fluxo assistido: resumo com cada item, causa e correção proposta. `Aprovar e seguir` aplica a correção proposta. `Reprovar e pedir ajuste` troca a correção pela que Ana disser.
4. Após a correção: o mesmo revisor checa só aqueles itens.
5. Aprovou: `Fallback usado em` recebe a etapa, e o fluxo segue para o próximo gate normal.
6. Reprovou de novo: sem novo ciclo. Gate item a item com Ana. Cada item fica aceito com risco (vai para Riscos do plano), é cortado do escopo ou vira frente manual (Ana faz; no `/executar`, as outras frentes seguem).

Fallback roda uma vez por etapa.

## Fora de escopo

Os "Fora de escopo encontrado" dos retornos se acumulam no `CHANGELOG.md`, uma linha cada. Ninguém age sobre eles durante a demanda. No `/fechar`, cada um recebe destino num gate: vira dossiê de `debito-tecnico` ou `bug` em `backlog`, com `Origem` na demanda, ou é descartado.

## Fora do fluxo de demanda

- `/qa <entrega>`: dossiê em `doc/demandas/qa/`, sem porte e sem CHANGELOG. Defeito vai para o parecer; de entrega própria, pode virar dossiê de `bug`.
- `/revisar-pr <link>`: PR de par em worktree isolado (`code/.revisao/`), relatório no terminal. PR aprovado: destilação pela `iris-arquivista`, como no fechamento.
- `/infra <serviço>`: sobe ou conserta a infra local de um serviço.

## Retro

Ao fim do `/fechar` (ou do `/executar`, se a demanda não vai ser fechada agora), uma linha em `.claude/retro.md`: `data · demanda · tipo · porte · minutos · rodadas de revisão · ajustes pedidos · fallback · linhas de doc · tokens e chamadas por agent (maior e total) · o que atrasou · ajuste proposto`. Tokens e chamadas vêm do `total` do `consumo.json` (`maior`, `contexto_agents`, `chamadas_agents`); no fallback, das notificações, com ≈. Se a conversão chamadas → tokens real divergir mais de 30% da tabela de orçamento, o ajuste proposto corrige a tabela. O ajuste proposto entra num gate próprio; aprovado, o orquestrador aplica no harness e registra no `CHANGELOG.md` da demanda. No mesmo gate, cada ajuste ganha a classe `[framework]` ou `[local]` (seção Git).

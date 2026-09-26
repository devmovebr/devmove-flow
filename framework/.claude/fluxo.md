# Fluxo de demanda

Versão do DevMove Flow: {{VERSAO}} (instalado em {{DATA}}).

Lido pelo orquestrador via `/demanda`, `/retomar` e skills de etapa. Agents não leem este arquivo.

Pasta: `doc/demandas/<AAAA-MM-DD>-<slug>/`. Tudo da demanda mora nela, inclusive arquivo temporário. Nunca criar nada fora dela.

## Porte

Decidido no `/demanda`, confirmado no primeiro gate. Muda quando {{RESPONSAVEL}} pede, quando o fallback sobe o porte ou na reclassificação abaixo.

| Porte | Quando | Etapas |
|---|---|---|
| **P** | rename, débito técnico autoexplicativo, bug com causa conhecida, ajuste de config. 1 serviço, sem regra nova | plano curto → executar → fechar |
| **M** | regra clara, 1 ou 2 serviços, sem contrato novo entre serviços | plano → executar → fechar |
| **G** | regra ambígua, vários serviços, contrato, tabela ou integração nova | negocio → tecnico → plano → executar → fechar |

Critério mais alto vence: contrato novo entre serviços (evento, endpoint consumido por outro serviço, schema compartilhado) ou 3 serviços ou mais é G, mesmo com regra clara. Fora disso, na dúvida entre dois portes, o menor. Relato que diz "não precisa refinar" é P.

**Reclassificação.** Depois do primeiro lote do `consultor-code`, e de novo quando o arquiteto devolver o plano, o orquestrador confere a tabela com os fatos: serviços tocados e contratos novos. Cruzou a linha de outro porte: gate de reclassificação com o porte proposto e o motivo. Subir de M para G roda só as etapas que faltam (negocio e tecnico), aproveitando o que já existe.

## Artefatos e teto de linhas

Cada arquivo tem uma função. Nenhum repete o outro: referencia.

| Arquivo | Diz | Teto |
|---|---|---|
| `negocio.md` | o que precisa ser feito e a regra | 60 |
| `tecnico.md` | o que é impactado, decisões de arquitetura, padrões a seguir, armadilhas | 80 |
| `testes.md` | cenários e comportamento esperado | 50 |
| `plano.md` | onde e o que implementar, por frente, com aceite | P: 40 · M/G: 80 |
| `pendencias.md` | perguntas abertas e quem responde | 20 |
| `CHANGELOG.md` | estado e registro de cada passagem. Permanente | Estado 5 · Registro 40 |
| `mapa.md` | onde está no código o que a demanda toca | 40 |
| `INDEX.md` | uma linha por arquivo | 15 |

Plano aponta, não executa. Proibido no plano e no técnico: DDL completo, código, assinatura de método, lista de arquivo por arquivo com linha, inventário exaustivo do código. Superfície vai no nível serviço → pasta ou módulo → tipo de mudança. O dev acha os arquivos.

Rename e refatoração mecânica: tabela de-para + aceite por comando (`build`, `test`, `grep -ri <nome antigo>` sem resultado). Nome antigo que fica (vocabulário de parceiro, interface externa) entra no plano como lista de símbolos, nunca como pasta.

## CHANGELOG.md

Memória da demanda entre passagens. Nasce no `/demanda` e fica para sempre no dossiê. Todo agent spawnado começa por ele e não recebe histórico por outro meio.

```
# CHANGELOG <slug>

## Estado
Porte: P | M | G · Etapa: <etapa> · Status: em andamento | aguardando gate | ajuste pedido | travada | fechada
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
- Consumo: `subagent_tokens` da notificação é acumulado quando o agent foi retomado por `SendMessage`; `tool_uses` conta só a passada. Registre o delta de tokens (atual menos o da passada anterior do mesmo agent) e as chamadas da passada. A retro soma os deltas.

Sessão nova começa pelo `/retomar`, que lê só este arquivo.

## Contexto

- Agent vivo: correção, ajuste, rechecagem e nova passada vão por `SendMessage` ao agent do mesmo papel que já trabalhou na demanda. Spawn novo só quando ele passou do ponto de bastão, travou ou foi interrompido; o novo nasce lendo `CHANGELOG.md` e a passagem.
- Um agent por papel e por demanda: um `consultor-code`, um `arquiteto` do técnico ao plano, um `revisor`, um `revisor-code` por execução.
- Um `dev-<stack>` por serviço. As frentes do mesmo serviço rodam em sequência no mesmo agent. Paralelo só entre serviços.
- Frente é a subtarefa: pequena o bastante para caber na meta do porte.
- Cache de agent parado vence (1 hora; 5 minutos em alguns planos). Depois disso, o próximo `SendMessage` paga o contexto inteiro sem desconto. Por isso: `revisor-code` sobe assim que o dev devolve `feito`, e a correção sai assim que o revisor devolve. Agent parado além do prazo com mais de 75 chamadas: spawn novo do mesmo papel com `CHANGELOG.md`, `mapa.md` e os itens, em vez de `SendMessage`.

## Mapas: memória compartilhada de código

Subagent não compartilha cache com ninguém. O que um agent descobre no código só chega ao próximo pelo mapa. Dois níveis:

| Mapa | Onde | Teto | Quem escreve |
|---|---|---|---|
| da demanda | `<dossiê>/mapa.md` | 40 linhas | `consultor-code` cria; `dev-<stack>` completa |
| do serviço | `doc/servicos/<serviço>/mapa.md` | 60 linhas | só o `arquivista`, no `/fechar` |

Formato de linha: `- <conceito> · <arquivo> · <símbolo> · <nota curta> · <quem> <data>`. Símbolo, nunca número de linha. Seções do mapa do serviço: Camadas · Onde fica · Padrões · Armadilhas · Comandos próprios.

Qualidade:
- Só entra o que foi visto no código na mesma sessão. Nada deduzido, nada do relato.
- Quem lê e encontra linha errada corrige na hora (dev na demanda) ou registra no retorno (`revisor-code`, `consultor-code` no mapa do serviço). Linha corrigida leva o novo `<quem> <data>`.
- Mapa do serviço com linha verificada há mais de 90 dias: vale como ponto de partida, não como fato; confirme antes de apoiar decisão nele.
- Passou do teto: compacta. Mapa longo volta a custar o que ele economiza.

Uso:
- `consultor-code`: começa pelo mapa do serviço; grava no mapa da demanda o que achou para responder, além de responder.
- `arquiteto`: lê o mapa da demanda no lugar de perguntar de novo.
- `dev-<stack>`: começa pelos dois mapas, vai ao código depois. Anexa ao mapa da demanda o que descobriu e que outro agent vai precisar.
- `revisor-code`: parte do mapa da demanda e do `git diff --stat`.
- `/fechar`: o `arquivista` leva ao mapa do serviço só o que é estrutural (sobrevive à demanda), corrige o que a demanda provou errado e compacta.

Serviço sem mapa: a primeira demanda que o tocar cria, pelo caminho normal (demanda → `/fechar`).

## Teto de rodadas

| Ciclo | Teto | Ao atingir |
|---|---|---|
| Revisão de plano (`revisor`) | 1 passada + 1 rechecagem | fallback (abaixo) |
| Revisão de código (`revisor-code`) | 1 passada + 1 rechecagem | fallback (abaixo) |
| Rodada de `negocio.md` ou `tecnico.md` | 2 | gate com {{RESPONSAVEL}} |
| Perguntas ao `consultor-code` | 1 lote por etapa | segue com o que tem, risco no plano |
| Perguntas a {{RESPONSAVEL}} | 1 lote por etapa | segue com a leitura mais simples |

Premissa de produto que o arquiteto assumiu no plano (padrão ligado ou desligado, limite, prazo) não fica só em Riscos: vira pergunta fechada no gate do plano, dentro do lote da etapa.


## Orçamento de contexto

Janela: Opus 5.5 tem 1M tokens. O teto é em % da janela do agent. O agent não enxerga os próprios tokens, então mede por chamadas de ferramenta, com a conversão abaixo.

**Conversão**: início ≈ 20k a 30k (depende do harness carregado) + ≈ 1,6k por chamada. A primeira retro de cada projeto mede e fixa o valor. Ajustada pela retro com o consumo real (`subagent_tokens` e `tool_uses` da notificação de término de cada agent).

| Porte (dev-<stack>) | Meta | Limite | Passagem de bastão em | Em chamadas: meta · bastão · limite |
|---|---|---|---|---|
| P | 25% | 30%, rodada única | 25% | 90 · 90 · 110 |
| M | 30% | 40% | 35% | 110 · 130 · 150 |
| G | 40% | 50% | 45% | 150 · 170 · 190 |

Outros papéis: `arquiteto`, `revisor`, `revisor-code` até 60 chamadas. `consultor-code`, `arquivista` e `Explore`: até 25 chamadas.

Regras:
- Meta é o esperado. Passar da meta só quando o que falta cabe antes do ponto de bastão.
- Ponto de bastão (limite menos 5%): o agent para de trabalhar e usa o que resta para escrever a passagem. Nunca chega ao limite sem ela.
- Porte P é rodada única: sem continuação. Não terminou: gate com {{RESPONSAVEL}}.
- Briefing traz o porte e as três chamadas da tabela.
- Correção pontual (trace ou `arquivo:linha`): meta de 20 chamadas dentro do mesmo limite.
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
- sem progresso, ou a continuação também voltou `parcial`: gate com {{RESPONSAVEL}} mostrando a passagem. `Aprovar e seguir` (continuação no rumo indicado) ou `Reprovar e pedir ajuste` (frente manual).

Proibido criar instância nova com o mesmo briefing de quem falhou. Cada spawn custa cerca de 30k tokens só para nascer: correções pequenas do mesmo serviço vão juntas num agent só.

## Orquestrador

A sessão do orquestrador segue a mesma lógica, sobre 1M: meta de 40%, ponto de bastão em 45%. No ponto de bastão, atualiza o `CHANGELOG.md` com o `Estado` e o próximo passo exato e pede a {{RESPONSAVEL}} `/clear` e `/retomar`. Fora disso, sessão nova só quando o limite é atingido.

## Modelo

Padrão da v1: todos os agents e spawns em `opus`. Sempre passe `model: opus` em spawn de `Explore` ou `general-purpose`. Esforço por agent não é configurável; vale o esforço da sessão.

Fatos que sustentam a escolha: subagent não compartilha cache com ninguém; trocar de modelo dentro da mesma conversa invalida o cache; no Opus 5.5, trocar o esforço não invalida. O que mais pesa no consumo é número de spawns, de chamadas e de releituras.

A retro registra tokens, chamadas e minutos por demanda. Resultado pior em duas demandas seguidas: propor modelo mais barato nos papéis mecânicos (`consultor-code`, `arquivista`, `Explore`).

Trabalho mecânico em muitos arquivos ou serviços: poucos spawns, cada um com escopo largo. Paralelo só quando os serviços são independentes.

## Briefing de correção

Correção com trace de erro ou `arquivo:linha` (vinda de {{RESPONSAVEL}}, do `revisor-code` ou de uma passagem): o briefing leva o trace e as linhas **literalmente**. É a exceção à regra de não copiar conteúdo. Meta de 20 chamadas. Sem plano, sem frente inteira: só os itens.

## Fluxo assistido

O `/demanda` conduz a demanda inteira. {{RESPONSAVEL}} não digita comando entre etapas: aprova ou pede ajuste.

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
3. `SendMessage` ao agent que produziu a etapa, com o ajuste. Faz só o que {{RESPONSAVEL}} pediu. Spawn novo só se ele passou do bastão.
4. Novo gate.

Ajuste pedido por {{RESPONSAVEL}} não conta no teto de rodadas do agent.

## Fallback: teto atingido

Entra quando uma revisão (`revisor` ou `revisor-code`) reprova depois da rechecagem. A etapa para. Nada de terceira passada.

1. `CHANGELOG.md` com `Status: travada` e os itens reprovados, com o trecho exato.
2. O orquestrador classifica cada item em uma causa, sem abrir código:

| Causa | Sinal | Correção |
|---|---|---|
| **informação** | falta fato de código ou decisão | pergunta fechada ao `consultor-code` ou a {{RESPONSAVEL}} |
| **artefato** | peça ou código não atende o critério | agent produtor, por `SendMessage`, recebe só os itens |
| **critério** | aceite inviável, contraditório ou mal escrito | {{RESPONSAVEL}} reescreve ou corta o critério |
| **porte** | a demanda é maior que o porte decidido | sobe o porte e roda só a etapa que faltou, com o delta |

3. Gate de fallback, mesmo formato do fluxo assistido: resumo com cada item, causa e correção proposta. `Aprovar e seguir` aplica a correção proposta. `Reprovar e pedir ajuste` troca a correção pela que {{RESPONSAVEL}} disser.
4. Após a correção: o mesmo `revisor` ou `revisor-code` checa só aqueles itens.
5. Aprovou: `Fallback usado em` recebe a etapa, e o fluxo segue para o próximo gate normal.
6. Reprovou de novo: sem novo ciclo. Gate item a item com {{RESPONSAVEL}}. Cada item fica aceito com risco (vai para Riscos do plano), é cortado do escopo ou vira frente manual ({{RESPONSAVEL}} faz; no `/executar`, as outras frentes seguem).

Fallback roda uma vez por etapa.

## Retro

Ao fim do `/fechar` (ou do `/executar`, se a demanda não vai ser fechada agora), uma linha em `.claude/retro.md`: `data · demanda · porte · minutos · rodadas de revisão · ajustes pedidos · fallback · linhas de doc · tokens e chamadas por agent (maior e total) · o que atrasou · ajuste proposto`. Se a conversão chamadas → tokens real divergir mais de 30% da tabela de orçamento, o ajuste proposto corrige a tabela. O ajuste proposto entra num gate próprio; aprovado, o orquestrador aplica no harness.

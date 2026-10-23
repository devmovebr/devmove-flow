# Validação do harness: remarcação pelo paciente

Porte M. Regra clara no relato; na abertura eu via api e web. Pela regra "na dúvida, o menor", ficou M. O `consultor-code` mostrou depois que a mensageria entra (`AgendarLembrete`), e o arquiteto criou o contrato `consulta.remarcada`. Pela tabela, isso já é G.
Etapas: abertura e gate de porte, plano (consultor-code, arquiteto, revisor, correção, rechecagem) e gate do plano. Executar não rodou.

## Spawns (notificação de término)
| Agent | Passada | Tokens | Chamadas |
|---|---|---|---|
| consultor-code | lote de 6 perguntas | 20,0k | 9 |
| arquiteto | plano e testes | 27,5k | 14 |
| arquiteto | correção (SendMessage) | 34,1k | 7 |
| revisor | passada: reprovou 3 itens | 24,7k | 9 |
| revisor | rechecagem (SendMessage): aprovou | 29,9k | 2 |

Tetos respeitados: plano 61/80, testes 50/50, mapa 17/40 (o consultor-code informou 16), Estado do CHANGELOG 3/5, Registro 9/40, INDEX do dossiê 10/15, briefings abaixo de 25 linhas. O testes.md ficou no limite exato.

## Problemas no harness
1. **Porte decidido antes dos fatos.** O `/demanda` decide o porte no passo 3, e o número de serviços só aparece no lote do `consultor-code`. Nenhuma regra deixa o orquestrador rever o porte nesse momento: `fluxo.md` diz "muda só se Ana pedir ou o fallback subir o porte", e o fallback só entra depois de duas reprovações. Sugestão: depois do lote, se os fatos cruzam a linha da tabela (serviços ou contrato), fazer um gate de reclassificação.
2. **Tabela de porte com critérios que colidem.** "Regra clara" puxa para M; "3 serviços" e "contrato novo" puxam para G. Falta dizer qual critério pesa mais. Sugestão: G quando houver contrato novo entre serviços, qualquer que seja a clareza da regra.
3. **Porte M sem espaço para decisão de produto.** "Ligada por padrão" e "sem limite de remarcações" foram parar em Riscos como premissa do arquiteto. Ninguém pergunta a Ana, embora `fluxo.md` preveja 1 lote de perguntas a ela por etapa. Sugestão: no passo 5 da skill `plano`, as premissas de produto entram no gate como perguntas fechadas.
4. **Arquiteto sem saída quando falta fato.** `arquiteto.md` manda devolver `bloqueado` com perguntas, mas no porte M o único lote da etapa já foi usado no passo 2 da skill `plano`. Precisei contornar pelo briefing. Sugestão: pôr no agent "lote da etapa já usado: o fato vai para Riscos como não identificado, com a frente que confirma".
5. **Orçamento divergente.** A skill `plano` dá 30 chamadas ao arquiteto; `fluxo.md` diz "até 60". Sugestão: um número só, em `fluxo.md`, e a skill aponta para ele.
6. **Gate por `AskUserQuestion`.** A ferramenta não existia nesta sessão, então o passo 3 do fluxo assistido não roda como está escrito. Sugestão: quando ela faltar, gate em texto com as mesmas duas opções.
7. **Tokens depois de `SendMessage`.** Na retomada, `subagent_tokens` parece acumulado (27,5k para 34,1k; 24,7k para 29,9k), mas `tool_uses` conta só a passada. A retro pede os dois sem dizer qual leitura vale. Sugestão: definir em `fluxo.md` se o registro é o total ou o delta.
8. **Conversão chamadas para tokens.** Pela tabela, 30k + 1,6k por chamada daria 44k ao consultor-code; o real foi 20k (54% abaixo). A regra da retro de divergência acima de 30% dispararia. Sugestão: começar em cerca de 15k e recalibrar na retro.
9. **Dependência entre demandas não tem campo.** A F4 depende da lista-de-espera, que está travada. O `CHANGELOG.md` e o `doc/demandas/INDEX.md` não têm onde registrar isso. Sugestão: linha `Depende de:` no Estado e uma coluna no INDEX de demandas.
10. **Quem atualiza o INDEX do dossiê.** O `consultor-code` criou `mapa.md` e não pôde registrar no INDEX; a skill `plano` só manda atualizar no passo 5. Sugestão: o orquestrador atualiza o INDEX a cada retorno que cria arquivo.

## Fora de escopo encontrado
- Mapas das demandas anteriores divergem na versão de `consulta.cancelada` (v1 no lembrete, v2 na lista de espera).
- `vaga.aberta` e a config por clínica não aparecem em nenhum mapa de serviço.

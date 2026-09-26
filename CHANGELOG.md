# CHANGELOG do DevMove Flow

Cada versão lista as **Novidades** em itens verificáveis. O assistente `setup/atualizar.md` percorre as versões acima da instalada e aplica só o que falta.

Versionamento: `major` muda estrutura (pastas, papéis, formato de arquivo) e pede migração; `minor` acrescenta regra compatível; `patch` corrige texto.

## 1.1.0 (2026-09-26)

Origem: validação com uma demanda nova no `demo/` (`2026-09-26-remarcacao-pelo-paciente/validacao.md`).

Novidades
- [ ] `fluxo.md`, Porte: critério mais alto vence (contrato novo entre serviços ou 3 serviços ou mais é G, mesmo com regra clara).
- [ ] `fluxo.md`, Porte: reclassificação depois do primeiro lote do `consultor-code` e depois do retorno do arquiteto, com gate; subir de M para G roda só as etapas que faltam.
- [ ] `fluxo.md`, Teto de rodadas: premissa de produto assumida pelo arquiteto vira pergunta fechada no gate do plano.
- [ ] `agents/arquiteto.md`: com o lote da etapa já usado, fato que falta vai para Riscos como "não identificado", com a frente que confirma; premissas de produto listadas à parte no retorno.
- [ ] `skills/plano` e `skills/tecnico`: orçamento do arquiteto aponta para o `fluxo.md` (sem número próprio).
- [ ] `skills/plano`: passo de reclassificação e premissas no gate.
- [ ] `fluxo.md`, Fluxo assistido: sem `AskUserQuestion`, gate em texto com as mesmas duas opções.
- [ ] `fluxo.md`, CHANGELOG: consumo registrado como delta de tokens por passada (`subagent_tokens` é acumulado após `SendMessage`).
- [ ] `fluxo.md`, Orçamento: conversão inicial de 20k a 30k + 1,6k por chamada, fixada pela primeira retro do projeto.
- [ ] `fluxo.md`, CHANGELOG: campo `Depende de` no Estado; `doc/demandas/INDEX.md` com coluna `Depende de`.
- [ ] `fluxo.md`, CHANGELOG: orquestrador atualiza o `INDEX.md` do dossiê no turno em que um agent cria arquivo.

Setup (não muda o harness instalado; vale para as próximas instalações)
- `instalar.sh --valores <arquivo>` com `aplicar_valores.py`: marcadores, `dev-<stack>` e hooks aplicados pelo script, porque o Claude Code pede aprovação para cada edição em `.claude/`.
- `valores-exemplo.md` como modelo; o assistente grava `devmove-valores.md` no workspace.
- Rodada 2 do `novo-projeto` pergunta runner de teste, formatador e convenção de commit.
- `git init -b <branch>` com checagem de repositório pai; `.env*` no `.gitignore`.
- Regras de slug sem acento, definição de stack por runtime ou framework, verificação de um `dev-<stack>` por stack.

## 1.0.0 (2026-09-26)

Primeira versão publicada. Equivale ao estado "Versão do harness: 4" do prompt portátil que antecedeu o framework.

Novidades (checklist completo, usado quando a instalação é anterior à 1.0.0):

Estrutura
- [ ] Harness só na raiz: nenhum `.claude/` ou `CLAUDE.md` de harness em subpastas; instrução de subpasta virou rule com `paths`.
- [ ] `.claude/fluxo.md` com as regras do orquestrador, fora de `.claude/rules/`, lido por `/demanda`, `/retomar` e `/executar`.
- [ ] `.claude/rules/` com `principios.md`, `escopo.md`, `comunicacao.md` sem `paths`; `conhecimento.md` e `code.md` com `paths` restritos (conhecimento não casa com `doc/demandas/`).
- [ ] Agents: `consultor-code`, `arquiteto`, `revisor`, `arquivista`, `revisor-code`, um `dev-<stack>` por stack. Nenhum com a ferramenta `Agent`. Todos com `maxTurns` (dev 200, arquiteto e revisores 80, consultor e arquivista 40).

Fluxo
- [ ] Porte P, M, G decidido no `/demanda` e confirmado em gate.
- [ ] Teto de linhas por artefato (negocio 60, tecnico 80, testes 50, plano 40 ou 80, pendencias 20, mapa 40).
- [ ] Plano aponta, não executa: sem código, DDL, assinatura ou lista de arquivo por arquivo. Rename com de-para, aceite por `grep` e nome que fica como lista de símbolos.
- [ ] Fluxo assistido: gate de duas opções ao fim de cada etapa; o usuário só digita `/demanda` ou `/retomar`.
- [ ] Teto de rodadas (revisão 1 + 1 rechecagem; rodada de negocio e tecnico 2; um lote de perguntas por etapa) e fallback com classificação informação, artefato, critério, porte.
- [ ] `CHANGELOG.md` permanente por demanda (Estado reescrito, Registro só cresce).
- [ ] Retro por demanda em `.claude/retro.md`, com tokens e chamadas por agent; ajuste proposto vai a gate.

Agents e contexto
- [ ] Agents vivos: um por papel e por demanda, um dev por serviço; correção, ajuste e rechecagem por `SendMessage`.
- [ ] Revisor de código árbitro do escopo: manda corrigir o que ficou incompleto, roda as buscas de aceite no serviço inteiro.
- [ ] Dev com modo correção (vai direto ao trace), economia de leitura e de teste, orçamento com ponto de bastão e arquivo `passagem/<frente>-<n>.md`.
- [ ] Orçamento em % da janela por porte (P 25/30, M 30/40, G 40/50, bastão no limite menos 5%), convertido em chamadas (30k + 1,6k por chamada), calibrado pela retro.
- [ ] Regra de cache vencido: revisão logo após o dev; agent parado além do prazo com mais de 75 chamadas recebe spawn novo com CHANGELOG, mapa e itens.
- [ ] Mapas de código: `<dossiê>/mapa.md` (consultor cria, dev completa) e `doc/servicos/<serviço>/mapa.md` (arquivista mantém no `/fechar`), por símbolo, com data, teto e regra de compactação.
- [ ] Modelo: `opus` em todos os papéis, medido pela retro.

Skills
- [ ] Entrada: `demanda`, `retomar`. Etapas (sem `disable-model-invocation`): `negocio`, `tecnico`, `plano`, `executar`, `fechar`. Apoio: `brief`, `faq`, `processo`, `entregavel`, `novo-agent`.
- [ ] Sem skill de pendências separada (absorvida por `retomar`).

Marca
- [ ] `Versão do DevMove Flow: 1.0.0 (instalado em <data>)` no topo de `.claude/fluxo.md`.

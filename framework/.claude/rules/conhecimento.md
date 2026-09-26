---
paths:
  - "doc/servicos/**"
  - "doc/produtos/**"
  - "doc/faqs/**"
  - "doc/processos-internos/**"
  - "doc/entregaveis/**"
  - "doc/INDEX.md"
---

# Conhecimento em doc/

Segundo cérebro de {{PROJETO}}: {{DESCRICAO}}. Sem código. Idioma: {{IDIOMA}}.

## Mapa

| Pasta | O quê |
|---|---|
| `doc/servicos/<servico>/` | conhecimento por serviço, com `mapa.md` do código |
| `doc/produtos/<modulo>/` | regra de negócio que atravessa serviços. Todo item declara escopo (`modulo` ou `modulo@servico`) |
| `doc/demandas/` | dossiês (regras em `.claude/fluxo.md`) |
| `doc/entregaveis/` | documento para audiência de fora (`/entregavel`) |
| `doc/faqs/` | camada de {{RESPONSAVEL}}. Só escreve quando pedido |
| `doc/processos-internos/` | procedimentos do time |

Leia `INDEX.md` primeiro. Carregue 1 ou 2 domínios, nunca a árvore.

## Domínio

- `fatos.md`: `- <afirmação>. *<fonte>, <data>, verificado <data>*`. Verificado há mais de 90 dias é `stale`: não sustenta plano sem revalidação.
- `hipoteses.md`: `### H<n> <enunciado>`, `Falseada se:` escrito antes da evidência, `Evidência: n/3` com `[classe|artefato] descrição (data)`. Classes: `codigo`, `ambiente`, `humano`, `terceiro`, `revisao`, `execucao`. Seções `## Ativas`, `## Promovidas`, `## Rejeitadas`.
- `leis.md`: `- **L<n> <imperativo>.** <por quê>. *promovida <data> após <n> confirmações (<ids>)*`.
- `mapa.md` (só em serviço, até 60 linhas): onde fica cada coisa no código, com arquivo, símbolo e data. Regras em `.claude/fluxo.md`, seção Mapas.

Ciclo: 3 confirmações independentes sem contra-exemplo → lei. Lei contrariada volta a hipótese. 2 contra-exemplos → rejeitada. Nada é deletado: item que sai deixa lápide. Só o `arquivista` escreve em `servicos/` e `produtos/`.

## Índices

Criar, mover ou remover arquivo atualiza o `INDEX.md` daquele nível na mesma mudança.

## Código

Agent de doc nunca abre `code/`. Pergunta sobre código vai em lote ao `consultor-code`. Resposta vira fato com fonte `consultor-code, <data>`, classe `codigo`.

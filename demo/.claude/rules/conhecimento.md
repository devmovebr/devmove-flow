---
paths:
  - "doc/servicos/**"
  - "doc/produtos/**"
  - "doc/integracoes/**"
  - "doc/arquitetura/**"
  - "doc/faqs/**"
  - "doc/processos-internos/**"
  - "doc/entregaveis/**"
  - "doc/INDEX.md"
---

# Conhecimento em doc/

Segundo cérebro de Consultto: SaaS multi-tenant de agenda online e cobrança para clínicas de saúde independentes, com página pública de agendamento, lembretes por WhatsApp e assinatura mensal por plano. Sem código. Idioma: português do Brasil.

## Mapa

| Pasta | O quê |
|---|---|
| `doc/servicos/<servico>/` | conhecimento por serviço, com `mapa.md` do código |
| `doc/produtos/<modulo>/` | regra de negócio que atravessa serviços. Todo item declara escopo (`modulo` ou `modulo@servico`) |
| `doc/integracoes/<parceiro>/` | contrato e comportamento de parceiro externo. Contrato original em `referencia/`, sem edição |
| `doc/arquitetura/` | fato transversal: ambientes e URLs base, autenticação entre serviços, formato de erro, padrões comuns |
| `doc/demandas/<tipo>/` | dossiês por tipo: `feature`, `bug`, `debito-tecnico`, `qa` (regras em `.claude/fluxo.md`) |
| `doc/entregaveis/` | documento para audiência de fora (`/entregavel`) |
| `doc/faqs/` | camada de Ana. Só escreve quando pedido |
| `doc/processos-internos/` | procedimentos do time |

Leia `INDEX.md` primeiro. Carregue 1 ou 2 domínios, nunca a árvore.

## Domínio

- `fatos.md`: `- <afirmação>. *<fonte>, <data>, verificado <data>*`. Verificado há mais de 90 dias é `stale`: não sustenta plano sem revalidação.
- `hipoteses.md`: `### H<n> <enunciado>`, `Falseada se:` escrito antes da evidência, `Evidência: n/3` com `[classe|artefato] descrição (data)`. Classes: `codigo`, `ambiente`, `humano`, `terceiro`, `revisao`, `execucao`. Seções `## Ativas`, `## Promovidas`, `## Rejeitadas`.
- `leis.md`: `- **L<n> <imperativo>.** <por quê>. *promovida <data> após <n> confirmações (<ids>)*`.
- `mapa.md` (só em serviço, até 60 linhas): onde fica cada coisa no código, com arquivo, símbolo e data. Regras em `.claude/fluxo.md`, seção Mapas.
- `visao.md` (opcional, em produto, até 30 linhas): o que o produto é, para quem, parceiros e o que está em produção.
- `referencia/` (em integração e onde houver material original): PDF, collection, especificação. Nunca editado; o `INDEX.md` diz versão e data.

Ciclo: 3 confirmações independentes sem contra-exemplo → lei. Lei contrariada volta a hipótese. 2 contra-exemplos → rejeitada. Nada é deletado: item que sai deixa lápide. Planejado não é implementado. Decisão de uma demanda fica no dossiê, não na base. Só a `iris-arquivista` escreve em `servicos/`, `produtos/`, `integracoes/` e `arquitetura/`.

## Índices

Criar, mover ou remover arquivo atualiza o `INDEX.md` daquele nível na mesma mudança.

## Código

Agent de doc nunca abre `code/`. Pergunta sobre código vai em lote ao `caio-consultor-code`. Resposta vira fato com fonte `caio-consultor-code, <data>`, classe `codigo`.

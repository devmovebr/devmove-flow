---
name: entregavel
description: Compila conhecimento e dossiês num documento datado para audiência de fora do time (PO, diretoria, auditoria, parceiro). Uso: /entregavel <módulo ou serviço> para <audiência>
disable-model-invocation: true
---
Faltando a audiência, pergunte antes de ler qualquer coisa.

1. **Audiência** em uma frase: quem lê, que decisão toma, o que já sabe. Com ela, tamanho e registro:

| Leitor | Tamanho | Registro |
|---|---|---|
| opera, não programa | o mais curto que responda | desenho no lugar de parágrafo, zero jargão |
| vai integrar | referência completa | campo a campo, exemplo executável |
| decide | uma leitura | estado, risco, o que falta |

2. **Levantamento**: `doc/produtos/<modulo>/INDEX.md` ou `doc/servicos/<servico>/INDEX.md`, e os dossiês que ele aponta. Muitos dossiês: um `Explore` com `model: sonnet` por dossiê, em paralelo. Só peça vigente.
3. **Admissão**: lei (como regra do produto, sem rastro), fato fresco, peça vigente e pendência aberta (obrigatória, em seção própria) entram. Fato `stale`: revalide com o `caio-consultor-code` ou carimbe a data. Hipótese e peça superada não entram.
4. **Redação** em `doc/entregaveis/<AAAA-MM-DD>-<slug>/`, um arquivo por audiência. Cabeçalho: audiência, data de corte, estado do módulo, o que não cobre. Estado por capacidade: `implementado`, `em produção` ou `ligado`. O corpo não cita caminho interno, wikilink, id de hipótese, agent ou skill.
5. `INDEX.md` do entregável: audiência, data de corte, link publicado, tabela seção → origem, o que ficou de fora.
6. **Revisão**: `vera-revisor`, checklist de entregável, 1 passada + 1 rechecagem. Reprovou de novo: fallback de `.claude/fluxo.md`.
7. **Publicação**: audiência que não abre o repositório recebe também um Artifact, com a mesma data de corte. Gate final com o link.

Entregável é projeção datada. Não escreve em `doc/servicos/` nem `doc/produtos/`; descoberta vai para o `/fechar` ou a `iris-arquivista`. Versão nova troca a data de corte e deixa lápide na anterior.

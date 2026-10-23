---
name: mem0
description: Projeta o conhecimento da base no Mem0, para agentes externos sem acesso ao filesystem. Mão única: os arquivos são a fonte de verdade. Opcional, só em workspace com o MCP mem0. Uso: /mem0 [sync | limpar]
disable-model-invocation: true
---
`$ARGUMENTS`: `sync` · `limpar` · vazio (relatório do que está fora de sincronia).

| Publica | Não publica |
|---|---|
| `leis.md`: sempre | hipóteses |
| `fatos.md` não `stale` | rejeitadas e lápides |
| `fatos.md` `stale`, com ressalva no texto | `doc/demandas/` |

Toda memória carrega o ID de origem (`<dominio>/L2`, `<servico>/F7`) e o escopo. Categorias: `servico/<nome>` · `produto/<nome>` · `integracao/<nome>` · `arquitetura` · `processo` · `faq`.

1. Confirme o escopo com {{RESPONSAVEL}} numa pergunta fechada.
2. Spawn da `iris-arquivista`: listar leis e fatos vigentes do escopo, com origem.
3. `sync`: publica pelo MCP `mem0`, atualizando por ID de origem. Lei rebaixada no arquivo é removida do Mem0 na mesma passada.
4. `limpar`: apaga tudo do escopo antes de reindexar, só com confirmação. Nunca remoção fora do escopo.

Divergiu, o arquivo ganha. O Mem0 é descartável e regenerável.

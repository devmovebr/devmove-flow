---
name: melhoria
description: Absorve no framework as melhorias de harness marcadas [framework] nas cópias, publica a versão nova com tag e atualiza o demo. Roda sem gate (rotina semanal). Uso: /melhoria
---
Roda na raiz do devmove-flow. Sem pergunta ao usuário: o que não dá para decidir sozinho fica fora desta versão e entra no relatório.

1. `git status --short` limpo e branch `main` atualizada (`git pull --ff-only`). Sujo: para e relata.
2. `python3 tools/coletar_melhorias.py`. Cópia sem acesso ou com push pendente: segue com as outras e relata. Nenhum commit `[framework]` novo: passo 3, depois passo 10.
3. Valores das cópias: `python3 tools/vazamento.py` antes de mexer em qualquer arquivo. É ele que monta os termos proibidos a partir do `devmove-valores.md` de cada cópia, lido a cada execução. Cópia sem o arquivo (código 2): não publica nada nesta execução e relata. Cópia com o arquivo desatualizado: os itens faltantes entram nos termos mesmo assim e vão para o relatório, para a cópia atualizar.
4. Para cada diff em `.instancias/coleta/`, na ordem da saída, decide:
   - **absorver**: a regra vale para qualquer projeto. Aplica em `framework/` na forma genérica: arquivo da cópia mapeado para o modelo (`<apelido>-dev-<stack>.md` → `agents/dev.md`, `rules/code/servicos/<serviço>.md` → `servico.md`), valor do projeto trocado pelo marcador de `setup/lib/marcadores.md`, exemplo trocado por um do domínio do `demo/`.
   - **já coberto**: o framework já tem a regra, com outro texto ou vinda de outra cópia.
   - **recusar**: a regra só faz sentido no projeto, conflita com o framework ou depende de decisão. Motivo em uma frase genérica.
   O diff traz contexto da cópia: nome de cliente, serviço, parceiro, pessoa, URL, número e trecho de dossiê nunca entram no framework, no `CHANGELOG.md` nem na mensagem de commit. Contexto de uma cópia nunca vai para outra.
5. Nada absorvido: pula para o passo 10.
6. Versão: patch para texto, minor para regra, skill, agent ou tool nova, major para estrutura de pastas. Major: não publica; relata a proposta de Migração e para. Sobe `VERSION`; no `CHANGELOG.md`, Novidades da versão em itens verificáveis, cada um com `(<cópia>@<hash>)`.
7. Demo: `python3 framework/tools/atualizar_framework.py --fonte . --workspace demo`. Conflito: resolve no `demo/`, que não tem regra local.
8. Vazamento: `git add -A` e `python3 tools/vazamento.py`. Achado: corrige o texto e roda de novo. Achado que não sai ou código 2: `git restore --staged .`, `git checkout .`, não publica e relata.
9. Publicação: commit `feat(framework): <assunto da versao>` (Conventional Commits, português sem acento, assunto até 72 caracteres, sem atribuição ao Claude), tag `v<versão>` anotada com o mesmo assunto.
10. `python3 tools/coletar_melhorias.py --marcar`, linha por commit lido em `tools/melhorias.md` e commit `chore(melhoria): registra leitura das copias` se algo mudou. Push da `main` e da tag (`git push origin main --follow-tags`). É o único push permitido neste repositório sem pedido.
11. Relatório até 15 linhas: versão publicada (ou nenhuma), absorvidos, já cobertos, recusados com motivo, cópias sem acesso, achados de vazamento, cópias com `devmove-valores.md` ausente ou desatualizado.

`tools/melhorias.md` recebe uma linha por commit `[framework]` lido: `data · cópia@hash · destino (vX.Y.Z, já coberto, recusado) · motivo genérico`.

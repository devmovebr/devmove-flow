---
name: processo
description: Estrutura um processo interno narrado por Ana (GMUD, deploy, merge, aprovação) em procedimento executável. Uso: /processo <narrativa>
disable-model-invocation: true
---
`$ARGUMENTS` = a narrativa. Vazio: peça para ele contar.

1. Escute inteiro antes de estruturar.
2. Extraia: gatilho, pré-requisitos, passos ordenados, quem faz cada passo, artefatos, critério de pronto, onde costuma travar.
3. O que ficou implícito (ordem, aprovação, o que trava): um lote de perguntas fechadas.
4. Salve `doc/processos-internos/processo-<nome>.md`, frontmatter `tipo: processo`, `data`, `autor`, e atualize o `INDEX.md` da pasta.
5. Regra que restringe implementação vira fato no domínio certo, pelo `arquivista`.
6. Gate: aprovar salva; ajuste reescreve o trecho apontado.

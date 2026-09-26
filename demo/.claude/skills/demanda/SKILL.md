---
name: demanda
description: Abre uma demanda, decide o porte e conduz o fluxo inteiro com gate de aprovação ao fim de cada etapa. Uso: /demanda <nome ou relato>
disable-model-invocation: true
---
Leia `.claude/fluxo.md` antes de tudo. Ele vale para esta sessão inteira.

`$ARGUMENTS` = nome ou relato. Vazio: lista os dossiês de `doc/demandas/INDEX.md` e pergunta qual. Dossiê que já existe: segue como `/retomar`.

1. Cria `doc/demandas/<AAAA-MM-DD>-<slug>/` com o relato em `bruto/relato.md`, sem tratamento. Material bruto com mais de 5 arquivos: triagem pelo `arquivista` (`model: opus`).
2. Lê as 5 últimas linhas de `.claude/retro.md`.
3. Decide porte e etapas pela tabela de `.claude/fluxo.md`. Grava `INDEX.md`, `CHANGELOG.md` e a linha em `doc/demandas/INDEX.md`.
4. Gate de porte: resumo com porte, etapas, serviços. Ajuste pedido costuma ser troca de porte.
5. Conduz as etapas em ordem, invocando a skill de cada uma: `negocio`, `tecnico`, `plano`, `executar`, `fechar`. Porte P: a etapa de plano é o passo 6 abaixo, não a skill `plano`.
6. Plano do porte P: precisa de fato de código? Um lote ao `consultor-code`, com o caminho do dossiê (ele grava o `mapa.md`). Você escreve `plano.md` (até 40 linhas: de-para ou mudança, frente única, aceite por comando). Gate.

Toda etapa termina no gate do fluxo assistido (`.claude/fluxo.md`). Aprovado: próxima etapa no mesmo turno, sem esperar comando. Travou no teto: fallback da mesma regra.

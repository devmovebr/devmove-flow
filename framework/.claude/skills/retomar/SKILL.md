---
name: retomar
description: Retoma uma demanda pelo CHANGELOG.md em sessão nova, depois de dias, quando chegam respostas de pendência ou quando um débito do backlog é priorizado. Continua o fluxo assistido de onde parou. Uso: /retomar <dossiê>
disable-model-invocation: true
---
Leia `.claude/fluxo.md` antes de tudo. Ele vale para esta sessão inteira.

`$ARGUMENTS` = dossiê (`<tipo>/<pasta>` ou só a pasta, procurada em `doc/demandas/*/`). Vazio: lista os dossiês cujo `CHANGELOG.md` não está `fechada` e pergunta qual. Dossiê de `qa/`: segue como `/qa`.

1. Lê só `CHANGELOG.md` e, se houver pendência aberta, `pendencias.md`.
2. Pelo `Status`:
   - `backlog`: débito ou bug priorizado. Decide o porte e faz o gate de porte (`/demanda`, passo 4).
   - `aguardando gate`: refaz o gate da etapa.
   - `ajuste pedido`: aplica o ajuste registrado e faz o gate.
   - `em andamento`: roda a etapa de novo, a partir do arquivo que ela produz e do "Próximo passo".
   - `travada`: entra no fallback de `.claude/fluxo.md`, passo 2, com os itens de "Reprovado em aberto".
   - `fechada`: diz isso. Pedido novo sobre ela: etapa `pós-fechamento` (`.claude/fluxo.md`, CHANGELOG).
3. Pendência aberta com resposta trazida por {{RESPONSAVEL}}: marca `respondida` em `pendencias.md` e atualiza só o arquivo que a resposta altera (`negocio.md`, `tecnico.md` ou `plano.md`), pelo agent que o produziu. Depois, gate da etapa.
4. Agent da sessão anterior não existe mais: spawn novo do mesmo papel, com briefing que começa pelo `CHANGELOG.md` e pela última passagem ou retorno em `passagem/`.
5. Continua o fluxo assistido até o fim ou até {{RESPONSAVEL}} parar.

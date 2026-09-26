---
name: retomar
description: Retoma uma demanda pelo CHANGELOG.md em sessão nova, depois de dias, ou quando chegam respostas de pendência. Continua o fluxo assistido de onde parou. Uso: /retomar <pasta-do-dossiê>
disable-model-invocation: true
---
Leia `.claude/fluxo.md` antes de tudo. Ele vale para esta sessão inteira.

`$ARGUMENTS` = pasta em `doc/demandas/`. Vazio: lista os dossiês cujo `CHANGELOG.md` não está `fechada` e pergunta qual.

1. Lê só `CHANGELOG.md` e, se houver pendência aberta, `pendencias.md`.
2. Pelo `Status`:
   - `aguardando gate`: refaz o gate da etapa.
   - `ajuste pedido`: aplica o ajuste registrado e faz o gate.
   - `em andamento`: roda a etapa de novo, a partir do arquivo que ela produz.
   - `travada`: entra no fallback de `.claude/fluxo.md`, passo 2.
3. Pendência aberta com resposta trazida por {{RESPONSAVEL}}: marca `respondida` em `pendencias.md` e atualiza só o arquivo que a resposta altera (`negocio.md`, `tecnico.md` ou `plano.md`), pelo agent que o produziu. Depois, gate da etapa.
4. Continua o fluxo assistido até o fim ou até {{RESPONSAVEL}} parar.

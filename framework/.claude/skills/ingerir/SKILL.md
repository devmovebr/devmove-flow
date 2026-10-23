---
name: ingerir
description: Incorpora material novo a uma demanda (bruto/) ou à base de conhecimento, com origem preservada. Uso: /ingerir <caminho> [dossiê ou domínio]
disable-model-invocation: true
---
- Material de demanda: copie para `bruto/` do dossiê sem editar, linha no `INDEX.md` do dossiê e uma entrada no `CHANGELOG.md`. Material que muda peça já aprovada: o gate da etapa daquela peça é refeito.
- Material de conhecimento: spawn da `iris-arquivista` com o caminho e o domínio. Contrato de parceiro vai para `doc/integracoes/<parceiro>/referencia/`. Ela registra com fonte e data e atualiza só os índices tocados.
- Sem destino claro: uma pergunta fechada a {{RESPONSAVEL}}.

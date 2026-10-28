---
name: infra
description: Sobe, diagnostica ou conserta a infra local para um serviço rodar na máquina com as dependências do aceite. Uso: /infra <serviço> [erro]
disable-model-invocation: true
---
`$ARGUMENTS` = serviço e, se houver, o erro.

1. Confere o estado com `tools/apps.sh listar` e a ferramenta de `tools/` (ou `docker compose ps`). Tudo de pé e o serviço responde no health da rule do serviço: diga isso e pare.
2. Senão, spawn do `igor-infra-local` com o serviço e o erro. Orçamento: 60 chamadas.
3. Relate causa, o que mudou e a prova, em até 5 linhas. `bloqueado: ambiente`: pergunta fechada a Ana (VPN, credencial, Docker parado).
4. Variável ou sequência de subida que se repete: proponha ferramenta nova em `tools/` ou linha na rule do serviço, num gate.

---
name: tecnico
description: Etapa de refinamento técnico do fluxo de demanda (só porte G). O arquiteto escreve tecnico.md até 80 linhas. Chamada pelo /demanda ou /retomar.
---
Dossiê corrente. Só porte G. Pré-requisito: `negocio.md` aprovado no gate.

1. Perguntas de código: um lote ao `caio-consultor-code`, com o caminho do dossiê para gravar o `mapa.md` e a branch de integração (o mesmo do negócio, por `SendMessage`, quando houver), em paralelo com o passo 2 quando independem.
2. Spawna `theo-arquiteto` (fica vivo para o plano): escrever `tecnico.md` (até 80 linhas), ler `negocio.md`, as `leis.md` dos domínios, o contrato do parceiro quando houver integração e a resposta do consultor. Orçamento: o de `.claude/fluxo.md`.
3. Lê só o retorno. Abre `tecnico.md` apenas se houver decisão com trade-off; contesta uma vez, em lote.
4. Gate, com as decisões de arquitetura no resumo. Próxima etapa: `plano`.

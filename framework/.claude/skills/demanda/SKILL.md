---
name: demanda
description: Abre uma demanda (feature, bug ou débito técnico), decide tipo e porte e conduz o fluxo inteiro com gate de aprovação ao fim de cada etapa. Uso: /demanda <nome ou relato>
disable-model-invocation: true
---
Antes de tudo, `python3 <workspace>/tools/atualizar_framework.py` e o tratamento da saída em `.claude/fluxo.md`, seção Versão do harness. Depois, leia `.claude/fluxo.md`. Ele vale para esta sessão inteira.

`$ARGUMENTS` = nome ou relato. Vazio: lista os dossiês abertos dos `INDEX.md` de `doc/demandas/feature/`, `bug/` e `debito-tecnico/` e pergunta qual. Dossiê que já existe: segue como `/retomar`. Pedido de teste de entrega: segue como `/qa`.

1. Decide o tipo pela tabela de `.claude/fluxo.md` (melhoria, mesmo pequena, é feature). Cria `doc/demandas/<tipo>/<AAAA-MM-DD>-<slug>/` com o relato em `bruto/relato.md`, sem tratamento. Material bruto com mais de 5 arquivos: triagem pela `iris-arquivista`.
2. Lê as 5 últimas linhas de `.claude/retro.md`.
3. Decide porte e etapas pela tabela de `.claude/fluxo.md`. Grava `INDEX.md`, `CHANGELOG.md` e a linha no `INDEX.md` do tipo. Feature grande demais para um dossiê: propõe épico (`fases.md` pelo `theo-arquiteto`, uma fase por dossiê).
4. Gate de tipo e porte: resumo com tipo, porte, etapas, serviços. Ajuste pedido costuma ser troca de porte. Débito que {{RESPONSAVEL}} não quer executar agora: `Status: backlog` e para.
5. Conduz as etapas em ordem, invocando a skill de cada uma: `negocio`, `tecnico`, `plano`, `executar`, `fechar`. Porte P: a etapa de plano é o passo 6 abaixo, não a skill `plano`.
6. Plano do porte P: precisa de fato de código? Um lote ao `caio-consultor-code`, com o caminho do dossiê (ele grava o `mapa.md`). Bug ou feature que toca integração: o mesmo lote confere o campo no contrato de `doc/integracoes/<parceiro>/referencia/`. Você escreve `plano.md` (até 40 linhas: de-para ou mudança, frente única, aceite por comando; bug com reprodução e regressão). Gate de porte e de plano juntos quando o plano cabe na mesma resposta.

Toda etapa termina no gate do fluxo assistido (`.claude/fluxo.md`). Aprovado: próxima etapa no mesmo turno, sem esperar comando. Travou no teto: fallback da mesma regra.

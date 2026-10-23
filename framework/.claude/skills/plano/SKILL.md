---
name: plano
description: Etapa de plano do fluxo de demanda (portes M e G). O arquiteto escreve plano.md e testes.md; a revisora aprova em 1 passada + 1 rechecagem. Chamada pelo /demanda ou /retomar.
---
Dossiê corrente.

1. `pendencias.md` com bloqueante aberta: gate com ela antes de seguir.
2. Porte M sem fato de código conhecido: um lote ao `caio-consultor-code` antes, com o caminho do dossiê (ele grava o `mapa.md`) e a branch de integração. Uma das perguntas inventaria o conceito da demanda por padrão de código (grep pelo conceito, não só pelos nomes do relato), para achar réplicas que o relato não citou. Bug: localizar a causa. Integração: conferir o campo no contrato do parceiro.
3. Depois do lote do consultor e depois do retorno do arquiteto: reclassificação de porte (`.claude/fluxo.md`, Porte).
4. `theo-arquiteto` (o mesmo do técnico, por `SendMessage`, quando houver; senão spawn): escrever `plano.md` (até 80 linhas) e `testes.md` (até 50), ler `negocio.md` e `tecnico.md` quando existirem, e `bruto/` no porte M. Orçamento: o de `.claude/fluxo.md`.
5. Spawna `vera-revisor` com o caminho do plano e os tetos. Reprovado: `SendMessage` ao mesmo `theo-arquiteto` com os itens; depois ao mesmo `vera-revisor` para a rechecagem. Reprovou de novo: fallback (`.claude/fluxo.md`).
6. Atualiza `INDEX.md`. Gate com frentes e critérios no resumo, e as premissas de produto do arquiteto como perguntas fechadas. Próxima etapa: `executar`.

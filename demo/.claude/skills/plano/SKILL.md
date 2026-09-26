---
name: plano
description: Etapa de plano do fluxo de demanda (portes M e G). O arquiteto escreve plano.md e testes.md; o revisor aprova em 1 passada + 1 rechecagem. Chamada pelo /demanda ou /retomar.
---
Dossiê corrente.

1. `pendencias.md` com bloqueante aberta: gate com ela antes de seguir.
2. Depois do lote do consultor e depois do retorno do arquiteto: reclassificação de porte (`.claude/fluxo.md`, Porte). Porte M sem fato de código conhecido: um lote ao `consultor-code` antes, com o caminho do dossiê (ele grava o `mapa.md`). Uma das perguntas inventaria o conceito da demanda por padrão de código (grep pelo conceito, não só pelos nomes do relato), para achar réplicas que o relato não citou.
3. `arquiteto` (o mesmo do técnico, por `SendMessage`, quando houver; senão spawn): escrever `plano.md` (até 80 linhas) e `testes.md` (até 50), ler `negocio.md` e `tecnico.md` quando existirem, e `bruto/` no porte M. Orçamento: o de `.claude/fluxo.md` para o arquiteto.
4. Spawna `revisor` com o caminho do plano. Reprovado: `SendMessage` ao mesmo `arquiteto` com os itens; depois ao mesmo `revisor` para a rechecagem. Reprovou de novo: fallback (`.claude/fluxo.md`).
5. Atualiza `INDEX.md`. Gate com frentes e critérios no resumo, e as premissas de produto do arquiteto como perguntas fechadas. Próxima etapa: `executar`.

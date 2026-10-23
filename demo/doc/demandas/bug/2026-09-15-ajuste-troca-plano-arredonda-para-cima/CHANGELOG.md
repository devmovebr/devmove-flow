# CHANGELOG ajuste-troca-plano-arredonda-para-cima

## Estado
Tipo: bug · Porte: P · Etapa: fechar · Status: fechada
Próximo passo: nenhum
Início: 2026-09-15 09:00 · Fallback usado em: nenhum · Depende de: nenhum

## Registro
- 2026-09-15 09:00 · demanda · orquestrador · dossiê aberto a partir do parecer de QA (T3); bug com causa a localizar no serviço conhecido · porte P proposto
- 2026-09-15 09:12 · plano · caio-consultor-code · causa em `calcular_ajuste` (round sobre float); mapa.md 2 linhas · feito (31k, 6 chamadas)
- 2026-09-15 09:20 · plano · orquestrador · plano.md 27 linhas: reprodução, causa, F1, aceite de regressão · gate de porte e plano juntos
- 2026-09-15 09:24 · plano · Ana · gate · aprovado
- 2026-09-15 09:25 · executar · orquestrador · `fix/112-ajuste-troca-arredonda` criada em `cobranca` a partir de `main`, repo limpo
- 2026-09-15 09:58 · executar F1 · sam-dev-python · ajuste com `Centavos` e divisão inteira; teste novo do dia 10; retorno em passagem/retorno-F1.md · feito (68k, 24 chamadas)
- 2026-09-15 10:06 · executar · rita-revisor-code · aprovado na 1ª passada; grep do harness sem ocorrência · nenhum contrato alterado
- 2026-09-15 10:10 · executar · Ana · gate · aprovado; commit `9c1e2aa` em `cobranca` pelo orquestrador
- 2026-09-16 08:30 · fechar · orquestrador · fechamento.md; QA reexecutou T3 em staging: PASSOU · fechada

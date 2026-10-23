# CHANGELOG lista-de-espera

## Estado
Tipo: feature · Porte: G · Etapa: executar · Status: travada
Próximo passo: gate de fallback de F2 (causa informação: template `vaga_aberta` não aprovado); F1 e F3 aprovadas
Início: 2026-09-20 09:30 · Fallback usado em: executar (F2)
Reprovado em aberto: F2 "envio usa template `vaga_aberta`, que o provedor ainda não aprovou; teste passa só com mock" (revisor-code, rechecagem)

## Registro
- 2026-09-20 09:30 · demanda · orquestrador · porte G, api, mensageria e web · aprovado no gate
- 2026-09-20 10:10 · negocio · orquestrador · negocio.md 18 linhas; 4 contrapontos; P1 aberta · aprovado no gate
- 2026-09-20 10:50 · tecnico · consultor-code · 1 lote, 5 perguntas; mapa.md 8 linhas · feito (47k, 20 chamadas)
- 2026-09-20 11:25 · tecnico · arquiteto · tecnico.md 25 linhas · aprovado no gate
- 2026-09-21 09:00 · plano · arquiteto (SendMessage) · plano.md 31 linhas, testes.md 14 linhas · feito
- 2026-09-21 09:18 · plano · revisor · aprovado · aprovado no gate
- 2026-09-22 15:00 · executar · dev-node (api) · F1 feita · feito (205k, 104 chamadas)
- 2026-09-22 15:20 · executar · dev-go (mensageria) · F2 feita · feito (120k, 55 chamadas)
- 2026-09-22 16:40 · executar · dev-node (web) · F3 feita · feito (150k, 71 chamadas)
- 2026-09-22 17:00 · executar · revisor-code · F1 e F3 aprovadas; F2 reprovada: template não aprovado no provedor · 1 item
- 2026-09-22 17:12 · executar · dev-go (SendMessage) · pedido de aprovação do template enviado; teste com mock mantido · feito
- 2026-09-22 17:20 · executar · revisor-code (rechecagem) · F2 reprovada de novo, mesmo item · travada

# Fechamento desmarcar-consulta-recepcao

Execução simulada: os repositórios só têm README. Nenhum código, teste ou commit de código.

## Entregue (previsto) por serviço
- api: estado `desmarcada` com autor, instante e motivo; `POST /agenda/consultas/:id/desmarcar` {motivo} → 200/400/403/404/409; só `agendada`, da clínica, com início futuro; disponibilidade e reserva ignoram `desmarcada`; perfis recepção e administrador. Commit: nenhum (simulado).
- web: tela mínima de agenda do dia em `(painel)` com ação Desmarcar, confirmação e motivo obrigatório; horário livre no `SeletorHorario` sem recarregar. Commit: nenhum (simulado).

## Desvios
- Tela de agenda do dia não existia; o briefing da web mandou seguir, contra plano.md:48. A revisão pegou e Ana aprovou criar versão mínima.
- Motivo obrigatório (CA6) entrou no plano pelo gate das premissas.
- Python ausente: harness não verificado e consumo anotado à mão.

## Hipóteses exercitadas
- Sem evidência: todos os fatos de código vieram dos mapas de serviço (api, web, mensageria), nenhum confirmado em código.
- Sem evidência: `DisponibilidadeService.listar` filtrar por estado; existência do estado `cancelada` (colisão com débito remover-consulta-cancelada-v1).
- Revisão de código achou 2 furos reais no previsto da api: where sem horário (CA4) e teste de concorrência fora do comando de aceite.

## Fatos encontrados errados
- doc/servicos/api/mapa.md mandava `make db-local`, que não existe; o caminho é `tools/db-local.sh` (corrigido no mapa).

## Fora de escopo
- Lembrete WhatsApp + evento de desmarcação → bug/2026-10-26-lembrete-consulta-desmarcada (backlog).
- Avisar o paciente; restante da agenda do dia → descartados (viram /demanda quando priorizados).

## Sugestão de harness (não aplicada)
- [framework] skill executar, passo 4: o briefing do dev aponta as condições de parada do plano e nunca as reescreve. Ana pediu só registro; aplicar exige autorização explícita.

# CHANGELOG desmarcar-consulta-recepcao

## Estado
Tipo: feature · Porte: M · Etapa: fechar · Status: fechada
Próximo passo: nenhum
Início: 2026-10-26 22:25 · Fallback usado em: nenhum · Depende de: nenhum

## Registro
- 2026-10-26 22:25 · demanda · orquestrador · dossiê criado com bruto/relato.md; harness não verificado (python ausente), consumo manual por notificação · feature M, api e web
- 2026-10-26 · gate tipo e porte · Ana · aprovado: feature M, api e web · aprovado
- 2026-10-26 · plano · caio-consultor-code · mapa.md só a partir dos mapas de serviço (repos só com README); candidatos: DisponibilidadeService.listar, EventosPublisher, AgendarLembrete; débito remover-consulta-cancelada-v1 pode colidir · parcial · consumo 18k/4
- 2026-10-26 · reclassificação · orquestrador · mantém M: nenhum contrato novo confirmado; cancelar lembrete vira premissa no gate do plano
- 2026-10-26 · plano · theo-arquiteto · plano.md (55) e testes.md (33), 2 frentes api → web, 6 premissas P1 a P6 · feito · consumo 25k/7
- 2026-10-26 · reclassificação · orquestrador · mantém M: api e web, sem evento novo (premissa P5) 
- 2026-10-26 · plano · vera-revisor · passagem/revisao-1.md: reprovado, 1 bloqueante (plano.md:43 sem ação fixa se `cancelada` existir) · reprovado · consumo 22k/4
- 2026-10-26 · plano · theo-arquiteto · plano.md:43 corrigido: frente 1 devolve bloqueado se `cancelada` existir · feito · consumo ≈1,5k/4
- 2026-10-26 · plano · vera-revisor · passagem/revisao-2.md: rechecagem aprovada · aprovado · consumo ≈1,7k/3
- 2026-10-26 · plano · Ana · premissas: P1 motivo obrigatório (mínimo uma palavra, auditável); P2 recusa passada; P3 a P5 fora, vão ao fechamento; P6 recepção e administrador · ajuste no plano
- Fora de escopo: cancelar lembrete WhatsApp de consulta desmarcada; avisar o paciente; evento de consulta desmarcada (P3 a P5)
- 2026-10-26 · plano · theo-arquiteto · ajuste de Ana aplicado: plano.md (57) com CA6 motivo obrigatório e perfis recepção e administrador; testes.md (38) com T6 · feito · consumo ≈5,4k/3
- 2026-10-26 · gate plano · Ana · aprovado: 2 frentes api → web, CA1 a CA6 · aprovado
- 2026-10-26 · executar · orquestrador · início; execução simulada a pedido de Ana (repos só com README, sem git próprio), sem branch nem commit de código · em andamento
- 2026-10-26 · executar F1 api · allan-dev-node · simulado; passagem/retorno-frente-1.md; contrato: POST /agenda/consultas/:id/desmarcar {motivo}, 200/400/403/404/409; enum desmarcada e colunas novas · feito · consumo 25k/8
- 2026-10-26 · executar F2 web · allan-dev-node · simulado; passagem/retorno-frente-2.md; consome contrato da F1, sem contrato novo; tela agenda do dia criada em (painel) por ausência no mapa · feito · consumo 26k/9
- 2026-10-26 · executar · rita-revisor-code · passagem/revisao-code-1.md: reprovado 3 itens (F1 where sem horário; F1 T4b fora do comando de aceite; F2 criou tela que plano.md:48 manda levar ao gate) · reprovado · consumo 26k/6
- 2026-10-26 · executar F1 correção · allan-dev-node · where com inicio > agora e 404/409 por clinica_id; T4b no padrão de pnpm test agenda com tools/db-local.sh · feito · consumo ≈1,8k/3
- 2026-10-26 · gate agenda do dia · Ana · criar nesta demanda: tela mínima com lista do dia e ação Desmarcar; resto da agenda fica para depois (resolve item 3 da revisao-code-1) · aprovado
- Fora de escopo: restante da tela de agenda do dia (filtros, navegação entre dias, demais ações)
- 2026-10-26 · executar · rita-revisor-code · passagem/revisao-code-2.md: rechecagem dos 3 itens · aprovado · consumo ≈4k/3
- 2026-10-26 · gate executar · Ana · aprovado; sem commit de código (simulado) · aprovado
- 2026-10-26 · fechar · Ana · desvios: nenhum além dos 3 registrados; fora de escopo: lembrete+evento → bug/2026-10-26-lembrete-consulta-desmarcada (backlog), aviso ao paciente e resto da agenda descartados · aprovado
- 2026-10-26 · fechar · orquestrador · fechamento.md (24) · feito
- 2026-10-26 · fechar · iris-arquivista · produtos/agenda/fatos.md e INDEX.md; mapas api (26) e web (16) com linhas previstas, não confirmadas; mapa api make db-local → tools/db-local.sh · feito · consumo 23k/8
- 2026-10-26 · fechar · iris-arquivista · mapa api:26 também migrado para tools/db-local.sh · feito · consumo ≈2k/6 (duas passadas)
- 2026-10-26 · fechar · orquestrador · consumo manual (consumo.py sem python): total ≈181k/68 em 7 spawns; maior theo-arquiteto ≈31k/14
- 2026-10-26 · gate final · Ana · aprovado; ajuste de harness [framework] (briefing não reescreve condição de parada do plano) só registrado em fechamento.md, sem aplicar · fechada

# CHANGELOG remarcacao-pelo-paciente

## Estado
Porte: M · Etapa: executar · Status: aguardando gate
Próximo passo: /executar com F1 (api); F2 (mensageria) e F3 (web) depois do contrato de F1; F4 espera a lista-de-espera
Início: 2026-09-26 10:00 · Fallback usado em: nenhum

## Registro
- 2026-09-26 10:00 · demanda · orquestrador · porte M, api e web (mensageria a confirmar); depende de lista-de-espera, travada em F2 · aprovado (validação automática)
- 2026-09-26 10:20 · plano · consultor-code · 1 lote, 6 perguntas; mapa.md 16 linhas; lembrete agendado na mensageria (`AgendarLembrete`); `vaga.aberta` e config por clínica não identificados · feito (20k, 9 chamadas)
- 2026-09-26 10:21 · plano · orquestrador · mensageria entra no escopo; porte mantido em M (só Ana ou fallback mudam porte) · assunção
- 2026-09-26 10:35 · plano · arquiteto · plano.md 55 linhas (F1 api, F2 mensageria, F3 web), testes.md 48 linhas; contrato novo `consulta.remarcada` v1; regras assumidas em R1 · feito (28k, 14 chamadas)
- 2026-09-26 10:40 · plano · revisor · reprovado, 3 itens: `vaga.aberta` afirmado sem fato; aceite de F1 depende de outra demanda (T6); efeito no token sem cenário · (25k, 9 chamadas)
- 2026-09-26 10:45 · plano · arquiteto (SendMessage) · plano.md 61 linhas (nova F4 api: remarcação → lista de espera, depende da lista-de-espera), testes.md 50 linhas (T13: token segue a consulta) · feito (34k, 7 chamadas)
- 2026-09-26 10:48 · plano · revisor (rechecagem) · aprovado, 1 observação (F4 só verificável quando a lista-de-espera entregar) · (30k, 2 chamadas)
- 2026-09-26 10:50 · plano · orquestrador · regras de R1 (corte em UTC, horário novo a 24h, sem limite, ligada por padrão) aceitas pela leitura mais simples · assunção
- 2026-09-26 10:50 · plano · orquestrador · gate do plano, 4 frentes · aprovado (validação automática); validação para aqui, executar não roda

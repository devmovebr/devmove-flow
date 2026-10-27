# SIMULADO: retorno frente 2 (web)
Status: feito (simulado, sem código, sem build nem teste)
Tela da agenda do dia: ausente em doc/servicos/web/mapa.md e no mapa.md da demanda. Declarado; segue pela leitura mais simples (criar a tela dentro de `(painel)`). O plano.md:48 manda voltar ao gate se o porte crescer: orquestrador decide.

## Mudou (previsto, nível de módulo)
- src/lib/api/agenda.ts: `desmarcarConsulta(id, motivo)` via `apiClient`, POST /agenda/consultas/:id/desmarcar; erros tipados por status 400/403/404/409.
- src/app/(painel)/app/agenda/ (agenda do dia, se não existir) e src/components/agenda/: botão "Desmarcar" nas consultas `agendada`; diálogo shadcn (src/components/ui/) com confirmação e motivo.
- Motivo: envio bloqueado sem ao menos uma palavra (trim); nenhuma requisição sai.
- Sucesso: consulta sai das ativas e o horário fica livre no `SeletorHorario` sem recarregar (invalida cache de agenda e disponibilidade).
- Erros: 404 e 409 mostram mensagem e recarregam a agenda; 403 mostra aviso de permissão; 400 mantém o diálogo com o motivo inválido.
- Horários via `formatarNoFuso` (src/lib/datas.ts); sem dado de paciente em console ou telemetria.

## Cobertura prevista (verificação: `pnpm test agenda` no web, api simulada, data fixa 2026-11-10 09:00)
- CA1/T1: desmarca com motivo "paciente viajou", consulta some das ativas.
- CA2/T2: horário 14:00 aparece livre no `SeletorHorario` sem recarregar.
- CA6/T6: confirmar sem motivo e só com espaços fica bloqueado, zero chamadas à api.
- CA3/CA4 (400/403/404/409): mensagem exibida e agenda recarregada nos dois últimos.
- CA5: sem log de console com paciente ou motivo.

## Armadilhas
- Contrato da frente 1 não confirmado em código; revalidar rota e códigos.

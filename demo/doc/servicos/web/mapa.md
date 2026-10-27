# web: mapa

## Camadas
- rotas · src/app/ · App Router · `(painel)` e `(publico)` · arquivista 2026-09-12
- chamadas à api · src/lib/api/ · `apiClient` · único lugar que conhece a URL da api · arquivista 2026-09-12
- UI · src/components/ui/ · shadcn · arquivista 2026-09-12

## Onde fica
- página pública · src/app/(publico)/c/[slug]/page.tsx · `PaginaPublica` · arquivista 2026-09-12
- seletor de horário · src/components/agenda/seletor-horario.tsx · `SeletorHorario` · arquivista 2026-09-12
- [previsto, não confirmado] chamada de desmarcar · src/lib/api/agenda.ts · `desmarcarConsulta` · único ponto que fala com POST desmarcar · fechamento desmarcar-consulta-recepcao 2026-10-26
- [previsto, não confirmado] agenda do dia (mínima: lista do dia e ação Desmarcar com confirmação e motivo) · src/app/(painel)/app/agenda/ · tela não existia · fechamento desmarcar-consulta-recepcao 2026-10-26
- tela de planos · src/app/(painel)/app/plano/page.tsx · `PaginaPlano` · arquivista 2026-09-12

## Armadilhas
- datas chegam em UTC; formatar com `formatarNoFuso` · src/lib/datas.ts · nunca `toLocaleString` direto (L1 agenda) · arquivista 2026-09-12

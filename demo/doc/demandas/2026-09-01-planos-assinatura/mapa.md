# Mapa: planos-assinatura

- criação de profissional · src/profissionais/profissionais.controller.ts · `criar` · recebe `@RespeitaLimite` · consultor-code 2026-09-01
- criação de consulta · src/agenda/consultas.controller.ts · `criar` · recebe `@RespeitaLimite` · consultor-code 2026-09-01
- guard global · src/app.module.ts · `APP_GUARD` · já registra `AuthGuard` · consultor-code 2026-09-01
- gateway · src/cobranca/gateway/pagafacil.py · `PagaFacilClient` · sandbox por env · consultor-code 2026-09-01
- guard de escrita · src/planos/modo-leitura.guard.ts · `ModoLeituraGuard` · rotas liberadas em `ROTAS_LIVRES` · dev-node 2026-09-03
- trial · src/cobranca/dominio/trial.py · `avaliar_trial(hoje)` · data injetada · dev-python 2026-09-04
- faixa de aviso · src/components/painel/faixa-assinatura.tsx · `FaixaAssinatura` · dev-node 2026-09-04

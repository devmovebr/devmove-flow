-- Massa do QA de planos-assinatura em staging. Rodar com tools/db-local.sh só em local; em staging, pelo seed de QA do time.
insert into clinicas (id, slug, plano, ciclo_inicio) values ('c-qa-1', 'qa-planos', 'basico', current_date - 10);
insert into clinicas (id, slug, plano, ciclo_inicio) values ('c-qa-2', 'qa-inadimplente', 'basico', current_date - 40);
insert into faturas (clinica_id, vencimento, situacao) values ('c-qa-2', current_date - 8, 'aberta');

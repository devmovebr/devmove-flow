# revisao-code-1: desmarcar-consulta-recepcao (execução simulada, retornos julgados como diff)

Veredito: reprovado

## Corrigir
1. api · passagem/retorno-frente-1.md:8 · "updateMany `where {id, clinica_id, status: agendada}`; 0 linhas: ... 409 se existe em outro estado ou horário passado". O where não tem horário: consulta `agendada` já passada (T4, 08:00 com agora 09:00) é atualizada para `desmarcada`, o que fere CA4 "recusado sem alterar estado". Deve ficar: where `{id, clinica_id, status: agendada, inicio > agora}` com `agora` do relógio injetável, e a busca que separa 404 de 409 também filtra `clinica_id`. Prova: `pnpm test agenda` no api com caso T4 08:00 verificando status `agendada` depois da recusa.
2. api · passagem/retorno-frente-1.md:17 · "T4b: ... teste concorrente em src/agenda/*.e2e-spec.ts com `make db-local`". O aceite da frente é `pnpm test agenda` cobrindo T1 a T6, e T4b fica num e2e fora desse comando, com banco subido por `make db-local`, que nenhum README nem tools/ documenta (a regra do workspace é só `tools/db-local.sh`). Deve ficar: T4b executado pelo comando de aceite (ou o aceite declara o comando e2e explícito), com banco por `tools/db-local.sh`. Prova: `pnpm test agenda` lista o caso T4b verde.
3. web · passagem/retorno-frente-2.md:3 e :7 · "segue pela leitura mais simples (criar a tela dentro de `(painel)`)" e "(agenda do dia, se não existir)". plano.md:48 manda: se a tela não existir, o porte da frente 2 cresce e volta ao gate. Criar a tela é mudança fora do escopo aprovado ("ação nova e estado visual" numa tela existente). Deve ficar: frente 2 sem criar tela até o gate de Ana decidir; com a tela ausente, retorno `bloqueado` com a pergunta fechada "criar a tela da agenda do dia nesta demanda ou abrir demanda própria?". Prova: retorno da frente 2 sem criação de tela, ou registro do gate no CHANGELOG.

## Contratos alterados
- api: POST /agenda/consultas/:id/desmarcar {motivo}; 200 {id,status,desmarcadaEm}; 400/403/404/409. Previsto no plano (frente 1).
- api: enum de status ganha `desmarcada`; colunas desmarcada_por, desmarcada_em (UTC), motivo_desmarcacao; migration. Previsto.
- Sem evento novo (P5 respeitada). Sem env var.

## Atendidos
CA1/T1, CA2/T2 (disponibilidade e reserva excluem `desmarcada`, sem trava), CA3/T3 (clinica_id no update, 404), CA5/T5 (log só ids, spy sem motivo), CA6/T6 (DTO trim na api, envio bloqueado na web), P6 (guard recepção e administrador), L1 UTC.

## Observações
- Retorno da frente 1 não declara o filtro `clinica_id` em `DisponibilidadeService.listar`; vem do código existente, a confirmar quando houver código.
- Web trata 403 com aviso próprio, além do que o plano pede; não piora nada.
- Busca de referência ao harness (grep de .md, .claude, P/F numerados) não aplicável: não há código; os retornos citam P e frentes só em documento.

## Mapa
- mapa.md:25 "agenda do dia · ... previsto criar" contradiz plano.md:48 (criação condicionada ao gate).

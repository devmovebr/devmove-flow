# plano tipo-de-contato

Feature M. Contato = paciente da api. Tipo com 3 valores fixos: Prospecto, Lead, Cliente. Fontes: `mapa.md` do dossiê, `doc/servicos/api/mapa.md`, `doc/servicos/web/mapa.md`.

## Critérios de aceite

- CA1 Todo paciente tem um tipo entre Prospecto, Lead e Cliente.
- CA2 Paciente já existente passa a ter tipo Prospecto após a migração.
- CA3 Paciente criado sem tipo informado nasce Prospecto.
- CA4 A recepcionista altera o tipo de um paciente no painel e o valor persiste.
- CA5 Valor fora dos 3 é recusado pela api com erro de validação, sem gravar.
- CA6 Tipo de paciente de outra clínica não é lido nem alterado (L1).
- CA7 A listagem e o detalhe de pacientes no painel exibem o tipo.

## Frente 1: api (primeiro)

- Onde: api → módulo `pacientes` (src/pacientes/), DTOs em src/pacientes/dto/, modelo em prisma/schema.prisma.
- O que muda: campo de tipo no paciente com conjunto fechado de 3 valores e padrão Prospecto; migração com preenchimento dos existentes; DTOs de criação e edição aceitam o tipo, opcional na criação; leitura de paciente devolve o tipo. Regra no `PacientesService`, controller só valida e delega.
- Restrições:
  - L1 multi-tenancy: "Toda consulta de negócio filtra por `clinica_id`." Edição do tipo localiza o paciente por id e `clinica_id`.
  - Migração só local: "Nunca rodar migration contra staging ou produção; só `tools/db-local.sh`."
  - Dado de paciente nunca vai para log (LGPD): o tipo não entra em log junto com identificação do paciente.
  - RLS da tabela de pacientes fica como está; migração não recria nem remove a política.
- Aceite:
  - `make db-local` de pé, `pnpm prisma migrate dev` aplica sem erro e sem pedir reset.
  - `pnpm vitest run src/pacientes` verde, com specs cobrindo CA1, CA3, CA5 e CA6 (Prisma mockado com `vitest-mock-extended`).
  - `pnpm lint` e `pnpm build` verdes.
  - Objetivo: valor permitido definido num só lugar. `grep -rn "Prospecto" src/` aponta só para a definição do conjunto e para specs.
- Dependência: nenhuma.

## Frente 2: web (depois da api)

- Onde: web → rotas do painel em src/app/(painel)/, chamadas em src/lib/api/, componentes de src/components/ui/ (shadcn).
- O que muda: tipo exibido na listagem e no detalhe de pacientes; seletor com os 3 valores no formulário de criação e edição; chamada de edição via `apiClient`.
- Restrições:
  - `apiClient` é o único lugar que conhece a URL da api.
  - Rótulos exibidos: Prospecto, Lead, Cliente.
- Aceite:
  - `pnpm lint` e `pnpm build` verdes.
  - Objetivo: nenhuma chamada direta à api fora de src/lib/api/. `grep -rn "fetch(" src/app src/components` sem ocorrência nova desta demanda.
  - Roteiro de testes.md T4 e T7 executado contra api local, com evidência no dossiê.
- Dependência: Frente 1 publicada no ambiente local (contrato de leitura e edição com o tipo).

## Fora de escopo

- Filtro ou busca por tipo na listagem.
- Mudança automática de tipo (ex.: virar Cliente ao pagar ou agendar).
- Histórico de mudança de tipo.
- Tipo no payload de eventos (`EventosPublisher`) e uso em cobranca ou mensageria.
- Página pública de agendamento: não exibe nem escolhe tipo.
- Controle de acesso por perfil.

## Riscos

- Tela de pacientes no painel: não identificado (mapa da web não lista a rota). Frente 2 confirma onde fica antes de alterar; se não existir, para e devolve ao orquestrador.
- Perfil recepcionista e controle de acesso: não identificado. Frente 1 confirma se a rota de edição de paciente já restringe perfil; o plano não altera essa regra.
- Payload de evento de paciente: não identificado se replica o modelo inteiro. Frente 1 confirma que o campo novo não muda versão de payload; se mudar, para e devolve.
- Repos do demo só com README: nenhum fato confirmado em código (mapa.md do dossiê). Caminhos vêm dos mapas de serviço.

## Premissas de produto

- Padrão Prospecto para existentes e novos sem tipo.
- Tipo obrigatório (nunca vazio).
- Qualquer usuário do painel com acesso a pacientes altera o tipo.
- Mudança de tipo é manual, sem histórico.
- Paciente criado pela página pública nasce Prospecto.

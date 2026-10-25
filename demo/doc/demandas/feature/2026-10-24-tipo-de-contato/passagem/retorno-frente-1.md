# retorno frente 1 (api) · SIMULADO

- Status: feito (simulado; nenhum código criado, nenhum comando executado)
- Mudou (o que seria alterado em code/api):
  - prisma/schema.prisma: enum `TipoContato` (Prospecto, Lead, Cliente), única definição dos valores, e campo `tipo` em `Paciente`, não nulo, default Prospecto
  - prisma/migrations/<ts>_tipo_paciente/: adiciona coluna com default Prospecto (preenche existentes, CA2); sem tocar na RLS
  - src/pacientes/tipo-paciente.ts (novo): `export { TipoContato } from "@prisma/client"` e `TIPO_PADRAO = TipoContato.Prospecto`; sem lista literal
  - src/pacientes/dto/: criação com `tipo` opcional via `@IsEnum(TipoContato)`; edição aceita `tipo` com o mesmo decorator
  - src/pacientes/pacientes.service.ts: importa de tipo-paciente.ts, default TIPO_PADRAO na criação (CA3); edição localiza por id + `clinica_id` (CA6); retorno inclui `tipo`
  - src/pacientes/pacientes.controller.ts: só repassa o campo; sem regra
  - src/pacientes/pacientes.service.spec.ts: casos CA1, CA3, CA5, CA6 (Prisma mockado com vitest-mock-extended)
- Verificado (todos: não executado (simulado)):
  - `make db-local` + `pnpm prisma migrate dev` sem erro e sem reset
  - `pnpm vitest run src/pacientes`
  - `pnpm lint` e `pnpm build`
  - `grep -rnE "['\"](Prospecto|Lead|Cliente)['\"]" src/ --include=*.ts --exclude=*.spec.ts` sem ocorrência, e `grep -rn "Prospecto" src/` só em tipo-paciente.ts e specs: não executado (simulado). Valores definidos só no enum do schema; src/ deriva dele, sem literal.
- Contratos alterados: api de pacientes. Leitura (listagem e detalhe) passa a devolver `tipo`; criação aceita `tipo` opcional (default Prospecto); edição aceita `tipo`; valor fora dos 3 retorna erro de validação (400) sem gravar. Fila, evento e env var: nenhum.
- Config necessária: nenhuma
- Fora de escopo encontrado:
  - A confirmar no código real: restrição de perfil na rota de edição e se o payload de `EventosPublisher` replica o paciente inteiro (riscos do plano); não verificável, repo só com README.

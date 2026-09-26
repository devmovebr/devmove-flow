# Plano: Medico para Profissional

Porte P · api · frente única

## De-para
| Antigo | Novo |
|---|---|
| `Medico`, `medico` (classe, DTO, variável, arquivo) | `Profissional`, `profissional` |
| tabela `medicos` | `profissionais` (migration nova de rename) |
| `crm` obrigatório | `crm` opcional |

## Fica como está
- símbolo `medico_id` na API pública v1 (`src/publica/v1/`): alias até a v2.

## Aceite
- `pnpm build` e `pnpm test` passam.
- `grep -rni medico src prisma test | grep -v medico_id` sem resultado (todas as extensões).
- `pnpm prisma migrate dev` sobe limpo com `make db-local`.

## Fora de escopo
Tela da web (texto já dizia "profissional"). Qualquer mudança de comportamento além do `crm` opcional.

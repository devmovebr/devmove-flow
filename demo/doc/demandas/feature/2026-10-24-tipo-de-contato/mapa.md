# mapa tipo-de-contato

- código em origin/main · code/api, code/web, code/cobranca, code/mensageria · só README.md · repos do demo sem código; nada verificável · caio-consultor-code 2026-10-24
- paciente (alvo, vindo do mapa do serviço, não do código) · doc/servicos/api/mapa.md · módulo `pacientes` em src/pacientes/ · DTO em src/<dominio>/dto/ (class-validator) · caio-consultor-code 2026-10-24
- migration · doc/servicos/api/mapa.md · `pnpm prisma migrate dev` (prisma/schema.prisma), RLS em SQL à parte · requer `make db-local` · caio-consultor-code 2026-10-24
- chamadas à api na web · doc/servicos/web/mapa.md · src/lib/api/ `apiClient` · único lugar com a URL · caio-consultor-code 2026-10-24
- painel web · doc/servicos/web/mapa.md · src/app/(painel)/ · tela de pacientes não listada no mapa · caio-consultor-code 2026-10-24
- perfil recepcionista / controle de acesso · não identificado · mapas não citam; código ausente · caio-consultor-code 2026-10-24
- [simulado] contrato de pacientes · src/pacientes/dto/ · leitura (lista e detalhe) devolve `tipo`; criação aceita `tipo` opcional (default Prospecto); edição aceita `tipo`; inválido = 400 · allan-dev-node 2026-10-24
- [simulado] valores do tipo · prisma/schema.prisma `enum TipoContato` (definição única); src/pacientes/tipo-paciente.ts reexporta de @prisma/client + `TIPO_PADRAO`; web usa os mesmos rótulos · allan-dev-node 2026-10-24

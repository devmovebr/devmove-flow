# revisão code 1 · tipo-de-contato · SIMULADO

- Veredito: reprovado
- Status: feito (julgado sobre os retornos; sem código, sem diff, nenhum comando executado)

## Corrigir
- F1 api · passagem/retorno-frente-1.md:5 e :7 · está: enum `TipoContato` (Prospecto, Lead, Cliente) em prisma/schema.prisma e "src/pacientes/tipo-paciente.ts (novo): única definição do conjunto de valores", ou seja, duas listas dos 3 valores; o grep do aceite só sai limpo porque schema.prisma fica fora de src/ · deve ficar: tipo-paciente.ts deriva do enum gerado (`export { TipoContato } from '@prisma/client'` mais o valor padrão `TipoContato.Prospecto`), sem lista literal; DTO (`@IsEnum(TipoContato)`) e service importam de tipo-paciente.ts · prova: `grep -rnE "['\"](Prospecto|Lead|Cliente)['\"]" src/ --include=*.ts --exclude=*.spec.ts` sem ocorrência e `grep -rn "Prospecto" src/` só em tipo-paciente.ts e specs.

## Cobertura CA1 a CA7 e restrições
- CA1 enum não nulo; CA2 coluna com default preenche existentes; CA3 default no service; CA5 `@IsIn`/`@IsEnum` com 400; CA6 edição por id + `clinica_id`; CA4 e CA7 na F2 via `apiClient`: cobertos.
- Migração só local (`make db-local`), RLS intocada, `apiClient` único (contorno do `fetch(` descrito e recusado na F2): atendidos.

## Contratos alterados
- api pacientes: leitura (lista e detalhe) devolve `tipo`; criação aceita `tipo` opcional (default Prospecto); edição aceita `tipo`; fora dos 3 = 400 sem gravar. Fila, evento, env var: nenhum.

## Observações
- F1: CA6 cita só a edição; o spec de CA6 deve cobrir também a leitura de paciente de outra clínica (T6 pede leitura e edição como não encontrado).
- F1: DTO de edição com `@IsOptional` aceita `tipo: null` e repassa ao Prisma (500 em coluna não nula); T5 "tipo vazio" pede 400. Cobrir null no spec de CA5.
- F1: retorno não menciona LGPD; nenhum log novo descrito, sem violação aparente. F2: web redeclara os 3 valores, inevitável entre serviços sem pacote compartilhado.

## Mapa
- mapa.md:10 "src/pacientes/tipo-paciente.ts · fonte única" contradiz retorno-frente-1.md:5 (enum próprio no schema.prisma) até o item Corrigir ser feito.

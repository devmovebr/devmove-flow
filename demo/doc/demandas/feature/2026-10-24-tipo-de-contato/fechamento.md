# fechamento tipo-de-contato

## Entregue
- api (simulado, sem commit): campo tipo no paciente com 3 valores (Prospecto, Lead, Cliente), padrão Prospecto, migração preenche existentes; criação aceita tipo opcional, edição aceita tipo, leitura devolve tipo; valor fora dos 3 dá 400. Valores definidos só no enum do Prisma, reexportados em src/pacientes.
- web (simulado, sem commit): tipo na listagem e no detalhe de pacientes, seletor no formulário, chamadas via apiClient.
- Contrato alterado: api de pacientes (leitura, criação, edição) com o campo tipo. Fila, evento e env var sem mudança.

## Desvios
- Execução simulada a pedido de Ana: repos de código só com README; nenhum aceite por comando executado, nenhuma branch ou commit de código.
- Versão do harness não verificada: python ausente na máquina.
- Revisão de código reprovou 1 item na F1 (valores em dois lugares, grep contornado por estar fora de src/); corrigido na rechecagem.

## Hipóteses exercitadas
- Contato = paciente da api: sem evidência em código (repos vazios).
- Paciente da página pública nasce Prospecto pelo padrão da api: sem evidência.

## Fatos encontrados errados
- Nenhum confirmado. mapa.md tem linhas [simulado], sem valor de fato de código.

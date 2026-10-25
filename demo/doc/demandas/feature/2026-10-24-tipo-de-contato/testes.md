# testes tipo-de-contato

Ambiente: api e web locais, banco por `make db-local`. Clínicas A e B, cada uma com pacientes de massa.

## T1 (CA1) tipo sempre preenchido
- Pré-condição: migração aplicada; pacientes de A em vários tipos.
- Ação: listar pacientes de A pela api.
- Resultado: todo item traz tipo em {Prospecto, Lead, Cliente}; nenhum vazio.

## T2 (CA2) existentes migrados
- Pré-condição: banco com pacientes de A e B criados antes da migração.
- Ação: aplicar a migração; consultar os pacientes.
- Resultado: todos com tipo Prospecto; contagem de pacientes igual à de antes.

## T3 (CA3) padrão na criação
- Pré-condição: usuário de A autenticado.
- Ação: criar paciente sem informar tipo.
- Resultado: resposta e leitura posterior trazem tipo Prospecto.

## T4 (CA4) alterar tipo no painel
- Pré-condição: paciente P de A com tipo Prospecto.
- Ação: no painel, abrir P, escolher Lead, salvar; recarregar a página.
- Resultado: P exibe Lead após recarregar; leitura pela api devolve Lead.

## T5 (CA5) valor inválido
- Pré-condição: paciente P de A com tipo Lead.
- Ação: enviar edição de P com tipo "Fornecedor"; repetir com tipo vazio.
- Resultado: erro de validação nas duas; P continua Lead.

## T6 (CA6) isolamento entre clínicas
- Pré-condição: paciente Q da clínica B com tipo Cliente; usuário de A autenticado.
- Ação: usuário de A lê Q e envia edição do tipo de Q para Lead.
- Resultado: leitura e edição respondem como não encontrado; Q continua Cliente no banco.

## T7 (CA7) exibição no painel
- Pré-condição: pacientes de A, um de cada tipo.
- Ação: abrir listagem e detalhe de cada um no painel.
- Resultado: rótulos Prospecto, Lead e Cliente aparecem conforme o tipo gravado.

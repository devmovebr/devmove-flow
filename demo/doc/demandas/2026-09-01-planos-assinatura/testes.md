# Testes: planos

| ID | Pré-condição | Ação | Resultado |
|---|---|---|---|
| T1 | Essencial, 1 profissional | criar segundo profissional | 403 `limite_plano` |
| T2 | Pro, 3 profissionais | criar quarto | criado |
| T3 | assinatura `suspensa` | criar consulta | 403 `modo_leitura` |
| T4 | assinatura `suspensa` | listar agenda | 200, agenda completa |
| T5 | Pro com 4 profissionais rebaixa para Essencial | listar consultas marcadas | todas visíveis |
| T6 | trial no dia 14, sem plano | ciclo roda com data injetada | Essencial em modo leitura |
| T7 | troca de Essencial para Pro no dia 10 | fechar ciclo | proporcional de 20 dias cobrado |
| T8 | webhook `pagamento.aprovado` duas vezes | processar | uma transição |
| T9 | trial com 3 dias restantes | abrir painel | faixa "3 dias de teste" |
| T10 | modo leitura | abrir agenda | botão "nova consulta" desabilitado com link para pagar |

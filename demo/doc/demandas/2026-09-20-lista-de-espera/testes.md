# Testes: lista de espera

| ID | Pré-condição | Ação | Resultado |
|---|---|---|---|
| T1 | plano Pro | paciente entra na lista | registro com período e janela |
| T2 | plano Essencial | entrar na lista | 403 `limite_plano` |
| T3 | 5 na fila, vaga amanhã | cancelar consulta | 3 ofertas criadas, `vaga.aberta` publicado |
| T4 | 2 ofertas abertas | dois aceites simultâneos | um reserva, outro recebe `vaga_preenchida` |
| T5 | ofertas sem aceite por 30 minutos | job roda | 3 seguintes recebem oferta |
| T6 | vaga em 2 horas | cancelar | nenhuma oferta |
| T7 | `vaga.aberta` recebido | processar | WhatsApp `vaga_aberta` para os 3 |
| T8 | Pro, página pública | abrir profissional | botão "entrar na lista" |
| T9 | Essencial | abrir página pública | sem o botão |
| T10 | paciente na lista | abrir link | faixa "você está na lista" |

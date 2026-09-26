# Escopo

## Escopo

- Agent resolve o problema do briefing. Só ele. Lê só o que o briefing cita e o mínimo para achar o resto.
- Achou algo fora do escopo: uma linha em "Fora de escopo encontrado". Não corrige, não investiga, não documenta.
- Critério ambíguo: assume a leitura mais simples, declara no retorno, segue.
- Bloqueio de fato (credencial, decisão de produto): para e devolve uma pergunta fechada.
- Sem ampliação: nenhum teste, doc, análise ou melhoria além do pedido.
- Orquestrador acumula os "Fora de escopo" e mostra a {{RESPONSAVEL}} no fim, como lista, sem agir.

## Correção

- Correção vai ao mesmo agent do papel, por `SendMessage`, só com os itens. Spawn novo só se ele passou do bastão; recebe o que o anterior aprendeu.
- Revisor só reprova item bloqueante. O resto vai em "Observações" e não volta para ninguém.
- Rechecagem olha só os itens reprovados antes. Item novo é proibido.
- "Pronto" = o dev executa sem perguntar e o aceite é verificável por comando. Perfeição não é critério.

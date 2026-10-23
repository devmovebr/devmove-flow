# Comunicação entre agents

## Briefing (máximo 25 linhas)

- Objetivo: uma frase.
- Ler: `CHANGELOG.md` do dossiê primeiro, depois os caminhos exatos. Nada fora disso sem necessidade.
- Escrever: caminho exato e teto de linhas, quando o agent produz arquivo.
- Fora: o que não entra.
- Aceite: comando + resultado esperado.
- Orçamento: teto de chamadas de ferramenta.
- Retorno: caminho em `passagem/` onde gravar a cópia, quando o papel grava.

Referência a arquivo, nunca cópia de conteúdo. Exceção: trace e `arquivo:linha` de correção vão literais. Agent que produz documento escreve direto no dossiê; o conteúdo não passa pelo orquestrador.

## Retorno (máximo 15 linhas)

- Status: feito | bloqueado | parcial.
- Mudou: arquivos, um por linha.
- Verificado: comando e resultado.
- Bloqueio: uma pergunta fechada, só se bloqueado. Ambiente (rede, VPN, credencial, infra parada): `bloqueado: ambiente` com o trecho do erro.
- Aprendido: só se parcial ou bloqueado. Até 5 linhas: causa provável, `arquivo:linha` relevantes, o que já foi tentado. É o que evita o próximo agent redescobrir tudo.
- Fora de escopo encontrado: uma linha por item.

Dev, revisores e QA gravam o mesmo retorno em `<dossiê>/passagem/` antes de devolver. A mensagem pode se perder; o arquivo fica.

## Proibido

- "Não é X, é Y" e variantes.
- Justificar decisão que ninguém questionou.
- Repetir o briefing no retorno.
- Resumo final, saudação, oferta de próximo passo.
- Adjetivo de qualidade. Travessão. Pergunta aberta.

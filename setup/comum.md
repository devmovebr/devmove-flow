# Passos comuns aos assistentes

Os três assistentes (`novo-projeto`, `projeto-existente`, `atualizar`) seguem estas regras e terminam com os mesmos passos de instalação e verificação.

## Como o assistente trabalha

- Segue os princípios do framework desde já: escopo fechado, rodada com fim, mais rápido que à mão, mais barato que uma pessoa.
- Pergunta em lote, com opções (`AskUserQuestion`), nunca uma pergunta por vez. Quando o repositório responde, não pergunta.
- Cada fase termina num gate: `Aprovar e seguir` ou `Reprovar e pedir ajuste`.
- Na verificação e no inventário, prefira as ferramentas Grep e Glob a comandos encadeados no shell (menos pedidos de permissão).
- Slug de pasta (serviço, módulo, demanda): minúsculo, sem acento, com hífen (`orçamento` vira `orcamento`).
- Leitura de código só por spawn de `Explore` com escopo fechado (um por serviço, em paralelo), devolvendo até 20 linhas. O assistente não lê código direto.
- Nada de commit, push ou alteração dentro dos repositórios de `code/` além de clonar ou mover pastas quando pedido. Exceção: no projeto novo, o assistente cria `code/<serviço>/` com `git init` e README.
- Não apaga nada do usuário. Arquivo que vai ser substituído é lido antes; conflito vai para o gate.

## Instalar e adaptar

O Claude Code trata `.claude/` como pasta sensível e pede aprovação para cada edição lá dentro. Por isso o assistente não edita `.claude/` à mão: ele escreve um arquivo de valores e o script aplica tudo.

1. Escreva `devmove-valores.md` na raiz do workspace, no formato de `<devmove-flow>/setup/lib/valores-exemplo.md`, com tudo o que foi levantado: cada marcador de `marcadores.md`, uma seção `## STACK <id>` por stack (com `apelido`), uma `## SERVICO <nome>` por serviço (pasta, stack, dev, comandos próprios, subir local, armadilhas), `## REPOS`, `## MEM0` e as linhas de `## HOOK` (só para formatador que já existe no repo). O arquivo fica no workspace como registro da instalação.
2. Rode `<devmove-flow>/setup/lib/instalar.sh <workspace> --valores <workspace>/devmove-valores.md`. Ele copia o framework sem sobrescrever (inclusive `tools/` e `.gitignore`), preenche os marcadores, gera os `<apelido>-dev-<stack>.md` e as rules `rules/code/servicos/<serviço>.md`, remove os modelos e cria o hook. A última linha diz o que sobrou (`sobrou nada` é o esperado).
3. Sobrou marcador: complete o `devmove-valores.md` e rode de novo (arquivos já copiados são mantidos; o preenchimento vale para eles também).
4. Guarde a lista de `existe` da saída: são os arquivos que pedem merge manual (passo 6).
5. Formatador que ainda não existe (projeto novo): sem hook agora; a entrega lista "hook de lint" como pendência e a demanda de esqueleto inclui o hook no aceite.
6. Para cada serviço de `code/`: `doc/servicos/<serviço>/INDEX.md` (até 15 linhas: o que faz, stack, dependências, como rodar) e, quando houve leitura do código, `mapa.md` no formato da seção Mapas de `.claude/fluxo.md`, só com o que foi visto. Atualize `doc/servicos/INDEX.md`.
7. Arquivos da lista `existe`: merge preservando o conteúdo do projeto. Regra antiga que conflita com o framework vai para o gate com as duas versões, e o usuário decide.
8. Scripts utilitários que já existem no projeto (pasta `scripts/`, `bin/`, dentro de `.claude/` ou de `code/`) vão para `tools/`, com uma linha em `tools/README.md` e o `allow` no `settings.json`. Credencial e cache vão para `tools/.local/`.
9. `defaultMode: auto`: preencha `autoMode.environment` no `.claude/settings.local.json` com organização, repositórios confiáveis, onde ficam os segredos, CLIs próprios e as regras fixas.

## Verificação

- Ferramenta Grep por `\{\{[A-Z_]+\}\}` em `CLAUDE.md`, `.claude/` e `doc/`: sem resultado (o script já mostra `sobrou nada`).
- Todo agent fixo citado em skill existe em `.claude/agents/`, existe um `<apelido>-dev-<stack>.md` para cada stack e uma rule em `rules/code/servicos/` para cada serviço da tabela do `rules/code.md`.
- `tools/clonar-repos.sh` lista os repositórios de `code/`.
- `Versão do DevMove Flow: <versão>` no topo de `.claude/fluxo.md`.
- Ferramenta Grep por travessão e meia-risca nos textos gerados: sem resultado.

## Gate final

Resumo de até 10 linhas: saída resumida do `instalar.sh` (copiados, existe, `sobrou`), agents criados, arquivos com merge, resultado da verificação. `Aprovar e seguir` leva à entrega; `Reprovar e pedir ajuste` corrige o `devmove-valores.md` ou o merge e roda o script de novo.

## Entrega (até 20 linhas)

Cenário · versão instalada · serviços e stacks · agents criados · arquivos com merge · decisões tomadas sem perguntar · pendências para o usuário · "reinicie a sessão e use `/demanda <relato>`".

# Assistente: projeto do zero

Uso: abra o Claude Code na pasta onde o workspace vai nascer e peça "Siga `<devmove-flow>/setup/novo-projeto.md`".

Leia antes `<devmove-flow>/setup/comum.md`.

## Fase 1: entender o projeto (um lote de perguntas por rodada, no máximo 3 rodadas)

Rodada 1, o produto:
- nome do projeto e uma frase do que ele é;
- para quem é e qual o problema que resolve;
- parceiros ou sistemas externos já decididos;
- quem aprova os gates (nome) e em que idioma são os documentos.

Rodada 2, a técnica:
- serviços previstos: nome e responsabilidade (pode ser só um);
- stack de cada um (ofereça as mais comuns como opção, mais "ainda não sei");
- repositórios: um por serviço ou monorepo; branch principal;
- regras fixas: gerenciador de pacotes, ferramentas obrigatórias, o que nunca fazer;
- runner de teste, formatador e convenção de commit por stack (opção "definir na demanda de esqueleto").

Rodada 3, só se sobrou lacuna que muda a instalação.

Stack "ainda não sei": instale sem o dev da stack e registre a pendência; o agent nasce quando a stack for decidida.

Gate: resumo de até 10 linhas com projeto, serviços, stacks e regras.

## Fase 2: montar o workspace

- Antes de qualquer `git init`, confira `git rev-parse --show-toplevel`: se a pasta já está dentro de outro repositório, pergunte no gate com duas opções: "seguir com repositório aninhado" ou "não criar git na raiz do workspace".
- Crie `code/` e, para cada serviço, `code/<serviço>/` com `git init -b <branch principal>` e um `README.md` de uma linha. Só crie código se o usuário pedir.
- `git init -b <branch principal>` na raiz do workspace (que versiona `doc/` e `.claude/`), com o `.gitignore` do framework (`code/*/`, `.env*`, `tools/.local/`).

Gate: árvore do workspace.

## Fase 3: instalar e adaptar

Passos de `comum.md`. Sem código, `mapa.md` não é criado: ele nasce na primeira demanda que tocar o serviço.

Crie `doc/produtos/<modulo>/INDEX.md` para cada módulo de negócio que o usuário citou, com a visão em até 10 linhas.

Gate final e entrega (`comum.md`). Sugira como primeira demanda o esqueleto do primeiro serviço.

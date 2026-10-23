# Assistente: atualizar o harness

Versão minor e patch chegam sozinhas: o `/demanda` de cada workspace roda `tools/atualizar_framework.py`, que faz merge de 3 vias entre a versão instalada, a última tag e o workspace (`.claude/fluxo.md`, seção Versão do harness). Este assistente cobre o que o script não faz: versão major e workspace que ainda não tem o script.

Uso: abra o Claude Code na raiz do workspace e peça "Siga `<devmove-flow>/setup/atualizar.md`". Leia antes `<devmove-flow>/setup/comum.md`.

## Fase 1: situação

| Encontrado | Caminho |
|---|---|
| marca `Versão do DevMove Flow: X.Y.Z` com X igual à major atual, `tools/atualizar_framework.py` e `devmove-valores.md` | rode o script; este assistente não é preciso |
| marca de major anterior | Fase 2 |
| sem `devmove-valores.md` ou sem o script | escreva o `devmove-valores.md` a partir do workspace (modelo em `setup/lib/valores-exemplo.md`), gate, e Fase 2 |
| sem marca do DevMove Flow | não usa o framework: siga `projeto-existente.md` |

## Fase 2: migração

Para cada major acima da instalada, em ordem, siga a seção Migração da versão no `CHANGELOG.md`, uma etapa por gate. Preserve nomes de agents, números calibrados pela retro, regras locais, `retro.md`, todo `CHANGELOG.md` de demanda e `doc/`.

Terminada a migração, copie `framework/tools/atualizar_framework.py` para `tools/`, troque a marca para a última versão da major nova e rode o script uma vez com `--checar`.

## Fase 3: verificação e entrega

Verificação e entrega de `comum.md`. Commit `chore(harness): atualiza devmove flow para <versão>` só com pedido.

# Assistente: atualizar o harness

Uso: abra o Claude Code na raiz de um workspace que já usa o framework e peça "Siga `<devmove-flow>/setup/atualizar.md`".

Leia antes `<devmove-flow>/setup/comum.md`.

## Fase 1: qual versão está instalada

Procure no topo de `.claude/fluxo.md`:

| Encontrado | Versão instalada |
|---|---|
| `Versão do DevMove Flow: X.Y.Z` | X.Y.Z |
| `Versão do harness: 4` (prompt portátil anterior ao framework) | 1.0.0 em conteúdo; só troque a marca |
| `Versão do harness: 5` (prompt portátil) | 1.1.0 em conteúdo, com regras locais da retro; confira item a item |
| `Versão do harness: 1` a `3`, ou nenhuma marca mas existe `.claude/fluxo.md`, `.claude/rules/principios.md` ou `CHANGELOG.md` em dossiês | anterior à 1.0.0; harness que evoluiu em paralelo (nomes de agent diferentes) entra aqui |
| nada disso | não usa o framework: pare e indique `projeto-existente.md` |

Versão atual do framework: `<devmove-flow>/VERSION`. Igual à instalada: diga e pare.

## Fase 2: o que falta

Leia `<devmove-flow>/CHANGELOG.md` e junte os itens de Novidades de toda versão acima da instalada (anterior à 1.0.0: o checklist completo da 1.0.0).

Para cada item, confira no workspace se já existe, mesmo com outro texto. Classifique:
- **presente**: nada a fazer;
- **falta**: aplicar;
- **conflito**: o workspace tem regra local diferente vinda da retro (`.claude/retro.md` ou registro de ajuste aprovado). Não aplique.

Para comparar texto de arquivo, use o arquivo correspondente em `<devmove-flow>/framework/`.

Gate: tabela item · situação, e cada conflito com as duas versões lado a lado. O usuário decide cada conflito.

## Fase 3: aplicar

- O Claude Code pede aprovação para editar `.claude/`: avise o usuário no gate da Fase 2 que cada edição aprovada vai pedir confirmação.
- Edição pontual. Nunca reescreva arquivo inteiro que tem customização local.
- Arquivo novo do framework que não existe no workspace: `setup/lib/instalar.sh` copia só os que faltam.
- Preserve sempre: nomes de agents, skills e pastas; números calibrados (tetos, conversão de tokens, orçamentos); regras vindas da retro; conteúdo de `retro.md`, de todo `CHANGELOG.md` de demanda e de `doc/`.
- Mudança de estrutura (versão major): siga a seção Migração da versão no CHANGELOG, uma etapa por gate.
- Regra local que vale para qualquer projeto e o framework ainda não tem: liste na entrega como proposta para o framework.
- Troque a marca para `Versão do DevMove Flow: <versão nova> (atualizado em <data>)`.

## Fase 4: verificação e entrega

Verificação de `comum.md`, mais: nenhum item marcado "falta" ficou sem aplicar. Entrega de `comum.md`, com a lista de itens aplicados, já presentes e conflitos decididos.

## Retroalimentação

Ajuste que a retro de um projeto aprovar e que sirva para qualquer projeto não fica só nele: registre como proposta para o framework (seção "Evoluir o framework" do `README.md` do devmove-flow).

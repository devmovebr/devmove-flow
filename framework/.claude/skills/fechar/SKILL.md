---
name: fechar
description: Etapa de fechamento do fluxo de demanda. Registra desvios, manda o arquivista destilar conhecimento e grava a retro. Chamada pelo /demanda ou /retomar.
---
Dossiê corrente.

1. Desvios: junta os do `CHANGELOG.md` e pergunta a {{RESPONSAVEL}}, num lote, se houve outro.
2. Escreve `fechamento.md` (até 30 linhas): desvios, hipóteses exercitadas (evidência nova ou sem evidência), fatos encontrados errados.
3. Spawna `arquivista` (`model: opus`) com o `fechamento.md` e o `mapa.md` do dossiê para destilar em `doc/servicos/` e `doc/produtos/`, atualizar o `mapa.md` de cada serviço tocado e os índices. Porte P sem desvio e sem mapa novo: pula este passo.
4. Retro em `.claude/retro.md`, usando o `Início` do `CHANGELOG.md`.
5. Gate final: ajuste reabre o arquivo apontado. Aprovado: `CHANGELOG.md` com `Status: fechada` (o arquivo fica) e marca a demanda como fechada em `doc/demandas/INDEX.md`. Se a retro propôs ajuste no harness, gate separado para ele.

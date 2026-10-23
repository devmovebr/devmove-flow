---
name: fechar
description: Etapa de fechamento do fluxo de demanda. Registra desvios, dá destino aos achados fora de escopo, manda a arquivista destilar conhecimento e grava a retro. Chamada pelo /demanda ou /retomar.
---
Dossiê corrente.

1. Desvios: junta os do `CHANGELOG.md` e pergunta a {{RESPONSAVEL}}, num lote, se houve outro.
2. Escreve `fechamento.md` (até 30 linhas): entregue por serviço com commits, desvios, hipóteses exercitadas (evidência nova ou sem evidência), fatos encontrados errados.
3. Fora de escopo acumulado no `CHANGELOG.md`: gate com a lista, cada item com destino proposto (`debito-tecnico`, `bug` ou descarte). Aprovado: um dossiê por item em `doc/demandas/<tipo>/` com `bruto/relato.md`, `Origem` neste dossiê, `CHANGELOG.md` com `Status: backlog` e a linha no `INDEX.md` do tipo.
4. Spawna `iris-arquivista` com o `fechamento.md` e o `mapa.md` do dossiê para destilar em `doc/servicos/`, `doc/produtos/` e `doc/integracoes/`, atualizar o `mapa.md` de cada serviço tocado e os índices. Porte P sem desvio e sem mapa novo: pula este passo.
5. Consumo: roda `python3 <workspace>/tools/consumo.py <dossiê>` e cola a linha-resumo no Registro do `CHANGELOG.md`. Saiu `n/d`: usa o registro manual das notificações.
6. Retro em `.claude/retro.md`, usando o `Início` do `CHANGELOG.md` e os números do `consumo.json`.
7. Gate final: ajuste reabre o arquivo apontado. Aprovado: `CHANGELOG.md` com `Status: fechada` (o arquivo fica) e a linha no `INDEX.md` do tipo marcada como fechada. Se a retro propôs ajuste no harness, gate separado para ele; aprovado, aplica e registra no `CHANGELOG.md`.

---
name: negocio
description: Etapa de refinamento de negócio do fluxo de demanda (só porte G). Fecha a regra com {{RESPONSAVEL}} e escreve negocio.md até 60 linhas. Chamada pelo /demanda ou /retomar.
---
Dossiê corrente. Só porte G.

1. Lê `bruto/` vigente e as `leis.md` dos domínios envolvidos (no máximo 2).
2. Reformula a regra em uma frase e traz a {{RESPONSAVEL}}, num lote só, até 5 contrapontos: fluxo existente que compartilha o código, lei contrariada, fato quebrado, custo escondido. Cada um com as opções.
3. Com as respostas, escreve `negocio.md`: Regra · Decidido · Fora de escopo · Pendências (P<n>, quem responde, bloqueia?). Até 60 linhas.
4. Pendência bloqueante: `pendencias.md` e gate com ela no resumo. Aprovar sem resposta = segue com a leitura mais simples, registrada como risco.
5. Gate. Próxima etapa: `tecnico`.

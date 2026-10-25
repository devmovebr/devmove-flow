# retorno frente 2 (web) · SIMULADO

- Status: feito (simulado; nenhum código criado, nenhum comando executado)
- Mudou (o que seria alterado em code/web):
  - src/lib/api/ (pacientes): tipo `TipoContato` com Prospecto, Lead, Cliente e rótulos; `apiClient` passa `tipo` na criação e na edição (PATCH/PUT conforme a api) e lê `tipo` em lista e detalhe. Único ponto com a URL.
  - src/app/(painel)/ rota de pacientes (listagem e detalhe): coluna/campo com o rótulo do tipo (CA7). Caminho exato não consta no mapa da web; confirmar no código antes de editar. Se a tela não existir, parar e devolver ao orquestrador (risco do plano).
  - formulário de criação e edição de paciente: seletor com os 3 valores, obrigatório, padrão Prospecto na criação; salvar chama `apiClient` (CA4).
  - src/components/ui/: reaproveitar `select` do shadcn; criar só se ausente (via CLI shadcn, sem lib nova).
- Verificado (todos: não executado (simulado)):
  - `pnpm lint` e `pnpm build`
  - `grep -rn "fetch(" src/app src/components`: esperado sem ocorrência nova. Atende a intenção se a chamada de edição e a leitura do tipo passarem por `apiClient` em src/lib/api/; mover a chamada para um helper fora de src/lib/api/ ou trocar `fetch(` por `axios`/outro nome para o grep sair vazio seria contorno.
  - T4 (CA4), roteiro não executado: com api local de pé e paciente P de A em Prospecto, abrir P no painel, escolher Lead, salvar, recarregar; esperar Lead na tela e na leitura pela api. Evidência a gravar em evidencias/ do dossiê quando houver código real.
  - T7 (CA7), roteiro não executado: com um paciente de A de cada tipo, abrir listagem e detalhe de cada um; esperar os rótulos Prospecto, Lead e Cliente conforme o gravado.
- Contratos alterados: nenhum (consome o contrato da Frente 1; rótulos iguais aos de src/pacientes/tipo-paciente.ts da api)
- Config necessária: nenhuma
- Fora de escopo encontrado:
  - Rota da tela de pacientes e perfil recepcionista não identificados nos mapas; confirmar no código real.
  - Página pública (`(publico)/c/[slug]`) não é alterada; paciente criado por ela nasce Prospecto pela api.
  - Mapa do dossiê não recebeu linha nova: nada descoberto em código (simulado).

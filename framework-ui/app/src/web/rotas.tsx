import { createBrowserRouter, Navigate } from 'react-router'
import { Shell } from './shell/Shell'
import { Cenario } from './telas/cenario/Cenario'
import { Comparar } from './telas/Comparar'
import { Demandas } from './telas/Demandas'
import { Rodada } from './telas/Rodada'
import { Suite } from './telas/suite/Suite'
import { Inicio } from './telas/Inicio'
import { Conversa } from './telas/mensagens/Conversa'
import { Conversas } from './telas/mensagens/Conversas'

export const roteador = createBrowserRouter([
  { path: '/', element: <Inicio /> },
  {
    path: '/:p',
    element: <Shell />,
    children: [
      { index: true, element: <Navigate to="testes" replace /> },
      { path: 'mensagens', element: <Conversas /> },
      { path: 'mensagens/:tipo/:slug', element: <Conversa /> },
      { path: 'testes', element: <Demandas /> },
      { path: 'testes/:tipo/:slug', element: <Suite /> },
      { path: 'testes/:tipo/:slug/rodadas/:id', element: <Rodada /> },
      { path: 'testes/:tipo/:slug/cenarios/:c', element: <Cenario /> },
      { path: 'testes/:tipo/:slug/comparar', element: <Comparar /> },
    ],
  },
])

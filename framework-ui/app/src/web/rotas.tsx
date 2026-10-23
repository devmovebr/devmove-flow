import { createBrowserRouter, Navigate } from 'react-router'
import { Shell } from './shell/Shell'
import { Cenario } from './telas/cenario/Cenario'
import { Comparar } from './telas/Comparar'
import { Demandas } from './telas/Demandas'
import { Rodada } from './telas/Rodada'
import { Suite } from './telas/suite/Suite'
import { Inicio } from './telas/Inicio'

export const roteador = createBrowserRouter([
  { path: '/', element: <Inicio /> },
  {
    path: '/:p',
    element: <Shell />,
    children: [
      { index: true, element: <Navigate to="testes" replace /> },
      { path: 'testes', element: <Demandas /> },
      { path: 'testes/:tipo/:slug', element: <Suite /> },
      { path: 'testes/:tipo/:slug/rodadas/:id', element: <Rodada /> },
      { path: 'testes/:tipo/:slug/cenarios/:c', element: <Cenario /> },
      { path: 'testes/:tipo/:slug/comparar', element: <Comparar /> },
    ],
  },
])

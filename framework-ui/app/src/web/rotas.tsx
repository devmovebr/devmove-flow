import type { ComponentType } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'
import { Shell } from './shell/Shell'
import { Inicio } from './telas/Inicio'

// Cada tela vira um chunk carregado na primeira visita; o shell vem no bundle inicial.
const tela = <K extends string>(carregar: () => Promise<Record<K, ComponentType>>, nome: K) => ({
  lazy: async () => ({ Component: (await carregar())[nome] }),
})

export const roteador = createBrowserRouter([
  { path: '/', element: <Inicio /> },
  {
    path: '/:p',
    element: <Shell />,
    children: [
      { index: true, element: <Navigate to="testes" replace /> },
      { path: 'mensagens', ...tela(() => import('./telas/mensagens/Conversas'), 'Conversas') },
      { path: 'mensagens/:tipo/:slug', ...tela(() => import('./telas/mensagens/Conversa'), 'Conversa') },
      { path: 'logs', ...tela(() => import('./telas/sessoes/Sessoes'), 'Sessoes') },
      { path: 'logs/:item', ...tela(() => import('./telas/sessoes/Terminal'), 'Terminal') },
      { path: 'testes', ...tela(() => import('./telas/Demandas'), 'Demandas') },
      { path: 'testes/:tipo/:slug', ...tela(() => import('./telas/suite/Suite'), 'Suite') },
      { path: 'testes/:tipo/:slug/rodadas/:id', ...tela(() => import('./telas/Rodada'), 'Rodada') },
      { path: 'testes/:tipo/:slug/cenarios/:c', ...tela(() => import('./telas/cenario/Cenario'), 'Cenario') },
      { path: 'testes/:tipo/:slug/comparar', ...tela(() => import('./telas/Comparar'), 'Comparar') },
    ],
  },
])

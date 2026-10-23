import { createContext, useContext } from 'react'

export type AlvosTopo = { migalhas: HTMLElement | null; acoes: HTMLElement | null }

export const ContextoTopo = createContext<AlvosTopo>({ migalhas: null, acoes: null })

export const useAlvosTopo = () => useContext(ContextoTopo)

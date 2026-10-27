import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import type { Execucao, Rodada } from '../../shared/tipos'
import { rotasApi } from './cliente'
import { chaves, invalidarResultados, type RodadaDetalhe } from './consultas'

type Ouvintes = { aoExecutar?: (e: Execucao) => void; aoTerminar?: (r: Rodada) => void }

// Acompanha a rodada por SSE e mantém o cache de ['rodada', p, id] atualizado.
export function useEventosRodada(p: string, id: number | null, ativo: boolean, ouvintes: Ouvintes = {}) {
  const cliente = useQueryClient()
  const ref = useRef(ouvintes)
  useEffect(() => {
    ref.current = ouvintes
  })

  useEffect(() => {
    if (!ativo || id === null) return
    const fonte = new EventSource(rotasApi.eventos(p, id))
    const chave = chaves.rodada(p, id)

    fonte.addEventListener('execucao', (ev) => {
      const execucao = JSON.parse((ev as MessageEvent<string>).data) as Execucao
      cliente.setQueryData<RodadaDetalhe>(chave, (atual) => {
        if (!atual) return atual
        const outras = atual.execucoes.filter((e) => e.id !== execucao.id)
        return { ...atual, execucoes: [...outras, execucao].sort((a, b) => a.ordem - b.ordem) }
      })
      ref.current.aoExecutar?.(execucao)
    })

    fonte.addEventListener('fim', (ev) => {
      const rodada = JSON.parse((ev as MessageEvent<string>).data) as Rodada
      cliente.setQueryData<RodadaDetalhe>(chave, (atual) => (atual ? { ...atual, ...rodada } : atual))
      invalidarResultados(cliente, p)
      ref.current.aoTerminar?.(rodada)
      fonte.close()
    })

    return () => fonte.close()
  }, [p, id, ativo, cliente])
}

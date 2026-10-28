import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import type { EventoSessao, Execucao, Rodada } from '../../shared/tipos'
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

// Eventos da sessão de agente por SSE: `inicio` traz o arquivo inteiro (de novo, se a ponte o recriou),
// `eventos` só as linhas novas. O estado guarda de qual sessão é, para a troca de aba não mostrar a anterior.
export function useEventosSessao(p: string, item: string): { eventos: EventoSessao[]; conectado: boolean } {
  const sessao = `${p}/${item}`
  const [estado, setEstado] = useState({ sessao, eventos: [] as EventoSessao[], conectado: false })

  useEffect(() => {
    if (!item) return
    const fonte = new EventSource(rotasApi.eventosSessao(p, item))
    const ler = (ev: Event) => JSON.parse((ev as MessageEvent<string>).data) as EventoSessao[]
    fonte.addEventListener('inicio', (ev) => setEstado({ sessao, eventos: ler(ev), conectado: true }))
    fonte.addEventListener('eventos', (ev) => setEstado((atual) => ({ ...atual, eventos: [...atual.eventos, ...ler(ev)], conectado: true })))
    fonte.onerror = () => setEstado((atual) => ({ ...atual, conectado: false }))
    return () => fonte.close()
  }, [p, item, sessao])

  return estado.sessao === sessao ? estado : { eventos: [], conectado: false }
}

import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
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

// Teto de linhas na memória: log de app em loop de erro não pode travar a aba.
const MAX_LINHAS = 5_000

type LogApp = { linhas: string[]; cortado: boolean; conectado: boolean }

// Log da app por SSE: `inicio` traz a cauda do arquivo (de novo a cada subida, que recria o log), `linhas` o
// trecho novo. `limpar` esvazia só a visão; o que chegar depois continua aparecendo.
export function useLogApp(p: string, app: string): LogApp & { limpar: () => void } {
  const chave = `${p}/${app}`
  const [estado, setEstado] = useState({ chave, linhas: [] as string[], cortado: false, conectado: false })

  useEffect(() => {
    if (!app) return
    const fonte = new EventSource(rotasApi.logApp(p, app))
    fonte.addEventListener('inicio', (ev) => {
      const { linhas, cortado } = JSON.parse((ev as MessageEvent<string>).data) as { linhas: string[]; cortado: boolean }
      setEstado({ chave, linhas: linhas.slice(-MAX_LINHAS), cortado: cortado || linhas.length > MAX_LINHAS, conectado: true })
    })
    fonte.addEventListener('linhas', (ev) => {
      const novas = JSON.parse((ev as MessageEvent<string>).data) as string[]
      setEstado((atual) => {
        const linhas = [...atual.linhas, ...novas]
        return linhas.length > MAX_LINHAS
          ? { ...atual, linhas: linhas.slice(-MAX_LINHAS), cortado: true, conectado: true }
          : { ...atual, linhas, conectado: true }
      })
    })
    fonte.onerror = () => setEstado((atual) => ({ ...atual, conectado: false }))
    return () => fonte.close()
  }, [p, app, chave])

  const limpar = useCallback(() => setEstado((atual) => ({ ...atual, linhas: [], cortado: false })), [])
  const atual = estado.chave === chave ? estado : { linhas: [], cortado: false, conectado: false }
  return { linhas: atual.linhas, cortado: atual.cortado, conectado: atual.conectado, limpar }
}

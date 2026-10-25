import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  ConversaMc,
  ConversaMcDetalhe,
  DemandaDetalhe,
  Demanda,
  EnvioResultado,
  Execucao,
  Info,
  Matriz,
  Projeto,
  Requisicao,
  Rodada,
  Veredito,
} from '../../shared/tipos'
import { api, rotasApi } from './cliente'

export type RodadaDetalhe = Rodada & { execucoes: Execucao[] }

export const chaves = {
  projetos: ['projetos'] as const,
  ambientes: (p: string) => ['ambientes', p] as const,
  demandas: (p: string) => ['demandas', p] as const,
  demanda: (p: string, d: string) => ['demanda', p, d] as const,
  matriz: (p: string, d: string, amb: string) => ['matriz', p, d, amb] as const,
  historico: (p: string, d: string, c: string) => ['historico', p, d, c] as const,
  rodada: (p: string, id: number) => ['rodada', p, id] as const,
  conversas: (p: string) => ['conversas', p] as const,
  conversa: (p: string, d: string) => ['conversa', p, d] as const,
}

// A ponte reescreve mensagens-mc.md enquanto a demanda roda; o painel acompanha por polling.
const AO_VIVO = 2_000

export function useConversas(p: string) {
  return useQuery({
    queryKey: chaves.conversas(p),
    queryFn: () => api<ConversaMc[]>(rotasApi.conversas(p)),
    refetchInterval: AO_VIVO,
    enabled: !!p,
  })
}

export function useConversa(p: string, d: string) {
  return useQuery({
    queryKey: chaves.conversa(p, d),
    queryFn: () => api<ConversaMcDetalhe>(rotasApi.conversa(p, d)),
    refetchInterval: AO_VIVO,
    enabled: !!d,
  })
}

export function useInfo() {
  return useQuery({ queryKey: ['info'], queryFn: () => api<Info>(rotasApi.info()), staleTime: Infinity })
}

export function useProjetos() {
  return useQuery({ queryKey: chaves.projetos, queryFn: () => api<Projeto[]>(rotasApi.projetos()) })
}

export function useAmbientes(p: string) {
  return useQuery({ queryKey: chaves.ambientes(p), queryFn: () => api<string[]>(rotasApi.ambientes(p)) })
}

export function useDemandas(p: string) {
  return useQuery({ queryKey: chaves.demandas(p), queryFn: () => api<Demanda[]>(rotasApi.demandas(p)) })
}

export function useDemanda(p: string, d: string, ativo = true) {
  return useQuery({
    queryKey: chaves.demanda(p, d),
    queryFn: () => api<DemandaDetalhe>(rotasApi.demanda(p, d)),
    enabled: ativo && !!d,
  })
}

export function useMatriz(p: string, d: string, ambiente: string) {
  return useQuery({
    queryKey: chaves.matriz(p, d, ambiente),
    queryFn: () => api<Matriz>(rotasApi.matriz(p, d, ambiente || undefined)),
  })
}

export function useHistorico(p: string, d: string, c: string) {
  return useQuery({
    queryKey: chaves.historico(p, d, c),
    queryFn: () => api<Execucao[]>(rotasApi.historico(p, d, c)),
  })
}

export function useRodada(p: string, id: number | null) {
  return useQuery({
    queryKey: chaves.rodada(p, id ?? 0),
    queryFn: () => api<RodadaDetalhe>(rotasApi.rodada(p, id!)),
    enabled: id !== null && id > 0,
  })
}

export function useExecutar(p: string, d: string) {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (corpo: { ambiente: string; cenarios?: string[] }) =>
      api<{ rodada_id: number }>(rotasApi.executar(p, d), { method: 'POST', body: corpo }),
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: chaves.demanda(p, d) })
      cliente.invalidateQueries({ queryKey: chaves.demandas(p) })
    },
  })
}

export function useParar(p: string, id: number) {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: () => api<Rodada>(rotasApi.parar(p, id), { method: 'POST' }),
    onSuccess: (rodada) => {
      cliente.setQueryData<RodadaDetalhe>(chaves.rodada(p, id), (atual) => (atual ? { ...atual, ...rodada } : atual))
      cliente.invalidateQueries({ queryKey: ['demanda', p] })
    },
  })
}

export function useAtualizarExecucao(p: string) {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...corpo }: { id: number; veredito: Veredito; nota: string | null }) =>
      api<Execucao>(rotasApi.execucao(p, id), { method: 'PATCH', body: corpo }),
    onSuccess: () => {
      for (const chave of ['historico', 'rodada', 'demanda', 'demandas', 'matriz']) {
        cliente.invalidateQueries({ queryKey: [chave, p] })
      }
    },
  })
}

export type PedidoEnvio = {
  ambiente: string
  dossie?: string
  cenario?: string
  request: Requisicao
  env?: Record<string, string>
}

export function useEnviar(p: string) {
  return useMutation({
    mutationFn: (corpo: PedidoEnvio) => api<EnvioResultado>(rotasApi.enviar(p), { method: 'POST', body: corpo }),
  })
}

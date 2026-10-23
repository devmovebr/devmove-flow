import { Navigate } from 'react-router'
import { useProjetos } from '../api/consultas'
import { Carregando, Erro, Vazio } from '../ui/Estado'
import { caminhos } from '../util/caminhos'

export function Inicio() {
  const { data, isPending, error } = useProjetos()
  if (isPending) return <Carregando />
  if (error) return <Erro erro={error} />
  if (!data.length) return <Vazio texto="Nenhum projeto encontrado em /workspaces." />
  return <Navigate to={caminhos.demandas(data[0].nome)} replace />
}

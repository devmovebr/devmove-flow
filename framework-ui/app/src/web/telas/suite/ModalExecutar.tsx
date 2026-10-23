import { Play, Server } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAmbientes, useExecutar } from '../../api/consultas'
import { Botao } from '../../ui/Botao'
import { Carregando, Erro, Vazio } from '../../ui/Estado'
import { Modal } from '../../ui/Modal'
import { caminhos, useRota } from '../../util/caminhos'

type Props = { aoFechar: () => void; cenarios?: string[]; inicial?: string }

export function ModalExecutar({ aoFechar, cenarios, inicial }: Props) {
  const { p, d } = useRota()
  const navegar = useNavigate()
  const ambientes = useAmbientes(p)
  const executar = useExecutar(p, d)
  const [escolhido, setEscolhido] = useState(inicial ?? '')
  const ambiente = escolhido || ambientes.data?.[0] || ''

  const confirmar = () =>
    executar.mutate(
      { ambiente, cenarios },
      { onSuccess: ({ rodada_id }) => navegar(caminhos.rodada(p, d, rodada_id)) },
    )

  return (
    <Modal
      titulo={cenarios ? `Executar ${cenarios.join(', ')}` : 'Executar suíte'}
      aoFechar={aoFechar}
      rodape={
        <>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao variante="primario" disabled={!ambiente || executar.isPending} onClick={confirmar}>
            <Play size={12} fill="currentColor" />
            {executar.isPending ? 'Iniciando' : 'Executar'}
          </Botao>
        </>
      }
    >
      <p className="mb-3 text-[12px] text-texto-2">Ambiente</p>
      {ambientes.isPending && <Carregando />}
      {ambientes.error && <Erro erro={ambientes.error} />}
      {ambientes.data && !ambientes.data.length && <Vazio texto="Nenhum arquivo em tools/ambientes/." />}
      <div className="flex flex-col gap-1">
        {ambientes.data?.map((a) => (
          <label
            key={a}
            className={`flex h-9 cursor-pointer items-center gap-2.5 rounded-md border px-3 text-[12.5px] ${
              a === ambiente ? 'border-acento/60 bg-acento-suave' : 'border-borda hover:bg-superficie-2'
            }`}
          >
            <input type="radio" name="ambiente" checked={a === ambiente} onChange={() => setEscolhido(a)} className="accent-acento" />
            <Server size={13} className="text-texto-3" />
            {a}
          </label>
        ))}
      </div>
      {executar.error && <Erro erro={executar.error} />}
    </Modal>
  )
}

import { useState } from 'react'
import type { Execucao, Veredito } from '../../../shared/tipos'
import { useAtualizarExecucao } from '../../api/consultas'
import { Botao } from '../../ui/Botao'
import { Erro } from '../../ui/Estado'
import { IconeVeredito } from '../../ui/IconeVeredito'
import { useRota } from '../../util/caminhos'
import { cor, rotulo, vereditos } from '../../util/veredito'

export function EdicaoVeredito({ execucao }: { execucao: Execucao }) {
  const { p } = useRota()
  const atualizar = useAtualizarExecucao(p)
  const [veredito, setVeredito] = useState<Veredito>(execucao.veredito)
  const [nota, setNota] = useState(execucao.nota ?? '')
  const mudou = veredito !== execucao.veredito || nota !== (execucao.nota ?? '')

  return (
    <div className="border-b border-borda px-4 py-4">
      <div className="text-[12px] font-medium">Veredito da última execução</div>
      <div className="mt-0.5 text-[11px] text-texto-3">
        Rodada #{execucao.rodada_id} · automático: {rotulo[execucao.veredito_auto].toLowerCase()}
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-1.5">
        {vereditos.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setVeredito(v)}
            className="flex h-8 cursor-pointer items-center gap-2 rounded-md border px-2.5 text-[11.5px] transition-colors"
            style={
              v === veredito
                ? { borderColor: `color-mix(in srgb, ${cor[v]} 50%, transparent)`, background: `color-mix(in srgb, ${cor[v]} 14%, transparent)` }
                : { borderColor: 'var(--color-borda)' }
            }
          >
            <IconeVeredito situacao={v} tamanho={13} />
            {rotulo[v]}
          </button>
        ))}
      </div>
      <textarea
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        rows={3}
        placeholder="Nota (opcional)"
        className="mt-2.5 w-full resize-none rounded-md border border-borda bg-painel px-2.5 py-2 text-[12px] outline-none placeholder:text-texto-3 focus:border-acento/60"
      />
      <div className="mt-2 flex justify-end">
        <Botao
          variante="primario"
          disabled={!mudou || atualizar.isPending}
          onClick={() => atualizar.mutate({ id: execucao.id, veredito, nota: nota.trim() || null })}
        >
          {atualizar.isPending ? 'Salvando' : 'Salvar veredito'}
        </Botao>
      </div>
      {atualizar.error && <Erro erro={atualizar.error} />}
    </div>
  )
}

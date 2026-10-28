import { Check, Copy, Eye, EyeOff, KeyRound, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useAmbientes, useComandos, useGerarValor } from '../api/consultas'
import { Botao } from '../ui/Botao'
import { Carregando, Erro } from '../ui/Estado'
import { Modal } from '../ui/Modal'
import { useRota } from '../util/caminhos'
import { hora } from '../util/formato'

// JWT traz a validade no payload; outro formato de token fica sem ela.
function expiracao(valor: string): Date | null {
  const partes = valor.split('.')
  if (partes.length !== 3) return null
  try {
    const payload = JSON.parse(atob(partes[1].replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number }
    return typeof payload.exp === 'number' ? new Date(payload.exp * 1000) : null
  } catch {
    return null
  }
}

const campo = 'h-8 w-full rounded-md border border-borda-forte bg-superficie-2 px-2 text-[12px] outline-none focus:border-acento'

export function ModalToken({ aoFechar }: { aoFechar: () => void }) {
  const { p } = useRota()
  const ambientes = useAmbientes(p)
  const [ambEscolhido, setAmb] = useState('')
  const amb = ambEscolhido || ambientes.data?.[0] || ''
  const comandos = useComandos(p, amb)
  const [nomeEscolhido, setNome] = useState('')
  const nome = comandos.data?.some((c) => c.nome === nomeEscolhido) ? nomeEscolhido : (comandos.data?.[0]?.nome ?? '')
  const comando = comandos.data?.find((c) => c.nome === nome)?.comando
  const gerar = useGerarValor(p)
  const [visivel, setVisivel] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const resultado = gerar.data && gerar.variables?.amb === amb && gerar.variables?.nome === nome ? gerar.data : null
  const exp = resultado ? expiracao(resultado.valor) : null
  const executar = (renovar: boolean) => gerar.mutate({ amb, nome, renovar })
  const copiar = () => {
    if (!resultado) return
    void navigator.clipboard?.writeText(resultado.valor)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1500)
  }

  return (
    <Modal
      titulo="Gerar token"
      aoFechar={aoFechar}
      rodape={
        <>
          {resultado && (
            <Botao onClick={() => executar(true)} disabled={gerar.isPending} title="Ignora o cache de 5 minutos e roda o comando de novo">
              <RefreshCw size={13} />
              Renovar
            </Botao>
          )}
          <Botao variante="primario" onClick={() => executar(false)} disabled={!nome || gerar.isPending}>
            <KeyRound size={13} />
            {gerar.isPending ? 'Gerando…' : 'Gerar'}
          </Botao>
        </>
      }
    >
      {ambientes.isPending && <Carregando />}
      {ambientes.error && <Erro erro={ambientes.error} />}
      {ambientes.data && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-[11px] text-texto-3">
            Ambiente
            <select value={amb} onChange={(e) => setAmb(e.target.value)} className={campo}>
              {ambientes.data.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          {comandos.data && !comandos.data.length && (
            <p className="text-[12px] text-texto-3">
              Nenhuma variável <code className="font-mono">&lt;NOME&gt;_CMD</code> em tools/ambientes/{amb}.env.
            </p>
          )}
          {comandos.data && comandos.data.length > 1 && (
            <label className="flex flex-col gap-1 text-[11px] text-texto-3">
              Variável
              <select value={nome} onChange={(e) => setNome(e.target.value)} className={campo}>
                {comandos.data.map((c) => (
                  <option key={c.nome}>{c.nome}</option>
                ))}
              </select>
            </label>
          )}
          {comando && (
            <div className="truncate font-mono text-[11px] text-texto-3" title={comando}>
              $ {comando}
            </div>
          )}
          {gerar.error && <Erro erro={gerar.error} />}
          {resultado && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-start gap-1 rounded-md border border-borda-forte bg-fundo p-2">
                <code className={`max-h-28 min-w-0 flex-1 overflow-y-auto font-mono text-[11px] break-all ${visivel ? 'text-texto' : 'text-texto-3'}`}>
                  {visivel ? resultado.valor : '•'.repeat(Math.min(resultado.valor.length, 64))}
                </code>
                <button
                  type="button"
                  onClick={() => setVisivel(!visivel)}
                  aria-label={visivel ? 'Ocultar' : 'Mostrar'}
                  className="cursor-pointer p-1 text-texto-3 hover:text-texto"
                >
                  {visivel ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                <button type="button" onClick={copiar} aria-label="Copiar" className="cursor-pointer p-1 text-texto-3 hover:text-texto">
                  {copiado ? <Check size={13} className="text-passou" /> : <Copy size={13} />}
                </button>
              </div>
              <span className="text-[11px] text-texto-3">
                {nome} gerado às {hora(resultado.gerado_em)}
                {exp && ` · expira às ${hora(exp.toISOString())}`}
                {exp && exp.getTime() < Date.parse(resultado.gerado_em) && <span className="text-falhou"> (veio vencido do cache: use Renovar)</span>}
              </span>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

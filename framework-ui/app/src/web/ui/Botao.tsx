import type { ButtonHTMLAttributes } from 'react'
import { classeBotao, type Variante } from '../util/botao'

export function Botao({ variante = 'secundario', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  return (
    <button
      type="button"
      {...props}
      className={`${classeBotao(variante)} ${className}`}
    />
  )
}

export function BotaoIcone({ ativo, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { ativo?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex size-8 cursor-pointer items-center justify-center rounded-md transition-colors ${
        ativo ? 'bg-superficie-3 text-texto' : 'text-texto-2 hover:bg-superficie-2 hover:text-texto'
      } ${className}`}
    />
  )
}

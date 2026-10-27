import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const plugins = [remarkGfm]

// Sem rehype-raw: HTML dentro do markdown aparece como texto, nunca é interpretado.
// memo: o parse é caro e a conversa re-renderiza a cada polling.
export const Markdown = memo(function Markdown({ texto, className = '' }: { texto: string; className?: string }) {
  return (
    <div className={`md ${className}`}>
      <ReactMarkdown remarkPlugins={plugins}>{texto}</ReactMarkdown>
    </div>
  )
})

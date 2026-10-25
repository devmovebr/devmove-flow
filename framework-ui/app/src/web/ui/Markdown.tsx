import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Sem rehype-raw: HTML dentro do markdown aparece como texto, nunca é interpretado.
export function Markdown({ texto, className = '' }: { texto: string; className?: string }) {
  return (
    <div className={`md ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{texto}</ReactMarkdown>
    </div>
  )
}

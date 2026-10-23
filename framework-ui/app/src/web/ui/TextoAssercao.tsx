// Trechos entre crases viram código, como no plano-teste.md.
export function TextoAssercao({ texto }: { texto: string }) {
  return (
    <>
      {texto.split(/(`[^`]+`)/g).map((parte, i) =>
        parte.startsWith('`') && parte.endsWith('`') ? (
          <code key={i} className="rounded bg-superficie-3 px-1 font-mono text-[11px] text-texto">
            {parte.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{parte}</span>
        ),
      )}
    </>
  )
}

import type { Requisicao, Resposta } from '../shared/tipos.ts'

const TIMEOUT_MS = 30_000

export async function enviar(req: Requisicao, sinal?: AbortSignal): Promise<{ resposta: Resposta | null; erro: string | null }> {
  const tempo = AbortSignal.timeout(TIMEOUT_MS)
  const signal = sinal ? AbortSignal.any([tempo, sinal]) : tempo
  const semCorpo = req.method === 'GET' || req.method === 'HEAD'
  const inicio = performance.now()
  try {
    const r = await fetch(req.url, {
      method: req.method,
      headers: req.headers,
      body: semCorpo || !req.body ? undefined : req.body,
      signal,
    })
    const bytes = new Uint8Array(await r.arrayBuffer())
    const tempo_ms = Math.round(performance.now() - inicio)
    return {
      resposta: {
        status: r.status,
        headers: [...r.headers.entries()],
        body: new TextDecoder().decode(bytes),
        tempo_ms,
        tamanho: bytes.byteLength,
      },
      erro: null,
    }
  } catch (e) {
    if (sinal?.aborted) return { resposta: null, erro: 'interrompida' }
    if (tempo.aborted) return { resposta: null, erro: `timeout de ${TIMEOUT_MS / 1000}s` }
    const err = e as Error & { cause?: { code?: string; message?: string } }
    const causa = err.cause?.code ?? err.cause?.message
    return { resposta: null, erro: `falha de rede: ${causa ?? err.message}` }
  }
}

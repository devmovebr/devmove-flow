export class ErroApi extends Error {
  status: number
  constructor(status: number, mensagem: string) {
    super(mensagem)
    this.status = status
  }
}

export async function api<T>(caminho: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const resposta = await fetch(`/api${caminho}`, {
    method: init?.method ?? 'GET',
    headers: init?.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  })
  const texto = await resposta.text()
  if (!resposta.ok) {
    let mensagem = texto || resposta.statusText
    try {
      const json = JSON.parse(texto) as { message?: string; erro?: string }
      mensagem = json.erro ?? json.message ?? mensagem
    } catch {
      // corpo não é JSON
    }
    throw new ErroApi(resposta.status, mensagem)
  }
  return (texto ? JSON.parse(texto) : undefined) as T
}

export const cod = encodeURIComponent

export const rotasApi = {
  projetos: () => '/projetos',
  ambientes: (p: string) => `/projetos/${cod(p)}/ambientes`,
  demandas: (p: string) => `/projetos/${cod(p)}/demandas`,
  demanda: (p: string, d: string) => `/projetos/${cod(p)}/demandas/${cod(d)}`,
  matriz: (p: string, d: string, ambiente?: string) =>
    `/projetos/${cod(p)}/demandas/${cod(d)}/matriz${ambiente ? `?ambiente=${cod(ambiente)}` : ''}`,
  historico: (p: string, d: string, c: string) => `/projetos/${cod(p)}/demandas/${cod(d)}/cenarios/${cod(c)}/historico`,
  executar: (p: string, d: string) => `/projetos/${cod(p)}/demandas/${cod(d)}/executar`,
  rodada: (p: string, id: number) => `/projetos/${cod(p)}/rodadas/${id}`,
  eventos: (p: string, id: number) => `/api/projetos/${cod(p)}/rodadas/${id}/eventos`,
  parar: (p: string, id: number) => `/projetos/${cod(p)}/rodadas/${id}/parar`,
  execucao: (p: string, id: number) => `/projetos/${cod(p)}/execucoes/${id}`,
  enviar: (p: string) => `/projetos/${cod(p)}/enviar`,
}

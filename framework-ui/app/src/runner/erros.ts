export class ErroRunner extends Error {
  statusCode: number
  constructor(mensagem: string, statusCode = 400) {
    super(mensagem)
    this.statusCode = statusCode
  }
}

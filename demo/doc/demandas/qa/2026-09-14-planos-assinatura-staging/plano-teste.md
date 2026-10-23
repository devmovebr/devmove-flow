# Plano de teste: planos-assinatura em staging

## Mudança
Repos `api` e `cobranca`, merges de F1 e F2 de `2026-09-01-planos-assinatura`. Planos Básico e Pro, troca de plano com diferença proporcional, tolerância de 7 dias e modo leitura.

## Ambiente
- `staging` e `local` (`tools/ambientes/`).
- Massa: `massa/planos.sql` cria a clínica `qa-planos` no Básico, ciclo de 30 dias iniciado há 10 dias, e uma fatura vencida há 8 dias na clínica `qa-inadimplente`.

## Variáveis
```env
CLINICA=qa-planos
```

## Cenários

### T1 Consultar plano atual
Pré-condição: clínica qa-planos no Básico, ciclo iniciado há 10 dias.
```http
GET {{BASE}}/v1/assinatura
Authorization: Bearer {{TOKEN}}
X-Clinica: {{CLINICA}}
```
Espera:
- status 200
- `$.plano` == "basico"
- `$.situacao` == "ativa"

### T2 Troca Básico para Pro no dia 10
Pré-condição: T1 passou, plano Básico.
```http
POST {{BASE}}/v1/assinatura/troca
Authorization: Bearer {{TOKEN}}
X-Clinica: {{CLINICA}}
Content-Type: application/json

{"plano":"pro"}
```
Espera:
- status 200
- `$.plano` == "pro"
- `$.vigente_desde` existe

### T3 Diferença proporcional da troca
Pré-condição: T2 passou. Pro 24900, Básico 14900, 20 de 30 dias restantes.
```http
GET {{BASE}}/v1/faturas/proxima
Authorization: Bearer {{TOKEN}}
X-Clinica: {{CLINICA}}
```
Espera:
- status 200
- `$.itens[?(@.tipo=="ajuste_troca")].valor` == 6666
- ajuste = (24900 - 14900) × 20/30 em centavos, arredondado para baixo

### T4 Plano inválido
Pré-condição: nenhuma.
```http
POST {{BASE}}/v1/assinatura/troca
Authorization: Bearer {{TOKEN}}
X-Clinica: {{CLINICA}}
Content-Type: application/json

{"plano":"ouro"}
```
Espera:
- status 422
- `$.codigo` == "PLANO_INVALIDO"

### T5 Inadimplente além da tolerância cria consulta
Pré-condição: clínica qa-inadimplente com fatura vencida há 8 dias.
```env
CLINICA=qa-inadimplente
```
```http
POST {{BASE}}/v1/consultas
Authorization: Bearer {{TOKEN}}
X-Clinica: {{CLINICA}}
Content-Type: application/json

{"paciente_id":"p-qa-1","inicio":"2026-09-20T10:00:00-03:00"}
```
Espera:
- status 403
- `$.codigo` == "MODO_LEITURA"

### T6 Regressão: inadimplente ainda lista a agenda
Pré-condição: clínica qa-inadimplente com 3 consultas na massa.
```env
CLINICA=qa-inadimplente
```
```http
GET {{BASE}}/v1/consultas?dia=hoje
Authorization: Bearer {{TOKEN}}
X-Clinica: {{CLINICA}}
```
Espera:
- status 200
- `$.length` == 3

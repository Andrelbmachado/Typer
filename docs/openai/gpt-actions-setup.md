# Configurar GPT Actions para Typer

Esta integração é local na primeira versão. O servidor deve estar rodando e
acessível ao ambiente que executará a Action; não exponha a porta diretamente
na internet sem uma camada de rede autenticada.

## 1. Inicie o serviço

```bash
export TYPER_PROJECTS_DIR="$HOME/.typer/projects"
export TYPER_ACCESS_DB="$HOME/.typer/access.sqlite"
export TYPER_ADMIN_TOKEN="gere-um-segredo-longo-e-aleatorio"
export TYPER_API_HOST=127.0.0.1
export TYPER_API_PORT=8787
export TYPER_ALLOWED_ORIGINS=http://127.0.0.1:5173
npm run api:serve
```

Abra `http://127.0.0.1:5173/#/admin/access`, informe o token mestre e crie uma
chave com `projects:read`, `projects:write` e `fonts:export`. Copie o segredo
no modal: ele aparece uma única vez.

## 2. Crie a Action

1. No editor do GPT, adicione uma Action e importe `api/openapi.yaml`.
2. Defina autenticação **Bearer** e informe a chave `typer_live_…` criada na
   central de acessos.
3. Cole as instruções de `typer-gpt-instructions.md` no campo de instruções.
4. Faça teste de `GET /v1/presets`, crie um projeto, insira glifos, valide e
   exporte.

O OpenAPI marca operações de escrita e exportação como consequenciais. A API
responde conflitos com `409` e nunca substitui trabalho local sem um
`If-Match` correspondente.

## Limites

- TTF é o único formato de fonte servido pela automação atual.
- Downloads de TTF expiram em dez minutos.
- O token administrativo não é uma API key e não pode ser enviado a Actions.
- A Action não deve usar referências para copiar outlines protegidos.

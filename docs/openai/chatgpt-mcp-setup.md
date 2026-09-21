# Conectar Typer como `@typer` via MCP remoto

O Codex pode usar o MCP stdio diretamente. O ChatGPT não acessa esse processo
local sem uma ponte remota. Para uma conta/workspace com Developer Mode e
permissão de ferramentas MCP de escrita, faça o seguinte.

1. Inicie `npm run api:serve` com `TYPER_ADMIN_TOKEN`, uma pasta de projetos e
   uma chave Bearer com os três escopos.
2. Publique apenas o endpoint local `/mcp` por um túnel privado autenticado.
   Não use uma URL pública irrestrita e não registre o token na URL.
3. No Developer Mode, crie o app MCP apontando para
   `https://seu-tunel-privado/mcp` com autenticação Bearer.
4. Execute **Scan Tools**. Devem aparecer exatamente:
   `typer_list_projects`, `typer_create_project`, `typer_read_project`,
   `typer_get_preset`, `typer_apply_preset`, `typer_upsert_glyphs`,
   `typer_validate_project`, `typer_export_ttf`.
5. Teste criar, alterar, validar e exportar um projeto antes de liberar o app
   ao workspace autorizado.

O adaptador HTTP é Streamable HTTP sem sessão e registra os mesmos handlers do
MCP stdio. A configuração do app no workspace ChatGPT e a publicação do túnel
são etapas manuais: o repositório não consegue criar apps dentro de uma conta
OpenAI.

Referências oficiais: [Developer Mode e MCP apps](https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt) e [Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels).

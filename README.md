# Typer

Typer é um estúdio tipográfico local para desenhar glifos vetoriais, organizar projetos e exportar fontes instaláveis. O editor usa uma prancheta SVG de **1000 × 1000**, mantém um cache offline no IndexedDB e pode sincronizar projetos criados pelo Codex, ChatGPT ou uma GPT Action.

O editor mostra os glifos anterior e seguinte como canvas reduzidos e usa uma transição de carrossel na navegação. Campos numéricos podem ser digitados ou ajustados arrastando horizontalmente. Cada linha-guia possui cor e bloqueio próprios; quando desbloqueada, pode ser arrastada verticalmente no canvas.

## Rodar e verificar

```bash
npm install
npm run dev
npm run lint
npm test
npm run build
npm run openapi:check
npm run test:api
```

Validação completa do MCP, incluindo o estudo vetorial `A/B/C`, a amostra `Helvetica`, exportação e parse do TTF:

```bash
npm run test:mcp
```

Os artefatos de validação são gravados em `output/mcp/` e as evidências do navegador em `output/playwright/`. `test:api` cobre chaves hash-only, escopos, conflito de revisão, API HTTP, handshake MCP HTTP, exportação TTF e parse via `opentype.js`.

## Fluxo do app

1. A Home lista projetos reais salvos neste navegador.
2. **Nova fonte** cria um projeto local e abre o editor.
3. **Importar projeto** aceita um arquivo versionado `.typer.json`, inclusive um criado pelo MCP. Com uma chave de API na sessão, projetos remotos também aparecem automaticamente.
4. No editor, escolha uma letra guia no topo e desenhe com a caneta, formas ou pincel.
5. Camadas selecionam contornos inteiros; o painel de alinhamento centraliza um contorno na área do glifo ou alinha vários contornos entre si.
6. **Exportar** oferece TTF, SVG, PDF, PNG, JPG e JPEG. OTF permanece desabilitado até existir um writer CFF real.

O botão Home salva o projeto antes de voltar. O menu Importar atualiza o projeto a partir de `.typer.json` e baixa uma cópia editável. A rota `#/admin/access` cria, revoga e exclui chaves de automação sem persistir o token mestre no navegador.

No editor, **Importar** aceita `.typer.json`, TTF, OTF, SVG, PNG, JPG e WebP. Arquivos TyperJSON atualizam o projeto atual; fontes e imagens entram como referências visuais persistidas no projeto. Consulte [Agents.md](./Agents.md) para o contrato completo de automação por IA.

## Caneta e edição

- Clique cria um nó de canto.
- Clique e arraste cria um nó suave com alças espelhadas.
- Clique novamente no primeiro nó fecha o contorno.
- `Enter` ou `Escape` encerra o contorno atual sem apagar o trabalho.
- Arrastar um nó move junto suas alças; uma seleção múltipla se move como conjunto.
- Contornos abertos continuam editáveis, mas não entram no TTF.

Atalhos principais: `V` seleção, `P` caneta, `A` nós, `S` retângulo, `B` pincel, `Z` zoom e `H` mover canvas. `⌘/Ctrl+Z`, `⌘/Ctrl+C`, `⌘/Ctrl+V` e `Delete/Backspace` funcionam no editor.

## Servidor MCP

Inicie o servidor stdio:

```bash
npm run mcp:serve
```

O diretório padrão é `~/.typer/projects`. Para usar outro diretório seguro, defina `TYPER_PROJECTS_DIR`; `TYPER_MCP_PROJECTS_DIR` continua aceito como alias. Exemplo de registro no Codex:

```bash
codex mcp add typer --env TYPER_MCP_PROJECTS_DIR=$HOME/.typer/projects -- \
  node /Users/andremachado/Documents/Trabalho/Sites/Typer/node_modules/tsx/dist/cli.mjs \
  /Users/andremachado/Documents/Trabalho/Sites/Typer/mcp/server.ts
```

Configuração genérica de cliente MCP:

```json
{
  "mcpServers": {
    "typer": {
      "command": "node",
      "args": [
        "/Users/andremachado/Documents/Trabalho/Sites/Typer/node_modules/tsx/dist/cli.mjs",
        "/Users/andremachado/Documents/Trabalho/Sites/Typer/mcp/server.ts"
      ],
      "env": {
        "TYPER_MCP_PROJECTS_DIR": "/Users/andremachado/.typer/projects"
      }
    }
  }
}
```

Ferramentas disponíveis:

- `typer_list_projects`
- `typer_create_project`
- `typer_read_project`
- `typer_get_preset`
- `typer_get_reference_profile`
- `typer_create_reference_set`
- `typer_apply_preset`
- `typer_upsert_glyphs`
- `typer_validate_project`
- `typer_export_ttf`

Fluxo recomendado para uma IA: consultar `reference-neutral-regular-abc` → criar o estudo `A/B/C` → validar curvas, eixos e contraformas → revisar no canvas 1000 × 1000 → só então ampliar a família. Para geração manual, crie projeto → consulte/aplique preset → insira glifos em lote → valide caracteres obrigatórios → exporte TTF. A fonte de teste `Typer Neutral` cria `H/e/l/v/t/i/c/a` com desenho original de uma sans neutra, não uma cópia de Helvetica.

## API REST, chave e sincronização

Inicie o serviço HTTP local:

```bash
export TYPER_PROJECTS_DIR="$HOME/.typer/projects"
export TYPER_ACCESS_DB="$HOME/.typer/access.sqlite"
export TYPER_ADMIN_TOKEN="um-segredo-longo-e-aleatorio"
export TYPER_API_HOST=127.0.0.1
export TYPER_API_PORT=8787
export TYPER_ALLOWED_ORIGINS=http://127.0.0.1:5173
npm run api:serve
```

O serviço oferece `http://127.0.0.1:8787/docs`, `openapi.json` e o contrato versionado em [api/openapi.yaml](./api/openapi.yaml). A central `#/admin/access` usa o token mestre somente em memória para emitir uma chave `typer_live_…`. O banco SQLite guarda **somente SHA-256**, prefixo, escopos, status e auditoria; o segredo aparece uma vez.

Escopos: `projects:read`, `projects:write`, `fonts:export`. O editor salva primeiro no IndexedDB. Quando existe uma chave na sessão, ele usa ETag/`If-Match` para sincronizar e consulta o servidor periodicamente. Conflitos retornam `409` e oferecem aceitar o servidor, manter o local ou salvar uma cópia.

Endpoints: `GET /healthz`, `GET /openapi.json`, `GET /docs`, presets, projetos, preset, glifos, validação, TTF/download e endpoints administrativos em `/v1/admin/*`. OTF não é exposto pela API porque ainda não há writer CFF válido.

## ChatGPT `@typer` e GPT Actions

- `npm run mcp:http` inicia o adaptador MCP Streamable HTTP em `/mcp` (é o mesmo servidor da API). Ele compartilha as mesmas oito ferramentas do stdio.
- Para usar `@typer` no ChatGPT, a instância local precisa estar atrás de um túnel privado e o workspace precisa ter Developer Mode compatível; a criação/publicação do app é manual. Veja [docs/openai/chatgpt-mcp-setup.md](./docs/openai/chatgpt-mcp-setup.md).
- Para uma GPT Action, importe [api/openapi.yaml](./api/openapi.yaml), configure Bearer com uma chave limitada e siga [docs/openai/gpt-actions-setup.md](./docs/openai/gpt-actions-setup.md). As instruções do GPT estão em [docs/openai/typer-gpt-instructions.md](./docs/openai/typer-gpt-instructions.md).

## Presets vetoriais

- `neutral-grotesk`: baixo contraste e proporções neutras.
- `geometric-sans`: construção modular e círculos amplos.
- `humanist-sans`: curvas mais orgânicas e contraste moderado.

Cada preset declara UPM, ascender, descender, cap height, x-height, espessura sugerida, overshoot, largura e side bearing. O MCP devolve esses dados para orientar a geração consistente dos glifos.

## Tecnologias

React, TypeScript, Vite, Zustand, IndexedDB, Fastify, SQLite (`better-sqlite3`), `opentype.js`, jsPDF, Lucide, Model Context Protocol SDK, Zod e Vitest.

Veja [agent.md](./agent.md) para o mapa técnico e [design.md](./design.md) para as regras de interface.

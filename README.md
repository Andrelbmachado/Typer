# Typer ✒️

**O "Illustrator das fontes", feito para humanos e para agentes de IA.**

Typer é um estúdio tipográfico local: você desenha glifos vetoriais numa prancheta de **1000 × 1000**, organiza projetos e exporta uma fonte **TTF instalável**. O diferencial é ser **agent-friendly** — Claude, ChatGPT, Codex ou qualquer cliente MCP consegue criar, validar e exportar uma fonte inteira pelo **servidor MCP** ou pela **API REST**, enquanto você revisa e refina tudo no editor visual.

```
agente (MCP/REST) ──► typerService ──► projeto .typer.json ──► editor visual ──► TTF
                            ▲                                       │
                            └──────── sincronização (ETag) ─────────┘
```

## Por que usar

- **Um núcleo, três portas.** MCP stdio, MCP Streamable HTTP e REST chamam os mesmos handlers de `src/server/typerService.ts` — o que um agente faz, o editor vê.
- **Agente gera, humano refina.** Presets vetoriais e perfis de referência dão ao agente métricas consistentes; o editor serve para revisão e ajuste fino.
- **Local e offline primeiro.** Projetos ficam no IndexedDB do navegador e em `~/.typer/projects`; a sincronização é opcional.
- **Acesso controlado.** Chaves com escopo, armazenadas só como SHA-256, e conflitos de revisão explícitos (`409`).

## Status

| Área | Status |
|---|---|
| Editor SVG 1000×1000: caneta, nós, retângulo, pincel, guias com cor/bloqueio, carrossel de glifos | ✅ |
| Métricas por glifo (largura de avanço e side bearings) | ✅ |
| Projetos locais (IndexedDB) e import/export `.typer.json` | ✅ |
| Referências visuais: PNG, JPG, WebP, SVG, TTF e OTF (camada de baixa opacidade) | ✅ |
| Exportação TTF (fonte inteira) e SVG/PDF/PNG/JPG (glifo atual) | ✅ |
| Servidor MCP (10 ferramentas) e API REST com OpenAPI, chaves e escopos | ✅ |
| Sincronização editor ↔ servidor com ETag e resolução de conflito | ✅ |
| Página Aprender (`#/learn`) | ✅ |
| Deploy do front-end estático no GitHub Pages | ✅ |
| Testes no CI (`lint`/`test`/`build`/`openapi:check`/`test:api`/`test:mcp`) + `npm audit` | ✅ |
| Exportação OTF (writer CFF) e WOFF2 | **planejado** |
| Kerning (manual/automático) | **planejado** |
| Variable fonts (eixo de peso) | **planejado** |
| Importar SVG/fonte como contornos editáveis (hoje entram só como referência) | **planejado** |
| Prévia PNG devolvida ao agente para autoavaliação | **planejado** |

Roteiro detalhado em **[PLANO.md](PLANO.md)**.

---

## Início rápido

Requer Node.js 20+.

```bash
npm install
npm run dev          # editor em http://localhost:5173
```

Abra a Home, clique em **Nova fonte**, escolha uma letra guia no topo e comece a desenhar com a caneta (`P`).

### Conectar um agente via MCP (stdio)

```bash
npm run mcp:serve
```

Configuração genérica de cliente MCP (troque `<repo>` pelo caminho absoluto deste repositório):

```json
{
  "mcpServers": {
    "typer": {
      "command": "node",
      "args": [
        "<repo>/node_modules/tsx/dist/cli.mjs",
        "<repo>/mcp/server.ts"
      ],
      "env": {
        "TYPER_PROJECTS_DIR": "/Users/<voce>/.typer/projects"
      }
    }
  }
}
```

Claude Code:

```bash
claude mcp add typer --env TYPER_PROJECTS_DIR=$HOME/.typer/projects -- \
  node <repo>/node_modules/tsx/dist/cli.mjs <repo>/mcp/server.ts
```

Codex:

```bash
codex mcp add typer --env TYPER_PROJECTS_DIR=$HOME/.typer/projects -- \
  node <repo>/node_modules/tsx/dist/cli.mjs <repo>/mcp/server.ts
```

O diretório padrão é `~/.typer/projects`. `TYPER_MCP_PROJECTS_DIR` continua aceito como alias de `TYPER_PROJECTS_DIR`.

Depois peça ao agente algo como: *"Crie um projeto Typer chamado Minha Sans, aplique o preset `neutral-grotesk`, desenhe A, B e C, valide e exporte o TTF."*

## Ferramentas MCP

| Ferramenta | O que faz |
|---|---|
| `typer_list_projects` | Lista projetos no diretório de projetos |
| `typer_create_project` | Cria um projeto vazio |
| `typer_read_project` | Lê um projeto completo |
| `typer_get_preset` | Devolve métricas de um preset vetorial |
| `typer_apply_preset` | Aplica um preset a um projeto |
| `typer_get_reference_profile` | Devolve um perfil de referência (ex.: `reference-neutral-regular-abc`) |
| `typer_create_reference_set` | Cria um projeto de estudo a partir de um perfil |
| `typer_upsert_glyphs` | Insere ou atualiza glifos em lote |
| `typer_validate_project` | Valida contornos e caracteres obrigatórios |
| `typer_export_ttf` | Exporta o TTF (exige contornos fechados) |

**Fluxo recomendado para uma IA:** criar projeto → consultar/aplicar preset → `upsert_glyphs` em lote → `validate_project` → `export_ttf`. Para estudos, consultar `reference-neutral-regular-abc` → criar o estudo `A/B/C` → validar curvas, eixos e contraformas → revisar no canvas → só então ampliar a família.

O contrato completo para agentes (modelo geométrico, guias, referências, regras de segurança) está em **[Agents.md](./Agents.md)**.

### Presets vetoriais

- `neutral-grotesk` — baixo contraste e proporções neutras.
- `geometric-sans` — construção modular e círculos amplos.
- `humanist-sans` — curvas mais orgânicas e contraste moderado.

Cada preset declara UPM, ascender, descender, cap height, x-height, espessura sugerida, overshoot, largura e side bearing.

### Scripts de exemplo

```bash
npm run font:reference   # gera "Typer Reference Sans ABC" (.ttf, .typer.json e specimen HTML) na Área de Trabalho
npm run pen:exercises    # gera um projeto de exercícios da caneta na Área de Trabalho
```

Use `TYPER_DESKTOP_DIR` para mudar a pasta de saída. A amostra `Typer Neutral` (`H/e/l/v/t/i/c/a`, usada nos testes) é um desenho original de sans neutra — não uma cópia de Helvetica.

## Usando o editor

1. A **Home** (`#/home`) lista os projetos salvos neste navegador e, com uma chave de API na sessão, também os do servidor.
2. **Nova fonte** cria um projeto local e abre o editor (`#/editor/<projectId>`).
3. **Importar** aceita `.typer.json` (atualiza o projeto) e TTF, OTF, SVG, PNG, JPG e WebP (entram como referências visuais persistidas).
4. Escolha uma letra guia no topo; os glifos anterior e seguinte aparecem como miniaturas no carrossel.
5. **Camadas** seleciona contornos inteiros; **Alinhar e centralizar** centraliza um contorno no glifo ou alinha vários entre si.
6. **Exportar** oferece TTF (fonte inteira) e SVG, PDF, PNG, JPG e JPEG (glifo atual). OTF aparece desabilitado até existir um writer CFF.

O botão Home salva antes de voltar. Campos numéricos aceitam digitação ou arraste horizontal. Cada linha-guia tem cor e bloqueio próprios; desbloqueada, pode ser arrastada no canvas.

### Caneta

- Clique cria um nó de canto; clique e arraste cria um nó suave com alças espelhadas.
- Clique no primeiro nó para fechar o contorno; `Enter` ou `Escape` encerra sem apagar.
- Arrastar um nó move junto suas alças; seleções múltiplas se movem em conjunto.
- Contornos abertos continuam editáveis, mas não entram no TTF.

### Atalhos

| Tecla | Ferramenta | Tecla | Ferramenta |
|---|---|---|---|
| `V` | Selecionar | `E` | Excluir nó |
| `P` | Caneta | `C` | Abrir contorno (tesoura) |
| `A` | Editar nós | `T` | Inverter contorno |
| `S` | Retângulo | `Z` | Zoom |
| `B` | Pincel livre | `H` | Mover canvas |

Também: `⌘/Ctrl+Z`, `⌘/Ctrl+C`, `⌘/Ctrl+V` e `Delete/Backspace`.

## API REST, chaves e sincronização

```bash
export TYPER_PROJECTS_DIR="$HOME/.typer/projects"
export TYPER_ACCESS_DB="$HOME/.typer/access.sqlite"
export TYPER_ADMIN_TOKEN="um-segredo-longo-e-aleatorio"
export TYPER_API_HOST=127.0.0.1
export TYPER_API_PORT=8787
export TYPER_ALLOWED_ORIGINS=http://127.0.0.1:5173
npm run api:serve
```

- Docs interativas em `http://127.0.0.1:8787/docs`; contrato em `/openapi.json` e [api/openapi.yaml](./api/openapi.yaml).
- Endpoints públicos (`/v1/...`): `healthz`, presets, perfis de referência, projetos, conjunto de referência, preset, glifos, validação, exportação TTF e download. Admin: `/v1/admin/keys` e `/v1/admin/audit`.
- A central `#/admin/access` usa o token mestre **só em memória** para emitir chaves `typer_live_…`. O SQLite guarda apenas SHA-256, prefixo, escopos, status e auditoria; o segredo aparece uma única vez.
- Escopos: `projects:read`, `projects:write`, `fonts:export`.
- O editor salva primeiro no IndexedDB. Com uma chave na sessão, sincroniza via ETag/`If-Match` e consulta o servidor a cada 5 s. Um `409` abre a escolha: aceitar a versão do servidor, manter a local ou salvar como novo projeto.

> **Segurança:** nunca grave `TYPER_ADMIN_TOKEN` em arquivo versionado, IndexedDB, logs ou prompts. Agentes (GPT/MCP) não criam nem revogam chaves.

## ChatGPT `@typer` e GPT Actions

- `npm run mcp:http` sobe o mesmo servidor da API, com MCP Streamable HTTP em `POST /mcp` e as mesmas 10 ferramentas do stdio.
- Para `@typer` no ChatGPT, exponha a instância só por túnel privado com Developer Mode habilitado; a criação do app é manual. Veja [docs/openai/chatgpt-mcp-setup.md](./docs/openai/chatgpt-mcp-setup.md).
- Para GPT Actions, importe [api/openapi.yaml](./api/openapi.yaml) com Bearer de uma chave limitada e siga [docs/openai/gpt-actions-setup.md](./docs/openai/gpt-actions-setup.md) e [docs/openai/typer-gpt-instructions.md](./docs/openai/typer-gpt-instructions.md).

## Verificação

```bash
npm run lint
npm test               # Vitest: geometria (caneta, alinhamento), fonte, perfis de referência
npm run build
npm run openapi:check
npm run test:api       # chaves hash-only, escopos, 409, REST, handshake MCP HTTP, TTF + parse opentype.js
npm run test:mcp       # MCP ponta a ponta: estudo A/B/C, amostra Typer Neutral, export e parse do TTF
```

Artefatos ficam em `output/mcp/` e `output/api/`. Hoje esses comandos rodam localmente; levá-los ao CI é a Fase 1 do [PLANO.md](PLANO.md).

## Tecnologias

React 18, TypeScript, Vite, Zustand, IndexedDB, Fastify, SQLite (`better-sqlite3`), `opentype.js`, jsPDF, Lucide, Model Context Protocol SDK, Zod e Vitest.

## Documentação relacionada

- [Agents.md](./Agents.md) — guia operacional para agentes de IA.
- [agent.md](./agent.md) — mapa técnico do código.
- [design.md](./design.md) e [design-qa.md](./design-qa.md) — regras e QA de interface.
- [PLANO.md](PLANO.md) — roteiro por fases.

## Direitos sobre desenhos

Typer não copia outlines proprietários. Fontes externas importadas servem só como referência visual; extraia características gerais, nunca replique contornos.

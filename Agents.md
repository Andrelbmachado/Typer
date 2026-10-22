# Typer — Guia operacional para agentes de IA

Typer é um editor local de fontes vetoriais. O agente deve preferir o serviço compartilhado por MCP ou API para criar/alterar projetos e usar o editor visual para revisão humana e ajustes finos. Nunca copie outlines proprietários; a amostra `Helvetica` do repositório é uma sans neutra original de validação.

## Conexão MCP

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
        "TYPER_PROJECTS_DIR": "/Users/andremachado/.typer/projects"
      }
    }
  }
}
```

Também é possível iniciar manualmente com `npm run mcp:serve`. `TYPER_MCP_PROJECTS_DIR` é um alias retrocompatível.

## API, MCP HTTP e GPT Actions

O núcleo `src/server/typerService.ts` é a fonte única para arquivos, presets,
glifos, validação e TTF. MCP stdio, MCP Streamable HTTP (`POST /mcp`) e REST
chamam os mesmos handlers, portanto não implemente comportamento novo em um
transporte isolado.

```bash
TYPER_PROJECTS_DIR="$HOME/.typer/projects" \
TYPER_ACCESS_DB="$HOME/.typer/access.sqlite" \
TYPER_ADMIN_TOKEN="segredo-de-admin" \
npm run api:serve
```

- REST/OpenAPI: `http://127.0.0.1:8787/openapi.json` e `api/openapi.yaml`.
- Docs: `http://127.0.0.1:8787/docs`.
- MCP remoto: `POST /mcp`, Bearer com os três escopos; expor somente através
  de túnel privado aprovado para ChatGPT Developer Mode.
- GPT Actions: importar `api/openapi.yaml` e usar uma chave limitada. Ler
  `docs/openai/typer-gpt-instructions.md` antes de agir.

## Autorização

- Chaves têm formato `typer_live_…`, são mostradas somente na criação e o
  SQLite guarda apenas SHA-256.
- Escopos: `projects:read`, `projects:write`, `fonts:export`.
- O token mestre é `X-Typer-Admin-Token`; nunca o grave em arquivo, IndexedDB,
  logs, prompts ou API keys.
- Admin local: `#/admin/access`. GPT/MCP não criam/revogam/excluem chaves.
- Atualizações REST completas exigem `If-Match`; `409` é um conflito que deve
  ser resolvido, jamais ignorado.

## Fluxo seguro

1. Chame `typer_create_project`.
2. Consulte ou aplique `neutral-grotesk`, `geometric-sans` ou `humanist-sans`.
3. Use `typer_upsert_glyphs` para inserir glifos em lote.
4. Chame `typer_validate_project` antes de qualquer exportação.
5. Use `typer_export_ttf` apenas depois que todos os contornos obrigatórios estiverem fechados.
6. Exporte TTF. Com a chave de API ativa na sessão, o projeto aparece e
   sincroniza automaticamente na Home/editor; `.typer.json` segue como
   fallback offline.

Ferramentas: `typer_list_projects`, `typer_create_project`, `typer_read_project`, `typer_get_preset`, `typer_apply_preset`, `typer_upsert_glyphs`, `typer_validate_project` e `typer_export_ttf`.

## Modelo geométrico

- UPM: `1000`.
- Coordenadas internas: eixo Y cresce para cima.
- Frame padrão: X `0…1000`, Y `-200…800`.
- Um `GlyphPath` fechado precisa de no mínimo três nós.
- Cada nó aceita `handleIn` e `handleOut` em coordenadas absolutas.
- Ao mover uma âncora, mova as duas alças pelo mesmo delta para preservar a curva.
- Não tente exportar contornos abertos como parte de uma fonte.

## Guias e referências

- `guides` define ascender, cap height, x-height, baseline e descender.
- `guideSettings` guarda cor e bloqueio. Respeite guias bloqueadas; a interface humana pode desbloqueá-las para arraste.
- `references` contém PNG, SVG ou prévias vetoriais produzidas a partir de TTF/OTF. São camadas visuais de baixa opacidade, nunca outlines a serem copiados automaticamente.
- Ao usar uma fonte externa como referência, extraia características gerais; não replique outlines proprietários.

## Interface e automação visual

- Home: `#/home`; Aprender: `#/learn`; acesso: `#/admin/access`; editor: `#/editor/<projectId>`.
- A barra superior importa TyperJSON, TTF, OTF, SVG, PNG, JPG e WebP. Um TyperJSON atualiza o projeto; os demais entram como referência visual.
- Os painéis Camadas, Alinhar e centralizar, Propriedades, Linhas-guia e Referências são recolhíveis.
- Campos numéricos aceitam digitação e arraste horizontal.
- Use seleções de contorno para alinhamento de objetos; use seleção de nós para alinhamento pontual.
- Atalhos: `V`, `P`, `A`, `S`, `B`, `E`, `C`, `T`, `Z`, `H`; `Cmd/Ctrl+Z`, `Cmd/Ctrl+C`, `Cmd/Ctrl+V`, `Delete`.

## Quatro princípios de Karpathy para o agente

Andrej Karpathy descreve o trabalho produtivo com agentes de código como manter o
agente "na coleira". Em Typer isso vira quatro regras não-negociáveis:

1. **Passos pequenos e verificáveis.** Prefira muitas edições pequenas a um diff
   gigante. Cada passo deve caber na cabeça de um revisor humano. O hook *Blast
   Radius* abaixo bloqueia edições grandes demais.
2. **Verifique cada passo.** Depois de qualquer mudança de código, rode a
   verificação obrigatória (abaixo). Não empilhe mudanças sobre um estado não
   testado.
3. **Humano no loop em zonas sensíveis.** Contrato público (`api/openapi.yaml`),
   núcleo compartilhado (`src/server/typerService.ts`), CI (`.github/workflows/`)
   e autorização exigem confirmação humana explícita, não "autopilot".
4. **Tudo auditável e reproduzível.** Toda edição de agente deve deixar rastro
   para replay posterior. O hook *Replay Theater* registra isso.

## Hooks de revisão: Blast Radius e Replay Theater

Dois hooks opcionais (Node puro, sem dependências) materializam os princípios 1,
3 e 4. Eles seguem o protocolo de hooks do Claude Code (leem JSON em stdin).

- `scripts/agent-hooks/blast-radius.mjs` — **PreToolUse** em `Edit|Write|MultiEdit`.
  Estima o raio de impacto (linhas tocadas) e bloqueia (exit 2) quando passa de
  `TYPER_BLAST_MAX_LINES` (padrão 150) ou quando toca arquivo sensível. Override
  consciente: `TYPER_BLAST_ALLOW_BIG=1` (uso humano, nunca em prompt de agente).
- `scripts/agent-hooks/replay-theater.mjs` — **PostToolUse** em `Edit|Write|MultiEdit`.
  Nunca bloqueia; grava um evento JSONL append-only em `output/agent-replay/<data>.jsonl`
  (arquivo, ferramenta, raio, timestamp) para dar "replay" na sessão depois.

Para ativar, adicione ao seu `.claude/settings.json` (ou `settings.local.json`):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          { "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/scripts/agent-hooks/blast-radius.mjs\"" }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          { "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/scripts/agent-hooks/replay-theater.mjs\"" }
        ]
      }
    ]
  }
}
```

Teste rápido sem o Claude Code (simula o payload de hook):

```bash
echo '{"tool_name":"Write","tool_input":{"file_path":"x.ts","content":"a\nb"}}' \
  | node scripts/agent-hooks/blast-radius.mjs; echo "exit=$?"
```

## Verificação obrigatória

```bash
npm run lint
npm test
npm run build
npm run test:mcp
npm run openapi:check
npm run test:api
npm audit --audit-level=high
```

Essa mesma sequência roda no CI (`.github/workflows/ci.yml`) em todo push e pull
request. Para alterações de UI, valide no navegador: importação, recolhimento de
painéis, restauração de guias, referências, carrossel, toolbar móvel, cursor por
ferramenta e exportação. Não use emojis na interface; use Lucide e rótulos
acessíveis.

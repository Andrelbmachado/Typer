# Typer

Typer é um estúdio tipográfico local para desenhar glifos vetoriais, organizar projetos e exportar fontes instaláveis. O editor usa uma prancheta SVG de **1000 × 1000**, salva projetos no IndexedDB e pode receber alfabetos produzidos por qualquer cliente compatível com MCP.

O editor mostra os glifos anterior e seguinte como canvas reduzidos e usa uma transição de carrossel na navegação. Campos numéricos podem ser digitados ou ajustados arrastando horizontalmente. Cada linha-guia possui cor e bloqueio próprios; quando desbloqueada, pode ser arrastada verticalmente no canvas.

## Rodar e verificar

```bash
npm install
npm run dev
npm run lint
npm test
npm run build
```

Validação completa do MCP, incluindo criação de oito glifos, exportação e parse do TTF:

```bash
npm run test:mcp
```

Os artefatos de validação são gravados em `output/mcp/` e as evidências do navegador em `output/playwright/`.

## Fluxo do app

1. A Home lista projetos reais salvos neste navegador.
2. **Nova fonte** cria um projeto local e abre o editor.
3. **Importar projeto** aceita um arquivo versionado `.typer.json`, inclusive um criado pelo MCP.
4. No editor, escolha uma letra guia no topo e desenhe com a caneta, formas ou pincel.
5. Camadas selecionam contornos inteiros; o painel de alinhamento centraliza um contorno na área do glifo ou alinha vários contornos entre si.
6. **Exportar** oferece TTF, SVG, PDF, PNG, JPG e JPEG. OTF permanece desabilitado até existir um writer CFF real.

O botão Home salva o projeto antes de voltar. Os botões ao lado de Exportar atualizam o projeto a partir de `.typer.json` e baixam uma cópia editável.

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

O diretório padrão é `~/.typer/projects`. Para usar outro diretório seguro, defina `TYPER_MCP_PROJECTS_DIR`. Exemplo genérico de configuração de cliente MCP:

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
- `typer_apply_preset`
- `typer_upsert_glyphs`
- `typer_validate_project`
- `typer_export_ttf`

Fluxo recomendado para uma IA: criar projeto → consultar/aplicar preset → inserir glifos em lote → validar caracteres obrigatórios → exportar TTF. Depois, importe o `.typer.json` no Typer para continuar a edição manual.

## Presets vetoriais

- `neutral-grotesk`: baixo contraste e proporções neutras.
- `geometric-sans`: construção modular e círculos amplos.
- `humanist-sans`: curvas mais orgânicas e contraste moderado.

Cada preset declara UPM, ascender, descender, cap height, x-height, espessura sugerida, overshoot, largura e side bearing. O MCP devolve esses dados para orientar a geração consistente dos glifos.

## Tecnologias

React, TypeScript, Vite, Zustand, IndexedDB, `opentype.js`, jsPDF, Lucide, Model Context Protocol SDK, Zod e Vitest.

Veja [agent.md](./agent.md) para o mapa técnico e [design.md](./design.md) para as regras de interface.

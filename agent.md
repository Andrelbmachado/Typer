# Guia para agentes: Typer

## Objetivo e invariantes

Typer é um editor de fontes client-side com um servidor MCP stdio opcional. O formato interno usa eixo Y para cima, UPM 1000 e prancheta SVG `1000 × 1000`. Não altere essa escala sem atualizar canvas, previews, presets, validação MCP e exportadores.

Invariantes:

- Fonte: UPM 1000, ascender 800, descender -200 por padrão.
- Canvas: viewBox 1000 × 1000, margem visual 100 e transformação Y invertida.
- TTF: `.notdef` primeiro; só contornos fechados com pelo menos três nós.
- Projeto importável: `format: "typer-project"`, `fileVersion: 1` e `FontProject.version: 1`.
- UI: não usar emojis; usar a biblioteca de ícones existente e rótulos acessíveis.
- OTF: só habilitar quando um exporter CFF válido puder ser testado por parse independente.
- `guideSettings`: cor e bloqueio de cada linha-guia pertencem ao projeto e precisam sobreviver à importação/exportação.
- Guias desbloqueadas aceitam arraste vertical; guias bloqueadas não capturam o ponteiro.

## Mapa do app

```text
src/
├── components/
│   └── ScrubNumberInput.tsx campo numérico com ajuste por arraste horizontal
├── app/
│   ├── App.tsx              roteamento hash Home/editor
│   ├── HomeScreen.tsx       projetos locais, criação e importação
│   ├── EditorScreen.tsx     shell do editor, autosave, atalhos e navegação
│   └── styles.css           tokens, Home, editor e sidebar clara
├── editor/
│   ├── Canvas.tsx           SVG 1000 × 1000 e interações vetoriais
│   └── MiniGlyphPreview.tsx prévias na mesma transformação do canvas
├── geometry/
│   ├── Align.ts             alinhamento de nós/contornos e translação de alças
│   ├── Node.ts              PathNode e pontos Bézier
│   └── Path.ts              GlyphPath e serialização SVG
├── panels/                  ferramentas, letras guia, camadas, métricas e exportação
├── persistence/IndexedDB.ts registro local e migração do autosave legado
├── store/                   Zustand para documento, histórico e estado de edição
├── typography/
│   ├── Font.ts              FontProject e charset
│   ├── Glyph.ts             glifos e métricas
│   └── ProjectFile.ts       envelope .typer.json e validação de importação
└── font-engine/OpenTypeExporter.ts

mcp/
├── server.ts                oito ferramentas MCP via stdio
├── projectFiles.ts          sandbox de arquivos, normalização e validação
├── presets.ts               presets e parâmetros vetoriais
├── neutralHelvetica.ts      amostra original H/e/l/v/t/i/c/a
└── integrationTest.ts       cliente MCP real, TTF e espécime FontFace
```

## Persistência e rotas

O IndexedDB `FonteForte`, store `projects`, mantém registros nas chaves `project:<uuid>`. Na primeira listagem sem registros novos, `autosave` é migrado sem ser apagado. Rotas:

- `#/home`
- `#/editor/<projectId>`

O editor só inicia autosave depois de carregar o registro solicitado. O botão Home força um save antes da navegação.

## Seleção e geometria

`selectedNodeIds` representa edição de pontos. `selectedPathIds` representa seleção de objetos pelo painel Camadas. Ao alinhar:

- um contorno usa o frame tipográfico `{0…1000, -200…800}`;
- vários contornos usam os limites combinados da seleção;
- nós individuais usam os limites dos pontos selecionados;
- toda translação passa por `translateNode`, movendo `handleIn` e `handleOut` com a âncora.

No canvas, mantenha a conversão:

```text
translate(MARGIN, MARGIN + ascender * scale) scale(scale, -scale)
```

Eventos de ponteiro usam refs porque eventos consecutivos podem ocorrer antes do próximo render React.

## MCP e formato de dados

O servidor nunca recebe caminhos arbitrários: ferramentas trabalham por `projectId`, validado contra caracteres seguros, dentro de `TYPER_MCP_PROJECTS_DIR`. `stdout` é exclusivo do JSON-RPC; logs usam `stderr`.

`typer_upsert_glyphs` recebe Unicode, métricas e contornos. IDs podem ser omitidos e são criados pelo servidor. Sempre chamar `typer_validate_project` com os caracteres obrigatórios antes de exportar.

Para provar interoperabilidade:

```bash
npm run test:mcp
```

O teste inicia o servidor por stdio, chama as ferramentas pelo cliente oficial, cria oito glifos originais, gera TTF, reabre com `opentype.js` e cria `output/mcp/specimen.html`.

## Checklist para mudanças

```bash
npm run lint
npm test
npm run build
npm run test:mcp
```

Para alterações visuais ou de interação, rode o app e teste em navegador real: Home, importação, caneta, fechamento, seleção de camada, alinhamento, undo/redo, copy/paste/delete, exportação e retorno à Home. Guarde evidências em `output/playwright/`.

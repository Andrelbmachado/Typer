# Typer — Guia operacional para agentes de IA

Typer é um editor local de fontes vetoriais. O agente deve preferir o servidor MCP por stdio para criar ou alterar projetos e usar o editor visual para revisão humana e ajustes finos.

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
        "TYPER_MCP_PROJECTS_DIR": "/Users/andremachado/.typer/projects"
      }
    }
  }
}
```

Também é possível iniciar manualmente com `npm run mcp:serve`.

## Fluxo seguro

1. Chame `typer_create_project`.
2. Consulte ou aplique `neutral-grotesk`, `geometric-sans` ou `humanist-sans`.
3. Use `typer_upsert_glyphs` para inserir glifos em lote.
4. Chame `typer_validate_project` antes de qualquer exportação.
5. Use `typer_export_ttf` apenas depois que todos os contornos obrigatórios estiverem fechados.
6. Entregue o `.typer.json` para importação explícita no editor Typer.

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

- Home: `#/home`; Aprender: `#/learn`; editor: `#/editor/<projectId>`.
- A barra superior importa TyperJSON, TTF, OTF, SVG, PNG, JPG e WebP. Um TyperJSON atualiza o projeto; os demais entram como referência visual.
- Os painéis Camadas, Alinhar e centralizar, Propriedades, Linhas-guia e Referências são recolhíveis.
- Campos numéricos aceitam digitação e arraste horizontal.
- Use seleções de contorno para alinhamento de objetos; use seleção de nós para alinhamento pontual.
- Atalhos: `V`, `P`, `A`, `S`, `B`, `E`, `C`, `T`, `Z`, `H`; `Cmd/Ctrl+Z`, `Cmd/Ctrl+C`, `Cmd/Ctrl+V`, `Delete`.

## Verificação obrigatória

```bash
npm run lint
npm test
npm run build
npm run test:mcp
```

Para alterações de UI, valide no navegador: importação, recolhimento de painéis, restauração de guias, referências, carrossel, toolbar móvel, cursor por ferramenta e exportação. Não use emojis na interface; use Lucide e rótulos acessíveis.

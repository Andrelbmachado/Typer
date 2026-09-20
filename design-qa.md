# Design QA — Typer

## Evidências

- Verdade visual da Home: `/var/folders/rw/8g20mjtj1lj3_3h1dr782c400000gn/T/codex-clipboard-53030e19-93d8-43b3-8538-511e04470a42.png` — 2978 × 2030 px.
- Verdade visual tipográfica: `/var/folders/rw/8g20mjtj1lj3_3h1dr782c400000gn/T/codex-clipboard-dade1583-acb3-49a3-9268-6cf3cb0f3aa3.png` — 1000 × 500 px.
- Home implementada: `output/playwright/typer-ai-upgrade/home-with-project.png` — viewport e captura 1728 × 1100 CSS px, DPR 1.
- Editor implementado: `output/playwright/typer-ai-upgrade/editor-imported-H.png` — viewport e captura 1728 × 1100 CSS px, DPR 1.
- Espécime TTF: `output/playwright/typer-ai-upgrade/helvetica-fontface-specimen-final.png` — 1200 × 893 CSS px, DPR 1.
- Comparação normalizada da Home: `output/playwright/typer-ai-upgrade/home-reference-comparison.png` — cada lado em 864 × 550, letterbox branco.
- Comparação normalizada da fonte: `output/playwright/typer-ai-upgrade/font-reference-comparison.png` — cada lado em 864 × 430, letterbox branco.

Estado comparado: Home clara com projeto real importado; editor no glifo `H`; espécime “Helvetica” carregado via `FontFace`.

## Comparação visual

**Composição e layout:** a Home preserva a hierarquia da referência — topbar, navegação lateral, bloco de entrada, cards explicativos e projetos recentes. A troca do tema escuro pelo claro e a retirada do gerador/chat são requisitos explícitos, não desvios. O editor mantém canvas dominante e sidebar estável sem esconder controles.

**Tipografia:** pesos e tamanhos distinguem navegação, ações, títulos e metadados. Não há truncamentos ou colisões no viewport testado. O espécime usa exclusivamente o TTF exportado; a família de fallback não foi usada (`document.fonts.check` retornou `true`).

**Espaçamento:** as regiões da Home mantêm ritmo consistente; sidebar, cards e ações têm áreas clicáveis adequadas. No editor, toolbar, canvas e painel lateral ficam separados mesmo com a grade de letras extensa.

**Cores:** superfícies claras, zinc e azul de seleção seguem a direção escolhida. Contraste de texto, foco, seleção e estados desabilitados é suficiente no estado verificado.

**Imagens e ativos:** a Home não precisa das imagens promocionais do Illustrator porque seu conteúdo foi substituído por recursos reais do Typer. Thumbnails são renderizados dos próprios vetores; ícones vêm de uma única biblioteca. Não há emojis nem imagens-placeholder.

**Copy:** textos descrevem funcionalidades que existem. A Home não promete chat ou geração invisível; explica a importação MCP local.

**Foco detalhado:** a sidebar clara foi inspecionada em `editor-imported-H.png`. Camadas, alinhamento, campos e guias mantêm contraste, agrupamento e estados ativos/desabilitados claros; não foi necessário crop adicional porque os textos e ícones estão legíveis na captura integral.

## Interações verificadas

- Home vazia, importação de `.typer.json`, abertura pela grade e retorno pelo botão Home.
- Projeto MCP com oito glifos reconhecido pelo editor.
- Caneta com fechamento de contorno, retângulo e pincel livre.
- Exclusão de nó com redução de contagem, abertura de contorno e inversão de direção do path.
- Visibilidade de camadas, zoom e pan; os dois últimos alteraram o `viewBox` de forma independente.
- Campos numéricos por arraste horizontal (`600 → 620` no teste), seguidos de restauração do valor.
- Bloqueio de guia e arraste vertical (`Cap Height 700 → 623`), seguidos de restauração para `700` e bloqueio.
- Carrossel entre `A` e `B`, com os dois canvas vizinhos visíveis no viewport de 1016 px e animação de 300 ms.
- Home apenas com ícone, atualização `.typer.json` com ícone de script, sete opções no menu Exportar e chevron para cima.
- Seleção de camada e centralização horizontal; undo pelo teclado.
- `⌘C`, `⌘V`, `Delete` e `⌘Z`.
- Dropdown de exportação e download TTF real.
- Parse independente do TTF baixado: família `Typer Neutral`, UPM 1000, dez glifos incluindo `.notdef`, `A` e `H` com outlines.
- Console do app: zero erros e zero warnings.

## Histórico de comparação

1. Primeira amostra MCP: `e` e `c` eram válidos, mas tinham contraformas visualmente ambíguas — P2 de legibilidade tipográfica.
2. Correção: os dois glifos foram reconstruídos com contornos únicos e curvas Bézier próprias.
3. Pós-correção: `font-reference-comparison.png` mostra os oito glifos legíveis e coerentes como uma sans neutra original. A diferença para Helvetica é intencional para não copiar outlines proprietários.

## Findings

Nenhum P0, P1 ou P2 permanece. O tema claro, o conteúdo educacional no lugar do bloco de IA da referência e as proporções próprias da fonte são decisões aprovadas.

## Follow-up polish

- P3: futuramente, criar controles de kerning para refinar pares como `ve` e `ca`; o modelo já possui um mapa de kerning, mas ainda não há editor visual.

## Resultado

final result: passed

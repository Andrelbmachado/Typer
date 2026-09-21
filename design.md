# Design do Typer

## Direção estética

Typer é uma ferramenta criativa profissional, clara e precisa. A interface usa superfícies brancas, fundo zinc suave, divisores finos e preto como ação principal. Azul aparece somente em seleção, foco e informação ativa; âmbar identifica alças Bézier e verde indica fechamento/salvamento.

A estrutura da Home se inspira em aplicativos criativos de desktop: navegação persistente à esquerda, área de boas-vindas, explicação dos recursos e projetos recentes. O visual continua próprio do Typer e claro. Não existe chat, prompt ou gerador de imagens na Home.

## Regra de ícones

**Não usar emojis na construção do app.** Ações devem usar ícones consistentes da biblioteca instalada, com `aria-label` ou texto visível. Símbolos tipográficos inerentes ao domínio — como a indicação de espaço na lista de caracteres — não substituem ícones de ação.

## Home

```text
Topbar: marca Typer | contexto local
Sidebar: Nova fonte | Importar | Home | Aprender | Acesso API | Seus projetos
Conteúdo: mensagem de entrada | recursos | projetos recentes
```

- A Home prioriza começar ou retomar trabalho, sem contas, chat ou distrações.
- Cards de projeto mostram conteúdo real da fonte quando existe um glifo concluído.
- O estado vazio orienta a criação ou importação de `.typer.json`.
- Recursos explicam desenho vetorial, fluxo tipográfico e automação MCP.

## Editor

```text
Topbar: Typer | ícone Home | letras guia | projeto | exportação
Centro: toolbar | prévia anterior | canvas 1000 × 1000 | prévia seguinte
Direita: camadas | alinhar/centralizar | propriedades | linhas-guia | referências
Rodapé: glifo | Unicode | contornos | nós | salvamento
```

As letras guia são controles compactos sem sublinhados ou bordas coloridas decorativas. A letra ativa usa preenchimento escuro; estados de progresso usam apenas variação tipográfica/borda discreta.

O canvas é a região dominante. A prancheta é branca, quadrada e tem sombra baixa. Os canvas anterior e seguinte permanecem visíveis, menores e com brilho reduzido; clicar neles faz a transição curta de carrossel. Guias nunca competem com o contorno preto; seleção e estrutura ficam azuis.

## Sidebar direita

- Fundo branco e separadores zinc.
- Todas as áreas são recolhíveis sem perder estado ou ações de cabeçalho.
- Títulos compactos, hierarquia de leitura clara e campos numéricos com contraste suficiente.
- Camadas usam `Eye`/`EyeOff`, nunca emojis.
- Contorno selecionado recebe superfície azul suave.
- Botões de alinhamento são compactos, com 34 px, ícones visíveis, hover azul e estado desabilitado legível.
- Uma mensagem curta explica por que o alinhamento está indisponível ou qual referência será usada.
- Campos numéricos editáveis usam cursor horizontal e aceitam ajuste por arraste lateral, além da digitação normal.

## Linhas-guia

- Cada guia possui cor e bloqueio próprios, persistidos no projeto.
- Guias bloqueadas são fixas. Guias desbloqueadas podem ser arrastadas verticalmente no canvas.
- Os nomes não ficam impressos sobre a prancheta; nome, valor e estado aparecem na tooltip de hover.
- O painel lateral continua oferecendo edição numérica, inclusive por arraste horizontal.
- O botão de restauração devolve valores, cores e bloqueios ao sistema tipográfico padrão.

## Alinhamento

- Um contorno selecionado é alinhado ao frame tipográfico de 1000 × 1000.
- Vários contornos são alinhados entre si.
- Pontos podem ser alinhados quando dois ou mais estão selecionados.
- Alças acompanham sempre o delta da âncora; alinhar não pode alterar a curvatura.

## Interação e acessibilidade

- Todos os botões têm estados hover, foco, ativo e desabilitado.
- Atalhos não disparam enquanto a pessoa edita um input.
- O estado de salvamento fica no rodapé.
- A importação apresenta erros em uma faixa visível e descartável.
- Contornos abertos permanecem visíveis, mas não são exportados como outlines de fonte.
- Movimentos decorativos são curtos e não carregam informação essencial.

## Exportação

O botão Exportar inclui uma seta para cima e abre um menu claro com TTF, OTF, SVG, PDF, PNG, JPG e JPEG. Formatos indisponíveis ficam explicitamente desabilitados. OTF não deve ser habilitado até existir saída CFF real e validada; trocar apenas a extensão é proibido.

## Automação por IA

IA não ocupa espaço visual privilegiado no produto. A integração acontece por MCP/API, fora do canvas, e respeita o mesmo contrato de projeto do editor. A central de acessos é uma tela administrativa clara e deliberadamente separada da criação tipográfica: token mestre efêmero, criação de chave, revelação única, cópia, escopos, revogação e exclusão confirmada.

Com uma chave de API na sessão, projetos criados por IA aparecem na Home e o editor mostra uma faixa de resolução se houver conflito. Presets compartilham métricas e proporções, mas a IA continua responsável por gerar contornos válidos e revisar o resultado com `typer_validate_project` antes do TTF.

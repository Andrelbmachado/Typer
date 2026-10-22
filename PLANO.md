# PLANO — Typer

Roteiro por fases. Cada item tem **entrega** (o que muda no repositório) e **pronto quando** (como verificar). Fases seguem em ordem; itens dentro de uma fase podem correr em paralelo. Marque `[x]` só depois que o critério de pronto passar.

Estado atual (out/2026): editor, `.typer.json`, TTF, MCP (10 ferramentas), API REST com chaves e sync já existem. O workflow `.github/workflows/deploy.yml` só faz `npm ci` + `build` + deploy no GitHub Pages; nenhum teste roda no CI.

---

## Fase 1 — Confiabilidade

Objetivo: nenhum PR entra sem a mesma verificação exigida em `Agents.md`.

- [ ] **CI de verificação**
  - Entrega: `.github/workflows/ci.yml` em `pull_request` e `push` para `main`, Node 20, `npm ci`, depois `lint`, `test`, `build`, `openapi:check`, `test:api`, `test:mcp`.
  - Atenção: `test:mcp` grava em `output/mcp/` via `TYPER_MCP_PROJECTS_DIR`; não definir `TYPER_PROJECTS_DIR` globalmente no job, porque ele tem precedência (`mcp/projectFiles.ts`). Publicar `output/` como artifact.
  - Pronto quando: um PR de teste mostra os 6 passos verdes; um PR com erro de lint proposital fica vermelho.
- [ ] **Deploy depende do CI**
  - Entrega: `deploy.yml` com `needs` no job de verificação (ou `workflow_run`).
  - Pronto quando: um push em `main` com teste quebrado não publica no Pages.
- [ ] **Auditoria de dependências**
  - Entrega: passo `npm audit --audit-level=high` no CI.
  - Pronto quando: o passo roda e falha com vulnerabilidade alta.
- [ ] **Regras para agentes**
  - Entrega: seção em `Agents.md` com os 4 princípios do Karpathy (pensar antes de codar, simplicidade, mudanças cirúrgicas, objetivo verificável) e como aplicá-los no Typer.
  - Pronto quando: seção revisada pelo André.
- [ ] **Hooks de revisão de edições do agente** (Blast Radius / Replay Theater)
  - Entrega: configuração em `.claude/` documentada no `Agents.md`.
  - Pronto quando: uma edição de teste do agente gera o relatório esperado.

## Fase 2 — Agent-friendly de verdade

Objetivo: um agente sai do zero a uma fonte A–Z revisável sem ajuda humana.

- [ ] **Guia "5 minutos"**
  - Entrega: seção no README mostrando conectar o MCP no Claude Code e gerar A–Z com um prompt pronto.
  - Pronto quando: alguém de fora segue o guia numa máquina limpa e obtém um TTF.
- [ ] **Prévia renderizada para o agente**
  - Entrega: ferramenta `typer_render_preview` (MCP + REST via `typerService`) que devolve PNG de um glifo ou de uma linha de texto.
  - Pronto quando: `test:mcp` e `test:api` chamam a ferramenta e validam um PNG não vazio; `openapi:check` passa.
- [ ] **Checagem de consistência**
  - Entrega: `typer_check_consistency` — compara altura-x, cap height, overshoot, espessura de hastes e side bearings contra o preset; devolve lista de desvios por glifo.
  - Pronto quando: teste unitário com um glifo propositalmente fora do padrão gera o aviso correto.
- [ ] **Estilo em lote**
  - Entrega: `typer_apply_style` (espessura/contraste/largura) aplicado a todos os glifos de um projeto.
  - Pronto quando: teste verifica que todos os glifos mudaram e continuam válidos em `typer_validate_project`.
- [ ] **Família regular/bold**
  - Entrega: `typer_generate_family` que cria projetos irmãos a partir de um regular.
  - Pronto quando: dois TTFs exportados com `familyName` igual e `subfamily` correta, verificados por `opentype.js`.

Regra: toda ferramenta nova nasce em `src/server/typerService.ts` e é exposta por `mcpTools.ts`, REST e `api/openapi.yaml` no mesmo PR.

## Fase 3 — Recursos de editor de fontes

Objetivo: paridade básica com editores de fonte. Métricas por glifo (largura e side bearings) já existem em `MetricsPanel`.

- [ ] **Kerning manual**
  - Entrega: pares de kerning no modelo `.typer.json`, painel no editor e tabela `kern`/GPOS no TTF.
  - Pronto quando: par `AV` ajustado aparece com espaçamento diferente num specimen renderizado do TTF.
- [ ] **Kerning automático**
  - Entrega: sugestão de pares a partir de perfis laterais dos contornos (ferramenta MCP + botão no editor).
  - Pronto quando: teste com A/V/T/o gera pares negativos esperados.
- [ ] **Exportar OTF (CFF) e WOFF2**
  - Entrega: writer CFF real; habilitar opção hoje desabilitada em `ExportMenu.tsx`; WOFF2 por compressão do TTF.
  - Pronto quando: arquivos abrem em `opentype.js` e num navegador via `@font-face`.
- [ ] **Importar contornos editáveis**
  - Entrega: SVG e TTF/OTF podem ser convertidos em `GlyphPath` (hoje só viram referência visual). Manter aviso sobre direitos de outlines.
  - Pronto quando: importar um SVG simples gera nós editáveis e o glifo exporta no TTF.
- [ ] **Variable fonts (eixo `wght`)**
  - Entrega: masters compatíveis (mesma contagem de nós) e exportação `fvar`/`gvar`.
  - Pronto quando: fonte variável interpola de 400 a 700 num navegador. Depende da família regular/bold (Fase 2).

## Fase 4 — UX e divulgação

- [ ] **Importação robusta**
  - Entrega: drag-and-drop com progresso, validação de tipo/tamanho e retry em erro.
  - Pronto quando: validado no navegador com arquivo inválido, grande e válido.
- [ ] **Galeria de fontes criadas por agentes**
  - Entrega: página no GitHub Pages com specimens gerados pelos scripts e pelo guia de 5 minutos.
  - Pronto quando: página publicada pelo deploy e linkada no README.

---

## Como executar um item

1. Branch a partir de `main` (`feat/<item>` ou `docs/<item>`).
2. Implementar respeitando `Agents.md` (núcleo único em `typerService`, sem copiar outlines).
3. Rodar `lint`, `test`, `build`, `test:mcp`, `openapi:check`, `test:api`; para UI, validar no navegador.
4. Atualizar a tabela de status do README (mover de **planejado** para ✅) e marcar `[x]` aqui.
5. Abrir PR citando o critério de pronto atendido.

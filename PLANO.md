# PLANO — Typer

## Fase 1 — Confiabilidade
- [ ] CI: `lint`, `test`, `build`, `openapi:check`, `test:api`, `test:mcp` em todo PR (hoje o workflow só faz deploy).
- [ ] `npm audit --audit-level=high` no CI.
- [ ] 4 princípios do Karpathy no `Agents.md`; hooks Blast Radius / Replay Theater para revisar edições do agente.

## Fase 2 — Agent-friendly de verdade
- [ ] Documentar no README um "fluxo de 5 minutos": conectar o MCP no Claude Code e gerar A–Z.
- [ ] Ferramentas MCP: gerar família (regular/bold), aplicar estilo a todos os glifos, checar consistência (altura-x, contraformas).
- [ ] Pré-visualização renderizada devolvida ao agente (PNG) para ele se autoavaliar.

## Fase 3 — Recursos de editor de fontes
- [ ] Kerning (manual e automático) e métricas laterais.
- [ ] Exportar OTF e WOFF2.
- [ ] Variable fonts (eixo de peso).
- [ ] Importar SVG/fonte existente como base.

## Fase 4 — UX
- [ ] Upload com progresso, retry e validação (regras de UX de drag-and-drop).
- [ ] Página de demonstração com fontes criadas por agentes.

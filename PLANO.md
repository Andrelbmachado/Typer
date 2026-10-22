# PLANO — Typer

## Fase 1 — Confiabilidade
- [x] CI: `lint`, `test`, `build`, `openapi:check`, `test:api`, `test:mcp` em todo PR (`.github/workflows/ci.yml`, job `verify`).
- [x] `npm audit --audit-level=high` no CI (`.github/workflows/ci.yml`, job `audit`).
- [x] 4 princípios do Karpathy no `Agents.md`; hooks Blast Radius / Replay Theater (`scripts/agent-hooks/`) para revisar edições do agente, com snippet de ativação em `.claude/settings.json`.

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

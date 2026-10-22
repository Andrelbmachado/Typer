#!/usr/bin/env node
// Replay Theater — logger PostToolUse para edições de agente de IA.
//
// Princípio Karpathy "manter o humano no loop": toda edição feita por um agente
// deve ser reproduzível e auditável depois. Este hook roda após cada Edit/Write/
// MultiEdit e registra um evento append-only em JSONL, para que um humano consiga
// "dar replay" na sessão — ver quais arquivos mudaram, em que ordem e com que raio.
//
// Protocolo de hook do Claude Code:
//   - stdin: JSON com { tool_name, tool_input, tool_response, session_id, cwd, ... }.
//   - este hook nunca bloqueia: sempre sai com código 0.
//
// Saída:
//   output/agent-replay/<AAAA-MM-DD>.jsonl  (um evento por linha)
//
// Sem dependências externas: apenas Node builtins.

import { readFileSync, mkdirSync, appendFileSync } from 'node:fs'
import { join } from 'node:path'

const LOG_DIR = process.env.TYPER_REPLAY_DIR ?? join(process.cwd(), 'output', 'agent-replay')

function readStdin() {
  try {
    return readFileSync(0, 'utf8')
  } catch {
    return ''
  }
}

function countLines(text) {
  if (!text) return 0
  const normalized = text.endsWith('\n') ? text.slice(0, -1) : text
  return normalized.length === 0 ? 0 : normalized.split('\n').length
}

function radiusFor(toolName, input) {
  if (!input) return 0
  if (toolName === 'Write') return countLines(input.content ?? '')
  if (toolName === 'Edit') {
    return countLines(input.old_string ?? '') + countLines(input.new_string ?? '')
  }
  if (toolName === 'MultiEdit') {
    const edits = Array.isArray(input.edits) ? input.edits : []
    return edits.reduce(
      (s, e) => s + countLines(e.old_string ?? '') + countLines(e.new_string ?? ''),
      0,
    )
  }
  return 0
}

function main() {
  const raw = readStdin()
  let payload
  try {
    payload = JSON.parse(raw)
  } catch {
    process.exit(0)
  }

  const toolName = payload.tool_name ?? ''
  if (!['Write', 'Edit', 'MultiEdit'].includes(toolName)) process.exit(0)

  const input = payload.tool_input ?? {}
  const now = new Date()
  const event = {
    ts: now.toISOString(),
    session: payload.session_id ?? null,
    tool: toolName,
    file: input.file_path ?? input.path ?? null,
    radiusLines: radiusFor(toolName, input),
    ok: payload.tool_response?.success !== false,
  }

  try {
    mkdirSync(LOG_DIR, { recursive: true })
    const day = now.toISOString().slice(0, 10)
    appendFileSync(join(LOG_DIR, `${day}.jsonl`), JSON.stringify(event) + '\n')
  } catch {
    // Logar nunca deve derrubar a edição; falha silenciosa é aceitável aqui.
  }

  process.exit(0)
}

main()

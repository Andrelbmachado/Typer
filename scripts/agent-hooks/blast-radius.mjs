#!/usr/bin/env node
// Blast Radius — guarda PreToolUse para edições de agente de IA.
//
// Princípio Karpathy "manter o agente na coleira": uma edição de agente deve ser
// pequena e auditável. Este hook lê o payload PreToolUse do Claude Code em stdin,
// estima o "raio de impacto" da edição proposta (linhas tocadas e arquivos
// sensíveis) e BLOQUEIA quando o raio passa do limite, forçando o agente a
// fatiar a mudança em passos revisáveis.
//
// Protocolo de hook do Claude Code:
//   - stdin: JSON com { tool_name, tool_input, ... }.
//   - saída de bloqueio: exit code 2 + mensagem em stderr (volta para o modelo).
//   - saída de aprovação: exit code 0.
//
// Overrides (uso humano consciente, nunca em prompt de agente):
//   TYPER_BLAST_MAX_LINES   limite de linhas alteradas por edição (padrão 150)
//   TYPER_BLAST_ALLOW_BIG=1 desativa o limite de linhas para esta execução
//
// Sem dependências externas: apenas Node builtins.

import { readFileSync } from 'node:fs'

const MAX_LINES = Number(process.env.TYPER_BLAST_MAX_LINES ?? 150)
const ALLOW_BIG = process.env.TYPER_BLAST_ALLOW_BIG === '1'

// Caminhos que exigem revisão humana explícita mesmo em diffs pequenos.
const SENSITIVE = [
  /(^|\/)src\/server\/typerService\.ts$/, // núcleo único MCP/API/REST
  /(^|\/)api\/openapi\.yaml$/, // contrato público versionado
  /(^|\/)\.github\/workflows\//, // automação de CI/CD
  /(^|\/)src\/server\/access/, // autorização / chaves
  /\.sqlite$/, // bancos de acesso/auditoria
]

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

// Estima linhas tocadas conforme a ferramenta de edição.
function estimateRadius(toolName, input) {
  if (!input) return 0
  switch (toolName) {
    case 'Write':
      return countLines(input.content ?? '')
    case 'Edit':
      return countLines(input.old_string ?? '') + countLines(input.new_string ?? '')
    case 'MultiEdit': {
      const edits = Array.isArray(input.edits) ? input.edits : []
      return edits.reduce(
        (sum, e) => sum + countLines(e.old_string ?? '') + countLines(e.new_string ?? ''),
        0,
      )
    }
    default:
      return 0
  }
}

function targetPath(input) {
  return input?.file_path ?? input?.path ?? ''
}

function main() {
  const raw = readStdin()
  let payload
  try {
    payload = JSON.parse(raw)
  } catch {
    // Sem payload válido: não é o lugar deste hook julgar. Deixa passar.
    process.exit(0)
  }

  const toolName = payload.tool_name ?? ''
  if (!['Write', 'Edit', 'MultiEdit'].includes(toolName)) process.exit(0)

  const input = payload.tool_input ?? {}
  const file = targetPath(input)
  const radius = estimateRadius(toolName, input)
  const hitSensitive = SENSITIVE.find((re) => re.test(file))

  const reasons = []
  if (!ALLOW_BIG && radius > MAX_LINES) {
    reasons.push(
      `Raio de impacto grande: ~${radius} linhas em "${file}" (limite ${MAX_LINES}). ` +
        'Fatie a mudança em passos menores e revisáveis, ou defina TYPER_BLAST_ALLOW_BIG=1 após revisão humana.',
    )
  }
  if (hitSensitive) {
    reasons.push(
      `Arquivo sensível tocado ("${file}"). Confirme com um humano antes de prosseguir; ` +
        'mudanças aqui afetam contrato público, CI ou autorização.',
    )
  }

  if (reasons.length > 0) {
    process.stderr.write('[Blast Radius] ' + reasons.join(' ') + '\n')
    process.exit(2)
  }

  process.exit(0)
}

main()

#!/usr/bin/env node
// Self-test dos hooks de agente. Executa blast-radius com payloads sintéticos
// e verifica os exit codes esperados. Não faz parte do build/CI; é um utilitário
// de desenvolvimento. Rode: node scripts/agent-hooks/selftest.mjs
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const blast = join(here, 'blast-radius.mjs')
const replay = join(here, 'replay-theater.mjs')

function run(script, payload, env = {}) {
  const r = spawnSync('node', [script], {
    input: JSON.stringify(payload),
    env: { ...process.env, ...env },
    encoding: 'utf8',
  })
  return { code: r.status, stderr: r.stderr?.trim() ?? '' }
}

const cases = []
function expect(name, actual, wanted) {
  const ok = actual === wanted
  cases.push({ name, ok, actual, wanted })
}

const small = { tool_name: 'Write', tool_input: { file_path: 'x.ts', content: 'a\nb\nc' } }
const big = {
  tool_name: 'Write',
  tool_input: { file_path: 'x.ts', content: Array.from({ length: 200 }, (_, i) => `l${i}`).join('\n') },
}
const sensitive = {
  tool_name: 'Edit',
  tool_input: { file_path: 'api/openapi.yaml', old_string: 'a', new_string: 'b' },
}
const bigAllowed = { ...big }

expect('edição pequena passa', run(blast, small).code, 0)
expect('edição grande bloqueia', run(blast, big).code, 2)
expect('override libera grande', run(blast, bigAllowed, { TYPER_BLAST_ALLOW_BIG: '1' }).code, 0)
expect('arquivo sensível bloqueia', run(blast, sensitive).code, 2)
expect('replay nunca bloqueia', run(replay, big, { TYPER_REPLAY_DIR: join(here, '.selftest-out') }).code, 0)

let failed = 0
for (const c of cases) {
  const tag = c.ok ? 'OK ' : 'FAIL'
  if (!c.ok) failed++
  console.log(`[${tag}] ${c.name} (exit=${c.actual}, esperado=${c.wanted})`)
}
console.log(failed === 0 ? '\nTodos os hooks OK.' : `\n${failed} falha(s).`)
process.exit(failed === 0 ? 0 : 1)

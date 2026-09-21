import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'
import opentype from 'opentype.js'
import { neutralHelveticaGlyphs } from './neutralHelvetica'
import { REFERENCE_NEUTRAL_REGULAR_ABC_CHARACTERS } from './referenceProfiles'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = path.join(root, 'output', 'mcp')
await mkdir(outputDir, { recursive: true })

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs'), path.join(root, 'mcp', 'server.ts')],
  cwd: root,
  env: { TYPER_MCP_PROJECTS_DIR: outputDir },
  stderr: 'pipe',
})
const client = new Client({ name: 'typer-integration-test', version: '1.0.0' })

function structured<T>(value: Awaited<ReturnType<Client['callTool']>>) {
  assert.equal(value.isError, undefined)
  assert.ok(value.structuredContent)
  return value.structuredContent as T
}

try {
  await client.connect(transport)
  const listed = await client.listTools()
  const names = new Set(listed.tools.map((tool) => tool.name))
  for (const name of ['typer_list_projects', 'typer_create_project', 'typer_read_project', 'typer_get_preset', 'typer_get_reference_profile', 'typer_create_reference_set', 'typer_apply_preset', 'typer_upsert_glyphs', 'typer_validate_project', 'typer_export_ttf']) {
    assert.ok(names.has(name), `Ferramenta MCP ausente: ${name}`)
  }

  const created = structured<{ id: string; file: string }>(await client.callTool({ name: 'typer_create_project', arguments: { familyName: 'Typer Neutral', preset: 'neutral-grotesk' } }))
  const projectId = created.id
  assert.ok(projectId)

  const preset = structured<{ preset: { metrics: { unitsPerEm: number } } }>(await client.callTool({ name: 'typer_get_preset', arguments: { preset: 'neutral-grotesk' } }))
  assert.equal(preset.preset.metrics.unitsPerEm, 1000)

  const referenceProfile = structured<{ profile: { id: string; characters: string } }>(await client.callTool({ name: 'typer_get_reference_profile', arguments: { profile: 'reference-neutral-regular-abc' } }))
  assert.equal(referenceProfile.profile.characters, REFERENCE_NEUTRAL_REGULAR_ABC_CHARACTERS)
  const reference = structured<{ id: string; glyphCount: number; geometry: { valid: boolean } }>(await client.callTool({ name: 'typer_create_reference_set', arguments: { familyName: 'Typer Reference MCP', profile: 'reference-neutral-regular-abc' } }))
  assert.equal(reference.glyphCount, 3)
  assert.equal(reference.geometry.valid, true)
  const referenceValidation = structured<{ valid: boolean; glyphCount: number }>(await client.callTool({ name: 'typer_validate_project', arguments: { projectId: reference.id, requiredCharacters: [...REFERENCE_NEUTRAL_REGULAR_ABC_CHARACTERS] } }))
  assert.equal(referenceValidation.valid, true)
  assert.equal(referenceValidation.glyphCount, 3)

  const glyphs = neutralHelveticaGlyphs()
  const updated = structured<{ updated: string[] }>(await client.callTool({ name: 'typer_upsert_glyphs', arguments: { projectId, glyphs } }))
  assert.deepEqual(new Set(updated.updated), new Set(['H', 'e', 'l', 'v', 't', 'i', 'c', 'a']))

  const validation = structured<{ valid: boolean; errors: string[]; glyphCount: number }>(await client.callTool({ name: 'typer_validate_project', arguments: { projectId, requiredCharacters: ['H', 'e', 'l', 'v', 't', 'i', 'c', 'a'] } }))
  assert.equal(validation.valid, true, validation.errors.join('\n'))
  assert.equal(validation.glyphCount, 8)

  const exported = structured<{ file: string }>(await client.callTool({ name: 'typer_export_ttf', arguments: { projectId } }))
  const buffer = await readFile(exported.file)
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  const font = opentype.parse(arrayBuffer)
  assert.equal(font.unitsPerEm, 1000)
  for (const character of ['H', 'e', 'l', 'v', 't', 'i', 'c', 'a']) {
    const parsedGlyph = font.charToGlyph(character)
    assert.equal(parsedGlyph.unicode, character.codePointAt(0), `Unicode inválido em ${character}`)
    assert.ok(parsedGlyph.path.commands.length > 0, `Sem outline em ${character}`)
  }

  const specimen = `<!doctype html><html><head><meta charset="utf-8"><title>Typer Neutral specimen</title><style>@font-face{font-family:TyperNeutral;src:url('./${path.basename(exported.file)}') format('truetype')}body{margin:0;display:grid;min-height:100vh;place-items:center;background:#fff;color:#111}.sample{font-family:TyperNeutral,sans-serif;font-size:164px;line-height:1}</style></head><body><div class="sample" data-testid="font-sample">Helvetica</div></body></html>`
  await writeFile(path.join(outputDir, 'specimen.html'), specimen, 'utf8')

  console.log(JSON.stringify({ ok: true, projectId, projectFile: created.file, ttfFile: exported.file, glyphs: 8, specimen: path.join(outputDir, 'specimen.html') }, null, 2))
} finally {
  await client.close()
}

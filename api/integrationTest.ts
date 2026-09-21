import assert from 'node:assert/strict'
import { mkdir, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import opentype from 'opentype.js'
import { neutralHelveticaGlyphs } from '../mcp/neutralHelvetica'
import { REFERENCE_NEUTRAL_REGULAR_ABC_CHARACTERS } from '../mcp/referenceProfiles'
import { AccessStore } from '../src/server/accessStore'
import { buildApiServer } from './server'

process.env.TYPER_ADMIN_TOKEN = 'typer-test-admin-token-only'
const temporary = await mkdtemp(path.join(tmpdir(), 'typer-api-'))
const accessStore = await AccessStore.open(path.join(temporary, 'access.sqlite'))
const app = await buildApiServer({ accessStore })

function json<T>(response: { statusCode: number; json(): T }, statusCode: number) {
  assert.equal(response.statusCode, statusCode, () => String((response as unknown as { body?: string }).body || ''))
  return response.json()
}

try {
  assert.equal((await app.inject({ method: 'GET', url: '/healthz' })).statusCode, 200)
  const openApi = json<{ openapi: string }>(await app.inject({ method: 'GET', url: '/openapi.json' }), 200)
  assert.equal(openApi.openapi, '3.1.0')
  assert.equal((await app.inject({ method: 'GET', url: '/v1/projects' })).statusCode, 401)

  const admin = { 'x-typer-admin-token': 'typer-test-admin-token-only' }
  const createdKey = json<{ key: { id: string; scopes: string[] }; secret: string }>(await app.inject({
    method: 'POST', url: '/v1/admin/keys', headers: admin,
    payload: { name: 'Integração completa', scopes: ['projects:read', 'projects:write', 'fonts:export'] },
  }), 201)
  assert.match(createdKey.secret, /^typer_live_/)
  const keys = json<{ keys: Array<{ id: string; prefix: string }> }>(await app.inject({ method: 'GET', url: '/v1/admin/keys', headers: admin }), 200)
  assert.ok(keys.keys.some((key) => key.id === createdKey.key.id))
  assert.ok(!JSON.stringify(keys).includes(createdKey.secret), 'O segredo não pode voltar depois da criação.')

  const auth = { authorization: `Bearer ${createdKey.secret}` }
  const profiles = json<{ profiles: Array<{ id: string }> }>(await app.inject({ method: 'GET', url: '/v1/reference-profiles', headers: auth }), 200)
  assert.ok(profiles.profiles.some((profile) => profile.id === 'reference-neutral-regular-abc'))
  const reference = json<{ project: { id: string; project: { referenceProfile?: { id: string } } }; glyphCount: number; geometry: { valid: boolean } }>(await app.inject({
    method: 'POST', url: '/v1/projects/reference-set', headers: auth,
    payload: { familyName: 'Typer Reference API', profile: 'reference-neutral-regular-abc' },
  }), 201)
  assert.equal(reference.glyphCount, 3)
  assert.equal(reference.geometry.valid, true)
  assert.equal(reference.project.project.referenceProfile?.id, 'reference-neutral-regular-abc')
  const referenceValidation = json<{ valid: boolean }>(await app.inject({
    method: 'POST', url: `/v1/projects/${reference.project.id}/validate`, headers: auth,
    payload: { requiredCharacters: [...REFERENCE_NEUTRAL_REGULAR_ABC_CHARACTERS] },
  }), 200)
  assert.equal(referenceValidation.valid, true)

  const project = json<{ id: string }>(await app.inject({ method: 'POST', url: '/v1/projects', headers: auth, payload: { familyName: 'Typer Neutral API', preset: 'neutral-grotesk' } }), 201)
  const projectId = project.id
  const read = await app.inject({ method: 'GET', url: `/v1/projects/${projectId}`, headers: auth })
  const file = json<{ id: string; project: { font: { unitsPerEm: number } }; revision: string }>(read, 200)
  assert.equal(file.project.font.unitsPerEm, 1000)
  const revision = read.headers.etag
  assert.ok(revision)

  const glyphs = neutralHelveticaGlyphs()
  const updated = json<{ updated: string[] }>(await app.inject({ method: 'PUT', url: `/v1/projects/${projectId}/glyphs`, headers: auth, payload: { glyphs } }), 200)
  assert.deepEqual(new Set(updated.updated), new Set(['H', 'e', 'l', 'v', 't', 'i', 'c', 'a']))
  const validation = json<{ valid: boolean; errors: string[]; glyphCount: number }>(await app.inject({
    method: 'POST', url: `/v1/projects/${projectId}/validate`, headers: auth, payload: { requiredCharacters: ['H', 'e', 'l', 'v', 't', 'i', 'c', 'a'] },
  }), 200)
  assert.equal(validation.valid, true, validation.errors.join('\n'))
  assert.equal(validation.glyphCount, 8)

  const exported = json<{ downloadUrl: string }>(await app.inject({ method: 'POST', url: `/v1/projects/${projectId}/exports/ttf`, headers: auth }), 201)
  const download = await app.inject({ method: 'GET', url: new URL(exported.downloadUrl).pathname, headers: auth })
  assert.equal(download.statusCode, 200)
  const buffer = download.rawPayload
  const font = opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
  assert.equal(font.unitsPerEm, 1000)
  for (const character of ['H', 'e', 'l', 'v', 't', 'i', 'c', 'a']) {
    const glyph = font.charToGlyph(character)
    assert.equal(glyph.unicode, character.codePointAt(0), `Unicode inválido em ${character}`)
    assert.ok(glyph.path.commands.length > 0, `Sem outline em ${character}`)
  }

  const stale = await app.inject({ method: 'PUT', url: `/v1/projects/${projectId}`, headers: { ...auth, 'if-match': '"old-revision"' }, payload: file })
  assert.equal(stale.statusCode, 409)
  assert.equal(json<{ error: { code: string } }>(stale, 409).error.code, 'revision_conflict')

  // Remote MCP has the same list of tools. This is a real JSON-RPC handshake
  // through the Streamable HTTP route, exercised in-process without a tunnel.
  const mcp = await app.inject({
    method: 'POST', url: '/mcp', headers: { ...auth, 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    payload: { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'typer-api-test', version: '1.0' } } },
  })
  assert.equal(mcp.statusCode, 200)
  assert.match(mcp.body, /typer-font-studio/)
  const mcpTools = await app.inject({
    method: 'POST', url: '/mcp', headers: { ...auth, 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2025-11-25' },
    payload: { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
  })
  assert.equal(mcpTools.statusCode, 200)
  for (const tool of ['typer_list_projects', 'typer_create_project', 'typer_read_project', 'typer_get_preset', 'typer_get_reference_profile', 'typer_create_reference_set', 'typer_apply_preset', 'typer_upsert_glyphs', 'typer_validate_project', 'typer_export_ttf']) {
    assert.match(mcpTools.body, new RegExp(tool), `Ferramenta HTTP MCP ausente: ${tool}`)
  }

  const readOnly = json<{ secret: string }>(await app.inject({ method: 'POST', url: '/v1/admin/keys', headers: admin, payload: { name: 'Só leitura', scopes: ['projects:read'] } }), 201)
  assert.equal((await app.inject({ method: 'POST', url: '/v1/projects', headers: { authorization: `Bearer ${readOnly.secret}` }, payload: { familyName: 'Não deve criar' } })).statusCode, 403)

  const revoke = json<{ key: { status: string } }>(await app.inject({ method: 'POST', url: `/v1/admin/keys/${createdKey.key.id}/revoke`, headers: admin }), 200)
  assert.equal(revoke.key.status, 'revoked')
  assert.equal((await app.inject({ method: 'GET', url: '/v1/projects', headers: auth })).statusCode, 401)
  assert.equal((await app.inject({ method: 'DELETE', url: `/v1/admin/keys/${createdKey.key.id}`, headers: admin })).statusCode, 204)

  await mkdir(path.join(temporary, 'artifacts'), { recursive: true })
  console.log(JSON.stringify({ ok: true, projectId, glyphs: 8, temporary }, null, 2))
} finally {
  await app.close()
}

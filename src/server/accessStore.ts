import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'
import { API_SCOPES, type ApiScope } from './contracts'

export interface ApiKeySummary {
  id: string
  name: string
  prefix: string
  scopes: ApiScope[]
  status: 'active' | 'revoked'
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}

export interface AuditEvent {
  id: string
  event: string
  keyId: string | null
  createdAt: string
  metadata: Record<string, unknown> | null
}

export class AccessStoreError extends Error {
  constructor(public readonly code: string, message: string, public readonly statusCode = 400) {
    super(message)
    this.name = 'AccessStoreError'
  }
}

function defaultDatabasePath() {
  return path.resolve(process.env.TYPER_ACCESS_DB || path.join(homedir(), '.typer', 'access.sqlite'))
}

function hashSecret(secret: string) {
  return createHash('sha256').update(secret).digest('hex')
}

function validScopes(scopes: readonly string[]): scopes is ApiScope[] {
  return scopes.length > 0 && scopes.every((scope) => (API_SCOPES as readonly string[]).includes(scope))
}

function rowToKey(row: Record<string, unknown>): ApiKeySummary {
  return {
    id: String(row.id), name: String(row.name), prefix: String(row.prefix),
    scopes: JSON.parse(String(row.scopes)) as ApiScope[], status: row.status === 'revoked' ? 'revoked' : 'active',
    createdAt: String(row.created_at), lastUsedAt: row.last_used_at ? String(row.last_used_at) : null,
    revokedAt: row.revoked_at ? String(row.revoked_at) : null,
  }
}

/** Local-only key database. API secrets never leave createKey and only hashes reach SQLite. */
export class AccessStore {
  private constructor(private readonly database: Database.Database) {}

  static async open(file = defaultDatabasePath()) {
    await mkdir(path.dirname(file), { recursive: true })
    const database = new Database(file)
    database.pragma('journal_mode = WAL')
    database.exec(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        prefix TEXT NOT NULL,
        secret_hash TEXT NOT NULL UNIQUE,
        scopes TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        last_used_at TEXT,
        revoked_at TEXT
      );
      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        event TEXT NOT NULL,
        key_id TEXT,
        created_at TEXT NOT NULL,
        metadata TEXT
      );
    `)
    return new AccessStore(database)
  }

  close() {
    this.database.close()
  }

  private audit(event: string, keyId: string | null, metadata?: Record<string, unknown>) {
    this.database.prepare('INSERT INTO audit_events (id, event, key_id, created_at, metadata) VALUES (?, ?, ?, ?, ?)')
      .run(randomUUID(), event, keyId, new Date().toISOString(), metadata ? JSON.stringify(metadata) : null)
  }

  createKey(name: string, scopes: ApiScope[]) {
    const trimmedName = name.trim()
    if (!trimmedName || trimmedName.length > 120) throw new AccessStoreError('invalid_key_name', 'Informe um nome de até 120 caracteres para a chave.')
    if (!validScopes(scopes)) throw new AccessStoreError('invalid_scopes', 'Selecione ao menos um escopo válido.')
    const secret = `typer_live_${randomBytes(32).toString('base64url')}`
    const now = new Date().toISOString()
    const id = randomUUID()
    const prefix = `${secret.slice(0, 19)}…`
    this.database.prepare('INSERT INTO api_keys (id, name, prefix, secret_hash, scopes, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, trimmedName, prefix, hashSecret(secret), JSON.stringify(scopes), 'active', now)
    this.audit('key_created', id, { name: trimmedName, scopes })
    return { key: { id, name: trimmedName, prefix, scopes, status: 'active' as const, createdAt: now, lastUsedAt: null, revokedAt: null }, secret }
  }

  listKeys() {
    return (this.database.prepare('SELECT id, name, prefix, scopes, status, created_at, last_used_at, revoked_at FROM api_keys ORDER BY created_at DESC').all() as Record<string, unknown>[]).map(rowToKey)
  }

  revokeKey(id: string) {
    const now = new Date().toISOString()
    const result = this.database.prepare("UPDATE api_keys SET status = 'revoked', revoked_at = COALESCE(revoked_at, ?) WHERE id = ?").run(now, id)
    if (!result.changes) throw new AccessStoreError('key_not_found', 'Chave não encontrada.', 404)
    this.audit('key_revoked', id)
    return this.getKey(id)
  }

  deleteKey(id: string) {
    const result = this.database.prepare('DELETE FROM api_keys WHERE id = ?').run(id)
    if (!result.changes) throw new AccessStoreError('key_not_found', 'Chave não encontrada.', 404)
    this.audit('key_deleted', id)
  }

  private getKey(id: string) {
    const row = this.database.prepare('SELECT id, name, prefix, scopes, status, created_at, last_used_at, revoked_at FROM api_keys WHERE id = ?').get(id) as Record<string, unknown> | undefined
    if (!row) throw new AccessStoreError('key_not_found', 'Chave não encontrada.', 404)
    return rowToKey(row)
  }

  verify(secret: string, requiredScopes: ApiScope[]) {
    const givenHash = hashSecret(secret)
    const row = this.database.prepare('SELECT id, name, prefix, secret_hash, scopes, status, created_at, last_used_at, revoked_at FROM api_keys WHERE secret_hash = ?').get(givenHash) as Record<string, unknown> | undefined
    // Timing-safe compare protects this path even though the indexed lookup is
    // already a hash lookup. It also makes future storage changes safer.
    if (!row || typeof row.secret_hash !== 'string' || !timingSafeEqual(Buffer.from(givenHash), Buffer.from(row.secret_hash))) {
      throw new AccessStoreError('invalid_api_key', 'Chave de API ausente, inválida ou revogada.', 401)
    }
    if (row.status !== 'active') throw new AccessStoreError('invalid_api_key', 'Chave de API ausente, inválida ou revogada.', 401)
    const key = rowToKey(row)
    if (!requiredScopes.every((scope) => key.scopes.includes(scope))) throw new AccessStoreError('insufficient_scope', 'A chave não possui a permissão necessária.', 403)
    const now = new Date().toISOString()
    this.database.prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?').run(now, key.id)
    this.audit('key_used', key.id, { scopes: requiredScopes })
    return { ...key, lastUsedAt: now }
  }

  listAudit(limit = 100): AuditEvent[] {
    const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 500)
    return (this.database.prepare('SELECT id, event, key_id, created_at, metadata FROM audit_events ORDER BY created_at DESC LIMIT ?').all(safeLimit) as Record<string, unknown>[])
      .map((row) => ({ id: String(row.id), event: String(row.event), keyId: row.key_id ? String(row.key_id) : null, createdAt: String(row.created_at), metadata: row.metadata ? JSON.parse(String(row.metadata)) as Record<string, unknown> : null }))
  }
}

export function verifyAdminToken(provided: string | undefined) {
  const expected = process.env.TYPER_ADMIN_TOKEN
  if (!expected || !provided) throw new AccessStoreError('admin_unauthorized', 'Token administrativo ausente ou inválido.', 401)
  const expectedValue = Buffer.from(expected)
  const providedValue = Buffer.from(provided)
  if (expectedValue.length !== providedValue.length || !timingSafeEqual(expectedValue, providedValue)) {
    throw new AccessStoreError('admin_unauthorized', 'Token administrativo ausente ou inválido.', 401)
  }
}

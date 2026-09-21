import { parseProjectFile, toProjectFile, type ProjectRecord, type TyperProjectFile } from '../typography/ProjectFile'
import type { ApiScope } from '../shared/access'

const API_KEY_SESSION_KEY = 'typer.api-key'

export class TyperApiError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number, public readonly details?: unknown) {
    super(message)
    this.name = 'TyperApiError'
  }
}

function apiBase() {
  return (import.meta.env.VITE_TYPER_API_URL || 'http://127.0.0.1:8787').replace(/\/$/, '')
}

export function getApiKey() {
  return sessionStorage.getItem(API_KEY_SESSION_KEY) || ''
}

export function setApiKey(key: string) {
  if (key.trim()) sessionStorage.setItem(API_KEY_SESSION_KEY, key.trim())
  else sessionStorage.removeItem(API_KEY_SESSION_KEY)
}

async function request<T>(path: string, init: RequestInit = {}, key = getApiKey()): Promise<T> {
  const headers = new Headers(init.headers)
  if (key) headers.set('authorization', `Bearer ${key}`)
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json')
  let response: Response
  try {
    response = await fetch(`${apiBase()}${path}`, { ...init, headers })
  } catch {
    throw new TyperApiError('server_unavailable', 'A API Typer local não está disponível.', 0)
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { code?: string; message?: string } } | null
    throw new TyperApiError(body?.error?.code || 'api_error', body?.error?.message || `Erro da API (${response.status}).`, response.status, body)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export interface RemoteProject extends ProjectRecord { revision: string }
export interface ApiKeySummary { id: string; name: string; prefix: string; scopes: ApiScope[]; status: 'active' | 'revoked'; createdAt: string; lastUsedAt: string | null; revokedAt: string | null }

export function remoteToLocalProject(remote: RemoteProject): ProjectRecord {
  return {
    id: remote.id, name: remote.name, createdAt: remote.createdAt, updatedAt: remote.updatedAt,
    project: remote.project, ...(remote.sourceFileName ? { sourceFileName: remote.sourceFileName } : {}),
  }
}

function remoteProject(file: TyperProjectFile & { revision: string }): RemoteProject {
  return { ...parseProjectFile(file), revision: file.revision }
}

export async function listRemoteProjects() {
  const response = await request<{ projects: Array<{ id: string }> }>('/v1/projects')
  return Promise.all(response.projects.map(async ({ id }) => getRemoteProject(id)))
}

export async function getRemoteProject(id: string) {
  return remoteProject(await request<TyperProjectFile & { revision: string }>(`/v1/projects/${encodeURIComponent(id)}`))
}

export async function createRemoteProject(familyName: string, preset = 'neutral-grotesk') {
  const file = await request<TyperProjectFile>('/v1/projects', { method: 'POST', body: JSON.stringify({ familyName, preset }) })
  return getRemoteProject(file.id)
}

export async function replaceRemoteProject(record: ProjectRecord, revision: string) {
  const file = await request<TyperProjectFile & { revision: string }>(`/v1/projects/${encodeURIComponent(record.id)}`, {
    method: 'PUT', headers: { 'if-match': revision }, body: JSON.stringify(toProjectFile(record)),
  })
  return remoteProject(file)
}

function adminRequest<T>(path: string, token: string, init: RequestInit = {}) {
  return request<T>(path, { ...init, headers: { ...init.headers, 'x-typer-admin-token': token } }, '')
}

export function listAccessKeys(adminToken: string) {
  return adminRequest<{ keys: ApiKeySummary[] }>('/v1/admin/keys', adminToken)
}

export function createAccessKey(adminToken: string, name: string, scopes: ApiScope[]) {
  return adminRequest<{ key: ApiKeySummary; secret: string }>('/v1/admin/keys', adminToken, { method: 'POST', body: JSON.stringify({ name, scopes }) })
}

export function revokeAccessKey(adminToken: string, keyId: string) {
  return adminRequest<{ key: ApiKeySummary }>(`/v1/admin/keys/${encodeURIComponent(keyId)}/revoke`, adminToken, { method: 'POST' })
}

export function deleteAccessKey(adminToken: string, keyId: string) {
  return adminRequest<void>(`/v1/admin/keys/${encodeURIComponent(keyId)}`, adminToken, { method: 'DELETE' })
}

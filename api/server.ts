import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node'
import * as z from 'zod/v4'
import { parseProjectFile, toProjectFile } from '../src/typography/ProjectFile'
import { PRESETS } from '../mcp/presets'
import { REFERENCE_STYLE_PROFILES } from '../mcp/referenceProfiles'
import { AccessStore, AccessStoreError, verifyAdminToken } from '../src/server/accessStore'
import { API_SCOPES, createProjectSchema, createReferenceSetSchema, presetNameSchema, projectIdSchema, referenceProfileSchema, upsertGlyphsSchema, validationSchema, type ApiScope } from '../src/server/contracts'
import { createTyperMcpServer } from '../src/server/mcpTools'
import { TyperService, TyperServiceError, typerService } from '../src/server/typerService'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const openApiPath = path.join(currentDirectory, 'openapi.yaml')

function requestId(request: FastifyRequest) {
  return request.id
}

function apiError(reply: FastifyReply, request: FastifyRequest, statusCode: number, code: string, message: string) {
  return reply.status(statusCode).send({ error: { code, message, requestId: requestId(request) } })
}

function bearerToken(request: FastifyRequest) {
  const value = request.headers.authorization
  return value?.startsWith('Bearer ') ? value.slice('Bearer '.length).trim() : ''
}

function allowedOrigins() {
  return (process.env.TYPER_ALLOWED_ORIGINS || 'http://127.0.0.1:5173').split(',').map((origin) => origin.trim()).filter(Boolean)
}

export interface ApiServerOptions {
  service?: TyperService
  accessStore?: AccessStore
  logger?: boolean
}

export async function buildApiServer(options: ApiServerOptions = {}) {
  const accessStore = options.accessStore ?? await AccessStore.open()
  const service = options.service ?? typerService
  const app = Fastify({ logger: options.logger ?? false, genReqId: () => randomUUID() })
  const origins = allowedOrigins()

  await app.register(cors, {
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'If-Match', 'X-Typer-Admin-Token', 'Mcp-Protocol-Version', 'Mcp-Session-Id'],
    exposedHeaders: ['ETag', 'Content-Disposition'],
    origin(origin, callback) {
      callback(null, !origin || origins.includes(origin))
    },
  })
  await app.register(rateLimit, { max: 180, timeWindow: '1 minute', hook: 'onRequest' })
  await app.register(swagger, { mode: 'static', specification: { path: openApiPath, baseDir: currentDirectory } })
  await app.register(swaggerUi, { routePrefix: '/docs', uiConfig: { docExpansion: 'list', deepLinking: true } })

  const requireScopes = (scopes: ApiScope[]) => async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      accessStore.verify(bearerToken(request), scopes)
    } catch (reason) {
      if (reason instanceof AccessStoreError) return apiError(reply, request, reason.statusCode, reason.code, reason.message)
      throw reason
    }
  }
  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const adminHeader = request.headers['x-typer-admin-token']
      verifyAdminToken(Array.isArray(adminHeader) ? adminHeader[0] : adminHeader)
    } catch (reason) {
      if (reason instanceof AccessStoreError) return apiError(reply, request, reason.statusCode, reason.code, reason.message)
      throw reason
    }
  }

  app.get('/healthz', async () => ({ status: 'ok', service: 'typer-api' }))
  app.get('/openapi.json', async (_request, reply) => reply.type('application/json').send(app.swagger()))

  app.get('/v1/presets', { preHandler: requireScopes(['projects:read']) }, async () => ({ presets: Object.values(PRESETS) }))
  app.get('/v1/presets/:preset', { preHandler: requireScopes(['projects:read']) }, async (request, reply) => {
    const parsed = presetNameSchema.safeParse((request.params as { preset?: string }).preset)
    if (!parsed.success) return apiError(reply, request, 404, 'preset_not_found', 'Preset não encontrado.')
    return { preset: PRESETS[parsed.data] }
  })
  app.get('/v1/reference-profiles', { preHandler: requireScopes(['projects:read']) }, async () => ({ profiles: Object.values(REFERENCE_STYLE_PROFILES) }))
  app.get('/v1/reference-profiles/:profile', { preHandler: requireScopes(['projects:read']) }, async (request, reply) => {
    const parsed = referenceProfileSchema.safeParse((request.params as { profile?: string }).profile)
    if (!parsed.success) return apiError(reply, request, 404, 'reference_profile_not_found', 'Perfil de referência não encontrado.')
    return { profile: service.getReferenceProfile(parsed.data) }
  })

  app.get('/v1/projects', { preHandler: requireScopes(['projects:read']) }, async () => ({ projects: await service.listProjects() }))
  app.post('/v1/projects', { preHandler: requireScopes(['projects:write']) }, async (request, reply) => {
    const parsed = createProjectSchema.parse(request.body)
    const file = await service.createProject(parsed.familyName, parsed.preset)
    return reply.status(201).header('etag', (await service.readProject(file.id)).revision).send(file)
  })
  app.post('/v1/projects/reference-set', { preHandler: requireScopes(['projects:write']) }, async (request, reply) => {
    const parsed = createReferenceSetSchema.parse(request.body)
    const created = await service.createReferenceSet(parsed.familyName, parsed.profile)
    return reply.status(201).header('etag', created.revision).send({ project: created.file, profile: created.profile, glyphCount: created.glyphCount, geometry: created.geometry, revision: created.revision })
  })

  app.get('/v1/projects/:projectId', { preHandler: requireScopes(['projects:read']) }, async (request, reply) => {
    const projectId = projectIdSchema.parse((request.params as { projectId?: string }).projectId)
    const project = await service.readProject(projectId)
    return reply.header('etag', project.revision).send({ ...project.file, revision: project.revision })
  })
  app.put('/v1/projects/:projectId', { preHandler: requireScopes(['projects:write']) }, async (request, reply) => {
    const projectId = projectIdSchema.parse((request.params as { projectId?: string }).projectId)
    const record = parseProjectFile(request.body)
    const updated = await service.replaceProject(projectId, toProjectFile(record), request.headers['if-match'])
    return reply.header('etag', updated.revision).send({ ...updated.file, revision: updated.revision })
  })
  app.post('/v1/projects/:projectId/preset', { preHandler: requireScopes(['projects:write']) }, async (request, reply) => {
    const projectId = projectIdSchema.parse((request.params as { projectId?: string }).projectId)
    const parsed = z.object({ preset: presetNameSchema }).parse(request.body)
    const updated = await service.applyPreset(projectId, parsed.preset)
    return reply.header('etag', updated.revision).send({ project: updated.file, revision: updated.revision })
  })
  app.put('/v1/projects/:projectId/glyphs', { preHandler: requireScopes(['projects:write']) }, async (request, reply) => {
    const projectId = projectIdSchema.parse((request.params as { projectId?: string }).projectId)
    const parsed = upsertGlyphsSchema.parse({ projectId, ...(request.body as object) })
    const updated = await service.upsertGlyphs(projectId, parsed.glyphs)
    return reply.header('etag', updated.revision).send({ projectId, updated: updated.updated, glyphCount: updated.glyphCount, revision: updated.revision })
  })
  app.post('/v1/projects/:projectId/validate', { preHandler: requireScopes(['projects:read']) }, async (request) => {
    const projectId = projectIdSchema.parse((request.params as { projectId?: string }).projectId)
    const parsed = validationSchema.parse({ projectId, ...(request.body as object | undefined) })
    return service.validateProject(projectId, parsed.requiredCharacters)
  })
  app.post('/v1/projects/:projectId/exports/ttf', { preHandler: requireScopes(['fonts:export']) }, async (request, reply) => {
    const projectId = projectIdSchema.parse((request.params as { projectId?: string }).projectId)
    const exported = await service.exportTtf(projectId)
    const metadata = {
      projectId: exported.projectId, familyName: exported.familyName, glyphCount: exported.glyphCount,
      downloadToken: exported.downloadToken, expiresAt: exported.expiresAt,
    }
    const host = request.headers.host || `${process.env.TYPER_API_HOST || '127.0.0.1'}:${process.env.TYPER_API_PORT || 8787}`
    return reply.status(201).send({ ...metadata, downloadUrl: `${request.protocol}://${host}/v1/exports/${exported.downloadToken}` })
  })
  app.get('/v1/exports/:downloadToken', { preHandler: requireScopes(['fonts:export']) }, async (request, reply) => {
    const token = (request.params as { downloadToken?: string }).downloadToken || ''
    const exported = await service.readExport(token)
    return reply
      .header('content-disposition', `attachment; filename="${exported.familyName.replaceAll(/[^a-z0-9_-]/gi, '-') || 'typer'}.ttf"`)
      .type('font/ttf')
      .send(exported.contents)
  })

  app.get('/v1/admin/keys', { preHandler: requireAdmin }, async () => ({ keys: accessStore.listKeys() }))
  app.post('/v1/admin/keys', { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = z.object({ name: z.string(), scopes: z.array(z.enum(API_SCOPES)).min(1) }).parse(request.body)
    // This is intentionally the only response that contains the secret.
    return reply.status(201).send(accessStore.createKey(parsed.name, parsed.scopes))
  })
  app.post('/v1/admin/keys/:keyId/revoke', { preHandler: requireAdmin }, async (request) => ({ key: accessStore.revokeKey((request.params as { keyId: string }).keyId) }))
  app.delete('/v1/admin/keys/:keyId', { preHandler: requireAdmin }, async (request, reply) => {
    accessStore.deleteKey((request.params as { keyId: string }).keyId)
    return reply.status(204).send()
  })
  app.get('/v1/admin/audit', { preHandler: requireAdmin }, async (request) => ({ audit: accessStore.listAudit(Number((request.query as { limit?: string }).limit || 100)) }))

  // Streamable HTTP is deliberately stateless. A private tunnel may expose
  // this route to an approved ChatGPT Developer Mode workspace; the tunnel is
  // not started by the app itself. A remote MCP key must hold all operations
  // scopes because tool intent is discovered after the MCP JSON-RPC message.
  app.post('/mcp', { preHandler: requireScopes(['projects:read', 'projects:write', 'fonts:export']) }, async (request, reply) => {
    const server = createTyperMcpServer(service)
    const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    await server.connect(transport)
    reply.raw.on('close', () => {
      void transport.close()
      void server.close()
    })
    await transport.handleRequest(request.raw, reply.raw, request.body)
  })
  const mcpMethodNotAllowed = async (request: FastifyRequest, reply: FastifyReply) => apiError(reply, request, 405, 'method_not_allowed', 'Use POST para o endpoint MCP.')
  app.get('/mcp', mcpMethodNotAllowed)
  app.delete('/mcp', mcpMethodNotAllowed)

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof TyperServiceError || error instanceof AccessStoreError) return apiError(reply, request, error.statusCode, error.code, error.message)
    if (error instanceof z.ZodError) return apiError(reply, request, 400, 'invalid_request', 'A solicitação não corresponde ao formato esperado.')
    if ((error as { code?: string }).code === 'FST_ERR_CTP_INVALID_JSON_BODY') return apiError(reply, request, 400, 'invalid_json', 'JSON inválido.')
    request.log.error(error)
    return apiError(reply, request, 500, 'internal_error', 'Erro interno do serviço.')
  })
  app.addHook('onClose', async () => {
    accessStore.close()
  })
  return app
}

export async function startApiServer() {
  const app = await buildApiServer({ logger: true })
  const host = process.env.TYPER_API_HOST || '127.0.0.1'
  const port = Number(process.env.TYPER_API_PORT || 8787)
  await app.listen({ host, port })
  return app
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void startApiServer().catch((reason) => {
    console.error(reason)
    process.exitCode = 1
  })
}

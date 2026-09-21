import path from 'node:path'
import { fileURLToPath } from 'node:url'
import SwaggerParser from '@apidevtools/swagger-parser'

const apiFile = path.join(path.dirname(fileURLToPath(import.meta.url)), 'openapi.yaml')

try {
  const api = await SwaggerParser.validate(apiFile)
  const requiredPaths = [
    '/healthz', '/v1/presets', '/v1/projects', '/v1/projects/{projectId}',
    '/v1/projects/{projectId}/glyphs', '/v1/projects/{projectId}/exports/ttf', '/v1/exports/{downloadToken}',
  ]
  for (const expected of requiredPaths) {
    if (!api.paths?.[expected]) throw new Error(`Rota ausente no OpenAPI: ${expected}`)
  }
  console.log(`OpenAPI válido: ${api.info.title} v${api.info.version}`)
} catch (reason) {
  console.error(reason)
  process.exitCode = 1
}

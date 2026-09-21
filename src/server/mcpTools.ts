import { McpServer } from '@modelcontextprotocol/server'
import * as z from 'zod/v4'
import { PRESETS } from '../../mcp/presets'
import { createProjectSchema, createReferenceSetSchema, presetNameSchema, projectIdSchema, referenceProfileSchema, upsertGlyphsSchema, validationSchema } from './contracts'
import { TyperService, typerService } from './typerService'

function result<T extends object>(data: T) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: data as Record<string, unknown>,
  }
}

/** Register once so stdio and Streamable HTTP always expose exactly the same tools. */
export function createTyperMcpServer(service: TyperService = typerService) {
  const server = new McpServer(
    { name: 'typer-font-studio', version: '1.1.0' },
    { instructions: 'Crie ou leia um projeto, consulte um preset ou perfil de referência antes de gerar vetores, grave glifos em lote, valide e só então exporte TTF. Coordenadas usam eixo Y para cima em uma grade UPM 1000. Comece pelo estudo ABC antes de ampliar uma família. Nunca copie contornos proprietários.' },
  )

  server.registerTool('typer_list_projects', {
    title: 'Listar projetos Typer', description: 'Lista os projetos .typer.json disponíveis no diretório local seguro.', inputSchema: z.object({}),
  }, async () => result({ projects: await service.listProjects() }))

  server.registerTool('typer_create_project', {
    title: 'Criar projeto tipográfico', description: 'Cria um projeto Typer local padronizado em UPM e canvas 1000.', inputSchema: createProjectSchema,
  }, async ({ familyName, preset }) => {
    const file = await service.createProject(familyName, preset)
    return result({ id: file.id, name: file.name, file: file.file, preset })
  })

  server.registerTool('typer_read_project', {
    title: 'Ler projeto Typer', description: 'Retorna metadados, métricas e todos os glifos de um projeto.', inputSchema: z.object({ projectId: projectIdSchema }),
  }, async ({ projectId }) => {
    const project = await service.readProject(projectId)
    return result({ ...project.file, revision: project.revision })
  })

  server.registerTool('typer_get_preset', {
    title: 'Consultar preset vetorial', description: 'Retorna regras métricas e vetoriais para orientar a construção consistente de glifos.', inputSchema: z.object({ preset: presetNameSchema }),
  }, async ({ preset }) => result({ preset: PRESETS[preset] }))

  server.registerTool('typer_get_reference_profile', {
    title: 'Consultar perfil de referência visual', description: 'Retorna uma direção de estilo original para gerar vetores editáveis. Não rastreia ou copia contornos de uma imagem ou fonte.', inputSchema: z.object({ profile: referenceProfileSchema }),
  }, async ({ profile }) => result({ profile: service.getReferenceProfile(profile) }))

  server.registerTool('typer_create_reference_set', {
    title: 'Criar conjunto tipográfico por perfil', description: 'Cria o estudo ABC ou o conjunto completo de um perfil, grava a proveniência e valida curvas Bézier, contraformas e métricas antes de salvar.', inputSchema: createReferenceSetSchema,
  }, async ({ familyName, profile }) => {
    const created = await service.createReferenceSet(familyName, profile)
    return result({ id: created.file.id, name: created.file.name, file: created.filePath, profile: created.profile, glyphCount: created.glyphCount, geometry: created.geometry, revision: created.revision })
  })

  server.registerTool('typer_apply_preset', {
    title: 'Aplicar preset', description: 'Atualiza as métricas globais e guias de um projeto sem apagar seus glifos.', inputSchema: z.object({ projectId: projectIdSchema, preset: presetNameSchema }),
  }, async ({ projectId, preset }) => {
    const project = await service.applyPreset(projectId, preset)
    return result({ projectId, preset, updatedAt: project.file.updatedAt, revision: project.revision })
  })

  server.registerTool('typer_upsert_glyphs', {
    title: 'Inserir ou substituir glifos', description: 'Grava um lote de glifos vetoriais. IDs omitidos são gerados automaticamente.', inputSchema: upsertGlyphsSchema,
  }, async ({ projectId, glyphs }) => {
    const project = await service.upsertGlyphs(projectId, glyphs)
    return result({ projectId, updated: project.updated, glyphCount: project.glyphCount, revision: project.revision })
  })

  server.registerTool('typer_validate_project', {
    title: 'Validar projeto', description: 'Valida UPM, Unicode, métricas, coordenadas e contornos exportáveis.', inputSchema: validationSchema,
  }, async ({ projectId, requiredCharacters }) => result(await service.validateProject(projectId, requiredCharacters)))

  server.registerTool('typer_export_ttf', {
    title: 'Exportar fonte TTF', description: 'Gera uma fonte TrueType instalável. OTF não é oferecido até existir geração CFF/OTF válida.', inputSchema: z.object({ projectId: projectIdSchema }),
  }, async ({ projectId }) => result(await service.exportTtf(projectId)))

  return server
}

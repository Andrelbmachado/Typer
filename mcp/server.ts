import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { McpServer } from '@modelcontextprotocol/server'
import { serveStdio } from '@modelcontextprotocol/server/stdio'
import * as z from 'zod/v4'
import { exportProjectToFont } from '../src/font-engine/OpenTypeExporter'
import { applyPreset, PRESETS, type PresetName } from './presets'
import { createProjectFile, listProjectFiles, projectsRoot, readProjectFile, upsertGlyphs, validateProject, writeProjectFile } from './projectFiles'

const pointSchema = z.object({ x: z.number().finite(), y: z.number().finite() })
const nodeSchema = z.object({
  id: z.string().optional(),
  x: z.number().finite(),
  y: z.number().finite(),
  type: z.enum(['corner', 'smooth', 'symmetric']).default('corner'),
  handleIn: pointSchema.optional(),
  handleOut: pointSchema.optional(),
})
const pathSchema = z.object({ id: z.string().optional(), closed: z.boolean().default(true), nodes: z.array(nodeSchema).min(1) })
const glyphSchema = z.object({
  name: z.string().min(1).max(8),
  unicode: z.number().int().min(0).max(0x10ffff).nullable(),
  metrics: z.object({ advanceWidth: z.number().positive(), leftBearing: z.number(), rightBearing: z.number() }),
  paths: z.array(pathSchema),
})

function result<T extends object>(data: T) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }], structuredContent: data as Record<string, unknown> }
}

export function createServer() {
  const server = new McpServer(
    { name: 'typer-font-studio', version: '1.0.0' },
    { instructions: 'Crie ou leia um projeto, consulte um preset antes de gerar vetores, grave glifos em lote, valide e só então exporte TTF. Coordenadas usam eixo Y para cima em uma grade UPM 1000.' },
  )

  server.registerTool('typer_list_projects', {
    title: 'Listar projetos Typer',
    description: 'Lista os projetos .typer.json disponíveis no diretório local seguro.',
    inputSchema: z.object({}),
  }, async () => result({ projectsRoot, projects: await listProjectFiles() }))

  server.registerTool('typer_create_project', {
    title: 'Criar projeto tipográfico',
    description: 'Cria um projeto Typer local padronizado em UPM e canvas 1000.',
    inputSchema: z.object({ familyName: z.string().min(1).max(80), preset: z.enum(['neutral-grotesk', 'geometric-sans', 'humanist-sans']).default('neutral-grotesk') }),
  }, async ({ familyName, preset }) => {
    const file = await createProjectFile(familyName, preset as PresetName)
    return result({ id: file.id, name: file.name, file: file.file, preset })
  })

  server.registerTool('typer_read_project', {
    title: 'Ler projeto Typer',
    description: 'Retorna metadados, métricas e todos os glifos de um projeto.',
    inputSchema: z.object({ projectId: z.string().min(1) }),
  }, async ({ projectId }) => result(await readProjectFile(projectId)))

  server.registerTool('typer_get_preset', {
    title: 'Consultar preset vetorial',
    description: 'Retorna regras métricas e vetoriais para orientar a construção consistente de glifos.',
    inputSchema: z.object({ preset: z.enum(['neutral-grotesk', 'geometric-sans', 'humanist-sans']) }),
  }, async ({ preset }) => result({ preset: PRESETS[preset as PresetName] }))

  server.registerTool('typer_apply_preset', {
    title: 'Aplicar preset',
    description: 'Atualiza as métricas globais e guias de um projeto sem apagar seus glifos.',
    inputSchema: z.object({ projectId: z.string().min(1), preset: z.enum(['neutral-grotesk', 'geometric-sans', 'humanist-sans']) }),
  }, async ({ projectId, preset }) => {
    const file = await readProjectFile(projectId)
    const presetData = PRESETS[preset as PresetName]
    file.project = applyPreset(file.project, presetData)
    await writeProjectFile(file)
    return result({ projectId, preset, updatedAt: file.updatedAt })
  })

  server.registerTool('typer_upsert_glyphs', {
    title: 'Inserir ou substituir glifos',
    description: 'Grava um lote de glifos vetoriais. IDs omitidos são gerados automaticamente.',
    inputSchema: z.object({ projectId: z.string().min(1), glyphs: z.array(glyphSchema).min(1).max(256) }),
  }, async ({ projectId, glyphs }) => {
    const file = await readProjectFile(projectId)
    file.project = upsertGlyphs(file.project, glyphs)
    await writeProjectFile(file)
    return result({ projectId, updated: glyphs.map((glyph) => glyph.name), glyphCount: Object.keys(file.project.glyphs).length })
  })

  server.registerTool('typer_validate_project', {
    title: 'Validar projeto',
    description: 'Valida UPM, Unicode, métricas, coordenadas e contornos exportáveis.',
    inputSchema: z.object({ projectId: z.string().min(1), requiredCharacters: z.array(z.string().min(1).max(2)).default([]) }),
  }, async ({ projectId, requiredCharacters }) => {
    const file = await readProjectFile(projectId)
    return result({ projectId, ...validateProject(file.project, requiredCharacters) })
  })

  server.registerTool('typer_export_ttf', {
    title: 'Exportar fonte TTF',
    description: 'Gera uma fonte TrueType instalável no mesmo diretório seguro do projeto.',
    inputSchema: z.object({ projectId: z.string().min(1) }),
  }, async ({ projectId }) => {
    const file = await readProjectFile(projectId)
    const validation = validateProject(file.project)
    if (!validation.valid) throw new Error(`Projeto inválido: ${validation.errors.join(' ')}`)
    const font = exportProjectToFont(file.project)
    const output = path.join(projectsRoot, `${projectId}.ttf`)
    await writeFile(output, Buffer.from(font.toArrayBuffer()))
    return result({ projectId, file: output, familyName: file.project.font.familyName, glyphCount: Object.keys(file.project.glyphs).length })
  })

  return server
}

void serveStdio(createServer)
console.error(`Typer MCP pronto em stdio. Projetos: ${projectsRoot}`)

import { randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import type { FontProject } from '../src/typography/Font'
import { createDefaultProject } from '../src/typography/Font'
import type { Glyph } from '../src/typography/Glyph'
import type { GlyphPath } from '../src/geometry/Path'
import type { PathNode } from '../src/geometry/Node'
import { TYPER_FILE_FORMAT, TYPER_FILE_VERSION, type TyperProjectFile } from '../src/typography/ProjectFile'
import { applyPreset, PRESETS, type PresetName } from './presets'

// TYPER_PROJECTS_DIR is shared by the REST API, HTTP MCP and stdio MCP. Keep
// the old name as a backwards-compatible alias for existing Codex setups.
export const projectsRoot = path.resolve(process.env.TYPER_PROJECTS_DIR || process.env.TYPER_MCP_PROJECTS_DIR || path.join(homedir(), '.typer', 'projects'))

export function assertProjectId(projectId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(projectId)) throw new Error('ID de projeto inválido.')
}

export function projectPath(projectId: string) {
  assertProjectId(projectId)
  return path.join(projectsRoot, `${projectId}.typer.json`)
}

export async function ensureProjectsRoot() {
  await mkdir(projectsRoot, { recursive: true })
}

export async function listProjectFiles() {
  await ensureProjectsRoot()
  const files = (await readdir(projectsRoot)).filter((file) => file.endsWith('.typer.json'))
  const projects: Array<{ id: string; name: string; updatedAt: string; glyphCount: number; file: string }> = []
  for (const file of files) {
    try {
      const project = JSON.parse(await readFile(path.join(projectsRoot, file), 'utf8')) as TyperProjectFile
      if (project.format !== TYPER_FILE_FORMAT) continue
      projects.push({ id: project.id, name: project.name, updatedAt: project.updatedAt, glyphCount: Object.keys(project.project.glyphs).length, file: path.join(projectsRoot, file) })
    } catch {
      // Invalid files are ignored instead of breaking discovery.
    }
  }
  return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function readProjectFile(projectId: string): Promise<TyperProjectFile> {
  const parsed = JSON.parse(await readFile(projectPath(projectId), 'utf8')) as TyperProjectFile
  if (parsed.format !== TYPER_FILE_FORMAT || parsed.fileVersion !== TYPER_FILE_VERSION || parsed.project?.font?.unitsPerEm !== 1000) {
    throw new Error('Projeto Typer inválido ou incompatível.')
  }
  return parsed
}

export async function writeProjectFile(file: TyperProjectFile) {
  await ensureProjectsRoot()
  file.updatedAt = new Date().toISOString()
  const target = projectPath(file.id)
  // A rename is atomic on the local filesystem. A half-written project must
  // never be visible to another API/MCP request or to the editor sync loop.
  const temporary = path.join(projectsRoot, `.${file.id}.${randomUUID()}.tmp`)
  await writeFile(temporary, `${JSON.stringify(file, null, 2)}\n`, 'utf8')
  await rename(temporary, target)
  return { ...file, file: projectPath(file.id) }
}

export async function createProjectFile(familyName: string, presetName: PresetName) {
  const now = new Date().toISOString()
  const preset = PRESETS[presetName]
  const project = applyPreset(createDefaultProject(familyName), preset)
  const file: TyperProjectFile = {
    format: TYPER_FILE_FORMAT,
    fileVersion: TYPER_FILE_VERSION,
    id: randomUUID(),
    name: familyName,
    createdAt: now,
    updatedAt: now,
    project,
  }
  return writeProjectFile(file)
}

type NodeInput = Omit<PathNode, 'id'> & { id?: string }
type PathInput = Omit<GlyphPath, 'id' | 'nodes'> & { id?: string; nodes: NodeInput[] }

export function normalizePaths(paths: PathInput[]): GlyphPath[] {
  return paths.map((contour) => ({
    id: contour.id || randomUUID(),
    closed: contour.closed,
    nodes: contour.nodes.map((node) => ({
      ...node,
      id: node.id || randomUUID(),
      type: node.type || 'corner',
    })),
  }))
}

export function upsertGlyphs(project: FontProject, glyphs: Array<Omit<Glyph, 'status' | 'paths'> & { paths: PathInput[] }>) {
  const next = { ...project, glyphs: { ...project.glyphs } }
  for (const glyph of glyphs) {
    const paths = normalizePaths(glyph.paths)
    next.glyphs[glyph.name] = {
      ...glyph,
      paths,
      status: paths.some((contour) => contour.closed && contour.nodes.length >= 3) ? 'done' : paths.length ? 'started' : 'empty',
    }
  }
  return next
}

export function validateProject(project: FontProject, requiredCharacters: string[] = []) {
  const errors: string[] = []
  const warnings: string[] = []
  if (project.font.unitsPerEm !== 1000) errors.push('unitsPerEm deve ser 1000.')
  for (const character of requiredCharacters) {
    const glyph = project.glyphs[character]
    if (!glyph) {
      errors.push(`Glifo ausente: ${character}`)
      continue
    }
    if (glyph.unicode !== character.codePointAt(0)) errors.push(`Unicode incorreto em ${character}.`)
    if (!glyph.paths.some((contour) => contour.closed && contour.nodes.length >= 3)) errors.push(`Glifo ${character} não possui contorno fechado exportável.`)
  }
  for (const glyph of Object.values(project.glyphs)) {
    if (!Number.isFinite(glyph.metrics.advanceWidth) || glyph.metrics.advanceWidth <= 0) errors.push(`Largura inválida em ${glyph.name}.`)
    glyph.paths.forEach((contour, index) => {
      if (!contour.closed) warnings.push(`${glyph.name}: contorno ${index + 1} está aberto e não será exportado.`)
      for (const node of contour.nodes) {
        if (![node.x, node.y, node.handleIn?.x, node.handleIn?.y, node.handleOut?.x, node.handleOut?.y].filter((value) => value !== undefined).every(Number.isFinite)) {
          errors.push(`${glyph.name}: contorno ${index + 1} contém coordenada inválida.`)
        }
      }
    })
  }
  return { valid: errors.length === 0, errors, warnings, glyphCount: Object.keys(project.glyphs).length }
}

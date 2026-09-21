import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { exportProjectToFont } from '../font-engine/OpenTypeExporter'
import { toProjectFile, type TyperProjectFile } from '../typography/ProjectFile'
import { applyPreset, PRESETS, type PresetName } from '../../mcp/presets'
import { createProjectFile, ensureProjectsRoot, listProjectFiles, projectPath, projectsRoot, readProjectFile, upsertGlyphs, validateProject, writeProjectFile } from '../../mcp/projectFiles'
import { buildGlyphsForReferenceProfile, getReferenceStyleProfile } from '../../mcp/referenceProfiles'
import { validateReferenceGlyphGeometry } from '../../mcp/referenceQuality'
import type { GlyphInput, PresetNameInput, ReferenceProfileInput } from './contracts'

export class TyperServiceError extends Error {
  constructor(public readonly code: string, message: string, public readonly statusCode = 400, public readonly details?: unknown) {
    super(message)
    this.name = 'TyperServiceError'
  }
}

export interface ProjectWithRevision {
  file: TyperProjectFile
  revision: string
}

interface DownloadFile {
  file: string
  familyName: string
  glyphCount: number
  expiresAt: string
}

function sha256(value: string | Buffer) {
  return createHash('sha256').update(value).digest('base64url')
}

function revisionFor(file: TyperProjectFile) {
  // Exclude the transport-only file path from the revision.
  return `"${sha256(JSON.stringify(toProjectFile(file)))}"`
}

function toNotFound(reason: unknown): never {
  if (reason instanceof TyperServiceError) throw reason
  const code = (reason as NodeJS.ErrnoException)?.code
  if (code === 'ENOENT') throw new TyperServiceError('project_not_found', 'Projeto não encontrado.', 404)
  throw reason
}

export class TyperService {
  private readonly downloads = new Map<string, DownloadFile>()

  async listProjects() {
    return listProjectFiles()
  }

  async createProject(familyName: string, preset: PresetNameInput = 'neutral-grotesk') {
    return createProjectFile(familyName, preset as PresetName)
  }

  getReferenceProfile(profileId: ReferenceProfileInput) {
    const profile = getReferenceStyleProfile(profileId)
    if (!profile) throw new TyperServiceError('reference_profile_not_found', 'Perfil de referência não encontrado.', 404)
    return profile
  }

  async createReferenceSet(familyName: string, profileId: ReferenceProfileInput = 'reference-neutral-regular-abc') {
    const profile = this.getReferenceProfile(profileId)
    const file = await createProjectFile(familyName, 'neutral-grotesk')
    const glyphs = buildGlyphsForReferenceProfile(profile.id)
    const geometry = validateReferenceGlyphGeometry(glyphs)
    if (!geometry.valid) throw new TyperServiceError('reference_geometry_invalid', 'O conjunto de referência não passou na validação geométrica.', 422, geometry)

    file.project.referenceProfile = { id: profile.id, mode: profile.mode, label: profile.label }
    file.project = upsertGlyphs(file.project, glyphs)
    await writeProjectFile(file)
    const project = await this.readProject(file.id)
    return { ...project, filePath: projectPath(file.id), profile, glyphCount: glyphs.length, geometry }
  }

  async readProject(projectId: string): Promise<ProjectWithRevision> {
    try {
      const file = await readProjectFile(projectId)
      return { file, revision: revisionFor(file) }
    } catch (reason) {
      return toNotFound(reason)
    }
  }

  async replaceProject(projectId: string, incoming: TyperProjectFile, ifMatch?: string): Promise<ProjectWithRevision> {
    if (incoming.id !== projectId) throw new TyperServiceError('project_id_mismatch', 'O ID do corpo não corresponde ao projeto solicitado.', 400)
    const current = await this.readProject(projectId)
    if (!ifMatch) throw new TyperServiceError('revision_required', 'If-Match é obrigatório para atualizar um projeto.', 428)
    if (ifMatch !== '*' && ifMatch !== current.revision) {
      throw new TyperServiceError('revision_conflict', 'O projeto mudou no servidor. Atualize antes de salvar.', 409, { revision: current.revision, updatedAt: current.file.updatedAt })
    }
    await writeProjectFile(incoming)
    return this.readProject(projectId)
  }

  async applyPreset(projectId: string, preset: PresetNameInput) {
    const current = await this.readProject(projectId)
    current.file.project = applyPreset(current.file.project, PRESETS[preset as PresetName])
    await writeProjectFile(current.file)
    return this.readProject(projectId)
  }

  async upsertGlyphs(projectId: string, glyphs: GlyphInput[]) {
    const current = await this.readProject(projectId)
    current.file.project = upsertGlyphs(current.file.project, glyphs)
    await writeProjectFile(current.file)
    const updated = await this.readProject(projectId)
    return { ...updated, updated: glyphs.map((glyph) => glyph.name), glyphCount: Object.keys(updated.file.project.glyphs).length }
  }

  async validateProject(projectId: string, requiredCharacters: string[] = []) {
    const current = await this.readProject(projectId)
    return { projectId, revision: current.revision, ...validateProject(current.file.project, requiredCharacters) }
  }

  async exportTtf(projectId: string) {
    const current = await this.readProject(projectId)
    const validation = validateProject(current.file.project)
    if (!validation.valid) throw new TyperServiceError('project_invalid', `Projeto inválido: ${validation.errors.join(' ')}`, 422, validation)
    await ensureProjectsRoot()
    const dir = path.join(projectsRoot, 'exports', projectId)
    await mkdir(dir, { recursive: true })
    const downloadToken = randomUUID().replaceAll('-', '')
    const output = path.join(dir, `${downloadToken}.ttf`)
    const font = exportProjectToFont(current.file.project)
    await writeFile(output, Buffer.from(font.toArrayBuffer()))
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    this.downloads.set(downloadToken, { file: output, familyName: current.file.project.font.familyName, glyphCount: validation.glyphCount, expiresAt })
    return { projectId, familyName: current.file.project.font.familyName, glyphCount: validation.glyphCount, downloadToken, expiresAt, file: output }
  }

  async readExport(downloadToken: string) {
    const download = this.downloads.get(downloadToken)
    if (!download || Date.parse(download.expiresAt) <= Date.now()) {
      this.downloads.delete(downloadToken)
      throw new TyperServiceError('export_not_found', 'Exportação não encontrada ou expirada.', 404)
    }
    return { ...download, contents: await readFile(download.file) }
  }

  async projectFilePath(projectId: string) {
    // Keeps the safe project ID validation in one module for consumers that
    // need an explicit local path (e.g. the stdio MCP response).
    await this.readProject(projectId)
    return projectPath(projectId)
  }
}

export const typerService = new TyperService()

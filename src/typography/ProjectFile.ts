import { createDefaultProject, normalizeFontProject, type FontProject } from './Font'

export const TYPER_FILE_FORMAT = 'typer-project' as const
export const TYPER_FILE_VERSION = 1 as const

export interface ProjectRecord {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  project: FontProject
  sourceFileName?: string
}

export interface TyperProjectFile extends ProjectRecord {
  format: typeof TYPER_FILE_FORMAT
  fileVersion: typeof TYPER_FILE_VERSION
}

export function createProjectRecord(name = 'Nova fonte'): ProjectRecord {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: now,
    updatedAt: now,
    project: createDefaultProject(name),
  }
}

export function toProjectFile(record: ProjectRecord): TyperProjectFile {
  return {
    format: TYPER_FILE_FORMAT,
    fileVersion: TYPER_FILE_VERSION,
    ...record,
  }
}

function isFontProject(value: unknown): value is FontProject {
  if (!value || typeof value !== 'object') return false
  const project = value as Partial<FontProject>
  return project.version === 1
    && !!project.font
    && project.font.unitsPerEm === 1000
    && !!project.guides
    && !!project.glyphs
    && typeof project.glyphs === 'object'
}

export function parseProjectFile(value: unknown, sourceFileName?: string): ProjectRecord {
  if (!value || typeof value !== 'object') throw new Error('Arquivo de projeto inválido.')
  const file = value as Partial<TyperProjectFile>
  if (file.format !== TYPER_FILE_FORMAT || file.fileVersion !== TYPER_FILE_VERSION || !isFontProject(file.project)) {
    throw new Error('Este arquivo não é um projeto Typer compatível.')
  }
  const now = new Date().toISOString()
  return {
    id: typeof file.id === 'string' && file.id ? file.id : crypto.randomUUID(),
    name: typeof file.name === 'string' && file.name.trim() ? file.name.trim() : file.project.font.familyName,
    createdAt: typeof file.createdAt === 'string' ? file.createdAt : now,
    updatedAt: typeof file.updatedAt === 'string' ? file.updatedAt : now,
    project: normalizeFontProject(file.project),
    sourceFileName,
  }
}

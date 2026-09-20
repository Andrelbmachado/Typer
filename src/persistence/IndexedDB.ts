import type { FontProject } from '../typography/Font'
import { createProjectRecord, type ProjectRecord } from '../typography/ProjectFile'

const DB_NAME = 'FonteForte'
const DB_VERSION = 2
const STORE = 'projects'
const AUTOSAVE_KEY = 'autosave'
const PROJECT_PREFIX = 'project:'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function getValue<T>(key: IDBValidKey): Promise<T | undefined> {
  const db = await openDB()
  const result = await new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  db.close()
  return result
}

async function putValue<T>(key: IDBValidKey, value: T): Promise<void> {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function saveProjectRecord(record: ProjectRecord): Promise<ProjectRecord> {
  const saved = { ...record, updatedAt: new Date().toISOString() }
  await putValue(`${PROJECT_PREFIX}${record.id}`, saved)
  return saved
}

export async function loadProjectRecord(id: string): Promise<ProjectRecord | undefined> {
  return getValue<ProjectRecord>(`${PROJECT_PREFIX}${id}`)
}

export async function listProjectRecords(): Promise<ProjectRecord[]> {
  const db = await openDB()
  const entries = await new Promise<ProjectRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)
    const records: ProjectRecord[] = []
    const req = store.openCursor()
    req.onsuccess = () => {
      const cursor = req.result
      if (!cursor) {
        resolve(records)
        return
      }
      if (typeof cursor.key === 'string' && cursor.key.startsWith(PROJECT_PREFIX)) records.push(cursor.value)
      cursor.continue()
    }
    req.onerror = () => reject(req.error)
  })
  db.close()

  if (entries.length === 0) {
    const legacy = await getValue<FontProject>(AUTOSAVE_KEY)
    if (legacy) {
      const migrated = createProjectRecord(legacy.font.familyName || 'Minha Fonte')
      migrated.project = legacy
      await saveProjectRecord(migrated)
      return [migrated]
    }
  }

  return entries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

// Compatibilidade com a primeira versão do app.
export async function saveProject(project: FontProject, key = AUTOSAVE_KEY): Promise<void> {
  await putValue(key, project)
}

export async function loadProject(key = AUTOSAVE_KEY): Promise<FontProject | undefined> {
  return getValue<FontProject>(key)
}

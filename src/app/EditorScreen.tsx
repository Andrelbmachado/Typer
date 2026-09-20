import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Download, FileCode2, Home, Import } from 'lucide-react'
import opentype from 'opentype.js'
import { Canvas } from '../editor/Canvas'
import { MiniGlyphPreview } from '../editor/MiniGlyphPreview'
import { Toolbar } from '../panels/Toolbar'
import { GlyphGrid } from '../panels/GlyphGrid'
import { LayersPanel } from '../panels/LayersPanel'
import { AlignPanel } from '../panels/AlignPanel'
import { MetricsPanel } from '../panels/MetricsPanel'
import { GuidesPanel } from '../panels/GuidesPanel'
import { ReferencesPanel } from '../panels/ReferencesPanel'
import { ExportMenu } from '../panels/ExportMenu'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { loadProjectRecord, saveProjectRecord } from '../persistence/IndexedDB'
import { defaultCharacterSet } from '../typography/Font'
import { parseProjectFile, toProjectFile, type ProjectRecord } from '../typography/ProjectFile'
import type { ReferenceAsset } from '../typography/Font'

function useNeighborGlyphs(current: string) {
  const chars = defaultCharacterSet().map((c) => c.char)
  const i = chars.indexOf(current)
  return {
    prev: i > 0 ? chars[i - 1] : null,
    next: i >= 0 && i < chars.length - 1 ? chars[i + 1] : null,
  }
}

export function EditorScreen({ projectId, onHome }: { projectId: string; onHome: () => void }) {
  const project = useProjectStore((s) => s.project)
  const loadProjectIntoStore = useProjectStore((s) => s.loadProject)
  const editingGlyph = useEditorStore((s) => s.editingGlyph)
  const selectedNodeIds = useEditorStore((s) => s.selectedNodeIds)
  const setSelectedNodeIds = useEditorStore((s) => s.setSelectedNodeIds)
  const setSelectedPathIds = useEditorStore((s) => s.setSelectedPathIds)
  const setClipboard = useEditorStore((s) => s.setClipboard)
  const clipboard = useEditorStore((s) => s.clipboard)
  const undo = useProjectStore((s) => s.undo)
  const redo = useProjectStore((s) => s.redo)
  const setGlyphPaths = useProjectStore((s) => s.setGlyphPaths)
  const addReference = useProjectStore((s) => s.addReference)
  const [hydrated, setHydrated] = useState(false)
  const [saveState, setSaveState] = useState<'saving' | 'saved'>('saved')
  const [error, setError] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [carousel, setCarousel] = useState<{ direction: 'previous' | 'next' | 'idle'; version: number }>({ direction: 'idle', version: 0 })
  const recordRef = useRef<ProjectRecord | null>(null)
  const previousGlyphRef = useRef(editingGlyph)
  const importRef = useRef<HTMLInputElement>(null)
  const { prev, next } = useNeighborGlyphs(editingGlyph)

  async function dataUrlFromFile(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Não foi possível ler o arquivo.'))
      reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'))
      reader.readAsDataURL(file)
    })
  }

  async function createReference(file: File): Promise<ReferenceAsset> {
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (extension === 'ttf' || extension === 'otf') {
      const font = opentype.parse(await file.arrayBuffer())
      const glyph = font.charToGlyph(editingGlyph)
      const upm = font.unitsPerEm || 1000
      const ascender = font.ascender || Math.round(upm * .8)
      const path = glyph.getPath(0, ascender, upm).toPathData(2)
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${upm} ${upm}"><path d="${path}" fill="#111111"/></svg>`
      return { id: crypto.randomUUID(), name: `${file.name} · ${editingGlyph}`, kind: 'font', source: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, opacity: .22, visible: true }
    }
    if (extension === 'svg' || file.type === 'image/svg+xml') {
      return { id: crypto.randomUUID(), name: file.name, kind: 'svg', source: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(await file.text())}`, opacity: .28, visible: true }
    }
    if (file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp'].includes(extension ?? '')) {
      return { id: crypto.randomUUID(), name: file.name, kind: 'image', source: await dataUrlFromFile(file), opacity: .24, visible: true }
    }
    throw new Error('Use um projeto TyperJSON, fonte TTF/OTF, SVG ou imagem PNG/JPG/WebP.')
  }

  useEffect(() => {
    const previous = previousGlyphRef.current
    if (previous === editingGlyph) return
    const chars = defaultCharacterSet().map((item) => item.char)
    const direction = chars.indexOf(editingGlyph) >= chars.indexOf(previous) ? 'next' : 'previous'
    previousGlyphRef.current = editingGlyph
    setCarousel((state) => ({ direction, version: state.version + 1 }))
  }, [editingGlyph])

  useEffect(() => {
    setHydrated(false)
    void loadProjectRecord(projectId).then((record) => {
      if (!record) {
        onHome()
        return
      }
      recordRef.current = record
      loadProjectIntoStore(record.project)
      setHydrated(true)
    }).catch(() => onHome())
  }, [loadProjectIntoStore, onHome, projectId])

  useEffect(() => {
    if (!hydrated || !recordRef.current) return
    setSaveState('saving')
    const id = window.setTimeout(() => {
      if (!recordRef.current) return
      const record = { ...recordRef.current, name: project.font.familyName, project }
      void saveProjectRecord(record).then((saved) => {
        recordRef.current = saved
        setSaveState('saved')
      })
    }, 800)
    return () => window.clearTimeout(id)
  }, [hydrated, project])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      const modifier = event.metaKey || event.ctrlKey
      if (modifier && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if (modifier && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        redo()
        return
      }
      const glyph = project.glyphs[editingGlyph]
      if (!glyph) return
      if (modifier && event.key.toLowerCase() === 'c') {
        if (!selectedNodeIds.length) return
        event.preventDefault()
        const selected = new Set(selectedNodeIds)
        setClipboard(glyph.paths.map((path) => ({ ...path, nodes: path.nodes.filter((node) => selected.has(node.id)).map((node) => ({ ...node, handleIn: node.handleIn && { ...node.handleIn }, handleOut: node.handleOut && { ...node.handleOut } })) })).filter((path) => path.nodes.length))
        return
      }
      if (modifier && event.key.toLowerCase() === 'v') {
        if (!clipboard.length) return
        event.preventDefault()
        const pasted = clipboard.map((path) => ({
          ...path,
          id: crypto.randomUUID(),
          closed: path.closed && path.nodes.length >= 3,
          nodes: path.nodes.map((node) => ({
            ...node,
            id: crypto.randomUUID(),
            x: node.x + 24,
            y: node.y + 24,
            handleIn: node.handleIn && { x: node.handleIn.x + 24, y: node.handleIn.y + 24 },
            handleOut: node.handleOut && { x: node.handleOut.x + 24, y: node.handleOut.y + 24 },
          })),
        }))
        setGlyphPaths(editingGlyph, [...glyph.paths, ...pasted])
        setSelectedNodeIds(pasted.flatMap((path) => path.nodes.map((node) => node.id)))
        setSelectedPathIds(pasted.map((path) => path.id))
        return
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNodeIds.length) {
        event.preventDefault()
        const selected = new Set(selectedNodeIds)
        const paths = glyph.paths.map((path) => {
          const nodes = path.nodes.filter((node) => !selected.has(node.id))
          return { ...path, nodes, closed: nodes.length >= 3 && path.closed }
        }).filter((path) => path.nodes.length)
        setGlyphPaths(editingGlyph, paths)
        setSelectedNodeIds([])
        setSelectedPathIds([])
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [clipboard, editingGlyph, project.glyphs, redo, selectedNodeIds, setClipboard, setGlyphPaths, setSelectedNodeIds, setSelectedPathIds, undo])

  async function saveAndGoHome() {
    if (recordRef.current) {
      recordRef.current = await saveProjectRecord({ ...recordRef.current, name: project.font.familyName, project })
    }
    onHome()
  }

  async function importUpdate(file: File) {
    try {
      const imported = parseProjectFile(JSON.parse(await file.text()), file.name)
      const current = recordRef.current
      if (!current) return
      const updated = await saveProjectRecord({ ...imported, id: current.id, createdAt: current.createdAt })
      recordRef.current = updated
      loadProjectIntoStore(updated.project)
      setError(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível atualizar o projeto.')
    } finally {
      if (importRef.current) importRef.current.value = ''
    }
  }

  async function importFile(file: File) {
    try {
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (extension === 'json' || extension === 'typer.json') await importUpdate(file)
      else {
        addReference(await createReference(file))
        setError(null)
      }
      setImportOpen(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível importar o arquivo.')
    } finally {
      if (importRef.current) importRef.current.value = ''
    }
  }

  function downloadProjectFile() {
    if (!recordRef.current) return
    const file = toProjectFile({ ...recordRef.current, name: project.font.familyName, project })
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${project.font.familyName.trim().replaceAll(/[^a-z0-9]+/gi, '-') || 'typer'}.typer.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!hydrated) return <div className="editor-loading">Abrindo projeto…</div>

  const unicodeHex = (editingGlyph.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0')
  const contourCount = project.glyphs[editingGlyph]?.paths.length ?? 0
  const nodeCount = project.glyphs[editingGlyph]?.paths.reduce((sum, path) => sum + path.nodes.length, 0) ?? 0

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">Typer</span>
        <button className="home-button" onClick={() => void saveAndGoHome()} aria-label="Voltar para a Home" title="Home"><Home size={17} /></button>
        <div className="glyph-strip"><GlyphGrid /></div>
        <div className="topbar-right">
          <div className="import-menu">
            <button className="import-btn" type="button" aria-expanded={importOpen} aria-haspopup="menu" onClick={() => setImportOpen((value) => !value)}><Import size={16} /> Importar <ChevronDown size={15} /></button>
            {importOpen && <div className="import-popover" role="menu" aria-label="Importar arquivos">
              <button type="button" role="menuitem" onClick={() => importRef.current?.click()}><FileCode2 size={17} /><span><strong>Adicionar arquivo</strong><small>TyperJSON, TTF, OTF, SVG, PNG ou JPG</small></span></button>
              <button type="button" role="menuitem" onClick={downloadProjectFile}><Download size={17} /><span><strong>Baixar projeto TyperJSON</strong><small>Cópia editável do projeto atual</small></span></button>
            </div>}
          </div>
          <ExportMenu project={project} glyphName={editingGlyph} />
        </div>
      </header>

      {error && <div className="editor-error" role="alert">{error}<button onClick={() => setError(null)}>Fechar</button></div>}

      <div className="workspace">
        <main className="canvas-row">
          <Toolbar />
          <div key={carousel.version} className={`glyph-carousel carousel-${carousel.direction}`}>
            <div className="neighbor-slot previous">{prev && <MiniGlyphPreview char={prev} />}</div>
            <div className="main-canvas-slot">
              <div className="canvas-label"><span className="canvas-label-char">{editingGlyph === ' ' ? 'space' : editingGlyph}</span><span className="canvas-label-code" title={`Código Unicode de ${editingGlyph}`}>U+{unicodeHex} · 1000 × 1000</span></div>
              <Canvas />
            </div>
            <div className="neighbor-slot next">{next && <MiniGlyphPreview char={next} />}</div>
          </div>
        </main>
        <aside className="right-panel"><LayersPanel /><AlignPanel /><MetricsPanel /><GuidesPanel /><ReferencesPanel onImport={() => importRef.current?.click()} /></aside>
      </div>

      <div className="statusbar">
        <span>{editingGlyph === ' ' ? 'space' : editingGlyph}</span><span>U+{unicodeHex}</span><span>{contourCount} contornos</span><span>{nodeCount} nós</span>
        <span className="saved-status"><span className={`saved-dot ${saveState}`} aria-hidden="true" /> {saveState === 'saving' ? 'Salvando…' : 'Salvo localmente'}</span>
      </div>

      <input ref={importRef} type="file" accept=".json,.typer.json,application/json,.ttf,.otf,.svg,.png,.jpg,.jpeg,.webp,font/ttf,font/otf,image/svg+xml,image/png,image/jpeg,image/webp" hidden onChange={(event) => {
        const file = event.target.files?.[0]
        if (file) void importFile(file)
      }} />
    </div>
  )
}

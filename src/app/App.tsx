import { useEffect } from 'react'
import { Canvas } from '../editor/Canvas'
import { MiniGlyphPreview } from '../editor/MiniGlyphPreview'
import { Toolbar } from '../panels/Toolbar'
import { GlyphGrid } from '../panels/GlyphGrid'
import { LayersPanel } from '../panels/LayersPanel'
import { AlignPanel } from '../panels/AlignPanel'
import { MetricsPanel } from '../panels/MetricsPanel'
import { GuidesPanel } from '../panels/GuidesPanel'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { saveProject, loadProject } from '../persistence/IndexedDB'
import { downloadTTF } from '../font-engine/OpenTypeExporter'
import { defaultCharacterSet } from '../typography/Font'

function useNeighborGlyphs(current: string) {
  const chars = defaultCharacterSet().map((c) => c.char)
  const i = chars.indexOf(current)
  return {
    prev: i > 0 ? chars[i - 1] : null,
    next: i >= 0 && i < chars.length - 1 ? chars[i + 1] : null,
  }
}

export function App() {
  const project = useProjectStore((s) => s.project)
  const loadProjectIntoStore = useProjectStore((s) => s.loadProject)
  const editingGlyph = useEditorStore((s) => s.editingGlyph)
  const { prev, next } = useNeighborGlyphs(editingGlyph)

  useEffect(() => {
    loadProject().then((saved) => {
      if (saved) loadProjectIntoStore(saved)
    })
  }, [loadProjectIntoStore])

  useEffect(() => {
    const id = setTimeout(() => saveProject(project), 800)
    return () => clearTimeout(id)
  }, [project])

  const unicodeHex = (editingGlyph.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0')
  const contourCount = project.glyphs[editingGlyph]?.paths.length ?? 0
  const nodeCount = project.glyphs[editingGlyph]?.paths.reduce((sum, p) => sum + p.nodes.length, 0) ?? 0

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">Typer</span>
        <div className="glyph-strip">
          <GlyphGrid />
        </div>
        <div className="topbar-right">
          <span className="font-name">{project.font.familyName} ▾</span>
          <span className="saved-status">
            <span className="saved-dot" /> Salvo
          </span>
          <button className="export-btn" onClick={() => downloadTTF(project)}>
            Exportar
          </button>
        </div>
      </header>

      <div className="workspace">
        <main className="canvas-row">
          <Toolbar />

          <div className="neighbor-slot">{prev && <MiniGlyphPreview char={prev} />}</div>

          <div className="main-canvas-slot">
            <div className="canvas-label">
              <span className="canvas-label-char">{editingGlyph === ' ' ? 'space' : editingGlyph}</span>
              <span className="canvas-label-code">U+{unicodeHex}</span>
            </div>
            <Canvas />
          </div>

          <div className="neighbor-slot">{next && <MiniGlyphPreview char={next} />}</div>
        </main>

        <aside className="right-panel">
          <LayersPanel />
          <AlignPanel />
          <MetricsPanel />
          <GuidesPanel />
        </aside>
      </div>

      <div className="statusbar">
        <span>{editingGlyph === ' ' ? 'space' : editingGlyph}</span>
        <span>U+{unicodeHex}</span>
        <span>{contourCount} contornos</span>
        <span>{nodeCount} nós</span>
      </div>
    </div>
  )
}

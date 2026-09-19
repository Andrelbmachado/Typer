import { useEffect } from 'react'
import { Canvas } from '../editor/Canvas'
import { Toolbar } from '../panels/Toolbar'
import { GlyphGrid } from '../panels/GlyphGrid'
import { GuidesPanel } from '../panels/GuidesPanel'
import { MetricsPanel } from '../panels/MetricsPanel'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { saveProject, loadProject } from '../persistence/IndexedDB'
import { downloadTTF } from '../font-engine/OpenTypeExporter'

export function App() {
  const project = useProjectStore((s) => s.project)
  const loadProjectIntoStore = useProjectStore((s) => s.loadProject)
  const editingGlyph = useEditorStore((s) => s.editingGlyph)

  useEffect(() => {
    loadProject().then((saved) => {
      if (saved) loadProjectIntoStore(saved)
    })
  }, [loadProjectIntoStore])

  useEffect(() => {
    const id = setTimeout(() => saveProject(project), 800)
    return () => clearTimeout(id)
  }, [project])

  return (
    <div className="app">
      <header className="menubar">
        <span className="brand">Fonte Forte</span>
        <span className="menu-item">Arquivo</span>
        <span className="menu-item">Editar</span>
        <span className="menu-item">Exibir</span>
        <span className="menu-item">Glifo</span>
        <span className="menu-item">Fonte</span>
        <button className="export-btn" onClick={() => downloadTTF(project)}>
          Exportar TTF
        </button>
      </header>

      <div className="workspace">
        <Toolbar />

        <main className="canvas-area">
          <div className="canvas-title">{editingGlyph === ' ' ? 'space' : editingGlyph}</div>
          <Canvas />
        </main>

        <aside className="right-panel">
          <GuidesPanel />
          <MetricsPanel />
        </aside>
      </div>

      <footer className="glyph-bar">
        <GlyphGrid />
      </footer>
    </div>
  )
}

import { Eye, EyeOff, Folder, Layers3, LockKeyhole, Plus } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { PanelSection } from '../components/PanelSection'

export function LayersPanel() {
  const editingGlyph = useEditorStore((state) => state.editingGlyph)
  const glyph = useProjectStore((state) => state.project.glyphs[editingGlyph])
  const selected = useEditorStore((state) => state.selectedNodeIds)
  const setSelected = useEditorStore((state) => state.setSelectedNodeIds)
  const selectedPathIds = useEditorStore((state) => state.selectedPathIds)
  const setSelectedPathIds = useEditorStore((state) => state.setSelectedPathIds)
  const hiddenPathIds = useEditorStore((state) => state.hiddenPathIds)
  const togglePathVisibility = useEditorStore((state) => state.togglePathVisibility)
  const setTool = useEditorStore((state) => state.setTool)
  const paths = glyph?.paths ?? []
  return (
    <PanelSection
      title="Camadas"
      className="layers-panel"
      trailing={<button className="panel-icon-btn" type="button" aria-label="Criar contorno com a caneta" title="Criar contorno com a caneta" onClick={() => setTool('pen')}><Plus size={17} /></button>}
    >
      <ul className="layer-list">
        <li className="layer-row layer-group"><Folder size={17} /><span className="layer-name">Vetores</span></li>
        {paths.length === 0 && <li className="layer-empty">Desenhe um contorno para começar</li>}
        {paths.map((path, index) => (
          <li key={path.id} className={`layer-row ${selectedPathIds.includes(path.id) || path.nodes.some((node) => selected.includes(node.id)) ? 'active' : ''}`}>
            <button className="layer-visibility" title={hiddenPathIds.includes(path.id) ? 'Mostrar contorno' : 'Ocultar contorno'} onClick={() => togglePathVisibility(path.id)}>
              {hiddenPathIds.includes(path.id) ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button className="layer-select" onClick={(event) => {
              const ids = event.shiftKey
                ? selectedPathIds.includes(path.id)
                  ? selectedPathIds.filter((id) => id !== path.id)
                  : [...selectedPathIds, path.id]
                : [path.id]
              setSelectedPathIds(ids)
              setSelected(paths.filter((item) => ids.includes(item.id)).flatMap((item) => item.nodes.map((node) => node.id)))
            }}>
              <Layers3 size={16} /><span className="layer-name">Contorno {index + 1}</span>
            </button>
            {path.closed && <LockKeyhole size={14} className="layer-lock" aria-label="Contorno fechado" />}
          </li>
        ))}
      </ul>
    </PanelSection>
  )
}

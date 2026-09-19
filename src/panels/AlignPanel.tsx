import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { alignSelectedNodes, type AlignMode } from '../geometry/Align'

const ROW1: { mode: AlignMode; icon: string; label: string }[] = [
  { mode: 'left', icon: '⊢', label: 'Alinhar à esquerda' },
  { mode: 'center-h', icon: '⊣⊢', label: 'Centralizar horizontal' },
  { mode: 'right', icon: '⊣', label: 'Alinhar à direita' },
]

const ROW2: { mode: AlignMode; icon: string; label: string }[] = [
  { mode: 'top', icon: '⊤', label: 'Alinhar ao topo' },
  { mode: 'center-v', icon: '⊥⊤', label: 'Centralizar vertical' },
  { mode: 'bottom', icon: '⊥', label: 'Alinhar embaixo' },
]

export function AlignPanel() {
  const editingGlyph = useEditorStore((s) => s.editingGlyph)
  const selectedNodeIds = useEditorStore((s) => s.selectedNodeIds)
  const glyph = useProjectStore((s) => s.project.glyphs[editingGlyph])
  const setGlyphPaths = useProjectStore((s) => s.setGlyphPaths)

  const disabled = selectedNodeIds.length < 2

  function applyAlign(mode: AlignMode) {
    if (!glyph || disabled) return
    setGlyphPaths(editingGlyph, alignSelectedNodes(glyph.paths, selectedNodeIds, mode))
  }

  return (
    <div className="panel">
      <h3>Centralizar</h3>
      <div className="align-grid">
        {ROW1.map(({ mode, icon, label }) => (
          <button key={mode} className="align-btn" title={label} disabled={disabled} onClick={() => applyAlign(mode)}>
            {icon}
          </button>
        ))}
        {ROW2.map(({ mode, icon, label }) => (
          <button key={mode} className="align-btn" title={label} disabled={disabled} onClick={() => applyAlign(mode)}>
            {icon}
          </button>
        ))}
      </div>
    </div>
  )
}

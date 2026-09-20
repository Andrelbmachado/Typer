import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { alignSelectedNodes, alignSelectedPaths, type AlignMode } from '../geometry/Align'
import { AlignCenterHorizontal, AlignCenterVertical, AlignEndVertical, AlignLeft, AlignRight, AlignStartVertical } from 'lucide-react'
import { PanelSection } from '../components/PanelSection'

const ROW1: { mode: AlignMode; Icon: typeof AlignLeft; label: string }[] = [
  { mode: 'left', Icon: AlignLeft, label: 'Alinhar à esquerda' },
  { mode: 'center-h', Icon: AlignCenterHorizontal, label: 'Centralizar horizontal' },
  { mode: 'right', Icon: AlignRight, label: 'Alinhar à direita' },
]

const ROW2: { mode: AlignMode; Icon: typeof AlignLeft; label: string }[] = [
  { mode: 'top', Icon: AlignStartVertical, label: 'Alinhar ao topo' },
  { mode: 'center-v', Icon: AlignCenterVertical, label: 'Centralizar vertical' },
  { mode: 'bottom', Icon: AlignEndVertical, label: 'Alinhar embaixo' },
]

export function AlignPanel() {
  const editingGlyph = useEditorStore((s) => s.editingGlyph)
  const selectedNodeIds = useEditorStore((s) => s.selectedNodeIds)
  const selectedPathIds = useEditorStore((s) => s.selectedPathIds)
  const glyph = useProjectStore((s) => s.project.glyphs[editingGlyph])
  const font = useProjectStore((s) => s.project.font)
  const setGlyphPaths = useProjectStore((s) => s.setGlyphPaths)

  const usesContours = selectedPathIds.length > 0
  const disabled = !usesContours && selectedNodeIds.length < 2

  function applyAlign(mode: AlignMode) {
    if (!glyph || disabled) return
    const next = usesContours
      ? alignSelectedPaths(glyph.paths, selectedPathIds, mode, {
          minX: 0,
          maxX: font.unitsPerEm,
          minY: font.descender,
          maxY: font.ascender,
        })
      : alignSelectedNodes(glyph.paths, selectedNodeIds, mode)
    setGlyphPaths(editingGlyph, next)
  }

  return (
    <PanelSection title="Alinhar e centralizar" trailing={<span className="selection-count">{usesContours ? `${selectedPathIds.length} contorno${selectedPathIds.length === 1 ? '' : 's'}` : `${selectedNodeIds.length} nós`}</span>}>
      <div className="align-grid">
        {ROW1.map(({ mode, Icon, label }) => (
          <button key={mode} className="align-btn" title={label} aria-label={label} disabled={disabled} onClick={() => applyAlign(mode)}>
            <Icon size={17} />
          </button>
        ))}
        {ROW2.map(({ mode, Icon, label }) => (
          <button key={mode} className="align-btn" title={label} aria-label={label} disabled={disabled} onClick={() => applyAlign(mode)}>
            <Icon size={17} />
          </button>
        ))}
      </div>
      <p className="panel-hint">{disabled ? 'Selecione um contorno ou pelo menos dois nós.' : usesContours && selectedPathIds.length === 1 ? 'O contorno será alinhado à área de 1000 × 1000.' : 'A seleção é alinhada sem deformar as curvas.'}</p>
    </PanelSection>
  )
}

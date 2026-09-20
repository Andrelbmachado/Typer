import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { ScrubNumberInput } from '../components/ScrubNumberInput'
import { PanelSection } from '../components/PanelSection'

export function MetricsPanel() {
  const editingGlyph = useEditorStore((s) => s.editingGlyph)
  const glyph = useProjectStore((s) => s.project.glyphs[editingGlyph])
  const unitsPerEm = useProjectStore((s) => s.project.font.unitsPerEm)
  const updateGlyphMetrics = useProjectStore((s) => s.updateGlyphMetrics)

  if (!glyph) return null

  return (
    <PanelSection title="Propriedades">
      <label className="field-row">
        <span>Largura</span>
        <ScrubNumberInput
          label="Largura"
          value={glyph.metrics.advanceWidth}
          min={1}
          onChange={(value) => updateGlyphMetrics(editingGlyph, { advanceWidth: value })}
        />
      </label>
      <label className="field-row">
        <span>Side Bearing (L)</span>
        <ScrubNumberInput
          label="Side Bearing esquerdo"
          value={glyph.metrics.leftBearing}
          onChange={(value) => updateGlyphMetrics(editingGlyph, { leftBearing: value })}
        />
      </label>
      <label className="field-row">
        <span>Side Bearing (R)</span>
        <ScrubNumberInput
          label="Side Bearing direito"
          value={glyph.metrics.rightBearing}
          onChange={(value) => updateGlyphMetrics(editingGlyph, { rightBearing: value })}
        />
      </label>
      <label className="field-row">
        <span>Unidade (UPM)</span>
        <ScrubNumberInput label="Unidade por em" value={unitsPerEm} readOnly />
      </label>
    </PanelSection>
  )
}

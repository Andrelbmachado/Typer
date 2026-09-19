import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'

export function MetricsPanel() {
  const editingGlyph = useEditorStore((s) => s.editingGlyph)
  const glyph = useProjectStore((s) => s.project.glyphs[editingGlyph])
  const unitsPerEm = useProjectStore((s) => s.project.font.unitsPerEm)
  const updateGlyphMetrics = useProjectStore((s) => s.updateGlyphMetrics)

  if (!glyph) return null

  return (
    <div className="panel">
      <h3>Propriedades</h3>
      <label className="field-row">
        <span>Largura</span>
        <input
          type="number"
          value={glyph.metrics.advanceWidth}
          onChange={(e) => updateGlyphMetrics(editingGlyph, { advanceWidth: Number(e.target.value) })}
        />
      </label>
      <label className="field-row">
        <span>Side Bearing (L)</span>
        <input
          type="number"
          value={glyph.metrics.leftBearing}
          onChange={(e) => updateGlyphMetrics(editingGlyph, { leftBearing: Number(e.target.value) })}
        />
      </label>
      <label className="field-row">
        <span>Side Bearing (R)</span>
        <input
          type="number"
          value={glyph.metrics.rightBearing}
          onChange={(e) => updateGlyphMetrics(editingGlyph, { rightBearing: Number(e.target.value) })}
        />
      </label>
      <label className="field-row">
        <span>Unidade (UPM)</span>
        <input type="number" value={unitsPerEm} readOnly />
      </label>
    </div>
  )
}

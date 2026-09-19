import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'

export function MetricsPanel() {
  const editingGlyph = useEditorStore((s) => s.editingGlyph)
  const glyph = useProjectStore((s) => s.project.glyphs[editingGlyph])
  const updateGlyphMetrics = useProjectStore((s) => s.updateGlyphMetrics)

  if (!glyph) return null

  return (
    <div className="panel">
      <h3>Métricas — {editingGlyph === ' ' ? 'space' : editingGlyph}</h3>
      <label className="field-row">
        <span>Advance Width</span>
        <input
          type="number"
          value={glyph.metrics.advanceWidth}
          onChange={(e) => updateGlyphMetrics(editingGlyph, { advanceWidth: Number(e.target.value) })}
        />
      </label>
      <label className="field-row">
        <span>Left Bearing</span>
        <input
          type="number"
          value={glyph.metrics.leftBearing}
          onChange={(e) => updateGlyphMetrics(editingGlyph, { leftBearing: Number(e.target.value) })}
        />
      </label>
      <label className="field-row">
        <span>Right Bearing</span>
        <input
          type="number"
          value={glyph.metrics.rightBearing}
          onChange={(e) => updateGlyphMetrics(editingGlyph, { rightBearing: Number(e.target.value) })}
        />
      </label>
    </div>
  )
}

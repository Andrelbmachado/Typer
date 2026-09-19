import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { pathToSvgD } from '../geometry/Path'

const MARGIN_RATIO = 0.15

export function MiniGlyphPreview({ char }: { char: string }) {
  const project = useProjectStore((s) => s.project)
  const setEditingGlyph = useEditorStore((s) => s.setEditingGlyph)
  const { guides } = project
  const glyph = project.glyphs[char]

  const vRange = guides.ascender - guides.descender || 1
  const margin = vRange * MARGIN_RATIO
  const viewSize = vRange + margin * 2
  const centerX = (glyph?.metrics.advanceWidth ?? 600) / 2
  const viewBox = `${centerX - viewSize / 2} 0 ${viewSize} ${viewSize}`

  return (
    <button className="mini-glyph" onClick={() => setEditingGlyph(char)} title={char === ' ' ? 'space' : char}>
      <div className="mini-glyph-label">
        {char === ' ' ? '␣' : char}
        <span className="mini-glyph-code">U+{(char.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0')}</span>
      </div>
      <svg viewBox={viewBox} className="mini-glyph-canvas">
        <rect x={centerX - viewSize} y={0} width={viewSize * 2} height={viewSize} fill="#ffffff" />
        <g transform={`translate(0, ${guides.ascender + margin}) scale(1, -1)`}>
          {glyph?.paths.map((p) => <path key={p.id} d={pathToSvgD(p)} fill="#333" stroke="none" />)}
        </g>
      </svg>
    </button>
  )
}

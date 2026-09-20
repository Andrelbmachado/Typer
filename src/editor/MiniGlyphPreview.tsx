import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { pathToSvgD } from '../geometry/Path'

const VIEW_SIZE = 1000
const MARGIN = 100

export function MiniGlyphPreview({ char }: { char: string }) {
  const project = useProjectStore((s) => s.project)
  const setEditingGlyph = useEditorStore((s) => s.setEditingGlyph)
  const { guides } = project
  const glyph = project.glyphs[char]

  const vRange = guides.ascender - guides.descender || 1
  const scale = (VIEW_SIZE - MARGIN * 2) / vRange

  return (
    <button className="mini-glyph" onClick={() => setEditingGlyph(char)} title={char === ' ' ? 'space' : char}>
      <div className="mini-glyph-label">
        {char === ' ' ? '␣' : char}
        <span className="mini-glyph-code">U+{(char.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0')}</span>
      </div>
      <svg viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`} className="mini-glyph-canvas">
        <rect width={VIEW_SIZE} height={VIEW_SIZE} fill="#ffffff" />
        <g transform={`translate(${MARGIN} ${MARGIN + guides.ascender * scale}) scale(${scale} ${-scale})`}>
          {glyph?.paths.map((p) => <path key={p.id} d={pathToSvgD(p)} fill="#333" stroke="none" />)}
        </g>
      </svg>
    </button>
  )
}

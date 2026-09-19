import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { defaultCharacterSet } from '../typography/Font'

export function GlyphGrid() {
  const glyphs = useProjectStore((s) => s.project.glyphs)
  const editingGlyph = useEditorStore((s) => s.editingGlyph)
  const setEditingGlyph = useEditorStore((s) => s.setEditingGlyph)
  const chars = defaultCharacterSet()

  return (
    <div className="glyph-grid">
      {chars.map(({ char }) => {
        const status = glyphs[char]?.status ?? 'empty'
        return (
          <button
            key={char}
            className={`glyph-cell ${status} ${char === editingGlyph ? 'active' : ''}`}
            onClick={() => setEditingGlyph(char)}
            title={char === ' ' ? 'space' : char}
          >
            {char === ' ' ? '␣' : char}
          </button>
        )
      })}
    </div>
  )
}

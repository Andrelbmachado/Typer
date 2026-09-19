import opentype from 'opentype.js'
import type { FontProject } from '../typography/Font'
import type { GlyphPath } from '../geometry/Path'
import type { Glyph } from '../typography/Glyph'

function pathToOpenType(paths: GlyphPath[]): opentype.Path {
  const path = new opentype.Path()

  for (const p of paths) {
    if (p.nodes.length === 0) continue
    const [first, ...rest] = p.nodes
    path.moveTo(first.x, first.y)

    let prev = first
    const drawSegment = (from: typeof first, to: typeof first) => {
      if (!from.handleOut && !to.handleIn) {
        path.lineTo(to.x, to.y)
        return
      }
      const c1 = from.handleOut ?? { x: from.x, y: from.y }
      const c2 = to.handleIn ?? { x: to.x, y: to.y }
      path.curveTo(c1.x, c1.y, c2.x, c2.y, to.x, to.y)
    }

    for (const n of rest) {
      drawSegment(prev, n)
      prev = n
    }
    if (p.closed) {
      drawSegment(prev, first)
      path.close()
    }
  }

  return path
}

function buildGlyph(glyph: Glyph): opentype.Glyph {
  return new opentype.Glyph({
    name: glyph.name,
    unicode: glyph.unicode ?? undefined,
    advanceWidth: glyph.metrics.advanceWidth,
    path: pathToOpenType(glyph.paths),
  })
}

export function exportProjectToFont(project: FontProject): opentype.Font {
  const notdef = new opentype.Glyph({
    name: '.notdef',
    advanceWidth: project.font.unitsPerEm / 2,
    path: new opentype.Path(),
  })

  const glyphs = [notdef, ...Object.values(project.glyphs).map(buildGlyph)]

  return new opentype.Font({
    familyName: project.font.familyName,
    styleName: project.font.styleName,
    unitsPerEm: project.font.unitsPerEm,
    ascender: project.font.ascender,
    descender: project.font.descender,
    glyphs,
  })
}

export function downloadTTF(project: FontProject) {
  const font = exportProjectToFont(project)
  const arrayBuffer = font.toArrayBuffer()
  const blob = new Blob([arrayBuffer], { type: 'font/ttf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${project.font.familyName}-${project.font.styleName}.ttf`
  a.click()
  URL.revokeObjectURL(url)
}

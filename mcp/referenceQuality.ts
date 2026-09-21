import type { PathInput, ReferenceGlyphInput } from './referenceProfiles'

export const CURVED_REFERENCE_GLYPHS = new Set('BCDGOPQRSUabdegopqscs0235689$?&%@()'.split(''))
export const COUNTERED_REFERENCE_GLYPHS = new Set('BDOPQRabdegopq0689@%'.split(''))

function signedArea(path: PathInput) {
  return path.nodes.reduce((area, node, index) => {
    const next = path.nodes[(index + 1) % path.nodes.length]
    return area + node.x * next.y - next.x * node.y
  }, 0) / 2
}

function hasDegenerateSegment(path: PathInput) {
  return path.nodes.some((node, index) => {
    const next = path.nodes[(index + 1) % path.nodes.length]
    return Math.hypot(next.x - node.x, next.y - node.y) < 0.01
  })
}

function hasBezier(path: PathInput) {
  return path.nodes.some((node) => node.handleIn || node.handleOut)
}

/** Quality gate for the deterministic profile generator, before font export. */
export function validateReferenceGlyphGeometry(glyphs: ReferenceGlyphInput[]) {
  const errors: string[] = []
  const expected = new Set(glyphs.map((glyph) => glyph.name))
  for (const glyph of glyphs) {
    if (!glyph.paths.length) errors.push(`${glyph.name}: sem contorno.`)
    if (glyph.paths.some((path) => !path.closed || path.nodes.length < 3)) errors.push(`${glyph.name}: possui contorno aberto ou incompleto.`)
    if (glyph.paths.some(hasDegenerateSegment)) errors.push(`${glyph.name}: possui segmento degenerado.`)
    if (CURVED_REFERENCE_GLYPHS.has(glyph.name) && !glyph.paths.some(hasBezier)) errors.push(`${glyph.name}: curva esperada sem comandos Bézier.`)
    if (COUNTERED_REFERENCE_GLYPHS.has(glyph.name)) {
      const directions = new Set(glyph.paths.map((path) => Math.sign(signedArea(path))).filter(Boolean))
      if (directions.size < 2) errors.push(`${glyph.name}: contraforma sem winding oposto.`)
    }
  }
  return { valid: errors.length === 0, errors, glyphCount: expected.size }
}

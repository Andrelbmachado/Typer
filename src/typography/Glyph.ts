import type { GlyphPath } from '../geometry/Path'

export interface GlyphMetrics {
  advanceWidth: number
  leftBearing: number
  rightBearing: number
}

export interface Glyph {
  name: string
  unicode: number | null
  paths: GlyphPath[]
  metrics: GlyphMetrics
  status: 'empty' | 'started' | 'done'
}

export function createGlyph(name: string, unicode: number | null): Glyph {
  return {
    name,
    unicode,
    paths: [],
    metrics: { advanceWidth: 600, leftBearing: 40, rightBearing: 40 },
    status: 'empty',
  }
}

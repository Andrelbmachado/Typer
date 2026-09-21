import { describe, expect, it } from 'vitest'
import { REFERENCE_NEUTRAL_REGULAR_ABC_CHARACTERS, REFERENCE_NEUTRAL_REGULAR_ABC_ID, buildGlyphsForReferenceProfile } from './referenceProfiles'
import { validateReferenceGlyphGeometry } from './referenceQuality'

describe('reference-neutral-regular', () => {
  it('creates the focused ABC study with valid, editable contours', () => {
    const glyphs = buildGlyphsForReferenceProfile(REFERENCE_NEUTRAL_REGULAR_ABC_ID)
    expect(glyphs.map((glyph) => glyph.name).join('')).toBe(REFERENCE_NEUTRAL_REGULAR_ABC_CHARACTERS)
    expect(validateReferenceGlyphGeometry(glyphs)).toEqual({ valid: true, errors: [], glyphCount: 3 })
  })

  it('uses cubic handles for the round families rather than segmented strokes', () => {
    const glyphs = buildGlyphsForReferenceProfile(REFERENCE_NEUTRAL_REGULAR_ABC_ID)
    for (const character of 'BC') {
      const glyph = glyphs.find((item) => item.name === character)
      expect(glyph?.paths.some((path) => path.nodes.some((node) => node.handleIn || node.handleOut))).toBe(true)
    }
  })

  it('keeps A centered on its construction axis so anchors can be edited predictably', () => {
    const a = buildGlyphsForReferenceProfile(REFERENCE_NEUTRAL_REGULAR_ABC_ID).find((glyph) => glyph.name === 'A')!
    const anchors = a.paths.flatMap((path) => path.nodes)
    const minX = Math.min(...anchors.map((anchor) => anchor.x))
    const maxX = Math.max(...anchors.map((anchor) => anchor.x))
    expect((minX + maxX) / 2).toBeCloseTo(300, 6)
  })
})

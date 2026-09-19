import type { Glyph } from './Glyph'

export interface FontGuides {
  capHeight: number
  xHeight: number
  baseline: number
  descender: number
  ascender: number
}

export interface FontMeta {
  familyName: string
  styleName: string
  unitsPerEm: number
  ascender: number
  descender: number
}

export interface FontProject {
  version: 1
  font: FontMeta
  guides: FontGuides
  glyphs: Record<string, Glyph>
  kerning: Record<string, number>
}

export function createDefaultProject(familyName = 'Minha Fonte'): FontProject {
  return {
    version: 1,
    font: {
      familyName,
      styleName: 'Regular',
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200,
    },
    guides: {
      capHeight: 700,
      xHeight: 500,
      baseline: 0,
      descender: -200,
      ascender: 800,
    },
    glyphs: {},
    kerning: {},
  }
}

const BASIC_LATIN =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,:;!?-_()[]{}/\\@#$%&*+='

export function defaultCharacterSet(): { char: string; unicode: number }[] {
  return Array.from(BASIC_LATIN).map((char) => ({ char, unicode: char.codePointAt(0)! }))
}

import type { Glyph } from './Glyph'

export interface FontGuides {
  capHeight: number
  xHeight: number
  baseline: number
  descender: number
  ascender: number
}

export type GuideKey = keyof FontGuides

export interface GuideAppearance {
  color: string
  locked: boolean
}

export type GuideSettings = Record<GuideKey, GuideAppearance>

export interface ReferenceAsset {
  id: string
  name: string
  kind: 'image' | 'svg' | 'font'
  source: string
  opacity: number
  visible: boolean
}

/**
 * Records a reusable design direction used to generate a project. It stores
 * intent, not a source font or a raster trace, so generated outlines remain
 * original and editable.
 */
export interface ReferenceProfileProvenance {
  id: string
  mode: 'style-direction'
  label: string
}

export const DEFAULT_GUIDES: FontGuides = {
  capHeight: 700,
  xHeight: 500,
  baseline: 0,
  descender: -200,
  ascender: 800,
}

export const DEFAULT_GUIDE_SETTINGS: GuideSettings = {
  ascender: { color: '#71717a', locked: true },
  capHeight: { color: '#7c8eb8', locked: true },
  xHeight: { color: '#8b79a8', locked: true },
  baseline: { color: '#0ea5e9', locked: true },
  descender: { color: '#71717a', locked: true },
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
  guideSettings?: GuideSettings
  references?: ReferenceAsset[]
  referenceProfile?: ReferenceProfileProvenance
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
    guides: { ...DEFAULT_GUIDES },
    guideSettings: structuredClone(DEFAULT_GUIDE_SETTINGS),
    references: [],
    glyphs: {},
    kerning: {},
  }
}

export function normalizeFontProject(project: FontProject): FontProject {
  const guideSettings = Object.fromEntries(
    (Object.keys(DEFAULT_GUIDE_SETTINGS) as GuideKey[]).map((key) => [
      key,
      { ...DEFAULT_GUIDE_SETTINGS[key], ...project.guideSettings?.[key] },
    ]),
  ) as GuideSettings
  return { ...project, guideSettings, references: project.references ?? [] }
}

export function guideAppearance(project: FontProject, key: GuideKey): GuideAppearance {
  return { ...DEFAULT_GUIDE_SETTINGS[key], ...project.guideSettings?.[key] }
}

const BASIC_LATIN =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,:;!?-_()[]{}/\\@#$%&*+='

export function defaultCharacterSet(): { char: string; unicode: number }[] {
  return Array.from(BASIC_LATIN).map((char) => ({ char, unicode: char.codePointAt(0)! }))
}

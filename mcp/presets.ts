import type { FontProject } from '../src/typography/Font'

export type PresetName = 'neutral-grotesk' | 'geometric-sans' | 'humanist-sans'

export interface VectorPreset {
  name: PresetName
  label: string
  description: string
  metrics: {
    unitsPerEm: 1000
    ascender: number
    descender: number
    capHeight: number
    xHeight: number
    baseline: 0
  }
  vectors: {
    stem: number
    curveTension: number
    overshoot: number
    defaultAdvanceWidth: number
    sideBearing: number
    contrast: 'monoline' | 'low' | 'moderate'
  }
}

export const PRESETS: Record<PresetName, VectorPreset> = {
  'neutral-grotesk': {
    name: 'neutral-grotesk',
    label: 'Neutral Grotesk',
    description: 'Sans original de baixo contraste, terminais retos e proporções equilibradas.',
    metrics: { unitsPerEm: 1000, ascender: 800, descender: -200, capHeight: 700, xHeight: 520, baseline: 0 },
    vectors: { stem: 92, curveTension: 0.5523, overshoot: 12, defaultAdvanceWidth: 600, sideBearing: 54, contrast: 'low' },
  },
  'geometric-sans': {
    name: 'geometric-sans',
    label: 'Geometric Sans',
    description: 'Sans modular com círculos amplos, construção geométrica e espaçamento aberto.',
    metrics: { unitsPerEm: 1000, ascender: 800, descender: -200, capHeight: 700, xHeight: 500, baseline: 0 },
    vectors: { stem: 84, curveTension: 0.5523, overshoot: 14, defaultAdvanceWidth: 620, sideBearing: 58, contrast: 'monoline' },
  },
  'humanist-sans': {
    name: 'humanist-sans',
    label: 'Humanist Sans',
    description: 'Sans aberta com curvas mais orgânicas, contraste moderado e leitura confortável.',
    metrics: { unitsPerEm: 1000, ascender: 800, descender: -200, capHeight: 710, xHeight: 510, baseline: 0 },
    vectors: { stem: 88, curveTension: 0.58, overshoot: 10, defaultAdvanceWidth: 610, sideBearing: 60, contrast: 'moderate' },
  },
}

export function applyPreset(project: FontProject, preset: VectorPreset): FontProject {
  return {
    ...project,
    font: {
      ...project.font,
      unitsPerEm: preset.metrics.unitsPerEm,
      ascender: preset.metrics.ascender,
      descender: preset.metrics.descender,
    },
    guides: {
      ascender: preset.metrics.ascender,
      capHeight: preset.metrics.capHeight,
      xHeight: preset.metrics.xHeight,
      baseline: preset.metrics.baseline,
      descender: preset.metrics.descender,
    },
  }
}

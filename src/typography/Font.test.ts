import { describe, expect, it } from 'vitest'
import { createDefaultProject, guideAppearance, normalizeFontProject } from './Font'

describe('guide settings', () => {
  it('adds defaults when opening a legacy project', () => {
    const legacy = createDefaultProject()
    delete legacy.guideSettings
    const normalized = normalizeFontProject(legacy)

    expect(normalized.guideSettings?.baseline).toEqual({ color: '#0ea5e9', locked: true })
    expect(normalized.guideSettings?.capHeight).toEqual({ color: '#7c8eb8', locked: true })
  })

  it('preserves customized color and lock state', () => {
    const project = createDefaultProject()
    project.guideSettings!.xHeight = { color: '#ff0066', locked: false }

    expect(guideAppearance(project, 'xHeight')).toEqual({ color: '#ff0066', locked: false })
  })
})

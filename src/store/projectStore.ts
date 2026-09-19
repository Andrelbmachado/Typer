import { create } from 'zustand'
import { createDefaultProject, type FontProject } from '../typography/Font'
import { createGlyph } from '../typography/Glyph'
import type { GlyphPath } from '../geometry/Path'

interface ProjectState {
  project: FontProject
  setGlyphPaths: (glyphName: string, paths: GlyphPath[]) => void
  ensureGlyph: (glyphName: string, unicode: number | null) => void
  updateGuide: (key: keyof FontProject['guides'], value: number) => void
  updateGlyphMetrics: (glyphName: string, metrics: Partial<FontProject['glyphs'][string]['metrics']>) => void
  loadProject: (project: FontProject) => void
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: createDefaultProject(),

  ensureGlyph: (glyphName, unicode) => {
    if (get().project.glyphs[glyphName]) return
    set((state) => ({
      project: {
        ...state.project,
        glyphs: {
          ...state.project.glyphs,
          [glyphName]: createGlyph(glyphName, unicode),
        },
      },
    }))
  },

  setGlyphPaths: (glyphName, paths) => {
    set((state) => {
      const glyph = state.project.glyphs[glyphName]
      if (!glyph) return state
      return {
        project: {
          ...state.project,
          glyphs: {
            ...state.project.glyphs,
            [glyphName]: {
              ...glyph,
              paths,
              status: paths.length > 0 ? 'started' : 'empty',
            },
          },
        },
      }
    })
  },

  updateGuide: (key, value) => {
    set((state) => ({
      project: {
        ...state.project,
        guides: { ...state.project.guides, [key]: value },
      },
    }))
  },

  updateGlyphMetrics: (glyphName, metrics) => {
    set((state) => {
      const glyph = state.project.glyphs[glyphName]
      if (!glyph) return state
      return {
        project: {
          ...state.project,
          glyphs: {
            ...state.project.glyphs,
            [glyphName]: { ...glyph, metrics: { ...glyph.metrics, ...metrics } },
          },
        },
      }
    })
  },

  loadProject: (project) => set({ project }),
}))

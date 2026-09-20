import { create } from 'zustand'
import { createDefaultProject, DEFAULT_GUIDES, DEFAULT_GUIDE_SETTINGS, normalizeFontProject, type FontProject, type GuideAppearance, type GuideKey, type ReferenceAsset } from '../typography/Font'
import { createGlyph } from '../typography/Glyph'
import type { GlyphPath } from '../geometry/Path'

interface ProjectState {
  project: FontProject
  past: FontProject[]
  future: FontProject[]
  setGlyphPaths: (glyphName: string, paths: GlyphPath[]) => void
  ensureGlyph: (glyphName: string, unicode: number | null) => void
  updateGuide: (key: keyof FontProject['guides'], value: number) => void
  updateGuideAppearance: (key: GuideKey, appearance: Partial<GuideAppearance>) => void
  resetGuides: () => void
  addReference: (reference: ReferenceAsset) => void
  removeReference: (referenceId: string) => void
  toggleReference: (referenceId: string) => void
  updateGlyphMetrics: (glyphName: string, metrics: Partial<FontProject['glyphs'][string]['metrics']>) => void
  undo: () => void
  redo: () => void
  loadProject: (project: FontProject) => void
}

const HISTORY_LIMIT = 80

function withHistory(state: Pick<ProjectState, 'project' | 'past'>, project: FontProject) {
  return {
    project,
    past: [...state.past, state.project].slice(-HISTORY_LIMIT),
    future: [] as FontProject[],
  }
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: createDefaultProject(),
  past: [],
  future: [],

  ensureGlyph: (glyphName, unicode) => {
    if (get().project.glyphs[glyphName]) return
    set((state) => ({
      ...withHistory(state, {
        ...state.project,
        glyphs: {
          ...state.project.glyphs,
          [glyphName]: createGlyph(glyphName, unicode),
        },
      }),
    }))
  },

  setGlyphPaths: (glyphName, paths) => {
    set((state) => {
      const glyph = state.project.glyphs[glyphName]
      if (!glyph) return state
      return withHistory(state, {
          ...state.project,
          glyphs: {
            ...state.project.glyphs,
            [glyphName]: {
              ...glyph,
              paths,
              status: paths.some((path) => path.closed && path.nodes.length >= 3)
                ? 'done'
                : paths.length > 0
                  ? 'started'
                  : 'empty',
            },
          },
      })
    })
  },

  updateGuide: (key, value) => {
    set((state) => withHistory(state, {
        ...state.project,
        guides: { ...state.project.guides, [key]: value },
    }))
  },

  updateGuideAppearance: (key, appearance) => {
    const normalized = normalizeFontProject(get().project)
    set((state) => withHistory(state, {
      ...state.project,
      guideSettings: {
        ...normalized.guideSettings!,
        [key]: { ...normalized.guideSettings![key], ...appearance },
      },
    }))
  },

  resetGuides: () => set((state) => withHistory(state, {
    ...state.project,
    guides: { ...DEFAULT_GUIDES },
    guideSettings: structuredClone(DEFAULT_GUIDE_SETTINGS),
  })),

  addReference: (reference) => set((state) => withHistory(state, {
    ...state.project,
    references: [...(state.project.references ?? []), reference],
  })),

  removeReference: (referenceId) => set((state) => withHistory(state, {
    ...state.project,
    references: (state.project.references ?? []).filter((reference) => reference.id !== referenceId),
  })),

  toggleReference: (referenceId) => set((state) => withHistory(state, {
    ...state.project,
    references: (state.project.references ?? []).map((reference) => reference.id === referenceId ? { ...reference, visible: !reference.visible } : reference),
  })),

  updateGlyphMetrics: (glyphName, metrics) => {
    set((state) => {
      const glyph = state.project.glyphs[glyphName]
      if (!glyph) return state
      return withHistory(state, {
          ...state.project,
          glyphs: {
            ...state.project.glyphs,
            [glyphName]: { ...glyph, metrics: { ...glyph.metrics, ...metrics } },
          },
      })
    })
  },

  undo: () => set((state) => {
    const previous = state.past.at(-1)
    if (!previous) return state
    return {
      project: previous,
      past: state.past.slice(0, -1),
      future: [state.project, ...state.future].slice(0, HISTORY_LIMIT),
    }
  }),

  redo: () => set((state) => {
    const next = state.future[0]
    if (!next) return state
    return {
      project: next,
      past: [...state.past, state.project].slice(-HISTORY_LIMIT),
      future: state.future.slice(1),
    }
  }),

  loadProject: (project) => set({ project: normalizeFontProject(project), past: [], future: [] }),
}))

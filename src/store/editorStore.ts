import { create } from 'zustand'
import type { GlyphPath } from '../geometry/Path'

export type ToolId =
  | 'select'
  | 'node'
  | 'pen'
  | 'add-node'
  | 'delete-node'
  | 'scissors'
  | 'knife'
  | 'brush'
  | 'shape'
  | 'fill'
  | 'hand'
  | 'zoom'

interface EditorState {
  selectedTool: ToolId
  editingGlyph: string
  selectedNodeIds: string[]
  selectedPathIds: string[]
  zoom: number
  camera: { x: number; y: number }
  clipboard: GlyphPath[]
  hiddenPathIds: string[]
  setTool: (tool: ToolId) => void
  setEditingGlyph: (glyphName: string) => void
  setSelectedNodeIds: (ids: string[]) => void
  setSelectedPathIds: (ids: string[]) => void
  setZoom: (zoom: number) => void
  setCamera: (camera: { x: number; y: number }) => void
  setClipboard: (paths: GlyphPath[]) => void
  togglePathVisibility: (pathId: string) => void
}

export const useEditorStore = create<EditorState>((set) => ({
  selectedTool: 'select',
  editingGlyph: 'A',
  selectedNodeIds: [],
  selectedPathIds: [],
  zoom: 1,
  camera: { x: 0, y: 0 },
  clipboard: [],
  hiddenPathIds: [],
  setTool: (tool) => set({ selectedTool: tool, selectedNodeIds: [], selectedPathIds: [] }),
  setEditingGlyph: (glyphName) => set({ editingGlyph: glyphName, selectedNodeIds: [], selectedPathIds: [], hiddenPathIds: [] }),
  setSelectedNodeIds: (ids) => set({ selectedNodeIds: ids }),
  setSelectedPathIds: (ids) => set({ selectedPathIds: ids }),
  setZoom: (zoom) => set({ zoom }),
  setCamera: (camera) => set({ camera }),
  setClipboard: (clipboard) => set({ clipboard }),
  togglePathVisibility: (pathId) => set((state) => ({
    hiddenPathIds: state.hiddenPathIds.includes(pathId)
      ? state.hiddenPathIds.filter((id) => id !== pathId)
      : [...state.hiddenPathIds, pathId],
  })),
}))

import { create } from 'zustand'

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
  zoom: number
  camera: { x: number; y: number }
  setTool: (tool: ToolId) => void
  setEditingGlyph: (glyphName: string) => void
  setSelectedNodeIds: (ids: string[]) => void
  setZoom: (zoom: number) => void
  setCamera: (camera: { x: number; y: number }) => void
}

export const useEditorStore = create<EditorState>((set) => ({
  selectedTool: 'select',
  editingGlyph: 'A',
  selectedNodeIds: [],
  zoom: 1,
  camera: { x: 0, y: 0 },
  setTool: (tool) => set({ selectedTool: tool, selectedNodeIds: [] }),
  setEditingGlyph: (glyphName) => set({ editingGlyph: glyphName, selectedNodeIds: [] }),
  setSelectedNodeIds: (ids) => set({ selectedNodeIds: ids }),
  setZoom: (zoom) => set({ zoom }),
  setCamera: (camera) => set({ camera }),
}))

import { useEditorStore, type ToolId } from '../store/editorStore'

const TOOLS: { id: ToolId; label: string; shortcut: string }[] = [
  { id: 'select', label: 'Selection', shortcut: 'V' },
  { id: 'node', label: 'Node', shortcut: 'A' },
  { id: 'pen', label: 'Pen', shortcut: 'P' },
  { id: 'add-node', label: 'Add Node', shortcut: '+' },
  { id: 'delete-node', label: 'Delete Node', shortcut: '-' },
  { id: 'scissors', label: 'Scissors', shortcut: 'C' },
  { id: 'knife', label: 'Knife', shortcut: 'K' },
  { id: 'brush', label: 'Brush', shortcut: 'B' },
  { id: 'shape', label: 'Shape', shortcut: 'S' },
  { id: 'fill', label: 'Fill', shortcut: 'F' },
  { id: 'hand', label: 'Hand', shortcut: 'H' },
  { id: 'zoom', label: 'Zoom', shortcut: 'Z' },
]

export function Toolbar() {
  const selectedTool = useEditorStore((s) => s.selectedTool)
  const setTool = useEditorStore((s) => s.setTool)

  return (
    <div className="toolbar">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          className={t.id === selectedTool ? 'tool-btn active' : 'tool-btn'}
          title={`${t.label} (${t.shortcut})`}
          onClick={() => setTool(t.id)}
        >
          {t.shortcut}
        </button>
      ))}
    </div>
  )
}

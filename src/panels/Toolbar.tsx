import { useEditorStore, type ToolId } from '../store/editorStore'
import {
  IconSelect,
  IconPen,
  IconNode,
  IconRectangle,
  IconBrush,
  IconEraser,
  IconScissors,
  IconText,
  IconZoom,
  IconHand,
  IconMore,
} from './icons'

const TOOLS: { id: ToolId; label: string; shortcut: string; Icon: typeof IconSelect }[] = [
  { id: 'select', label: 'Seleção', shortcut: 'V', Icon: IconSelect },
  { id: 'pen', label: 'Caneta', shortcut: 'P', Icon: IconPen },
  { id: 'node', label: 'Nó', shortcut: 'A', Icon: IconNode },
  { id: 'shape', label: 'Retângulo', shortcut: 'S', Icon: IconRectangle },
  { id: 'brush', label: 'Pincel', shortcut: 'B', Icon: IconBrush },
  { id: 'delete-node', label: 'Borracha', shortcut: 'E', Icon: IconEraser },
  { id: 'scissors', label: 'Tesoura', shortcut: 'C', Icon: IconScissors },
  { id: 'fill', label: 'Texto', shortcut: 'T', Icon: IconText },
  { id: 'zoom', label: 'Zoom', shortcut: 'Z', Icon: IconZoom },
  { id: 'hand', label: 'Mão', shortcut: 'H', Icon: IconHand },
]

export function Toolbar() {
  const selectedTool = useEditorStore((s) => s.selectedTool)
  const setTool = useEditorStore((s) => s.setTool)

  return (
    <div className="toolbar-floating">
      {TOOLS.map(({ id, label, shortcut, Icon }) => (
        <button
          key={id}
          className={id === selectedTool ? 'tool-btn active' : 'tool-btn'}
          title={`${label} (${shortcut})`}
          onClick={() => setTool(id)}
        >
          <Icon />
        </button>
      ))}
      <div className="tool-divider" />
      <button className="tool-btn" title="Mais ferramentas">
        <IconMore />
      </button>
    </div>
  )
}

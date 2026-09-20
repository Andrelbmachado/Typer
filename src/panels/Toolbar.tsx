import { useEffect, useRef, useState } from 'react'
import { GripHorizontal, Hand, MousePointer2, PaintBucket, PenTool, PencilLine, Scissors, Square, Trash2, ZoomIn } from 'lucide-react'
import { useEditorStore, type ToolId } from '../store/editorStore'

const TOOLS: { id: ToolId; label: string; shortcut: string; Icon: typeof MousePointer2 }[] = [
  { id: 'select', label: 'Selecionar', shortcut: 'V', Icon: MousePointer2 },
  { id: 'pen', label: 'Caneta', shortcut: 'P', Icon: PenTool },
  { id: 'node', label: 'Editar nós', shortcut: 'A', Icon: PencilLine },
  { id: 'shape', label: 'Retângulo', shortcut: 'S', Icon: Square },
  { id: 'brush', label: 'Pincel livre', shortcut: 'B', Icon: PencilLine },
  { id: 'delete-node', label: 'Excluir nó', shortcut: 'E', Icon: Trash2 },
  { id: 'scissors', label: 'Abrir contorno', shortcut: 'C', Icon: Scissors },
  { id: 'fill', label: 'Inverter contorno', shortcut: 'T', Icon: PaintBucket },
  { id: 'zoom', label: 'Zoom', shortcut: 'Z', Icon: ZoomIn },
  { id: 'hand', label: 'Mover canvas', shortcut: 'H', Icon: Hand },
]

export function Toolbar() {
  const selectedTool = useEditorStore((s) => s.selectedTool)
  const setTool = useEditorStore((s) => s.setTool)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null)

  useEffect(() => {
    const shortcuts: Record<string, ToolId> = {
      v: 'select', p: 'pen', a: 'node', s: 'shape', b: 'brush', e: 'delete-node',
      c: 'scissors', t: 'fill', z: 'zoom', h: 'hand',
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.target instanceof HTMLInputElement) return
      const tool = shortcuts[event.key.toLowerCase()]
      if (tool) setTool(tool)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setTool])

  function startMove(event: React.PointerEvent<HTMLButtonElement>) {
    const toolbar = event.currentTarget.closest('.toolbar-floating') as HTMLDivElement | null
    const canvas = toolbar?.closest('.canvas-row') as HTMLElement | null
    if (!toolbar || !canvas || event.button !== 0) return
    const toolbarRect = toolbar.getBoundingClientRect()
    dragRef.current = { pointerId: event.pointerId, offsetX: event.clientX - toolbarRect.left, offsetY: event.clientY - toolbarRect.top }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function moveToolbar(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    const toolbar = event.currentTarget.closest('.toolbar-floating') as HTMLDivElement | null
    const canvas = toolbar?.closest('.canvas-row') as HTMLElement | null
    if (!drag || drag.pointerId !== event.pointerId || !toolbar || !canvas) return
    const bounds = canvas.getBoundingClientRect()
    const left = Math.max(8, Math.min(bounds.width - toolbar.offsetWidth - 8, event.clientX - bounds.left - drag.offsetX))
    const top = Math.max(8, Math.min(bounds.height - toolbar.offsetHeight - 8, event.clientY - bounds.top - drag.offsetY))
    setPosition({ left, top })
  }

  function finishMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <div className="toolbar-floating" style={position ? { left: position.left, top: position.top, transform: 'none' } : undefined}>
      {TOOLS.map(({ id, label, shortcut, Icon }) => (
        <button
          key={id}
          className={id === selectedTool ? 'tool-btn active' : 'tool-btn'}
          title={`${label} (${shortcut})`}
          aria-label={`${label} (${shortcut})`}
          onClick={() => setTool(id)}
        >
          <Icon />
        </button>
      ))}
      <button
        className="toolbar-drag-handle"
        type="button"
        aria-label="Mover barra de ferramentas"
        title="Arraste para mover a barra"
        onPointerDown={startMove}
        onPointerMove={moveToolbar}
        onPointerUp={finishMove}
        onPointerCancel={finishMove}
      ><GripHorizontal size={17} /></button>
    </div>
  )
}

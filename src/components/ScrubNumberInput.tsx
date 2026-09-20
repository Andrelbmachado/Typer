import { useRef, type PointerEvent } from 'react'

interface ScrubNumberInputProps {
  value: number
  onChange?: (value: number) => void
  label: string
  step?: number
  min?: number
  max?: number
  readOnly?: boolean
}

function clamp(value: number, min?: number, max?: number) {
  return Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min ?? Number.NEGATIVE_INFINITY, value))
}

export function ScrubNumberInput({ value, onChange, label, step = 1, min, max, readOnly = false }: ScrubNumberInputProps) {
  const dragRef = useRef<{ pointerId: number; startX: number; startValue: number; lastValue: number; moved: boolean } | null>(null)

  function handlePointerDown(event: PointerEvent<HTMLInputElement>) {
    if (readOnly || event.button !== 0) return
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startValue: value, lastValue: value, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: PointerEvent<HTMLInputElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId || !onChange) return
    const distance = event.clientX - drag.startX
    if (!drag.moved && Math.abs(distance) < 3) return
    drag.moved = true
    const next = clamp(drag.startValue + Math.round(distance / 2) * step, min, max)
    if (next === drag.lastValue) return
    drag.lastValue = next
    onChange(next)
  }

  function finishPointer(event: PointerEvent<HTMLInputElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (drag.moved) event.currentTarget.blur()
    dragRef.current = null
  }

  return (
    <input
      className={readOnly ? undefined : 'scrub-number'}
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      readOnly={readOnly}
      aria-label={label}
      title={readOnly ? label : `${label}: arraste horizontalmente para ajustar ou clique para digitar`}
      onChange={(event) => onChange?.(clamp(Number(event.target.value), min, max))}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
    />
  )
}

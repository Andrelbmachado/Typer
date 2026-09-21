import type { Point } from './Node'

const QUARTER_CIRCLE_HANDLE = 0.5522847498

/** Snap a vector to Illustrator-style 45° increments (0°, 45°, 90°…). */
export function snapVectorToAngle(vector: Point, increment = Math.PI / 4): Point {
  const length = Math.hypot(vector.x, vector.y)
  if (!length) return vector
  const angle = Math.atan2(vector.y, vector.x)
  const snapped = Math.round(angle / increment) * increment
  return { x: Math.round(Math.cos(snapped) * length), y: Math.round(Math.sin(snapped) * length) }
}

export function snapPointFromAnchor(anchor: Point, point: Point): Point {
  const vector = snapVectorToAngle({ x: point.x - anchor.x, y: point.y - anchor.y })
  return { x: Math.round(anchor.x + vector.x), y: Math.round(anchor.y + vector.y) }
}

export function quarterCircleHandle(radius: number) {
  return radius * QUARTER_CIRCLE_HANDLE
}

export interface ArcAnchor extends Point {
  handleIn?: Point
  handleOut?: Point
}

/**
 * A continuous cubic Bézier arc. The caller can concatenate returned anchors:
 * shared endpoints retain the incoming and outgoing handles of neighbouring arcs.
 */
export function circularArc(center: Point, radius: number, startAngle: number, endAngle: number): ArcAnchor[] {
  const count = Math.max(1, Math.ceil(Math.abs(endAngle - startAngle) / (Math.PI / 2)))
  const step = (endAngle - startAngle) / count
  const control = (4 / 3) * Math.tan(step / 4)
  return Array.from({ length: count + 1 }, (_, index) => {
    const angle = startAngle + step * index
    const x = center.x + radius * Math.cos(angle)
    const y = center.y + radius * Math.sin(angle)
    const dx = -radius * Math.sin(angle) * control
    const dy = radius * Math.cos(angle) * control
    return { x: Math.round(x), y: Math.round(y), handleIn: { x: Math.round(x - dx), y: Math.round(y - dy) }, handleOut: { x: Math.round(x + dx), y: Math.round(y + dy) } }
  })
}

export function joinArcs(...arcs: ArcAnchor[][]): ArcAnchor[] {
  return arcs.reduce<ArcAnchor[]>((joined, arc) => {
    if (!joined.length) return arc.map((node) => ({ ...node }))
    const tail = joined.at(-1)!
    const head = arc[0]
    if (Math.hypot(tail.x - head.x, tail.y - head.y) < 0.01) {
      tail.handleOut = head.handleOut
      return [...joined, ...arc.slice(1).map((node) => ({ ...node }))]
    }
    return [...joined, ...arc.map((node) => ({ ...node }))]
  }, [])
}

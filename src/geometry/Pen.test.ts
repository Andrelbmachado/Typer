import { describe, expect, it } from 'vitest'
import { circularArc, joinArcs, quarterCircleHandle, snapPointFromAnchor } from './Pen'

describe('pen geometry', () => {
  it('snaps a dragged handle to an exact 90-degree direction', () => {
    expect(snapPointFromAnchor({ x: 100, y: 100 }, { x: 109, y: 201 })).toEqual({ x: 100, y: 201 })
  })

  it('builds a half-circle from two continuous cubic Bézier segments', () => {
    const arc = circularArc({ x: 300, y: 300 }, 100, Math.PI, 0)
    expect(arc).toHaveLength(3)
    expect(arc[0].handleOut).toBeDefined()
    expect(arc[1].handleIn).toBeDefined()
    expect(quarterCircleHandle(100)).toBeCloseTo(55.22847498)
  })

  it('keeps a shared anchor active when arcs are chained', () => {
    const first = circularArc({ x: 200, y: 400 }, 100, Math.PI, 0)
    const second = circularArc({ x: 400, y: 400 }, 100, Math.PI, 2 * Math.PI)
    expect(joinArcs(first, second)).toHaveLength(5)
  })
})

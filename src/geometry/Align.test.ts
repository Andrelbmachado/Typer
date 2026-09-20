import { describe, expect, it } from 'vitest'
import { alignSelectedNodes, alignSelectedPaths } from './Align'
import type { GlyphPath } from './Path'

function contour(id: string, x: number, y: number, width = 100, height = 100): GlyphPath {
  return {
    id,
    closed: true,
    nodes: [
      { id: `${id}-1`, x, y, type: 'smooth', handleIn: { x: x - 10, y }, handleOut: { x: x + 10, y } },
      { id: `${id}-2`, x: x + width, y, type: 'corner' },
      { id: `${id}-3`, x: x + width, y: y + height, type: 'corner' },
      { id: `${id}-4`, x, y: y + height, type: 'corner' },
    ],
  }
}

describe('alignment', () => {
  it('centers one contour in a 1000 × 1000 glyph frame without changing its dimensions', () => {
    const result = alignSelectedPaths([contour('a', 50, 20, 200, 300)], ['a'], 'center-h', { minX: 0, maxX: 1000, minY: -200, maxY: 800 })
    expect(result[0].nodes.map((node) => node.x)).toEqual([400, 600, 600, 400])
    expect(result[0].nodes[0].handleIn).toEqual({ x: 390, y: 20 })
  })

  it('aligns multiple contours to a common top without collapsing them', () => {
    const result = alignSelectedPaths([contour('a', 20, 0), contour('b', 250, 180)], ['a', 'b'], 'top', { minX: 0, maxX: 1000, minY: -200, maxY: 800 })
    expect(Math.max(...result[0].nodes.map((node) => node.y))).toBe(280)
    expect(Math.max(...result[1].nodes.map((node) => node.y))).toBe(280)
    expect(Math.max(...result[0].nodes.map((node) => node.x)) - Math.min(...result[0].nodes.map((node) => node.x))).toBe(100)
  })

  it('moves a selected node and both handles by the same delta', () => {
    const paths = [contour('a', 10, 20)]
    const result = alignSelectedNodes(paths, ['a-1', 'a-2'], 'right')
    expect(result[0].nodes[0].x).toBe(110)
    expect(result[0].nodes[0].handleIn).toEqual({ x: 100, y: 20 })
    expect(result[0].nodes[0].handleOut).toEqual({ x: 120, y: 20 })
  })
})

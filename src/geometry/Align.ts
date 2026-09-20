import type { PathNode } from './Node'
import type { GlyphPath } from './Path'

export type AlignMode = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom'

export interface Bounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

function boundsForNodes(nodes: PathNode[]): Bounds {
  return nodes.reduce<Bounds>((bounds, node) => ({
    minX: Math.min(bounds.minX, node.x),
    maxX: Math.max(bounds.maxX, node.x),
    minY: Math.min(bounds.minY, node.y),
    maxY: Math.max(bounds.maxY, node.y),
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity })
}

function targetDelta(bounds: Bounds, target: Bounds, mode: AlignMode) {
  switch (mode) {
    case 'left': return { dx: target.minX - bounds.minX, dy: 0 }
    case 'center-h': return { dx: (target.minX + target.maxX - bounds.minX - bounds.maxX) / 2, dy: 0 }
    case 'right': return { dx: target.maxX - bounds.maxX, dy: 0 }
    case 'top': return { dx: 0, dy: target.maxY - bounds.maxY }
    case 'center-v': return { dx: 0, dy: (target.minY + target.maxY - bounds.minY - bounds.maxY) / 2 }
    case 'bottom': return { dx: 0, dy: target.minY - bounds.minY }
  }
}

export function translateNode(node: PathNode, dx: number, dy: number): PathNode {
  return {
    ...node,
    x: node.x + dx,
    y: node.y + dy,
    handleIn: node.handleIn && { x: node.handleIn.x + dx, y: node.handleIn.y + dy },
    handleOut: node.handleOut && { x: node.handleOut.x + dx, y: node.handleOut.y + dy },
  }
}

/** Align individual anchors while keeping every Bézier handle attached to its anchor. */
export function alignSelectedNodes(paths: GlyphPath[], nodeIds: string[], mode: AlignMode): GlyphPath[] {
  const selected = new Set(nodeIds)
  const nodes = paths.flatMap((path) => path.nodes.filter((node) => selected.has(node.id)))
  if (nodes.length < 2) return paths
  const target = boundsForNodes(nodes)

  return paths.map((path) => ({
    ...path,
    nodes: path.nodes.map((node) => {
      if (!selected.has(node.id)) return node
      const delta = targetDelta({ minX: node.x, maxX: node.x, minY: node.y, maxY: node.y }, target, mode)
      return translateNode(node, delta.dx, delta.dy)
    }),
  }))
}

/** Align selected contours as objects. A single contour uses the glyph frame as reference. */
export function alignSelectedPaths(paths: GlyphPath[], pathIds: string[], mode: AlignMode, glyphFrame: Bounds): GlyphPath[] {
  const selected = new Set(pathIds)
  const selectedPaths = paths.filter((path) => selected.has(path.id) && path.nodes.length > 0)
  if (selectedPaths.length === 0) return paths
  const selectionBounds = boundsForNodes(selectedPaths.flatMap((path) => path.nodes))
  const target = selectedPaths.length === 1 ? glyphFrame : selectionBounds

  return paths.map((path) => {
    if (!selected.has(path.id) || path.nodes.length === 0) return path
    const bounds = boundsForNodes(path.nodes)
    const delta = targetDelta(bounds, target, mode)
    return { ...path, nodes: path.nodes.map((node) => translateNode(node, delta.dx, delta.dy)) }
  })
}

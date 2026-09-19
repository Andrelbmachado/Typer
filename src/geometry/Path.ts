import type { PathNode } from './Node'

export interface GlyphPath {
  id: string
  closed: boolean
  nodes: PathNode[]
}

export function createPath(closed = false): GlyphPath {
  return { id: crypto.randomUUID(), closed, nodes: [] }
}

/** SVG path `d` string for a path's nodes, using cubic Bézier segments where handles exist. */
export function pathToSvgD(path: GlyphPath): string {
  if (path.nodes.length === 0) return ''
  const [first, ...rest] = path.nodes
  let d = `M ${first.x} ${first.y}`

  const segment = (from: PathNode, to: PathNode) => {
    const c1 = from.handleOut ?? { x: from.x, y: from.y }
    const c2 = to.handleIn ?? { x: to.x, y: to.y }
    if (!from.handleOut && !to.handleIn) {
      return `L ${to.x} ${to.y}`
    }
    return `C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`
  }

  let prev = first
  for (const n of rest) {
    d += ` ${segment(prev, n)}`
    prev = n
  }
  if (path.closed) {
    d += ` ${segment(prev, first)} Z`
  }
  return d
}

/** Combined `d` string for all closed contours, so nested counters render as holes (nonzero fill rule). */
export function pathsToSvgD(paths: GlyphPath[]): string {
  return paths
    .filter((p) => p.closed)
    .map(pathToSvgD)
    .join(' ')
}

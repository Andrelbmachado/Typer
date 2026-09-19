import type { GlyphPath } from './Path'

export type AlignMode = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom'

function selectedBounds(paths: GlyphPath[], nodeIds: Set<string>) {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const p of paths) {
    for (const n of p.nodes) {
      if (!nodeIds.has(n.id)) continue
      minX = Math.min(minX, n.x)
      maxX = Math.max(maxX, n.x)
      minY = Math.min(minY, n.y)
      maxY = Math.max(maxY, n.y)
    }
  }
  return { minX, maxX, minY, maxY }
}

/** Aligns selected nodes to the bounding box of the whole selection. */
export function alignSelectedNodes(paths: GlyphPath[], nodeIds: string[], mode: AlignMode): GlyphPath[] {
  const idSet = new Set(nodeIds)
  if (idSet.size < 2) return paths
  const { minX, maxX, minY, maxY } = selectedBounds(paths, idSet)
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  return paths.map((p) => ({
    ...p,
    nodes: p.nodes.map((n) => {
      if (!idSet.has(n.id)) return n
      switch (mode) {
        case 'left':
          return { ...n, x: minX }
        case 'center-h':
          return { ...n, x: centerX }
        case 'right':
          return { ...n, x: maxX }
        case 'top':
          return { ...n, y: maxY }
        case 'center-v':
          return { ...n, y: centerY }
        case 'bottom':
          return { ...n, y: minY }
        default:
          return n
      }
    }),
  }))
}

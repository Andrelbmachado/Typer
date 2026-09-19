export type NodeType = 'corner' | 'smooth' | 'symmetric'

export interface Point {
  x: number
  y: number
}

export interface PathNode {
  id: string
  x: number
  y: number
  type: NodeType
  handleIn?: Point
  handleOut?: Point
}

export function createNode(x: number, y: number, type: NodeType = 'corner'): PathNode {
  return { id: crypto.randomUUID(), x, y, type }
}

type Point = { x: number; y: number }
type NodeInput = Point & { type?: 'corner' | 'smooth' | 'symmetric'; handleIn?: Point; handleOut?: Point }
type PathInput = { closed: boolean; nodes: NodeInput[] }
type GlyphInput = {
  name: string
  unicode: number
  metrics: { advanceWidth: number; leftBearing: number; rightBearing: number }
  paths: PathInput[]
}

function rect(x: number, y: number, width: number, height: number, reverse = false): PathInput {
  const nodes: NodeInput[] = [
    { x, y }, { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height },
  ]
  return { closed: true, nodes: reverse ? nodes.reverse() : nodes }
}

function polygon(points: Point[]): PathInput {
  return { closed: true, nodes: points.map((point) => ({ ...point, type: 'corner' })) }
}

function ellipse(cx: number, cy: number, rx: number, ry: number, reverse = false): PathInput {
  const k = 0.5522847498
  const nodes: NodeInput[] = [
    { x: cx + rx, y: cy, type: 'smooth', handleIn: { x: cx + rx, y: cy - k * ry }, handleOut: { x: cx + rx, y: cy + k * ry } },
    { x: cx, y: cy + ry, type: 'smooth', handleIn: { x: cx + k * rx, y: cy + ry }, handleOut: { x: cx - k * rx, y: cy + ry } },
    { x: cx - rx, y: cy, type: 'smooth', handleIn: { x: cx - rx, y: cy + k * ry }, handleOut: { x: cx - rx, y: cy - k * ry } },
    { x: cx, y: cy - ry, type: 'smooth', handleIn: { x: cx - k * rx, y: cy - ry }, handleOut: { x: cx + k * rx, y: cy - ry } },
  ]
  if (!reverse) return { closed: true, nodes }
  return { closed: true, nodes: nodes.reverse().map((node) => ({ ...node, handleIn: node.handleOut, handleOut: node.handleIn })) }
}

function glyph(name: string, advanceWidth: number, paths: PathInput[]): GlyphInput {
  return { name, unicode: name.codePointAt(0)!, metrics: { advanceWidth, leftBearing: 54, rightBearing: 54 }, paths }
}

function neutralE(): PathInput {
  return { closed: true, nodes: [
    { x: 480, y: 90, type: 'smooth', handleOut: { x: 420, y: 35 } },
    { x: 280, y: 0, type: 'smooth', handleIn: { x: 360, y: 0 }, handleOut: { x: 150, y: 0 } },
    { x: 42, y: 260, type: 'smooth', handleIn: { x: 42, y: 130 }, handleOut: { x: 42, y: 390 } },
    { x: 280, y: 520, type: 'smooth', handleIn: { x: 150, y: 520 }, handleOut: { x: 370, y: 520 } },
    { x: 500, y: 400, type: 'smooth', handleIn: { x: 490, y: 470 } },
    { x: 520, y: 230 }, { x: 142, y: 230 }, { x: 160, y: 150 },
    { x: 280, y: 80, type: 'smooth', handleIn: { x: 210, y: 80 }, handleOut: { x: 350, y: 80 } },
    { x: 420, y: 140 },
  ] }
}

function neutralC(): PathInput {
  return { closed: true, nodes: [
    { x: 474, y: 420, type: 'smooth', handleOut: { x: 420, y: 478 } },
    { x: 280, y: 522, type: 'smooth', handleIn: { x: 365, y: 522 }, handleOut: { x: 150, y: 522 } },
    { x: 42, y: 260, type: 'smooth', handleIn: { x: 42, y: 390 }, handleOut: { x: 42, y: 130 } },
    { x: 280, y: -2, type: 'smooth', handleIn: { x: 150, y: -2 }, handleOut: { x: 365, y: -2 } },
    { x: 474, y: 100, type: 'smooth', handleIn: { x: 450, y: 48 } },
    { x: 400, y: 176, type: 'smooth', handleOut: { x: 365, y: 122 } },
    { x: 280, y: 90, type: 'smooth', handleIn: { x: 338, y: 90 }, handleOut: { x: 205, y: 90 } },
    { x: 136, y: 260, type: 'smooth', handleIn: { x: 136, y: 175 }, handleOut: { x: 136, y: 345 } },
    { x: 280, y: 430, type: 'smooth', handleIn: { x: 205, y: 430 }, handleOut: { x: 338, y: 430 } },
    { x: 400, y: 346, type: 'smooth', handleIn: { x: 385, y: 392 } },
  ] }
}

/** Original neutral grotesk sample used to prove the MCP → project → TTF pipeline. */
export function neutralHelveticaGlyphs(): GlyphInput[] {
  return [
    glyph('H', 690, [rect(62, 0, 94, 700), rect(534, 0, 94, 700), rect(156, 304, 378, 92)]),
    glyph('e', 578, [neutralE()]),
    glyph('l', 254, [rect(78, 0, 94, 730)]),
    glyph('v', 568, [polygon([{ x: 38, y: 520 }, { x: 142, y: 520 }, { x: 284, y: 108 }, { x: 426, y: 520 }, { x: 530, y: 520 }, { x: 336, y: 0 }, { x: 232, y: 0 }])]),
    glyph('t', 390, [rect(148, 0, 94, 690), rect(48, 430, 292, 90), rect(242, 0, 102, 88)]),
    glyph('i', 246, [rect(76, 0, 94, 520), rect(76, 628, 94, 96)]),
    glyph('c', 554, [neutralC()]),
    glyph('a', 584, [ellipse(274, 252, 226, 258), ellipse(274, 252, 132, 168, true), rect(448, 0, 94, 520)]),
  ]
}

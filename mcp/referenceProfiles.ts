/**
 * Original, parametric reference profiles. A profile describes visual intent;
 * it never contains a traced source font or pixels from a reference image.
 */

export type Point = { x: number; y: number }
export type NodeInput = Point & {
  type: 'corner' | 'smooth' | 'symmetric'
  handleIn?: Point
  handleOut?: Point
}
export type PathInput = { closed: boolean; nodes: NodeInput[] }
export type ReferenceGlyphInput = {
  name: string
  unicode: number
  metrics: { advanceWidth: number; leftBearing: number; rightBearing: number }
  paths: PathInput[]
}

export const REFERENCE_NEUTRAL_REGULAR_ID = 'reference-neutral-regular' as const
export const REFERENCE_NEUTRAL_REGULAR_ABC_ID = 'reference-neutral-regular-abc' as const
export const REFERENCE_NEUTRAL_REGULAR_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890$?&%@!#*()=-.,:;'
export const REFERENCE_NEUTRAL_REGULAR_ABC_CHARACTERS = 'ABC'

export type ReferenceProfileId = typeof REFERENCE_NEUTRAL_REGULAR_ID | typeof REFERENCE_NEUTRAL_REGULAR_ABC_ID

export interface ReferenceStyleProfile {
  id: ReferenceProfileId
  label: string
  description: string
  mode: 'style-direction'
  characters: string
  metrics: {
    unitsPerEm: 1000
    ascender: 800
    descender: -200
    capHeight: 700
    xHeight: 520
    overshoot: 12
  }
  appearance: {
    weight: 'regular'
    contrast: 'low'
    terminals: 'square'
    curveModel: 'cubic-bezier'
  }
  construction: {
    canvas: { width: 1000; height: 1000; axisX: 300; baseline: 0 }
    study: 'ABC-first'
    notes: string[]
  }
}

export const REFERENCE_STYLE_PROFILES: Record<ReferenceProfileId, ReferenceStyleProfile> = {
  [REFERENCE_NEUTRAL_REGULAR_ABC_ID]: {
    id: REFERENCE_NEUTRAL_REGULAR_ABC_ID,
    label: 'Reference Neutral Regular — ABC study',
    description: 'Estudo tipográfico original restrito a A, B e C. Serve para aprovar curvas Bézier, vértices, eixos e espaçamento antes de ampliar a família.',
    mode: 'style-direction',
    characters: REFERENCE_NEUTRAL_REGULAR_ABC_CHARACTERS,
    metrics: { unitsPerEm: 1000, ascender: 800, descender: -200, capHeight: 700, xHeight: 520, overshoot: 12 },
    appearance: { weight: 'regular', contrast: 'low', terminals: 'square', curveModel: 'cubic-bezier' },
    construction: { canvas: { width: 1000, height: 1000, axisX: 300, baseline: 0 }, study: 'ABC-first', notes: ['A usa vértices simétricos em torno do eixo X=300.', 'B usa duas curvas cúbicas de bojo e contraformas.', 'C usa um arco Bézier contínuo, sem barras segmentadas.'] },
  },
  [REFERENCE_NEUTRAL_REGULAR_ID]: {
    id: REFERENCE_NEUTRAL_REGULAR_ID,
    label: 'Reference Neutral Regular',
    description: 'Sans original regular de baixo contraste, curvas contínuas e terminais retos. A imagem orienta a categoria visual, sem rastrear seus contornos.',
    mode: 'style-direction',
    characters: REFERENCE_NEUTRAL_REGULAR_CHARACTERS,
    metrics: { unitsPerEm: 1000, ascender: 800, descender: -200, capHeight: 700, xHeight: 520, overshoot: 12 },
    appearance: { weight: 'regular', contrast: 'low', terminals: 'square', curveModel: 'cubic-bezier' },
    construction: { canvas: { width: 1000, height: 1000, axisX: 300, baseline: 0 }, study: 'ABC-first', notes: ['A ampliação para outros glifos só deve ocorrer após aprovar o estudo ABC.', 'Preserve eixos, âncoras e alças quando mover ou rotacionar uma construção.'] },
  },
}

export function getReferenceStyleProfile(id: string): ReferenceStyleProfile | undefined {
  return REFERENCE_STYLE_PROFILES[id as ReferenceProfileId]
}

const cap = 700
const xHeight = 520
const capStem = 82
const lowerStem = 76
const bearing = 54
const tau = Math.PI * 2

function node(x: number, y: number, type: NodeInput['type'] = 'corner', handleIn?: Point, handleOut?: Point): NodeInput {
  return { x, y, type, ...(handleIn ? { handleIn } : {}), ...(handleOut ? { handleOut } : {}) }
}

function rect(x: number, y: number, width: number, height: number, reverse = false): PathInput {
  const nodes = [node(x, y), node(x + width, y), node(x + width, y + height), node(x, y + height)]
  return { closed: true, nodes: reverse ? nodes.reverse() : nodes }
}

function roundedRect(x: number, y: number, width: number, height: number, radius: number): PathInput {
  const r = Math.min(radius, width / 2, height / 2)
  const k = 0.5522847498
  return {
    closed: true,
    nodes: [
      node(x + r, y, 'corner', { x: x + r - k * r, y }),
      node(x + width - r, y, 'corner', undefined, { x: x + width - r + k * r, y }),
      node(x + width, y + r, 'corner', { x: x + width, y: y + r - k * r }),
      node(x + width, y + height - r, 'corner', undefined, { x: x + width, y: y + height - r + k * r }),
      node(x + width - r, y + height, 'corner', { x: x + width - r + k * r, y: y + height }),
      node(x + r, y + height, 'corner', undefined, { x: x + r - k * r, y: y + height }),
      node(x, y + height - r, 'corner', { x, y: y + height - r + k * r }),
      node(x, y + r, 'corner', undefined, { x, y: y + r - k * r }),
    ],
  }
}

function polygon(points: Point[], reverse = false): PathInput {
  const nodes = points.map((point) => node(point.x, point.y))
  return { closed: true, nodes: reverse ? nodes.reverse() : nodes }
}

function ellipse(cx: number, cy: number, rx: number, ry: number, reverse = false): PathInput {
  const k = 0.5522847498
  const nodes = [
    node(cx + rx, cy, 'smooth', { x: cx + rx, y: cy - k * ry }, { x: cx + rx, y: cy + k * ry }),
    node(cx, cy + ry, 'smooth', { x: cx + k * rx, y: cy + ry }, { x: cx - k * rx, y: cy + ry }),
    node(cx - rx, cy, 'smooth', { x: cx - rx, y: cy + k * ry }, { x: cx - rx, y: cy - k * ry }),
    node(cx, cy - ry, 'smooth', { x: cx - k * rx, y: cy - ry }, { x: cx + k * rx, y: cy - ry }),
  ]
  return reverse
    ? { closed: true, nodes: nodes.reverse().map((item) => ({ ...item, handleIn: item.handleOut, handleOut: item.handleIn })) }
    : { closed: true, nodes }
}

function ring(cx: number, cy: number, rx: number, ry: number, thickness: number): PathInput[] {
  return [ellipse(cx, cy, rx, ry), ellipse(cx, cy, rx - thickness, ry - thickness, true)]
}

/** Cubic Bézier nodes along an elliptical arc, valid in either direction. */
function arcNodes(cx: number, cy: number, rx: number, ry: number, start: number, end: number): NodeInput[] {
  const count = Math.max(1, Math.ceil(Math.abs(end - start) / (Math.PI / 2)))
  const step = (end - start) / count
  const control = (4 / 3) * Math.tan(step / 4)
  return Array.from({ length: count + 1 }, (_, index) => {
    const angle = start + index * step
    const x = cx + rx * Math.cos(angle)
    const y = cy + ry * Math.sin(angle)
    const dx = -rx * Math.sin(angle) * control
    const dy = ry * Math.cos(angle) * control
    return node(x, y, 'smooth', { x: x - dx, y: y - dy }, { x: x + dx, y: y + dy })
  })
}

/** A single closed outline following a curved band. */
function arcTube(cx: number, cy: number, outerRx: number, outerRy: number, innerRx: number, innerRy: number, start: number, end: number): PathInput {
  const outer = arcNodes(cx, cy, outerRx, outerRy, start, end)
  const inner = arcNodes(cx, cy, innerRx, innerRy, end, start)
  outer[0].handleIn = undefined
  outer.at(-1)!.handleOut = undefined
  inner[0].handleIn = undefined
  inner.at(-1)!.handleOut = undefined
  return { closed: true, nodes: [...outer, ...inner] }
}

function smoothContour(points: Point[], tension = 0.17): PathInput {
  const nodes = points.map((point, index) => {
    const previous = points[(index + points.length - 1) % points.length]
    const next = points[(index + 1) % points.length]
    const dx = (next.x - previous.x) * tension
    const dy = (next.y - previous.y) * tension
    return node(point.x, point.y, 'smooth', { x: point.x - dx, y: point.y - dy }, { x: point.x + dx, y: point.y + dy })
  })
  return { closed: true, nodes }
}

/** A joined polygonal stroke for straight construction lines. */
function polyStroke(points: Point[], weight = capStem): PathInput {
  const half = weight / 2
  const offsets = points.map((_, index) => {
    const previous = points[Math.max(0, index - 1)]
    const next = points[Math.min(points.length - 1, index + 1)]
    const length = Math.hypot(next.x - previous.x, next.y - previous.y) || 1
    return { x: -((next.y - previous.y) / length) * half, y: ((next.x - previous.x) / length) * half }
  })
  const left = points.map((point, index) => ({ x: point.x + offsets[index].x, y: point.y + offsets[index].y }))
  const right = points.map((point, index) => ({ x: point.x - offsets[index].x, y: point.y - offsets[index].y })).reverse()
  return polygon([...left, ...right])
}

function rightBowl(cx: number, cy: number, rx: number, ry: number, thickness: number): PathInput {
  return arcTube(cx, cy, rx, ry, rx - thickness, ry - thickness, Math.PI / 2, -Math.PI / 2)
}

function cShape(cx: number, cy: number, rx: number, ry: number, thickness: number): PathInput {
  return arcTube(cx, cy, rx, ry, rx - thickness, ry - thickness, 0.68, tau - 0.68)
}

function uShape(left: number, right: number, top: number, bowlY: number, thickness: number): PathInput {
  const outerRx = (right - left) / 2
  const outerRy = bowlY
  const centerX = (left + right) / 2
  const outer = arcNodes(centerX, bowlY, outerRx, outerRy, Math.PI, tau)
  const inner = arcNodes(centerX, bowlY, outerRx - thickness, outerRy - thickness, 0, -Math.PI)
  outer[0].handleIn = undefined
  outer.at(-1)!.handleOut = undefined
  inner[0].handleIn = undefined
  inner.at(-1)!.handleOut = undefined
  return {
    closed: true,
    nodes: [node(left, top), ...outer, node(right, top), node(right - thickness, top), ...inner, node(left + thickness, top)],
  }
}

function sShape(width = 600, height = cap, weight = capStem): PathInput[] {
  const scaleX = width / 600
  const scaleY = height / 700
  const x = (value: number) => value * scaleX
  const y = (value: number) => value * scaleY
  const h = y(80)
  const vertical = y(270)
  const radius = Math.max(10, Math.min(weight / 3, h / 2))
  return [
    roundedRect(x(120), height - h, x(360), h, radius),
    roundedRect(x(80), height / 2, x(80), vertical, radius),
    roundedRect(x(120), height / 2 - h / 2, x(360), h, radius),
    roundedRect(x(440), h, x(80), vertical, radius),
    roundedRect(x(120), 0, x(360), h, radius),
  ]
}

function glyph(name: string, advanceWidth: number, paths: PathInput[]): ReferenceGlyphInput {
  return { name, unicode: name.codePointAt(0)!, metrics: { advanceWidth, leftBearing: bearing, rightBearing: bearing }, paths }
}

function uppercase(): Record<string, PathInput[]> {
  const l = 72
  const r = 528
  const m = 300
  const c = cap / 2
  return {
    A: [polyStroke([{ x: l, y: 0 }, { x: m, y: cap }]), polyStroke([{ x: m, y: cap }, { x: r, y: 0 }]), rect(164, 292, 272, capStem)],
    B: [rect(l, 0, capStem, cap), rightBowl(154, 525, 372, 175, capStem), rightBowl(154, 175, 372, 175, capStem)],
    C: [cShape(306, c, 234, 350, capStem)],
    D: [rect(l, 0, capStem, cap), rightBowl(150, c, 378, 350, capStem)],
    E: [rect(l, 0, capStem, cap), rect(l, cap - capStem, 434, capStem), rect(l, c - capStem / 2, 350, capStem), rect(l, 0, 434, capStem)],
    F: [rect(l, 0, capStem, cap), rect(l, cap - capStem, 434, capStem), rect(l, c - capStem / 2, 336, capStem)],
    G: [cShape(306, c, 234, 350, capStem), rect(298, c - capStem / 2, 222, capStem), rect(r - capStem, 0, capStem, c)],
    H: [rect(l, 0, capStem, cap), rect(r - capStem, 0, capStem, cap), rect(l, c - capStem / 2, r - l, capStem)],
    I: [rect(m - capStem / 2, 0, capStem, cap), rect(154, cap - capStem, 292, capStem), rect(154, 0, 292, capStem)],
    J: [rect(r - capStem, 150, capStem, cap - 150), uShape(96, r, 206, 154, capStem)],
    K: [rect(l, 0, capStem, cap), polyStroke([{ x: l + capStem / 2, y: c }, { x: r, y: cap }]), polyStroke([{ x: l + capStem / 2, y: c }, { x: r, y: 0 }])],
    L: [rect(l, 0, capStem, cap), rect(l, 0, 448, capStem)],
    M: [polygon([{ x: l, y: 0 }, { x: l, y: cap }, { x: l + capStem, y: cap }, { x: m, y: 300 }, { x: r - capStem, y: cap }, { x: r, y: cap }, { x: r, y: 0 }, { x: r - capStem, y: 0 }, { x: r - capStem, y: 518 }, { x: m + 45, y: 210 }, { x: m - 45, y: 210 }, { x: l + capStem, y: 518 }, { x: l + capStem, y: 0 }])],
    N: [rect(l, 0, capStem, cap), rect(r - capStem, 0, capStem, cap), polyStroke([{ x: l + capStem / 2, y: cap }, { x: r - capStem / 2, y: 0 }])],
    O: ring(m, c, 232, 350, capStem),
    P: [rect(l, 0, capStem, cap), rightBowl(152, 525, 374, 175, capStem)],
    Q: [...ring(m, c, 232, 350, capStem), polyStroke([{ x: 350, y: 180 }, { x: 548, y: -42 }])],
    R: [rect(l, 0, capStem, cap), rightBowl(152, 525, 374, 175, capStem), polyStroke([{ x: 294, y: c }, { x: r, y: 0 }])],
    S: sShape(),
    T: [rect(86, cap - capStem, 428, capStem), rect(m - capStem / 2, 0, capStem, cap)],
    U: [uShape(l, r, cap, 210, capStem)],
    V: [polyStroke([{ x: l, y: cap }, { x: m, y: 0 }, { x: r, y: cap }])],
    W: [polygon([{ x: l, y: cap }, { x: l + capStem, y: cap }, { x: 196, y: 136 }, { x: 254, y: 390 }, { x: 346, y: 390 }, { x: 404, y: 136 }, { x: r - capStem, y: cap }, { x: r, y: cap }, { x: 434, y: 0 }, { x: 358, y: 0 }, { x: m, y: 270 }, { x: 242, y: 0 }, { x: 166, y: 0 }])],
    X: [polyStroke([{ x: l, y: 0 }, { x: r, y: cap }]), polyStroke([{ x: l, y: cap }, { x: r, y: 0 }])],
    Y: [polyStroke([{ x: l, y: cap }, { x: m, y: c }, { x: r, y: cap }]), rect(m - capStem / 2, 0, capStem, c)],
    Z: [rect(l, cap - capStem, r - l, capStem), rect(l, 0, r - l, capStem), polyStroke([{ x: r, y: cap - capStem / 2 }, { x: l, y: capStem / 2 }])],
  }
}

function lowercase(): Record<string, PathInput[]> {
  const l = 86
  const r = 500
  const m = 292
  const bowl = 250
  return {
    a: [...ring(270, bowl, 194, bowl, lowerStem), rect(r - lowerStem, 0, lowerStem, xHeight)],
    b: [rect(l, 0, lowerStem, cap), ...ring(296, bowl, 184, bowl, lowerStem)],
    c: [cShape(286, bowl, 208, bowl, lowerStem)],
    d: [...ring(248, bowl, 184, bowl, lowerStem), rect(r - lowerStem, 0, lowerStem, cap)],
    e: [...ring(272, bowl, 196, bowl, lowerStem), rect(112, 236, 370, lowerStem)],
    f: [rect(252, 0, lowerStem, cap), rect(170, xHeight - lowerStem / 2, 286, lowerStem), arcTube(310, 620, 126, 80, 50, 28, 1.9, 3.6)],
    g: [...ring(264, bowl, 188, bowl, lowerStem), rect(r - lowerStem, -200, lowerStem, 700), arcTube(292, -140, 174, 82, 98, 18, 0.1, Math.PI - 0.18)],
    h: [rect(l, 0, lowerStem, cap), rect(r - lowerStem, 0, lowerStem, 330), arcTube(292, 280, 208, 220, 132, 144, 0, Math.PI)],
    i: [rect(254, 0, lowerStem, xHeight), ellipse(292, 630, 38, 38)],
    j: [rect(254, -200, lowerStem, 720), ellipse(292, 630, 38, 38), arcTube(244, -140, 120, 82, 44, 18, 0.18, Math.PI - 0.2)],
    k: [rect(l, 0, lowerStem, cap), polyStroke([{ x: l + lowerStem / 2, y: 246 }, { x: r, y: xHeight }], lowerStem), polyStroke([{ x: l + lowerStem / 2, y: 246 }, { x: r, y: 0 }], lowerStem)],
    l: [rect(254, 0, lowerStem, cap)],
    m: [smoothContour([{ x: l, y: 0 }, { x: l, y: xHeight }, { x: l + lowerStem, y: xHeight }, { x: 210, y: 370 }, { x: 292, y: 324 }, { x: 374, y: 370 }, { x: r - lowerStem, y: xHeight }, { x: r, y: xHeight }, { x: r, y: 0 }, { x: r - lowerStem, y: 0 }, { x: r - lowerStem, y: 286 }, { x: 374, y: 302 }, { x: 330, y: 252 }, { x: 292, y: 220 }, { x: 254, y: 252 }, { x: 210, y: 302 }, { x: l + lowerStem, y: 286 }, { x: l + lowerStem, y: 0 }], 0.03)],
    n: [rect(l, 0, lowerStem, xHeight), rect(r - lowerStem, 0, lowerStem, 332), arcTube(292, 284, 208, 216, 132, 140, 0, Math.PI)],
    o: ring(m, bowl, 206, bowl, lowerStem),
    p: [rect(l, -200, lowerStem, 720), ...ring(296, bowl, 184, bowl, lowerStem)],
    q: [...ring(248, bowl, 184, bowl, lowerStem), rect(r - lowerStem, -200, lowerStem, 720)],
    r: [rect(l, 0, lowerStem, xHeight), arcTube(250, 284, 168, 216, 92, 140, 0, 2.2)],
    s: sShape(580, xHeight, lowerStem),
    t: [rect(252, 0, lowerStem, 660), rect(146, xHeight - lowerStem / 2, 270, lowerStem), arcTube(328, 74, 110, 76, 34, 16, 0.14, Math.PI - 0.2)],
    u: [uShape(l, r, xHeight, 172, lowerStem)],
    v: [polyStroke([{ x: l, y: xHeight }, { x: m, y: 0 }, { x: r, y: xHeight }], lowerStem)],
    w: [polygon([{ x: l, y: xHeight }, { x: l + lowerStem, y: xHeight }, { x: 190, y: 136 }, { x: 250, y: 298 }, { x: 334, y: 298 }, { x: 394, y: 136 }, { x: r - lowerStem, y: xHeight }, { x: r, y: xHeight }, { x: 424, y: 0 }, { x: 354, y: 0 }, { x: m, y: 204 }, { x: 230, y: 0 }, { x: 160, y: 0 }])],
    x: [polyStroke([{ x: l, y: 0 }, { x: r, y: xHeight }], lowerStem), polyStroke([{ x: l, y: xHeight }, { x: r, y: 0 }], lowerStem)],
    y: [polyStroke([{ x: l, y: xHeight }, { x: 272, y: -200 }, { x: r, y: xHeight }], lowerStem)],
    z: [rect(l, xHeight - lowerStem, r - l, lowerStem), rect(l, 0, r - l, lowerStem), polyStroke([{ x: r, y: xHeight - lowerStem / 2 }, { x: l, y: lowerStem / 2 }], lowerStem)],
  }
}

function figuresAndSymbols(): Record<string, PathInput[]> {
  const s = capStem
  return {
    '0': ring(300, 350, 210, 350, s),
    '1': [rect(270, 0, s, 700), polyStroke([{ x: 310, y: 650 }, { x: 182, y: 550 }], s), rect(160, 0, 260, s)],
    '2': [polygon([{ x: 102, y: 566 }, { x: 188, y: 700 }, { x: 400, y: 700 }, { x: 506, y: 610 }, { x: 506, y: 500 }, { x: 154, y: 80 }, { x: 506, y: 80 }, { x: 506, y: 0 }, { x: 82, y: 0 }, { x: 82, y: 102 }, { x: 426, y: 520 }, { x: 404, y: 620 }, { x: 238, y: 620 }, { x: 164, y: 510 }]), roundedRect(82, 0, 424, s, 18)],
    '3': [rightBowl(124, 524, 376, 176, s), rightBowl(124, 176, 376, 176, s)],
    '4': [rect(412, 0, s, 700), polyStroke([{ x: 452, y: 700 }, { x: 100, y: 246 }, { x: 508, y: 246 }], s)],
    '5': [polygon([{ x: 104, y: 700 }, { x: 488, y: 700 }, { x: 488, y: 620 }, { x: 184, y: 620 }, { x: 184, y: 394 }, { x: 350, y: 394 }, { x: 506, y: 286 }, { x: 480, y: 112 }, { x: 376, y: 0 }, { x: 130, y: 34 }, { x: 112, y: 112 }, { x: 350, y: 82 }, { x: 420, y: 166 }, { x: 392, y: 276 }, { x: 328, y: 316 }, { x: 104, y: 316 }]), roundedRect(104, 620, 384, s, 18)],
    '6': [...ring(300, 210, 194, 210, s), arcTube(300, 485, 210, 218, 128, 136, 0.2, Math.PI + 0.22)],
    '7': [rect(96, 624, 420, s), polyStroke([{ x: 492, y: 660 }, { x: 184, y: 0 }], s)],
    '8': [...ring(300, 520, 190, 180, s), ...ring(300, 180, 190, 180, s)],
    '9': [...ring(300, 490, 194, 210, s), arcTube(300, 220, 210, 218, 128, 136, Math.PI + 0.2, tau - 0.22)],
    '$': [...sShape(600, 700, s), rect(260, -54, s, 808)],
    '?': [arcTube(300, 500, 220, 200, 144, 124, 0.15, Math.PI + 0.1), rect(260, 204, s, 114), ellipse(300, 45, s / 2, s / 2)],
    '&': [...ring(270, 226, 166, 214, lowerStem), polyStroke([{ x: 430, y: 700 }, { x: 102, y: 290 }, { x: 486, y: 0 }], lowerStem)],
    '%': [...ring(166, 538, 108, 126, 64), ...ring(434, 162, 108, 126, 64), polyStroke([{ x: 102, y: 24 }, { x: 504, y: 676 }], 60)],
    '@': [...ring(300, 340, 234, 300, 62), ...ring(310, 340, 116, 146, 62), rect(388, 284, 62, 192)],
    '!': [rect(260, 170, s, 530), ellipse(300, 46, s / 2, s / 2)],
    '#': [rect(178, 0, 62, 700), rect(360, 0, 62, 700), polyStroke([{ x: 98, y: 238 }, { x: 502, y: 300 }], 58), polyStroke([{ x: 98, y: 450 }, { x: 502, y: 512 }], 58)],
    '*': [polyStroke([{ x: 300, y: 188 }, { x: 300, y: 524 }], 58), polyStroke([{ x: 156, y: 270 }, { x: 444, y: 444 }], 58), polyStroke([{ x: 156, y: 444 }, { x: 444, y: 270 }], 58)],
    '(': [arcTube(440, 350, 226, 350, 162, 286, 2.1, 4.18)],
    ')': [arcTube(160, 350, 226, 350, 162, 286, -1.04, 1.04)],
    '=': [rect(108, 420, 384, 62), rect(108, 220, 384, 62)],
    '-': [rect(120, 320, 360, 62)],
    '.': [ellipse(300, 44, s / 2, s / 2)],
    ',': [ellipse(300, 48, s / 2, s / 2), polyStroke([{ x: 300, y: 28 }, { x: 250, y: -116 }], 56)],
    ':': [ellipse(300, 454, s / 2, s / 2), ellipse(300, 48, s / 2, s / 2)],
    ';': [ellipse(300, 454, s / 2, s / 2), ellipse(300, 48, s / 2, s / 2), polyStroke([{ x: 300, y: 28 }, { x: 250, y: -116 }], 56)],
  }
}

const widths: Record<string, number> = {
  I: 332, J: 430, M: 720, W: 760, i: 250, j: 280, l: 250, m: 720, w: 700, t: 390, f: 370,
  '1': 460, '(': 360, ')': 360, '!': 320, '.': 300, ',': 300, ':': 300, ';': 300, '-': 440, '*': 420,
}

export function buildReferenceNeutralRegularGlyphs(): ReferenceGlyphInput[] {
  const shapes = { ...uppercase(), ...lowercase(), ...figuresAndSymbols() }
  return [...REFERENCE_NEUTRAL_REGULAR_CHARACTERS].map((name) => glyph(name, widths[name] ?? 600, shapes[name]))
}

export function buildGlyphsForReferenceProfile(id: string): ReferenceGlyphInput[] {
  const glyphs = buildReferenceNeutralRegularGlyphs()
  if (id === REFERENCE_NEUTRAL_REGULAR_ABC_ID) return glyphs.filter((glyph) => REFERENCE_NEUTRAL_REGULAR_ABC_CHARACTERS.includes(glyph.name))
  if (id === REFERENCE_NEUTRAL_REGULAR_ID) return glyphs
  throw new Error('Perfil de referência não encontrado.')
}

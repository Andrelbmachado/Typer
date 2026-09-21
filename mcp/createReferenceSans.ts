import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import opentype from 'opentype.js'
import { typerService } from '../src/server/typerService'

type Point = { x: number; y: number }
type NodeInput = Point & { type?: 'corner' | 'smooth' | 'symmetric'; handleIn?: Point; handleOut?: Point }
type PathInput = { closed: boolean; nodes: NodeInput[] }
type GlyphInput = { name: string; unicode: number; metrics: { advanceWidth: number; leftBearing: number; rightBearing: number }; paths: PathInput[] }

const stem = 72
const sideBearing = 58
const cap = 700
const xHeight = 500
const desktop = path.resolve(process.env.TYPER_DESKTOP_DIR || path.join(homedir(), 'Desktop'))
const familyName = 'Typer Reference Sans'

function rect(x: number, y: number, width: number, height: number, reverse = false): PathInput {
  const nodes = [{ x, y }, { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height }]
  return { closed: true, nodes: reverse ? nodes.reverse() : nodes }
}

function stroke(x1: number, y1: number, x2: number, y2: number, weight = stem): PathInput {
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.hypot(dx, dy) || 1
  const px = -(dy / length) * weight / 2
  const py = (dx / length) * weight / 2
  return { closed: true, nodes: [{ x: x1 + px, y: y1 + py }, { x: x2 + px, y: y2 + py }, { x: x2 - px, y: y2 - py }, { x: x1 - px, y: y1 - py }] }
}

function ellipse(cx: number, cy: number, rx: number, ry: number, reverse = false): PathInput {
  const k = .5522847498
  const nodes: NodeInput[] = [
    { x: cx + rx, y: cy, type: 'smooth', handleIn: { x: cx + rx, y: cy - k * ry }, handleOut: { x: cx + rx, y: cy + k * ry } },
    { x: cx, y: cy + ry, type: 'smooth', handleIn: { x: cx + k * rx, y: cy + ry }, handleOut: { x: cx - k * rx, y: cy + ry } },
    { x: cx - rx, y: cy, type: 'smooth', handleIn: { x: cx - rx, y: cy + k * ry }, handleOut: { x: cx - rx, y: cy - k * ry } },
    { x: cx, y: cy - ry, type: 'smooth', handleIn: { x: cx - k * rx, y: cy - ry }, handleOut: { x: cx + k * rx, y: cy - ry } },
  ]
  return { closed: true, nodes: reverse ? nodes.reverse().map((node) => ({ ...node, handleIn: node.handleOut, handleOut: node.handleIn })) : nodes }
}

function ring(cx: number, cy: number, rx: number, ry: number, thickness = stem): PathInput[] {
  return [ellipse(cx, cy, rx, ry), ellipse(cx, cy, Math.max(8, rx - thickness), Math.max(8, ry - thickness), true)]
}

function segments(points: Point[], weight = stem) {
  return points.slice(1).map((point, index) => stroke(points[index].x, points[index].y, point.x, point.y, weight))
}

function glyph(name: string, width: number, paths: PathInput[]): GlyphInput {
  return { name, unicode: name.codePointAt(0)!, metrics: { advanceWidth: width, leftBearing: sideBearing, rightBearing: sideBearing }, paths }
}

function uppercase() {
  const l = 76
  const r = 524
  const m = 300
  const c = cap / 2
  const o = 46
  const C = () => segments([{ x: r - 40, y: cap - 54 }, { x: 390, y: cap }, { x: 180, y: cap - 30 }, { x: 102, y: c }, { x: 180, y: 30 }, { x: 390, y: 0 }, { x: r - 40, y: 54 }])
  const S = () => segments([{ x: r - 56, y: cap - 56 }, { x: 180, y: cap - 16 }, { x: 102, y: cap - 180 }, { x: 440, y: c + 48 }, { x: 498, y: 160 }, { x: 388, y: 10 }, { x: 116, y: 42 }])
  return {
    A: [stroke(l, 0, m, cap), stroke(m, cap, r, 0), rect(170, 300, 260, stem)],
    B: [rect(l, 0, stem, cap), ...ring(318, 525, 210, 175, stem), ...ring(318, 175, 210, 175, stem)],
    C: C(),
    D: [rect(l, 0, stem, cap), ...ring(316, c, 218, 350, stem)],
    E: [rect(l, 0, stem, cap), rect(l, cap - stem, 430, stem), rect(l, c - stem / 2, 340, stem), rect(l, 0, 430, stem)],
    F: [rect(l, 0, stem, cap), rect(l, cap - stem, 430, stem), rect(l, c - stem / 2, 340, stem)],
    G: [...C(), rect(300, c - stem / 2, 220, stem), rect(r - stem, 0, stem, c)],
    H: [rect(l, 0, stem, cap), rect(r - stem, 0, stem, cap), rect(l, c - stem / 2, r - l, stem)],
    I: [rect(m - stem / 2, 0, stem, cap), rect(160, cap - stem, 280, stem), rect(160, 0, 280, stem)],
    J: [rect(r - stem, 110, stem, cap - 110), ...segments([{ x: r - stem / 2, y: 96 }, { x: 410, y: 0 }, { x: 175, y: 0 }, { x: 98, y: 130 }])],
    K: [rect(l, 0, stem, cap), stroke(l + stem / 2, c, r, cap), stroke(l + stem / 2, c, r, 0)],
    L: [rect(l, 0, stem, cap), rect(l, 0, 450, stem)],
    M: [rect(l, 0, stem, cap), rect(r - stem, 0, stem, cap), stroke(l + stem / 2, cap, m, 315), stroke(m, 315, r - stem / 2, cap)],
    N: [rect(l, 0, stem, cap), rect(r - stem, 0, stem, cap), stroke(l + stem / 2, cap, r - stem / 2, 0)],
    O: ring(m, c, 224, 350, stem),
    P: [rect(l, 0, stem, cap), ...ring(314, 525, 206, 175, stem)],
    Q: [...ring(m, c, 224, 350, stem), stroke(340, 180, r + 20, -40)],
    R: [rect(l, 0, stem, cap), ...ring(314, 525, 206, 175, stem), stroke(290, c, r, 0)],
    S: S(),
    T: [rect(90, cap - stem, 420, stem), rect(m - stem / 2, 0, stem, cap)],
    U: [rect(l, 210, stem, cap - 210), rect(r - stem, 210, stem, cap - 210), ...segments([{ x: l + stem / 2, y: 210 }, { x: 160, y: 32 }, { x: m, y: 0 }, { x: 440, y: 32 }, { x: r - stem / 2, y: 210 }])],
    V: [stroke(l, cap, m, 0), stroke(m, 0, r, cap)],
    W: [stroke(l, cap, 180, 0), stroke(180, 0, m, 380), stroke(m, 380, 420, 0), stroke(420, 0, r, cap)],
    X: [stroke(l, 0, r, cap), stroke(l, cap, r, 0)],
    Y: [stroke(l, cap, m, c), stroke(r, cap, m, c), rect(m - stem / 2, 0, stem, c)],
    Z: [rect(l, cap - stem, r - l, stem), rect(l, 0, r - l, stem), stroke(r, cap - stem / 2, l, stem / 2)],
  } satisfies Record<string, PathInput[]>
}

function lowercase() {
  const l = 86
  const r = 490
  const m = 288
  const C = () => segments([{ x: r - 30, y: xHeight - 48 }, { x: 350, y: xHeight }, { x: 160, y: xHeight - 30 }, { x: 84, y: 250 }, { x: 160, y: 30 }, { x: 350, y: 0 }, { x: r - 30, y: 48 }], 66)
  const S = () => segments([{ x: r - 44, y: xHeight - 42 }, { x: 170, y: xHeight - 12 }, { x: 100, y: 370 }, { x: 410, y: 252 }, { x: 468, y: 125 }, { x: 350, y: 8 }, { x: 110, y: 36 }], 66)
  return {
    a: [...ring(270, 250, 190, 250, 66), rect(r - 66, 0, 66, xHeight)],
    b: [rect(l, 0, 66, cap), ...ring(290, 250, 180, 250, 66)],
    c: C(),
    d: [...ring(240, 250, 180, 250, 66), rect(r - 66, 0, 66, cap)],
    e: [...ring(270, 250, 190, 250, 66), rect(112, 240, 360, 66)],
    f: [rect(250, 0, 66, cap), rect(174, xHeight - 40, 272, 66), ...segments([{ x: 270, y: cap - 10 }, { x: 360, y: cap }, { x: 420, y: 640 }], 66)],
    g: [...ring(260, 250, 184, 250, 66), rect(r - 66, -190, 66, 690), ...segments([{ x: r - 32, y: -150 }, { x: 390, y: -210 }, { x: 160, y: -210 }], 66)],
    h: [rect(l, 0, 66, cap), rect(r - 66, 0, 66, 330), ...segments([{ x: l + 33, y: 280 }, { x: 190, y: 500 }, { x: 370, y: 500 }, { x: r - 33, y: 330 }], 66)],
    i: [rect(260, 0, 66, xHeight), ellipse(293, 625, 34, 34)],
    j: [rect(260, -190, 66, 690), ellipse(293, 625, 34, 34), ...segments([{ x: 293, y: -160 }, { x: 210, y: -210 }, { x: 130, y: -180 }], 66)],
    k: [rect(l, 0, 66, cap), stroke(l + 33, 245, r, xHeight), stroke(l + 33, 245, r, 0, 66)],
    l: [rect(260, 0, 66, cap)],
    m: [rect(l, 0, 66, xHeight), rect(250, 0, 66, 330), rect(r - 66, 0, 66, 330), ...segments([{ x: l + 33, y: 290 }, { x: 165, y: 500 }, { x: 250, y: 430 }, { x: 330, y: 500 }, { x: r - 33, y: 330 }], 66)],
    n: [rect(l, 0, 66, xHeight), rect(r - 66, 0, 66, 330), ...segments([{ x: l + 33, y: 285 }, { x: 180, y: 500 }, { x: 370, y: 500 }, { x: r - 33, y: 330 }], 66)],
    o: ring(m, 250, 202, 250, 66),
    p: [rect(l, -200, 66, 700), ...ring(290, 250, 180, 250, 66)],
    q: [...ring(250, 250, 180, 250, 66), rect(r - 66, -200, 66, 700)],
    r: [rect(l, 0, 66, xHeight), ...segments([{ x: l + 33, y: 280 }, { x: 190, y: 500 }, { x: 390, y: 500 }, { x: r, y: 420 }], 66)],
    s: S(),
    t: [rect(250, 0, 66, 650), rect(150, xHeight - 40, 250, 66), ...segments([{ x: 283, y: 28 }, { x: 350, y: 0 }, { x: 410, y: 42 }], 66)],
    u: [rect(l, 170, 66, 330), rect(r - 66, 0, 66, xHeight), ...segments([{ x: l + 33, y: 170 }, { x: 160, y: 22 }, { x: 300, y: 0 }, { x: r - 33, y: 160 }], 66)],
    v: [stroke(l, xHeight, m, 0, 66), stroke(m, 0, r, xHeight, 66)],
    w: [stroke(l, xHeight, 175, 0, 66), stroke(175, 0, m, 275, 66), stroke(m, 275, 405, 0, 66), stroke(405, 0, r, xHeight, 66)],
    x: [stroke(l, 0, r, xHeight, 66), stroke(l, xHeight, r, 0, 66)],
    y: [stroke(l, xHeight, 270, -200, 66), stroke(r, xHeight, 270, -200, 66)],
    z: [rect(l, xHeight - 66, r - l, 66), rect(l, 0, r - l, 66), stroke(r, xHeight - 33, l, 33, 66)],
  } satisfies Record<string, PathInput[]>
}

function figuresAndSymbols() {
  const digits: Record<string, PathInput[]> = {
    '0': ring(300, 350, 205, 350, stem),
    '1': [rect(270, 0, stem, 700), stroke(270, 650, 170, 560), rect(165, 0, 250, stem)],
    '2': segments([{ x: 118, y: 570 }, { x: 210, y: 700 }, { x: 400, y: 680 }, { x: 500, y: 530 }, { x: 118, y: 0 }, { x: 500, y: 0 }]),
    '3': segments([{ x: 118, y: 640 }, { x: 250, y: 700 }, { x: 470, y: 620 }, { x: 320, y: 360 }, { x: 488, y: 190 }, { x: 390, y: 0 }, { x: 128, y: 52 }]),
    '4': [rect(410, 0, stem, 700), stroke(410, 700, 100, 245), rect(100, 245, 410, stem)],
    '5': [rect(120, 628, 350, stem), rect(120, 350, stem, 278), ...segments([{ x: 155, y: 350 }, { x: 390, y: 370 }, { x: 500, y: 190 }, { x: 380, y: 0 }, { x: 140, y: 50 }])],
    '6': [...ring(300, 210, 190, 210, stem), ...segments([{ x: 445, y: 620 }, { x: 300, y: 700 }, { x: 112, y: 480 }, { x: 112, y: 210 }])],
    '7': [rect(100, 628, 410, stem), stroke(495, 650, 180, 0)],
    '8': [...ring(300, 520, 185, 180, stem), ...ring(300, 180, 185, 180, stem)],
    '9': [...ring(300, 490, 190, 210, stem), ...segments([{ x: 490, y: 490 }, { x: 490, y: 170 }, { x: 300, y: 0 }, { x: 150, y: 20 }])],
  }
  const symbols: Record<string, PathInput[]> = {
    '$': [...segments([{ x: 490, y: 610 }, { x: 380, y: 700 }, { x: 170, y: 625 }, { x: 100, y: 430 }, { x: 470, y: 265 }, { x: 430, y: 50 }, { x: 145, y: 35 }]), rect(264, -55, stem, 810)],
    '?': [...segments([{ x: 110, y: 555 }, { x: 205, y: 700 }, { x: 410, y: 660 }, { x: 500, y: 510 }, { x: 300, y: 315 }, { x: 300, y: 210 }]), ellipse(300, 45, stem / 2, stem / 2)],
    '&': [...ring(270, 230, 160, 210, 66), ...segments([{ x: 420, y: 700 }, { x: 110, y: 285 }, { x: 475, y: 0 }], 66)],
    '%': [...ring(170, 540, 105, 125, 58), ...ring(430, 160, 105, 125, 58), stroke(105, 30, 500, 680, 58)],
    '@': [...ring(300, 340, 230, 300, 58), ...ring(310, 340, 115, 145, 58), rect(390, 290, 58, 185)],
    '!': [rect(264, 165, stem, 535), ellipse(300, 45, stem / 2, stem / 2)],
    '#': [rect(182, 0, 58, 700), rect(360, 0, 58, 700), stroke(100, 240, 500, 300, 58), stroke(100, 450, 500, 510, 58)],
    '*': [stroke(300, 190, 300, 520, 58), stroke(160, 270, 440, 440, 58), stroke(160, 440, 440, 270, 58)],
    '(': segments([{ x: 420,  y: 700 }, { x: 280, y: 570 }, { x: 215, y: 350 }, { x: 280, y: 130 }, { x: 420, y: 0 }], 58),
    ')': segments([{ x: 180, y: 700 }, { x: 320, y: 570 }, { x: 385, y: 350 }, { x: 320, y: 130 }, { x: 180, y: 0 }], 58),
    '=': [rect(110, 420, 380, 58), rect(110, 220, 380, 58)],
    '-': [rect(120, 320, 360, 58)],
    '.': [ellipse(300, 42, stem / 2, stem / 2)],
    ',': [ellipse(300, 46, stem / 2, stem / 2), stroke(295, 25, 250, -115, 58)],
    ':': [ellipse(300, 455, stem / 2, stem / 2), ellipse(300, 48, stem / 2, stem / 2)],
    ';': [ellipse(300, 455, stem / 2, stem / 2), ellipse(300, 48, stem / 2, stem / 2), stroke(295, 25, 250, -115, 58)],
  }
  return { ...digits, ...symbols }
}

export function referenceSansGlyphs() {
  return Object.entries({ ...uppercase(), ...lowercase(), ...figuresAndSymbols() }).map(([name, paths]) => glyph(name, name === 'W' || name === 'M' || name === 'w' || name === 'm' ? 660 : 600, paths))
}

async function main() {
  const glyphs = referenceSansGlyphs()
  const created = await typerService.createProject(familyName, 'neutral-grotesk')
  const normalizedGlyphs = glyphs.map((item) => ({
    ...item,
    paths: item.paths.map((contour) => ({ ...contour, nodes: contour.nodes.map((node) => ({ ...node, type: node.type ?? 'corner' as const })) })),
  }))
  await typerService.upsertGlyphs(created.id, normalizedGlyphs)
  const validation = await typerService.validateProject(created.id, glyphs.map((item) => item.name))
  if (!validation.valid) throw new Error(validation.errors.join('\n'))
  const exported = await typerService.exportTtf(created.id)
  await mkdir(desktop, { recursive: true })
  const fontFile = path.join(desktop, `${familyName}.ttf`)
  const projectFile = path.join(desktop, `${familyName}.typer.json`)
  await copyFile(exported.file, fontFile)
  await copyFile(await typerService.projectFilePath(created.id), projectFile)
  const buffer = await readFile(fontFile)
  const parsed = opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
  for (const glyph of glyphs) {
    const character = glyph.name
    const parsedGlyph = parsed.charToGlyph(character)
    if (parsedGlyph.unicode !== character.codePointAt(0) || parsedGlyph.path.commands.length === 0) {
      throw new Error(`The exported TTF is missing a drawable glyph for ${character}.`)
    }
  }
  const specimen = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>${familyName}</title><style>@font-face{font-family:ReferenceSans;src:url('./${familyName}.ttf')}body{margin:48px;background:#f4f4f5;color:#28282b}.sample{font:72px/1.55 ReferenceSans,sans-serif;letter-spacing:1px}</style><div class="sample">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>1234567890<br>$?&amp;%@!#*()=</div>`
  await writeFile(path.join(desktop, `${familyName} specimen.html`), specimen, 'utf8')
  console.log(JSON.stringify({ familyName, fontFile, projectFile, specimenFile: path.join(desktop, `${familyName} specimen.html`), glyphCount: glyphs.length, unitsPerEm: parsed.unitsPerEm }, null, 2))
}

void main().catch((reason) => {
  console.error(reason)
  process.exitCode = 1
})

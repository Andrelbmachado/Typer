import { copyFile, mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { circularArc, joinArcs } from '../src/geometry/Pen'
import { typerService } from '../src/server/typerService'

type ExerciseNode = { x: number; y: number; type: 'corner' | 'smooth'; handleIn?: { x: number; y: number }; handleOut?: { x: number; y: number } }

const desktop = path.resolve(process.env.TYPER_DESKTOP_DIR || path.join(homedir(), 'Desktop'))
const familyName = 'Typer Pen Tool Exercises'

function corners(points: Array<{ x: number; y: number }>): ExerciseNode[] {
  return points.map((point) => ({ ...point, type: 'corner' }))
}

function arc(center: { x: number; y: number }, radius: number, start: number, end: number): ExerciseNode[] {
  return circularArc(center, radius, start, end).map((point) => ({ ...point, type: 'smooth' }))
}

function open(nodes: ExerciseNode[]) {
  return { closed: false, nodes }
}

const top = Math.PI
const right = 0
const bottom = Math.PI * 2

function exercisePaths() {
  const wave = joinArcs(
    circularArc({ x: 240, y: 420 }, 140, top, right),
    circularArc({ x: 520, y: 420 }, 140, top, bottom),
    circularArc({ x: 800, y: 420 }, 140, top, right),
  ).map((point) => ({ ...point, type: 'smooth' as const }))
  const arches = joinArcs(
    circularArc({ x: 230, y: 250 }, 130, top, right),
    circularArc({ x: 490, y: 250 }, 130, top, right),
    circularArc({ x: 750, y: 250 }, 130, top, right),
  ).map((point) => ({ ...point, type: 'smooth' as const }))
  const circleThenLine = [...arc({ x: 410, y: -110 }, 80, 0, bottom), ...corners([{ x: 760, y: -110 }])]
  const finalArc = arc({ x: 420, y: -20 }, 120, top, right)
  const lineThenArc = corners([{ x: 80, y: -20 }, { x: 300, y: -20 }])
  lineThenArc[1].handleOut = finalArc[0].handleOut
  lineThenArc[1].type = 'smooth'
  return [
    open(corners([{ x: 80, y: 760 }, { x: 190, y: 870 }, { x: 300, y: 760 }, { x: 410, y: 870 }, { x: 520, y: 760 }, { x: 630, y: 870 }, { x: 740, y: 760 }])),
    open(corners([{ x: 80, y: 650 }, { x: 210, y: 650 }, { x: 210, y: 780 }, { x: 420, y: 780 }, { x: 550, y: 650 }, { x: 880, y: 650 }])),
    open(wave),
    open(arches),
    open([...arc({ x: 220, y: 80 }, 120, top, right), ...corners([{ x: 760, y: 80 }])]),
    open([...lineThenArc, ...finalArc.slice(1)]),
    open(circleThenLine),
  ]
}

async function main() {
  const created = await typerService.createProject(familyName, 'neutral-grotesk')
  await typerService.upsertGlyphs(created.id, [{
    name: 'A', unicode: 65,
    metrics: { advanceWidth: 1000, leftBearing: 0, rightBearing: 0 },
    paths: exercisePaths(),
  }])
  await mkdir(desktop, { recursive: true })
  const projectFile = path.join(desktop, `${familyName}.typer.json`)
  await copyFile(await typerService.projectFilePath(created.id), projectFile)
  console.log(JSON.stringify({ projectFile, glyph: 'A', exercises: 7 }, null, 2))
}

void main().catch((reason) => {
  console.error(reason)
  process.exitCode = 1
})

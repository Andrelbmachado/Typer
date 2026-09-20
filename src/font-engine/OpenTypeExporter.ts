import opentype from 'opentype.js'
import type { FontProject } from '../typography/Font'
import { pathToSvgD, type GlyphPath } from '../geometry/Path'
import type { Glyph } from '../typography/Glyph'

function pathToOpenType(paths: GlyphPath[]): opentype.Path {
  const path = new opentype.Path()

  for (const p of paths) {
    // Open contours are useful while editing, but do not form an outline in a font.
    // Omitting them prevents malformed or unexpectedly stroked glyphs in consumers.
    if (!p.closed || p.nodes.length < 3) continue
    const [first, ...rest] = p.nodes
    path.moveTo(first.x, first.y)

    let prev = first
    const drawSegment = (from: typeof first, to: typeof first) => {
      if (!from.handleOut && !to.handleIn) {
        path.lineTo(to.x, to.y)
        return
      }
      const c1 = from.handleOut ?? { x: from.x, y: from.y }
      const c2 = to.handleIn ?? { x: to.x, y: to.y }
      path.curveTo(c1.x, c1.y, c2.x, c2.y, to.x, to.y)
    }

    for (const n of rest) {
      drawSegment(prev, n)
      prev = n
    }
    if (p.closed) {
      drawSegment(prev, first)
      path.close()
    }
  }

  return path
}

function buildGlyph(glyph: Glyph): opentype.Glyph {
  return new opentype.Glyph({
    name: glyph.name,
    unicode: glyph.unicode ?? undefined,
    advanceWidth: glyph.metrics.advanceWidth,
    path: pathToOpenType(glyph.paths),
  })
}

export function exportProjectToFont(project: FontProject): opentype.Font {
  const notdef = new opentype.Glyph({
    name: '.notdef',
    advanceWidth: project.font.unitsPerEm / 2,
    path: new opentype.Path(),
  })

  const glyphs = [notdef, ...Object.values(project.glyphs).map(buildGlyph)]

  return new opentype.Font({
    familyName: project.font.familyName,
    styleName: project.font.styleName,
    unitsPerEm: project.font.unitsPerEm,
    ascender: project.font.ascender,
    descender: project.font.descender,
    glyphs,
  })
}

export function downloadTTF(project: FontProject) {
  const font = exportProjectToFont(project)
  const arrayBuffer = font.toArrayBuffer()
  const blob = new Blob([arrayBuffer], { type: 'font/ttf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${project.font.familyName}-${project.font.styleName}.ttf`
  a.click()
  URL.revokeObjectURL(url)
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function fileName(value: string) {
  return value.trim().replaceAll(/[^a-z0-9]+/gi, '-').replaceAll(/^-|-$/g, '') || 'typer'
}

export function glyphSvg(project: FontProject, glyphName: string) {
  const glyph = project.glyphs[glyphName]
  if (!glyph) throw new Error(`Glifo ${glyphName} não encontrado.`)
  const width = Math.max(1, glyph.metrics.advanceWidth)
  const height = project.font.ascender - project.font.descender
  const d = glyph.paths.filter((path) => path.closed && path.nodes.length >= 3).map(pathToSvgD).join(' ')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${project.font.descender} ${width} ${height}" width="${width}" height="${height}"><g transform="translate(0 ${project.font.ascender}) scale(1 -1)"><path d="${d}" fill="#111111" fill-rule="nonzero"/></g></svg>`
}

export function downloadSVG(project: FontProject, glyphName: string) {
  downloadBlob(new Blob([glyphSvg(project, glyphName)], { type: 'image/svg+xml;charset=utf-8' }), `${fileName(project.font.familyName)}-${glyphName}.svg`)
}

async function rasterize(project: FontProject, glyphName: string, mime: 'image/png' | 'image/jpeg') {
  const url = URL.createObjectURL(new Blob([glyphSvg(project, glyphName)], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Não foi possível rasterizar o glifo.'))
      image.src = url
    })
    const glyph = project.glyphs[glyphName]
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, glyph.metrics.advanceWidth * 2)
    canvas.height = Math.max(1, (project.font.ascender - project.font.descender) * 2)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D indisponível.')
    if (mime === 'image/jpeg') {
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Não foi possível criar a imagem.')), mime, 0.95))
    return { blob, width: canvas.width, height: canvas.height }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function downloadRaster(project: FontProject, glyphName: string, format: 'png' | 'jpg' | 'jpeg') {
  const mime = format === 'png' ? 'image/png' : 'image/jpeg'
  const { blob } = await rasterize(project, glyphName, mime)
  downloadBlob(blob, `${fileName(project.font.familyName)}-${glyphName}.${format}`)
}

export async function downloadPDF(project: FontProject, glyphName: string) {
  const { blob, width, height } = await rasterize(project, glyphName, 'image/png')
  const imageUrl = URL.createObjectURL(blob)
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Não foi possível preparar o PDF.'))
      image.src = imageUrl
    })
    const { jsPDF } = await import('jspdf')
    const document = new jsPDF({ orientation: width > height ? 'landscape' : 'portrait', unit: 'px', format: [width, height] })
    document.addImage(image, 'PNG', 0, 0, width, height)
    document.save(`${fileName(project.font.familyName)}-${glyphName}.pdf`)
  } finally {
    URL.revokeObjectURL(imageUrl)
  }
}

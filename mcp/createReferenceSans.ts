import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import opentype from 'opentype.js'
import { REFERENCE_NEUTRAL_REGULAR_ABC_CHARACTERS, REFERENCE_NEUTRAL_REGULAR_ABC_ID, buildGlyphsForReferenceProfile } from './referenceProfiles'
import { validateReferenceGlyphGeometry } from './referenceQuality'
import { typerService } from '../src/server/typerService'

const desktop = path.resolve(process.env.TYPER_DESKTOP_DIR || path.join(homedir(), 'Desktop'))
const familyName = process.env.TYPER_REFERENCE_FAMILY_NAME || 'Typer Reference Sans ABC'

function outputBaseName(value: string) {
  return value.replaceAll(/[\\/:*?"<>|]/g, '-').trim() || 'Typer Reference Sans ABC'
}

async function main() {
  const geometry = validateReferenceGlyphGeometry(buildGlyphsForReferenceProfile(REFERENCE_NEUTRAL_REGULAR_ABC_ID))
  if (!geometry.valid) throw new Error(geometry.errors.join('\n'))

  const created = await typerService.createReferenceSet(familyName, REFERENCE_NEUTRAL_REGULAR_ABC_ID)
  const validation = await typerService.validateProject(created.file.id, [...REFERENCE_NEUTRAL_REGULAR_ABC_CHARACTERS])
  if (!validation.valid) throw new Error(validation.errors.join('\n'))

  const exported = await typerService.exportTtf(created.file.id)
  await mkdir(desktop, { recursive: true })
  const baseName = outputBaseName(familyName)
  const fontFile = path.join(desktop, `${baseName}.ttf`)
  const projectFile = path.join(desktop, `${baseName}.typer.json`)
  const specimenFile = path.join(desktop, `${baseName} specimen.html`)
  await copyFile(exported.file, fontFile)
  await copyFile(created.filePath, projectFile)

  const buffer = await readFile(fontFile)
  const parsed = opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
  if (parsed.unitsPerEm !== 1000) throw new Error('O TTF exportado não preservou UPM 1000.')
  for (const character of REFERENCE_NEUTRAL_REGULAR_ABC_CHARACTERS) {
    const parsedGlyph = parsed.charToGlyph(character)
    if (parsedGlyph.unicode !== character.codePointAt(0) || parsedGlyph.path.commands.length === 0) {
      throw new Error(`O TTF exportado não contém um glifo desenhável para ${character}.`)
    }
  }
  for (const character of 'BC') {
    const hasCurve = parsed.charToGlyph(character).path.commands.some((command) => command.type === 'C')
    if (!hasCurve) throw new Error(`${character} deveria conter uma curva Bézier no TTF exportado.`)
  }

  const specimen = `<!doctype html>
<html lang="pt-BR"><meta charset="utf-8"><title>${familyName} specimen</title>
<style>
@font-face{font-family:ReferenceSans;src:url('./${baseName}.ttf') format('truetype')}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f4f5;color:#2d2d30}
.sample{font:260px/1 ReferenceSans,sans-serif;letter-spacing:18px;padding:96px;max-width:1800px}
</style><div class="sample" data-testid="font-sample">ABC</div>`
  await writeFile(specimenFile, specimen, 'utf8')

  console.log(JSON.stringify({
    familyName,
    profile: created.profile.id,
    fontFile,
    projectFile,
    specimenFile,
    glyphCount: validation.glyphCount,
    unitsPerEm: parsed.unitsPerEm,
    geometry,
  }, null, 2))
}

void main().catch((reason) => {
  console.error(reason)
  process.exitCode = 1
})

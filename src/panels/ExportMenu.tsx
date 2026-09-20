import { useEffect, useRef, useState } from 'react'
import { ChevronUp, Download, FileCode2, FileImage, FileText, LoaderCircle } from 'lucide-react'
import type { FontProject } from '../typography/Font'
import { downloadPDF, downloadRaster, downloadSVG, downloadTTF } from '../font-engine/OpenTypeExporter'

type Format = 'ttf' | 'otf' | 'svg' | 'pdf' | 'png' | 'jpg' | 'jpeg'

const OPTIONS: { format: Format; title: string; detail: string; Icon: typeof FileText; disabled?: boolean }[] = [
  { format: 'ttf', title: 'TrueType', detail: '.ttf · fonte instalável', Icon: FileText },
  { format: 'otf', title: 'OpenType', detail: '.otf · conversão CFF em breve', Icon: FileText, disabled: true },
  { format: 'svg', title: 'Vetor SVG', detail: '.svg · glifo atual', Icon: FileCode2 },
  { format: 'pdf', title: 'PDF', detail: '.pdf · glifo atual', Icon: FileText },
  { format: 'png', title: 'PNG', detail: '.png · 2×', Icon: FileImage },
  { format: 'jpg', title: 'JPG', detail: '.jpg · fundo branco', Icon: FileImage },
  { format: 'jpeg', title: 'JPEG', detail: '.jpeg · fundo branco', Icon: FileImage },
]

export function ExportMenu({ project, glyphName }: { project: FontProject; glyphName: string }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<Format | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [])

  async function exportFormat(format: Format) {
    setBusy(format)
    try {
      if (format === 'ttf') downloadTTF(project)
      else if (format === 'otf') return
      else if (format === 'svg') downloadSVG(project, glyphName)
      else if (format === 'pdf') await downloadPDF(project, glyphName)
      else await downloadRaster(project, glyphName, format)
      setOpen(false)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="export-menu" ref={rootRef}>
      <button className="export-btn" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((value) => !value)}>
        <Download size={15} aria-hidden="true" /> Exportar <ChevronUp size={15} aria-hidden="true" />
      </button>
      {open && (
        <div className="export-popover" role="menu" aria-label="Formatos de exportação">
          <div className="export-heading">Exportar</div>
          {OPTIONS.map(({ format, title, detail, Icon, disabled }) => (
            <button key={format} role="menuitem" className="export-option" onClick={() => void exportFormat(format)} disabled={busy !== null || disabled}>
              {busy === format ? <LoaderCircle className="spin" size={18} /> : <Icon size={18} />}
              <span><strong>{title}</strong><small>{detail}</small></span>
            </button>
          ))}
          <div className="export-note">OTF está visível para deixar clara a evolução prevista; não exporta bytes com extensão enganosa.</div>
        </div>
      )}
    </div>
  )
}

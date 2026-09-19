import { useProjectStore } from '../store/projectStore'
import type { FontProject } from '../typography/Font'

const GUIDE_LABELS: { key: keyof FontProject['guides']; label: string }[] = [
  { key: 'ascender', label: 'Ascender' },
  { key: 'capHeight', label: 'Cap Height' },
  { key: 'xHeight', label: 'X-Height' },
  { key: 'baseline', label: 'Baseline' },
  { key: 'descender', label: 'Descender' },
]

export function GuidesPanel() {
  const guides = useProjectStore((s) => s.project.guides)
  const updateGuide = useProjectStore((s) => s.updateGuide)

  return (
    <details className="panel panel-collapsible">
      <summary>Guias da fonte</summary>
      {GUIDE_LABELS.map(({ key, label }) => (
        <label key={key} className="field-row">
          <span>{label}</span>
          <input
            type="number"
            value={guides[key]}
            onChange={(e) => updateGuide(key, Number(e.target.value))}
          />
        </label>
      ))}
    </details>
  )
}

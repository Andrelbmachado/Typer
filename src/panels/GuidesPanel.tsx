import { Lock, RotateCcw, Unlock } from 'lucide-react'
import { ScrubNumberInput } from '../components/ScrubNumberInput'
import { PanelSection } from '../components/PanelSection'
import { useProjectStore } from '../store/projectStore'
import { guideAppearance, type FontProject, type GuideKey } from '../typography/Font'

const GUIDE_LABELS: { key: keyof FontProject['guides']; label: string }[] = [
  { key: 'ascender', label: 'Ascender' },
  { key: 'capHeight', label: 'Cap Height' },
  { key: 'xHeight', label: 'X-Height' },
  { key: 'baseline', label: 'Baseline' },
  { key: 'descender', label: 'Descender' },
]

export function GuidesPanel() {
  const guides = useProjectStore((s) => s.project.guides)
  const project = useProjectStore((s) => s.project)
  const updateGuide = useProjectStore((s) => s.updateGuide)
  const updateGuideAppearance = useProjectStore((s) => s.updateGuideAppearance)
  const resetGuides = useProjectStore((s) => s.resetGuides)

  return (
    <PanelSection
      title="Linhas-guia"
      className="guides-panel"
      trailing={<><span className="selection-count">cor e posição</span><button className="panel-icon-btn" type="button" aria-label="Restaurar guias padrão" title="Restaurar guias padrão" onClick={resetGuides}><RotateCcw size={15} /></button></>}
    >
      <div className="guide-list">
        {GUIDE_LABELS.map(({ key, label }) => {
          const appearance = guideAppearance(project, key as GuideKey)
          return (
            <div key={key} className="guide-row">
              <div className="guide-row-heading">
                <label className="guide-color" title={`Cor de ${label}`}>
                  <input type="color" aria-label={`Cor de ${label}`} value={appearance.color} onChange={(event) => updateGuideAppearance(key, { color: event.target.value })} />
                </label>
                <span className="guide-name">{label}</span>
                <button
                  className={`guide-lock ${appearance.locked ? 'locked' : ''}`}
                  type="button"
                  aria-label={`${appearance.locked ? 'Desbloquear' : 'Bloquear'} ${label}`}
                  title={appearance.locked ? 'Fixa — clique para permitir arrastar no canvas' : 'Móvel — arraste a linha no canvas'}
                  onClick={() => updateGuideAppearance(key, { locked: !appearance.locked })}
                >
                  {appearance.locked ? <Lock size={14} /> : <Unlock size={14} />}
                </button>
              </div>
              <ScrubNumberInput label={`Posição de ${label}`} value={guides[key]} onChange={(value) => updateGuide(key, value)} />
            </div>
          )
        })}
      </div>
      <p className="panel-hint">Desbloqueie uma guia para arrastá-la verticalmente no canvas.</p>
    </PanelSection>
  )
}

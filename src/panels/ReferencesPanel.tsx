import { Eye, EyeOff, ImagePlus, Trash2 } from 'lucide-react'
import { PanelSection } from '../components/PanelSection'
import { useProjectStore } from '../store/projectStore'

export function ReferencesPanel({ onImport }: { onImport: () => void }) {
  const references = useProjectStore((state) => state.project.references ?? [])
  const removeReference = useProjectStore((state) => state.removeReference)
  const toggleReference = useProjectStore((state) => state.toggleReference)

  return (
    <PanelSection title="Referências" trailing={<button className="panel-icon-btn" type="button" aria-label="Importar referência" title="Importar referência" onClick={onImport}><ImagePlus size={16} /></button>}>
      {references.length ? (
        <ul className="reference-list">
          {references.map((reference) => (
            <li key={reference.id} className="reference-row">
              <button type="button" className="reference-icon-btn" aria-label={`${reference.visible ? 'Ocultar' : 'Mostrar'} ${reference.name}`} onClick={() => toggleReference(reference.id)}>
                {reference.visible ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
              <span className="reference-name" title={reference.name}>{reference.name}</span>
              <span className="reference-kind">{reference.kind === 'font' ? 'fonte' : reference.kind}</span>
              <button type="button" className="reference-icon-btn danger" aria-label={`Remover ${reference.name}`} onClick={() => removeReference(reference.id)}><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      ) : <p className="panel-hint">Importe TTF, OTF, SVG ou PNG para usar como referência visual no canvas.</p>}
    </PanelSection>
  )
}

const LAYERS = [
  { name: 'Contorno', locked: false },
  { name: 'Contraformas', locked: false },
  { name: 'Guias', locked: true },
  { name: 'Esboço', locked: true },
]

export function LayersPanel() {
  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Camadas</h3>
        <button className="panel-add-btn" title="Nova camada">+</button>
      </div>
      <ul className="layer-list">
        {LAYERS.map((layer, i) => (
          <li key={layer.name} className={i === 0 ? 'layer-row active' : 'layer-row'}>
            <span className="layer-eye">👁</span>
            <span className="layer-name">{layer.name}</span>
            <span className="layer-lock">{layer.locked ? '🔒' : ''}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

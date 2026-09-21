import { useEffect, useRef, useState } from 'react'
import { BookOpen, FilePlus2, FolderOpen, Home, Import, KeyRound, MousePointer2, PenTool, PlugZap, Type } from 'lucide-react'
import { createRemoteProject, getApiKey, listRemoteProjects, remoteToLocalProject, TyperApiError } from '../api/client'
import { listProjectRecords, saveProjectRecord } from '../persistence/IndexedDB'
import { pathToSvgD } from '../geometry/Path'
import { createProjectRecord, parseProjectFile, type ProjectRecord } from '../typography/ProjectFile'

interface HomeScreenProps {
  onOpenProject: (id: string) => void
  onLearn: () => void
  onAdmin: () => void
}

function ProjectThumbnail({ record }: { record: ProjectRecord }) {
  const glyph = Object.values(record.project.glyphs).find((item) => item.status === 'done')
  return (
    <svg className="project-thumbnail" viewBox="0 0 1000 1000" aria-hidden="true">
      <rect width="1000" height="1000" fill="#f4f4f5" />
      <line x1="80" x2="920" y1="800" y2="800" stroke="#d4d4d8" />
      {glyph ? (
        <g transform="translate(170 800) scale(.88 -.88)">
          {glyph.paths.filter((path) => path.closed).map((path) => <path key={path.id} d={pathToSvgD(path)} fill="#18181b" />)}
        </g>
      ) : (
        <g transform="translate(290 690)">
          <text x="0" y="0" fontSize="460" fontWeight="650" fill="#d4d4d8">T</text>
        </g>
      )}
    </svg>
  )
}

export function HomeScreen({ onOpenProject, onLearn, onAdmin }: HomeScreenProps) {
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void (async () => {
      try {
        const local = await listProjectRecords()
        setProjects(local)
        if (!getApiKey()) return
        const remote = await listRemoteProjects()
        await Promise.all(remote.map((record) => saveProjectRecord(remoteToLocalProject(record))))
        setProjects(await listProjectRecords())
      } catch (reason) {
        // The cache stays authoritative while a local API is unavailable.
        if (!(reason instanceof TyperApiError && reason.code === 'server_unavailable')) {
          setError(reason instanceof Error ? reason.message : 'Não foi possível carregar os projetos.')
        }
      }
    })()
  }, [])

  async function createProject() {
    const suffix = projects.length + 1
    const name = suffix === 1 ? 'Minha Fonte' : `Minha Fonte ${suffix}`
    try {
      const remote = getApiKey() ? await createRemoteProject(name) : null
      const record = remote ? remoteToLocalProject(remote) : createProjectRecord(name)
      await saveProjectRecord(record)
      onOpenProject(record.id)
    } catch (reason) {
      if (reason instanceof TyperApiError && reason.code === 'server_unavailable') {
        const record = createProjectRecord(name)
        await saveProjectRecord(record)
        onOpenProject(record.id)
        return
      }
      setError(reason instanceof Error ? reason.message : 'Não foi possível criar o projeto.')
    }
  }

  async function importProject(file: File) {
    try {
      const record = parseProjectFile(JSON.parse(await file.text()), file.name)
      await saveProjectRecord(record)
      onOpenProject(record.id)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível importar o projeto.')
    } finally {
      if (importRef.current) importRef.current.value = ''
    }
  }

  return (
    <div className="home-shell">
      <header className="home-topbar">
        <div className="brand-lockup"><span className="brand-mark"><Type size={18} /></span><strong>Typer</strong></div>
        <span className="home-topbar-copy">Estúdio tipográfico local</span>
      </header>

      <aside className="home-sidebar" aria-label="Navegação principal">
        <button className="primary-home-action" onClick={() => void createProject()}><FilePlus2 size={17} /> Nova fonte</button>
        <button className="secondary-home-action" onClick={() => importRef.current?.click()}><FolderOpen size={17} /> Importar projeto</button>
        <div className="home-nav-group">
          <button className="home-nav-item active"><Home size={17} /> Home</button>
          <button className="home-nav-item" onClick={onLearn}><BookOpen size={17} /> Aprender</button>
          <button className="home-nav-item" onClick={onAdmin}><KeyRound size={17} /> Acesso API</button>
        </div>
        <div className="home-nav-label">Arquivos</div>
        <button className="home-nav-item" onClick={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })}><FolderOpen size={17} /> Seus projetos</button>
        <div className="home-sidebar-footer"><span className="connection-dot" /> Salvos neste navegador</div>
      </aside>

      <main className="home-content">
        <section className="home-hero">
          <div>
            <span className="eyebrow">Bem-vindo ao Typer</span>
            <h1>Desenhe letras.<br />Construa uma fonte.</h1>
            <p>Edite contornos Bézier em uma prancheta precisa de 1000 × 1000 e transforme seus glifos em uma fonte instalável.</p>
          </div>
          <div className="hero-actions">
            <button className="hero-primary" onClick={() => void createProject()}><FilePlus2 size={18} /> Criar nova fonte</button>
            <button className="hero-secondary" onClick={() => importRef.current?.click()}><Import size={18} /> Importar .typer.json</button>
          </div>
        </section>

        <section id="learn" className="feature-section">
          <div className="section-heading"><div><span className="eyebrow">O essencial</span><h2>Da primeira curva ao arquivo final</h2></div></div>
          <div className="feature-grid">
            <article className="feature-card"><span className="feature-icon"><PenTool size={21} /></span><h3>Desenho vetorial preciso</h3><p>Crie contornos retos ou cúbicos, edite alças e alinhe formas sem distorcer curvas.</p></article>
            <article className="feature-card"><span className="feature-icon"><MousePointer2 size={21} /></span><h3>Fluxo tipográfico completo</h3><p>Use guias, métricas, camadas e atalhos para trabalhar caractere por caractere.</p></article>
            <article className="feature-card"><span className="feature-icon"><PlugZap size={21} /></span><h3>Pronto para automação</h3><p>Importe projetos criados pelo servidor MCP local e continue refinando no editor.</p></article>
          </div>
        </section>

        <section id="projects" className="projects-section">
          <div className="section-heading"><div><span className="eyebrow">Recentes</span><h2>Seus projetos</h2></div><span>{projects.length} {projects.length === 1 ? 'projeto' : 'projetos'}</span></div>
          {error && <div className="home-error" role="alert">{error}</div>}
          {projects.length ? (
            <div className="project-grid">
              {projects.map((record) => (
                <button key={record.id} className="project-card" onClick={() => onOpenProject(record.id)}>
                  <ProjectThumbnail record={record} />
                  <span className="project-card-body"><strong>{record.name}</strong><small>Atualizado {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(record.updatedAt))}</small></span>
                </button>
              ))}
              <button className="project-card project-card-new" onClick={() => void createProject()}><FilePlus2 size={26} /><strong>Novo projeto</strong></button>
            </div>
          ) : (
            <div className="project-empty"><FilePlus2 size={28} /><h3>Seu primeiro alfabeto começa aqui</h3><p>Crie uma fonte vazia ou importe um projeto produzido pelo MCP.</p><button onClick={() => void createProject()}>Criar nova fonte</button></div>
          )}
        </section>
      </main>

      <input ref={importRef} type="file" accept=".json,.typer.json,application/json" hidden onChange={(event) => {
        const file = event.target.files?.[0]
        if (file) void importProject(file)
      }} />
    </div>
  )
}

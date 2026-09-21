import { useState } from 'react'
import { Check, Copy, KeyRound, LockKeyhole, Plus, RefreshCw, ShieldCheck, Trash2, XCircle } from 'lucide-react'
import { createAccessKey, deleteAccessKey, listAccessKeys, revokeAccessKey, setApiKey, type ApiKeySummary } from '../api/client'
import { API_SCOPES, type ApiScope } from '../shared/access'

export function AdminAccessScreen({ onHome }: { onHome: () => void }) {
  const [adminToken, setAdminToken] = useState('')
  const [keys, setKeys] = useState<ApiKeySummary[]>([])
  const [keyName, setKeyName] = useState('GPT Typer')
  const [scopes, setScopes] = useState<ApiScope[]>([...API_SCOPES])
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function refresh() {
    setBusy(true)
    try {
      setKeys((await listAccessKeys(adminToken)).keys)
      setMessage(null)
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Não foi possível carregar as chaves.')
    } finally {
      setBusy(false)
    }
  }

  async function createKey() {
    setBusy(true)
    try {
      const created = await createAccessKey(adminToken, keyName, scopes)
      setRevealedSecret(created.secret)
      await refresh()
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Não foi possível criar a chave.')
    } finally {
      setBusy(false)
    }
  }

  async function copySecret() {
    if (!revealedSecret) return
    await navigator.clipboard.writeText(revealedSecret)
    setMessage('Chave copiada. Ela não será mostrada novamente.')
  }

  async function revoke(key: ApiKeySummary) {
    try {
      await revokeAccessKey(adminToken, key.id)
      await refresh()
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Não foi possível revogar a chave.')
    }
  }

  async function remove(key: ApiKeySummary) {
    if (!window.confirm(`Excluir permanentemente a chave “${key.name}”? Esta ação não pode ser desfeita.`)) return
    try {
      await deleteAccessKey(adminToken, key.id)
      await refresh()
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Não foi possível excluir a chave.')
    }
  }

  function toggleScope(scope: ApiScope) {
    setScopes((current) => current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope])
  }

  return (
    <div className="admin-shell">
      <header className="admin-topbar"><div className="brand-lockup"><span className="brand-mark"><KeyRound size={18} /></span><strong>Typer</strong></div><button onClick={onHome}>Voltar para Home</button></header>
      <main className="admin-content">
        <section className="admin-intro"><span className="eyebrow">Automação controlada</span><h1>Central de acessos</h1><p>Crie chaves limitadas para Codex, ChatGPT e GPT Actions. O token mestre só é usado nesta página e nunca é salvo no navegador.</p></section>
        <section className="admin-card admin-auth-card">
          <div><h2><LockKeyhole size={18} /> Autenticação administrativa</h2><p>Informe o valor atual de <code>TYPER_ADMIN_TOKEN</code> para gerenciar as chaves locais.</p></div>
          <div className="admin-token-row"><input aria-label="Token administrativo" type="password" value={adminToken} onChange={(event) => setAdminToken(event.target.value)} placeholder="Token administrativo" autoComplete="off" /><button onClick={() => void refresh()} disabled={!adminToken || busy}><RefreshCw size={16} /> Carregar chaves</button></div>
        </section>
        {message && <div className="admin-message" role="status">{message}</div>}
        {revealedSecret && <section className="admin-card secret-reveal" aria-live="polite"><div><h2><ShieldCheck size={18} /> Copie esta chave agora</h2><p>Por segurança, este é o único momento em que o segredo completo pode ser exibido.</p><code>{revealedSecret}</code></div><div className="secret-actions"><button onClick={() => void copySecret()}><Copy size={16} /> Copiar</button><button onClick={() => { setApiKey(revealedSecret); setMessage('Sincronização da API ativada nesta sessão.'); }}><Check size={16} /> Usar nesta sessão</button><button className="quiet" onClick={() => setRevealedSecret(null)}>Ocultar</button></div></section>}
        <div className="admin-grid">
          <section className="admin-card">
            <h2><Plus size={18} /> Criar chave de API</h2>
            <label>Nome<input value={keyName} onChange={(event) => setKeyName(event.target.value)} maxLength={120} /></label>
            <fieldset><legend>Permissões</legend>{API_SCOPES.map((scope) => <label key={scope} className="scope-check"><input type="checkbox" checked={scopes.includes(scope)} onChange={() => toggleScope(scope)} /> {scope}</label>)}</fieldset>
            <button className="admin-primary" onClick={() => void createKey()} disabled={!adminToken || !keyName.trim() || !scopes.length || busy}><Plus size={16} /> Criar e revelar uma vez</button>
          </section>
          <section className="admin-card admin-key-list"><div className="admin-card-heading"><h2><KeyRound size={18} /> Chaves emitidas</h2><button className="icon-button" title="Atualizar" aria-label="Atualizar lista" onClick={() => void refresh()} disabled={!adminToken || busy}><RefreshCw size={16} /></button></div>
            {keys.length ? <ul>{keys.map((key) => <li key={key.id}><div><strong>{key.name}</strong><code>{key.prefix}</code><small>{key.scopes.join(' · ')} · criada {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(key.createdAt))}{key.lastUsedAt ? ` · usada ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(key.lastUsedAt))}` : ''}</small></div><div className="key-actions"><span className={`key-status ${key.status}`}>{key.status === 'active' ? 'Ativa' : 'Revogada'}</span>{key.status === 'active' && <button onClick={() => void revoke(key)} title="Revogar"><XCircle size={16} /> Revogar</button>}<button className="danger" onClick={() => void remove(key)} title="Excluir"><Trash2 size={16} /></button></div></li>)}</ul> : <p className="empty-keys">Nenhuma chave carregada. Autentique-se para criar a primeira.</p>}
          </section>
        </div>
      </main>
    </div>
  )
}

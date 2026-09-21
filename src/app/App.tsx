import { useCallback, useEffect, useState } from 'react'
import { EditorScreen } from './EditorScreen'
import { HomeScreen } from './HomeScreen'
import { LearnScreen } from './LearnScreen'
import { AdminAccessScreen } from './AdminAccessScreen'

type Route = { screen: 'home' } | { screen: 'learn' } | { screen: 'admin' } | { screen: 'editor'; projectId: string }

function readRoute(): Route {
  const match = window.location.hash.match(/^#\/editor\/([^/]+)$/)
  if (match) return { screen: 'editor', projectId: decodeURIComponent(match[1]) }
  if (window.location.hash === '#/admin/access') return { screen: 'admin' }
  return window.location.hash === '#/learn' ? { screen: 'learn' } : { screen: 'home' }
}

export function App() {
  const [route, setRoute] = useState<Route>(() => readRoute())

  useEffect(() => {
    const onHashChange = () => setRoute(readRoute())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const goHome = useCallback(() => {
    window.location.hash = '#/home'
    setRoute({ screen: 'home' })
  }, [])

  const openProject = useCallback((projectId: string) => {
    window.location.hash = `#/editor/${encodeURIComponent(projectId)}`
    setRoute({ screen: 'editor', projectId })
  }, [])

  const goLearn = useCallback(() => {
    window.location.hash = '#/learn'
    setRoute({ screen: 'learn' })
  }, [])
  const goAdmin = useCallback(() => {
    window.location.hash = '#/admin/access'
    setRoute({ screen: 'admin' })
  }, [])

  return route.screen === 'home'
    ? <HomeScreen onOpenProject={openProject} onLearn={goLearn} onAdmin={goAdmin} />
    : route.screen === 'learn'
      ? <LearnScreen onHome={goHome} />
      : route.screen === 'admin'
        ? <AdminAccessScreen onHome={goHome} />
        : <EditorScreen projectId={route.projectId} onHome={goHome} />
}

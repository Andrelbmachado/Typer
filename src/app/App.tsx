import { useCallback, useEffect, useState } from 'react'
import { EditorScreen } from './EditorScreen'
import { HomeScreen } from './HomeScreen'
import { LearnScreen } from './LearnScreen'

type Route = { screen: 'home' } | { screen: 'learn' } | { screen: 'editor'; projectId: string }

function readRoute(): Route {
  const match = window.location.hash.match(/^#\/editor\/([^/]+)$/)
  if (match) return { screen: 'editor', projectId: decodeURIComponent(match[1]) }
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

  return route.screen === 'home'
    ? <HomeScreen onOpenProject={openProject} onLearn={goLearn} />
    : route.screen === 'learn'
      ? <LearnScreen onHome={goHome} />
      : <EditorScreen projectId={route.projectId} onHome={goHome} />
}

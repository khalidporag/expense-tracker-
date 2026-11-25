import { useCallback, useEffect, useRef, useState } from 'react'
import { runBackHandlers } from '../lib/backStack.js'

// Keeps the phone's Back button from closing the app by surprise.
// History is [root, guard]; Back pops the guard (popstate). If something in the app handles it (close a sheet,
// leave a sub-page, go Home) we put the guard back; otherwise we ask "Exit?". Confirming tries to close the app
// (window.close, then history.back); if the browser refuses, a hint says one more Back press exits, which works
// because we are then sitting on the root entry with no guard.
export function useExitGuard() {
  const [asking, setAsking] = useState(false)
  const [hint, setHint] = useState(false)
  const exiting = useRef(false)

  useEffect(() => {
    history.replaceState({ ...(history.state || {}), root: true }, '')
    history.pushState({ guard: true }, '')
    const onPop = () => {
      if (exiting.current) return
      history.pushState({ guard: true }, '') // always keep a guard, so a Back press while the dialog is open is also caught
      if (!runBackHandlers()) setAsking(true)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const stay = useCallback(() => setAsking(false), [])

  const exit = useCallback(() => {
    exiting.current = true
    setAsking(false)
    try { window.close() } catch { /* not allowed for this window */ }
    setTimeout(() => { if (document.visibilityState === 'visible') history.go(-2) }, 200) // past the guard and the root entry
    setTimeout(() => {
      // Still here: the browser would not let the page leave. Drop the guard so the next Back press exits natively.
      history.back()
      setTimeout(() => {
        exiting.current = false
        setHint(true)
        setTimeout(() => setHint(false), 4500)
      }, 150)
    }, 900)
  }, [])

  return { asking, hint, stay, exit }
}

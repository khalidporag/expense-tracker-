import React, { createContext, useContext, useEffect, useState } from 'react'
import InstallBanner from '../components/InstallBanner.jsx'
import InstallGuide from '../components/InstallGuide.jsx'
import { canInstall, detectPlatform, shouldShowBanner } from '../lib/install.js'

const DISMISSED_KEY = 'expense-tracker-install-dismissed'
const readDismissed = () => { try { const v = Number(localStorage.getItem(DISMISSED_KEY)); return v || null } catch { return null } }
const writeDismissed = (t) => { try { localStorage.setItem(DISMISSED_KEY, String(t)) } catch { /* storage unavailable */ } }
const isStandalone = () => !!window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true

// Chrome fires `beforeinstallprompt` once, possibly before React mounts, so catch it at load and keep it.
let earlyPrompt = null
const listeners = new Set()
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault() // we show our own banner instead of the browser's mini-infobar
  earlyPrompt = e
  listeners.forEach((fn) => fn(e))
})

const Ctx = createContext({ platform: 'none', canInstall: false, installed: false, install: () => {} })
export const useInstall = () => useContext(Ctx)

// Offers "use it as an app": a one-tap prompt where the browser allows it, a short how-to on iPhone, and a
// "open in your browser" hint inside in-app browsers. Renders the banner and the how-to sheet itself.
export function InstallProvider({ children }) {
  const [deferred, setDeferred] = useState(earlyPrompt)
  const [standalone, setStandalone] = useState(isStandalone)
  const [dismissedAt, setDismissedAt] = useState(readDismissed)
  const [ready, setReady] = useState(false) // wait until the welcome splash is gone
  const [guide, setGuide] = useState(null) // 'ios' | 'inapp'

  useEffect(() => {
    const onPrompt = (e) => setDeferred(e)
    const onInstalled = () => { setStandalone(true); setDeferred(null); earlyPrompt = null }
    listeners.add(onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    const t = setTimeout(() => setReady(true), 2400)
    return () => { listeners.delete(onPrompt); window.removeEventListener('appinstalled', onInstalled); clearTimeout(t) }
  }, [])

  const platform = detectPlatform({ ua: navigator.userAgent, maxTouchPoints: navigator.maxTouchPoints, hasPrompt: !!deferred, standalone })
  const snooze = () => { const now = Date.now(); writeDismissed(now); setDismissedAt(now) }

  const install = async () => {
    if (platform === 'prompt' && deferred) {
      deferred.prompt()
      const choice = await deferred.userChoice
      setDeferred(null) // a prompt event can be used only once
      earlyPrompt = null
      if (choice?.outcome !== 'accepted') snooze()
    } else if (platform === 'ios' || platform === 'inapp') {
      setGuide(platform)
    }
  }

  const show = ready && shouldShowBanner({
    platform, dismissedAt, now: Date.now(),
    automated: !!navigator.webdriver, forced: /[?&]install=1(&|$)/.test(window.location.search),
  })

  return (
    <Ctx.Provider value={{ platform, canInstall: canInstall(platform), installed: platform === 'installed', install }}>
      {children}
      {show && <InstallBanner platform={platform} onInstall={install} onDismiss={snooze} />}
      {guide && <InstallGuide mode={guide} onClose={() => setGuide(null)} />}
    </Ctx.Provider>
  )
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import BottomNav from './components/BottomNav.jsx'
import TopBar from './components/TopBar.jsx'
import SearchPalette from './components/SearchPalette.jsx'
import Splash from './components/Splash.jsx'
import ExitDialog from './components/ExitDialog.jsx'
import TransactionForm from './forms/TransactionForm.jsx'
import CategoryDetail from './forms/CategoryDetail.jsx'
import Home from './screens/Home.jsx'
import History from './screens/History.jsx'
import Insights from './screens/Insights.jsx'
import Budgets from './screens/Budgets.jsx'
import More from './screens/More.jsx'
import { runRecurring } from './db/actions.js'
import { useBackHandler } from './hooks/useBackHandler.js'
import { useExitGuard } from './hooks/useExitGuard.js'
import { currentMonth } from './lib/dates.js'
import { shouldShowSplash } from './lib/splash.js'

const SPLASH_KEY = 'expense-tracker-splash'
const splashSeen = () => { try { return sessionStorage.getItem(SPLASH_KEY) === '1' } catch { return false } }
const markSplashSeen = () => { try { sessionStorage.setItem(SPLASH_KEY, '1') } catch { /* storage unavailable */ } }

// After navigating, bring a section of the new screen (matched by its aria-label) into view. Its data may still be loading.
function scrollToSection(label, tries = 12) {
  const el = document.querySelector(`[aria-label="${label}"]`)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  else if (tries > 0) setTimeout(() => scrollToSection(label, tries - 1), 80)
}

export default function App() {
  const [splash, setSplash] = useState(() => shouldShowSplash({ search: window.location.search, webdriver: !!navigator.webdriver, seen: splashSeen() }))
  const [tab, setTab] = useState('home')
  const [month, setMonth] = useState(currentMonth())
  const [editing, setEditing] = useState(null) // transaction | 'new' | 'new-income'
  const [detail, setDetail] = useState(null) // category id whose detail sheet is open
  const [searchOpen, setSearchOpen] = useState(false)
  const [historyPreset, setHistoryPreset] = useState(null)
  const [moreView, setMoreView] = useState(null)
  const exitGuard = useExitGuard()
  const presetCount = useRef(0) // distinguishes one History preset from the next, even when navigating while History is open

  // Create any recurring entries that came due since the app was last opened.
  useEffect(() => { runRecurring() }, [])

  // Navigate between tabs; `opts` carries a History filter, a Settings sub-view or an Insights section.
  const go = useCallback((to, opts = {}) => {
    if (to === 'history') setHistoryPreset(opts.from || opts.categoryId != null || opts.subcategoryId != null || opts.text ? { ...opts, nonce: ++presetCount.current } : null)
    if (to === 'more') setMoreView(opts.view || null)
    setTab(to)
    window.scrollTo(0, 0)
    if (opts.section) setTimeout(() => scrollToSection(opts.section), 80)
  }, [])

  // The phone's Back button: leave a non-Home tab for Home. (Sheets and Settings sub-pages handle their own.)
  const tabRef = useRef(tab)
  tabRef.current = tab
  useBackHandler(() => {
    if (tabRef.current === 'home') return false
    go('home')
    return true
  })

  const searchCtx = useMemo(() => ({ go, openAdd: (type) => setEditing(type === 'income' ? 'new-income' : 'new'), openDetail: setDetail }), [go])
  const closeSplash = useCallback(() => { markSplashSeen(); setSplash(false) }, [])

  return (
    <>
      <main className="app">
        <TopBar onSearch={() => setSearchOpen(true)} onSettings={() => go('more')} settingsActive={tab === 'more'} />
        {tab === 'home' && <Home month={month} onMonth={setMonth} onEdit={setEditing} onDetail={setDetail} go={go} />}
        {tab === 'history' && <History onEdit={setEditing} preset={historyPreset} />}
        {tab === 'insights' && <Insights month={month} onMonth={setMonth} go={go} />}
        {tab === 'budgets' && <Budgets month={month} onMonth={setMonth} />}
        {tab === 'more' && <More key={moreView || 'root'} initialView={moreView} onBack={() => go('home')} />}
      </main>
      <BottomNav tab={tab} onChange={go} onAdd={() => setEditing('new')} />
      {detail != null && <CategoryDetail categoryId={detail} month={month} go={go} onClose={() => setDetail(null)} />}
      {editing && (
        <TransactionForm initial={typeof editing === 'object' ? editing : undefined} defaultType={editing === 'new-income' ? 'income' : undefined} onClose={() => setEditing(null)} />
      )}
      {searchOpen && <SearchPalette ctx={searchCtx} onClose={() => setSearchOpen(false)} />}
      {exitGuard.asking && <ExitDialog onStay={exitGuard.stay} onExit={exitGuard.exit} />}
      {exitGuard.hint && <div className="toast" role="status">Press Back once more to exit.</div>}
      {splash && <Splash onDone={closeSplash} />}
    </>
  )
}

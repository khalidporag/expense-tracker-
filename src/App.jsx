import React, { useEffect, useState } from 'react'
import BottomNav from './components/BottomNav.jsx'
import TransactionForm from './forms/TransactionForm.jsx'
import CategoryDetail from './forms/CategoryDetail.jsx'
import Home from './screens/Home.jsx'
import History from './screens/History.jsx'
import Insights from './screens/Insights.jsx'
import Budgets from './screens/Budgets.jsx'
import More from './screens/More.jsx'
import { runRecurring } from './db/actions.js'
import { currentMonth } from './lib/dates.js'

export default function App() {
  const [tab, setTab] = useState('home')
  const [month, setMonth] = useState(currentMonth())
  const [editing, setEditing] = useState(null) // transaction | 'new'
  const [detail, setDetail] = useState(null) // category id whose detail sheet is open
  const [historyPreset, setHistoryPreset] = useState(null)
  const [moreView, setMoreView] = useState(null)

  // Create any recurring entries that came due since the app was last opened.
  useEffect(() => { runRecurring() }, [])

  // Navigate between tabs; `opts` carries a History filter or a Settings sub-view.
  const go = (to, opts = {}) => {
    if (to === 'history') setHistoryPreset(opts.from || opts.categoryId != null || opts.subcategoryId != null ? { ...opts, nonce: Date.now() } : null)
    if (to === 'more') setMoreView(opts.view || null)
    setTab(to)
    window.scrollTo(0, 0)
  }

  return (
    <>
      <main className="app">
        {tab === 'home' && <Home month={month} onMonth={setMonth} onEdit={setEditing} onDetail={setDetail} go={go} />}
        {tab === 'history' && <History onEdit={setEditing} preset={historyPreset} />}
        {tab === 'insights' && <Insights month={month} onMonth={setMonth} go={go} />}
        {tab === 'budgets' && <Budgets month={month} onMonth={setMonth} />}
        {tab === 'more' && <More key={moreView || 'root'} initialView={moreView} onBack={() => go('home')} />}
      </main>
      <BottomNav tab={tab} onChange={go} onAdd={() => setEditing('new')} />
      {detail != null && <CategoryDetail categoryId={detail} month={month} go={go} onClose={() => setDetail(null)} />}
      {editing && <TransactionForm initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </>
  )
}

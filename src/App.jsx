import React, { useEffect, useState } from 'react'
import BottomNav from './components/BottomNav.jsx'
import TransactionForm from './forms/TransactionForm.jsx'
import Home from './screens/Home.jsx'
import History from './screens/History.jsx'
import Budgets from './screens/Budgets.jsx'
import More from './screens/More.jsx'
import { runRecurring } from './db/actions.js'
import { currentMonth } from './lib/dates.js'

export default function App() {
  const [tab, setTab] = useState('home')
  const [month, setMonth] = useState(currentMonth())
  const [editing, setEditing] = useState(null) // transaction | 'new'

  // Create any recurring entries that came due since the app was last opened.
  useEffect(() => { runRecurring() }, [])

  const common = { onEdit: setEditing, onGo: setTab }
  return (
    <div className="app">
      <main>
        {tab === 'home' && <Home month={month} onMonth={setMonth} {...common} />}
        {tab === 'history' && <History onEdit={setEditing} />}
        {tab === 'budgets' && <Budgets month={month} onMonth={setMonth} />}
        {tab === 'more' && <More />}
      </main>
      {tab !== 'more' && <button className="fab" onClick={() => setEditing('new')} aria-label="Add entry">+</button>}
      <BottomNav tab={tab} onChange={setTab} />
      {editing && <TransactionForm initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

import React from 'react'

const TABS = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'history', label: 'History', icon: '🧾' },
  { id: 'budgets', label: 'Budgets', icon: '🎯' },
  { id: 'more', label: 'More', icon: '⚙️' },
]

export default function BottomNav({ tab, onChange }) {
  return (
    <nav className="nav" aria-label="Main">
      {TABS.map((t) => (
        <button key={t.id} className={t.id === tab ? 'nav-item on' : 'nav-item'} onClick={() => onChange(t.id)}
          aria-current={t.id === tab ? 'page' : undefined}>
          <span aria-hidden="true">{t.icon}</span>
          {t.label}
        </button>
      ))}
    </nav>
  )
}

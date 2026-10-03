import React from 'react'
import Icon from './Icon.jsx'

const LEFT = [
  { id: 'home', label: 'Home', icon: 'homeNav' },
  { id: 'history', label: 'History', icon: 'list' },
]
const RIGHT = [
  { id: 'insights', label: 'Insights', icon: 'chart' },
  { id: 'budgets', label: 'Plan', icon: 'target' },
]

export default function BottomNav({ tab, onChange, onAdd }) {
  const item = (t) => (
    <button key={t.id} className={t.id === tab ? 'nav-item on' : 'nav-item'} onClick={() => onChange(t.id)}
      aria-current={t.id === tab ? 'page' : undefined}>
      <Icon name={t.icon} size={24} stroke={1.9} />
      {t.label}
    </button>
  )
  return (
    <nav className="nav" aria-label="Main">
      <div className="nav-inner">
        {LEFT.map(item)}
        <button className="nav-add" onClick={onAdd} aria-label="Add entry"><Icon name="plus" size={28} stroke={2.2} /></button>
        {RIGHT.map(item)}
      </div>
    </nav>
  )
}

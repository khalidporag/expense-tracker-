import React from 'react'
import { formatMoney } from '../lib/money.js'
import { dayLabel } from '../lib/dates.js'

export const Empty = ({ icon = '🫙', children }) => (
  <div className="empty"><div aria-hidden="true">{icon}</div><p>{children}</p></div>
)

export function Progress({ ratio, state = 'ok' }) {
  return (
    <div className="track" role="progressbar" aria-valuenow={Math.round(ratio * 100)} aria-valuemin="0" aria-valuemax="100">
      <div className={`fill ${state}`} style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
    </div>
  )
}

export function TxRow({ tx, category, onClick }) {
  const income = tx.type === 'income'
  return (
    <li className="row-item" onClick={onClick}>
      <span className="avatar" aria-hidden="true">{category?.icon || '📦'}</span>
      <div className="grow">
        <strong>{category?.name || 'Other'}</strong>
        <div className="muted">{dayLabel(tx.date)}{tx.note ? ` · ${tx.note}` : ''}{tx.recurringId ? ' · 🔁' : ''}</div>
      </div>
      <div className={income ? 'amt income' : 'amt'}>{income ? '+' : '-'}{formatMoney(tx.amount).replace('-', '')}</div>
    </li>
  )
}

export function Segmented({ value, options, onChange }) {
  return (
    <div className="seg" role="group">
      {options.map((o) => (
        <button type="button" key={o.value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function CategoryChips({ categories, value, onChange }) {
  return (
    <div className="chips">
      {categories.map((c) => (
        <button type="button" key={c.id} className={c.id === value ? 'chip on' : 'chip'} onClick={() => onChange(c.id)}>
          {c.icon} {c.name}
        </button>
      ))}
    </div>
  )
}

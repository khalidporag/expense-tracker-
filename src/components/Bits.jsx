import React from 'react'
import Icon, { CategoryIcon } from './Icon.jsx'
import { formatMoney } from '../lib/money.js'
import { relativeDay } from '../lib/dates.js'

export const Empty = ({ icon = 'tag', children }) => (
  <div className="empty"><Icon name={icon} size={28} /><p>{children}</p></div>
)

// `pace` (0..1) draws a marker for where spending "should" be by today.
export function Progress({ ratio, state = 'ok', pace, label }) {
  const clamp = (n) => Math.min(Math.max(n, 0), 1)
  return (
    <div className="progress" role="progressbar" aria-label={label} aria-valuenow={Math.round(ratio * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`fill ${state}`} style={{ width: `${clamp(ratio) * 100}%` }} />
      {pace != null && <div className="tick" style={{ left: `${clamp(pace) * 100}%` }} />}
    </div>
  )
}

export const Pill = ({ tone = 'info', icon, size, children }) => (
  <span className={`pill ${tone}${size ? ` ${size}` : ''}`}>{icon && <Icon name={icon} size={14} stroke={2.2} />}{children}</span>
)

export function TxRow({ tx, category, showDate, onClick }) {
  const income = tx.type === 'income'
  const sub = [category?.name || 'Other', showDate ? relativeDay(tx.date) : null].filter(Boolean).join(' · ')
  return (
    <li>
      <button className="row-card" onClick={onClick}>
        <CategoryIcon category={category} tone={income ? 'pos' : ''} />
        <span className="grow">
          <strong>{tx.note || category?.name || 'Other'}</strong>
          <span className="muted small">{sub}{tx.recurringId ? ' · recurring' : ''}</span>
        </span>
        <span className={income ? 'amt in' : 'amt'}>{income ? '+' : '−'}{formatMoney(tx.amount)}</span>
      </button>
    </li>
  )
}

export function Segmented({ value, options, onChange, label }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button type="button" key={o.value} className={o.value === value ? 'on' : ''} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function CategoryChips({ categories, value, onChange }) {
  return (
    <div className="chips scroll" role="group" aria-label="Category">
      {categories.map((c) => (
        <button type="button" key={c.id} className={c.id === value ? 'chip on' : 'chip'} aria-pressed={c.id === value} onClick={() => onChange(c.id)}>
          <Icon name={c.icon} size={16} stroke={2} />{c.name}
        </button>
      ))}
    </div>
  )
}

export const Stat = ({ label, children, sub, tone }) => (
  <div className="stat">
    <div className="eyebrow">{label}</div>
    <div className={`fig ${tone || ''}`}>{children}</div>
    {sub && <div className={`small ${tone ? tone : 'muted'}`} style={{ marginTop: 2 }}>{sub}</div>}
  </div>
)

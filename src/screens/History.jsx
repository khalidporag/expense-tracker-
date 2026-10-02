import React, { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Empty, Segmented, TxRow } from '../components/Bits.jsx'
import { useCategories } from '../hooks/useCategories.js'
import { newestFirst } from '../hooks/useMonth.js'
import { db } from '../db/index.js'
import { filterTransactions, groupByDate, summarize } from '../lib/summary.js'
import { dayLabel } from '../lib/dates.js'
import { formatMoney } from '../lib/money.js'

const NO_FILTERS = { text: '', type: '', categoryId: null, from: '', to: '' }

export default function History({ onEdit }) {
  const all = useLiveQuery(async () => (await db.transactions.toArray()).sort(newestFirst))
  const { list, byId } = useCategories()
  const [f, setF] = useState(NO_FILTERS)
  const [open, setOpen] = useState(false)
  const set = (patch) => setF({ ...f, ...patch })

  const shown = filterTransactions(all || [], f)
  const sum = summarize(shown)
  const active = f.type || f.categoryId != null || f.from || f.to

  return (
    <>
      <div className="search">
        <input type="search" placeholder="Search notes" aria-label="Search notes" value={f.text}
          onChange={(e) => set({ text: e.target.value })} />
        <button className={active ? 'icon-btn on' : 'icon-btn'} onClick={() => setOpen(!open)} aria-label="Filters" aria-expanded={open}>⚙︎</button>
      </div>

      {open && (
        <section className="card form">
          <Segmented value={f.type} onChange={(type) => set({ type, categoryId: null })}
            options={[{ value: '', label: 'All' }, { value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} />
          <select aria-label="Category" value={f.categoryId ?? ''} onChange={(e) => set({ categoryId: e.target.value === '' ? null : Number(e.target.value) })}>
            <option value="">All categories</option>
            {list.filter((c) => !f.type || c.kind === f.type).map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}{!f.type ? ` (${c.kind})` : ''}</option>
            ))}
          </select>
          <div className="row">
            <input type="date" aria-label="From date" value={f.from} onChange={(e) => set({ from: e.target.value })} />
            <input type="date" aria-label="To date" value={f.to} onChange={(e) => set({ to: e.target.value })} />
          </div>
          <button className="ghost" onClick={() => setF(NO_FILTERS)}>Clear filters</button>
        </section>
      )}

      {all && (
        <p className="muted center">
          {shown.length} {shown.length === 1 ? 'entry' : 'entries'} · spent {formatMoney(sum.expense)} · income {formatMoney(sum.income)}
        </p>
      )}
      {all && shown.length === 0 && <Empty icon="🔍">Nothing matches.</Empty>}
      {groupByDate(shown).map((g) => (
        <section key={g.date}>
          <div className="day">{dayLabel(g.date)}</div>
          <ul className="list">
            {g.items.map((t) => <TxRow key={t.id} tx={t} category={byId.get(t.categoryId)} onClick={() => onEdit(t)} />)}
          </ul>
        </section>
      ))}
    </>
  )
}

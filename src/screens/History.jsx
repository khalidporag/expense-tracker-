import React, { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Icon from '../components/Icon.jsx'
import { Empty, Stat, TxRow } from '../components/Bits.jsx'
import { useCategories } from '../hooks/useCategories.js'
import { useSubcategories } from '../hooks/useSubcategories.js'
import { newestFirst } from '../hooks/useMonth.js'
import { db } from '../db/index.js'
import { filterTransactions, groupByDate, summarize } from '../lib/summary.js'
import { relativeDay } from '../lib/dates.js'
import { formatMoney } from '../lib/money.js'

const NO_FILTERS = { text: '', type: '', categoryId: null, subcategoryId: null, from: '', to: '' }
const PAGE = 60

// `preset` ({categoryId, from, to, nonce}) comes from "See entries" links elsewhere in the app.
export default function History({ onEdit, preset }) {
  const all = useLiveQuery(async () => (await db.transactions.toArray()).sort(newestFirst))
  const { list, byId } = useCategories()
  const { byId: subById, byCategory } = useSubcategories()
  const [f, setF] = useState(NO_FILTERS)
  const [datesOpen, setDatesOpen] = useState(false)
  const [limit, setLimit] = useState(PAGE)
  const set = (patch) => { setF({ ...f, ...patch }); setLimit(PAGE) }

  useEffect(() => {
    if (!preset) return
    setF({ ...NO_FILTERS, categoryId: preset.categoryId ?? null, subcategoryId: preset.subcategoryId ?? null, from: preset.from || '', to: preset.to || '' })
    setDatesOpen(!!(preset.from || preset.to))
    setLimit(PAGE)
  }, [preset?.nonce])

  const shown = filterTransactions(all || [], f)
  const sum = summarize(shown)
  const page = shown.slice(0, limit)
  const hasDates = f.from || f.to

  return (
    <div className="stack tight">
      <h1 className="title">History</h1>
      <label className="search">
        <Icon name="search" />
        <input type="search" placeholder="Search notes" aria-label="Search notes" value={f.text} onChange={(e) => set({ text: e.target.value })} />
      </label>

      <div className="chips scroll" role="group" aria-label="Filters">
        {[['', 'All'], ['expense', 'Expenses'], ['income', 'Income']].map(([v, label]) => (
          <button key={label} className={f.type === v ? 'chip on' : 'chip'} aria-pressed={f.type === v} onClick={() => set({ type: v, categoryId: null })}>{label}</button>
        ))}
        <select className={f.categoryId != null ? 'chip on' : 'chip'} aria-label="Category" value={f.categoryId ?? ''} onChange={(e) => set({ categoryId: e.target.value === '' ? null : Number(e.target.value), subcategoryId: null })}>
          <option value="">Category</option>
          {list.filter((c) => !f.type || c.kind === f.type).map((c) => <option key={c.id} value={c.id}>{c.name}{!f.type ? ` (${c.kind})` : ''}</option>)}
        </select>
        {(byCategory.get(f.categoryId) || []).length > 0 && (
          <select className={f.subcategoryId != null ? 'chip on' : 'chip'} aria-label="Subcategory" value={f.subcategoryId ?? ''} onChange={(e) => set({ subcategoryId: e.target.value === '' ? null : Number(e.target.value) })}>
            <option value="">Subcategory</option>
            {byCategory.get(f.categoryId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        <button className={hasDates ? 'chip on' : 'chip'} aria-expanded={datesOpen} onClick={() => setDatesOpen((o) => !o)}>Dates<Icon name="chevD" size={16} stroke={2} /></button>
      </div>
      {datesOpen && (
        <div className="dates-panel">
          <input type="date" aria-label="From date" value={f.from} onChange={(e) => set({ from: e.target.value })} />
          <input type="date" aria-label="To date" value={f.to} onChange={(e) => set({ to: e.target.value })} />
        </div>
      )}

      {all && (
        <section className="trio" aria-label="Totals for these entries">
          <Stat label="Entries">{shown.length}</Stat>
          <Stat label="Spent">{formatMoney(sum.expense)}</Stat>
          <Stat label="Income"><span className="pos">{formatMoney(sum.income)}</span></Stat>
        </section>
      )}
      {all && shown.length === 0 && <Empty icon="search">Nothing matches.</Empty>}

      {groupByDate(page).map((g) => {
        const net = g.items.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0)
        return (
          <section key={g.date} aria-label={relativeDay(g.date)}>
            <div className="day-head"><h2 style={{ font: 'inherit', margin: 0 }}>{relativeDay(g.date)}</h2><span className={net > 0 ? 'pos' : ''}>{net > 0 ? '+' : net < 0 ? '−' : ''}{formatMoney(Math.abs(net))}</span></div>
            <ul className="list">{g.items.map((t) => <TxRow key={t.id} tx={t} category={byId.get(t.categoryId)} sub={subById.get(t.subcategoryId)} onClick={() => onEdit(t)} />)}</ul>
          </section>
        )
      })}
      {shown.length > limit && <button className="btn block" onClick={() => setLimit(limit + PAGE)}>Load older entries</button>}
    </div>
  )
}

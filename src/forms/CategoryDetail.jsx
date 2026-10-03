import React, { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Sheet from '../components/Sheet.jsx'
import { Progress } from '../components/Bits.jsx'
import { useCategories } from '../hooks/useCategories.js'
import { useSubcategories } from '../hooks/useSubcategories.js'
import { db } from '../db/index.js'
import { groupDeltas, monthInfo } from '../lib/insights.js'
import { subBreakdown, subKey, monthSeries } from '../lib/subcategories.js'
import { formatCompact, formatMoney, formatTaka } from '../lib/money.js'
import { monthEnd, monthName, shiftMonth, today } from '../lib/dates.js'

const sum = (txs) => txs.reduce((s, t) => s + t.amount, 0)
const Delta = ({ pct }) => pct == null || pct === 0 ? null : (
  <span className={`small ${pct > 0 ? 'over-ink' : 'pos'}`} style={{ fontWeight: 600 }} aria-label={`${pct > 0 ? 'up' : 'down'} ${Math.abs(pct)} percent`}>{pct > 0 ? '▲' : '▼'} {Math.abs(pct)}%</span>
)

// Where one expense category's money went this month, split by subcategory, plus a six-month trend.
export default function CategoryDetail({ categoryId, month, go, onClose }) {
  const { byId } = useCategories()
  const { byCategory } = useSubcategories()
  const [sel, setSel] = useState('all') // 'all' | 'none' | subcategory id
  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5))
  const rows = useLiveQuery(
    () => db.transactions.where('date').between(`${months[0]}-01`, `${month}-32`).filter((t) => t.type === 'expense' && t.categoryId === categoryId).toArray(),
    [categoryId, month],
  )
  const cat = byId.get(categoryId)
  if (!cat || !rows) return null

  const subs = byCategory.get(categoryId) || []
  const valid = new Set(subs.map((s) => s.id))
  const info = monthInfo(month, today())
  const day = info.isFuture ? 1 : Math.max(info.day, 1)
  const prevMonth = months[4]
  const cur = rows.filter((t) => t.date.startsWith(month))
  const prev = rows.filter((t) => t.date.startsWith(prevMonth))
  const bd = subBreakdown(cur, subs)
  const deltas = new Map(groupDeltas(cur, prev, day, (t) => subKey(t, valid)).map((d) => [d.key, d]))
  const prevSame = sum(prev.filter((t) => Number(t.date.slice(8, 10)) <= day))
  const totalPct = prevSame > 0 ? Math.round(((bd.total - prevSame) / prevSame) * 100) : null

  const hasData = (id) => rows.some((t) => subKey(t, valid) === id)
  const options = [{ id: 'all', label: 'All' }, ...subs.filter((s) => hasData(s.id)).map((s) => ({ id: s.id, label: s.name })), ...(subs.length && hasData(null) ? [{ id: 'none', label: 'Not assigned' }] : [])]
  const active = options.some((o) => o.id === sel) ? sel : 'all'
  const series = monthSeries(rows, months, active, subs)
  const max = Math.max(...series.map((s) => s.amount))
  const earlier = series.slice(0, -1)
  const avg = Math.round(sum(earlier) / earlier.length)

  const seeEntries = () => {
    onClose()
    go('history', { categoryId, subcategoryId: typeof active === 'number' ? active : undefined, from: `${month}-01`, to: monthEnd(month) })
  }

  return (
    <Sheet title={`${cat.name} · ${monthName(month)}`} onClose={onClose}>
      <div>
        <div className="eyebrow">Spent</div>
        <div className="fig" style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.1 }}>{formatMoney(bd.total)}</div>
        {totalPct != null && totalPct !== 0 && (
          <div className="small muted"><Delta pct={totalPct} /> vs {monthName(prevMonth)}{info.isCurrent ? ' (same days)' : ''}</div>
        )}
        {bd.total === 0 && <div className="muted small">Nothing spent on {cat.name} this month.</div>}
      </div>

      {subs.length === 0 ? (
        <div className="suggest">
          <p><strong>See {cat.name} in detail.</strong> Split it into parts, such as Electricity and Gas, to see what each one costs.</p>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button className="btn ink" onClick={() => { onClose(); go('more', { view: 'categories' }) }}>Add subcategories</button>
          </div>
        </div>
      ) : bd.rows.length > 0 && (
        <div className="divided" aria-label="By subcategory">
          {bd.rows.map((r) => {
            const d = deltas.get(r.subId)
            const id = r.subId == null ? 'none' : r.subId
            return (
              <button key={String(r.subId)} className="line-row tap" style={{ gridTemplateColumns: 'minmax(0,1fr) auto', rowGap: 6, padding: '10px 0' }}
                aria-pressed={active === id} onClick={() => setSel(id)}>
                <span><strong style={{ fontWeight: active === id ? 800 : 600 }}>{r.name}</strong> <span className="muted small">· {r.count} {r.count === 1 ? 'entry' : 'entries'} · {Math.round(r.share * 100)}%</span></span>
                <span style={{ textAlign: 'right' }}><strong>{formatMoney(r.amount)}</strong> {d?.pct != null ? <Delta pct={d.pct} /> : d && d.cur > 0 && d.prev === 0 ? <span className="small muted">new</span> : null}</span>
                <span style={{ gridColumn: '1 / -1' }}><Progress ratio={r.share} label={`${r.name} share of ${cat.name}`} /></span>
              </button>
            )
          })}
        </div>
      )}

      {sum(rows) > 0 && (
        <section aria-label="Six month trend" className="stack tight">
          <div className="between"><h3 className="h2" style={{ fontSize: 17 }}>Last 6 months</h3>{earlier.some((s) => s.amount > 0) && <span className="muted small">avg {formatTaka(avg)} / month before</span>}</div>
          {options.length > 2 && (
            <div className="chips scroll" role="group" aria-label="Trend for">
              {options.map((o) => <button key={o.id} className={o.id === active ? 'chip on' : 'chip'} aria-pressed={o.id === active} onClick={() => setSel(o.id)}>{o.label}</button>)}
            </div>
          )}
          <div className="weekbars" role="img" aria-label={`Spending by month: ${series.map((s) => `${monthName(s.month)} ${formatTaka(s.amount)}`).join(', ')}`}>
            {series.map((s, i) => (
              <div key={s.month} className={i === series.length - 1 ? 'top' : ''}>
                <span>{s.amount ? formatCompact(s.amount) : '–'}</span>
                <div className="b" style={{ height: `${max ? (s.amount / max) * 100 : 0}px` }} />
              </div>
            ))}
          </div>
          <div className="weeklabels">{series.map((s, i) => <span key={s.month} className={i === series.length - 1 ? 'top' : ''}>{monthName(s.month).slice(0, 3)}</span>)}</div>
        </section>
      )}

      <div className="btn-row">
        {bd.total > 0 && <button className="btn lg" onClick={seeEntries}>See entries</button>}
        {subs.length > 0 && <button className="btn lg" onClick={() => { onClose(); go('more', { view: 'categories' }) }}>Manage</button>}
      </div>
    </Sheet>
  )
}

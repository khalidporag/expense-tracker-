import React, { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import MonthNav from '../components/MonthNav.jsx'
import { Empty, Progress, TxRow } from '../components/Bits.jsx'
import { useCategories } from '../hooks/useCategories.js'
import { useMonthTransactions } from '../hooks/useMonth.js'
import { db } from '../db/index.js'
import { summarize, budgetStatus } from '../lib/summary.js'
import { formatMoney } from '../lib/money.js'

export default function Home({ month, onMonth, onEdit, onGo }) {
  const txs = useMonthTransactions(month)
  const budgets = useLiveQuery(() => db.budgets.toArray()) || []
  const { byId } = useCategories()
  const s = useMemo(() => summarize(txs), [txs])
  const alerts = budgetStatus(budgets, txs).filter((b) => b.state !== 'ok')
  const breakdown = [...s.byCategory.entries()].sort((a, b) => b[1] - a[1])

  return (
    <>
      <MonthNav month={month} onChange={onMonth} />
      <section className="card hero">
        <div className="muted">Balance</div>
        <div className={s.balance < 0 ? 'hero-amt neg' : 'hero-amt'}>{formatMoney(s.balance)}</div>
        <div className="split">
          <div><span className="muted">Income</span><strong className="income">{formatMoney(s.income)}</strong></div>
          <div><span className="muted">Spent</span><strong>{formatMoney(s.expense)}</strong></div>
        </div>
      </section>

      {alerts.length > 0 && (
        <section className="card" onClick={() => onGo('budgets')}>
          <h3>Budget alerts</h3>
          {alerts.map((a) => (
            <div key={a.categoryId} className="alert-row">
              <span>{byId.get(a.categoryId)?.icon} {byId.get(a.categoryId)?.name}</span>
              <span className={a.state === 'over' ? 'neg' : 'warn-text'}>
                {a.state === 'over' ? `Over by ${formatMoney(-a.remaining)}` : `${formatMoney(a.remaining)} left`}
              </span>
            </div>
          ))}
        </section>
      )}

      <section className="card">
        <h3>Where it went</h3>
        {breakdown.length === 0 && <Empty icon="📊">Nothing spent this month.</Empty>}
        {breakdown.map(([id, v]) => (
          <div key={id} className="bar">
            <span>{byId.get(id)?.icon} {byId.get(id)?.name}</span>
            <Progress ratio={v / s.expense} />
            <span>{formatMoney(v)}</span>
          </div>
        ))}
      </section>

      <section>
        <div className="section-head">
          <h3>Recent</h3>
          {txs.length > 0 && <button className="link" onClick={() => onGo('history')}>See all</button>}
        </div>
        {txs.length === 0 && <Empty>No entries yet. Tap + to add one.</Empty>}
        <ul className="list">
          {txs.slice(0, 5).map((t) => <TxRow key={t.id} tx={t} category={byId.get(t.categoryId)} onClick={() => onEdit(t)} />)}
        </ul>
      </section>
    </>
  )
}

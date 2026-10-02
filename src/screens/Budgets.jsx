import React, { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import MonthNav from '../components/MonthNav.jsx'
import { Empty, Progress } from '../components/Bits.jsx'
import BudgetForm from '../forms/BudgetForm.jsx'
import { useCategories } from '../hooks/useCategories.js'
import { useMonthTransactions } from '../hooks/useMonth.js'
import { db } from '../db/index.js'
import { budgetStatus } from '../lib/summary.js'
import { formatMoney } from '../lib/money.js'

export default function Budgets({ month, onMonth }) {
  const txs = useMonthTransactions(month)
  const budgets = useLiveQuery(() => db.budgets.toArray()) || []
  const { list } = useCategories()
  const [editing, setEditing] = useState(null) // category being edited
  const status = new Map(budgetStatus(budgets, txs).map((s) => [s.categoryId, s]))
  const cats = list.filter((c) => c.kind === 'expense')
  const withBudget = cats.filter((c) => status.has(c.id))
  const without = cats.filter((c) => !status.has(c.id))

  return (
    <>
      <MonthNav month={month} onChange={onMonth} />
      {withBudget.length === 0 && <Empty icon="🎯">No budgets yet. Pick a category below to set a monthly limit.</Empty>}
      {withBudget.map((c) => {
        const s = status.get(c.id)
        return (
          <section key={c.id} className="card tappable" onClick={() => setEditing(c)}>
            <div className="split">
              <strong>{c.icon} {c.name}</strong>
              <span className={s.state === 'over' ? 'neg' : s.state === 'warn' ? 'warn-text' : 'muted'}>
                {s.remaining >= 0 ? `${formatMoney(s.remaining)} left` : `Over by ${formatMoney(-s.remaining)}`}
              </span>
            </div>
            <Progress ratio={s.ratio} state={s.state} />
            <div className="muted">{formatMoney(s.spent)} of {formatMoney(s.limit)}</div>
          </section>
        )
      })}
      {without.length > 0 && (
        <>
          <h3>No budget</h3>
          <div className="chips">
            {without.map((c) => <button key={c.id} className="chip" onClick={() => setEditing(c)}>{c.icon} {c.name}</button>)}
          </div>
        </>
      )}
      {editing && (
        <BudgetForm category={editing} budget={budgets.find((b) => b.categoryId === editing.id)} onClose={() => setEditing(null)} />
      )}
    </>
  )
}

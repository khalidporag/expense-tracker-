import React from 'react'
import Sheet from '../components/Sheet.jsx'
import { Progress, Stat } from '../components/Bits.jsx'
import { useMonthData } from '../hooks/useMonthData.js'
import { monthReport } from '../lib/savings.js'
import { formatMoney } from '../lib/money.js'
import { monthName, monthLabel } from '../lib/dates.js'

// One month on one page: what came in, where it went (with budgets), what you saved against your goal.
export default function MonthReport({ month, go, onClose }) {
  const d = useMonthData(month)
  if (!d.ready) return null
  const prevIncome = d.prevTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const r = monthReport({ month, txs: d.txs, deposits: d.deposits, setting: d.savingsTarget, prevIncome })
  const budget = new Map(d.rows.map((x) => [x.categoryId, x]))
  const name = (id) => d.byId.get(id)?.name || 'Other'
  const sentence = r.income > 0
    ? `You earned ${formatMoney(r.income)}, spent ${formatMoney(r.expense)} (${r.spentPct}% of income) and saved ${formatMoney(r.saved)}${r.savedPct != null ? ` (${r.savedPct}%)` : ''}.`
    : `No income is recorded for ${monthName(month)}. You spent ${formatMoney(r.expense)} and saved ${formatMoney(r.saved)}.`

  return (
    <Sheet title={`${monthLabel(month)} report`} onClose={onClose}>
      <p style={{ lineHeight: 1.45 }}>{sentence}</p>
      <div className="trio">
        <Stat label="Earned"><span className="money-in">{formatMoney(r.income)}</span></Stat>
        <Stat label="Spent"><span className="money-out">{formatMoney(r.expense)}</span></Stat>
        <Stat label="Saved"><span className="pos">{formatMoney(r.saved)}</span></Stat>
      </div>

      <section className="card sm" aria-label="Savings goal">
        <div className="eyebrow">Savings goal</div>
        {r.target > 0 ? (
          <>
            <div className="between" style={{ marginTop: 6 }}>
              <strong>{formatMoney(r.saved)} <span className="muted" style={{ fontWeight: 400 }}>of {formatMoney(r.target)}</span></strong>
              <span className={r.targetMet ? 'pos' : 'warn-ink'} style={{ fontWeight: 700 }}>{r.targetMet ? 'Goal reached ✓' : `${formatMoney(r.shortfall)} to go`}</span>
            </div>
            <div style={{ marginTop: 8 }}><Progress ratio={r.saved / r.target} label="Savings goal progress" /></div>
          </>
        ) : (
          <div className="between" style={{ marginTop: 6 }}>
            <span className="muted">No monthly goal set.</span>
            <button className="link" onClick={() => { onClose(); go('savings') }}>Set a goal</button>
          </div>
        )}
      </section>

      <section className="card sm divided" aria-label="Left over">
        <div className="between" style={{ padding: '9px 0' }}><span className="muted">Kept (earned − spent)</span><strong>{formatMoney(r.kept)}</strong></div>
        <div className="between" style={{ padding: '9px 0' }}><span className="muted">Moved into savings plans</span><strong className="pos">{formatMoney(r.saved)}</strong></div>
        <div className="between" style={{ padding: '9px 0' }}><span className="muted">Left in hand</span><strong>{formatMoney(r.unallocated)}</strong></div>
      </section>

      {d.hasBudget && (
        <p className="muted small">Budget {formatMoney(d.totals.budget)}: spent {formatMoney(d.totals.spent)} ({Math.round((d.totals.spent / d.totals.budget) * 100)}%).</p>
      )}

      <section className="stack tight" aria-label="Where it went">
        <div className="eyebrow">Where it went</div>
        {r.expenseByCategory.length === 0 && <p className="muted">No spending recorded.</p>}
        <div className="divided">
          {r.expenseByCategory.slice(0, 8).map(([id, amount]) => {
            const b = budget.get(id)
            return (
              <div key={id} style={{ padding: '10px 0' }}>
                <div className="between"><strong style={{ fontWeight: 600 }}>{name(id)}</strong><strong>{formatMoney(amount)}</strong></div>
                <div className="between muted small" style={{ margin: '2px 0 6px' }}>
                  <span>{Math.round((amount / r.expense) * 100)}% of spending{r.income > 0 ? ` · ${Math.round((amount / r.income) * 100)}% of income` : ''}</span>
                  {b && <span className={b.state === 'over' ? 'over-ink' : b.state === 'warn' ? 'warn-ink' : ''} style={{ fontWeight: 600 }}>{Math.round(b.ratio * 100)}% of budget</span>}
                </div>
                <Progress ratio={amount / r.expense} state={b?.state === 'over' ? 'over' : 'ok'} label={`${name(id)} share of spending`} />
              </div>
            )
          })}
        </div>
      </section>

      {r.incomeByCategory.length > 0 && (
        <section className="stack tight" aria-label="Where it came from">
          <div className="eyebrow">Where it came from</div>
          <div className="divided">
            {r.incomeByCategory.map(([id, amount]) => (
              <div key={id} className="between" style={{ padding: '10px 0' }}><span>{name(id)}</span><strong className="money-in">{formatMoney(amount)}</strong></div>
            ))}
          </div>
        </section>
      )}
    </Sheet>
  )
}

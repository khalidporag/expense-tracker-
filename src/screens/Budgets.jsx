import React, { useState } from 'react'
import MonthNav from '../components/MonthNav.jsx'
import Icon, { CategoryIcon } from '../components/Icon.jsx'
import { Empty, Pill, Progress } from '../components/Bits.jsx'
import BudgetForm from '../forms/BudgetForm.jsx'
import { useMonthData } from '../hooks/useMonthData.js'
import { moveBudget } from '../db/actions.js'
import { allowance, projectSpend, suggestMove } from '../lib/insights.js'
import { formatMoney, formatTaka } from '../lib/money.js'

function Summary({ d }) {
  const { totals, info } = d
  const left = totals.budget - totals.spent
  const ratio = totals.spent / totals.budget
  const live = info.isCurrent
  const forecast = live ? projectSpend(totals.spent, info.day, info.total) : totals.spent
  const diff = forecast - totals.budget
  const allow = allowance(totals.budget, totals.spent, info.daysLeft)
  return (
    <section className="card" aria-label="All budgets">
      <div className="eyebrow">All budgets</div>
      <div className="row" style={{ alignItems: 'baseline', marginTop: 6 }}>
        <span className="fig" style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.1 }}>{formatTaka(Math.abs(left))}</span>
        <span className="muted">{left >= 0 ? `left of ${formatTaka(totals.budget)}` : `over ${formatTaka(totals.budget)}`}</span>
      </div>
      <div style={{ marginTop: 18 }}>
        <Progress ratio={ratio} state={ratio > 1 ? 'over' : diff > 0 && live ? 'warn' : 'ok'} pace={live ? info.ratio : undefined} label="All budgets used" />
        <div className="between small" style={{ marginTop: 8 }}>
          <span><strong className={ratio > 1 ? 'over-ink' : ''}>{formatTaka(totals.spent)}</strong> <span className="muted">spent · {Math.round(ratio * 100)}%</span></span>
          {live && <span className="muted">Pace {Math.round(info.ratio * 100)}%</span>}
        </div>
      </div>
      {live && (
        <div className="row" style={{ marginTop: 14, flexWrap: 'wrap' }}>
          {left > 0 && info.daysLeft > 0 && <span className="pill ok lg">{formatTaka(allow.perDay)}/day available</span>}
          <span className={diff > 0 ? 'pill over-soft lg' : 'pill ok lg'}>Forecast {diff > 0 ? `▲ ${formatTaka(diff)} over` : `▼ ${formatTaka(-diff)} under`}</span>
        </div>
      )}
    </section>
  )
}

function BudgetCard({ r, category, info, onClick }) {
  const live = info.isCurrent
  const pill = r.state === 'over'
    ? <Pill tone="over" size="lg">Over by {formatMoney(-r.remaining)}</Pill>
    : r.state === 'warn' ? <Pill tone="warn" size="lg">{formatMoney(r.remaining)} left</Pill>
    : <Pill tone="ok" size="lg">On track</Pill>
  const side = r.state === 'over' ? 'No room left'
    : live && info.daysLeft > 0 ? `${formatTaka(Math.round(r.remaining / info.daysLeft / 100) * 100)}/day left`
    : info.isPast ? `${formatMoney(r.remaining)} unused` : ''
  return (
    <article className="card tap" style={{ borderRadius: 20, padding: 16 }} onClick={onClick}>
      <div className="row" style={{ gap: 12 }}>
        <CategoryIcon category={category} />
        <div className="grow">
          <button className="link" style={{ padding: 0, fontSize: 17, color: 'var(--ink)', fontWeight: 700 }} onClick={onClick} aria-label={`Edit ${r.name} budget`}>{r.name}</button>
          <div className="muted small">{formatMoney(r.limit)} a month</div>
        </div>
        {pill}
      </div>
      <div style={{ marginTop: 14 }}><Progress ratio={r.ratio} state={r.state} pace={live ? info.ratio : undefined} label={`${r.name} budget used`} /></div>
      <div className="between" style={{ marginTop: 10, fontSize: 14 }}>
        <span><strong>{formatMoney(r.spent)}</strong> <span className="muted">of {formatMoney(r.limit)}</span></span>
        <span className={r.state === 'over' ? 'over-ink' : r.state === 'warn' ? 'warn-ink' : 'muted'} style={{ fontWeight: 600 }}>{side}</span>
      </div>
    </article>
  )
}

export default function Budgets({ month, onMonth }) {
  const d = useMonthData(month)
  const [editing, setEditing] = useState(null) // category being edited
  const [dismissed, setDismissed] = useState(false)
  if (!d.ready) return null
  const { rows, budgets, cats, byId, info, hasBudget, unbudgeted } = d
  const without = cats.filter((c) => c.kind === 'expense' && !rows.some((r) => r.categoryId === c.id))
  const move = info.isCurrent && !dismissed ? suggestMove(rows) : null

  return (
    <div className="stack tight">
      <div className="page-head">
        <div>
          <h1 className="title">Budgets</h1>
          {info.isCurrent && <div className="muted small">{info.daysLeft} days left</div>}
        </div>
      </div>
      <MonthNav month={month} onChange={onMonth} />

      {hasBudget ? <Summary d={d} /> : <Empty icon="target">No budgets yet. Pick a category below to set a monthly limit and get a daily allowance on Home.</Empty>}

      {hasBudget && <div className="between muted small" style={{ marginTop: 4 }}><span className="row" style={{ gap: 6 }}><Icon name="list" size={16} />Most used first</span><span>{rows.length} {rows.length === 1 ? 'budget' : 'budgets'}</span></div>}

      {rows.map((r) => (
        <React.Fragment key={r.categoryId}>
          <BudgetCard r={r} category={byId.get(r.categoryId)} info={info} onClick={() => setEditing(byId.get(r.categoryId))} />
          {move && move.toId === r.categoryId && (
            <aside className="suggest" aria-label="Suggestion">
              <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
                <span className="badge" style={{ width: 36, height: 36, background: 'var(--surface)', color: 'var(--blue-ink)' }}><Icon name="swap" size={18} stroke={2} /></span>
                <p><strong>{byId.get(move.fromId)?.name} has {formatMoney(move.donorRemaining)} unused</strong> and is only {Math.round(move.donorRatio * 100)}% spent. Move {formatMoney(move.amount)} to {r.name} to cover the overage?</p>
              </div>
              <div className="btn-row" style={{ marginTop: 14 }}>
                <button className="btn ink" onClick={() => moveBudget(move.fromId, move.toId, move.amount)}>Move {formatMoney(move.amount)}</button>
                <button className="btn quiet" onClick={() => setDismissed(true)}>Not now</button>
              </div>
            </aside>
          )}
        </React.Fragment>
      ))}

      {without.length > 0 && (
        <>
          <h2 className="h2" style={{ marginTop: 8 }}>No budget</h2>
          {hasBudget && unbudgeted > 0 && <p className="muted small">{formatMoney(unbudgeted)} spent here this month isn’t counted in your budget totals.</p>}
          <div className="chips wrap">
            {without.map((c) => <button key={c.id} className="chip" onClick={() => setEditing(c)}><Icon name={c.icon} size={16} stroke={2} />{c.name}</button>)}
          </div>
        </>
      )}

      {editing && <BudgetForm category={editing} budget={budgets.find((b) => b.categoryId === editing.id)} onClose={() => setEditing(null)} />}
    </div>
  )
}

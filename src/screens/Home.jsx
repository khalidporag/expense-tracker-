import React from 'react'
import MonthNav from '../components/MonthNav.jsx'
import Icon from '../components/Icon.jsx'
import { Empty, Pill, Progress, Stat, TxRow } from '../components/Bits.jsx'
import { useMonthData } from '../hooks/useMonthData.js'
import { allowance, buildActions, categoryDeltas, projectSpend, suggestMove } from '../lib/insights.js'
import { formatMoney, formatTaka } from '../lib/money.js'
import { monthEnd, monthName } from '../lib/dates.js'

const MAX_CATEGORIES = 6

function Hero({ d, go }) {
  const { info, totals, summary, hasBudget, month } = d
  const left = totals.budget - totals.spent
  const ratio = totals.budget ? totals.spent / totals.budget : 0

  if (info.isCurrent && hasBudget) {
    const allow = allowance(totals.budget, totals.spent, info.daysLeft)
    const forecast = projectSpend(totals.spent, info.day, info.total)
    const diff = forecast - totals.budget
    const pts = Math.round((ratio - info.ratio) * 100)
    const state = ratio > 1 ? 'over' : diff > 0 ? 'warn' : 'ok'
    const paceText = pts > 0 ? `${pts} points ahead of pace.` : pts < 0 ? `${-pts} points under pace.` : 'Right on pace.'
    return (
      <section className="hero" aria-label="Safe to spend today">
        <div className="between">
          <div className="eyebrow">{left > 0 ? 'Safe to spend today' : 'Budget left'}</div>
          <span className="chip-top">Day {info.day} of {info.total}</span>
        </div>
        <div className="big">{left > 0 ? formatTaka(allow.perDay) : formatMoney(left)}</div>
        <div className="sub">
          {left <= 0 ? 'This month’s budget is used up' : info.daysLeft > 0 ? `per day for the next ${info.daysLeft} days · ${formatTaka(left)} left` : 'left to spend today'}
        </div>
        <div style={{ marginTop: 20 }}>
          <Progress ratio={ratio} state={state} pace={info.ratio} label="Budget used" />
          <div className="pace-label"><span style={{ left: `${info.ratio * 100}%` }}>Today’s pace</span></div>
          <div className="legend">
            <div><strong style={{ color: state === 'ok' ? 'var(--hero-fill-ok)' : 'var(--hero-fill)' }}>{formatTaka(totals.spent)}</strong> spent · {Math.round(ratio * 100)}%</div>
            <div>Budget {formatTaka(totals.budget)}</div>
          </div>
        </div>
        <button className={diff > 0 ? 'status alert' : 'status'} onClick={() => go('insights')}>
          <Icon name={diff > 0 ? 'warn' : 'check'} size={20} stroke={1.8} />
          <span>
            <strong>{paceText}</strong>{' '}
            {diff > 0 ? `At this rate you'll finish ${formatTaka(diff)} over budget.` : `At this rate you'll finish ${formatTaka(-diff)} under budget.`}{' '}
            <span className="u">See forecast</span>
          </span>
        </button>
      </section>
    )
  }

  if (info.isCurrent) {
    return (
      <section className="hero" aria-label="Spending this month">
        <div className="between"><div className="eyebrow">Spent this month</div><span className="chip-top">Day {info.day} of {info.total}</span></div>
        <div className="big">{formatMoney(summary.expense)}</div>
        <div className="sub">{info.daysLeft} days left in {monthName(month)}</div>
        <button className="status" onClick={() => go('budgets')}>
          <Icon name="target" size={20} /><span><strong>Set budgets</strong> to get a safe-to-spend amount for every day. <span className="u">Set budgets</span></span>
        </button>
      </section>
    )
  }

  const over = totals.spent - totals.budget
  return (
    <section className="hero" aria-label={`Spending in ${monthName(month)}`}>
      <div className="eyebrow">Spent in {monthName(month)}</div>
      <div className="big">{formatMoney(summary.expense)}</div>
      <div className="sub">{hasBudget ? `of ${formatTaka(totals.budget)} budget` : `${formatMoney(summary.income)} income`}</div>
      {hasBudget && (
        <>
          <div style={{ marginTop: 20 }}><Progress ratio={ratio} state={ratio > 1 ? 'over' : 'ok'} label="Budget used" /></div>
          <div className="legend"><div>{Math.round(ratio * 100)}% used</div><div>{over > 0 ? `${formatTaka(over)} over` : `${formatTaka(-over)} under`}</div></div>
        </>
      )}
      {info.isFuture && <div className="sub" style={{ marginTop: 14 }}>This month has not started yet.</div>}
    </section>
  )
}

function Actions({ d, go }) {
  const { info, rows, totals, rules, byId, prevTxs, txs, todayISO, month } = d
  if (!info.isCurrent) return null
  const prev = new Map(categoryDeltas(txs, prevTxs, info.day).map((x) => [x.categoryId, x.prev]))
  const actions = buildActions({
    info, rows, totals, prevByCategory: prev, todayISO,
    rules: rules.map((r) => ({ ...r, label: r.note || byId.get(r.categoryId)?.name })),
  }).slice(0, 4)
  const move = suggestMove(rows)
  const pill = { over: ['over', 'up', 'Over budget'], warn: ['warn', 'info', 'Running low'], upcoming: ['info', 'repeat', 'Coming up'], setup: ['info', 'target', 'Get started'] }

  const run = (cta, a) => {
    if (cta.go === 'history') go('history', { categoryId: a.categoryId, from: `${month}-01`, to: monthEnd(month) })
    else if (cta.go === 'recurring') go('more', { view: 'recurring' })
    else go(cta.go)
  }

  return (
    <section className="stack tight" aria-label="Do this next">
      <div className="section-head"><h2 className="h2">Do this next</h2><span className="muted small">Most urgent first</span></div>
      {actions.length === 0 && (
        <article className="card action">
          <Pill tone="ok" icon="check">On track</Pill>
          <h3>Nothing needs attention</h3>
          <p>Every budget is on pace and nothing big is due this week.</p>
        </article>
      )}
      {actions.map((a) => {
        const [tone, icon, label] = pill[a.kind]
        return (
          <article key={a.id} className="card action">
            <Pill tone={tone === 'over' ? 'over-soft' : tone} icon={icon}>{label}</Pill>
            <h3>{a.title}</h3>
            <p>{a.detail}</p>
            <div className="btn-row">
              {a.kind === 'over' && move?.toId === a.categoryId && <button className="btn ink" onClick={() => go('budgets')}>Move budget</button>}
              <button className="btn" onClick={() => run(a.cta, a)}>{a.cta.label}</button>
            </div>
          </article>
        )
      })}
    </section>
  )
}

function Breakdown({ d, go }) {
  const { summary, rows, txs, prevTxs, info, byId } = d
  const deltas = new Map(categoryDeltas(txs, prevTxs, info.isFuture ? 1 : Math.max(info.day, 1)).map((x) => [x.categoryId, x]))
  const state = new Map(rows.map((r) => [r.categoryId, r]))
  const sorted = [...summary.byCategory.entries()].sort((a, b) => b[1] - a[1])
  const shown = sorted.slice(0, MAX_CATEGORIES).map(([id, amount], i) => ({ id, amount, color: state.get(id)?.state === 'over' ? 'var(--orange)' : `var(--c${i + 1})` }))
  const restAmount = sorted.slice(MAX_CATEGORIES).reduce((s, [, v]) => s + v, 0)
  const total = summary.expense

  return (
    <section className="card" aria-label="Where it went">
      <div className="between" style={{ alignItems: 'baseline' }}>
        <h2 className="h2">Where it went</h2>
        <span className="muted small">vs same days last month</span>
      </div>
      {total === 0 ? <Empty icon="chart">Nothing spent this month.</Empty> : (
        <>
          <div className="stackbar" style={{ marginTop: 14 }} role="img"
            aria-label={`Share of spending: ${shown.map((s) => `${byId.get(s.id)?.name} ${Math.round((s.amount / total) * 100)}%`).join(', ')}`}>
            {shown.map((s) => <div key={s.id} style={{ width: `${(s.amount / total) * 100}%`, background: s.color }} />)}
            {restAmount > 0 && <div style={{ width: `${(restAmount / total) * 100}%`, background: 'var(--c6)' }} />}
          </div>
          <div className="divided" style={{ marginTop: 12 }}>
            {shown.map((s) => {
              const dl = deltas.get(s.id)
              const r = state.get(s.id)
              const sub = r ? `${Math.round(r.ratio * 100)}% of budget` : ''
              return (
                <div key={s.id} className="line-row" style={{ gridTemplateColumns: '12px minmax(0,1fr) auto' }}>
                  <span className="swatch" style={{ background: s.color }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{byId.get(s.id)?.name || 'Other'}</div>
                    {sub && <div className={`small ${r.state === 'over' ? 'over-ink' : r.state === 'warn' ? 'warn-ink' : 'muted'}`} style={{ fontWeight: r.state === 'ok' ? 400 : 600 }}>{sub}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>{formatMoney(s.amount)}</div>
                    {dl && dl.pct != null && dl.delta !== 0 && (
                      <div className={`small ${dl.delta > 0 ? 'over-ink' : 'pos'}`} style={{ fontWeight: 600 }} aria-label={`${dl.delta > 0 ? 'up' : 'down'} ${Math.abs(dl.pct)} percent`}>
                        {dl.delta > 0 ? '▲' : '▼'} {Math.abs(dl.pct)}%
                      </div>
                    )}
                    {dl && dl.pct == null && dl.cur > 0 && <div className="small muted">new</div>}
                  </div>
                </div>
              )
            })}
            {restAmount > 0 && (
              <div className="line-row" style={{ gridTemplateColumns: '12px minmax(0,1fr) auto' }}>
                <span className="swatch" style={{ background: 'var(--c6)' }} />
                <div style={{ fontWeight: 600 }}>{sorted.length - MAX_CATEGORIES} more</div>
                <div style={{ fontWeight: 700 }}>{formatMoney(restAmount)}</div>
              </div>
            )}
          </div>
          <button className="btn quiet block" style={{ marginTop: 8 }} onClick={() => go('insights')}>See all trends<Icon name="chevR" size={16} stroke={2} /></button>
        </>
      )}
    </section>
  )
}

export default function Home({ month, onMonth, onEdit, go }) {
  const d = useMonthData(month)
  if (!d.ready) return null
  const { summary, txs, byId, month: m } = d
  return (
    <div className="stack">
      <div className="page-head">
        <div style={{ flex: 1 }}><MonthNav month={month} onChange={onMonth} /></div>
        <button className="icon-btn" onClick={() => go('more')} aria-label="Settings: categories, recurring, backup"><Icon name="sliders" /></button>
      </div>
      <Hero d={d} go={go} />
      <section className="trio" aria-label="Month totals">
        <Stat label="Income"><span className="pos">{formatMoney(summary.income)}</span></Stat>
        <Stat label="Spent">{formatMoney(summary.expense)}</Stat>
        <Stat label="Kept">{formatMoney(summary.balance)}</Stat>
      </section>
      <Actions d={d} go={go} />
      <Breakdown d={d} go={go} />
      <section className="stack tight" aria-label="Recent entries">
        <div className="section-head">
          <h2 className="h2">Recent</h2>
          {txs.length > 0 && <button className="link" onClick={() => go('history', { from: `${m}-01`, to: monthEnd(m) })}>See all</button>}
        </div>
        {txs.length === 0 && <Empty icon="plus">No entries this month. Tap + to add one.</Empty>}
        <ul className="list">
          {txs.slice(0, 5).map((t) => <TxRow key={t.id} tx={t} category={byId.get(t.categoryId)} showDate onClick={() => onEdit(t)} />)}
        </ul>
      </section>
    </div>
  )
}

import React, { useState } from 'react'
import MonthNav from '../components/MonthNav.jsx'
import LineChart from '../components/LineChart.jsx'
import { Empty, Stat } from '../components/Bits.jsx'
import { useMonthData } from '../hooks/useMonthData.js'
import {
  categoryDeltas, cumulativeSeries, noSpendDays, projectSpend, recommendedCap, recurringCommitments,
  scenarioProjection, topEntries, weekdayAverages,
} from '../lib/insights.js'
import { formatMoney, formatTaka } from '../lib/money.js'
import { daysInMonth, monthName, shortDay } from '../lib/dates.js'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const WEEKDAYS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const sumExpense = (txs) => txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
const pctChange = (value, base) => (base > 0 ? Math.round(((value - base) / base) * 100) : null)

function Forecast({ d, go }) {
  const { info, scopeTxs, prevScopeTxs, prevScopeTotal, hasBudget, totals, prevMonth, month, unbudgeted } = d
  const live = info.isCurrent
  const spent = sumExpense(scopeTxs)
  const forecast = live ? projectSpend(spent, info.day, info.total) : spent
  const diff = forecast - totals.budget
  const vsPrev = pctChange(forecast, prevScopeTotal)
  const series = cumulativeSeries(scopeTxs, info.day)
  const prevSeries = cumulativeSeries(prevScopeTxs, daysInMonth(prevMonth))
  const eyebrow = live ? `Forecast for ${monthName(month)}` : `Spending in ${monthName(month)}`

  return (
    <section className="card" aria-label="Forecast" style={{ borderRadius: 22 }}>
      <div className="eyebrow">{eyebrow}</div>
      <div className="fig" style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', marginTop: 6 }}>{formatTaka(forecast)}</div>
      <div className="muted" style={{ marginTop: 2 }}>
        {live ? 'total spending if you keep today’s daily pace' : 'total spending'}{hasBudget ? ' in budgeted categories' : ''}
      </div>

      <div className="trio" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', marginTop: 14 }}>
        {hasBudget ? (
          <div className="stat" style={{ background: diff > 0 ? 'var(--orange-tint)' : 'var(--blue-tint)', border: 0, borderRadius: 14, padding: '10px 12px' }}>
            <div className="eyebrow" style={{ fontSize: 11, color: diff > 0 ? 'var(--orange-ink)' : 'var(--blue-ink)' }}>vs budget {formatTaka(totals.budget)}</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: diff > 0 ? 'var(--orange-ink)' : 'var(--blue-ink)', marginTop: 2 }}>
              {diff > 0 ? `▲ ${formatTaka(diff)} over` : `▼ ${formatTaka(-diff)} under`}
            </div>
          </div>
        ) : (
          <button className="stat" style={{ textAlign: 'left', color: 'var(--ink)' }} onClick={() => go('budgets')}>
            <div className="eyebrow" style={{ fontSize: 11 }}>No budgets yet</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>Set budgets to compare</div>
          </button>
        )}
        <div className="stat" style={{ background: 'var(--ground)', border: 0, borderRadius: 14, padding: '10px 12px' }}>
          <div className="eyebrow" style={{ fontSize: 11 }}>vs {monthName(prevMonth)} {formatTaka(prevScopeTotal)}</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginTop: 2 }}>
            {vsPrev == null ? 'No data' : vsPrev === 0 ? 'Same' : `${vsPrev > 0 ? '▲' : '▼'} ${Math.abs(vsPrev)}% ${vsPrev > 0 ? 'more' : 'less'}`}
          </div>
        </div>
      </div>

      <LineChart series={series} prev={prevSeries} day={info.day} total={info.total} forecast={forecast} budget={totals.budget} live={live} />
      <div className="legend-row">
        <span><i style={{ borderTop: '3px solid var(--blue)' }} />This month</span>
        {live && <span><i style={{ borderTop: '3px dotted var(--orange)' }} />Projected</span>}
        <span><i style={{ borderTop: '2px dashed var(--muted)' }} />{monthName(prevMonth)}</span>
        {hasBudget && <span><i style={{ borderTop: '2px dashed var(--ink)' }} />Budget</span>}
      </div>
      {unbudgeted > 0 && <p className="muted small" style={{ marginTop: 8 }}>Plus {formatMoney(unbudgeted)} in categories without a budget.</p>}
    </section>
  )
}

function WhatIf({ d }) {
  const { info, scopeTxs, rows, byId, hasBudget, totals } = d
  const [catId, setCatId] = useState(null)
  const [capInput, setCapInput] = useState(null)
  const spent = sumExpense(scopeTxs)
  const byCat = new Map()
  for (const t of scopeTxs) if (t.type === 'expense') byCat.set(t.categoryId, (byCat.get(t.categoryId) || 0) + t.amount)
  const options = [...byCat.entries()].sort((a, b) => b[1] - a[1])
  if (!info.isCurrent || info.daysLeft <= 0 || options.length === 0) return null

  const id = byCat.has(catId) ? catId : options[0][0]
  const catSpent = byCat.get(id)
  const rate = Math.round(catSpent / info.day)
  const recommended = hasBudget ? recommendedCap({ budget: totals.budget, spent, catSpent, day: info.day, total: info.total }) : 0
  const cap = capInput ?? (recommended > 0 ? recommended : Math.round(rate / 2 / 5000) * 5000)
  const max = Math.max(5000, Math.ceil((rate * 1.25) / 5000) * 5000)
  const now = projectSpend(spent, info.day, info.total)
  const projected = scenarioProjection({ spent, catSpent, day: info.day, total: info.total, cap })
  const saved = now - projected
  const vsBudget = projected - totals.budget
  const name = byId.get(id)?.name || 'Category'

  return (
    <section className="card" aria-label="What if">
      <h2 className="h2">Make it work</h2>
      <p className="muted" style={{ marginTop: 4 }}>
        Limit {options.length > 1 ? '' : name.toLowerCase()}
        {options.length > 1 && (
          <select className="chip" style={{ minHeight: 32, margin: '0 6px', fontSize: 14 }} aria-label="Category" value={id} onChange={(e) => { setCatId(Number(e.target.value)); setCapInput(null) }}>
            {options.map(([cid]) => <option key={cid} value={cid}>{byId.get(cid)?.name}</option>)}
          </select>
        )}
        {' '}per day and see where the month ends.
      </p>

      <div className="between" style={{ alignItems: 'baseline', marginTop: 18 }}>
        <strong style={{ fontSize: 16 }}>{name} cap · <span className="pos">{formatTaka(cap)}/day</span></strong>
        <span className="small over-ink" style={{ fontWeight: 600 }}>Now {formatTaka(rate)}/day</span>
      </div>
      <input className="range" type="range" min="0" max={max / 100} step="50" value={cap / 100} aria-label={`Daily ${name} cap in taka`}
        onChange={(e) => setCapInput(Number(e.target.value) * 100)} style={{ marginTop: 8 }} />
      <div className="between muted small"><span>৳0</span><span>{formatTaka(max)}</span></div>

      <div className="result" style={{ marginTop: 14 }}>
        <div>
          <div className="eyebrow" style={{ color: 'var(--blue-ink)', fontSize: 12 }}>Month ends at about</div>
          <div className="fig">{formatTaka(projected)}</div>
        </div>
        <div className="side">
          {saved >= 0 ? `▼ ${formatTaka(saved)} less` : `▲ ${formatTaka(-saved)} more`}
          {hasBudget && <><br /><span style={{ fontWeight: 600 }}>{vsBudget > 0 ? `${formatTaka(vsBudget)} over budget` : `${formatTaka(-vsBudget)} under budget`}</span></>}
        </div>
      </div>
      <p className="muted small" style={{ marginTop: 10 }}>A what-if calculator. It doesn’t change your budgets.</p>
    </section>
  )
}

function Kpis({ d }) {
  const { info, summary, txs, prevTxs, prevMonth, rules, month, prevAllTotal } = d
  const day = info.day || info.total
  const live = info.isCurrent
  const projAll = live ? projectSpend(summary.expense, info.day, info.total) : summary.expense
  const savings = summary.income > 0 ? Math.round(((summary.income - projAll) / summary.income) * 100) : null
  const avg = Math.round(summary.expense / Math.max(info.day, 1))
  const prevAvg = Math.round(prevAllTotal / daysInMonth(prevMonth))
  const avgChange = pctChange(avg, prevAvg)
  const fixed = recurringCommitments(txs, rules, month)
  const nsd = noSpendDays(txs, day)
  const prevNsd = noSpendDays(prevTxs, day)

  return (
    <section className="kpis" aria-label="Key numbers">
      <Stat label="Savings rate">{savings == null ? '–' : `${savings}%`}
        <div className="small muted" style={{ fontFamily: 'var(--font-body)', fontWeight: 400, letterSpacing: 0 }}>{savings == null ? 'Add income to see this' : live ? 'of income, projected for the month' : 'of income saved'}</div>
      </Stat>
      <Stat label="Daily average">{formatTaka(avg)}
        <div className={`small ${avgChange > 0 ? 'over-ink' : avgChange < 0 ? 'pos' : 'muted'}`} style={{ fontFamily: 'var(--font-body)', fontWeight: 600, letterSpacing: 0 }}>
          {avgChange == null ? 'No data last month' : avgChange === 0 ? `Same as ${monthName(prevMonth)}` : `${avgChange > 0 ? '▲' : '▼'} ${Math.abs(avgChange)}% vs ${monthName(prevMonth)} (${formatTaka(prevAvg)})`}
        </div>
      </Stat>
      <Stat label="Fixed costs">{rules.length === 0 ? 'None' : formatTaka(fixed.committed)}
        <div className="small muted" style={{ fontFamily: 'var(--font-body)', fontWeight: 400, letterSpacing: 0 }}>
          {rules.length === 0 ? 'No recurring items yet' : fixed.upcoming > 0 ? `recurring, ${formatTaka(fixed.upcoming)} still to come` : 'recurring this month'}
        </div>
      </Stat>
      <Stat label="No-spend days">{nsd} of {day}
        <div className="small muted" style={{ fontFamily: 'var(--font-body)', fontWeight: 400, letterSpacing: 0 }}>{monthName(prevMonth)} had {prevNsd} by day {day}</div>
      </Stat>
    </section>
  )
}

function Changes({ d }) {
  const { txs, prevTxs, info, byId, prevMonth } = d
  const day = info.day || info.total
  const deltas = categoryDeltas(txs, prevTxs, day).filter((x) => x.delta !== 0).slice(0, 6)
  const prevSame = prevTxs.filter((t) => t.type === 'expense' && Number(t.date.slice(8, 10)) <= day).reduce((s, t) => s + t.amount, 0)
  if (prevSame === 0 || deltas.length === 0) return null
  const total = sumExpense(txs) - prevSame
  const top = deltas[0]
  const topName = byId.get(top.categoryId)?.name || 'Other'
  const P = Math.max(0, ...deltas.map((x) => x.delta))
  const N = Math.max(0, ...deltas.map((x) => -x.delta))
  const axis = N === 0 ? 0 : P === 0 ? 100 : Math.max(12, Math.min(50, (N / (N + P)) * 100))

  const headline = top.delta > 0 && total > 0 && top.delta > total
    ? <><strong>{topName} alone rose {formatMoney(top.delta)}</strong>, more than the whole increase.</>
    : <><strong>{topName}</strong> changed the most: {top.delta > 0 ? '+' : '−'}{formatMoney(Math.abs(top.delta))}.</>

  return (
    <section className="card" aria-label="What changed">
      <h2 className="h2">What changed since {monthName(prevMonth)}</h2>
      <p className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
        Same {day} days, {formatMoney(Math.abs(total))} {total >= 0 ? 'more' : 'less'} in total. {headline}
      </p>
      <div style={{ marginTop: 12 }}>
        {deltas.map((x) => {
          const up = x.delta > 0
          const w = up ? (x.delta / P) * (100 - axis) : (-x.delta / N) * axis
          return (
            <div key={x.categoryId} className="diverge">
              <span style={{ fontWeight: 600 }}>{byId.get(x.categoryId)?.name || 'Other'}</span>
              <div className="area" role="img" aria-label={`${up ? 'up' : 'down'} ${formatMoney(Math.abs(x.delta))}`}>
                <div className="axis" style={{ left: `${axis}%` }} />
                <div className="bar" style={up
                  ? { left: `${axis}%`, width: `${w}%`, background: 'var(--orange)', borderRadius: '0 7px 7px 0' }
                  : { left: `${axis - w}%`, width: `${w}%`, background: 'var(--blue)', borderRadius: '7px 0 0 7px' }} />
              </div>
              <span style={{ textAlign: 'right', fontWeight: 700 }} className={up ? 'over-ink' : 'pos'}>{up ? '+' : '−'}{formatMoney(Math.abs(x.delta))}</span>
            </div>
          )
        })}
      </div>
      <div className="muted small row" style={{ gap: 16, marginTop: 6 }}><span>▲ spent more</span><span>▼ spent less</span></div>
    </section>
  )
}

function Weekdays({ d }) {
  const { txs, info, month } = d
  const day = info.day || info.total
  if (day < 7) return null
  const avgs = weekdayAverages(txs, month, day)
  const max = Math.max(...avgs.map((a) => a.avg))
  if (max === 0) return null
  const topIdx = avgs.findIndex((a) => a.avg === max)
  const others = avgs.filter((_, i) => i !== topIdx && avgs[i].avg > 0)
  const otherAvg = others.length ? others.reduce((s, a) => s + a.avg, 0) / others.length : 0
  const ratio = otherAvg > 0 ? max / otherAvg : null
  const k = (v) => (v >= 100000 ? `${(v / 100000).toFixed(1).replace(/\.0$/, '')}k` : `${Math.round(v / 100)}`)

  return (
    <section className="card" aria-label="Costliest days">
      <h2 className="h2">Your costliest days</h2>
      <p className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
        {WEEKDAYS_LONG[topIdx]}s average <strong style={{ color: 'var(--ink)' }}>{formatTaka(max)}</strong>
        {ratio && ratio >= 1.3 ? `, about ${ratio.toFixed(1).replace(/\.0$/, '')}× your other days.` : '.'}
      </p>
      <div className="weekbars" style={{ marginTop: 14 }} role="img" aria-label={`Average spending by weekday: ${avgs.map((a, i) => `${WEEKDAYS[i]} ${formatTaka(a.avg)}`).join(', ')}`}>
        {avgs.map((a, i) => (
          <div key={WEEKDAYS[i]} className={i === topIdx ? 'top' : ''}>
            <span>{k(a.avg)}</span>
            <div className="b" style={{ height: `${(a.avg / max) * 110}px` }} />
          </div>
        ))}
      </div>
      <div className="weeklabels">{WEEKDAYS.map((w, i) => <span key={w} className={i === topIdx ? 'top' : ''}>{w}</span>)}</div>
    </section>
  )
}

function Biggest({ d }) {
  const { txs, byId, subById } = d
  const { top, share } = topEntries(txs, 4)
  if (top.length === 0) return null
  return (
    <section className="card" aria-label="Biggest entries">
      <h2 className="h2">Biggest entries</h2>
      <p className="muted" style={{ marginTop: 6 }}>{top.length === 1 ? 'Your biggest entry' : `These ${top.length} make up ${Math.round(share * 100)}% of this month’s spending.`}</p>
      <div className="divided" style={{ marginTop: 8 }}>
        {top.map(({ tx, share: s }, i) => (
          <div key={tx.id} className="line-row" style={{ gridTemplateColumns: '28px minmax(0,1fr) auto', minHeight: 56 }}>
            <span className="fig muted" style={{ fontSize: 18 }}>{i + 1}</span>
            <div>
              <div style={{ fontWeight: 600 }}>{tx.note || subById.get(tx.subcategoryId)?.name || byId.get(tx.categoryId)?.name}</div>
              <div className="muted small">{byId.get(tx.categoryId)?.name}{subById.get(tx.subcategoryId) ? ` › ${subById.get(tx.subcategoryId).name}` : ''} · {shortDay(tx.date)}{tx.recurringId ? ' · recurring' : ''}</div>
            </div>
            <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 700 }}>{formatMoney(tx.amount)}</div><div className="muted small">{Math.round(s * 100)}%</div></div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function Insights({ month, onMonth, go }) {
  const d = useMonthData(month)
  if (!d.ready) return null
  const empty = d.summary.expense === 0
  return (
    <div className="stack">
      <h1 className="title">Insights</h1>
      <MonthNav month={month} onChange={onMonth} />
      {d.info.isFuture ? <Empty icon="calendar">This month has not started yet.</Empty>
        : empty ? <Empty icon="chart">Add a few expenses and this screen will show where your money goes and where the month is heading.</Empty>
        : (
          <>
            <Forecast d={d} go={go} />
            <WhatIf d={d} />
            <Kpis d={d} />
            <Changes d={d} />
            <Weekdays d={d} />
            <Biggest d={d} />
          </>
        )}
    </div>
  )
}

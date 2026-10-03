// Pure analytics over transactions/budgets. Amounts are minor units. Nothing here touches React or the DB.
import { daysInMonth, monthEnd, weekdayIndex, daysBetween, shortDay } from './dates.js'
import { dueDates } from './recurring.js'
import { formatMoney, formatTaka } from './money.js'

const DAY = (iso) => Number(iso.slice(8, 10))
const expenses = (txs) => txs.filter((t) => t.type === 'expense')

// Where we are in `month` as of `todayISO`. Past months are complete, future months haven't started.
export function monthInfo(month, todayISO) {
  const total = daysInMonth(month)
  const current = todayISO.slice(0, 7)
  const day = month < current ? total : month > current ? 0 : DAY(todayISO)
  return { total, day, daysLeft: total - day, ratio: day / total, isCurrent: month === current, isPast: month < current, isFuture: month > current }
}

export const projectSpend = (spent, day, total) => (day > 0 ? Math.round((spent / day) * total) : 0)

// What you can spend per remaining day. On the last day it is simply what's left.
export function allowance(budget, spent, daysLeft) {
  const left = budget - spent
  return { left, perDay: daysLeft > 0 ? Math.round(left / daysLeft / 100) * 100 : left, daysLeft }
}

// Cumulative expense after each day 1..throughDay.
export function cumulativeSeries(txs, throughDay) {
  const perDay = new Array(throughDay).fill(0)
  for (const t of expenses(txs)) {
    const d = DAY(t.date)
    if (d >= 1 && d <= throughDay) perDay[d - 1] += t.amount
  }
  let run = 0
  return perDay.map((v) => (run += v))
}

export const spentThroughDay = (txs, day) => expenses(txs).filter((t) => DAY(t.date) <= day).reduce((s, t) => s + t.amount, 0)

// Change vs the previous month over the same days, grouped by `keyFn(tx)`. Biggest swings first.
export function groupDeltas(curTxs, prevTxs, throughDay, keyFn) {
  const cur = new Map()
  const prev = new Map()
  for (const t of expenses(curTxs)) cur.set(keyFn(t), (cur.get(keyFn(t)) || 0) + t.amount)
  for (const t of expenses(prevTxs)) {
    if (DAY(t.date) <= throughDay) prev.set(keyFn(t), (prev.get(keyFn(t)) || 0) + t.amount)
  }
  const keys = new Set([...cur.keys(), ...prev.keys()])
  return [...keys]
    .map((key) => {
      const c = cur.get(key) || 0
      const p = prev.get(key) || 0
      return { key, cur: c, prev: p, delta: c - p, pct: p > 0 ? Math.round(((c - p) / p) * 100) : null }
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
}

// Per-category change vs the previous month over the same days.
export const categoryDeltas = (curTxs, prevTxs, throughDay) =>
  groupDeltas(curTxs, prevTxs, throughDay, (t) => t.categoryId).map(({ key, ...r }) => ({ categoryId: key, ...r }))

// Average expense per weekday (Mon..Sun) over the days elapsed so far.
export function weekdayAverages(txs, month, throughDay) {
  const totals = new Array(7).fill(0)
  const counts = new Array(7).fill(0)
  for (let d = 1; d <= throughDay; d++) counts[weekdayIndex(`${month}-${String(d).padStart(2, '0')}`)]++
  for (const t of expenses(txs)) if (DAY(t.date) <= throughDay) totals[weekdayIndex(t.date)] += t.amount
  return totals.map((total, i) => ({ total, avg: counts[i] ? Math.round(total / counts[i]) : 0 }))
}

export function noSpendDays(txs, throughDay) {
  const spent = new Set(expenses(txs).map((t) => DAY(t.date)))
  let n = 0
  for (let d = 1; d <= throughDay; d++) if (!spent.has(d)) n++
  return n
}

export function topEntries(txs, n = 4) {
  const ex = expenses(txs)
  const total = ex.reduce((s, t) => s + t.amount, 0)
  const top = [...ex].sort((a, b) => b.amount - a.amount || b.id - a.id).slice(0, n)
  return { top: top.map((tx) => ({ tx, share: total ? tx.amount / total : 0 })), share: total ? top.reduce((s, t) => s + t.amount, 0) / total : 0 }
}

// Recurring money for the month: already booked, and still to come (unbooked occurrences up to month end).
export function recurringCommitments(txs, rules, month) {
  const committed = expenses(txs).filter((t) => t.recurringId != null).reduce((s, t) => s + t.amount, 0)
  const start = `${month}-01`
  const end = monthEnd(month)
  let upcoming = 0
  for (const r of rules) {
    if (!r.active || r.type !== 'expense') continue
    upcoming += dueDates(r, end).filter((d) => d >= start).length * r.amount
  }
  return { committed: committed + upcoming, upcoming }
}

// Where the month ends if `cap` per day goes to one category and everything else continues at its current daily rate.
export function scenarioProjection({ spent, catSpent, day, total, cap }) {
  if (day <= 0) return 0
  const daysLeft = total - day
  const othersRate = (spent - catSpent) / day
  return Math.round(spent + othersRate * daysLeft + cap * daysLeft)
}

// Largest daily cap (in steps of ৳50) that still finishes within `budget`; 0 if none does.
export function recommendedCap({ budget, spent, catSpent, day, total }) {
  const daysLeft = total - day
  if (day <= 0 || daysLeft <= 0) return 0
  const room = budget - spent - ((spent - catSpent) / day) * daysLeft
  const cap = Math.floor(room / daysLeft / 5000) * 5000
  return cap > 0 ? cap : 0
}

// Move unused budget from the roomiest category to cover an overage. Returns null if no donor can cover it.
export function suggestMove(rows) {
  const over = rows.filter((r) => r.state === 'over').sort((a, b) => a.remaining - b.remaining)[0]
  if (!over) return null
  const amount = -over.remaining
  const donor = rows.filter((r) => r.categoryId !== over.categoryId && r.state === 'ok' && r.remaining >= amount).sort((a, b) => b.remaining - a.remaining)[0]
  return donor ? { fromId: donor.categoryId, toId: over.categoryId, amount, donorRemaining: donor.remaining, donorRatio: donor.ratio } : null
}

// "Do this next": data-driven cards, most urgent first. `rows` are budgetStatus() results with a `name`.
export function buildActions({ info, rows, totals, prevByCategory, rules, todayISO }) {
  const out = []
  const names = (r) => r.name.toLowerCase()

  for (const r of rows.filter((x) => x.state === 'over')) {
    const over = -r.remaining
    let detail
    if (info.daysLeft === 0) detail = `The month is over. Consider raising this budget next month.`
    else {
      const cap = recommendedCap({ budget: totals.budget, spent: totals.spent, catSpent: r.spent, day: info.day, total: info.total })
      const perDay = Math.round(r.spent / info.day / 100) * 100
      detail = cap > 0
        ? `You're spending ${formatTaka(perDay)} a day on ${names(r)}. Keeping it near ${formatTaka(cap)} a day would finish the month within your total budget.`
        : `Even with no more spending on ${names(r)}, the month will end over budget. Move budget from a category with room, or pause it.`
    }
    out.push({ id: `over-${r.categoryId}`, kind: 'over', weight: 3e12 + over, categoryId: r.categoryId, title: `${r.name} is ${formatMoney(over)} over its budget`, detail, cta: { label: `See ${names(r)} entries`, go: 'history' } })
  }

  for (const r of rows.filter((x) => x.state === 'warn')) {
    const perDay = info.daysLeft > 0 ? Math.round(r.remaining / info.daysLeft / 100) * 100 : r.remaining
    const prev = prevByCategory.get(r.categoryId) || 0
    out.push({
      id: `warn-${r.categoryId}`, kind: 'warn', weight: 2e12 + r.ratio * 1e6, categoryId: r.categoryId,
      title: info.daysLeft > 0 ? `${r.name} has ${formatMoney(r.remaining)} left for ${info.daysLeft} days` : `${r.name} has ${formatMoney(r.remaining)} left`,
      detail: `${info.daysLeft > 0 ? `That's ${formatTaka(perDay)} a day. ` : ''}${prev > 0 ? `By this day last month you had spent ${formatTaka(prev)} on ${names(r)}.` : ''}`.trim(),
      cta: { label: 'Review entries', go: 'history' },
    })
  }

  for (const rule of rules.filter((x) => x.active)) {
    const next = dueDates(rule, monthEnd(todayISO.slice(0, 7))).find((d) => d > todayISO)
    const days = next ? daysBetween(todayISO, next) : null
    if (days == null || days > 7) continue
    const label = rule.label || rule.note || 'Recurring'
    out.push({
      id: `due-${rule.id}`, kind: 'upcoming', weight: 1e12 - days,
      title: `${label} ${formatMoney(rule.amount)} ${rule.type === 'income' ? 'is expected' : 'is due'} on ${shortDay(next).replace(/^\w+ /, '')}`,
      detail: `Recurring ${rule.frequency === 'weekly' ? 'weekly' : 'monthly'} ${rule.type}, ${days === 1 ? 'tomorrow' : `in ${days} days`}.`,
      cta: { label: 'View recurring', go: 'recurring' },
    })
  }

  if (rows.length === 0 && totals.anySpending) {
    out.push({ id: 'setup', kind: 'setup', weight: 0, title: 'Set budgets to get a daily allowance', detail: 'Give each category a monthly limit and this screen will tell you what is safe to spend each day.', cta: { label: 'Set budgets', go: 'budgets' } })
  }
  return out.sort((a, b) => b.weight - a.weight)
}

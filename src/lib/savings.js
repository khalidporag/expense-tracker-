// Savings plans and the monthly savings picture. Pure: no React, no DB. Amounts are minor units (poisha);
// rates are basis points (950 = 9.50% a year). Results are ESTIMATES: banks differ in compounding and rounding,
// and rates / source tax change, so the app never ships default rates, the user types what the bank quotes.
import { addMonths, daysBetween } from './dates.js'

const frac = (bp) => bp / 10000
const round = Math.round

// ---------- schemes ----------

// Net multiplier on one unit of installment: what each unit paid in monthly is worth at maturity, after tax.
// Installment at the START of each month, interest compounded quarterly (the usual DPS method):
//   sum over j=1..N of (1+i)^(j/3), i = rate/4.
function dpsFactor(termMonths, rateBp, taxBp) {
  const i = frac(rateBp) / 4
  const gross = i === 0 ? termMonths : ((1 + i) ** (1 / 3) * ((1 + i) ** (termMonths / 3) - 1)) / ((1 + i) ** (1 / 3) - 1)
  return termMonths + (gross - termMonths) * (1 - frac(taxBp))
}

// DPS / recurring deposit: the same installment every month for `termMonths`.
export function dpsMaturity({ installment, termMonths, rateBp, taxBp = 0 }) {
  const deposited = installment * termMonths
  const grossInterest = round(installment * dpsFactor(termMonths, rateBp, 0) - deposited)
  const netInterest = round(installment * dpsFactor(termMonths, rateBp, taxBp) - deposited)
  return { deposited, grossInterest, tax: grossInterest - netInterest, netInterest, maturity: deposited + netInterest }
}

// One-time deposit (Sanchay Patra, fixed deposit).
//   payout 'monthly' | 'quarterly': profit is paid out along the way, the principal comes back at the end.
//   payout 'maturity': profit is added and compounded quarterly, everything is paid at the end.
export function lumpOutcome({ principal, termMonths, rateBp, taxBp = 0, payout = 'maturity' }) {
  const r = frac(rateBp)
  const keep = 1 - frac(taxBp)
  if (payout === 'maturity') {
    const gross = round(principal * ((1 + r / 4) ** (termMonths / 3) - 1))
    const netProfit = round(gross * keep)
    return { payout, periods: 1, grossPerPayout: gross, netPerPayout: netProfit, grossProfit: gross, tax: gross - netProfit, netProfit, maturity: principal + netProfit, totalReturn: principal + netProfit }
  }
  const perYear = payout === 'monthly' ? 12 : 4
  const periods = Math.floor(termMonths / (12 / perYear))
  const grossPerPayout = round((principal * r) / perYear)
  const netPerPayout = round(grossPerPayout * keep)
  const grossProfit = grossPerPayout * periods
  const netProfit = netPerPayout * periods
  return { payout, periods, grossPerPayout, netPerPayout, grossProfit, tax: grossProfit - netProfit, netProfit, maturity: principal, totalReturn: principal + netProfit }
}

// Monthly amount needed to reach `target` in `termMonths`, optionally earning interest like a DPS.
export function goalMonthly({ target, termMonths, rateBp = 0, taxBp = 0 }) {
  if (termMonths <= 0) return target
  return Math.ceil(target / dpsFactor(termMonths, rateBp, taxBp))
}

// What a plan is expected to pay out, assuming every deposit is made on schedule.
export function projection(plan) {
  if (plan.kind === 'dps') {
    const o = dpsMaturity(plan)
    return { ...o, total: o.maturity, profit: o.netInterest }
  }
  if (plan.kind === 'lump') {
    const o = lumpOutcome(plan)
    return { ...o, total: o.totalReturn, profit: o.netProfit, deposited: plan.principal }
  }
  return { deposited: plan.target, total: plan.target, profit: 0, maturity: plan.target }
}

// The scheduled monthly deposit for a plan (0 for one-time deposits).
export const monthlyAmount = (plan) => (plan.kind === 'lump' ? 0 : plan.installment || 0)

// ---------- where a plan stands today ----------

export function planStatus(plan, deposits, todayISO) {
  const mine = deposits.filter((d) => d.planId === plan.id)
  const deposited = mine.reduce((s, d) => s + d.amount, 0)
  const maturityDate = addMonths(plan.startDate, plan.termMonths)
  const month = todayISO.slice(0, 7)
  const started = plan.startDate <= todayISO
  const matured = maturityDate <= todayISO
  const state = !started ? 'upcoming' : matured ? 'matured' : 'running'

  let due = 0 // scheduled deposits that have come due so far (monthly plans)
  while (due < plan.termMonths && addMonths(plan.startDate, due) <= todayISO) due++
  const monthly = plan.kind !== 'lump'
  const expectedByNow = plan.kind === 'lump' ? (started ? plan.principal : 0) : due * (plan.installment || 0)
  const total = plan.kind === 'lump' ? plan.principal : plan.kind === 'goal' ? plan.target : plan.installment * plan.termMonths
  const elapsed = Math.min(plan.termMonths, due)

  // This month's scheduled deposit, if any, and whether it is still unpaid.
  let dueDate = null
  if (monthly && state !== 'matured') {
    for (let k = 0; k < plan.termMonths; k++) {
      const d = addMonths(plan.startDate, k)
      if (d.slice(0, 7) === month) { dueDate = d; break }
    }
  }
  const paidThisMonth = mine.some((d) => d.date.startsWith(month))
  const unpaid = monthly && dueDate != null && !paidThisMonth
  return {
    state, deposited, total, maturityDate, expectedByNow,
    behind: Math.max(0, expectedByNow - deposited),
    monthsLeft: matured ? 0 : Math.max(0, Math.ceil(daysBetween(todayISO, maturityDate) / 30.4375)),
    progress: total > 0 ? Math.min(1, plan.kind === 'lump' ? elapsed / plan.termMonths : deposited / total) : 0,
    elapsedMonths: elapsed,
    paidThisMonth, dueDate: unpaid ? dueDate : null, overdue: unpaid && dueDate < todayISO,
  }
}

// What the running monthly plans add up to each month.
export const committedMonthly = (plans, todayISO) => plans
  .filter((p) => p.kind !== 'lump' && p.active !== false && planStatus(p, [], todayISO).state === 'running')
  .reduce((s, p) => s + (p.installment || 0), 0)

// ---------- the monthly picture ----------

// The monthly savings target in minor units: a fixed amount, or a percentage of income
// (this month's income, or last month's if this month's hasn't arrived yet).
export function monthlyTarget(setting, income, prevIncome = 0) {
  if (!setting) return 0
  if (setting.mode === 'percent') return round(((income > 0 ? income : prevIncome) * (setting.percent || 0)) / 100)
  return setting.amount || 0
}

const rank = (map) => [...map.entries()].sort((a, b) => b[1] - a[1])

// Earned, spent (by category), saved (deposits into plans) and how that compares with the target.
// Deposits are NOT expenses: money moved into savings stays out of "spent".
export function monthReport({ month, txs, deposits, setting, prevIncome = 0 }) {
  const mine = txs.filter((t) => t.date.startsWith(month))
  const inc = new Map()
  const exp = new Map()
  let income = 0
  let expense = 0
  for (const t of mine) {
    const bucket = t.type === 'income' ? inc : exp
    bucket.set(t.categoryId, (bucket.get(t.categoryId) || 0) + t.amount)
    if (t.type === 'income') income += t.amount
    else expense += t.amount
  }
  const saved = deposits.filter((d) => d.date.startsWith(month)).reduce((s, d) => s + d.amount, 0)
  const target = monthlyTarget(setting, income, prevIncome)
  const pct = (v) => (income > 0 ? Math.round((v / income) * 100) : null)
  return {
    month, income, expense, kept: income - expense, saved, target,
    savedPct: pct(saved), spentPct: pct(expense),
    targetMet: target > 0 && saved >= target, shortfall: Math.max(0, target - saved),
    unallocated: income - expense - saved,
    incomeByCategory: rank(inc), expenseByCategory: rank(exp),
  }
}

// One report per month, oldest first. Each month's percentage target falls back to the month before's income.
export function savingsHistory(months, { txs, deposits, setting }) {
  let prevIncome = 0
  return months.map((month) => {
    const r = monthReport({ month, txs, deposits, setting, prevIncome })
    if (r.income > 0) prevIncome = r.income
    return r
  })
}

// Facts the "do this next" cards need about savings.
export function savingsSignals({ plans, deposits, todayISO, target, saved, kept }) {
  const due = []
  const maturing = []
  for (const p of plans.filter((x) => x.active !== false)) {
    const s = planStatus(p, deposits, todayISO)
    if (s.dueDate) due.push({ name: p.name, amount: p.installment || 0, dueDate: s.dueDate, overdue: s.overdue, days: daysBetween(todayISO, s.dueDate) })
    if (s.state === 'running') {
      const days = daysBetween(todayISO, s.maturityDate)
      if (days <= 60) maturing.push({ name: p.name, date: s.maturityDate, days, amount: projection(p).total })
    }
  }
  return { target, saved, kept, due, maturing }
}

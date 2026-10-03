import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/index.js'
import { newestFirst } from './useMonth.js'
import { useCategories } from './useCategories.js'
import { useSubcategories } from './useSubcategories.js'
import { today, shiftMonth } from '../lib/dates.js'
import { monthInfo } from '../lib/insights.js'
import { summarize, budgetStatus } from '../lib/summary.js'

const range = (month) => db.transactions.where('date').between(`${month}-01`, `${month}-32`).toArray()

// Everything the Home / Insights / Budgets screens derive from one month.
// With budgets set, "scope" is the budgeted categories only, so spending, forecast and budget compare like with like.
export function useMonthData(month) {
  const prevMonth = shiftMonth(month, -1)
  const txs = useLiveQuery(async () => (await range(month)).sort(newestFirst), [month])
  const prevTxs = useLiveQuery(async () => (await range(prevMonth)).sort(newestFirst), [prevMonth])
  const budgets = useLiveQuery(() => db.budgets.toArray())
  const rules = useLiveQuery(() => db.recurring.toArray())
  const cats = useCategories()
  const subs = useSubcategories()
  const ready = !!(txs && prevTxs && budgets && rules && cats.ready && subs.ready)
  if (!ready) return { ready: false }

  const todayISO = today()
  const info = monthInfo(month, todayISO)
  const summary = summarize(txs)
  const rows = budgetStatus(budgets, txs)
    .filter((r) => cats.byId.has(r.categoryId))
    .map((r) => ({ ...r, name: cats.byId.get(r.categoryId).name }))
    .sort((a, b) => b.ratio - a.ratio)
  const hasBudget = rows.length > 0
  const budgetedIds = new Set(rows.map((r) => r.categoryId))
  const inScope = (t) => !hasBudget || budgetedIds.has(t.categoryId)
  const scopeTxs = txs.filter(inScope)
  const prevScopeTxs = prevTxs.filter(inScope)
  const sum = (arr) => arr.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const totals = {
    budget: rows.reduce((s, r) => s + r.limit, 0),
    spent: hasBudget ? rows.reduce((s, r) => s + r.spent, 0) : summary.expense,
    anySpending: summary.expense > 0,
  }

  return {
    ready, month, prevMonth, todayISO, info, txs, prevTxs, budgets, rules, cats: cats.list, byId: cats.byId, subById: subs.byId, subsByCategory: subs.byCategory,
    summary, rows, hasBudget, totals, scopeTxs, prevScopeTxs, prevScopeTotal: sum(prevScopeTxs), prevAllTotal: sum(prevTxs),
    unbudgeted: summary.expense - (hasBudget ? totals.spent : 0),
  }
}

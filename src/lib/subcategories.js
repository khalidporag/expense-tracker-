// Subcategories split ONE expense category into parts (Utility bills -> Electricity, Gas).
// A transaction keeps its normal categoryId and may carry an optional subcategoryId, so every
// category-level total and budget is unchanged. Pure helpers: no React, no DB.

// The subcategory a transaction counts under, or null ("Not assigned") if none or it no longer exists.
export const subKey = (t, validIds) => (t.subcategoryId != null && validIds.has(t.subcategoryId) ? t.subcategoryId : null)

// `txs` are expenses of ONE category in ONE period; `subs` are that category's subcategories.
// "Not assigned" (subId null) is listed last.
export function subBreakdown(txs, subs) {
  const valid = new Set(subs.map((s) => s.id))
  const names = new Map(subs.map((s) => [s.id, s.name]))
  const acc = new Map()
  let total = 0
  for (const t of txs) {
    const k = subKey(t, valid)
    const a = acc.get(k) || { amount: 0, count: 0 }
    a.amount += t.amount
    a.count += 1
    acc.set(k, a)
    total += t.amount
  }
  const rows = [...acc.entries()]
    .map(([subId, a]) => ({ subId, name: subId == null ? 'Not assigned' : names.get(subId), amount: a.amount, count: a.count, share: total ? a.amount / total : 0 }))
    .sort((a, b) => (a.subId == null) - (b.subId == null) || b.amount - a.amount)
  return { total, rows }
}

// Spending per month for `selection`: 'all', 'none' (not assigned) or a subcategory id.
export function monthSeries(txs, months, selection, subs) {
  const valid = new Set(subs.map((s) => s.id))
  const match = (t) => selection === 'all' || (selection === 'none' ? subKey(t, valid) === null : subKey(t, valid) === selection)
  return months.map((month) => ({ month, amount: txs.filter((t) => t.date.startsWith(month) && match(t)).reduce((s, t) => s + t.amount, 0) }))
}

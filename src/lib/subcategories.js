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

// ---- adding subcategories ----
const MAX_SUB_NAME = 40

// "Electricity, Gas\nWater" -> ['Electricity', 'Gas', 'Water']. Drops blanks and duplicates (case-insensitive),
// including names already in `existing`, and trims over-long names.
export function parseSubNames(text, existing = []) {
  const seen = new Set(existing.map((n) => n.trim().toLowerCase()))
  const out = []
  for (const raw of String(text || '').split(/[,;\n،]/)) {
    const name = raw.trim().replace(/\s+/g, ' ').slice(0, MAX_SUB_NAME)
    if (!name || seen.has(name.toLowerCase())) continue
    seen.add(name.toLowerCase())
    out.push(name)
  }
  return out
}

// One-tap ideas for a category, matched on its name. Never includes names already in use.
const SUGGESTIONS = [
  [/bill|utilit/, ['Electricity', 'Gas', 'Water', 'Internet', 'Phone', 'Rent']],
  [/food|grocer|meal|dining/, ['Groceries', 'Restaurant', 'Snacks', 'Tea & coffee']],
  [/transport|travel|commut|fuel/, ['Bus', 'Rickshaw', 'Ride share', 'Fuel']],
  [/shop|cloth/, ['Clothes', 'Electronics', 'Household']],
  [/health|medic/, ['Medicine', 'Doctor', 'Tests']],
  [/fun|entertain|leisure/, ['Movies', 'Games', 'Eating out', 'Subscriptions']],
  [/educat|school|study/, ['Tuition', 'Books', 'Fees']],
]
export function subSuggestions(categoryName, existing = []) {
  const name = String(categoryName || '').toLowerCase()
  const hit = SUGGESTIONS.find(([re]) => re.test(name))
  const used = new Set(existing.map((n) => n.trim().toLowerCase()))
  return (hit ? hit[1] : []).filter((s) => !used.has(s.toLowerCase()))
}

// ---- subcategory budgets ----
// A subcategory may carry an optional monthly `limit` (minor units): a share of its category's budget, not a second budget.
// `txs` are the month's entries; only expenses of the subcategories' category count. Same states as category budgets.
const WARN_AT = 0.8
export function subBudgetRows(subs, txs) {
  return subs
    .filter((s) => s.limit > 0)
    .map((s) => {
      const spent = txs.filter((t) => t.type === 'expense' && t.categoryId === s.categoryId && t.subcategoryId === s.id).reduce((a, t) => a + t.amount, 0)
      const ratio = spent / s.limit
      return { subId: s.id, name: s.name, limit: s.limit, spent, remaining: s.limit - spent, ratio, state: ratio > 1 ? 'over' : ratio >= WARN_AT ? 'warn' : 'ok' }
    })
    .sort((a, b) => b.ratio - a.ratio)
}

// How much of the category budget its subcategory limits use. `left` < 0 means they add up to more than the budget.
export const allocation = (subs, categoryLimit) => {
  const allocated = subs.reduce((s, x) => s + (x.limit > 0 ? x.limit : 0), 0)
  return { allocated, left: categoryLimit - allocated }
}

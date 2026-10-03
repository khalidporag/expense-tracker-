// Pure helpers over transaction/budget arrays. Amounts are minor units.
export function summarize(txs) {
  let income = 0
  let expense = 0
  const byCategory = new Map()
  for (const t of txs) {
    if (t.type === 'income') income += t.amount
    else {
      expense += t.amount
      byCategory.set(t.categoryId, (byCategory.get(t.categoryId) || 0) + t.amount)
    }
  }
  return { income, expense, balance: income - expense, byCategory }
}

const WARN_AT = 0.8

export function budgetStatus(budgets, monthTxs) {
  const { byCategory } = summarize(monthTxs)
  return budgets.map((b) => {
    const spent = byCategory.get(b.categoryId) || 0
    const ratio = b.limit > 0 ? spent / b.limit : 0
    const state = ratio > 1 ? 'over' : ratio >= WARN_AT ? 'warn' : 'ok'
    return { categoryId: b.categoryId, limit: b.limit, spent, remaining: b.limit - spent, ratio, state }
  })
}

export function filterTransactions(txs, { text = '', type = '', categoryId = null, subcategoryId = null, from = '', to = '' } = {}) {
  const q = text.trim().toLowerCase()
  return txs.filter(
    (t) =>
      (!q || (t.note || '').toLowerCase().includes(q)) &&
      (!type || t.type === type) &&
      (categoryId == null || t.categoryId === categoryId) &&
      (subcategoryId == null || t.subcategoryId === subcategoryId) &&
      (!from || t.date >= from) &&
      (!to || t.date <= to),
  )
}

export function groupByDate(txs) {
  const groups = []
  for (const t of txs) {
    const last = groups[groups.length - 1]
    if (last && last.date === t.date) last.items.push(t)
    else groups.push({ date: t.date, items: [t] })
  }
  return groups
}

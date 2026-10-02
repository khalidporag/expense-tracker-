import { db } from './index.js'
import { dueDates } from '../lib/recurring.js'
import { today } from '../lib/dates.js'

// ---- transactions ----
export const saveTransaction = (t) => (t.id ? db.transactions.put(t) : db.transactions.add(t))
export const deleteTransaction = (id) => db.transactions.delete(id)

// ---- categories ----
export const saveCategory = (c) => (c.id ? db.categories.put(c) : db.categories.add(c))

// Deleting a category never loses data: its transactions and recurring rules move to "Other".
export async function deleteCategory(id) {
  await db.transaction('rw', db.categories, db.transactions, db.recurring, db.budgets, async () => {
    const cat = await db.categories.get(id)
    if (!cat || cat.system) return
    const other = await db.categories.where('kind').equals(cat.kind).filter((c) => c.system).first()
    await db.transactions.where('categoryId').equals(id).modify({ categoryId: other.id })
    await db.recurring.filter((r) => r.categoryId === id).modify({ categoryId: other.id })
    await db.budgets.where('categoryId').equals(id).delete()
    await db.categories.delete(id)
  })
}

// ---- budgets (limit 0 or empty removes the budget) ----
export async function setBudget(categoryId, limit) {
  const existing = await db.budgets.where('categoryId').equals(categoryId).first()
  if (!(limit > 0)) return existing && db.budgets.delete(existing.id)
  return existing ? db.budgets.update(existing.id, { limit }) : db.budgets.add({ categoryId, limit })
}

// ---- recurring ----
export async function saveRecurring(r) {
  await (r.id ? db.recurring.put(r) : db.recurring.add({ ...r, lastGenerated: null }))
  await runRecurring() // a rule starting today or in the past takes effect immediately
}
export const deleteRecurring = (id) => db.recurring.delete(id) // generated transactions are kept

// Creates transactions for every due occurrence. Idempotent: lastGenerated advances in the same DB transaction.
export async function runRecurring(upTo = today()) {
  await db.transaction('rw', db.recurring, db.transactions, async () => {
    const rules = (await db.recurring.toArray()).filter((r) => r.active)
    for (const rule of rules) {
      const dates = dueDates(rule, upTo)
      if (!dates.length) continue
      await db.transactions.bulkAdd(
        dates.map((date) => ({
          type: rule.type,
          amount: rule.amount,
          categoryId: rule.categoryId,
          date,
          note: rule.note || '',
          recurringId: rule.id,
        })),
      )
      await db.recurring.update(rule.id, { lastGenerated: dates[dates.length - 1] })
    }
  })
}

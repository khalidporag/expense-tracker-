import { db } from './index.js'
import { dueDates } from '../lib/recurring.js'
import { today } from '../lib/dates.js'

// ---- transactions ----
export const saveTransaction = (t) => (t.id ? db.transactions.put(t) : db.transactions.add(t))
export const deleteTransaction = (id) => db.transactions.delete(id)

// ---- categories ----
export const saveCategory = (c) => (c.id ? db.categories.put(c) : db.categories.add(c))

// Deleting a category never loses data: its transactions and recurring rules move to "Other"
// (their subcategory label goes, because it belonged to the deleted category).
export async function deleteCategory(id) {
  await db.transaction('rw', db.categories, db.subcategories, db.transactions, db.recurring, db.budgets, async () => {
    const cat = await db.categories.get(id)
    if (!cat || cat.system) return
    const other = await db.categories.where('kind').equals(cat.kind).filter((c) => c.system).first()
    const move = (row) => { row.categoryId = other.id; delete row.subcategoryId }
    await db.transactions.where('categoryId').equals(id).modify(move)
    await db.recurring.filter((r) => r.categoryId === id).modify(move)
    await db.budgets.where('categoryId').equals(id).delete()
    await db.subcategories.where('categoryId').equals(id).delete()
    await db.categories.delete(id)
  })
}

// ---- subcategories (optional detail under an expense category; budgets stay on the category) ----
// Returns the id so callers can select a subcategory they just created.
export async function saveSubcategory(sub) {
  if (sub.id) {
    await db.subcategories.put(sub)
    return sub.id
  }
  return db.subcategories.add(sub)
}

// Entries keep their category and amount; they just lose the subcategory label.
export async function deleteSubcategory(id) {
  await db.transaction('rw', db.subcategories, db.transactions, db.recurring, async () => {
    const unlabel = (row) => { delete row.subcategoryId }
    await db.transactions.where('subcategoryId').equals(id).modify(unlabel)
    await db.recurring.filter((r) => r.subcategoryId === id).modify(unlabel)
    await db.subcategories.delete(id)
  })
}

// ---- budgets (limit 0 or empty removes the budget) ----
export async function setBudget(categoryId, limit) {
  const existing = await db.budgets.where('categoryId').equals(categoryId).first()
  if (!(limit > 0)) return existing && db.budgets.delete(existing.id)
  return existing ? db.budgets.update(existing.id, { limit }) : db.budgets.add({ categoryId, limit })
}

// Shifts monthly budget from one category to another (the donor keeps at least ৳1).
export async function moveBudget(fromId, toId, amount) {
  await db.transaction('rw', db.budgets, async () => {
    const from = await db.budgets.where('categoryId').equals(fromId).first()
    const to = await db.budgets.where('categoryId').equals(toId).first()
    if (!from || !to || amount <= 0 || from.limit - amount < 100) return
    await db.budgets.update(from.id, { limit: from.limit - amount })
    await db.budgets.update(to.id, { limit: to.limit + amount })
  })
}

// ---- savings ----
export const setSetting = (key, value) => db.settings.put({ key, value })
export const clearSetting = (key) => db.settings.delete(key)

export async function savePlan(plan) {
  if (plan.id) {
    await db.plans.put(plan)
    return plan.id
  }
  return db.plans.add({ active: true, ...plan })
}

// Deleting a plan deletes its recorded deposits too (they only make sense under the plan).
export async function deletePlan(id) {
  await db.transaction('rw', db.plans, db.deposits, async () => {
    await db.deposits.where('planId').equals(id).delete()
    await db.plans.delete(id)
  })
}

export const addDeposit = (deposit) => db.deposits.add(deposit)
export const deleteDeposit = (id) => db.deposits.delete(id)

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
          ...(rule.subcategoryId != null ? { subcategoryId: rule.subcategoryId } : {}),
          date,
          note: rule.note || '',
          recurringId: rule.id,
        })),
      )
      await db.recurring.update(rule.id, { lastGenerated: dates[dates.length - 1] })
    }
  })
}

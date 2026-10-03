import { db } from './index.js'
import { normalizeIcon } from './seed.js'

const REQUIRED = ['categories', 'transactions', 'budgets', 'recurring']
const OPTIONAL = ['subcategories', 'plans', 'deposits', 'settings'] // older backups have none of these
const TABLES = [...REQUIRED, ...OPTIONAL]
const PLAN_KINDS = ['dps', 'lump', 'goal']
const FORMAT = 'expense-tracker-backup'

export async function exportBackup() {
  const data = { format: FORMAT, version: 4, exportedAt: new Date().toISOString() }
  for (const t of TABLES) data[t] = await db[t].toArray()
  return JSON.stringify(data, null, 2)
}

// Replaces ALL current data. Validates fully before touching the database.
export async function importBackup(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  if (data?.format !== FORMAT) throw new Error('That file is not an Expense Tracker backup.')
  for (const t of REQUIRED) if (!Array.isArray(data[t])) throw new Error(`Backup is missing "${t}".`)
  for (const t of OPTIONAL) {
    if (data[t] === undefined) data[t] = []
    if (!Array.isArray(data[t])) throw new Error(`Backup has an invalid "${t}" list.`)
  }
  data.categories = data.categories.map((c) => ({ ...c, icon: normalizeIcon(c.icon) }))
  // Keep only well-formed subcategories under existing categories; drop dangling labels from entries and rules.
  const catIds = new Set(data.categories.map((c) => c.id))
  data.subcategories = data.subcategories.filter((s) => s && s.name && catIds.has(s.categoryId))
  const subIds = new Set(data.subcategories.map((s) => s.id))
  const clean = (row) => {
    if (row.subcategoryId == null || subIds.has(row.subcategoryId)) return row
    const { subcategoryId, ...rest } = row
    return rest
  }
  data.transactions = data.transactions.map(clean)
  data.recurring = data.recurring.map(clean)
  // Savings: keep only well-formed plans, deposits that belong to a kept plan, and settings with a key.
  data.plans = data.plans.filter((p) => p && p.name && PLAN_KINDS.includes(p.kind) && typeof p.startDate === 'string' && p.termMonths > 0)
  const planIds = new Set(data.plans.map((p) => p.id))
  data.deposits = data.deposits.filter((d) => d && planIds.has(d.planId) && typeof d.date === 'string' && d.amount > 0)
  data.settings = data.settings.filter((s) => s && typeof s.key === 'string')
  await db.transaction('rw', TABLES.map((t) => db[t]), async () => {
    for (const t of TABLES) {
      await db[t].clear()
      await db[t].bulkAdd(data[t])
    }
  })
}

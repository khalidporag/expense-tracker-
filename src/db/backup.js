import { db } from './index.js'
import { normalizeIcon } from './seed.js'

const REQUIRED = ['categories', 'transactions', 'budgets', 'recurring']
const TABLES = [...REQUIRED, 'subcategories'] // subcategories are optional in files: older backups have none
const FORMAT = 'expense-tracker-backup'

export async function exportBackup() {
  const data = { format: FORMAT, version: 3, exportedAt: new Date().toISOString() }
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
  if (data.subcategories === undefined) data.subcategories = []
  if (!Array.isArray(data.subcategories)) throw new Error('Backup has an invalid "subcategories" list.')
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
  await db.transaction('rw', TABLES.map((t) => db[t]), async () => {
    for (const t of TABLES) {
      await db[t].clear()
      await db[t].bulkAdd(data[t])
    }
  })
}

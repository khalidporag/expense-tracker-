import { db } from './index.js'
import { normalizeIcon } from './seed.js'

const TABLES = ['categories', 'transactions', 'budgets', 'recurring']
const FORMAT = 'expense-tracker-backup'

export async function exportBackup() {
  const data = { format: FORMAT, version: 2, exportedAt: new Date().toISOString() }
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
  for (const t of TABLES) if (!Array.isArray(data[t])) throw new Error(`Backup is missing "${t}".`)
  data.categories = data.categories.map((c) => ({ ...c, icon: normalizeIcon(c.icon) }))
  await db.transaction('rw', TABLES.map((t) => db[t]), async () => {
    for (const t of TABLES) {
      await db[t].clear()
      await db[t].bulkAdd(data[t])
    }
  })
}

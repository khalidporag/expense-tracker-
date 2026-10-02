import Dexie from 'dexie'

export const db = new Dexie('expense-tracker')
db.version(1).stores({ expenses: '++id, date, category' })

export const CATEGORIES = ['Food', 'Transport', 'Bills', 'Shopping', 'Health', 'Fun', 'Other']

export async function exportJson() {
  return JSON.stringify(await db.expenses.toArray(), null, 2)
}

export async function importJson(text) {
  const rows = JSON.parse(text)
  if (!Array.isArray(rows)) throw new Error('Invalid backup file')
  await db.expenses.bulkPut(rows)
}

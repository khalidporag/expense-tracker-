import Dexie from 'dexie'
import { defaultCategories, normalizeIcon } from './seed.js'

export const db = new Dexie('expense-tracker')

// v1 (first prototype): one `expenses` table with a category string and float amount.
db.version(1).stores({ expenses: '++id, date, category' })

// v2: full schema. Money is integer minor units; categories are rows.
db
  .version(2)
  .stores({
    expenses: '++id, date, category',
    transactions: '++id, type, date, categoryId, recurringId',
    categories: '++id, kind',
    budgets: '++id, &categoryId',
    recurring: '++id',
  })
  .upgrade(async (tx) => {
    await tx.table('categories').bulkAdd(defaultCategories())
    const cats = await tx.table('categories').toArray()
    const other = cats.find((c) => c.kind === 'expense' && c.system)
    const byName = new Map(cats.filter((c) => c.kind === 'expense').map((c) => [c.name, c.id]))
    const old = await tx.table('expenses').toArray()
    await tx.table('transactions').bulkAdd(
      old.map((e) => ({
        type: 'expense',
        amount: Math.round(e.amount * 100),
        categoryId: byName.get(e.category) ?? other.id,
        date: e.date,
        note: e.note || '',
      })),
    )
  })

// v3: drop the prototype table.
db.version(3).stores({ expenses: null })

// v4: category icons are drawn-icon keys instead of emoji.
db
  .version(4)
  .stores({})
  .upgrade((tx) =>
    tx.table('categories').toCollection().modify((c) => {
      c.icon = normalizeIcon(c.icon)
    }),
  )

// Fresh installs (no upgrade path) get the default categories here.
db.on('populate', (tx) => tx.table('categories').bulkAdd(defaultCategories()))

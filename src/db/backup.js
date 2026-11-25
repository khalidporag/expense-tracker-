import { db } from './index.js'
import { normalizeIcon } from './seed.js'

const REQUIRED = ['categories', 'transactions', 'budgets', 'recurring']
const OPTIONAL = ['subcategories', 'plans', 'deposits', 'settings'] // older backups have none of these
const TABLES = [...REQUIRED, ...OPTIONAL]
const PLAN_KINDS = ['dps', 'lump', 'goal']
const FORMAT = 'expense-tracker-backup'

// ---- full validation (nothing is written until every row has passed) ----
const isMoney = (n) => Number.isSafeInteger(n) && n > 0
const isDate = (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)
const KINDS = ['expense', 'income']
function validateRows(data) {
  const bad = (what, i) => { throw new Error(`Backup has an invalid ${what} (entry ${i + 1}).`) }
  data.categories.forEach((c, i) => { if (!c || typeof c.name !== 'string' || !KINDS.includes(c.kind) || !Number.isSafeInteger(c.id)) bad('category', i) })
  data.transactions.forEach((t, i) => { if (!t || !KINDS.includes(t.type) || !isMoney(t.amount) || !isDate(t.date) || !Number.isSafeInteger(t.categoryId)) bad('transaction', i) })
  data.budgets.forEach((b, i) => { if (!b || !Number.isSafeInteger(b.categoryId) || !isMoney(b.limit)) bad('budget', i) })
  data.recurring.forEach((r, i) => { if (!r || !KINDS.includes(r.type) || !isMoney(r.amount) || !['monthly', 'weekly'].includes(r.frequency) || !isDate(r.startDate) || !Number.isSafeInteger(r.categoryId)) bad('recurring item', i) })
}

// Every kind needs its "Other" (it receives entries from deleted categories). Recreate any that is missing, and send
// entries or rules that point at a category the file does not contain to "Other", so nothing breaks and nothing is lost.
function ensureOther(data) {
  let nextId = data.categories.reduce((m, c) => Math.max(m, c.id), 0) + 1
  const other = {}
  for (const kind of KINDS) {
    let row = data.categories.find((c) => c.kind === kind && c.system)
    if (!row) {
      row = { id: nextId++, name: 'Other', kind, icon: kind === 'expense' ? 'box' : 'coins', system: true }
      data.categories.push(row)
    }
    other[kind] = row.id
  }
  const known = new Set(data.categories.map((c) => c.id))
  const fix = (row) => (known.has(row.categoryId) ? row : { ...row, categoryId: other[row.type], subcategoryId: undefined })
  const strip = ({ subcategoryId, ...rest }) => (subcategoryId === undefined ? rest : { ...rest, subcategoryId })
  data.transactions = data.transactions.map((t) => strip(fix(t)))
  data.recurring = data.recurring.map((r) => strip(fix(r)))
  data.budgets = data.budgets.filter((b) => known.has(b.categoryId) && data.categories.find((c) => c.id === b.categoryId).kind === 'expense')
}

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
  validateRows(data)
  data.categories = data.categories.map((c) => ({ ...c, icon: normalizeIcon(c.icon) }))
  ensureOther(data)
  // Keep only well-formed subcategories under existing categories; drop dangling labels from entries and rules.
  const catIds = new Set(data.categories.map((c) => c.id))
  data.subcategories = data.subcategories.filter((s) => s && s.name && catIds.has(s.categoryId))
  data.subcategories = data.subcategories.map(({ limit, ...s }) => (Number.isInteger(limit) && limit > 0 ? { ...s, limit } : s)) // keep only a valid subcategory budget
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

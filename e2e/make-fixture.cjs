// Generates e2e/fixture-backup.json: the sample month used by the design (today = 18 Oct 2026).
// Category ids follow the seeded order: Food1 Transport2 Bills3 Shopping4 Health5 Fun6 Other7 | Salary8 Business9 Gift10 Other11.
const fs = require('fs')
const path = require('path')
const T = (n) => n * 100
let id = 0
const tx = (type, date, taka, categoryId, note, recurringId, subcategoryId) => ({ id: ++id, type, date, amount: T(taka), categoryId, note, ...(recurringId ? { recurringId } : {}), ...(subcategoryId ? { subcategoryId } : {}) })

const cats = [
  ['Food', 'expense', 'food'], ['Transport', 'expense', 'transport'], ['Bills', 'expense', 'bills'], ['Shopping', 'expense', 'shopping'],
  ['Health', 'expense', 'health'], ['Fun', 'expense', 'fun'], ['Other', 'expense', 'box', true],
  ['Salary', 'income', 'salary'], ['Business', 'income', 'business'], ['Gift', 'income', 'gift'], ['Other', 'income', 'coins', true],
].map(([name, kind, icon, system], i) => ({ id: i + 1, name, kind, icon, ...(system ? { system: true } : {}) }))

const oct = [
  tx('income', '2026-10-01', 55000, 8, 'October salary', 3),
  tx('expense', '2026-10-01', 5200, 3, 'Rent', 1, 1),
  tx('expense', '2026-10-02', 2400, 1, 'Groceries'), tx('expense', '2026-10-03', 1200, 2, 'Ride share'),
  tx('expense', '2026-10-04', 1900, 1, 'Dinner'), tx('expense', '2026-10-05', 300, 5, 'Medicine'),
  tx('expense', '2026-10-06', 520, 1, 'Lunch'), tx('expense', '2026-10-07', 900, 2, 'Fuel'),
  tx('expense', '2026-10-08', 2300, 1, 'Groceries'), tx('expense', '2026-10-09', 1000, 1, 'Dinner'),
  tx('expense', '2026-10-09', 1100, 4, 'Headphones'), tx('expense', '2026-10-10', 1100, 2, 'Ride share'),
  tx('expense', '2026-10-11', 1650, 1, 'Dinner'), tx('expense', '2026-10-12', 500, 1, 'Lunch'),
  tx('expense', '2026-10-13', 900, 2, 'Fuel'), tx('expense', '2026-10-14', 380, 1, 'Lunch'),
  tx('expense', '2026-10-14', 400, 3, 'Phone bill', undefined, 2), tx('income', '2026-10-15', 7000, 9, 'Freelance payment'),
  tx('expense', '2026-10-16', 450, 1, 'Lunch'), tx('expense', '2026-10-16', 380, 2, 'Ride share'),
  tx('expense', '2026-10-16', 600, 6, 'Movie'), tx('expense', '2026-10-17', 2150, 1, 'Groceries · Shwapno'),
  tx('expense', '2026-10-17', 340, 5, 'Pharmacy'), tx('expense', '2026-10-18', 1850, 1, 'Dinner · Gulshan Kitchen'),
  tx('expense', '2026-10-18', 120, 2, 'Rickshaw'),
]
const sept = [
  tx('income', '2026-09-01', 62000, 8, 'September salary'),
  tx('expense', '2026-09-01', 5000, 3, 'Rent', 1, 1), tx('expense', '2026-09-03', 3000, 1, 'Groceries'), tx('expense', '2026-09-04', 2000, 2, 'Ride share'),
  tx('expense', '2026-09-07', 3000, 1, 'Dinner'), tx('expense', '2026-09-09', 900, 3, 'Bill', undefined, 3), tx('expense', '2026-09-10', 1700, 4, 'Clothes'),
  tx('expense', '2026-09-11', 3000, 1, 'Groceries'), tx('expense', '2026-09-12', 2100, 2, 'Fuel'), tx('expense', '2026-09-14', 900, 5, 'Medicine'),
  tx('expense', '2026-09-15', 3000, 1, 'Dinner'), tx('expense', '2026-09-16', 300, 6, 'Snacks'),
  tx('expense', '2026-09-22', 6000, 1, 'Groceries'), tx('expense', '2026-09-25', 2000, 2, 'Fuel'), tx('expense', '2026-09-26', 4300, 4, 'Shoes'),
  tx('expense', '2026-09-27', 600, 5, 'Checkup'), tx('expense', '2026-09-28', 3100, 3, 'Bills', undefined, 4), tx('expense', '2026-09-29', 400, 6, 'Game'),
]
// Savings: a DPS, a Sanchay Patra and a goal. October saved = DPS 5,000 + goal 3,000 = 8,000 against a 10,000 target.
const plans = [
  { id: 1, kind: 'dps', name: 'City Bank DPS', startDate: '2026-01-10', termMonths: 36, rateBp: 950, taxBp: 1000, installment: T(5000), active: true },
  { id: 2, kind: 'lump', name: 'Paribar Sanchay Patra', startDate: '2025-12-01', termMonths: 60, rateBp: 1128, taxBp: 1000, principal: T(200000), payout: 'monthly', active: true },
  { id: 3, kind: 'goal', name: 'Emergency fund', startDate: '2026-06-01', termMonths: 24, rateBp: 0, taxBp: 0, target: T(120000), installment: T(5000), active: true },
]
let depId = 0
const dep = (planId, date, taka) => ({ id: ++depId, planId, date, amount: T(taka) })
const deposits = [
  ...['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'].map((m) => dep(1, `2026-${m}-10`, 5000)),
  dep(2, '2025-12-01', 200000),
  dep(3, '2026-06-05', 5000), dep(3, '2026-07-05', 5000), dep(3, '2026-08-05', 5000), dep(3, '2026-09-05', 5000), dep(3, '2026-10-05', 3000),
]
const settings = [{ key: 'savingsTarget', value: { mode: 'amount', amount: T(10000) } }]
const budgets = [[1, 14000], [2, 5500], [3, 9500], [4, 7000], [5, 3000], [6, 4000]].map(([categoryId, limit], i) => ({ id: i + 1, categoryId, limit: T(limit) }))
const recurring = [
  { id: 1, type: 'expense', amount: T(5200), categoryId: 3, subcategoryId: 1, note: 'Rent', frequency: 'monthly', startDate: '2026-10-01', lastGenerated: '2026-10-01', active: true },
  { id: 2, type: 'expense', amount: T(800), categoryId: 3, note: 'Internet', frequency: 'monthly', startDate: '2026-09-20', lastGenerated: '2026-09-20', active: true },
  { id: 3, type: 'income', amount: T(55000), categoryId: 8, note: 'Salary', frequency: 'monthly', startDate: '2026-10-01', lastGenerated: '2026-10-01', active: true },
]
// Bills (3) is split into Rent, Phone, Electricity, Gas.
const subcategories = [[1, 'Rent'], [2, 'Phone'], [3, 'Electricity'], [4, 'Gas']].map(([sid, name]) => ({ id: sid, categoryId: 3, name }))
const out = { format: 'expense-tracker-backup', version: 4, exportedAt: '2026-10-18T12:00:00.000Z', categories: cats, subcategories, transactions: [...oct, ...sept], budgets, recurring, plans, deposits, settings }
fs.writeFileSync(path.join(__dirname, 'fixture-backup.json'), JSON.stringify(out, null, 1))
const sum = (arr, type) => arr.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0) / 100
console.log('Oct spent', sum(oct, 'expense'), 'income', sum(oct, 'income'), '| Sept same-period/total', sum(sept.filter((t) => t.date <= '2026-09-18'), 'expense'), sum(sept, 'expense'))

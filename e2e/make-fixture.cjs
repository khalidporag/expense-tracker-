// Generates e2e/fixture-backup.json: the sample month used by the design (today = 18 Oct 2026).
// Category ids follow the seeded order: Food1 Transport2 Bills3 Shopping4 Health5 Fun6 Other7 | Salary8 Business9 Gift10 Other11.
const fs = require('fs')
const path = require('path')
const T = (n) => n * 100
let id = 0
const tx = (type, date, taka, categoryId, note, recurringId) => ({ id: ++id, type, date, amount: T(taka), categoryId, note, ...(recurringId ? { recurringId } : {}) })

const cats = [
  ['Food', 'expense', 'food'], ['Transport', 'expense', 'transport'], ['Bills', 'expense', 'bills'], ['Shopping', 'expense', 'shopping'],
  ['Health', 'expense', 'health'], ['Fun', 'expense', 'fun'], ['Other', 'expense', 'box', true],
  ['Salary', 'income', 'salary'], ['Business', 'income', 'business'], ['Gift', 'income', 'gift'], ['Other', 'income', 'coins', true],
].map(([name, kind, icon, system], i) => ({ id: i + 1, name, kind, icon, ...(system ? { system: true } : {}) }))

const oct = [
  tx('income', '2026-10-01', 55000, 8, 'October salary', 3),
  tx('expense', '2026-10-01', 5200, 3, 'Rent', 1),
  tx('expense', '2026-10-02', 2400, 1, 'Groceries'), tx('expense', '2026-10-03', 1200, 2, 'Ride share'),
  tx('expense', '2026-10-04', 1900, 1, 'Dinner'), tx('expense', '2026-10-05', 300, 5, 'Medicine'),
  tx('expense', '2026-10-06', 520, 1, 'Lunch'), tx('expense', '2026-10-07', 900, 2, 'Fuel'),
  tx('expense', '2026-10-08', 2300, 1, 'Groceries'), tx('expense', '2026-10-09', 1000, 1, 'Dinner'),
  tx('expense', '2026-10-09', 1100, 4, 'Headphones'), tx('expense', '2026-10-10', 1100, 2, 'Ride share'),
  tx('expense', '2026-10-11', 1650, 1, 'Dinner'), tx('expense', '2026-10-12', 500, 1, 'Lunch'),
  tx('expense', '2026-10-13', 900, 2, 'Fuel'), tx('expense', '2026-10-14', 380, 1, 'Lunch'),
  tx('expense', '2026-10-14', 400, 3, 'Phone bill'), tx('income', '2026-10-15', 7000, 9, 'Freelance payment'),
  tx('expense', '2026-10-16', 450, 1, 'Lunch'), tx('expense', '2026-10-16', 380, 2, 'Ride share'),
  tx('expense', '2026-10-16', 600, 6, 'Movie'), tx('expense', '2026-10-17', 2150, 1, 'Groceries · Shwapno'),
  tx('expense', '2026-10-17', 340, 5, 'Pharmacy'), tx('expense', '2026-10-18', 1850, 1, 'Dinner · Gulshan Kitchen'),
  tx('expense', '2026-10-18', 120, 2, 'Rickshaw'),
]
const sept = [
  tx('expense', '2026-09-01', 5000, 3, 'Rent', 1), tx('expense', '2026-09-03', 3000, 1, 'Groceries'), tx('expense', '2026-09-04', 2000, 2, 'Ride share'),
  tx('expense', '2026-09-07', 3000, 1, 'Dinner'), tx('expense', '2026-09-09', 900, 3, 'Bill'), tx('expense', '2026-09-10', 1700, 4, 'Clothes'),
  tx('expense', '2026-09-11', 3000, 1, 'Groceries'), tx('expense', '2026-09-12', 2100, 2, 'Fuel'), tx('expense', '2026-09-14', 900, 5, 'Medicine'),
  tx('expense', '2026-09-15', 3000, 1, 'Dinner'), tx('expense', '2026-09-16', 300, 6, 'Snacks'),
  tx('expense', '2026-09-22', 6000, 1, 'Groceries'), tx('expense', '2026-09-25', 2000, 2, 'Fuel'), tx('expense', '2026-09-26', 4300, 4, 'Shoes'),
  tx('expense', '2026-09-27', 600, 5, 'Checkup'), tx('expense', '2026-09-28', 3100, 3, 'Bills'), tx('expense', '2026-09-29', 400, 6, 'Game'),
]
const budgets = [[1, 14000], [2, 5500], [3, 9500], [4, 7000], [5, 3000], [6, 4000]].map(([categoryId, limit], i) => ({ id: i + 1, categoryId, limit: T(limit) }))
const recurring = [
  { id: 1, type: 'expense', amount: T(5200), categoryId: 3, note: 'Rent', frequency: 'monthly', startDate: '2026-10-01', lastGenerated: '2026-10-01', active: true },
  { id: 2, type: 'expense', amount: T(800), categoryId: 3, note: 'Internet', frequency: 'monthly', startDate: '2026-09-20', lastGenerated: '2026-09-20', active: true },
  { id: 3, type: 'income', amount: T(55000), categoryId: 8, note: 'Salary', frequency: 'monthly', startDate: '2026-10-01', lastGenerated: '2026-10-01', active: true },
]
const out = { format: 'expense-tracker-backup', version: 2, exportedAt: '2026-10-18T12:00:00.000Z', categories: cats, transactions: [...oct, ...sept], budgets, recurring }
fs.writeFileSync(path.join(__dirname, 'fixture-backup.json'), JSON.stringify(out, null, 1))
const sum = (arr, type) => arr.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0) / 100
console.log('Oct spent', sum(oct, 'expense'), 'income', sum(oct, 'income'), '| Sept same-period/total', sum(sept.filter((t) => t.date <= '2026-09-18'), 'expense'), sum(sept, 'expense'))

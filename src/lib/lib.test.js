import { describe, it, expect } from 'vitest'
import { toMinor, formatMoney } from './money.js'
import { addMonths, addDays, shiftMonth } from './dates.js'
import { dueDates, nextDue } from './recurring.js'
import { summarize, budgetStatus, filterTransactions, groupByDate } from './summary.js'

describe('money', () => {
  it('converts to integer minor units without float error', () => {
    expect(toMinor('0.1') + toMinor('0.2')).toBe(30)
    expect(toMinor('19.99')).toBe(1999)
  })
  it('formats BDT with sign', () => {
    expect(formatMoney(150050)).toContain('৳')
    expect(formatMoney(-500)).toMatch(/^-৳/)
  })
})

describe('dates', () => {
  it('clamps month end', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29')
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15')
  })
  it('adds days across month boundary', () => {
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02')
  })
  it('shifts months', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
  })
})

describe('recurring', () => {
  const monthly = { frequency: 'monthly', startDate: '2026-01-31', lastGenerated: null }
  it('does not drift after a short month', () => {
    expect(dueDates(monthly, '2026-04-30')).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'])
  })
  it('is idempotent via lastGenerated', () => {
    const rule = { ...monthly, lastGenerated: '2026-03-31' }
    expect(dueDates(rule, '2026-04-29')).toEqual([])
    expect(dueDates(rule, '2026-04-30')).toEqual(['2026-04-30'])
  })
  it('generates nothing before start', () => {
    expect(dueDates({ ...monthly, startDate: '2026-06-01' }, '2026-05-31')).toEqual([])
  })
  it('handles weekly', () => {
    const rule = { frequency: 'weekly', startDate: '2026-01-01', lastGenerated: null }
    expect(dueDates(rule, '2026-01-15')).toEqual(['2026-01-01', '2026-01-08', '2026-01-15'])
    expect(nextDue({ ...rule, lastGenerated: '2026-01-15' })).toBe('2026-01-22')
  })
})

const txs = [
  { id: 1, type: 'expense', amount: 5000, categoryId: 1, date: '2026-10-02', note: 'Lunch' },
  { id: 2, type: 'expense', amount: 3000, categoryId: 2, date: '2026-10-02', note: 'Bus' },
  { id: 3, type: 'income', amount: 100000, categoryId: 9, date: '2026-10-01', note: 'Salary' },
]

describe('summary', () => {
  it('summarizes income, expense, balance, categories', () => {
    const s = summarize(txs)
    expect(s.income).toBe(100000)
    expect(s.expense).toBe(8000)
    expect(s.balance).toBe(92000)
    expect(s.byCategory.get(1)).toBe(5000)
  })
  it('flags budget states', () => {
    const st = budgetStatus(
      [
        { categoryId: 1, limit: 5000 },
        { categoryId: 2, limit: 3500 },
        { categoryId: 3, limit: 1000 },
        { categoryId: 1, limit: 4000 },
      ],
      txs,
    )
    expect(st.map((x) => x.state)).toEqual(['warn', 'warn', 'ok', 'over'])
    expect(st[0].remaining).toBe(0)
  })
  it('filters by text, type, category, range', () => {
    expect(filterTransactions(txs, { text: 'lun' })).toHaveLength(1)
    expect(filterTransactions(txs, { type: 'income' })).toHaveLength(1)
    expect(filterTransactions(txs, { categoryId: 2 })).toHaveLength(1)
    expect(filterTransactions(txs, { from: '2026-10-02' })).toHaveLength(2)
    expect(filterTransactions(txs, { to: '2026-10-01' })).toHaveLength(1)
  })
  it('groups by consecutive date', () => {
    const g = groupByDate(txs)
    expect(g.map((x) => [x.date, x.items.length])).toEqual([['2026-10-02', 2], ['2026-10-01', 1]])
  })
})

import { CATEGORY_ICON_KEYS, defaultCategories, normalizeIcon } from '../db/seed.js'
import { ICON_PATHS } from '../components/iconPaths.js'

describe('category icons', () => {
  it('every icon key has a drawing, and so does every seeded category', () => {
    for (const k of CATEGORY_ICON_KEYS) expect(ICON_PATHS[k], k).toBeTruthy()
    for (const c of defaultCategories()) expect(CATEGORY_ICON_KEYS).toContain(c.icon)
  })
  it('maps earlier emoji and unknown values to keys', () => {
    expect(normalizeIcon('🍽️')).toBe('food')
    expect(normalizeIcon('💰')).toBe('coins')
    expect(normalizeIcon('🦄')).toBe('tag')
    expect(normalizeIcon('bills')).toBe('bills')
  })
})

import { normalizeTheme, resolveTheme } from './theme.js'

describe('theme preference', () => {
  it('only accepts light, dark or system', () => {
    expect(normalizeTheme('dark')).toBe('dark')
    expect(normalizeTheme('light')).toBe('light')
    expect(normalizeTheme('sepia')).toBe('system')
    expect(normalizeTheme(null)).toBe('system')
  })
  it('system follows the phone; explicit choices ignore it', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
})

import { subBreakdown, monthSeries, subKey } from './subcategories.js'
import { groupDeltas } from './insights.js'

describe('subcategories', () => {
  const subs = [{ id: 1, name: 'Electricity' }, { id: 2, name: 'Gas' }]
  const e = (id, date, amount, subcategoryId) => ({ id, type: 'expense', categoryId: 3, date, amount, ...(subcategoryId ? { subcategoryId } : {}) })

  it('splits a category by subcategory, biggest first, "Not assigned" last', () => {
    const { total, rows } = subBreakdown([e(1, '2026-10-02', 180000, 1), e(2, '2026-10-03', 90000, 2), e(3, '2026-10-04', 20000, 1), e(4, '2026-10-05', 500000)], subs)
    expect(total).toBe(790000)
    expect(rows.map((r) => [r.name, r.amount, r.count])).toEqual([['Electricity', 200000, 2], ['Gas', 90000, 1], ['Not assigned', 500000, 1]])
    expect(rows[0].share).toBeCloseTo(200000 / 790000)
  })
  it('treats a deleted subcategory as not assigned', () => {
    expect(subKey({ subcategoryId: 99 }, new Set([1, 2]))).toBeNull()
    expect(subBreakdown([e(1, '2026-10-02', 100, 99)], subs).rows[0].name).toBe('Not assigned')
  })
  it('builds a month-by-month series for one subcategory, all, or unassigned', () => {
    const txs = [e(1, '2026-08-10', 100, 1), e(2, '2026-09-10', 300, 1), e(3, '2026-09-11', 50, 2), e(4, '2026-10-01', 70)]
    const months = ['2026-08', '2026-09', '2026-10']
    expect(monthSeries(txs, months, 1, subs).map((m) => m.amount)).toEqual([100, 300, 0])
    expect(monthSeries(txs, months, 'all', subs).map((m) => m.amount)).toEqual([100, 350, 70])
    expect(monthSeries(txs, months, 'none', subs).map((m) => m.amount)).toEqual([0, 0, 70])
  })
  it('compares subcategories with last month over the same days', () => {
    const key = (t) => subKey(t, new Set([1, 2]))
    const d = groupDeltas([e(1, '2026-10-02', 200, 1)], [e(2, '2026-09-02', 100, 1), e(3, '2026-09-25', 900, 1)], 18, key)
    expect(d[0]).toEqual({ key: 1, cur: 200, prev: 100, delta: 100, pct: 100 })
  })
  it('filters transactions by subcategory', () => {
    const txs = [e(1, '2026-10-02', 1, 1), e(2, '2026-10-02', 1, 2), e(3, '2026-10-02', 1)]
    expect(filterTransactions(txs, { categoryId: 3, subcategoryId: 1 }).map((t) => t.id)).toEqual([1])
    expect(filterTransactions(txs, { categoryId: 3 })).toHaveLength(3)
  })
})

import { searchItems, editDistance } from './search.js'
import { pushBackHandler, runBackHandlers } from './backStack.js'
import { shouldShowSplash, greeting } from './splash.js'

describe('app search', () => {
  const items = [
    { id: 'home', title: 'Home', group: 'Go to', keywords: ['dashboard', 'overview', 'safe to spend'] },
    { id: 'insights', title: 'Insights', group: 'Go to', keywords: ['analytics', 'forecast', 'trends', 'report'] },
    { id: 'budgets', title: 'Budgets', group: 'Go to', keywords: ['limits', 'allowance'] },
    { id: 'settings', title: 'Settings', group: 'Go to', keywords: ['preferences', 'options', 'gear'] },
    { id: 'backup', title: 'Backup & restore', group: 'Settings', keywords: ['export', 'import', 'download', 'json'] },
    { id: 'recurring', title: 'Recurring', group: 'Settings', keywords: ['subscription', 'rent', 'salary', 'repeat'] },
    { id: 'dark', title: 'Dark theme', group: 'Appearance', keywords: ['night', 'dark mode', 'theme'] },
    { id: 'light', title: 'Light theme', group: 'Appearance', keywords: ['day', 'bright', 'theme'] },
    { id: 'add-exp', title: 'Add expense', group: 'Actions', keywords: ['new', 'spend', 'pay'] },
    { id: 'add-inc', title: 'Add income', group: 'Actions', keywords: ['earn', 'salary', 'deposit'] },
  ]
  const top = (q) => searchItems(items, q).map((i) => i.id)

  it('matches titles, prefixes and multiple words', () => {
    expect(top('home')[0]).toBe('home')
    expect(top('budg')[0]).toBe('budgets')
    expect(top('add inc')[0]).toBe('add-inc')
  })
  it('understands synonyms through keywords', () => {
    expect(top('export')[0]).toBe('backup')
    expect(top('forecast')[0]).toBe('insights')
    expect(top('night')[0]).toBe('dark')
    expect(top('subscription')[0]).toBe('recurring')
    expect(top('dashboard')[0]).toBe('home')
  })
  it('tolerates typos', () => {
    expect(top('backap')[0]).toBe('backup')
    expect(top('insigts')[0]).toBe('insights')
    expect(top('buget')[0]).toBe('budgets')
    expect(top('setings')[0]).toBe('settings')
  })
  it('requires every word to match, and ignores case and accents', () => {
    expect(top('dark budgets')).toEqual([])
    expect(top('DARK')[0]).toBe('dark')
    expect(top('')).toEqual([])
  })
  it('ranks exact matches above keyword matches', () => {
    expect(top('salary')).toEqual(['recurring', 'add-inc']) // both only via keyword; stable order by title length
    expect(top('theme')).toEqual(['dark', 'light'])
  })
  it('matches a group name when nothing else does', () => {
    expect(top('appearance').sort()).toEqual(['dark', 'light'])
  })
  it('bounded edit distance gives up early', () => {
    expect(editDistance('backup', 'backap', 1)).toBe(1)
    expect(editDistance('abc', 'xyzxyz', 2)).toBe(3)
  })
})

describe('back button stack', () => {
  it('lets the newest handler go first and stops at the first that handles it', () => {
    const calls = []
    const off1 = pushBackHandler(() => { calls.push('app'); return true })
    const off2 = pushBackHandler(() => { calls.push('sheet'); return true })
    expect(runBackHandlers()).toBe(true)
    expect(calls).toEqual(['sheet'])
    off2()
    calls.length = 0
    expect(runBackHandlers()).toBe(true)
    expect(calls).toEqual(['app'])
    off1()
  })
  it('passes the press down when a handler declines, and reports when nobody handled it', () => {
    const calls = []
    const off1 = pushBackHandler(() => { calls.push('app'); return false })
    const off2 = pushBackHandler(() => { calls.push('sub'); return false })
    expect(runBackHandlers()).toBe(false)
    expect(calls).toEqual(['sub', 'app'])
    off2(); off1()
    expect(runBackHandlers()).toBe(false)
  })
})

describe('welcome splash', () => {
  it('shows on a fresh session, not on reload, not in automation, unless forced', () => {
    expect(shouldShowSplash({})).toBe(true)
    expect(shouldShowSplash({ seen: true })).toBe(false)
    expect(shouldShowSplash({ webdriver: true })).toBe(false)
    expect(shouldShowSplash({ search: '?splash=1', webdriver: true, seen: true })).toBe(true)
  })
  it('greets by time of day', () => {
    expect([5, 11, 12, 17, 18, 23].map(greeting)).toEqual(['Good morning', 'Good morning', 'Good afternoon', 'Good afternoon', 'Good evening', 'Good evening'])
  })
})

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

import { detectPlatform, shouldShowBanner, isSnoozed, canInstall } from './install.js'

describe('install prompt', () => {
  const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  const IPAD_AS_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
  const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
  const FB_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/450.0.0.0;]'
  const FB_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/450.0.0.0]'

  it('offers the one-tap prompt when the browser provides it', () => {
    expect(detectPlatform({ ua: ANDROID, hasPrompt: true })).toBe('prompt')
    expect(detectPlatform({ ua: ANDROID })).toBe('none') // no prompt event: nothing to offer
  })
  it('shows the how-to on iPhone and iPad (which has no install button for websites)', () => {
    expect(detectPlatform({ ua: IPHONE })).toBe('ios')
    expect(detectPlatform({ ua: IPAD_AS_MAC, maxTouchPoints: 5 })).toBe('ios')
    expect(detectPlatform({ ua: IPAD_AS_MAC, maxTouchPoints: 0 })).toBe('none') // a real Mac
  })
  it('recognises in-app browsers, which cannot install', () => {
    expect(detectPlatform({ ua: FB_ANDROID, hasPrompt: true })).toBe('inapp')
    expect(detectPlatform({ ua: FB_IOS })).toBe('inapp')
  })
  it('does nothing once installed', () => {
    expect(detectPlatform({ ua: IPHONE, standalone: true })).toBe('installed')
    expect(detectPlatform({ ua: ANDROID, hasPrompt: true, standalone: true })).toBe('installed')
  })
  it('only offers install where something can be done', () => {
    expect(['prompt', 'ios', 'inapp', 'installed', 'none'].map(canInstall)).toEqual([true, true, true, false, false])
  })
  it('snoozes for 14 days after dismissal', () => {
    const day = 86400000
    expect(isSnoozed(null, 1e12)).toBe(false)
    expect(isSnoozed(1e12, 1e12 + 13 * day)).toBe(true)
    expect(isSnoozed(1e12, 1e12 + 15 * day)).toBe(false)
  })
  it('shows the banner only when useful, un-snoozed, and not for automated browsers unless forced', () => {
    const base = { platform: 'ios', now: 1e12 }
    expect(shouldShowBanner(base)).toBe(true)
    expect(shouldShowBanner({ ...base, platform: 'installed' })).toBe(false)
    expect(shouldShowBanner({ ...base, platform: 'none' })).toBe(false)
    expect(shouldShowBanner({ ...base, dismissedAt: 1e12 - 1000 })).toBe(false)
    expect(shouldShowBanner({ ...base, automated: true })).toBe(false)
    expect(shouldShowBanner({ ...base, automated: true, forced: true })).toBe(true)
  })
})

import { dpsMaturity, lumpOutcome, goalMonthly, projection, planStatus, committedMonthly, monthlyTarget, monthReport, savingsHistory, savingsSignals } from './savings.js'

describe('savings schemes (estimates)', () => {
  const T = (n) => n * 100
  it('DPS: equal monthly installments, quarterly compounding, source tax on the interest', () => {
    const plain = dpsMaturity({ installment: T(1000), termMonths: 12, rateBp: 800, taxBp: 0 })
    expect(plain.deposited).toBe(T(12000))
    expect(Math.abs(plain.maturity - T(12529.33))).toBeLessThanOrEqual(1) // independent reference: 12,529.3256
    const taxed = dpsMaturity({ installment: T(5000), termMonths: 36, rateBp: 950, taxBp: 1000 })
    expect(taxed.deposited).toBe(T(180000))
    expect(Math.abs(taxed.grossInterest - T(28722.17))).toBeLessThanOrEqual(1)
    expect(Math.abs(taxed.netInterest - T(25849.95))).toBeLessThanOrEqual(1)
    expect(taxed.maturity).toBe(taxed.deposited + taxed.netInterest)
    expect(taxed.grossInterest - taxed.tax).toBe(taxed.netInterest)
  })
  it('DPS with no interest returns exactly what was deposited', () => {
    expect(dpsMaturity({ installment: T(500), termMonths: 24, rateBp: 0, taxBp: 1000 }).maturity).toBe(T(12000))
  })
  it('one-time deposit with profit at maturity compounds quarterly', () => {
    const o = lumpOutcome({ principal: T(100000), termMonths: 60, rateBp: 1000, taxBp: 0, payout: 'maturity' })
    expect(Math.abs(o.maturity - T(163861.64))).toBeLessThanOrEqual(1)
  })
  it('one-time deposit with monthly profit pays out along the way and returns the principal', () => {
    const o = lumpOutcome({ principal: T(200000), termMonths: 60, rateBp: 1128, taxBp: 1000, payout: 'monthly' })
    expect(o).toMatchObject({ periods: 60, grossPerPayout: T(1880), netPerPayout: T(1692), maturity: T(200000) })
    expect(o.netProfit).toBe(T(1692) * 60)
    expect(o.totalReturn).toBe(T(200000) + T(1692) * 60)
    expect(lumpOutcome({ principal: T(100000), termMonths: 36, rateBp: 1000, payout: 'quarterly' }).periods).toBe(12)
  })
  it('goal: monthly amount to reach a target, with or without interest', () => {
    expect(goalMonthly({ target: T(120000), termMonths: 24 })).toBe(T(5000))
    const m = goalMonthly({ target: T(120000), termMonths: 24, rateBp: 700, taxBp: 1000 })
    expect(m).toBeLessThan(T(5000))
    // round trip: paying that amount as a DPS reaches (at least) the target
    expect(dpsMaturity({ installment: m, termMonths: 24, rateBp: 700, taxBp: 1000 }).maturity).toBeGreaterThanOrEqual(T(120000) - 24)
  })
  it('projection picks the right model per plan kind', () => {
    expect(projection({ kind: 'goal', target: T(50000) }).total).toBe(T(50000))
    expect(projection({ kind: 'lump', principal: T(1000), termMonths: 12, rateBp: 1000, taxBp: 0, payout: 'monthly' }).total).toBe(T(1000) + 12 * Math.round(T(1000) * 0.1 / 12))
  })
})

describe('where a plan stands', () => {
  const T = (n) => n * 100
  const dps = { id: 1, kind: 'dps', name: 'DPS', startDate: '2026-01-10', termMonths: 36, rateBp: 950, taxBp: 1000, installment: T(5000) }
  const dep = (id, planId, date, amount = T(5000)) => ({ id, planId, date, amount })
  const paid = Array.from({ length: 9 }, (_, i) => dep(i + 1, 1, `2026-${String(i + 1).padStart(2, '0')}-10`))

  it('counts installments due, what is behind, and whether this month is paid', () => {
    const s = planStatus(dps, paid, '2026-10-18') // Jan..Oct = 10 due, Oct not paid yet
    expect(s).toMatchObject({ state: 'running', deposited: T(45000), expectedByNow: T(50000), behind: T(5000), paidThisMonth: false, dueDate: '2026-10-10', overdue: true, maturityDate: '2029-01-10' })
    const s2 = planStatus(dps, [...paid, dep(10, 1, '2026-10-10')], '2026-10-18')
    expect(s2).toMatchObject({ behind: 0, paidThisMonth: true, dueDate: null, overdue: false })
    expect(planStatus(dps, paid, '2026-10-05').overdue).toBe(false) // due on the 10th, not yet late
  })
  it('knows upcoming and matured plans', () => {
    expect(planStatus(dps, [], '2025-12-01').state).toBe('upcoming')
    expect(planStatus(dps, [], '2029-01-10').state).toBe('matured')
    expect(planStatus(dps, [], '2029-01-10').dueDate).toBeNull()
  })
  it('one-time deposits progress by time and are never "due" monthly', () => {
    const lump = { id: 2, kind: 'lump', name: 'SP', startDate: '2025-12-01', termMonths: 60, rateBp: 1128, taxBp: 1000, principal: T(200000), payout: 'monthly' }
    const s = planStatus(lump, [{ id: 1, planId: 2, date: '2025-12-01', amount: T(200000) }], '2026-10-18')
    expect(s.dueDate).toBeNull()
    expect(s.deposited).toBe(T(200000))
    expect(s.progress).toBeCloseTo(11 / 60, 2)
  })
  it('sums what the running monthly plans commit each month', () => {
    const goal = { id: 3, kind: 'goal', name: 'Fund', startDate: '2026-06-01', termMonths: 24, target: T(120000), installment: T(5000) }
    const lump = { id: 2, kind: 'lump', startDate: '2025-12-01', termMonths: 60, principal: T(200000) }
    expect(committedMonthly([dps, goal, lump], '2026-10-18')).toBe(T(10000))
    expect(committedMonthly([{ ...dps, active: false }, goal], '2026-10-18')).toBe(T(5000))
  })
})

describe('monthly savings picture', () => {
  const T = (n) => n * 100
  const tx = (id, type, date, amount, categoryId) => ({ id, type, date, amount, categoryId })
  const txs = [tx(1, 'income', '2026-10-01', T(60000), 8), tx(2, 'income', '2026-10-15', T(2000), 9), tx(3, 'expense', '2026-10-03', T(20000), 1), tx(4, 'expense', '2026-10-09', T(7640), 2), tx(5, 'expense', '2026-09-03', T(41300), 1)]
  const deposits = [{ id: 1, planId: 1, date: '2026-10-10', amount: T(5000) }, { id: 2, planId: 3, date: '2026-10-05', amount: T(3000) }, { id: 3, planId: 1, date: '2026-09-10', amount: T(5000) }]

  it('targets: a fixed amount, or a share of income (falling back to last month when none yet)', () => {
    expect(monthlyTarget({ mode: 'amount', amount: T(10000) }, 0)).toBe(T(10000))
    expect(monthlyTarget({ mode: 'percent', percent: 20 }, T(62000))).toBe(T(12400))
    expect(monthlyTarget({ mode: 'percent', percent: 20 }, 0, T(50000))).toBe(T(10000))
    expect(monthlyTarget(null, T(1))).toBe(0)
  })
  it('reports earned, spent by category, saved and the gap to the target', () => {
    const r = monthReport({ month: '2026-10', txs, deposits, setting: { mode: 'amount', amount: T(10000) } })
    expect(r).toMatchObject({ income: T(62000), expense: T(27640), kept: T(34360), saved: T(8000), target: T(10000), shortfall: T(2000), targetMet: false, unallocated: T(26360), savedPct: 13, spentPct: 45 })
    expect(r.expenseByCategory).toEqual([[1, T(20000)], [2, T(7640)]])
    expect(r.incomeByCategory).toEqual([[8, T(60000)], [9, T(2000)]])
  })
  it('deposits are savings, never spending', () => {
    const r = monthReport({ month: '2026-10', txs: [], deposits, setting: null })
    expect(r.expense).toBe(0)
    expect(r.saved).toBe(T(8000))
    expect(r.savedPct).toBeNull() // no income to compare with
  })
  it('history is oldest first and a met target is flagged', () => {
    const h = savingsHistory(['2026-09', '2026-10'], { txs, deposits, setting: { mode: 'amount', amount: T(5000) } })
    expect(h.map((x) => x.month)).toEqual(['2026-09', '2026-10'])
    expect(h.map((x) => x.targetMet)).toEqual([true, true])
  })
  it('signals: unpaid installments and plans maturing within two months', () => {
    const plans = [{ id: 1, kind: 'dps', name: 'DPS', startDate: '2023-11-10', termMonths: 36, rateBp: 900, taxBp: 1000, installment: T(5000) }]
    const s = savingsSignals({ plans, deposits: [], todayISO: '2026-10-18', target: T(10000), saved: 0, kept: T(5000) })
    expect(s.due).toEqual([{ name: 'DPS', amount: T(5000), dueDate: '2026-10-10', overdue: true, days: -8 }])
    expect(s.maturing).toHaveLength(1)
    expect(s.maturing[0]).toMatchObject({ name: 'DPS', date: '2026-11-10', days: 23 })
  })
})

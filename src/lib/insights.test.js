import { describe, it, expect } from 'vitest'
import {
  monthInfo, projectSpend, allowance, cumulativeSeries, categoryDeltas, weekdayAverages, noSpendDays, topEntries,
  recurringCommitments, scenarioProjection, recommendedCap, suggestMove, buildActions,
} from './insights.js'
import { budgetStatus } from './summary.js'
import { formatMoney, formatTaka, formatCompact } from './money.js'
import { relativeDay, weekdayIndex, daysInMonth } from './dates.js'

const T = (n) => n * 100 // taka -> minor

describe('money formatting', () => {
  it('hides zero poisha, keeps real ones', () => {
    expect(formatMoney(T(1850))).toBe('৳1,850')
    expect(formatMoney(150050)).toBe('৳1,500.50')
    expect(formatMoney(-T(300))).toBe('-৳300')
  })
  it('rounds to whole taka and compacts', () => {
    expect(formatTaka(118154)).toBe('৳1,182')
    expect(formatCompact(T(47604))).toBe('৳47.6k')
    expect(formatCompact(T(900))).toBe('৳900')
  })
})

describe('dates', () => {
  it('weekday index is Monday-first', () => {
    expect(weekdayIndex('2026-10-12')).toBe(0) // Monday
    expect(weekdayIndex('2026-10-18')).toBe(6) // Sunday
  })
  it('days in month incl. leap', () => {
    expect(daysInMonth('2028-02')).toBe(29)
    expect(daysInMonth('2026-10')).toBe(31)
  })
  it('labels relative days', () => {
    expect(relativeDay('2026-10-18', '2026-10-18')).toMatch(/^Today · Sun 18 Oct$/)
    expect(relativeDay('2026-10-17', '2026-10-18')).toMatch(/^Yesterday/)
    expect(relativeDay('2026-10-16', '2026-10-18')).toBe('Fri 16 Oct')
  })
})

describe('month progress', () => {
  it('current, past and future months', () => {
    expect(monthInfo('2026-10', '2026-10-18')).toMatchObject({ total: 31, day: 18, daysLeft: 13, isCurrent: true })
    expect(monthInfo('2026-09', '2026-10-18')).toMatchObject({ day: 30, daysLeft: 0, isPast: true })
    expect(monthInfo('2026-11', '2026-10-18')).toMatchObject({ day: 0, isFuture: true })
  })
})

// The same sample month as the design: day 18 of 31, budget ৳43,000, spent ৳27,640.
const budget = T(43000)
const spent = T(27640)
describe('pace, forecast, allowance', () => {
  it('forecasts linearly', () => {
    expect(projectSpend(spent, 18, 31)).toBe(4760222)
    expect(projectSpend(0, 0, 31)).toBe(0)
  })
  it('computes a per-day allowance in whole taka', () => {
    expect(allowance(budget, spent, 13)).toEqual({ left: T(15360), perDay: T(1182), daysLeft: 13 })
  })
  it('on the last day the allowance is what is left', () => {
    expect(allowance(budget, spent, 0).perDay).toBe(T(15360))
  })
})

describe('what-if cap', () => {
  const args = { spent, catSpent: T(15100), day: 18, total: 31 }
  it('projects the month with a cap', () => {
    expect(scenarioProjection({ ...args, cap: T(400) })).toBe(4189667)
  })
  it('recommends the largest ৳50-step cap that fits the budget', () => {
    expect(recommendedCap({ ...args, budget })).toBe(T(450))
    expect(scenarioProjection({ ...args, cap: T(450) })).toBeLessThanOrEqual(budget)
    expect(scenarioProjection({ ...args, cap: T(500) })).toBeGreaterThan(budget)
  })
  it('returns 0 when nothing fits or the month is over', () => {
    expect(recommendedCap({ ...args, budget: T(20000) })).toBe(0)
    expect(recommendedCap({ ...args, budget, day: 31 })).toBe(0)
  })
})

const tx = (id, date, amount, categoryId, extra = {}) => ({ id, type: 'expense', date, amount, categoryId, ...extra })

describe('series and comparisons', () => {
  const txs = [tx(1, '2026-10-01', 100, 1), tx(2, '2026-10-03', 50, 1), tx(3, '2026-10-03', 25, 2), { id: 4, type: 'income', date: '2026-10-02', amount: 999, categoryId: 9 }]
  it('accumulates expenses by day and ignores income', () => {
    expect(cumulativeSeries(txs, 4)).toEqual([100, 100, 175, 175])
  })
  it('counts no-spend days', () => {
    expect(noSpendDays(txs, 4)).toBe(2)
  })
  it('compares the same days of the previous month', () => {
    const prev = [tx(10, '2026-09-02', 40, 1), tx(11, '2026-09-20', 500, 1), tx(12, '2026-09-03', 10, 2)]
    const d = categoryDeltas(txs, prev, 4)
    expect(d[0]).toEqual({ categoryId: 1, cur: 150, prev: 40, delta: 110, pct: 275 })
    expect(d.find((x) => x.categoryId === 2)).toMatchObject({ delta: 15, pct: 150 })
  })
  it('null pct when there was nothing last month', () => {
    expect(categoryDeltas([tx(1, '2026-10-01', 5, 7)], [], 4)[0].pct).toBeNull()
  })
  it('averages per weekday over the days elapsed', () => {
    const w = weekdayAverages([tx(1, '2026-10-16', 600, 1)], '2026-10', 18) // Fri; 3 Fridays so far
    expect(w[4].avg).toBe(200)
    expect(w[0].avg).toBe(0)
  })
  it('ranks biggest entries with their share', () => {
    const { top, share } = topEntries([tx(1, '2026-10-01', 50, 1), tx(2, '2026-10-02', 30, 1), tx(3, '2026-10-03', 20, 1)], 2)
    expect(top.map((t) => t.tx.id)).toEqual([1, 2])
    expect(share).toBeCloseTo(0.8)
  })
})

describe('recurring commitments', () => {
  it('adds booked recurring spending and unbooked occurrences still due this month', () => {
    const txs = [tx(1, '2026-10-01', T(5500), 1, { recurringId: 1 })]
    const rules = [{ id: 2, active: true, type: 'expense', amount: T(800), frequency: 'monthly', startDate: '2026-09-20', lastGenerated: '2026-09-20' }]
    const r = recurringCommitments(txs, rules, '2026-10')
    expect(r.upcoming).toBe(T(800))
    expect(r.committed).toBe(T(6300))
  })
})

describe('budget suggestions', () => {
  const rows = budgetStatus(
    [{ categoryId: 1, limit: T(14000) }, { categoryId: 2, limit: T(5500) }, { categoryId: 3, limit: T(9500) }, { categoryId: 4, limit: T(7000) }],
    [tx(1, '2026-10-05', T(15100), 1), tx(2, '2026-10-05', T(4600), 2), tx(3, '2026-10-05', T(5600), 3), tx(4, '2026-10-05', T(1100), 4)],
  ).map((r) => ({ ...r, name: { 1: 'Food', 2: 'Transport', 3: 'Bills', 4: 'Shopping' }[r.categoryId] }))

  it('moves unused budget from the roomiest category', () => {
    expect(suggestMove(rows)).toMatchObject({ fromId: 4, toId: 1, amount: T(1100) })
  })
  it('suggests nothing without an overage or a donor', () => {
    expect(suggestMove(rows.filter((r) => r.state !== 'over'))).toBeNull()
    expect(suggestMove(rows.map((r) => (r.categoryId === 1 ? { ...r, remaining: -T(99999) } : r)))).toBeNull()
  })

  it('ranks actions: over budget, then running low, then upcoming', () => {
    const info = monthInfo('2026-10', '2026-10-18')
    const actions = buildActions({
      info, rows, totals: { budget, spent, anySpending: true }, prevByCategory: new Map([[2, T(4100)]]), todayISO: '2026-10-18',
      rules: [{ id: 5, active: true, type: 'expense', amount: T(800), note: 'Internet', frequency: 'monthly', startDate: '2026-09-20', lastGenerated: '2026-09-20' }],
    })
    expect(actions.map((a) => a.kind)).toEqual(['over', 'warn', 'upcoming'])
    expect(actions[0].title).toBe('Food is ৳1,100 over its budget')
    expect(actions[0].detail).toContain('৳450 a day')
    expect(actions[1].title).toBe('Transport has ৳900 left for 13 days')
    expect(actions[1].detail).toContain('৳69 a day')
    expect(actions[1].detail).toContain('৳4,100')
    expect(actions[2].title).toContain('Internet ৳800 is due on')
  })
  it('asks for budgets when there are none', () => {
    const a = buildActions({ info: monthInfo('2026-10', '2026-10-18'), rows: [], totals: { budget: 0, spent: 0, anySpending: true }, prevByCategory: new Map(), rules: [], todayISO: '2026-10-18' })
    expect(a.map((x) => x.kind)).toEqual(['setup'])
  })
})

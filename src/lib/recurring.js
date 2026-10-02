import { addDays, addMonths } from './dates.js'

const MAX = 2000

function occurrence(rule, n) {
  return rule.frequency === 'weekly' ? addDays(rule.startDate, 7 * n) : addMonths(rule.startDate, n)
}

// Dates the rule should have produced up to `upTo` that are not yet generated.
// Computed from startDate (not by repeated adding) so month-end clamping never drifts.
export function dueDates(rule, upTo) {
  const out = []
  for (let n = 0; n < MAX; n++) {
    const date = occurrence(rule, n)
    if (date > upTo) break
    if (!rule.lastGenerated || date > rule.lastGenerated) out.push(date)
  }
  return out
}

export function nextDue(rule) {
  for (let n = 0; n < MAX; n++) {
    const date = occurrence(rule, n)
    if (!rule.lastGenerated || date > rule.lastGenerated) return date
  }
  return null
}

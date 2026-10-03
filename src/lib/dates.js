// All dates are local-time ISO strings (YYYY-MM-DD); months are YYYY-MM.
const pad = (n) => String(n).padStart(2, '0')
const parse = (iso) => iso.split('-').map(Number)

export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const today = () => toISO(new Date())
export const currentMonth = () => today().slice(0, 7)

export function addDays(iso, n) {
  const [y, m, d] = parse(iso)
  return toISO(new Date(y, m - 1, d + n))
}

// Clamps to month end: Jan 31 + 1 month = Feb 28/29.
export function addMonths(iso, n) {
  const [y, m, d] = parse(iso)
  const first = new Date(y, m - 1 + n, 1)
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  return toISO(new Date(first.getFullYear(), first.getMonth(), Math.min(d, last)))
}

export const shiftMonth = (month, n) => addMonths(`${month}-01`, n).slice(0, 7)

export function monthLabel(month) {
  const [y, m] = parse(month)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function dayLabel(iso) {
  const [y, m, d] = parse(iso)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

export function daysInMonth(month) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export const monthEnd = (month) => `${month}-${String(daysInMonth(month)).padStart(2, '0')}`

// 0 = Monday ... 6 = Sunday
export function weekdayIndex(iso) {
  const [y, m, d] = parse(iso)
  return (new Date(y, m - 1, d).getDay() + 6) % 7
}

export function daysBetween(fromISO, toISO) {
  const [fy, fm, fd] = parse(fromISO)
  const [ty, tm, td] = parse(toISO)
  return Math.round((new Date(ty, tm - 1, td) - new Date(fy, fm - 1, fd)) / 86400000)
}

const SHORT = { weekday: 'short', day: 'numeric', month: 'short' }
export function shortDay(iso) {
  const [y, m, d] = parse(iso)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', SHORT).replace(',', '')
}

// "Today · Sun 18 Oct", "Yesterday · Sat 17 Oct", else "Fri 16 Oct".
export function relativeDay(iso, todayISO = today()) {
  const diff = daysBetween(iso, todayISO)
  const label = shortDay(iso)
  return diff === 0 ? `Today · ${label}` : diff === 1 ? `Yesterday · ${label}` : label
}

// "10 Jan 2029": for dates far enough away that the year matters (plan maturity).
export function dayYear(iso) {
  const [y, m, d] = parse(iso)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function monthName(month) {
  const [y, m] = parse(month)
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long' })
}

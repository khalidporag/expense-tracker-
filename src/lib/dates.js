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

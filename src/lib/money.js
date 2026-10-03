// Money is stored as integer minor units (poisha, 1 BDT = 100) to avoid float errors.
const whole = new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 })
const cents = new Intl.NumberFormat('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const toMinor = (value) => Math.round(parseFloat(value) * 100)
export const toInput = (minor) => String(minor / 100)

// ৳1,850 when exact, ৳1,850.50 when there are poisha. Negative as -৳1,850.
export function formatMoney(minor) {
  const abs = Math.abs(minor)
  const body = abs % 100 === 0 ? whole.format(abs / 100) : cents.format(abs / 100)
  return `${minor < 0 ? '-' : ''}৳${body}`
}

// Rounds to whole taka first: ৳1,181.54 -> ৳1,182. For allowances and forecasts.
export const formatTaka = (minor) => formatMoney(Math.round(minor / 100) * 100)

// Compact for chart labels: ৳47.6k
export function formatCompact(minor) {
  const t = Math.abs(minor) / 100
  return `${minor < 0 ? '-' : ''}৳${t >= 1000 ? `${(t / 1000).toFixed(1).replace(/\.0$/, '')}k` : Math.round(t)}`
}

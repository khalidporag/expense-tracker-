// Money is stored as integer minor units (poisha, 1 BDT = 100) to avoid float errors.
const nf = new Intl.NumberFormat('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const toMinor = (value) => Math.round(parseFloat(value) * 100)
export const toInput = (minor) => String(minor / 100)

export function formatMoney(minor) {
  const abs = nf.format(Math.abs(minor) / 100)
  return `${minor < 0 ? '-' : ''}৳${abs}`
}

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/index.js'

export const newestFirst = (a, b) => b.date.localeCompare(a.date) || b.id - a.id

// Transactions for a YYYY-MM month, newest first.
export function useMonthTransactions(month) {
  return (
    useLiveQuery(
      async () =>
        (await db.transactions.where('date').between(`${month}-01`, `${month}-32`).toArray()).sort(newestFirst),
      [month],
    ) || []
  )
}

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/index.js'

// Savings plans, recorded deposits and the monthly target setting. `ready` is false until all have loaded.
export function useSavings() {
  const plans = useLiveQuery(() => db.plans.toArray())
  const deposits = useLiveQuery(() => db.deposits.toArray())
  const setting = useLiveQuery(async () => (await db.settings.get('savingsTarget')) ?? null)
  const ready = !!(plans && deposits && setting !== undefined)
  return { ready, plans: plans || [], deposits: deposits || [], target: setting?.value ?? null }
}

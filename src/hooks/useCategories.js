import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/index.js'

// Returns { list, byId, ready }. `byId` is a Map for O(1) lookup in lists.
export function useCategories() {
  const list = useLiveQuery(() => db.categories.toArray())
  const byId = new Map((list || []).map((c) => [c.id, c]))
  return { list: list || [], byId, ready: !!list }
}

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/index.js'

// Returns { list, byId, byCategory, ready }. `byCategory` maps a category id to its subcategories, sorted by name.
export function useSubcategories() {
  const list = useLiveQuery(() => db.subcategories.toArray())
  const sorted = [...(list || [])].sort((a, b) => a.name.localeCompare(b.name))
  const byCategory = new Map()
  for (const s of sorted) byCategory.set(s.categoryId, [...(byCategory.get(s.categoryId) || []), s])
  return { list: sorted, byId: new Map(sorted.map((s) => [s.id, s])), byCategory, ready: !!list }
}

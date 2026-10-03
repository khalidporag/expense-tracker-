// "Search anything" ranking for the app's menu items. Pure: items in, ranked items out.
// An item is { id, title, group, keywords?: string[], boost?: number }.
// Every query word must match (title, keywords, or group). Matching tolerates typos and understands synonyms via keywords.

const fold = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
export const tokenize = (s) => fold(s).split(/[^a-z0-9ঀ-৿]+/).filter(Boolean)

// Levenshtein distance, giving up (returning max + 1) once it cannot stay within `max`.
export function editDistance(a, b, max = 2) {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      rowMin = Math.min(rowMin, cur[j])
    }
    if (rowMin > max) return max + 1
    prev = cur
  }
  return prev[b.length]
}

// How well one query word matches one item (0 = not at all).
function wordScore(t, item) {
  const title = fold(item.title)
  const titleWords = tokenize(item.title)
  const keywords = (item.keywords || []).map(fold)
  const keywordWords = keywords.flatMap(tokenize)
  let best = 0
  if (title === t) best = 100
  else if (title.startsWith(t)) best = 85
  else if (titleWords.includes(t)) best = 80
  else if (titleWords.some((w) => w.startsWith(t))) best = 70
  else if (t.length >= 2 && title.includes(t)) best = 45
  if (keywords.includes(t)) best = Math.max(best, 65)
  if (keywordWords.some((w) => w.startsWith(t))) best = Math.max(best, 50)
  if (t.length >= 3 && keywords.some((k) => k.includes(t))) best = Math.max(best, 30)

  if (best === 0 && t.length >= 4) {
    // typo tolerance: compare with whole words and with word starts (partly typed + a typo, or a dropped letter)
    const max = t.length >= 8 ? 2 : 1
    const d = Math.min(...[...titleWords, ...keywordWords].map((w) => Math.min(editDistance(t, w, max), editDistance(t, w.slice(0, t.length), max), editDistance(t, w.slice(0, t.length + 1), max))))
    if (d <= max) best = 28 - 6 * d
  }
  if (best === 0 && fold(item.group || '').includes(t)) best = 12
  return best
}

export function scoreItem(item, words) {
  let total = 0
  for (const w of words) {
    const s = wordScore(w, item)
    if (s === 0) return 0
    total += s
  }
  return total + (item.boost || 0)
}

export function searchItems(items, query, limit = 8) {
  const words = tokenize(query)
  if (words.length === 0) return []
  return items
    .map((item) => ({ item, score: scoreItem(item, words) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.length - b.item.title.length || a.item.title.localeCompare(b.item.title))
    .slice(0, limit)
    .map((r) => r.item)
}

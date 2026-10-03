// Category icons are keys into components/iconPaths.js (drawn icons, no emoji).
export const CATEGORY_ICON_KEYS = [
  'food', 'transport', 'bills', 'shopping', 'health', 'fun', 'box',
  'salary', 'business', 'gift', 'coins',
  'home', 'book', 'plane', 'coffee', 'phone', 'dumbbell', 'paw', 'tag',
]

// The emoji used by earlier versions, so old data and old backups keep their meaning.
const EMOJI_TO_KEY = {
  '🍽️': 'food', '🚌': 'transport', '💡': 'bills', '🛍️': 'shopping', '💊': 'health', '🎉': 'fun',
  '📦': 'box', '💼': 'salary', '🏪': 'business', '🎁': 'gift', '💰': 'coins',
}

export function normalizeIcon(icon) {
  if (CATEGORY_ICON_KEYS.includes(icon)) return icon
  return EMOJI_TO_KEY[icon] || 'tag'
}

// "Other" rows are `system`: they can't be deleted, they receive reassigned transactions.
export const defaultCategories = () => [
  { name: 'Food', kind: 'expense', icon: 'food' },
  { name: 'Transport', kind: 'expense', icon: 'transport' },
  { name: 'Bills', kind: 'expense', icon: 'bills' },
  { name: 'Shopping', kind: 'expense', icon: 'shopping' },
  { name: 'Health', kind: 'expense', icon: 'health' },
  { name: 'Fun', kind: 'expense', icon: 'fun' },
  { name: 'Other', kind: 'expense', icon: 'box', system: true },
  { name: 'Salary', kind: 'income', icon: 'salary' },
  { name: 'Business', kind: 'income', icon: 'business' },
  { name: 'Gift', kind: 'income', icon: 'gift' },
  { name: 'Other', kind: 'income', icon: 'coins', system: true },
]

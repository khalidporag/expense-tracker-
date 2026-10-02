// "Other" rows are `system`: they can't be deleted, they receive reassigned transactions.
export const defaultCategories = () => [
  { name: 'Food', kind: 'expense', icon: '🍽️' },
  { name: 'Transport', kind: 'expense', icon: '🚌' },
  { name: 'Bills', kind: 'expense', icon: '💡' },
  { name: 'Shopping', kind: 'expense', icon: '🛍️' },
  { name: 'Health', kind: 'expense', icon: '💊' },
  { name: 'Fun', kind: 'expense', icon: '🎉' },
  { name: 'Other', kind: 'expense', icon: '📦', system: true },
  { name: 'Salary', kind: 'income', icon: '💼' },
  { name: 'Business', kind: 'income', icon: '🏪' },
  { name: 'Gift', kind: 'income', icon: '🎁' },
  { name: 'Other', kind: 'income', icon: '💰', system: true },
]

import React, { useState } from 'react'
import Sheet from '../components/Sheet.jsx'
import { setBudget } from '../db/actions.js'
import { toMinor, toInput } from '../lib/money.js'

// `budget` may be undefined (no limit yet).
export default function BudgetForm({ category, budget, onClose }) {
  const [limit, setLimit] = useState(budget ? toInput(budget.limit) : '')
  const minor = limit ? toMinor(limit) : 0

  const submit = async (e) => {
    e.preventDefault()
    if (!(minor > 0)) return
    await setBudget(category.id, minor)
    onClose()
  }
  const remove = async () => {
    await setBudget(category.id, 0)
    onClose()
  }

  return (
    <Sheet title={`${category.name} budget`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <p className="muted">Monthly limit. Applies to every month.</p>
        <input autoFocus className="field big-input" type="number" inputMode="decimal" step="0.01" min="0" placeholder="৳ 0"
          aria-label="Monthly limit" value={limit} onChange={(e) => setLimit(e.target.value)} />
        <div className="btn-row">
          {budget && <button type="button" className="btn lg danger" onClick={remove}>Remove</button>}
          <button type="submit" className="btn lg blue" disabled={!(minor > 0)}>Save</button>
        </div>
      </form>
    </Sheet>
  )
}

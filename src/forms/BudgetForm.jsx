import React, { useState } from 'react'
import Sheet from '../components/Sheet.jsx'
import SubAdder from '../components/SubAdder.jsx'
import { useSubcategories } from '../hooks/useSubcategories.js'
import { setBudget, setSubLimit, addSubcategories } from '../db/actions.js'
import { toMinor, toInput, formatMoney } from '../lib/money.js'

// `budget` may be undefined (no limit yet). Subcategory limits are optional shares of the category limit.
export default function BudgetForm({ category, budget, onClose }) {
  const { byCategory } = useSubcategories()
  const subs = byCategory.get(category.id) || []
  const [limit, setLimit] = useState(budget ? toInput(budget.limit) : '')
  const [subLimits, setSubLimits] = useState({}) // subcategory id -> text typed this session (others show the saved limit)
  const minor = limit ? toMinor(limit) : 0
  const subText = (s) => subLimits[s.id] ?? (s.limit > 0 ? toInput(s.limit) : '')
  const subMinor = (s) => { const t = subText(s); return t ? toMinor(t) : 0 }
  const allocated = subs.reduce((sum, s) => sum + subMinor(s), 0)
  const left = minor - allocated

  const submit = async (e) => {
    e.preventDefault()
    if (!(minor > 0)) return
    await setBudget(category.id, minor)
    for (const s of subs) if (subMinor(s) !== (s.limit || 0)) await setSubLimit(s.id, subMinor(s))
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

        <section className="stack tight" aria-label="Subcategory limits" style={{ borderTop: '1px solid var(--soft)', paddingTop: 14 }}>
          <div className="eyebrow">Limits by subcategory (optional)</div>
          <p className="muted small">Give a part of {category.name}, such as Electricity, its own monthly limit. It is a share of the {category.name} budget above, so your totals do not change.</p>
          {subs.map((s) => (
            <div className="row" key={s.id}>
              <label className="grow" htmlFor={`sub-limit-${s.id}`} style={{ fontWeight: 600 }}>{s.name}</label>
              <input id={`sub-limit-${s.id}`} className="field" style={{ width: 130, flex: 'none' }} type="number" inputMode="decimal" step="0.01" min="0" placeholder="No limit"
                aria-label={`${s.name} monthly limit`} value={subText(s)} onChange={(e) => setSubLimits({ ...subLimits, [s.id]: e.target.value })} />
            </div>
          ))}
          {allocated > 0 && minor > 0 && (
            <p className={left < 0 ? 'small over-ink' : 'muted small'} role="status" style={left < 0 ? { fontWeight: 600 } : undefined}>
              {left < 0 ? `Over by ${formatMoney(-left)}: these limits add up to more than the ${category.name} budget.` : `${formatMoney(allocated)} given out · ${formatMoney(left)} not split`}
            </p>
          )}
          <SubAdder categoryName={category.name} existing={subs.map((s) => s.name)} onAdd={(names) => addSubcategories(category.id, names)} />
        </section>

        <div className="btn-row">
          {budget && <button type="button" className="btn lg danger" onClick={remove}>Remove</button>}
          <button type="submit" className="btn lg blue" disabled={!(minor > 0)}>Save</button>
        </div>
      </form>
    </Sheet>
  )
}

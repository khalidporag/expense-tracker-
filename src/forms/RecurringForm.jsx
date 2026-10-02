import React, { useState } from 'react'
import Sheet from '../components/Sheet.jsx'
import { Segmented, CategoryChips } from '../components/Bits.jsx'
import { useCategories } from '../hooks/useCategories.js'
import { saveRecurring, deleteRecurring } from '../db/actions.js'
import { toMinor, toInput } from '../lib/money.js'
import { today } from '../lib/dates.js'

export default function RecurringForm({ initial, onClose }) {
  const { list } = useCategories()
  const [type, setType] = useState(initial?.type || 'expense')
  const [amount, setAmount] = useState(initial ? toInput(initial.amount) : '')
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? null)
  const [note, setNote] = useState(initial?.note || '')
  const [frequency, setFrequency] = useState(initial?.frequency || 'monthly')
  const [startDate, setStartDate] = useState(initial?.startDate || today())
  const [active, setActive] = useState(initial ? initial.active : true)

  const cats = list.filter((c) => c.kind === type)
  const chosen = cats.some((c) => c.id === categoryId) ? categoryId : cats[0]?.id
  const minor = toMinor(amount)
  const valid = minor > 0 && chosen != null && startDate

  const submit = async (e) => {
    e.preventDefault()
    if (!valid) return
    await saveRecurring({ ...initial, type, amount: minor, categoryId: chosen, note: note.trim(), frequency, startDate, active })
    onClose()
  }
  const remove = async () => {
    if (confirm('Delete this recurring item? Entries already created are kept.')) {
      await deleteRecurring(initial.id)
      onClose()
    }
  }

  return (
    <Sheet title={initial ? 'Edit recurring' : 'New recurring'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Segmented value={type} onChange={setType}
          options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} />
        <input autoFocus className="big" type="number" inputMode="decimal" step="0.01" min="0" placeholder="৳ 0"
          aria-label="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <CategoryChips categories={cats} value={chosen} onChange={setCategoryId} />
        <input type="text" placeholder="Note, e.g. Rent" aria-label="Note" value={note} onChange={(e) => setNote(e.target.value)} />
        <Segmented value={frequency} onChange={setFrequency}
          options={[{ value: 'monthly', label: 'Monthly' }, { value: 'weekly', label: 'Weekly' }]} />
        {!initial && (
          <>
            <label className="muted" htmlFor="rec-start">First date (past dates are added right away)</label>
            <input id="rec-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </>
        )}
        {initial && (
          <label className="check">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active
          </label>
        )}
        <div className="row">
          {initial && <button type="button" className="danger" onClick={remove}>Delete</button>}
          <button type="submit" className="primary" disabled={!valid}>Save</button>
        </div>
      </form>
    </Sheet>
  )
}

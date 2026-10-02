import React, { useState } from 'react'
import Sheet from '../components/Sheet.jsx'
import { Segmented, CategoryChips } from '../components/Bits.jsx'
import { useCategories } from '../hooks/useCategories.js'
import { saveTransaction, deleteTransaction } from '../db/actions.js'
import { toMinor, toInput } from '../lib/money.js'
import { today } from '../lib/dates.js'

// `initial` is an existing transaction (edit) or undefined (add).
export default function TransactionForm({ initial, onClose }) {
  const { list } = useCategories()
  const [type, setType] = useState(initial?.type || 'expense')
  const [amount, setAmount] = useState(initial ? toInput(initial.amount) : '')
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? null)
  const [date, setDate] = useState(initial?.date || today())
  const [note, setNote] = useState(initial?.note || '')

  const cats = list.filter((c) => c.kind === type)
  const chosen = cats.some((c) => c.id === categoryId) ? categoryId : cats[0]?.id
  const minor = toMinor(amount)
  const valid = minor > 0 && chosen != null && date

  const submit = async (e) => {
    e.preventDefault()
    if (!valid) return
    await saveTransaction({ ...initial, type, amount: minor, categoryId: chosen, date, note: note.trim() })
    onClose()
  }
  const remove = async () => {
    if (confirm('Delete this entry?')) {
      await deleteTransaction(initial.id)
      onClose()
    }
  }

  return (
    <Sheet title={initial ? 'Edit entry' : 'New entry'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Segmented value={type} onChange={setType}
          options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} />
        <input autoFocus className="big" type="number" inputMode="decimal" step="0.01" min="0" placeholder="৳ 0"
          aria-label="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <CategoryChips categories={cats} value={chosen} onChange={setCategoryId} />
        <input type="date" aria-label="Date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input type="text" placeholder="Note (optional)" aria-label="Note" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="row">
          {initial && <button type="button" className="danger" onClick={remove}>Delete</button>}
          <button type="submit" className="primary" disabled={!valid}>Save</button>
        </div>
      </form>
    </Sheet>
  )
}

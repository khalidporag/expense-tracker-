import React, { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Sheet from '../components/Sheet.jsx'
import Icon from '../components/Icon.jsx'
import { Segmented, CategoryChips } from '../components/Bits.jsx'
import { useCategories } from '../hooks/useCategories.js'
import { db } from '../db/index.js'
import { saveTransaction, deleteTransaction } from '../db/actions.js'
import { toMinor, toInput, formatMoney } from '../lib/money.js'
import { today, relativeDay } from '../lib/dates.js'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back']
const MAX_INT = 9

// Applies one keypad press to the amount string; returns the new string.
export function pressKey(amount, key) {
  if (key === 'back') return amount.slice(0, -1)
  if (key === '.') return amount.includes('.') ? amount : `${amount || '0'}.`
  const [int, dec] = amount.split('.')
  if (dec !== undefined) return dec.length >= 2 ? amount : amount + key
  if (int.length >= MAX_INT) return amount
  return int === '0' ? key : amount + key
}

function groupDigits(amount) {
  if (!amount) return ''
  const [int, dec] = amount.split('.')
  const grouped = new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(Number(int || 0))
  return dec === undefined ? grouped : `${grouped}.${dec}`
}

// What this entry does to the category's budget, before it is saved.
function budgetImpact({ type, category, minor, budgets, monthTxs, editingId }) {
  if (type !== 'expense' || !(minor > 0) || !category) return null
  const budget = budgets.find((b) => b.categoryId === category.id)
  if (!budget) return null
  const others = monthTxs.filter((t) => t.type === 'expense' && t.id !== editingId)
  const before = others.filter((t) => t.categoryId === category.id).reduce((s, t) => s + t.amount, 0)
  const after = before + minor
  const budgeted = new Set(budgets.map((b) => b.categoryId))
  const totalBudget = budgets.reduce((s, b) => s + b.limit, 0)
  const totalSpent = others.filter((t) => budgeted.has(t.categoryId)).reduce((s, t) => s + t.amount, 0) + minor
  const totalLeft = totalBudget - totalSpent
  const totalNote = `Total budget left: ${formatMoney(totalLeft)}.`
  if (after > budget.limit) {
    const now = before > budget.limit ? ` (now ${formatMoney(before - budget.limit)} over)` : ''
    return { over: true, text: `${category.name} would be ${formatMoney(after - budget.limit)} over budget${now}. ${totalNote}` }
  }
  return { over: false, text: `${category.name} will have ${formatMoney(budget.limit - after)} left this month. ${totalNote}` }
}

// `initial` is an existing transaction (edit) or undefined (add).
export default function TransactionForm({ initial, onClose }) {
  const { list } = useCategories()
  const [type, setType] = useState(initial?.type || 'expense')
  const [amount, setAmount] = useState(initial ? toInput(initial.amount) : '')
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? null)
  const [date, setDate] = useState(initial?.date || today())
  const [note, setNote] = useState(initial?.note || '')
  const [noteOpen, setNoteOpen] = useState(!!initial?.note)

  const recent = useLiveQuery(() => db.transactions.orderBy('id').reverse().limit(120).toArray()) || []
  const budgets = useLiveQuery(() => db.budgets.toArray()) || []
  const month = date.slice(0, 7)
  const monthTxs = useLiveQuery(() => db.transactions.where('date').between(`${month}-01`, `${month}-32`).toArray(), [month]) || []

  // Categories ranked by how often you used them lately.
  const cats = useMemo(() => {
    const uses = new Map()
    for (const t of recent) uses.set(t.categoryId, (uses.get(t.categoryId) || 0) + 1)
    return list.filter((c) => c.kind === type).sort((a, b) => (uses.get(b.id) || 0) - (uses.get(a.id) || 0) || a.id - b.id)
  }, [list, recent, type])
  const chosen = cats.some((c) => c.id === categoryId) ? categoryId : cats[0]?.id
  const category = cats.find((c) => c.id === chosen)
  const minor = amount ? toMinor(amount) : 0
  const valid = minor > 0 && chosen != null && !!date

  // Up to three distinct recent entries to repeat in one tap.
  const repeats = useMemo(() => {
    if (initial) return []
    const seen = new Set()
    const out = []
    for (const t of recent) {
      if (t.type !== type || t.recurringId != null) continue
      const key = `${t.note || ''}|${t.categoryId}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(t)
      if (out.length === 3) break
    }
    return out
  }, [recent, type, initial])

  const impact = budgetImpact({ type, category, minor, budgets, monthTxs, editingId: initial?.id })

  const press = (k) => setAmount((a) => pressKey(a, k))
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input, select, textarea') || e.metaKey || e.ctrlKey || e.altKey) return
      if (/^[0-9.]$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') press('back')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const apply = (t) => {
    setAmount(toInput(t.amount))
    setCategoryId(t.categoryId)
    setNote(t.note || '')
    setNoteOpen(!!t.note)
  }
  const save = async () => {
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

  const header = (
    <Segmented label="Entry type" value={type} onChange={setType}
      options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} />
  )
  const catById = new Map(list.map((c) => [c.id, c]))

  return (
    <Sheet title={initial ? 'Edit entry' : 'New entry'} header={<div style={{ width: 200 }}>{header}</div>} onClose={onClose}>
      <div className="amount" aria-live="polite" aria-label={`Amount ${amount || 0} taka`}>
        <span className="cur" aria-hidden="true">৳</span>
        <span className={amount ? 'val' : 'val empty'}>{groupDigits(amount) || '0'}</span>
        <span className="caret" aria-hidden="true" />
      </div>

      {impact && (
        <div className={impact.over ? 'impact over' : 'impact'} role="status">
          <Icon name={impact.over ? 'warn' : 'info'} size={18} stroke={2} />
          <span>{impact.text}</span>
        </div>
      )}

      <CategoryChips categories={cats} value={chosen} onChange={setCategoryId} />

      {repeats.length > 0 && (
        <div className="repeat">
          <span className="eyebrow">Repeat</span>
          <div className="chips scroll" style={{ flex: 1, margin: 0, padding: 0 }}>
            {repeats.map((t) => (
              <button key={t.id} type="button" className="chip soft" onClick={() => apply(t)}>
                {t.note || catById.get(t.categoryId)?.name} · {formatMoney(t.amount)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="row">
        <label className="btn quiet date-pick grow" style={{ flex: 1.4 }}>
          <Icon name="calendar" size={18} />{relativeDay(date)}
          <input type="date" aria-label="Date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </label>
        <button type="button" className="btn quiet grow" onClick={() => setNoteOpen((o) => !o)} aria-expanded={noteOpen}>
          <Icon name="pencil" size={18} />{note && !noteOpen ? 'Edit note' : 'Add note'}
        </button>
      </div>
      {noteOpen && <input className="field" type="text" placeholder="Note, e.g. Lunch" aria-label="Note" value={note} onChange={(e) => setNote(e.target.value)} />}

      <div className="keypad" role="group" aria-label="Amount keypad">
        {KEYS.map((k) => (
          <button key={k} type="button" onClick={() => press(k)}
            aria-label={k === 'back' ? 'Delete last digit' : k === '.' ? 'Decimal point' : k}>
            {k === 'back' ? <Icon name="backspace" size={24} stroke={1.9} /> : k}
          </button>
        ))}
      </div>

      <div className="btn-row">
        {initial && <button type="button" className="btn lg danger" onClick={remove}>Delete</button>}
        <button type="button" className="btn lg blue" style={{ flex: 2 }} disabled={!valid} onClick={save}>
          {initial ? 'Save changes' : type === 'income' ? 'Save income' : 'Save expense'}{minor > 0 ? ` · ${formatMoney(minor)}` : ''}
        </button>
      </div>
    </Sheet>
  )
}

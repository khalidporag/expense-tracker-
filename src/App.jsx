import React, { useEffect, useMemo, useState } from 'react'
import { db, CATEGORIES, exportJson, importJson } from './db.js'

const today = () => new Date().toISOString().slice(0, 10)
const fmt = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function useExpenses() {
  const [rows, setRows] = useState([])
  const load = async () => setRows(await db.expenses.orderBy('date').reverse().toArray())
  useEffect(() => { load() }, [])
  return [rows, load]
}

function Form({ initial, onSave, onCancel }) {
  const [f, setF] = useState(initial || { amount: '', category: CATEGORIES[0], date: today(), note: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const submit = (e) => {
    e.preventDefault()
    const amount = parseFloat(f.amount)
    if (!(amount > 0)) return
    onSave({ ...f, amount })
  }
  return (
    <form className="sheet" onSubmit={submit}>
      <h2>{initial ? 'Edit expense' : 'Add expense'}</h2>
      <input autoFocus type="number" inputMode="decimal" step="0.01" placeholder="Amount"
        value={f.amount} onChange={set('amount')} className="big" />
      <div className="chips">
        {CATEGORIES.map((c) => (
          <button type="button" key={c} className={c === f.category ? 'chip on' : 'chip'}
            onClick={() => setF({ ...f, category: c })}>{c}</button>
        ))}
      </div>
      <input type="date" value={f.date} onChange={set('date')} />
      <input type="text" placeholder="Note (optional)" value={f.note} onChange={set('note')} />
      <div className="row">
        <button type="button" className="ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="primary">Save</button>
      </div>
    </form>
  )
}

function Summary({ rows, month }) {
  const inMonth = rows.filter((r) => r.date.startsWith(month))
  const total = inMonth.reduce((s, r) => s + r.amount, 0)
  const byCat = useMemo(() => {
    const m = {}
    inMonth.forEach((r) => { m[r.category] = (m[r.category] || 0) + r.amount })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [rows, month])
  return (
    <div className="card">
      <div className="total">{fmt(total)}</div>
      <div className="muted">spent in {month}</div>
      {byCat.map(([c, v]) => (
        <div key={c} className="bar">
          <span>{c}</span>
          <div className="track"><div style={{ width: `${(v / total) * 100}%` }} /></div>
          <span>{fmt(v)}</span>
        </div>
      ))}
    </div>
  )
}

export default function App() {
  const [rows, reload] = useExpenses()
  const [editing, setEditing] = useState(null) // null | 'new' | expense
  const [month, setMonth] = useState(today().slice(0, 7))

  const save = async (data) => {
    if (data.id) await db.expenses.put(data)
    else await db.expenses.add(data)
    setEditing(null)
    reload()
  }
  const remove = async (id) => {
    if (confirm('Delete this expense?')) { await db.expenses.delete(id); reload() }
  }
  const doExport = async () => {
    const blob = new Blob([await exportJson()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `expenses-${today()}.json`
    a.click()
  }
  const doImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try { await importJson(await file.text()); reload() } catch (err) { alert(err.message) }
    e.target.value = ''
  }

  const list = rows.filter((r) => r.date.startsWith(month))

  return (
    <div className="app">
      <header>
        <h1>Expenses</h1>
        <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
      </header>
      <main>
        <Summary rows={rows} month={month} />
        {list.length === 0 && <p className="muted center">No expenses this month.</p>}
        <ul className="list">
          {list.map((r) => (
            <li key={r.id} onClick={() => setEditing(r)}>
              <div>
                <strong>{r.category}</strong>
                <div className="muted">{r.date}{r.note ? ` · ${r.note}` : ''}</div>
              </div>
              <div className="right">
                {fmt(r.amount)}
                <button className="x" onClick={(e) => { e.stopPropagation(); remove(r.id) }}>✕</button>
              </div>
            </li>
          ))}
        </ul>
        <div className="row backup">
          <button className="ghost" onClick={doExport}>Export backup</button>
          <label className="ghost btn">Import<input type="file" accept="application/json" hidden onChange={doImport} /></label>
        </div>
      </main>
      <button className="fab" onClick={() => setEditing('new')}>+</button>
      {editing && (
        <div className="overlay">
          <Form initial={editing === 'new' ? null : { ...editing, amount: String(editing.amount) }}
            onSave={save} onCancel={() => setEditing(null)} />
        </div>
      )}
    </div>
  )
}

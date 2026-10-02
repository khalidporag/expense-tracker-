import React, { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Empty } from '../components/Bits.jsx'
import CategoryForm from '../forms/CategoryForm.jsx'
import RecurringForm from '../forms/RecurringForm.jsx'
import { useCategories } from '../hooks/useCategories.js'
import { db } from '../db/index.js'
import { exportBackup, importBackup } from '../db/backup.js'
import { nextDue } from '../lib/recurring.js'
import { formatMoney } from '../lib/money.js'
import { dayLabel, today } from '../lib/dates.js'

const Back = ({ onClick }) => <button className="link" onClick={onClick}>‹ Back</button>

function Categories({ onBack }) {
  const { list } = useCategories()
  const [editing, setEditing] = useState(null) // category | 'new'
  return (
    <>
      <div className="section-head"><Back onClick={onBack} /><button className="link" onClick={() => setEditing('new')}>+ Add</button></div>
      {['expense', 'income'].map((kind) => (
        <section key={kind}>
          <h3>{kind === 'expense' ? 'Expense' : 'Income'} categories</h3>
          <ul className="list">
            {list.filter((c) => c.kind === kind).map((c) => (
              <li key={c.id} className="row-item" onClick={() => setEditing(c)}>
                <span className="avatar" aria-hidden="true">{c.icon}</span><strong className="grow">{c.name}</strong><span className="muted">Edit</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {editing && <CategoryForm initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function Recurring({ onBack }) {
  const rules = useLiveQuery(() => db.recurring.toArray()) || []
  const { byId } = useCategories()
  const [editing, setEditing] = useState(null)
  return (
    <>
      <div className="section-head"><Back onClick={onBack} /><button className="link" onClick={() => setEditing('new')}>+ Add</button></div>
      <h3>Recurring</h3>
      {rules.length === 0 && <Empty icon="🔁">No recurring items. Add rent, subscriptions, salary…</Empty>}
      <ul className="list">
        {rules.map((r) => {
          const c = byId.get(r.categoryId)
          return (
            <li key={r.id} className="row-item" onClick={() => setEditing(r)}>
              <span className="avatar" aria-hidden="true">{c?.icon}</span>
              <div className="grow">
                <strong>{r.note || c?.name}</strong>
                <div className="muted">
                  {r.frequency === 'weekly' ? 'Weekly' : 'Monthly'} · {r.active ? `next ${dayLabel(nextDue(r))}` : 'paused'}
                </div>
              </div>
              <div className={r.type === 'income' ? 'amt income' : 'amt'}>{formatMoney(r.amount)}</div>
            </li>
          )
        })}
      </ul>
      {editing && <RecurringForm initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function Backup({ onBack }) {
  const file = useRef()
  const [msg, setMsg] = useState('')
  const doExport = async () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([await exportBackup()], { type: 'application/json' }))
    a.download = `expense-backup-${today()}.json`
    a.click()
    setMsg('Backup downloaded.')
  }
  const doImport = async (e) => {
    const f = e.target.files[0]
    e.target.value = ''
    if (!f) return
    if (!confirm('Importing REPLACES all current data. Continue?')) return
    try {
      await importBackup(await f.text())
      setMsg('Backup restored.')
    } catch (err) {
      setMsg(err.message)
    }
  }
  return (
    <>
      <div className="section-head"><Back onClick={onBack} /></div>
      <h3>Backup</h3>
      <p className="muted">Your data lives only on this phone. Export a backup regularly and keep the file somewhere safe (Drive, email to yourself).</p>
      <div className="row">
        <button className="primary" onClick={doExport}>Export backup</button>
        <button className="ghost" onClick={() => file.current.click()}>Import backup</button>
      </div>
      <input ref={file} type="file" accept="application/json,.json" hidden onChange={doImport} />
      {msg && <p role="status" className="center">{msg}</p>}
    </>
  )
}

export default function More() {
  const [view, setView] = useState(null)
  const back = () => setView(null)
  if (view === 'categories') return <Categories onBack={back} />
  if (view === 'recurring') return <Recurring onBack={back} />
  if (view === 'backup') return <Backup onBack={back} />
  return (
    <>
      <h3>More</h3>
      <ul className="list">
        {[['categories', '🏷️', 'Categories'], ['recurring', '🔁', 'Recurring'], ['backup', '💾', 'Backup & restore']].map(([id, icon, label]) => (
          <li key={id} className="row-item" onClick={() => setView(id)}>
            <span className="avatar" aria-hidden="true">{icon}</span><strong className="grow">{label}</strong><span className="muted">›</span>
          </li>
        ))}
      </ul>
    </>
  )
}

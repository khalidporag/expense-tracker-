import React, { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Icon, { CategoryIcon } from '../components/Icon.jsx'
import { Empty, Segmented } from '../components/Bits.jsx'
import CategoryForm from '../forms/CategoryForm.jsx'
import RecurringForm from '../forms/RecurringForm.jsx'
import { useCategories } from '../hooks/useCategories.js'
import { db } from '../db/index.js'
import { exportBackup, importBackup } from '../db/backup.js'
import { nextDue } from '../lib/recurring.js'
import { formatMoney } from '../lib/money.js'
import { shortDay, today } from '../lib/dates.js'
import { getThemePref, setThemePref } from '../lib/theme.js'

const Back = ({ onClick, children }) => (
  <div className="section-head">
    <button className="link" onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}><Icon name="chevL" size={18} stroke={2} />Back</button>
    {children}
  </div>
)

function Categories({ onBack }) {
  const { list } = useCategories()
  const [editing, setEditing] = useState(null) // category | 'new'
  return (
    <div className="stack tight">
      <Back onClick={onBack}><button className="link" onClick={() => setEditing('new')}>+ Add</button></Back>
      <h1 className="title">Categories</h1>
      {['expense', 'income'].map((kind) => (
        <section key={kind} className="stack tight">
          <h2 className="h2">{kind === 'expense' ? 'Expense' : 'Income'}</h2>
          <ul className="list">
            {list.filter((c) => c.kind === kind).map((c) => (
              <li key={c.id}>
                <button className="row-card" onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`}>
                  <CategoryIcon category={c} tone={kind === 'income' ? 'pos' : ''} /><strong className="grow">{c.name}</strong><span className="muted small">Edit</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {editing && <CategoryForm initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function Recurring({ onBack }) {
  const rules = useLiveQuery(() => db.recurring.toArray()) || []
  const { byId } = useCategories()
  const [editing, setEditing] = useState(null)
  return (
    <div className="stack tight">
      <Back onClick={onBack}><button className="link" onClick={() => setEditing('new')}>+ Add</button></Back>
      <h1 className="title">Recurring</h1>
      {rules.length === 0 && <Empty icon="repeat">No recurring items. Add rent, subscriptions, salary…</Empty>}
      <ul className="list">
        {rules.map((r) => {
          const c = byId.get(r.categoryId)
          return (
            <li key={r.id}>
              <button className="row-card" onClick={() => setEditing(r)}>
                <CategoryIcon category={c} tone={r.type === 'income' ? 'pos' : ''} />
                <span className="grow">
                  <strong>{r.note || c?.name}</strong>
                  <span className="muted small">{r.frequency === 'weekly' ? 'Weekly' : 'Monthly'} · {r.active ? `next ${shortDay(nextDue(r))}` : 'paused'}</span>
                </span>
                <span className={r.type === 'income' ? 'amt in' : 'amt'}>{formatMoney(r.amount)}</span>
              </button>
            </li>
          )
        })}
      </ul>
      {editing && <RecurringForm initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>
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
    <div className="stack tight">
      <Back onClick={onBack} />
      <h1 className="title">Backup</h1>
      <p className="muted">Your data lives only on this phone. Export a backup regularly and keep the file somewhere safe (Drive, email to yourself).</p>
      <div className="btn-row">
        <button className="btn lg ink" onClick={doExport}><Icon name="download" />Export</button>
        <button className="btn lg" onClick={() => file.current.click()}><Icon name="upload" />Import</button>
      </div>
      <input ref={file} type="file" accept="application/json,.json" hidden onChange={doImport} />
      {msg && <p role="status" className="center">{msg}</p>}
    </div>
  )
}

function Appearance() {
  const [pref, setPref] = useState(getThemePref())
  const choose = (v) => { setThemePref(v); setPref(v) }
  return (
    <section className="card sm stack tight" aria-label="Appearance">
      <div className="between"><strong>Appearance</strong><span className="muted small">{pref === 'system' ? 'Matches your phone' : `Always ${pref}`}</span></div>
      <Segmented label="Theme" value={pref} onChange={choose}
        options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
    </section>
  )
}

const ITEMS = [['categories', 'tag', 'Categories'], ['recurring', 'repeat', 'Recurring'], ['backup', 'download', 'Backup & restore']]

export default function More({ onBack, initialView = null }) {
  const [view, setView] = useState(initialView)
  const back = () => setView(null)
  if (view === 'categories') return <Categories onBack={back} />
  if (view === 'recurring') return <Recurring onBack={back} />
  if (view === 'backup') return <Backup onBack={back} />
  return (
    <div className="stack tight">
      <Back onClick={onBack} />
      <h1 className="title">Settings</h1>
      <Appearance />
      <ul className="list">
        {ITEMS.map(([id, icon, label]) => (
          <li key={id}>
            <button className="row-card" onClick={() => setView(id)}>
              <span className="badge" style={{ width: 40, height: 40 }}><Icon name={icon} /></span><strong className="grow">{label}</strong><Icon name="chevR" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

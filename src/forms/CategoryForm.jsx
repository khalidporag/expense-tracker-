import React, { useState } from 'react'
import Sheet from '../components/Sheet.jsx'
import Icon from '../components/Icon.jsx'
import { Segmented } from '../components/Bits.jsx'
import { db } from '../db/index.js'
import { saveCategory, deleteCategory } from '../db/actions.js'
import { CATEGORY_ICON_KEYS, normalizeIcon } from '../db/seed.js'

export default function CategoryForm({ initial, onClose }) {
  const [name, setName] = useState(initial?.name || '')
  const [icon, setIcon] = useState(normalizeIcon(initial?.icon || 'tag'))
  const [kind, setKind] = useState(initial?.kind || 'expense')
  const valid = name.trim().length > 0

  const submit = async (e) => {
    e.preventDefault()
    if (!valid) return
    await saveCategory({ ...initial, name: name.trim(), icon, kind })
    onClose()
  }
  const remove = async () => {
    const n = await db.transactions.where('categoryId').equals(initial.id).count()
    const msg = n ? `Delete "${initial.name}"? ${n} entries will move to "Other".` : `Delete "${initial.name}"?`
    if (confirm(msg)) {
      await deleteCategory(initial.id)
      onClose()
    }
  }

  return (
    <Sheet title={initial ? 'Edit category' : 'New category'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        {!initial && (
          <Segmented label="Kind" value={kind} onChange={setKind}
            options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} />
        )}
        <input autoFocus aria-label="Name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="eyebrow">Icon</div>
        <div className="icon-grid" role="group" aria-label="Icon">
          {CATEGORY_ICON_KEYS.map((k) => (
            <button type="button" key={k} className={k === icon ? 'on' : ''} aria-pressed={k === icon} aria-label={k} onClick={() => setIcon(k)}>
              <Icon name={k} size={22} />
            </button>
          ))}
        </div>
        <div className="btn-row">
          {initial && !initial.system && <button type="button" className="btn lg danger" onClick={remove}>Delete</button>}
          <button type="submit" className="btn lg blue" disabled={!valid}>Save</button>
        </div>
        {initial?.system && <p className="muted small">"Other" can be renamed but not deleted. It receives entries from deleted categories.</p>}
      </form>
    </Sheet>
  )
}

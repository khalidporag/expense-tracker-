import React, { useState } from 'react'
import Sheet from '../components/Sheet.jsx'
import { Segmented } from '../components/Bits.jsx'
import { db } from '../db/index.js'
import { saveCategory, deleteCategory } from '../db/actions.js'

export default function CategoryForm({ initial, onClose }) {
  const [name, setName] = useState(initial?.name || '')
  const [icon, setIcon] = useState(initial?.icon || '🏷️')
  const [kind, setKind] = useState(initial?.kind || 'expense')
  const valid = name.trim().length > 0

  const submit = async (e) => {
    e.preventDefault()
    if (!valid) return
    await saveCategory({ ...initial, name: name.trim(), icon: icon.trim() || '🏷️', kind })
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
          <Segmented value={kind} onChange={setKind}
            options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} />
        )}
        <div className="row">
          <input className="icon-input" aria-label="Icon (emoji)" maxLength="4" value={icon} onChange={(e) => setIcon(e.target.value)} />
          <input autoFocus aria-label="Name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="row">
          {initial && !initial.system && <button type="button" className="danger" onClick={remove}>Delete</button>}
          <button type="submit" className="primary" disabled={!valid}>Save</button>
        </div>
        {initial?.system && <p className="muted">"Other" can be renamed but not deleted. It receives entries from deleted categories.</p>}
      </form>
    </Sheet>
  )
}

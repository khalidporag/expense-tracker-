import React, { useState } from 'react'
import Icon from './Icon.jsx'
import { useSubcategories } from '../hooks/useSubcategories.js'
import { db } from '../db/index.js'
import { saveSubcategory, deleteSubcategory } from '../db/actions.js'

function SubRow({ sub }) {
  const [name, setName] = useState(sub.name)
  const commit = async () => {
    const n = name.trim()
    if (!n) return setName(sub.name)
    if (n !== sub.name) await saveSubcategory({ ...sub, name: n })
  }
  const remove = async () => {
    const used = await db.transactions.where('subcategoryId').equals(sub.id).count()
    const msg = used ? `Delete "${sub.name}"? ${used} entries keep their category and amount but lose this label.` : `Delete "${sub.name}"?`
    if (confirm(msg)) await deleteSubcategory(sub.id)
  }
  return (
    <div className="row">
      <input className="field" aria-label={`Rename ${sub.name}`} value={name} onChange={(e) => setName(e.target.value)} onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
      <button type="button" className="icon-btn" onClick={remove} aria-label={`Delete ${sub.name}`}><Icon name="trash" size={18} /></button>
    </div>
  )
}

// Manage the subcategories of one expense category (inside the category sheet).
export default function SubcategoryEditor({ category }) {
  const { byCategory } = useSubcategories()
  const subs = byCategory.get(category.id) || []
  const [name, setName] = useState('')
  const add = async () => {
    const n = name.trim()
    if (n && !subs.some((s) => s.name.toLowerCase() === n.toLowerCase())) await saveSubcategory({ categoryId: category.id, name: n })
    setName('')
  }
  return (
    <section className="stack tight" aria-label="Subcategories" style={{ borderTop: '1px solid var(--soft)', paddingTop: 14 }}>
      <div className="eyebrow">Subcategories</div>
      <p className="muted small">Split {category.name} into parts, such as Electricity and Gas. Budgets stay on {category.name}; subcategories add detail to its usage.</p>
      {subs.map((s) => <SubRow key={s.id} sub={s} />)}
      <div className="row">
        <input className="field" placeholder="New subcategory" aria-label="New subcategory" value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} />
        <button type="button" className="btn blue" disabled={!name.trim()} onClick={add}>Add</button>
      </div>
    </section>
  )
}

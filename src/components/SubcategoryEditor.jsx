import React, { useState } from 'react'
import Icon from './Icon.jsx'
import { useSubcategories } from '../hooks/useSubcategories.js'
import { db } from '../db/index.js'
import SubAdder from './SubAdder.jsx'
import { saveSubcategory, deleteSubcategory, addSubcategories } from '../db/actions.js'

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

const Intro = ({ name }) => <p className="muted small">Split {name} into parts, such as Electricity and Gas. You can give each part its own monthly limit from the {name} budget.</p>

// Manage the subcategories of one saved expense category (inside the category sheet).
export default function SubcategoryEditor({ category }) {
  const { byCategory } = useSubcategories()
  const subs = byCategory.get(category.id) || []
  return (
    <section className="stack tight" aria-label="Subcategories" style={{ borderTop: '1px solid var(--soft)', paddingTop: 14 }}>
      <div className="eyebrow">Subcategories</div>
      <Intro name={category.name} />
      {subs.map((s) => <SubRow key={s.id} sub={s} />)}
      <SubAdder categoryName={category.name} existing={subs.map((s) => s.name)} onAdd={(names) => addSubcategories(category.id, names)} />
    </section>
  )
}

// Same section for a category that is not saved yet: names are collected and saved together with the category.
export function SubcategoryDraft({ categoryName, names, onChange }) {
  return (
    <section className="stack tight" aria-label="Subcategories" style={{ borderTop: '1px solid var(--soft)', paddingTop: 14 }}>
      <div className="eyebrow">Subcategories (optional)</div>
      <Intro name={categoryName.trim() || 'this category'} />
      {names.length > 0 && (
        <div className="chips wrap" aria-label="Subcategories to add">
          {names.map((n) => (
            <span key={n} className="chip on">{n}<button type="button" className="icon-btn" style={{ minWidth: 24, minHeight: 24, color: 'inherit' }} aria-label={`Remove ${n}`} onClick={() => onChange(names.filter((x) => x !== n))}><Icon name="close" size={14} stroke={2.4} /></button></span>
          ))}
        </div>
      )}
      <SubAdder categoryName={categoryName} existing={names} onAdd={(list) => onChange([...names, ...list])} />
    </section>
  )
}

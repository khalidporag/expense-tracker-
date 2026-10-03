import React, { useState } from 'react'
import Icon from './Icon.jsx'
import { useSubcategories } from '../hooks/useSubcategories.js'
import { saveSubcategory } from '../db/actions.js'

// Optional subcategory chips for one expense category, with inline "New". Tap the selected chip again to clear it.
export default function SubcategoryPicker({ categoryId, value, onChange }) {
  const { byCategory } = useSubcategories()
  const subs = byCategory.get(categoryId) || []
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  const add = async () => {
    const n = name.trim()
    if (!n) return
    const existing = subs.find((s) => s.name.toLowerCase() === n.toLowerCase())
    onChange(existing ? existing.id : await saveSubcategory({ categoryId, name: n }))
    setName('')
    setAdding(false)
  }

  return (
    <div className="stack tight" style={{ gap: 6 }}>
      <div className="eyebrow" style={{ fontSize: 11 }}>Subcategory (optional)</div>
      {adding ? (
        <div className="row">
          <input autoFocus className="field" placeholder="e.g. Electricity" aria-label="New subcategory name" value={name}
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} />
          <button type="button" className="btn blue" disabled={!name.trim()} onClick={add}>Add</button>
          <button type="button" className="btn" onClick={() => { setAdding(false); setName('') }}>Cancel</button>
        </div>
      ) : (
        <div className="chips scroll" role="group" aria-label="Subcategory">
          {subs.map((s) => (
            <button type="button" key={s.id} className={s.id === value ? 'chip on' : 'chip'} aria-pressed={s.id === value} onClick={() => onChange(s.id === value ? null : s.id)}>
              {s.name}
            </button>
          ))}
          <button type="button" className="chip dashed" onClick={() => setAdding(true)}><Icon name="plus" size={16} stroke={2} />New</button>
        </div>
      )}
    </div>
  )
}

import React, { useState } from 'react'
import Icon from './Icon.jsx'
import { parseSubNames, subSuggestions } from '../lib/subcategories.js'

// Add subcategories fast: type one or several (comma separated), or tap a suggestion. `existing` = names already in use.
export default function SubAdder({ categoryName, existing, onAdd }) {
  const [text, setText] = useState('')
  const names = parseSubNames(text, existing)
  const dupes = text.trim() && names.length === 0
  const add = async (list) => {
    if (!list.length) return
    await onAdd(list)
    setText('')
  }
  const ideas = subSuggestions(categoryName, existing)
  return (
    <div className="stack tight" style={{ gap: 8 }}>
      <div className="row">
        <input className="field" placeholder="e.g. Electricity, Gas" aria-label="New subcategory" value={text} maxLength={120}
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(names) } }} />
        <button type="button" className="btn blue" disabled={!names.length} onClick={() => add(names)}>
          {names.length > 1 ? `Add ${names.length}` : 'Add'}
        </button>
      </div>
      {dupes ? <p className="muted small" role="status">Already added.</p> : <p className="muted small">Type a name and press Enter. Separate several with commas.</p>}
      {ideas.length > 0 && (
        <div className="chips scroll" role="group" aria-label="Suggestions">
          {ideas.map((n) => <button type="button" key={n} className="chip soft" onClick={() => add([n])}><Icon name="plus" size={14} stroke={2} />{n}</button>)}
        </div>
      )}
    </div>
  )
}

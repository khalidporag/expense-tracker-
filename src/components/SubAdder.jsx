import React, { useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { parseSubNames, subSuggestions } from '../lib/subcategories.js'

// Add subcategories fast: type one or several (comma separated), or tap a suggestion. `existing` = names already in use.
export default function SubAdder({ categoryName, existing, onAdd }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const busy = useRef(false) // a double tap, or Add then Enter, must not save twice
  const names = parseSubNames(text, existing)
  const dupes = text.trim() && names.length === 0
  const add = async (list) => {
    if (!list.length || busy.current) return
    busy.current = true
    setSaving(true)
    try {
      await onAdd(list)
      setText('')
      setError('')
    } catch (err) {
      setError(`Could not save: ${err?.message || err}`) // never fail silently
    } finally {
      busy.current = false
      setSaving(false)
    }
  }
  // On a phone, tapping a button first blurs the text box; the keyboard closes, the sheet shifts and the tap can miss.
  // Keeping focus in the box on press avoids that.
  const keepFocus = (e) => e.preventDefault()
  const ideas = subSuggestions(categoryName, existing)
  return (
    <div className="stack tight" style={{ gap: 8 }}>
      <div className="row">
        <input className="field" placeholder="e.g. Electricity, Gas" aria-label="New subcategory" value={text} maxLength={120}
          onChange={(e) => setText(e.target.value)} enterKeyHint="done" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(names) } }} />
        <button type="button" className="btn blue" disabled={!names.length || saving} onMouseDown={keepFocus} onClick={() => add(names)}>
          {names.length > 1 ? `Add ${names.length}` : 'Add'}
        </button>
      </div>
      {error && <p className="small over-ink" role="alert" style={{ fontWeight: 600 }}>{error}</p>}
      {dupes ? <p className="muted small" role="status">Already added.</p> : <p className="muted small">Type a name and press Enter. Separate several with commas.</p>}
      {ideas.length > 0 && (
        <div className="chips scroll" role="group" aria-label="Suggestions">
          {ideas.map((n) => <button type="button" key={n} className="chip soft" onMouseDown={keepFocus} onClick={() => add([n])}><Icon name="plus" size={14} stroke={2} />{n}</button>)}
        </div>
      )}
    </div>
  )
}

import React, { useEffect } from 'react'
import Icon from './Icon.jsx'
import { useBackHandler } from '../hooks/useBackHandler.js'

// Bottom sheet modal. Closes on backdrop tap or Escape.
export default function Sheet({ title, onClose, header, children }) {
  useBackHandler(() => { onClose(); return true }) // the phone's Back button closes the sheet
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="grab" aria-hidden="true" />
        <div className="sheet-head">
          {header || <h2 className="h2">{title}</h2>}
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

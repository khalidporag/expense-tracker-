import React, { useEffect, useRef } from 'react'

export default function ExitDialog({ onStay, onExit }) {
  const stayRef = useRef()
  useEffect(() => {
    stayRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onStay()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onStay])
  return (
    <div className="overlay center-overlay" onClick={onStay}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="exit-title" aria-describedby="exit-desc" onClick={(e) => e.stopPropagation()}>
        <h2 id="exit-title" className="h2">Exit Expenses?</h2>
        <p id="exit-desc" className="muted" style={{ marginTop: 6 }}>Your entries are saved on this phone.</p>
        <div className="btn-row" style={{ marginTop: 18 }}>
          <button ref={stayRef} className="btn lg ink" onClick={onStay}>Stay</button>
          <button className="btn lg" onClick={onExit}>Exit</button>
        </div>
      </div>
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { greeting } from '../lib/splash.js'

const reduceMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Brief welcome screen on open. Tap anywhere to skip. Works fully offline (no network, no data waiting).
export default function Splash({ onDone }) {
  const [out, setOut] = useState(false)
  const finish = () => setOut(true)

  useEffect(() => {
    const t1 = setTimeout(finish, reduceMotion() ? 700 : 1500)
    return () => clearTimeout(t1)
  }, [])
  useEffect(() => {
    if (!out) return undefined
    const t2 = setTimeout(onDone, reduceMotion() ? 0 : 320)
    return () => clearTimeout(t2)
  }, [out, onDone])

  return (
    <div className={out ? 'splash out' : 'splash'} role="status" aria-label="Welcome to Expenses" onClick={finish}>
      <div className="splash-inner">
        <svg className="splash-mark" width="96" height="96" viewBox="0 0 96 96" aria-hidden="true">
          <rect width="96" height="96" rx="24" fill="#14161a" stroke="#2b2f38" />
          <circle cx="48" cy="48" r="26" fill="none" stroke="#7c9bff" strokeWidth="7" />
          <circle cx="48" cy="48" r="8" fill="#ff9a5c" />
        </svg>
        <h1 className="splash-title">Expenses</h1>
        <p className="splash-greet">{greeting(new Date().getHours())}</p>
        <p className="splash-tag">Know what’s safe to spend today.</p>
      </div>
    </div>
  )
}

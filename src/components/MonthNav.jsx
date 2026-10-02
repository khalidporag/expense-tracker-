import React from 'react'
import { monthLabel, shiftMonth, currentMonth } from '../lib/dates.js'

export default function MonthNav({ month, onChange }) {
  return (
    <div className="month-nav">
      <button className="icon-btn" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Previous month">‹</button>
      <button className="month-label" onClick={() => onChange(currentMonth())} aria-label="Jump to this month">
        {monthLabel(month)}
      </button>
      <button className="icon-btn" onClick={() => onChange(shiftMonth(month, 1))} aria-label="Next month">›</button>
    </div>
  )
}

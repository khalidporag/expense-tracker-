import React from 'react'
import Icon from './Icon.jsx'
import { monthLabel, shiftMonth, currentMonth } from '../lib/dates.js'

export default function MonthNav({ month, onChange }) {
  return (
    <div className="month-nav">
      <button className="icon-btn plain" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Previous month"><Icon name="chevL" size={22} /></button>
      <button className="label" onClick={() => onChange(currentMonth())} aria-label={`${monthLabel(month)}. Jump to this month`}>{monthLabel(month)}</button>
      <button className="icon-btn plain" onClick={() => onChange(shiftMonth(month, 1))} aria-label="Next month"><Icon name="chevR" size={22} /></button>
    </div>
  )
}

import React from 'react'
import { Segmented } from '../components/Bits.jsx'
import Budgets from './Budgets.jsx'
import Savings from './Savings.jsx'

// "Plan" tab: how you intend to spend (Budgets) and how you intend to save (Savings).
export default function Plan({ month, onMonth, view, onView, onReport }) {
  return (
    <div className="stack tight">
      <Segmented label="Plan section" value={view} onChange={onView} options={[{ value: 'budgets', label: 'Budgets' }, { value: 'savings', label: 'Savings' }]} />
      {view === 'budgets' ? <Budgets month={month} onMonth={onMonth} /> : <Savings month={month} onMonth={onMonth} onReport={onReport} />}
    </div>
  )
}

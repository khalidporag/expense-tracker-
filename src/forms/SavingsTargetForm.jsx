import React, { useState } from 'react'
import Sheet from '../components/Sheet.jsx'
import { Segmented } from '../components/Bits.jsx'
import { setSetting, clearSetting } from '../db/actions.js'
import { monthlyTarget } from '../lib/savings.js'
import { toMinor, toInput, formatMoney } from '../lib/money.js'

// The monthly savings goal: a fixed amount, or a share of that month's income.
export default function SavingsTargetForm({ current, income, prevIncome, onClose }) {
  const [mode, setMode] = useState(current?.mode || 'amount')
  const [amount, setAmount] = useState(current?.mode === 'amount' ? toInput(current.amount) : '')
  const [percent, setPercent] = useState(current?.mode === 'percent' ? String(current.percent) : '')

  const setting = mode === 'amount'
    ? (amount && toMinor(amount) > 0 ? { mode, amount: toMinor(amount) } : null)
    : (percent && parseFloat(percent) > 0 && parseFloat(percent) <= 100 ? { mode, percent: Math.round(parseFloat(percent) * 100) / 100 } : null)
  const preview = setting ? monthlyTarget(setting, income, prevIncome) : 0

  const save = async () => { if (setting) { await setSetting('savingsTarget', setting); onClose() } }
  const remove = async () => { await clearSetting('savingsTarget'); onClose() }

  return (
    <Sheet title="Monthly savings goal" onClose={onClose}>
      <form className="form" onSubmit={(e) => { e.preventDefault(); save() }}>
        <p className="muted">How much do you want to put into savings each month?</p>
        <Segmented label="Goal type" value={mode} onChange={setMode} options={[{ value: 'amount', label: 'Fixed amount' }, { value: 'percent', label: '% of income' }]} />
        {mode === 'amount' ? (
          <input autoFocus className="field big-input" type="number" inputMode="decimal" step="0.01" min="0" placeholder="৳ 0" aria-label="Monthly savings goal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        ) : (
          <div className="row">
            <input autoFocus className="field big-input" type="number" inputMode="decimal" step="0.5" min="0" max="100" placeholder="20" aria-label="Percent of income" value={percent} onChange={(e) => setPercent(e.target.value)} />
            <span className="big-input" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28 }}>%</span>
          </div>
        )}
        {mode === 'percent' && setting && (
          <p className="muted small">{preview > 0 ? `About ${formatMoney(preview)} on the income you have recorded.` : 'Add this month’s income and the goal will be worked out from it.'}</p>
        )}
        <div className="btn-row">
          {current && <button type="button" className="btn lg danger" onClick={remove}>Remove</button>}
          <button type="submit" className="btn lg blue" disabled={!setting}>Save goal</button>
        </div>
      </form>
    </Sheet>
  )
}

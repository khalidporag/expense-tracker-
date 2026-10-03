import React, { useState } from 'react'
import Sheet from '../components/Sheet.jsx'
import Icon from '../components/Icon.jsx'
import { Pill, Progress } from '../components/Bits.jsx'
import { useSavings } from '../hooks/useSavings.js'
import { addDeposit, deleteDeposit } from '../db/actions.js'
import { planStatus, projection } from '../lib/savings.js'
import { toMinor, toInput, formatMoney, formatTaka } from '../lib/money.js'
import { dayYear, shortDay, today } from '../lib/dates.js'

export const KIND_LABEL = { dps: 'DPS', lump: 'One-time deposit', goal: 'Savings goal' }
const termLabel = (m) => (m % 12 === 0 ? `${m / 12} ${m === 12 ? 'year' : 'years'}` : `${m} months`)
export const planSubtitle = (p) => [KIND_LABEL[p.kind], termLabel(p.termMonths), p.rateBp ? `${p.rateBp / 100}%` : null].filter(Boolean).join(' · ')

// One plan: where it stands, what it should pay, and the deposits you have recorded (savings, never expenses).
export default function PlanDetail({ planId, onEdit, onClose }) {
  const { ready, plans, deposits } = useSavings()
  const plan = plans.find((p) => p.id === planId)
  if (!ready || !plan) return null
  // The form state below starts from the loaded plan, so it must not be created before the data is there.
  return <PlanDetailBody plan={plan} deposits={deposits} onEdit={onEdit} onClose={onClose} />
}

function PlanDetailBody({ plan, deposits, onEdit, onClose }) {
  const planId = plan.id
  const mine = deposits.filter((d) => d.planId === planId).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
  const status = planStatus(plan, deposits, today())
  const suggested = plan.kind === 'lump' ? Math.max(0, plan.principal - status.deposited) : plan.installment || 0
  const [amount, setAmount] = useState(suggested ? toInput(suggested) : '')
  const [date, setDate] = useState(today())
  const [note, setNote] = useState('')
  const [done, setDone] = useState(false)

  const minor = amount ? toMinor(amount) : 0
  const p = projection(plan)
  const record = async () => {
    if (!(minor > 0) || !date) return
    await addDeposit({ planId, date, amount: minor, ...(note.trim() ? { note: note.trim() } : {}) })
    setDone(true)
    setNote('')
  }
  const remove = async (d) => {
    if (confirm(`Remove the ${formatMoney(d.amount)} deposit from ${shortDay(d.date)}?`)) await deleteDeposit(d.id)
  }
  const stateLabel = status.state === 'matured' ? ['info', 'Matured'] : status.state === 'upcoming' ? ['info', 'Starts soon']
    : status.overdue ? ['over', `Overdue · was due ${shortDay(status.dueDate).replace(/^\w+ /, '')}`]
    : status.dueDate ? ['warn', `Due ${shortDay(status.dueDate).replace(/^\w+ /, '')}`]
    : status.paidThisMonth ? ['ok', 'Paid this month'] : ['ok', 'Running']

  return (
    <Sheet title={plan.name} onClose={onClose}>
      <div className="muted">{planSubtitle(plan)}</div>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <Pill tone={stateLabel[0]} size="lg" icon={stateLabel[0] === 'ok' ? 'check' : stateLabel[0] === 'info' ? undefined : 'warn'}>{stateLabel[1]}</Pill>
        {status.behind > 0 && <Pill tone="warn" size="lg">{formatMoney(status.behind)} behind schedule</Pill>}
      </div>

      <div>
        <div className="between" style={{ alignItems: 'baseline' }}>
          <span><strong className="fig" style={{ fontSize: 28 }}>{formatMoney(status.deposited)}</strong> <span className="muted">of {formatMoney(status.total)}</span></span>
          <span className="muted small">{plan.kind === 'lump' ? `${status.monthsLeft} months left` : `${status.elapsedMonths} of ${plan.termMonths} months`}</span>
        </div>
        <div style={{ marginTop: 8 }}><Progress ratio={status.progress} label={`${plan.name} progress`} /></div>
      </div>

      <div className="card sm divided" aria-label="Expected payout">
        {plan.kind === 'dps' && <>
          <div className="between" style={{ padding: '8px 0' }}><span className="muted">You deposit in total</span><strong>{formatMoney(p.deposited)}</strong></div>
          <div className="between" style={{ padding: '8px 0' }}><span className="muted">Interest after tax</span><strong className="pos">{formatTaka(p.profit)}</strong></div>
          <div className="between" style={{ padding: '8px 0' }}><span className="muted">Expected at maturity</span><strong>{formatTaka(p.total)}</strong></div>
        </>}
        {plan.kind === 'lump' && <>
          <div className="between" style={{ padding: '8px 0' }}><span className="muted">{plan.payout === 'maturity' ? 'Profit at maturity (after tax)' : `Profit ${plan.payout === 'monthly' ? 'each month' : 'each quarter'} (after tax)`}</span><strong className="pos">{formatTaka(plan.payout === 'maturity' ? p.profit : p.netPerPayout)}</strong></div>
          <div className="between" style={{ padding: '8px 0' }}><span className="muted">Total profit (after tax)</span><strong>{formatTaka(p.profit)}</strong></div>
          <div className="between" style={{ padding: '8px 0' }}><span className="muted">{plan.payout === 'maturity' ? 'Expected at maturity' : 'Principal returned'}</span><strong>{formatTaka(p.maturity)}</strong></div>
        </>}
        {plan.kind === 'goal' && <>
          <div className="between" style={{ padding: '8px 0' }}><span className="muted">Target</span><strong>{formatMoney(plan.target)}</strong></div>
          <div className="between" style={{ padding: '8px 0' }}><span className="muted">Monthly saving needed</span><strong>{formatMoney(plan.installment)}</strong></div>
        </>}
        <div className="between" style={{ padding: '8px 0' }}><span className="muted">{plan.kind === 'goal' ? 'Reach it by' : 'Matures on'}</span><strong>{dayYear(status.maturityDate)}</strong></div>
      </div>
      <p className="muted small">Estimates only. Banks differ in compounding and rounding.</p>

      {status.state !== 'matured' && (
        <form className="form" onSubmit={(e) => { e.preventDefault(); record() }} aria-label="Record a deposit">
          <div className="eyebrow">Record a deposit</div>
          <div className="row">
            <input className="field" type="number" inputMode="decimal" step="0.01" min="0" aria-label="Deposit amount" placeholder="৳ 0" value={amount} onChange={(e) => { setAmount(e.target.value); setDone(false) }} />
            <input type="date" aria-label="Deposit date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </div>
          <input className="field" type="text" aria-label="Deposit note" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <button type="submit" className="btn lg blue" disabled={!(minor > 0)}>{done ? 'Recorded ✓ Add another' : 'Record deposit'}</button>
          <p className="muted small">Deposits count as savings. They are not added to your expenses.</p>
        </form>
      )}

      {mine.length > 0 && (
        <section aria-label="Deposits" className="stack tight">
          <div className="eyebrow">Deposits ({mine.length})</div>
          <ul className="list">
            {mine.map((d) => (
              <li key={d.id} className="row-card" style={{ minHeight: 52 }}>
                <span className="grow"><strong>{shortDay(d.date)}</strong>{d.note && <span className="muted small">{d.note}</span>}</span>
                <span className="amt pos" style={{ color: 'var(--blue-ink)' }}>{formatMoney(d.amount)}</span>
                <button className="icon-btn plain" onClick={() => remove(d)} aria-label={`Remove deposit of ${formatMoney(d.amount)} on ${shortDay(d.date)}`}><Icon name="trash" size={18} /></button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <button className="btn lg block" onClick={() => onEdit(plan)}>Edit plan</button>
    </Sheet>
  )
}

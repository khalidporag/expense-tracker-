import React, { useState } from 'react'
import Sheet from '../components/Sheet.jsx'
import { Segmented } from '../components/Bits.jsx'
import { db } from '../db/index.js'
import { savePlan, deletePlan } from '../db/actions.js'
import { goalMonthly, projection } from '../lib/savings.js'
import { toMinor, toInput, formatMoney, formatTaka } from '../lib/money.js'
import { addMonths, dayYear, today } from '../lib/dates.js'

const KINDS = [{ value: 'dps', label: 'DPS' }, { value: 'lump', label: 'Sanchay / FDR' }, { value: 'goal', label: 'Goal' }]
const PAYOUTS = [{ value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' }, { value: 'maturity', label: 'At maturity' }]
const TERMS = [[12, '1 yr'], [24, '2 yrs'], [36, '3 yrs'], [60, '5 yrs']]
const COPY = {
  dps: { amount: 'Monthly installment (৳)', name: 'e.g. City Bank DPS', hint: 'A fixed amount you deposit every month for the whole term.' },
  lump: { amount: 'Amount deposited (৳)', name: 'e.g. Paribar Sanchay Patra', hint: 'One deposit now, with profit paid out or added at maturity.' },
  goal: { amount: 'Target amount (৳)', name: 'e.g. Emergency fund', hint: 'An amount you want to have by a date. We work out the monthly saving.' },
}
const num = (v) => (v === '' ? NaN : parseFloat(v))

// Create or edit a savings plan. Rates and tax are typed in (they change; use what your bank or the National Savings office quotes).
export default function PlanForm({ initial, onClose }) {
  const [kind, setKind] = useState(initial?.kind || 'dps')
  const [name, setName] = useState(initial?.name || '')
  const first = initial ? (initial.kind === 'dps' ? initial.installment : initial.kind === 'lump' ? initial.principal : initial.target) : null
  const [amount, setAmount] = useState(first != null ? toInput(first) : '')
  const [startDate, setStartDate] = useState(initial?.startDate || today())
  const [term, setTerm] = useState(String(initial?.termMonths || 36))
  const [rate, setRate] = useState(initial ? String(initial.rateBp / 100) : '')
  const [tax, setTax] = useState(initial ? String(initial.taxBp / 100) : '10')
  const [payout, setPayout] = useState(initial?.payout || 'monthly')

  const amountMinor = amount ? toMinor(amount) : 0
  const termN = Number(term)
  const rateBp = rate === '' ? 0 : Math.round(num(rate) * 100)
  const taxBp = tax === '' ? 0 : Math.round(num(tax) * 100)
  const termOk = Number.isInteger(termN) && termN >= 1 && termN <= 600
  const valid = name.trim() && amountMinor > 0 && termOk && !!startDate
    && Number.isFinite(rateBp) && rateBp >= 0 && rateBp <= 10000 && Number.isFinite(taxBp) && taxBp >= 0 && taxBp <= 10000
    && (kind === 'goal' || rate !== '')

  let plan = null
  if (valid) {
    const base = { kind, name: name.trim(), startDate, termMonths: termN, rateBp, taxBp }
    plan = kind === 'dps' ? { ...base, installment: amountMinor }
      : kind === 'lump' ? { ...base, principal: amountMinor, payout }
      : { ...base, target: amountMinor, installment: goalMonthly({ target: amountMinor, termMonths: termN, rateBp, taxBp }) }
  }
  const est = plan ? projection(plan) : null
  const matureOn = plan ? dayYear(addMonths(startDate, termN)) : ''

  const save = async () => {
    if (!plan) return
    await savePlan({ ...(initial?.id ? { id: initial.id, active: initial.active } : {}), ...plan })
    onClose()
  }
  const remove = async () => {
    const n = await db.deposits.where('planId').equals(initial.id).count()
    if (confirm(`Delete "${initial.name}"${n ? ` and its ${n} recorded deposits` : ''}? Your income and expenses are not affected.`)) {
      await deletePlan(initial.id)
      onClose()
    }
  }

  return (
    <Sheet title={initial ? 'Edit plan' : 'New savings plan'} onClose={onClose}>
      <form className="form" onSubmit={(e) => { e.preventDefault(); save() }}>
        <Segmented label="Plan type" value={kind} onChange={setKind} options={KINDS} />
        <p className="muted small">{COPY[kind].hint}</p>
        <input className="field" aria-label="Plan name" placeholder={COPY[kind].name} value={name} onChange={(e) => setName(e.target.value)} />
        <label className="muted small" htmlFor="plan-amount">{COPY[kind].amount}</label>
        <input id="plan-amount" className="field big-input" type="number" inputMode="decimal" step="0.01" min="0" placeholder="৳ 0" value={amount} onChange={(e) => setAmount(e.target.value)} />

        <label className="muted small" htmlFor="plan-start">{kind === 'dps' ? 'First installment date' : kind === 'lump' ? 'Deposit date' : 'Start date'}</label>
        <input id="plan-start" type="date" value={startDate} onChange={(e) => e.target.value && setStartDate(e.target.value)} />

        <div className="eyebrow">Term</div>
        <div className="chips" role="group" aria-label="Term">
          {TERMS.map(([m, label]) => <button type="button" key={m} className={String(m) === term ? 'chip on' : 'chip'} aria-pressed={String(m) === term} onClick={() => setTerm(String(m))}>{label}</button>)}
        </div>
        <div className="row">
          <input className="field" type="number" inputMode="numeric" min="1" max="600" aria-label="Term in months" value={term} onChange={(e) => setTerm(e.target.value)} />
          <span className="muted">months</span>
        </div>

        <div className="row">
          <div className="grow">
            <label className="muted small" htmlFor="plan-rate">Interest rate (% a year){kind === 'goal' ? ', optional' : ''}</label>
            <input id="plan-rate" className="field" type="number" inputMode="decimal" step="0.01" min="0" placeholder="e.g. 9.5" value={rate} onChange={(e) => setRate(e.target.value)} />
          </div>
          {(kind !== 'goal' || rate !== '') && (
            <div className="grow">
              <label className="muted small" htmlFor="plan-tax">Tax on interest (%)</label>
              <input id="plan-tax" className="field" type="number" inputMode="decimal" step="0.01" min="0" value={tax} onChange={(e) => setTax(e.target.value)} />
            </div>
          )}
        </div>
        <p className="muted small">Use the rate and tax your bank or the National Savings office quotes. They change, so nothing is pre-filled.</p>

        {kind === 'lump' && (
          <>
            <div className="eyebrow">Profit is paid</div>
            <Segmented label="Profit payout" value={payout} onChange={setPayout} options={PAYOUTS} />
          </>
        )}

        {est && (
          <div className="suggest" role="status" aria-label="Estimate">
            <strong>Estimate</strong>
            {kind === 'dps' && <p style={{ marginTop: 4 }}>You deposit {formatMoney(est.deposited)} over {termN} months. Interest after tax is about {formatTaka(est.profit)}, so you get about <strong>{formatTaka(est.total)}</strong> on {matureOn}.</p>}
            {kind === 'lump' && payout !== 'maturity' && <p style={{ marginTop: 4 }}>About <strong>{formatTaka(est.netPerPayout)}</strong> {payout === 'monthly' ? 'a month' : 'every 3 months'} after tax ({formatTaka(est.profit)} in total), and your {formatMoney(plan.principal)} comes back on {matureOn}.</p>}
            {kind === 'lump' && payout === 'maturity' && <p style={{ marginTop: 4 }}>Profit after tax is about {formatTaka(est.profit)}, so you get about <strong>{formatTaka(est.total)}</strong> on {matureOn}.</p>}
            {kind === 'goal' && <p style={{ marginTop: 4 }}>Save <strong>{formatMoney(plan.installment)}</strong> a month for {termN} months to reach {formatMoney(plan.target)} by {matureOn}.</p>}
            <p className="muted small" style={{ marginTop: 6 }}>An estimate only. Banks differ in compounding and rounding.</p>
          </div>
        )}

        <div className="btn-row">
          {initial && <button type="button" className="btn lg danger" onClick={remove}>Delete</button>}
          <button type="submit" className="btn lg blue" disabled={!valid}>Save plan</button>
        </div>
      </form>
    </Sheet>
  )
}

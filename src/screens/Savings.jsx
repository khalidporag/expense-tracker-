import React, { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import MonthNav from '../components/MonthNav.jsx'
import Icon from '../components/Icon.jsx'
import { Empty, Pill, Progress, Stat } from '../components/Bits.jsx'
import PlanForm from '../forms/PlanForm.jsx'
import PlanDetail, { planSubtitle } from '../forms/PlanDetail.jsx'
import SavingsTargetForm from '../forms/SavingsTargetForm.jsx'
import { useSavings } from '../hooks/useSavings.js'
import { db } from '../db/index.js'
import { committedMonthly, monthReport, planStatus, projection, savingsHistory } from '../lib/savings.js'
import { monthInfo } from '../lib/insights.js'
import { formatMoney, formatTaka } from '../lib/money.js'
import { dayYear, monthName, shiftMonth, shortDay, today } from '../lib/dates.js'

const KIND_ICON = { dps: 'repeat', lump: 'coins', goal: 'target' }

function PlanCard({ plan, deposits, onOpen }) {
  const s = planStatus(plan, deposits, today())
  const p = projection(plan)
  const day = (iso) => shortDay(iso).replace(/^\w+ /, '')
  const [tone, label] = s.state === 'matured' ? ['info', 'Matured']
    : s.state === 'upcoming' ? ['info', `Starts ${day(plan.startDate)}`]
    : s.overdue ? ['over', 'Overdue']
    : s.dueDate ? ['warn', `Due ${day(s.dueDate)}`]
    : s.paidThisMonth ? ['ok', 'Paid this month']
    : plan.kind === 'lump' ? ['ok', 'Earning'] : ['ok', 'Running']
  return (
    <div className="card tap" role="button" tabIndex={0} aria-label={`${plan.name}, ${planSubtitle(plan)}. Open details`}
      onClick={onOpen} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen())} style={{ borderRadius: 20, padding: 16 }}>
      <div className="row" style={{ gap: 12 }}>
        <span className="badge" style={{ width: 40, height: 40 }}><Icon name={KIND_ICON[plan.kind]} /></span>
        <span className="grow"><strong style={{ fontSize: 17, display: 'block' }}>{plan.name}</strong><span className="muted small">{planSubtitle(plan)}</span></span>
        <Pill tone={tone} size="lg">{label}</Pill>
      </div>
      <div style={{ marginTop: 14 }}><Progress ratio={s.progress} label={`${plan.name} progress`} /></div>
      <div className="between small" style={{ marginTop: 10 }}>
        <span><strong>{formatMoney(s.deposited)}</strong> <span className="muted">of {formatMoney(s.total)}</span></span>
        <span className="muted">{plan.kind === 'goal' ? 'By' : 'Matures'} {dayYear(s.maturityDate)}</span>
      </div>
      <div className="muted small" style={{ marginTop: 4 }}>
        {plan.kind === 'dps' && `Expected at maturity about ${formatTaka(p.total)}`}
        {plan.kind === 'lump' && (plan.payout === 'maturity' ? `Expected at maturity about ${formatTaka(p.total)}` : `Profit about ${formatTaka(p.netPerPayout)} ${plan.payout === 'monthly' ? 'a month' : 'a quarter'} after tax`)}
        {plan.kind === 'goal' && `Save ${formatMoney(plan.installment)} a month to reach it`}
      </div>
    </div>
  )
}

export default function Savings({ month, onMonth, onReport }) {
  const sv = useSavings()
  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5))
  const txs = useLiveQuery(() => db.transactions.where('date').between(`${months[0]}-01`, `${month}-32`).toArray(), [month])
  const [detailId, setDetailId] = useState(null)
  const [editing, setEditing] = useState(null) // plan | 'new'
  const [targetOpen, setTargetOpen] = useState(false)
  if (!sv.ready || !txs) return null

  const todayISO = today()
  const info = monthInfo(month, todayISO)
  const history = savingsHistory(months, { txs, deposits: sv.deposits, setting: sv.target })
  const rep = history[history.length - 1]
  const prevIncome = history[history.length - 2]?.income || 0
  const active = sv.plans.filter((p) => p.active !== false)
  const committed = committedMonthly(active, todayISO)
  const deposited = sv.deposits.reduce((s, d) => s + d.amount, 0)
  const expectedBack = active.reduce((s, p) => s + projection(p).total, 0)
  const status = rep.target <= 0 ? null
    : rep.targetMet ? `Goal reached ✓ You saved ${formatMoney(rep.saved)}${rep.savedPct != null ? ` (${rep.savedPct}% of income)` : ''}.`
    : info.isPast ? `Missed by ${formatMoney(rep.shortfall)}.`
    : rep.kept >= rep.shortfall ? `${formatMoney(rep.shortfall)} to go. You have ${formatMoney(Math.max(0, rep.kept))} kept this month.`
    : `${formatMoney(rep.shortfall)} to go, but only ${formatMoney(Math.max(0, rep.kept))} is left after spending.`

  return (
    <div className="stack tight">
      <MonthNav month={month} onChange={onMonth} />

      <section className="card" aria-label="Savings this month">
        <div className="eyebrow">Saved in {monthName(month)}</div>
        <div className="row" style={{ alignItems: 'baseline', marginTop: 6, flexWrap: 'wrap' }}>
          <span className="fig pos" style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.1 }}>{formatMoney(rep.saved)}</span>
          {rep.target > 0 && <span className="muted">of {formatMoney(rep.target)} goal{rep.savedPct != null ? ` · ${rep.savedPct}% of income` : ''}</span>}
        </div>
        {rep.target > 0 ? (
          <>
            <div style={{ marginTop: 14 }}><Progress ratio={rep.saved / rep.target} label="Savings goal progress" /></div>
            <p className={rep.targetMet ? 'pos' : 'muted'} style={{ marginTop: 10, fontWeight: rep.targetMet ? 700 : 400 }}>{status}</p>
          </>
        ) : (
          <p className="muted" style={{ marginTop: 10 }}>Set a monthly savings goal to see how close you are each month.</p>
        )}
        <div className="trio" style={{ marginTop: 14 }}>
          <Stat label="Earned"><span className="money-in">{formatMoney(rep.income)}</span></Stat>
          <Stat label="Spent"><span className="money-out">{formatMoney(rep.expense)}</span></Stat>
          <Stat label="Kept">{formatMoney(rep.kept)}</Stat>
        </div>
        <div className="btn-row" style={{ marginTop: 14 }}>
          <button className="btn" onClick={() => setTargetOpen(true)}>{rep.target > 0 || sv.target ? 'Edit goal' : 'Set a goal'}</button>
          <button className="btn" onClick={() => onReport(month)}>Month report</button>
        </div>
      </section>

      <button className="btn lg ink block" onClick={() => setEditing('new')}><Icon name="plus" size={20} stroke={2.2} />New savings plan</button>

      {sv.plans.length === 0 ? (
        <Empty icon="coins">No plans yet. Add a DPS, a Sanchay Patra or a savings goal to see what it will be worth.</Empty>
      ) : (
        <section className="stack tight" aria-label="Savings plans">
          {sv.plans.map((p) => <PlanCard key={p.id} plan={p} deposits={sv.deposits} onOpen={() => setDetailId(p.id)} />)}
        </section>
      )}

      {sv.plans.length > 0 && (
        <section className="card sm divided" aria-label="Plans total">
          <div className="between" style={{ padding: '9px 0' }}><span className="muted">Plans commit each month</span><strong>{formatMoney(committed)}</strong></div>
          {rep.target > 0 && (
            <div className="between" style={{ padding: '9px 0', alignItems: 'flex-start' }}>
              <span className="muted">Against your {formatMoney(rep.target)} goal</span>
              <strong className={committed >= rep.target ? 'pos' : 'warn-ink'} style={{ textAlign: 'right' }}>{committed >= rep.target ? 'Fully covered' : `${formatMoney(rep.target - committed)} not planned`}</strong>
            </div>
          )}
          <div className="between" style={{ padding: '9px 0' }}><span className="muted">Deposited so far</span><strong>{formatMoney(deposited)}</strong></div>
          <div className="between" style={{ padding: '9px 0' }}><span className="muted">Expected back at maturity</span><strong>{formatTaka(expectedBack)}</strong></div>
        </section>
      )}

      <section className="stack tight" aria-label="Last six months">
        <h2 className="h2" style={{ marginTop: 8 }}>Last 6 months</h2>
        <ul className="list">
          {[...history].reverse().map((h) => (
            <li key={h.month}>
              <button className="row-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }} onClick={() => onReport(h.month)} aria-label={`${monthName(h.month)} report`}>
                <span className="between"><strong>{monthName(h.month)}</strong><span><strong className="pos">{formatMoney(h.saved)}</strong>{h.target > 0 && <span className="muted small"> of {formatMoney(h.target)}</span>} {h.targetMet && <Pill tone="ok" icon="check">Met</Pill>}</span></span>
                {h.target > 0 && <Progress ratio={h.saved / h.target} label={`${monthName(h.month)} savings goal`} />}
                <span className="muted small">{h.income > 0 || h.expense > 0 || h.saved > 0 ? `Earned ${formatMoney(h.income)} · Spent ${formatMoney(h.expense)}${h.savedPct != null ? ` · Saved ${h.savedPct}%` : ''}` : 'Nothing recorded'}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <p className="muted small">Savings are tracked apart from your spending: a deposit into a plan is not an expense. Estimates only; banks differ in compounding and rounding.</p>

      {targetOpen && <SavingsTargetForm current={sv.target} income={rep.income} prevIncome={prevIncome} onClose={() => setTargetOpen(false)} />}
      {editing && <PlanForm initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      {detailId != null && <PlanDetail planId={detailId} onEdit={(p) => { setDetailId(null); setEditing(p) }} onClose={() => setDetailId(null)} />}
    </div>
  )
}

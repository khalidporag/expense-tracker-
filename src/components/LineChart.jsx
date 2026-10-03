import React from 'react'
import { formatCompact, formatTaka } from '../lib/money.js'

const W = 310
const H = 170

// Cumulative spending by day: this month (solid), last month (dashed), projection (dotted), budget (long dash).
export default function LineChart({ series, prev, day, total, forecast, budget, live }) {
  const max = Math.max(1, ...series, ...prev, forecast || 0, budget || 0) * 1.06
  const x = (d) => (total > 1 ? ((d - 1) / (total - 1)) * W : 0)
  const y = (v) => H - (v / max) * H
  const pts = (arr) => arr.map((v, i) => `${x(i + 1).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const prevPts = pts(prev.slice(0, total))
  const last = series.length ? series[series.length - 1] : 0
  const summary = `Cumulative spending by day. This month reaches ${formatTaka(last)} by day ${day}.${live && forecast ? ` Projected ${formatTaka(forecast)} by day ${total}.` : ''}${budget ? ` Budget ${formatTaka(budget)}.` : ''}`

  return (
    <svg className="chart" viewBox={`0 -16 ${W} 216`} width="100%" role="img" aria-label={summary} style={{ display: 'block', marginTop: 14 }}>
      <line x1="0" y1={H} x2={W} y2={H} stroke="var(--line)" />
      {budget > 0 && <line x1="0" y1={y(budget)} x2={W} y2={y(budget)} stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="6 4" />}
      {live && <line x1={x(day)} y1="0" x2={x(day)} y2={H} stroke="var(--line-strong)" strokeDasharray="2 3" />}
      {prev.length > 1 && <polyline points={prevPts} fill="none" stroke="var(--muted)" strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />}
      {live && forecast > 0 && day > 0 && <polyline points={`${x(day)},${y(last)} ${x(total)},${y(forecast)}`} fill="none" stroke="var(--orange)" strokeWidth="3" strokeDasharray="0.1 6" strokeLinecap="round" />}
      {series.length > 0 && <polyline points={pts(series)} fill="none" stroke="var(--blue)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
      {series.length > 0 && <circle cx={x(series.length)} cy={y(last)} r="5.5" fill="var(--blue)" stroke="var(--surface)" strokeWidth="2.5" />}
      {budget > 0 && <text x="0" y={Math.max(y(budget) - 7, 8)} fontSize="11" fontWeight="600" style={{ fill: 'var(--ink)' }}>Budget {formatCompact(budget)}</text>}
      {live && day > 0 && <text x={x(day)} y="-4" fontSize="11" fontWeight="600" textAnchor="middle" style={{ fill: 'var(--ink)' }}>Today</text>}
      {live && forecast > 0 && <text x={W} y="-4" fontSize="11" fontWeight="700" textAnchor="end" style={{ fill: 'var(--orange-ink)' }}>{formatCompact(forecast)}</text>}
      <text x="0" y="190" fontSize="11">Day 1</text>
      <text x={x(Math.min(10, total))} y="190" fontSize="11" textAnchor="middle">10</text>
      <text x={x(Math.min(20, total))} y="190" fontSize="11" textAnchor="middle">20</text>
      <text x={W} y="190" fontSize="11" textAnchor="end">{total}</text>
    </svg>
  )
}

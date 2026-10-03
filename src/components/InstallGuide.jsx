import React, { useState } from 'react'
import Sheet from './Sheet.jsx'
import Icon from './Icon.jsx'

const Step = ({ n, icon, children }) => (
  <li className="guide-step">
    <span className="guide-n" aria-hidden="true">{n}</span>
    <span className="grow">{children}</span>
    {icon && <span className="badge" style={{ width: 40, height: 40 }}><Icon name={icon} /></span>}
  </li>
)

// Step-by-step help where a website cannot install the app by itself.
export default function InstallGuide({ mode, onClose }) {
  const [copied, setCopied] = useState(false)
  const url = window.location.origin + window.location.pathname
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true) } catch { setCopied(false) }
  }

  if (mode === 'inapp') {
    return (
      <Sheet title="Open in your browser" onClose={onClose}>
        <p className="muted">Apps like Facebook, Messenger and Instagram open links in their own mini browser, which can’t install apps. Open this page in Chrome or Safari instead:</p>
        <ol className="guide">
          <Step n="1" icon="more">Tap the <strong>⋯</strong> or <strong>⋮</strong> menu in the corner.</Step>
          <Step n="2">Choose <strong>Open in browser</strong> (or <strong>Open in Chrome / Safari</strong>).</Step>
          <Step n="3">Then tap <strong>Install</strong> when it appears, or follow the Home Screen steps.</Step>
        </ol>
        <div className="card sm"><div className="eyebrow">Or copy the link</div><div className="small" style={{ wordBreak: 'break-all', marginTop: 4 }}>{url}</div></div>
        <button className="btn lg ink block" onClick={copy}><Icon name="copy" size={18} />{copied ? 'Link copied' : 'Copy link'}</button>
      </Sheet>
    )
  }

  return (
    <Sheet title="Add Expenses to your Home Screen" onClose={onClose}>
      <p className="muted">Apple doesn’t let websites install themselves, so it takes three quick taps. You only do this once.</p>
      <ol className="guide">
        <Step n="1" icon="share">Tap the <strong>Share</strong> button in your browser’s toolbar.</Step>
        <Step n="2" icon="addSquare">Scroll down and tap <strong>Add to Home Screen</strong>.</Step>
        <Step n="3">Tap <strong>Add</strong>. Then open <strong>Expenses</strong> from your Home Screen.</Step>
      </ol>
      <p className="muted small">Don’t see “Add to Home Screen”? Open this page in <strong>Safari</strong> and try again.</p>
      <button className="btn lg ink block" onClick={onClose}>Got it</button>
    </Sheet>
  )
}

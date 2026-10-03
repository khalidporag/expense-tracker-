import React from 'react'
import Icon from './Icon.jsx'

const COPY = {
  prompt: { title: 'Install Expenses', sub: 'One tap. Opens full screen and works offline.', action: 'Install' },
  ios: { title: 'Use Expenses as an app', sub: 'Add it to your Home Screen in 3 taps.', action: 'Show me how' },
  inapp: { title: 'Open in your browser to install', sub: 'This in-app browser can’t install apps.', action: 'How' },
}

// Slim "use it as an app" notice above the tab bar. Dismissing it hides it for two weeks.
export default function InstallBanner({ platform, onInstall, onDismiss }) {
  const c = COPY[platform]
  if (!c) return null
  return (
    <aside className="install-banner" role="region" aria-label="Install the app">
      <svg className="install-mark" width="40" height="40" viewBox="0 0 96 96" aria-hidden="true">
        <rect width="96" height="96" rx="24" fill="#14161a" />
        <circle cx="48" cy="48" r="26" fill="none" stroke="#7c9bff" strokeWidth="8" />
        <circle cx="48" cy="48" r="9" fill="#ff9a5c" />
      </svg>
      <div className="grow">
        <strong>{c.title}</strong>
        <span className="muted small">{c.sub}</span>
      </div>
      <button className="btn blue" onClick={onInstall}>{c.action}</button>
      <button className="icon-btn plain" onClick={onDismiss} aria-label="Not now"><Icon name="close" size={20} /></button>
    </aside>
  )
}

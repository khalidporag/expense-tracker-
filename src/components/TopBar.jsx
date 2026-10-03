import React from 'react'
import Icon from './Icon.jsx'

// Search field + Settings gear on one row, same height, always at the top.
export default function TopBar({ onSearch, onSettings, settingsActive }) {
  return (
    <div className="topbar">
      <button className="searchbtn" onClick={onSearch} aria-label="Search the app" aria-haspopup="dialog">
        <Icon name="search" size={20} />
        <span>Search or jump to…</span>
      </button>
      <button className={settingsActive ? 'icon-btn on' : 'icon-btn'} onClick={onSettings} aria-label="Settings: categories, recurring, backup" aria-current={settingsActive ? 'page' : undefined}>
        <Icon name="gear" />
      </button>
    </div>
  )
}

import React, { useMemo, useState } from 'react'
import Icon from './Icon.jsx'
import { useBackHandler } from '../hooks/useBackHandler.js'
import { useCategories } from '../hooks/useCategories.js'
import { useSubcategories } from '../hooks/useSubcategories.js'
import { searchItems } from '../lib/search.js'
import { setThemePref } from '../lib/theme.js'
import { useInstall } from '../hooks/useInstall.jsx'

const RECENT_KEY = 'expense-tracker-search-recent'
const readRecent = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || [] } catch { return [] } }
const writeRecent = (ids) => { try { localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, 4))) } catch { /* storage unavailable */ } }
const SUGGESTED = ['add-expense', 'add-income', 'insights', 'budgets', 'theme-dark']

// Everything findable from the search bar. To make a new screen or setting searchable, add it here with
// plain-language keywords (synonyms are what make the search feel smart).
function buildItems({ cats, subs, ctx }) {
  const nav = (id, title, icon, tab, keywords) => ({ id, title, group: 'Go to', icon, keywords, run: () => ctx.go(tab) })
  const setting = (id, title, icon, view, keywords) => ({ id, title, group: 'Settings', icon, keywords, run: () => ctx.go('more', { view }) })
  const section = (id, title, section, keywords) => ({ id, title, group: 'Insights', icon: 'chart', keywords, run: () => ctx.go('insights', { section }) })
  const theme = (id, title, icon, pref, keywords) => ({ id, title, group: 'Appearance', icon, keywords: ['theme', 'appearance', ...keywords], run: () => setThemePref(pref) })

  const items = [
    nav('home', 'Home', 'homeNav', 'home', ['dashboard', 'overview', 'summary', 'today', 'safe to spend', 'balance', 'main']),
    nav('history', 'History', 'list', 'history', ['transactions', 'entries', 'list', 'log', 'records', 'past', 'all entries']),
    nav('insights', 'Insights', 'chart', 'insights', ['analytics', 'forecast', 'trends', 'report', 'stats', 'charts', 'compare']),
    nav('budgets', 'Budgets', 'target', 'budgets', ['limits', 'budget', 'allowance', 'overspend', 'pace', 'move budget']),
    nav('settings', 'Settings', 'gear', 'more', ['preferences', 'options', 'configuration', 'gear', 'menu']),
    setting('categories', 'Categories', 'tag', 'categories', ['category', 'subcategory', 'subcategories', 'labels', 'groups', 'icons', 'new category', 'add category', 'utility']),
    setting('recurring', 'Recurring', 'repeat', 'recurring', ['subscription', 'repeat', 'rent', 'salary', 'monthly', 'weekly', 'automatic', 'bills']),
    setting('backup', 'Backup & restore', 'download', 'backup', ['export', 'import', 'download', 'upload', 'restore', 'save data', 'json', 'safety', 'copy']),
    { id: 'appearance', title: 'Appearance', group: 'Settings', icon: 'sliders', keywords: ['theme', 'dark', 'light', 'mode', 'colors', 'colours'], run: () => ctx.go('more') },
    theme('theme-dark', 'Dark theme', 'moon', 'dark', ['night', 'dark mode', 'black']),
    theme('theme-light', 'Light theme', 'sun', 'light', ['day', 'bright', 'white', 'light mode']),
    theme('theme-system', 'System theme', 'sliders', 'system', ['auto', 'automatic', 'follow phone', 'default']),
    { id: 'add-expense', title: 'Add expense', group: 'Actions', icon: 'plus', keywords: ['new', 'spend', 'pay', 'record', 'log', 'purchase', 'cost', 'bought'], run: () => ctx.openAdd('expense') },
    { id: 'add-income', title: 'Add income', group: 'Actions', icon: 'plus', keywords: ['new', 'earn', 'salary', 'receive', 'deposit', 'got paid'], run: () => ctx.openAdd('income') },
    section('sec-forecast', 'Forecast', 'Forecast', ['projection', 'month end', 'pace', 'over budget', 'on track']),
    section('sec-whatif', 'Make it work (what-if)', 'What if', ['what if', 'cap', 'limit', 'calculator', 'simulate', 'scenario']),
    section('sec-numbers', 'Savings rate', 'Key numbers', ['savings', 'saved', 'daily average', 'fixed costs', 'no-spend days']),
    section('sec-changed', 'What changed since last month', 'What changed', ['compare', 'change', 'difference', 'last month', 'increase']),
    section('sec-days', 'Costliest days', 'Costliest days', ['weekday', 'day of week', 'friday', 'pattern']),
    section('sec-biggest', 'Biggest entries', 'Biggest entries', ['largest', 'top', 'expensive', 'most']),
  ]
  for (const c of cats) {
    items.push(c.kind === 'expense'
      ? { id: `cat-${c.id}`, title: c.name, group: 'Expense category', icon: c.icon, keywords: ['category', 'spending', 'detail', 'usage'], run: () => ctx.openDetail(c.id) }
      : { id: `cat-${c.id}`, title: c.name, group: 'Income category', icon: c.icon, keywords: ['category', 'income'], run: () => ctx.go('history', { categoryId: c.id }) })
  }
  const catById = new Map(cats.map((c) => [c.id, c]))
  for (const s of subs) {
    const c = catById.get(s.categoryId)
    if (c) items.push({ id: `sub-${s.id}`, title: s.name, group: `${c.name} › subcategory`, icon: c.icon, keywords: [c.name, 'subcategory'], run: () => ctx.go('history', { categoryId: s.categoryId, subcategoryId: s.id }) })
  }
  return items
}

// Full-screen "search or jump to" panel. Pick a result with a tap, or Up/Down + Enter.
export default function SearchPalette({ ctx, onClose }) {
  const { list: cats } = useCategories()
  const { list: subs } = useSubcategories()
  const { canInstall, install } = useInstall()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  useBackHandler(() => { onClose(); return true })

  const items = useMemo(() => {
    const all = buildItems({ cats, subs, ctx })
    if (canInstall) all.push({ id: 'install', title: 'Install as an app', group: 'Settings', icon: 'phone', keywords: ['app', 'home screen', 'add to home screen', 'download app', 'pwa', 'shortcut', 'install'], run: install })
    return all
  }, [cats, subs, ctx, canInstall, install])
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])
  const query = q.trim()

  const sections = useMemo(() => {
    if (query) {
      const found = searchItems(items, query, 7)
      const entries = { id: 'entries', title: `Search entries for “${query}”`, group: 'Entries', icon: 'search', run: () => ctx.go('history', { text: query }) }
      return [{ label: found.length ? 'Results' : 'No matching screen or setting', items: [...found, entries] }]
    }
    const recent = readRecent().map((id) => byId.get(id)).filter(Boolean)
    const quick = SUGGESTED.map((id) => byId.get(id)).filter((i) => i && !recent.includes(i))
    return [...(recent.length ? [{ label: 'Recent', items: recent }] : []), { label: 'Quick actions', items: quick }]
  }, [query, items, byId, ctx])
  const flat = sections.flatMap((s) => s.items)

  const run = (item) => {
    if (item.id !== 'entries') writeRecent([item.id, ...readRecent().filter((id) => id !== item.id)])
    onClose()
    item.run()
  }
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, flat.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter' && flat[active]) { e.preventDefault(); run(flat[active]) }
    else if (e.key === 'Escape') onClose()
  }

  let index = -1
  return (
    <div className="palette" role="dialog" aria-modal="true" aria-label="Search">
      <div className="palette-head">
        <label className="searchbtn field-like">
          <Icon name="search" size={20} />
          <input autoFocus type="search" role="combobox" aria-expanded="true" aria-controls="palette-list" aria-activedescendant={flat[active] ? `opt-${active}` : undefined}
            aria-label="Search the app" placeholder="Search screens, settings, categories…" enterKeyHint="go" autoComplete="off" autoCorrect="off" spellCheck="false"
            value={q} onChange={(e) => { setQ(e.target.value); setActive(0) }} onKeyDown={onKeyDown} />
        </label>
        <button className="icon-btn" onClick={onClose} aria-label="Close search"><Icon name="close" /></button>
      </div>
      <div className="sr" role="status">{query ? `${flat.length} results` : ''}</div>
      <ul id="palette-list" className="palette-list" role="listbox" aria-label="Results">
        {sections.map((s) => (
          <React.Fragment key={s.label}>
            <li role="presentation" className="palette-label">{s.label}</li>
            {s.items.map((item) => {
              index += 1
              const i = index
              return (
                <li key={item.id} id={`opt-${i}`} role="option" aria-selected={i === active}>
                  <button type="button" tabIndex={-1} className={i === active ? 'row-card on' : 'row-card'} onClick={() => run(item)} onMouseMove={() => active !== i && setActive(i)}>
                    <span className="badge" style={{ width: 40, height: 40 }}><Icon name={item.icon} /></span>
                    <span className="grow"><strong>{item.title}</strong><span className="muted small">{item.group}</span></span>
                    <Icon name="chevR" size={18} />
                  </button>
                </li>
              )
            })}
          </React.Fragment>
        ))}
      </ul>
    </div>
  )
}

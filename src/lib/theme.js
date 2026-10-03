// Theme preference: 'system' (follow the phone), 'light' or 'dark'. Stored per device in localStorage
// (a UI preference, not app data, so it is not part of backups). index.html applies it before first paint.
const KEY = 'expense-tracker-theme'
const COLORS = { light: '#f4f4f1', dark: '#0b0f17' }

export const normalizeTheme = (v) => (v === 'light' || v === 'dark' ? v : 'system')
export const resolveTheme = (pref, systemDark) => (pref === 'system' ? (systemDark ? 'dark' : 'light') : pref)

export function getThemePref() {
  try {
    return normalizeTheme(localStorage.getItem(KEY))
  } catch {
    return 'system'
  }
}

const systemDark = () => !!window.matchMedia?.('(prefers-color-scheme: dark)').matches

export function applyTheme(pref) {
  const theme = resolveTheme(pref, systemDark())
  const root = document.documentElement
  root.dataset.theme = theme
  root.style.colorScheme = theme // native controls (date picker, scrollbars) follow
  const meta = document.querySelector('meta[name=theme-color]')
  if (meta) meta.setAttribute('content', COLORS[theme])
  return theme
}

export function setThemePref(pref) {
  try {
    localStorage.setItem(KEY, normalizeTheme(pref))
  } catch {
    /* storage unavailable (private mode): the choice lasts until the page closes */
  }
  return applyTheme(normalizeTheme(pref))
}

// While the preference is 'system', re-apply whenever the phone switches between light and dark.
export function watchSystemTheme() {
  const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
  const onChange = () => getThemePref() === 'system' && applyTheme('system')
  mq?.addEventListener?.('change', onChange)
  return () => mq?.removeEventListener?.('change', onChange)
}

// The welcome splash shows when the app is opened, once per browsing session (a reload keeps the session,
// closing and reopening the installed app starts a new one). Automated browsers skip it so tests are not
// blocked; `?splash=1` forces it (used to test it).
export function shouldShowSplash({ search = '', webdriver = false, seen = false } = {}) {
  if (/[?&]splash=1(&|$)/.test(search)) return true
  return !webdriver && !seen
}

export function greeting(hour) {
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
}

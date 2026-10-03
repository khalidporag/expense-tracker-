// The phone's Back button, handled inside the app: the most recently opened thing (a sheet, a Settings
// sub-page, the search panel) gets the first chance to handle it. If nothing handles it, the app asks
// "Exit?" instead of closing. Handlers return true when they handled the press.
const stack = []

export function pushBackHandler(fn) {
  const entry = { fn }
  stack.push(entry)
  return () => {
    const i = stack.indexOf(entry)
    if (i >= 0) stack.splice(i, 1)
  }
}

export function runBackHandlers() {
  for (let i = stack.length - 1; i >= 0; i--) if (stack[i].fn() === true) return true
  return false
}

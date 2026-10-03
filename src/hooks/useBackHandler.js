import { useEffect, useRef } from 'react'
import { pushBackHandler } from '../lib/backStack.js'

// Registers `fn` as a Back-button handler while `enabled`. `fn` returns true if it handled the press.
// The newest registered handler runs first, so sheets sit above Settings sub-pages, which sit above the tab itself.
export function useBackHandler(fn, enabled = true) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => (enabled ? pushBackHandler(() => ref.current()) : undefined), [enabled])
}

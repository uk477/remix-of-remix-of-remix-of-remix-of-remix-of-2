import { useEffect, useRef, useState } from 'react'

/**
 * SSR-safe persistent state. Renders `initial` on the server and on the very
 * first client render (to avoid hydration mismatches), then hydrates from
 * localStorage in an effect, and mirrors every subsequent change back.
 */
export function useLocalState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial)
  const hydrated = useRef(false)

  // Load once after mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw !== null) {
        setValue(JSON.parse(raw) as T)
      }
    } catch {
      // ignore parse / access errors
    }
    hydrated.current = true
  }, [key])

  // Persist on change (skip the initial render before hydration finished)
  useEffect(() => {
    if (!hydrated.current) return
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // storage full / disabled — silently ignore
    }
  }, [key, value])

  return [value, setValue] as const
}

/**
 * Same idea as `useLocalState`, but backed by sessionStorage. Meant for
 * in-progress flows (checkout, top-up, forms): iOS/Telegram WebViews are
 * frequently discarded and reloaded when the app is backgrounded, which
 * otherwise throws the user back to the first step.
 */
export function useSessionState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial)
  const hydrated = useRef(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(key)
      if (raw !== null) setValue(JSON.parse(raw) as T)
    } catch {
      // ignore
    }
    hydrated.current = true
  }, [key])

  useEffect(() => {
    if (!hydrated.current) return
    try {
      sessionStorage.setItem(key, JSON.stringify(value))
    } catch {
      // ignore
    }
  }, [key, value])

  return [value, setValue] as const
}

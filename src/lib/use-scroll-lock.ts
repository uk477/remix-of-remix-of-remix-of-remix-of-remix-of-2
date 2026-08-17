import { useEffect } from 'react'

/**
 * Locks background scrolling while a full-screen sheet/modal is open.
 * Without this, iOS momentum scrolling keeps moving the page behind the
 * overlay and the user loses their place when the sheet closes.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [active])
}

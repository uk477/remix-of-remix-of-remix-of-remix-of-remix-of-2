import { useEffect } from 'react'

/**
 * Client-only Telegram WebApp bootstrapper. Injects the SDK script once and
 * calls `ready()/expand()` after it loads. Kept out of the SSR head to avoid
 * hydration mismatches from Telegram writing to `<html>` inline styles.
 */
export function TelegramInit() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    let cancelled = false
    const boot = () => {
      if (cancelled) return
      const tg = window.Telegram?.WebApp
      if (!tg) return
      try {
        tg.ready()
        if (tg.platform && tg.platform !== 'unknown') tg.expand()
        if (tg.isVersionAtLeast?.('6.1')) {
          tg.setHeaderColor?.('#000000')
          tg.setBackgroundColor?.('#000000')
        }
      } catch {
        // ignore — Telegram surface may not be available in this environment
      }
    }

    if (window.Telegram?.WebApp) {
      boot()
      return
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-telegram-webapp]',
    )
    if (existing) {
      existing.addEventListener('load', boot, { once: true })
      return () => {
        cancelled = true
        existing.removeEventListener('load', boot)
      }
    }

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-web-app.js'
    script.async = true
    script.defer = true
    script.dataset.telegramWebapp = 'true'
    script.addEventListener('load', boot, { once: true })
    document.head.appendChild(script)

    return () => {
      cancelled = true
      script.removeEventListener('load', boot)
    }
  }, [])

  return null
}

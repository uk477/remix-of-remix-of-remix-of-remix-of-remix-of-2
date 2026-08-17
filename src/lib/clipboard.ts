/**
 * Copy text to the clipboard with a WebView-friendly fallback.
 *
 * `navigator.clipboard` is unavailable or rejects in a few real-world cases
 * that matter for a Telegram Mini App (insecure context, older Android
 * WebViews, denied permission). The legacy `execCommand('copy')` path still
 * works there, so try it before giving up. Resolves to whether the copy
 * actually succeeded so callers don't show a false "Copied" toast.
 */
export async function copyText(text: string): Promise<boolean> {
  if (typeof window === 'undefined' || !text) return false

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to the legacy path
  }

  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '0'
    ta.style.left = '0'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    ta.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

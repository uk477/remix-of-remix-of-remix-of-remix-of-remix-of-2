'use client'

import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { useNav } from '@/lib/nav'

const EDGE_WIDTH = 30 // px hot zone on the left edge
const COMMIT_DISTANCE = 72 // px drag needed to trigger back
const MAX_PULL = 120
const PILL_H = 60

function haptic(style: 'light' | 'medium' = 'light') {
  if (typeof window === 'undefined') return
  const app = (
    window as unknown as {
      Telegram?: {
        WebApp?: {
          isVersionAtLeast?: (v: string) => boolean
          HapticFeedback?: { impactOccurred?: (s: string) => void }
        }
      }
    }
  ).Telegram?.WebApp
  if (!app?.isVersionAtLeast?.('6.1')) return
  app.HapticFeedback?.impactOccurred?.(style)
}

/**
 * Screens keep their own in-page steps (category → subcategory → detail) that
 * do not change the URL, so a plain router `back()` would jump straight to the
 * root. Mirror the visible header back button instead: the deepest mounted
 * `ScreenHeader` back button is exactly one step up.
 */
function stepBack(routerBack: () => void) {
  if (typeof document !== 'undefined') {
    const buttons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[data-screen-back]'),
    ).filter((b) => b.offsetParent !== null)
    const deepest = buttons[buttons.length - 1]
    if (deepest) {
      deepest.click()
      return
    }
  }
  routerBack()
}

/**
 * Telegram-style edge swipe: pull from the left edge to go back one step.
 * All drag frames write straight to the DOM (no React state) so the gesture
 * stays glued to the finger at 60/120fps on phones.
 */
export function SwipeBack({ contentRef }: { contentRef?: RefObject<HTMLElement | null> }) {
  const { back, canGoBack } = useNav()

  const pillRef = useRef<HTMLDivElement | null>(null)
  const arrowRef = useRef<SVGSVGElement | null>(null)

  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const draggingRef = useRef(false)
  const armedRef = useRef(false)
  const pullRef = useRef(0)
  const yRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const canGoBackRef = useRef(canGoBack)
  canGoBackRef.current = canGoBack

  const paint = () => {
    rafRef.current = null
    const pill = pillRef.current
    if (!pill) return
    const pull = pullRef.current
    const progress = Math.min(1, pull / COMMIT_DISTANCE)
    const ready = progress >= 1
    const armed = armedRef.current

    pill.style.opacity = armed ? '1' : '0'
    pill.style.width = `${(34 + progress * 22).toFixed(1)}px`
    pill.style.transform = `translate3d(0, ${(yRef.current - PILL_H / 2).toFixed(1)}px, 0)`
    pill.style.borderColor = ready ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.12)'
    pill.style.background = ready ? 'rgba(24,24,24,0.82)' : 'rgba(0,0,0,0.6)'

    const arrow = arrowRef.current
    if (arrow) {
      arrow.style.opacity = `${(0.5 + progress * 0.5).toFixed(2)}`
      arrow.style.transform = `translate3d(${(progress * 5).toFixed(1)}px,0,0)`
    }

    const content = contentRef?.current
    if (content) {
      content.style.transition = 'none'
      content.style.transform = pull ? `translate3d(${(pull * 0.32).toFixed(1)}px,0,0)` : ''
    }
  }

  const schedule = () => {
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(paint)
  }

  const settle = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    draggingRef.current = false
    armedRef.current = false
    pullRef.current = 0

    const pill = pillRef.current
    if (pill) {
      pill.style.transition = 'opacity 160ms ease, width 220ms cubic-bezier(0.22,1,0.36,1)'
      pill.style.opacity = '0'
      pill.style.width = '34px'
      window.setTimeout(() => {
        if (pill) pill.style.transition = ''
      }, 240)
    }
    const content = contentRef?.current
    if (content) {
      content.style.transition = 'transform 260ms cubic-bezier(0.22,1,0.36,1)'
      content.style.transform = ''
      window.setTimeout(() => {
        if (content) content.style.transition = ''
      }, 280)
    }
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!canGoBackRef.current) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    startXRef.current = e.clientX
    startYRef.current = e.clientY
    yRef.current = e.clientY
    draggingRef.current = true
    armedRef.current = false
    pullRef.current = 0
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    const dx = e.clientX - startXRef.current
    const dy = e.clientY - startYRef.current
    if (!armedRef.current) {
      // Vertical intent wins — let the page scroll.
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        draggingRef.current = false
        return
      }
      if (dx < 8) return
      armedRef.current = true
      haptic('light')
    }
    // Rubber-band beyond MAX_PULL.
    const raw = Math.max(0, dx)
    const next = raw <= MAX_PULL ? raw : MAX_PULL + (raw - MAX_PULL) * 0.25
    const wasCommitted = pullRef.current >= COMMIT_DISTANCE
    pullRef.current = next
    // Vertical follow is damped so the pill glides instead of jittering.
    yRef.current += (e.clientY - yRef.current) * 0.45
    if (!wasCommitted && next >= COMMIT_DISTANCE) haptic('medium')
    schedule()
  }

  const finish = (e: ReactPointerEvent<HTMLDivElement>) => {
    ;(e.currentTarget as Element).releasePointerCapture?.(e.pointerId)
    const committed = armedRef.current && pullRef.current >= COMMIT_DISTANCE
    settle()
    if (committed) stepBack(back)
  }

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    },
    [],
  )

  if (!canGoBack) return null

  return (
    <>
      <div
        aria-hidden
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        style={{ width: EDGE_WIDTH, touchAction: 'pan-y' }}
        className="absolute inset-y-0 left-0 z-50"
      />
      <div
        aria-hidden
        ref={pillRef}
        className="pointer-events-none absolute left-0 top-0 z-50 flex items-center justify-start rounded-r-[20px] border border-l-0 text-foreground shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)] backdrop-blur-md"
        style={{
          width: 34,
          height: PILL_H,
          opacity: 0,
          borderColor: 'rgba(255,255,255,0.12)',
          background: 'rgba(0,0,0,0.6)',
          willChange: 'transform, width, opacity',
          contain: 'layout paint',
        }}
      >
        <svg
          ref={arrowRef}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5 shrink-0"
          style={{ marginLeft: 8, opacity: 0.5 }}
        >
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
      </div>
    </>
  )
}

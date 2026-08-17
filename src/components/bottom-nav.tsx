import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Home, User, type LucideIcon } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

type TabTo = '/' | '/profile'
type Tab = { to: TabTo; icon: LucideIcon; label: string }

const TABS: Tab[] = [
  { to: '/', icon: Home, label: 'nav_home' },
  { to: '/profile', icon: User, label: 'nav_profile' },
]

const LONG_PRESS_MS = 130
const SWIPE_THRESHOLD = 6
const GHOST_CLICK_MS = 400

type TG = {
  HapticFeedback?: {
    impactOccurred?: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
    selectionChanged?: () => void
    notificationOccurred?: (type: 'error' | 'success' | 'warning') => void
  }
}

function getHaptics(): TG['HapticFeedback'] | undefined {
  if (typeof window === 'undefined') return
  const w = window as unknown as {
    Telegram?: { WebApp?: TG & { isVersionAtLeast?: (v: string) => boolean } }
  }
  const app = w.Telegram?.WebApp
  // HapticFeedback only exists from Bot API 6.1 — calling it on older
  // clients (Telegram Desktop 6.0) throws noisy console errors.
  if (!app?.isVersionAtLeast?.('6.1')) return
  return app.HapticFeedback
}


export function BottomNav() {
  const { t } = useI18n()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const navigate = useNavigate()

  const containerRef = useRef<HTMLDivElement | null>(null)
  const pillRef = useRef<HTMLSpanElement | null>(null)
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([])
  const centersRef = useRef<number[]>([])
  const widthsRef = useRef<number[]>([])
  const containerLeftRef = useRef(0)
  const containerWidthRef = useRef(0)

  const activeIndex = (() => {
    // Treat profile subroutes (about, history, etc.) as Profile tab.
    // Only "/" exactly is Home. Everything else that isn't a known tab → no active tab (-1 sentinel, rendered as no highlight).
    if (pathname === '/') return 0
    if (pathname === '/profile' || pathname.startsWith('/profile/')) return 1
    // Non-home routes reached from profile (history, about, referral, etc.) keep Profile highlighted
    if (pathname !== '/') return 1
    return 0
  })()

  const [peek, setPeek] = useState(false)
  const [highlight, setHighlight] = useState(activeIndex)

  // animation state (refs, not React)
  const currentXRef = useRef(0)
  const currentWRef = useRef(0)
  const targetXRef = useRef(0)
  const targetWRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startXRef = useRef(0)
  const movedRef = useRef(false)
  const peekRef = useRef(false)
  const pointerDownRef = useRef(false)
  const activePointerIdRef = useRef<number | null>(null)
  const suppressClickUntilRef = useRef(0)
  const lastHighlightRef = useRef(activeIndex)

  const measure = () => {
    const container = containerRef.current
    if (!container) return
    const cRect = container.getBoundingClientRect()
    containerLeftRef.current = cRect.left
    containerWidthRef.current = cRect.width
    const centers: number[] = []
    const widths: number[] = []
    buttonRefs.current.forEach((btn) => {
      if (!btn) return
      const r = btn.getBoundingClientRect()
      centers.push(r.left + r.width / 2)
      widths.push(r.width)
    })
    centersRef.current = centers
    widthsRef.current = widths
  }

  useLayoutEffect(() => {
    measure()
    const onResize = () => {
      measure()
      snapToIndex(activeIndex, true)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  // Spring state (critically-damped)
  const velXRef = useRef(0)
  const velWRef = useRef(0)
  const lastTimeRef = useRef(0)
  // stiffness ~ 620 (fast snap), damping = 2*sqrt(k) for critical
  const K = 620
  const D = 2 * Math.sqrt(K)

  const applyTransform = () => {
    const pill = pillRef.current
    if (!pill) return
    // translate3d + width; width on absolutely-positioned element doesn't reflow siblings
    pill.style.transform = `translate3d(${currentXRef.current.toFixed(2)}px, 0, 0)`
    pill.style.width = `${currentWRef.current.toFixed(2)}px`
  }

  const stopRaf = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    lastTimeRef.current = 0
    velXRef.current = 0
    velWRef.current = 0
  }

  const tick = (now: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = now
    // cap dt so tab-switch / slow frames don't explode the spring
    const dt = Math.min(0.032, (now - lastTimeRef.current) / 1000) || 0.016
    lastTimeRef.current = now

    // spring integration for x
    const fx = -K * (currentXRef.current - targetXRef.current) - D * velXRef.current
    velXRef.current += fx * dt
    currentXRef.current += velXRef.current * dt

    // spring integration for w
    const fw = -K * (currentWRef.current - targetWRef.current) - D * velWRef.current
    velWRef.current += fw * dt
    currentWRef.current += velWRef.current * dt

    applyTransform()

    const settled =
      Math.abs(targetXRef.current - currentXRef.current) < 0.3 &&
      Math.abs(targetWRef.current - currentWRef.current) < 0.3 &&
      Math.abs(velXRef.current) < 0.5 &&
      Math.abs(velWRef.current) < 0.5
    if (settled) {
      currentXRef.current = targetXRef.current
      currentWRef.current = targetWRef.current
      velXRef.current = 0
      velWRef.current = 0
      applyTransform()
      rafRef.current = null
      lastTimeRef.current = 0
      return
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const setTarget = (x: number, w: number) => {
    if (
      Math.abs(x - targetXRef.current) < 0.1 &&
      Math.abs(w - targetWRef.current) < 0.1
    ) return
    targetXRef.current = x
    targetWRef.current = w
    if (rafRef.current == null) {
      lastTimeRef.current = 0
      rafRef.current = requestAnimationFrame(tick)
    }
  }

  const setImmediatePosition = (x: number, w: number) => {
    stopRaf()
    currentXRef.current = x
    currentWRef.current = w
    targetXRef.current = x
    targetWRef.current = w
    applyTransform()
  }

  const snapToIndex = (i: number, immediate = false) => {
    const centers = centersRef.current
    const widths = widthsRef.current
    if (!centers[i]) return
    const w = widths[i]
    const x = centers[i] - containerLeftRef.current - w / 2
    if (immediate) {
      stopRaf()
      currentXRef.current = x
      currentWRef.current = w
      targetXRef.current = x
      targetWRef.current = w
      applyTransform()
    } else {
      setTarget(x, w)
    }
  }

  // Snap when route changes / on mount
  useLayoutEffect(() => {
    if (!centersRef.current.length) measure()
    snapToIndex(activeIndex, true)
    lastHighlightRef.current = activeIndex
    setHighlight(activeIndex)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex])

  const nearestIndex = (pointerX: number) => {
    const centers = centersRef.current
    let best = 0
    let bestDist = Infinity
    for (let i = 0; i < centers.length; i++) {
      const d = Math.abs(pointerX - centers[i])
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    }
    return best
  }

  // Follow the finger: pill x = pointer - w/2, clamped to container.
  const followPointer = (pointerX: number) => {
    const widths = widthsRef.current
    const w = widths[lastHighlightRef.current] ?? widths[0] ?? 0
    const relX = pointerX - containerLeftRef.current - w / 2
    const maxX = Math.max(0, containerWidthRef.current - w)
    const clamped = Math.min(Math.max(relX, 0), maxX)
    // During drag the pill must be glued to the finger — no spring/lerp delay.
    setImmediatePosition(clamped, w)
  }

  const setHighlightIdx = (idx: number) => {
    if (idx !== lastHighlightRef.current) {
      lastHighlightRef.current = idx
      setHighlight(idx)
      const h = getHaptics()
      if (h?.selectionChanged) h.selectionChanged()
      else h?.impactOccurred?.('light')
    }
  }

  const enterPeek = (initialIdx: number, pointerX?: number) => {
    if (peekRef.current) return
    peekRef.current = true
    setPeek(true)
    getHaptics()?.impactOccurred?.('medium')
    setHighlightIdx(initialIdx)
    if (pointerX != null) followPointer(pointerX)
  }

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const onPointerDown = (idx: number) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    measure()
    pointerDownRef.current = true
    activePointerIdRef.current = e.pointerId
    startXRef.current = e.clientX
    movedRef.current = false
    lastHighlightRef.current = activeIndex
    setHighlight(activeIndex)
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)

    const px = e.clientX
    clearLongPress()
    longPressTimerRef.current = setTimeout(() => {
      if (!pointerDownRef.current) return
      enterPeek(idx, px)
    }, LONG_PRESS_MS)
  }

  const pendingXRef = useRef<number | null>(null)
  const moveRafRef = useRef<number | null>(null)

  const flushMove = (idx: number) => {
    moveRafRef.current = null
    const px = pendingXRef.current
    if (px == null) return
    pendingXRef.current = null
    if (!peekRef.current) return
    followPointer(px)
    setHighlightIdx(nearestIndex(px))
  }

  const onPointerMove = (idx: number) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    // Ignore hover — only track when the pointer is actually pressed on this nav.
    if (!pointerDownRef.current) return
    if (activePointerIdRef.current !== null && activePointerIdRef.current !== e.pointerId) return
    if (e.pointerType === 'mouse' && e.buttons === 0) {
      finish(null)
      return
    }
    const dx = e.clientX - startXRef.current
    if (!peekRef.current) {
      if (Math.abs(dx) > SWIPE_THRESHOLD) {
        clearLongPress()
        enterPeek(idx, e.clientX)
      } else {
        return
      }
    }
    movedRef.current = true
    // Coalesce high-frequency pointermove into rAF — one update per frame max.
    pendingXRef.current = e.clientX
    if (moveRafRef.current == null) {
      moveRafRef.current = requestAnimationFrame(() => flushMove(idx))
    }
  }


  const finish = (commitIdx: number | null) => {
    clearLongPress()
    pointerDownRef.current = false
    activePointerIdRef.current = null
    if (moveRafRef.current != null) {
      cancelAnimationFrame(moveRafRef.current)
      moveRafRef.current = null
    }
    pendingXRef.current = null
    const wasPeek = peekRef.current
    peekRef.current = false
    if (wasPeek) {
      suppressClickUntilRef.current = Date.now() + GHOST_CLICK_MS
    }
    setPeek(false)


    if (commitIdx != null) {
      const target = TABS[commitIdx]
      const needsNav = target.to !== pathname
      if (needsNav) {
        // Snap highlight to intended tab immediately so the pill and the
        // active tab tint update in the same frame as navigation — no
        // "old tab still highlighted" flash while the route resolves.
        lastHighlightRef.current = commitIdx
        setHighlight(commitIdx)
        snapToIndex(commitIdx)
        if (wasPeek) getHaptics()?.notificationOccurred?.('success')
        // Navigate synchronously (no startTransition / no rAF delay) so the
        // new route mounts on the next frame instead of one frame later.
        navigate({ to: target.to })
      } else {
        snapToIndex(commitIdx)
      }

    } else {
      snapToIndex(activeIndex)
      setHighlight(activeIndex)
      lastHighlightRef.current = activeIndex
    }
  }

  const onPointerUp = (idx: number) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!pointerDownRef.current) return
    const wasPeek = peekRef.current
    if (wasPeek) {
      finish(lastHighlightRef.current)
    } else {
      clearLongPress()
      finish(idx)
    }
    ;(e.currentTarget as Element).releasePointerCapture?.(e.pointerId)
  }

  const onPointerCancel = (e: ReactPointerEvent<HTMLButtonElement>) => {
    finish(null)
    ;(e.currentTarget as Element).releasePointerCapture?.(e.pointerId)
  }

  const onClick = (e: React.MouseEvent) => {
    if (Date.now() < suppressClickUntilRef.current) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  const onContextMenu = (e: React.MouseEvent) => e.preventDefault()

  useEffect(() => () => stopRaf(), [])

  return (
    <nav
      aria-label="Primary"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[480px] px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)]"
    >
      <div
        ref={containerRef}
        className={`glass pointer-events-auto relative flex items-center justify-between gap-1 rounded-[26px] border p-1.5 shadow-[0_8px_40px_-8px_rgba(0,0,0,0.8)] transition-[border-color,transform] duration-150 ${
          peek ? 'scale-[1.012] border-primary/70' : 'border-border-strong'
        }`}
        style={{ contain: 'layout paint', transform: 'translateZ(0)' }}
      >
        {/* Static peek ring — opacity only, cheap to composite */}
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-0 rounded-[26px] ring-2 ring-primary/60 transition-opacity duration-150 ${
            peek ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <span
          ref={pillRef}
          aria-hidden
          className="pointer-events-none absolute left-0 top-1.5 bottom-1.5 rounded-[20px] bg-foreground"
          style={{ transform: 'translate3d(0,0,0)', width: 0, willChange: 'transform, width', contain: 'layout paint' }}
        />

        {TABS.map((tab, i) => {
          const Icon = tab.icon
          const isHighlighted = (peek ? highlight : activeIndex) === i
          const label = t(tab.label as never)
          return (
            <button
              key={tab.to}
              ref={(el) => {
                buttonRefs.current[i] = el
              }}
              type="button"
              aria-label={label}
              aria-current={activeIndex === i ? 'page' : undefined}
              onPointerDown={onPointerDown(i)}
              onPointerMove={onPointerMove(i)}
              onPointerUp={onPointerUp(i)}
              onPointerCancel={onPointerCancel}
              onClick={onClick}
              onContextMenu={onContextMenu}
              style={{ touchAction: 'pan-y', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
              className="relative z-10 flex flex-1 items-center justify-center outline-none"
            >
              <span
                className={`relative flex items-center gap-1.5 px-2.5 py-2.5 transition-colors duration-150 ${
                  isHighlighted ? 'text-background' : 'text-muted-foreground'
                }`}
              >
                <Icon
                  strokeWidth={isHighlighted ? 2.5 : 2}
                  fill={isHighlighted ? 'currentColor' : 'none'}
                  className="size-[21px]"
                  aria-hidden
                />
                <span
                  className={`overflow-hidden whitespace-nowrap text-[13px] font-extrabold tracking-tight transition-all duration-200 ${
                    isHighlighted ? 'ml-0.5 max-w-[120px] opacity-100' : 'max-w-0 opacity-0'
                  }`}
                >
                  {label}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

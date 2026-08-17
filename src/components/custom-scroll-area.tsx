'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

/**
 * Scrollable box with a slim, always-visible custom scrollbar on the right —
 * same interaction model as the delivery preview (drag thumb, click track).
 */
export function CustomScrollArea({
  children,
  className = '',
  thumbClassName = 'bg-primary/80',
  trackClassName = 'bg-white/10',
  label = 'Scroll',
}: {
  children: ReactNode
  className?: string
  thumbClassName?: string
  trackClassName?: string
  label?: string
}) {
  const [viewportEl, setViewportEl] = useState<HTMLDivElement | null>(null)
  const [trackEl, setTrackEl] = useState<HTMLDivElement | null>(null)
  const [info, setInfo] = useState({ top: 0, height: 0, visible: false })
  const dragRef = useRef<{ startY: number; startScroll: number } | null>(null)

  const update = useCallback(() => {
    const el = viewportEl
    if (!el) return
    const maxScroll = el.scrollHeight - el.clientHeight
    if (maxScroll <= 1) {
      setInfo({ top: 0, height: 0, visible: false })
      return
    }
    const th = trackEl?.clientHeight ?? el.clientHeight
    const thumbHeight = Math.max(24, (el.clientHeight / el.scrollHeight) * th)
    const maxTop = Math.max(0, th - thumbHeight)
    setInfo({
      top: Math.min(maxTop, (el.scrollTop / maxScroll) * maxTop),
      height: thumbHeight,
      visible: true,
    })
  }, [viewportEl, trackEl])

  useEffect(() => {
    const el = viewportEl
    if (!el) return
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    if (trackEl) ro.observe(trackEl)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [viewportEl, trackEl, update])

  const geometry = () => {
    const el = viewportEl
    if (!el) return null
    const th = trackEl?.clientHeight ?? el.clientHeight
    const maxScroll = el.scrollHeight - el.clientHeight
    const maxTop = Math.max(1, th - info.height)
    return { el, th, maxScroll, maxTop }
  }

  const onThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const g = geometry()
    if (!g) return
    dragRef.current = { startY: e.clientY, startScroll: g.el.scrollTop }
    const onMove = (ev: PointerEvent) => {
      if (!dragRef.current) return
      const delta = ev.clientY - dragRef.current.startY
      g.el.scrollTop = Math.max(
        0,
        Math.min(g.maxScroll, dragRef.current.startScroll + (delta / g.maxTop) * g.maxScroll),
      )
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const onTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    const g = geometry()
    if (!g) return
    const rect = e.currentTarget.getBoundingClientRect()
    const desiredTop = Math.max(
      0,
      Math.min(g.maxTop, e.clientY - rect.top - info.height / 2),
    )
    g.el.scrollTop = (desiredTop / g.maxTop) * g.maxScroll
  }

  return (
    <div className="relative">
      <div
        ref={setViewportEl}
        className={`no-scrollbar overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] ${className}`}
      >
        {children}
      </div>
      {info.visible ? (
        <div
          ref={setTrackEl}
          onPointerDown={onTrackPointerDown}
          aria-hidden="true"
          className={`absolute right-1 top-1.5 bottom-1.5 w-1.5 touch-none overflow-hidden rounded-full ${trackClassName}`}
        >
          <div
            className="absolute left-0 right-0 touch-none"
            style={{ top: info.top, height: info.height }}
            onPointerDown={onThumbPointerDown}
            aria-label={label}
          >
            <div className={`h-full w-full rounded-full ${thumbClassName}`} />
          </div>
        </div>
      ) : null}
    </div>
  )
}

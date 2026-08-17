'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ZoomIn, ZoomOut } from 'lucide-react'

type Props = {
  src: string
  /** crop aspect ratio: width / height */
  aspect: number
  round?: boolean
  title: string
  applyLabel: string
  onCancel: () => void
  onApply: (dataUrl: string) => void
}

const MAX_OUT = 1200

/** Twitter-style "Edit media" sheet: drag to move, slider to zoom, apply to crop. */
export function MediaCropper({
  src,
  aspect,
  round,
  title,
  applyLabel,
  onCancel,
  onApply,
}: Props) {
  const frameRef = useRef<HTMLDivElement | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null)
  const [frame, setFrame] = useState({ w: 0, h: 0 })
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  useEffect(() => {
    const img = new Image()
    img.onload = () => setNat({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = src
    imgRef.current = img
  }, [src])

  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const measure = () => setFrame({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const base = nat && frame.w ? Math.max(frame.w / nat.w, frame.h / nat.h) : 1
  const dispW = nat ? nat.w * base * zoom : 0
  const dispH = nat ? nat.h * base * zoom : 0

  const clamp = (p: { x: number; y: number }) => {
    const mx = Math.max(0, (dispW - frame.w) / 2)
    const my = Math.max(0, (dispH - frame.h) / 2)
    return {
      x: Math.min(mx, Math.max(-mx, p.x)),
      y: Math.min(my, Math.max(-my, p.y)),
    }
  }

  useEffect(() => {
    setPos((p) => clamp(p))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, nat, frame.w, frame.h])

  const onDown = (e: React.PointerEvent) => {
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y }
  }
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    setPos(clamp({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) }))
  }
  const onUp = () => {
    drag.current = null
  }

  const apply = () => {
    const img = imgRef.current
    if (!img || !nat || !frame.w) return onCancel()
    const outW = Math.min(MAX_OUT, Math.round(frame.w * 2))
    const outH = Math.round(outW / aspect)
    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d')
    if (!ctx) return onCancel()
    const k = outW / frame.w
    ctx.drawImage(
      img,
      (frame.w - dispW) / 2 * k + pos.x * k,
      (frame.h - dispH) / 2 * k + pos.y * k,
      dispW * k,
      dispH * k,
    )
    onApply(canvas.toDataURL('image/jpeg', 0.92))
  }

  const body = (
    <div className="fixed inset-0 z-[500] flex flex-col bg-black/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 pt-[max(14px,env(safe-area-inset-top))] pb-3">
        <button
          type="button"
          onClick={onCancel}
          className="grid size-9 place-items-center rounded-full text-foreground transition-colors hover:bg-white/10"
          aria-label="Back"
        >
          <ArrowLeft className="size-5" strokeWidth={1.6} />
        </button>
        <span className="text-[15px] font-semibold tracking-[0.02em] text-foreground">{title}</span>
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={apply}
          className="rounded-full bg-primary px-4 py-1.5 text-[13px] font-semibold text-primary-foreground"
        >
          {applyLabel}
        </motion.button>
      </div>

      <div className="flex flex-1 items-center justify-center px-5">
        <div
          ref={frameRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className={`relative w-full max-w-[420px] touch-none overflow-hidden border-2 border-primary select-none ${
            round ? 'rounded-full' : 'rounded-[4px]'
          }`}
          style={{ aspectRatio: String(aspect), cursor: 'grab' }}
        >
          {nat && (
            <img
              src={src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
              style={{
                width: dispW,
                height: dispH,
                transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
              }}
            />
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 px-8 pb-[max(22px,env(safe-area-inset-bottom))] pt-6">
        <ZoomOut className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.6} />
        <input
          type="range"
          min={1}
          max={4}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="h-1 w-full flex-1 cursor-pointer appearance-none rounded-full bg-white/20 accent-[var(--primary)]"
        />
        <ZoomIn className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.6} />
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(body, document.body)
}
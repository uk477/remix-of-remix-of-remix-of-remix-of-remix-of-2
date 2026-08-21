'use client'

import { ChevronLeft } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Compact sticky header for the order screen.
 * The app scrolls inside <main>, so "scrolled" is detected with a sentinel
 * instead of window scroll.
 */
export function OrderHeader({
  title,
  backLabel,
  onBack,
}: {
  title: string
  backLabel: string
  onBack: () => void
}) {
  const sentinel = useRef<HTMLDivElement | null>(null)
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    const el = sentinel.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting), { threshold: 1 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <>
      <div ref={sentinel} aria-hidden className="h-px w-full" />
      <header
        className={cn(
          'sticky top-0 z-40 transition-colors duration-300',
          stuck
            ? 'border-b border-white/[0.07] bg-background/80 backdrop-blur-xl'
            : 'border-b border-transparent',
        )}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto flex h-[52px] w-full max-w-[520px] items-center gap-2 px-2">
          <button
            type="button"
            onClick={onBack}
            data-screen-back=""
            className="-ml-0.5 flex h-11 min-w-11 items-center gap-0.5 rounded-xl px-2 text-[15px] font-medium text-foreground transition-transform active:scale-[0.97]"
          >
            <ChevronLeft className="size-[22px] shrink-0 text-primary" strokeWidth={2.2} />
            <span className="text-[15px] text-primary">{backLabel}</span>
          </button>
          <h1 className="flex-1 truncate text-center text-[16px] font-semibold tracking-tight">
            {title}
          </h1>
          <span aria-hidden className="h-11 min-w-11" />
        </div>
      </header>
    </>
  )
}

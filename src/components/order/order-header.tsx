'use client'

import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { GlyphBack } from './icons'
import { cn } from '@/lib/utils'

/**
 * Compact sticky header. The title only fades in once the hero scrolls under
 * it, so the top of the page stays quiet on arrival.
 * The app scrolls inside <main>, so "stuck" is detected with a sentinel.
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
        className={cn('sticky top-0 z-40 transition-[background-color] duration-300')}
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          backgroundColor: stuck
            ? 'color-mix(in oklab, var(--background) 82%, transparent)'
            : 'transparent',
          backdropFilter: stuck ? 'blur(18px) saturate(140%)' : undefined,
        }}
      >
        <div className="mx-auto flex h-[52px] w-full max-w-[520px] items-center gap-2 px-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={onBack}
            data-screen-back=""
            aria-label={backLabel}
            className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-foreground/85 transition-colors hover:text-foreground"
          >
            <GlyphBack className="size-[19px]" />
          </motion.button>

          <motion.h1
            initial={false}
            animate={{ opacity: stuck ? 1 : 0, y: stuck ? 0 : 4 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 truncate text-center text-[15px] font-semibold tracking-tight"
          >
            {title}
          </motion.h1>

          <span aria-hidden className="size-11 shrink-0" />
        </div>

        <motion.span
          aria-hidden
          initial={false}
          animate={{ opacity: stuck ? 1 : 0 }}
          className="block h-px w-full"
          style={{
            background:
              'linear-gradient(90deg, transparent, color-mix(in oklab, var(--foreground) 12%, transparent) 20%, color-mix(in oklab, var(--foreground) 12%, transparent) 80%, transparent)',
          }}
        />
      </header>
    </>
  )
}

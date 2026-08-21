'use client'

/* Building blocks for the order detail screen.
 *
 * Deliberately NOT a uniform card kit: each surface variant has its own
 * treatment (flat hero / hairline panel / raised deck / dashed ticket) so the
 * page reads as a designed hierarchy rather than a stack of identical boxes. */

import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { GlyphCheck, GlyphCopy } from './icons'
import { copyText } from '@/lib/clipboard'
import { cn } from '@/lib/utils'
import { STATUS_ACCENT_VAR } from '@/lib/order-status'

export type OrderTone =
  | 'neutral'
  | 'live'
  | 'success'
  | 'emerald'
  | 'warning'
  | 'info'
  | 'danger'
  | 'coral'

const DOT: Record<OrderTone, string> = {
  neutral: 'bg-muted-foreground/60',
  live: 'bg-primary',
  success: 'bg-success',
  emerald: 'bg-emerald',
  warning: 'bg-warning',
  info: 'bg-info',
  danger: 'bg-destructive',
  coral: 'bg-coral',
}

const TEXT: Record<OrderTone, string> = {
  neutral: 'text-muted-foreground',
  live: 'text-primary',
  success: 'text-success',
  emerald: 'text-emerald',
  warning: 'text-warning',
  info: 'text-info',
  danger: 'text-destructive',
  coral: 'text-coral',
}

export const EASE = [0.22, 1, 0.36, 1] as const

/* ── Reveal wrapper — the only shared motion, not a shared look ────────── */
export function Reveal({
  as: Tag = 'section',
  delay = 0,
  className,
  children,
}: {
  as?: 'section' | 'div' | 'header'
  delay?: number
  className?: string
  children: ReactNode
}) {
  const reduce = useReducedMotion()
  const M = motion[Tag] as typeof motion.section
  return (
    <M
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: EASE }}
      className={className}
    >
      {children}
    </M>
  )
}

/* ── Section label: tiny caps eyebrow instead of yet another badge ─────── */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/75',
        className,
      )}
    >
      {children}
    </span>
  )
}

/* ── Status: colour + word, no capsule ─────────────────────────────────── */
export function StatusText({
  tone = 'neutral',
  label,
  pulse,
  className,
}: {
  tone?: OrderTone
  label: string
  pulse?: boolean
  className?: string
}) {
  const reduce = useReducedMotion()
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 text-[12.5px] font-semibold tracking-tight',
        TEXT[tone],
        className,
      )}
    >
      <span className="relative flex size-1.5 shrink-0 items-center justify-center">
        {pulse && !reduce ? (
          <motion.span
            aria-hidden
            animate={{ scale: [1, 2.6], opacity: [0.5, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
            className={cn('absolute size-1.5 rounded-full', DOT[tone])}
          />
        ) : null}
        <span className={cn('size-1.5 rounded-full', DOT[tone])} />
      </span>
      {label}
    </span>
  )
}

/* ── Progress: eased fill, travelling sheen, glowing leading edge ──────── */
export function ProgressBar({
  value,
  tone = 'live',
  className,
}: {
  /** 0..1 */
  value: number
  tone?: OrderTone
  className?: string
}) {
  const reduce = useReducedMotion()
  const pct = Math.max(0, Math.min(1, value))
  const c =
    STATUS_ACCENT_VAR[tone] ?? 'var(--primary)'
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct * 100)}
      className={cn('relative h-[7px] w-full overflow-hidden rounded-full', className)}
      style={{ background: 'color-mix(in oklab, var(--foreground) 7%, transparent)' }}
    >
      <motion.div
        initial={reduce ? false : { width: 0 }}
        animate={{ width: `${pct * 100}%` }}
        transition={{ duration: 1.1, ease: EASE, delay: 0.15 }}
        className="relative h-full overflow-hidden rounded-full"
        style={{
          background: `linear-gradient(90deg, color-mix(in oklab, ${c} 45%, transparent) 0%, ${c} 78%, color-mix(in oklab, ${c} 92%, white) 100%)`,
          boxShadow: `0 0 12px -2px color-mix(in oklab, ${c} 70%, transparent), inset 0 1px 0 color-mix(in oklab, white 22%, transparent)`,
        }}
      >
        {!reduce && pct > 0.02 && pct < 1 ? (
          <motion.span
            aria-hidden
            initial={{ x: '-120%' }}
            animate={{ x: '160%' }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.6 }}
            className="absolute inset-y-0 w-1/3"
            style={{
              background:
                'linear-gradient(90deg, transparent, color-mix(in oklab, white 42%, transparent), transparent)',
            }}
          />
        ) : null}
      </motion.div>

      {!reduce && pct > 0.02 && pct < 1 ? (
        <motion.span
          aria-hidden
          initial={{ left: '0%' }}
          animate={{ left: `${pct * 100}%`, opacity: [0.55, 1, 0.55] }}
          transition={{
            left: { duration: 1.1, ease: EASE, delay: 0.15 },
            opacity: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
          }}
          className="pointer-events-none absolute top-1/2 size-[13px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: `radial-gradient(circle, ${c} 0%, transparent 68%)` }}
        />
      ) : null}
    </div>
  )
}

/* ── Number that eases toward its target instead of jumping ────────────── */
export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(reduce ? value : 0)
  const raf = useRef<number | null>(null)
  const shownRef = useRef(shown)
  shownRef.current = shown

  useEffect(() => {
    if (reduce) {
      setShown(value)
      return
    }
    const from = shownRef.current
    const start = performance.now()
    const dur = 1100
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur)
      const eased = 1 - Math.pow(1 - p, 4)
      setShown(Math.round(from + (value - from) * eased))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [value, reduce])

  return <span className={cn('tabular-nums', className)}>{shown.toLocaleString('en-US')}</span>
}

/* ── Copy: bare value + glyph that morphs into a drawn check ───────────── */
export function CopyValue({
  value,
  label,
  onCopied,
  className,
}: {
  value: string
  label?: string
  onCopied?: () => void
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current)
    },
    [],
  )

  return (
    <button
      type="button"
      onClick={() => {
        void copyText(value).then((ok) => {
          if (!ok) return
          setCopied(true)
          onCopied?.()
          if (timer.current) window.clearTimeout(timer.current)
          timer.current = window.setTimeout(() => setCopied(false), 1900)
        })
      }}
      aria-label={label ?? value}
      className={cn(
        'group inline-flex min-h-[32px] items-center gap-2 text-[13.5px] font-medium tracking-tight transition-opacity active:opacity-60',
        className,
      )}
    >
      <span className="font-mono tabular-nums text-foreground">{value}</span>
      <span className="relative flex size-[15px] items-center justify-center">
        <motion.span
          animate={{ opacity: copied ? 0 : 1, scale: copied ? 0.7 : 1 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-0 text-muted-foreground"
        >
          <GlyphCopy className="size-[15px]" />
        </motion.span>
        <motion.span
          initial={false}
          animate={{ opacity: copied ? 1 : 0, scale: copied ? 1 : 0.6 }}
          transition={{ type: 'spring', stiffness: 520, damping: 26 }}
          className="absolute inset-0 text-success"
        >
          <motion.svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-[15px]"
          >
            <motion.path
              d="m5 12.5 4.6 4.5L19 7"
              initial={false}
              animate={{ pathLength: copied ? 1 : 0 }}
              transition={{ duration: 0.32, ease: EASE }}
            />
          </motion.svg>
        </motion.span>
      </span>
    </button>
  )
}

/* Keep the drawn-check glyph reachable for other states. */
export { GlyphCheck }

/* ── Skeleton ──────────────────────────────────────────────────────────── */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-foreground/[0.06]', className)} />
}

/* ── Indeterminate progress: no numbers, one smooth travelling gold sheen ─── */
export function IndeterminateBar({
  className,
  tone = 'live',
}: {
  className?: string
  tone?: OrderTone
}) {
  const c =
    STATUS_ACCENT_VAR[tone] ?? 'var(--primary)'
  return (
    <div
      role="progressbar"
      aria-valuetext="in progress"
      className={cn('relative h-[9px] w-full overflow-hidden rounded-full', className)}
      style={{ background: 'color-mix(in oklab, var(--foreground) 7%, transparent)' }}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{ background: `color-mix(in oklab, ${c} 10%, transparent)` }}
      />
      <span
        aria-hidden
        className="animate-gold-sweep absolute inset-y-0 left-0 w-[45%] rounded-full"
        style={{
          background: `linear-gradient(90deg, transparent, color-mix(in oklab, ${c} 35%, transparent) 25%, ${c} 50%, color-mix(in oklab, ${c} 35%, transparent) 75%, transparent)`,
          boxShadow: `0 0 18px -2px color-mix(in oklab, ${c} 60%, transparent)`,
        }}
      />
    </div>
  )
}


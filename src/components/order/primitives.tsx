'use client'

/* Reusable building blocks for the order detail screen. */

import { motion, useReducedMotion } from 'framer-motion'
import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { copyText } from '@/lib/clipboard'
import { cn } from '@/lib/utils'

export type OrderTone = 'neutral' | 'live' | 'success' | 'warning' | 'danger'

const TONE: Record<OrderTone, { text: string; bg: string; ring: string; dot: string }> = {
  neutral: {
    text: 'text-muted-foreground',
    bg: 'bg-foreground/[0.05]',
    ring: 'ring-foreground/[0.08]',
    dot: 'bg-muted-foreground/70',
  },
  live: {
    text: 'text-primary',
    bg: 'bg-primary/10',
    ring: 'ring-primary/20',
    dot: 'bg-primary',
  },
  success: {
    text: 'text-success',
    bg: 'bg-success/10',
    ring: 'ring-success/20',
    dot: 'bg-success',
  },
  warning: {
    text: 'text-warning',
    bg: 'bg-warning/10',
    ring: 'ring-warning/20',
    dot: 'bg-warning',
  },
  danger: {
    text: 'text-destructive',
    bg: 'bg-destructive/10',
    ring: 'ring-destructive/20',
    dot: 'bg-destructive',
  },
}

/* ── Card shell: one radius, one border, one shadow across the screen ──── */
export function OrderCard({
  className,
  delay = 0,
  children,
}: {
  className?: string
  delay?: number
  children: ReactNode
}) {
  const reduce = useReducedMotion()
  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'rounded-[20px] border border-white/[0.07] bg-card/90 shadow-[0_18px_40px_-32px_rgba(0,0,0,0.9)]',
        className,
      )}
    >
      {children}
    </motion.section>
  )
}

/* ── Status badge: colour + icon/text, never colour alone ──────────────── */
export function StatusBadge({
  tone = 'neutral',
  label,
  icon,
  pulse,
  className,
}: {
  tone?: OrderTone
  label: string
  icon?: ReactNode
  pulse?: boolean
  className?: string
}) {
  const reduce = useReducedMotion()
  const t = TONE[tone]
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold leading-none ring-1 ring-inset',
        t.bg,
        t.ring,
        t.text,
        className,
      )}
    >
      {icon ?? (
        <motion.span
          aria-hidden
          animate={pulse && !reduce ? { opacity: [1, 0.25, 1] } : {}}
          transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
          className={cn('size-1.5 rounded-full', t.dot)}
        />
      )}
      {label}
    </span>
  )
}

/* ── Progress bar: animated fill, soft edge glow ───────────────────────── */
export function ProgressBar({
  value,
  tone = 'live',
  className,
}: {
  /** 0..1 */
  value: number
  tone?: 'live' | 'success'
  className?: string
}) {
  const reduce = useReducedMotion()
  const pct = Math.max(0, Math.min(1, value))
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct * 100)}
      className={cn('relative h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]', className)}
    >
      <motion.div
        initial={reduce ? false : { width: 0 }}
        animate={{ width: `${pct * 100}%` }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        className={cn(
          'relative h-full rounded-full',
          tone === 'success'
            ? 'bg-linear-to-r from-success/70 to-success'
            : 'bg-linear-to-r from-primary/65 to-primary',
        )}
        style={{
          boxShadow:
            tone === 'success'
              ? '0 0 14px -3px color-mix(in oklab, var(--success) 75%, transparent)'
              : '0 0 14px -3px color-mix(in oklab, var(--primary) 75%, transparent)',
        }}
      />
    </div>
  )
}

/* ── Number that eases toward its target instead of jumping ────────────── */
export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(reduce ? value : 0)
  const raf = useRef<number | null>(null)

  useEffect(() => {
    if (reduce) {
      setShown(value)
      return
    }
    const from = shown
    const start = performance.now()
    const dur = 800
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setShown(Math.round(from + (value - from) * eased))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduce])

  return <span className={cn('tabular-nums', className)}>{shown.toLocaleString('en-US')}</span>
}

/* ── Copy order number ─────────────────────────────────────────────────── */
export function CopyOrderButton({
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
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        void copyText(value).then((ok) => {
          if (!ok) return
          setCopied(true)
          onCopied?.()
          if (timer.current) window.clearTimeout(timer.current)
          timer.current = window.setTimeout(() => setCopied(false), 1800)
        })
      }}
      aria-label={label ?? value}
      className={cn(
        'inline-flex min-h-[36px] items-center gap-2 rounded-xl bg-white/[0.05] px-2.5 py-1.5 ring-1 ring-inset ring-white/[0.07] transition-colors hover:bg-white/[0.08]',
        className,
      )}
    >
      <span className="tabular-nums text-[13px] font-semibold tracking-tight text-foreground">
        <span className="text-muted-foreground">#</span>
        {value}
      </span>
      {copied ? (
        <Check className="size-3.5 text-success" strokeWidth={2.6} />
      ) : (
        <Copy className="size-3.5 text-muted-foreground" strokeWidth={2.2} />
      )}
    </motion.button>
  )
}

/* ── Skeleton ──────────────────────────────────────────────────────────── */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-white/[0.06]', className)} />
}

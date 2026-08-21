'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { EASE } from './primitives'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export type TimelineStep = {
  label: string
  meta?: string
  state: 'done' | 'live' | 'idle' | 'danger'
  /** Цвет активной точки: gold по умолчанию, green для refill, blue для возврата. */
  tone?: 'primary' | 'success' | 'info'
  /** Optional icon override for the node. */
  icon?: ReactNode
}

/**
 * Hairline rail with drawn markers — a tick that strokes itself in, a live
 * node that breathes, a hollow marker for what is still ahead, and a red X
 * for cancelled / failed steps.
 */
function liveColor(tone: TimelineStep['tone']) {
  return tone === 'success' ? 'var(--success)' : tone === 'info' ? 'var(--info)' : 'var(--primary)'
}

export function OrderTimeline({ steps }: { steps: TimelineStep[] }) {
  const reduce = useReducedMotion()
  return (
    <ol className="relative flex flex-col gap-3.5">
      {steps.map((s, i) => (
        <li key={s.label} className="relative flex items-center gap-3">
          {i < steps.length - 1 ? (
            <span
              aria-hidden
              className="absolute left-[8px] top-[19px] w-px"
              style={{
                height: 'calc(100% - 6px)',
                background:
                  s.state === 'danger'
                    ? 'linear-gradient(180deg, color-mix(in oklab, var(--destructive) 42%, transparent), color-mix(in oklab, var(--foreground) 8%, transparent))'
                    : s.state === 'done'
                      ? 'linear-gradient(180deg, color-mix(in oklab, var(--success) 42%, transparent), color-mix(in oklab, var(--foreground) 8%, transparent))'
                      : 'color-mix(in oklab, var(--foreground) 8%, transparent)',
              }}
            />
          ) : null}

          <span className="relative z-10 flex size-[17px] shrink-0 items-center justify-center">
            {s.icon ? (
              <span className="text-muted-foreground/70">{s.icon}</span>
            ) : s.state === 'done' ? (
              <motion.svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-[13px] text-success"
              >
                <motion.path
                  d="m5 12.5 4.6 4.5L19 7"
                  initial={reduce ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.45, ease: EASE, delay: 0.25 + i * 0.08 }}
                />
              </motion.svg>
            ) : s.state === 'danger' ? (
              <motion.svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-[13px] text-destructive"
              >
                <motion.path
                  d="M6 6l12 12M18 6L6 18"
                  initial={reduce ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.35, ease: EASE, delay: 0.25 + i * 0.08 }}
                />
              </motion.svg>
            ) : s.state === 'live' ? (
              <>
                {!reduce && (
                  <motion.span
                    aria-hidden
                    animate={{ scale: [1, 2.2], opacity: [0.4, 0] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
                    className="absolute size-[9px] rounded-full"
                    style={{ background: liveColor(s.tone) }}
                  />
                )}
                <span
                  className="relative size-[9px] rounded-full"
                  style={{
                    background: liveColor(s.tone),
                    boxShadow: `0 0 10px -1px color-mix(in oklab, ${liveColor(s.tone)} 80%, transparent)`,
                  }}
                />
              </>
            ) : (
              <span
                className="size-[9px] rounded-full"
                style={{
                  boxShadow: 'inset 0 0 0 1px color-mix(in oklab, var(--foreground) 16%, transparent)',
                }}
              />
            )}
          </span>

          <span
            className={cn(
              'min-w-0 flex-1 truncate text-[13.5px] leading-tight',
              s.state === 'idle'
                ? 'text-muted-foreground/70'
                : s.state === 'live'
                  ? 'font-semibold text-foreground'
                  : s.state === 'danger'
                    ? 'font-semibold text-foreground'
                    : 'font-medium text-foreground/85',
            )}
          >
            {s.label}
          </span>

          {s.meta ? (
            <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground/80">
              {s.meta}
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  )
}

'use client'

import type { ReactNode } from 'react'
import {
  Eyebrow,
  IndeterminateBar,
  ProgressBar,
  Reveal,
  StatusText,
  type OrderTone,
} from './primitives'
import { OrderTimeline, type TimelineStep } from './order-timeline'

/**
 * The one raised surface on the page. Everything else is flat or hairline, so
 * this deck carries the primary information without competing frames.
 *
 * We have no real per-unit delivery data, so nothing here fakes a count or a
 * percentage: a running order shows a headline plus an indeterminate bar.
 */
export function OrderProgressCard({
  title,
  badgeLabel,
  badgeTone,
  headline,
  subtitle,
  note,
  complete,
  cancelled,
  dangerIcon,
  reason,
  steps,
  delay,
  barTone = 'live',
}: {
  title: string
  badgeLabel: string
  badgeTone: OrderTone
  headline: string
  subtitle?: string
  note?: string
  complete?: boolean
  cancelled?: boolean
  dangerIcon?: ReactNode
  reason?: { label: string; text: string }
  steps: TimelineStep[]
  delay?: number
  barTone?: 'live' | 'success' | 'info'
}) {
  return (
    <Reveal delay={delay} className="relative overflow-hidden rounded-[22px] px-5 pb-5 pt-4.5">
      {/* deck surface: cool graphite lift, top light catch, no visible border */}
      <span
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in oklab, var(--foreground) 7.5%, var(--card)) 0%, var(--card) 62%)',
          boxShadow:
            'inset 0 1px 0 color-mix(in oklab, white 9%, transparent), 0 26px 50px -38px rgba(0,0,0,0.95)',
        }}
      />

      <div className="flex items-center justify-between gap-3">
        <Eyebrow>{title}</Eyebrow>
        <StatusText tone={badgeTone} label={badgeLabel} pulse={badgeTone === 'live'} />
      </div>

      <div className="mt-3 flex items-start gap-3.5">
        {dangerIcon ? (
          <span className="relative flex size-12 shrink-0 items-center justify-center rounded-full text-destructive">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                background:
                  'radial-gradient(circle, color-mix(in oklab, var(--destructive) 30%, transparent) 0%, transparent 68%)',
                filter: 'blur(6px)',
              }}
            />
            {dangerIcon}
          </span>
        ) : null}
        <div className={dangerIcon ? 'min-w-0 flex-1' : ''}>
          <p className="font-display text-[22px] font-bold leading-tight tracking-[-0.025em]">
            {headline}
          </p>
          {subtitle ? (
            <p className="mt-1 text-[13.5px] leading-[1.5] text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>

      {!cancelled ? (
        complete ? (
          <ProgressBar value={1} tone="success" className="mt-3.5" />
        ) : (
          <IndeterminateBar tone={barTone} className="mt-3.5" />
        )
      ) : null}

      {note ? (
        <p className="mt-2.5 text-[12.5px] leading-tight text-muted-foreground">{note}</p>
      ) : null}

      {reason ? (
        <div
          className="mt-4 rounded-[16px] px-4 py-3.5"
          style={{
            background: 'color-mix(in oklab, var(--foreground) 4.5%, transparent)',
            boxShadow: 'inset 0 0 0 1px color-mix(in oklab, var(--foreground) 7%, transparent)',
          }}
        >
          <Eyebrow className="text-[10px] tracking-[0.18em]">{reason.label}</Eyebrow>
          <p className="mt-1.5 text-[15px] font-semibold leading-tight text-foreground">
            {reason.text}
          </p>
        </div>
      ) : null}

      <div
        className="mt-4 pt-4"
        style={{ borderTop: '1px solid color-mix(in oklab, var(--foreground) 7%, transparent)' }}
      >
        <OrderTimeline steps={steps} />
      </div>
    </Reveal>
  )
}

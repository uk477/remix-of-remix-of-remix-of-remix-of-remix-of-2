'use client'

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
  note,
  complete,
  steps,
  delay,
}: {
  title: string
  badgeLabel: string
  badgeTone: OrderTone
  headline: string
  note?: string
  complete?: boolean
  steps: TimelineStep[]
  delay?: number
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

      <p className="mt-3 font-display text-[22px] font-bold leading-tight tracking-[-0.025em]">
        {headline}
      </p>

      {complete ? (
        <ProgressBar value={1} tone="success" className="mt-3.5" />
      ) : (
        <IndeterminateBar className="mt-3.5" />
      )}

      {note ? (
        <p className="mt-2.5 text-[12.5px] leading-tight text-muted-foreground">{note}</p>
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

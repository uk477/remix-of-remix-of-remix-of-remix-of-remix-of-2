'use client'

import { AnimatedNumber, Eyebrow, ProgressBar, Reveal, StatusText, type OrderTone } from './primitives'
import { OrderTimeline, type TimelineStep } from './order-timeline'

/**
 * The one raised surface on the page. Everything else is flat or hairline, so
 * this deck carries the primary information without competing frames.
 */
export function OrderProgressCard({
  title,
  badgeLabel,
  badgeTone,
  delivered,
  total,
  percent,
  percentLabel,
  etaLabel,
  steps,
  delay,
}: {
  title: string
  badgeLabel: string
  badgeTone: OrderTone
  delivered: number
  total: number
  /** 0..1 */
  percent: number
  percentLabel: string
  etaLabel?: string
  steps: TimelineStep[]
  delay?: number
}) {
  const complete = percent >= 1
  return (
    <Reveal
      delay={delay}
      className="relative overflow-hidden rounded-[22px] px-5 pb-5 pt-4.5"
    >
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

      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="font-display text-[34px] font-extrabold leading-none tracking-[-0.035em]">
          <AnimatedNumber value={delivered} />
          <span className="text-[20px] font-semibold text-muted-foreground/60">
            {' / '}
            {total.toLocaleString('en-US')}
          </span>
        </p>
        <p className="pb-1 text-[12.5px] font-medium tabular-nums text-muted-foreground">
          {percentLabel}
        </p>
      </div>

      <ProgressBar value={percent} tone={complete ? 'success' : 'live'} className="mt-3.5" />

      {etaLabel ? (
        <p className="mt-2.5 text-[12.5px] leading-tight text-muted-foreground">{etaLabel}</p>
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

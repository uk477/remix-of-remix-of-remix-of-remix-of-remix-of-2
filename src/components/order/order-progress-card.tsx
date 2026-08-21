'use client'

import { AnimatedNumber, OrderCard, ProgressBar, StatusBadge, type OrderTone } from './primitives'
import { OrderTimeline, type TimelineStep } from './order-timeline'

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
  const done = badgeTone === 'success'
  return (
    <OrderCard className="p-4" delay={delay}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        <StatusBadge tone={badgeTone} label={badgeLabel} pulse={badgeTone === 'live'} />
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="font-display text-[26px] font-bold leading-none tracking-tight">
          <AnimatedNumber value={delivered} />
          <span className="text-muted-foreground"> / {total.toLocaleString('en-US')}</span>
        </p>
        <p className="pb-0.5 text-[13px] font-medium text-muted-foreground">{percentLabel}</p>
      </div>

      <ProgressBar value={percent} tone={done ? 'success' : 'live'} className="mt-3" />

      {etaLabel ? <p className="mt-2.5 text-[13px] text-muted-foreground">{etaLabel}</p> : null}

      <div className="mt-4 border-t border-white/[0.06] pt-4">
        <OrderTimeline steps={steps} />
      </div>
    </OrderCard>
  )
}

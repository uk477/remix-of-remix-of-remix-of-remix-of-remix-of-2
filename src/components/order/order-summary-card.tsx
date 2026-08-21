'use client'

import type { ReactNode } from 'react'
import { CopyValue, Eyebrow, Reveal, StatusText, type OrderTone } from './primitives'

/**
 * Hero block — intentionally has no card frame. It sits directly on the page
 * background and is separated by a hairline, so the eye starts here instead of
 * on the first of several identical boxes.
 */
export function OrderSummaryCard({
  mark,
  service,
  amountLabel,
  orderId,
  statusLabel,
  statusTone,
  caption,
  orderLabel,
  onCopied,
}: {
  mark: ReactNode
  service: string
  amountLabel: string
  orderId: string
  statusLabel: string
  statusTone: OrderTone
  caption: string
  orderLabel: string
  onCopied?: () => void
}) {
  return (
    <Reveal className="px-1 pt-1">
      <div className="flex items-start gap-3.5">
        <span
          className="relative flex size-12 shrink-0 items-center justify-center rounded-[15px] text-foreground"
          style={{
            background:
              'linear-gradient(150deg, color-mix(in oklab, var(--foreground) 11%, transparent), color-mix(in oklab, var(--foreground) 3%, transparent))',
            boxShadow:
              'inset 0 1px 0 color-mix(in oklab, white 14%, transparent), inset 0 0 0 1px color-mix(in oklab, white 6%, transparent)',
          }}
        >
          {mark}
        </span>

        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-start gap-3">
            <h2 className="min-w-0 flex-1 font-display text-[20px] font-bold leading-[1.2] tracking-[-0.02em] text-balance">
              {service}
            </h2>
            <span className="shrink-0 pt-1">
              <StatusText tone={statusTone} label={statusLabel} pulse={statusTone === 'live'} />
            </span>
          </div>
          <p className="mt-1.5 text-[14px] leading-tight text-muted-foreground">{amountLabel}</p>
        </div>
      </div>

      <p className="mt-3.5 max-w-[42ch] text-[13.5px] leading-[1.55] text-muted-foreground">
        {caption}
      </p>

      <div
        className="mt-4 flex items-center justify-between gap-3 pt-3.5"
        style={{ borderTop: '1px solid color-mix(in oklab, var(--foreground) 8%, transparent)' }}
      >
        <Eyebrow>{orderLabel}</Eyebrow>
        <CopyValue value={orderId} onCopied={onCopied} />
      </div>
    </Reveal>
  )
}

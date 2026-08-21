'use client'

import type { ReactNode } from 'react'
import { OrderCard, CopyOrderButton, StatusBadge, type OrderTone } from './primitives'

export function OrderSummaryCard({
  mark,
  service,
  amountLabel,
  orderId,
  statusLabel,
  statusTone,
  statusIcon,
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
  statusIcon?: ReactNode
  caption: string
  orderLabel: string
  onCopied?: () => void
}) {
  return (
    <OrderCard className="p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.05] ring-1 ring-inset ring-white/[0.07]">
          {mark}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-bold leading-tight tracking-tight">{service}</p>
          <p className="mt-1 text-[14px] leading-tight text-muted-foreground">{amountLabel}</p>
        </div>

        <StatusBadge
          tone={statusTone}
          label={statusLabel}
          icon={statusIcon}
          pulse={statusTone === 'live'}
        />
      </div>

      <p className="mt-3 text-[13px] leading-[1.5] text-muted-foreground">{caption}</p>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
        <span className="text-[13px] text-muted-foreground">{orderLabel}</span>
        <CopyOrderButton value={orderId} onCopied={onCopied} />
      </div>
    </OrderCard>
  )
}

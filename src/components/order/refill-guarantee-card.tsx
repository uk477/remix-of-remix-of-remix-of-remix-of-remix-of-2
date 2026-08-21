'use client'

import { motion } from 'framer-motion'
import { Check, Lock, RotateCw, ShieldCheck } from 'lucide-react'
import { OrderCard, StatusBadge } from './primitives'
import { cn } from '@/lib/utils'

export type RefillState = 'available' | 'locked' | 'sent' | 'unavailable' | 'loading'

export function RefillGuaranteeCard({
  title,
  countLabel,
  description,
  untilLabel,
  untilValue,
  state,
  buttonLabel,
  onRequest,
  delay,
}: {
  title: string
  countLabel: string
  description: string
  untilLabel: string
  untilValue: string
  state: RefillState
  buttonLabel: string
  onRequest: () => void
  delay?: number
}) {
  const enabled = state === 'available'
  const Icon = state === 'sent' ? Check : enabled || state === 'loading' ? RotateCw : Lock

  return (
    <OrderCard className="p-4" delay={delay}>
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-success/10 ring-1 ring-inset ring-success/20">
          <ShieldCheck className="size-[18px] text-success" strokeWidth={2.2} />
        </span>
        <h2 className="flex-1 text-[15px] font-semibold tracking-tight">{title}</h2>
        <StatusBadge
          tone={state === 'unavailable' ? 'neutral' : 'success'}
          label={countLabel}
          icon={<span aria-hidden className="size-1.5 rounded-full bg-current opacity-70" />}
        />
      </div>

      <p className="mt-3 text-[13px] leading-[1.5] text-muted-foreground">{description}</p>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] px-3 py-2.5">
        <span className="text-[13px] text-muted-foreground">{untilLabel}</span>
        <span className="tabular-nums text-[13px] font-semibold">{untilValue}</span>
      </div>

      <motion.button
        type="button"
        disabled={!enabled}
        whileTap={enabled ? { scale: 0.98 } : undefined}
        onClick={() => enabled && onRequest()}
        className={cn(
          'mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold tracking-tight transition-colors',
          enabled
            ? 'bg-primary text-primary-foreground shadow-[inset_0_1px_0_color-mix(in_oklab,white_28%,transparent),0_14px_30px_-22px_color-mix(in_oklab,var(--primary)_90%,transparent)]'
            : state === 'sent'
              ? 'bg-success/12 text-success ring-1 ring-inset ring-success/25'
              : 'bg-white/[0.04] text-muted-foreground ring-1 ring-inset ring-white/[0.07]',
        )}
      >
        <Icon
          className={cn('size-[18px] shrink-0', state === 'loading' && 'animate-spin')}
          strokeWidth={2.2}
        />
        {buttonLabel}
      </motion.button>
    </OrderCard>
  )
}

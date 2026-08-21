'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Eyebrow, Reveal } from './primitives'
import { GlyphCheck, GlyphLock, GlyphRefill, GlyphShield } from './icons'
import { cn } from '@/lib/utils'

export type RefillState = 'available' | 'locked' | 'sent' | 'unavailable' | 'loading'

/**
 * Warranty ticket: no card frame, a perforated hairline instead, so it reads
 * as a document attached to the order rather than another content block.
 */
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
  const reduce = useReducedMotion()
  const enabled = state === 'available'
  const Icon = state === 'sent' ? GlyphCheck : enabled || state === 'loading' ? GlyphRefill : GlyphLock

  return (
    <Reveal delay={delay} className="px-1">
      <span
        aria-hidden
        className="mb-4 block h-px w-full"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, color-mix(in oklab, var(--foreground) 16%, transparent) 0 5px, transparent 5px 11px)',
        }}
      />

      <div className="flex items-center gap-2.5">
        <GlyphShield className="size-[17px] shrink-0 text-success" />
        <h3 className="flex-1 text-[14.5px] font-semibold tracking-tight">{title}</h3>
        <Eyebrow className="tabular-nums">{countLabel}</Eyebrow>
      </div>

      <p className="mt-2.5 max-w-[44ch] text-[13px] leading-[1.55] text-muted-foreground">
        {description}
      </p>

      <div className="mt-3 flex items-baseline justify-between gap-3">
        <span className="text-[12.5px] text-muted-foreground/80">{untilLabel}</span>
        <span className="text-[12.5px] font-semibold tabular-nums text-foreground/90">
          {untilValue}
        </span>
      </div>

      <motion.button
        type="button"
        disabled={!enabled}
        whileTap={enabled ? { scale: 0.985 } : undefined}
        whileHover={enabled && !reduce ? { y: -1 } : undefined}
        transition={{ type: 'spring', stiffness: 520, damping: 30 }}
        onClick={() => enabled && onRequest()}
        className={cn(
          'group mt-4 flex h-[46px] w-full items-center justify-center gap-2 rounded-[13px] text-[14.5px] font-semibold tracking-tight transition-colors',
          enabled
            ? 'text-primary-foreground'
            : state === 'sent'
              ? 'text-success'
              : 'text-muted-foreground/80',
        )}
        style={
          enabled
            ? {
                background:
                  'linear-gradient(180deg, color-mix(in oklab, var(--primary) 96%, white) 0%, var(--primary) 100%)',
                boxShadow:
                  'inset 0 1px 0 color-mix(in oklab, white 40%, transparent), 0 12px 26px -20px color-mix(in oklab, var(--primary) 90%, transparent)',
              }
            : {
                background: 'color-mix(in oklab, var(--foreground) 4%, transparent)',
                boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${
                  state === 'sent' ? 'var(--success) 26%' : 'var(--foreground) 8%'
                }, transparent)`,
              }
        }
      >
        <motion.span
          animate={state === 'loading' && !reduce ? { rotate: 360 } : { rotate: 0 }}
          transition={
            state === 'loading'
              ? { duration: 1.05, repeat: Infinity, ease: 'linear' }
              : { duration: 0.2 }
          }
          className="flex size-[17px] shrink-0 items-center justify-center"
        >
          <Icon className="size-[17px]" />
        </motion.span>
        {buttonLabel}
      </motion.button>
    </Reveal>
  )
}

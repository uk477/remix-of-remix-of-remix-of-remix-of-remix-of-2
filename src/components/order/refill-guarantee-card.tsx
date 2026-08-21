'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Reveal } from './primitives'
import { cn } from '@/lib/utils'

export type RefillState = 'available' | 'locked' | 'sent' | 'unavailable' | 'loading'

/* ── Refill shield: contour draws itself in on mount ──────────────────── */
function RefillMark({ reduce }: { reduce: boolean }) {
  return (
    <svg viewBox="0 0 40 44" className="size-[26px] shrink-0 text-success" fill="none">
      <motion.path
        d="M20 3 34 8v13.5C34 31 28.4 37.4 20 41 11.6 37.4 6 31 6 21.5V8Z"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0, opacity: 0.2 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.g
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <path d="M13 24a7.5 7.5 0 0 0 13 4.6" />
        <path d="M27 15.4A7.5 7.5 0 0 0 14 20" />
        <path d="M13.4 15.6 14 20l4.4-.6" />
        <path d="M26.6 28.4 26 24l-4.4.6" />
      </motion.g>
    </svg>
  )
}

/* ── Slot stepper ─────────────────────────────────────────────────────── */
function SlotRail({
  total,
  left,
  reduce,
}: {
  total: number
  left: number
  reduce: boolean
}) {
  return (
    <div className="mt-5 flex items-center">
      {Array.from({ length: total }).map((_, i) => {
        const active = i < left
        const segmentActive = i > 0 && i < left
        return (
          <div key={i} className={cn('flex items-center', i > 0 && 'flex-1')}>
            {i > 0 ? (
              <div className="relative h-px flex-1 overflow-hidden">
                <div
                  className="absolute inset-0"
                  style={{
                    background: segmentActive
                      ? 'color-mix(in oklab, var(--success) 70%, transparent)'
                      : 'color-mix(in oklab, var(--foreground) 12%, transparent)',
                  }}
                />
                {segmentActive && !reduce ? (
                  <motion.div
                    className="absolute inset-y-0 w-10"
                    style={{
                      background:
                        'linear-gradient(90deg, transparent, color-mix(in oklab, var(--success) 95%, white 20%), transparent)',
                    }}
                    animate={{ x: ['-40px', '100%'] }}
                    transition={{
                      duration: 1.4,
                      repeat: Infinity,
                      repeatDelay: 2.4,
                      ease: 'easeInOut',
                    }}
                  />
                ) : null}
              </div>
            ) : null}

            <motion.div
              layout
              className="relative flex size-9 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums"
              animate={
                active
                  ? {
                      color: 'var(--success)',
                      boxShadow: reduce
                        ? 'inset 0 0 0 1.5px color-mix(in oklab, var(--success) 85%, transparent)'
                        : [
                            'inset 0 0 0 1.5px color-mix(in oklab, var(--success) 85%, transparent), 0 0 0px color-mix(in oklab, var(--success) 0%, transparent)',
                            'inset 0 0 0 1.5px color-mix(in oklab, var(--success) 85%, transparent), 0 0 14px color-mix(in oklab, var(--success) 34%, transparent)',
                            'inset 0 0 0 1.5px color-mix(in oklab, var(--success) 85%, transparent), 0 0 0px color-mix(in oklab, var(--success) 0%, transparent)',
                          ],
                    }
                  : {
                      color: 'color-mix(in oklab, var(--foreground) 45%, transparent)',
                      boxShadow:
                        'inset 0 0 0 1px color-mix(in oklab, var(--foreground) 14%, transparent), 0 0 0px transparent',
                    }
              }
              transition={
                active && !reduce
                  ? { boxShadow: { duration: 3.4, repeat: Infinity, ease: 'easeInOut' }, color: { duration: 0.5 } }
                  : { duration: 0.5, ease: 'easeOut' }
              }
            >
              {i + 1}
            </motion.div>
          </div>
        )
      })}
    </div>
  )
}

export function RefillGuaranteeCard({
  title,
  countLabel,
  description,
  untilValue,
  state,
  buttonLabel,
  onRequest,
  delay,
  used = 0,
  total = 4,
  availableLabel,
}: {
  title: string
  countLabel: string
  description: string
  untilLabel?: string
  untilValue: string
  state: RefillState
  buttonLabel: string
  onRequest: () => void
  delay?: number
  used?: number
  total?: number
  availableLabel?: string
}) {
  const reduce = Boolean(useReducedMotion())
  const enabled = state === 'available'
  const left = Math.max(0, total - used)
  const [sweep, setSweep] = useState(0)

  useEffect(() => {
    if (state === 'sent') setSweep((s) => s + 1)
  }, [state])

  return (
    <Reveal delay={delay} className="px-1">
      <span
        aria-hidden
        className="mb-5 block h-px w-full"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, color-mix(in oklab, var(--foreground) 16%, transparent) 0 5px, transparent 5px 11px)',
        }}
      />

      <div className="flex items-center gap-3">
        <RefillMark reduce={reduce} />
        <h3 className="flex-1 text-[17px] font-bold tracking-tight">{title}</h3>
        <motion.span
          layout
          className="px-3 py-1.5 text-[12.5px] font-medium tabular-nums text-success"
          style={{
            clipPath: 'polygon(0 0, calc(100% - 9px) 0, 100% 9px, 100% 100%, 9px 100%, 0 calc(100% - 9px))',
            boxShadow: 'inset 0 0 0 1px color-mix(in oklab, var(--success) 28%, transparent)',
            background: 'color-mix(in oklab, var(--success) 6%, transparent)',
          }}
        >
          {availableLabel ?? countLabel}
        </motion.span>
      </div>

      <SlotRail total={total} left={left} reduce={reduce} />

      <div className="mt-4 flex items-baseline justify-between gap-3">
        <span className="text-[13px] tabular-nums text-muted-foreground">{countLabel}</span>
        <span className="text-[13px] text-muted-foreground">{untilValue}</span>
      </div>

      <p className="mt-2 text-[13px] leading-[1.55] text-muted-foreground">{description}</p>

      <div className="mt-4 flex items-stretch gap-2">
        <motion.button
          type="button"
          disabled={!enabled}
          onClick={() => {
            if (!enabled) return
            setSweep((s) => s + 1)
            onRequest()
          }}
          whileTap={enabled ? { scale: 0.98 } : undefined}
          transition={{ type: 'spring', stiffness: 520, damping: 32 }}
          className={cn(
            'relative flex h-[52px] flex-1 items-center overflow-hidden rounded-[14px] px-4 text-[14.5px] font-semibold tracking-tight',
            enabled ? 'text-foreground' : state === 'sent' ? 'text-success' : 'text-muted-foreground/75',
          )}
          style={{
            background: 'color-mix(in oklab, var(--foreground) 3%, transparent)',
            boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${
              state === 'sent' ? 'var(--success) 26%' : 'var(--foreground) 10%'
            }, transparent)`,
          }}
        >
          {/* press / success sweep */}
          {!reduce ? (
            <motion.span
              key={sweep}
              aria-hidden
              className="pointer-events-none absolute inset-y-0 w-28"
              initial={{ x: '-120%', opacity: sweep === 0 ? 0 : 1 }}
              animate={{ x: '420%', opacity: 0 }}
              transition={{ duration: 0.75, ease: 'easeOut' }}
              style={{
                background:
                  'linear-gradient(90deg, transparent, color-mix(in oklab, var(--success) 26%, transparent), transparent)',
              }}
            />
          ) : null}

          {/* chevrons drifting toward the action block */}
          <span className="mr-3 flex shrink-0 items-center gap-1.5">
            <span className="size-[7px] rounded-full bg-success" />
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.span
                key={i}
                className="text-success"
                animate={
                  reduce || !enabled
                    ? { opacity: 0.45 }
                    : { opacity: [0.18, 0.85, 0.18], x: [0, 2, 0] }
                }
                transition={
                  reduce || !enabled
                    ? { duration: 0.3 }
                    : { duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.14 }
                }
              >
                <svg viewBox="0 0 8 12" className="h-[11px] w-[6px]" fill="none">
                  <path d="m1.5 1 5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.span>
            ))}
          </span>

          <span className="relative flex flex-1 items-center justify-center gap-2">
            <AnimatePresence mode="wait" initial={false}>
              {state === 'loading' ? (
                <motion.span
                  key="loading"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2"
                >
                  <motion.span
                    className="block size-[15px] rounded-full border-[1.8px] border-success/30 border-t-success"
                    animate={reduce ? undefined : { rotate: 360 }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                  />
                  {buttonLabel}
                </motion.span>
              ) : state === 'sent' ? (
                <motion.span
                  key="sent"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.22 }}
                  className="flex items-center gap-2 text-success"
                >
                  <svg viewBox="0 0 20 20" className="size-[16px]" fill="none">
                    <motion.path
                      d="m4.5 10.4 3.6 3.6 7.4-7.8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={reduce ? false : { pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                    />
                  </svg>
                  {buttonLabel}
                </motion.span>
              ) : (
                <motion.span
                  key="idle"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.22 }}
                >
                  {buttonLabel}
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        </motion.button>

        <motion.button
          type="button"
          aria-label={buttonLabel}
          disabled={!enabled}
          onClick={() => {
            if (!enabled) return
            setSweep((s) => s + 1)
            onRequest()
          }}
          whileTap={enabled ? { scale: 0.98 } : undefined}
          whileHover={enabled && !reduce ? { y: -1 } : undefined}
          transition={{ type: 'spring', stiffness: 520, damping: 32 }}
          className={cn(
            'flex h-[52px] w-[58px] shrink-0 items-center justify-center',
            enabled ? 'text-black' : 'text-muted-foreground/60',
          )}
          style={{
            clipPath: 'polygon(0 0, calc(100% - 11px) 0, 100% 11px, 100% 100%, 11px 100%, 0 calc(100% - 11px))',
            background: enabled
              ? 'linear-gradient(180deg, color-mix(in oklab, var(--success) 90%, white 10%), var(--success))'
              : 'color-mix(in oklab, var(--foreground) 6%, transparent)',
            boxShadow: enabled
              ? 'inset 0 1px 0 color-mix(in oklab, white 30%, transparent), 0 10px 26px -18px color-mix(in oklab, var(--success) 90%, transparent)'
              : 'inset 0 0 0 1px color-mix(in oklab, var(--foreground) 10%, transparent)',
          }}
        >
          <motion.svg
            viewBox="0 0 24 24"
            className="size-[20px]"
            fill="none"
            animate={reduce || !enabled ? undefined : { x: [0, 2.5, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <path d="M4 12h15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="m13 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        </motion.button>
      </div>
    </Reveal>
  )
}

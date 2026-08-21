'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Reveal } from './primitives'
import { cn } from '@/lib/utils'

/**
 * Единая state machine рефилла.
 *  pending  — заказ ещё не завершён, окно гарантии не стартовало
 *  available— есть 1..N доступных рефиллов, действие разрешено
 *  loading  — запрос отправляется, повторное нажатие заблокировано
 *  sent     — запрос принят (success)
 *  exhausted— все рефиллы использованы
 *  expired  — срок гарантии истёк
 *  error    — запрос не прошёл, можно повторить
 */
export type RefillState =
  | 'loading'
  | 'not_completed'
  | 'submitting'
  | 'accepted'
  | 'cooldown'
  | 'available'
  | 'limit_exhausted'
  | 'guarantee_expired'
  | 'error'

type Tone = 'success' | 'muted' | 'danger'

function toneOf(state: RefillState): Tone {
  if (state === 'available' || state === 'submitting' || state === 'accepted') return 'success'
  if (state === 'error') return 'danger'
  return 'muted'
}

const TONE_VAR: Record<Tone, string> = {
  success: 'var(--success)',
  muted: 'var(--foreground)',
  danger: 'var(--destructive)',
}

/* ── Refill shield: contour draws itself in on mount ──────────────────── */
function RefillMark({ reduce }: { reduce: boolean }) {
  return (
    <svg viewBox="0 0 40 44" className="size-[26px] shrink-0 text-success" fill="none" aria-hidden>
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
  live,
}: {
  total: number
  left: number
  reduce: boolean
  /** idle-анимации разрешены только когда действие реально доступно */
  live: boolean
}) {
  return (
    <div className="mt-5 flex items-center">
      {Array.from({ length: total }).map((_, i) => {
        const active = i < left
        const segmentActive = i > 0 && i < left
        const pulse = live && !reduce
        return (
          <div key={i} className={cn('flex min-w-0 items-center', i > 0 && 'flex-1')}>
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
                {segmentActive && pulse ? (
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
              className="relative flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums"
              animate={
                active
                  ? {
                      color: 'var(--success)',
                      boxShadow: !pulse
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
                active && pulse
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
  statusValue,
  state,
  buttonLabel,
  onRequest,
  delay,
  used = 0,
  total = 4,
  badgeLabel,
}: {
  title: string
  countLabel: string
  description: string
  /** Правая строка под слотами: срок гарантии или фактический статус. */
  statusValue: string
  state: RefillState
  buttonLabel: string
  onRequest: () => void
  delay?: number
  used?: number
  total?: number
  badgeLabel?: string
}) {
  const reduce = Boolean(useReducedMotion())
  const tone = toneOf(state)
  const interactive = state === 'available' || state === 'error'
  const live = state === 'available'
  const left = Math.max(0, total - used)
  const [sweep, setSweep] = useState(0)

  useEffect(() => {
    if (state === 'accepted') setSweep((s) => s + 1)
  }, [state])

  const accent = TONE_VAR[tone]

  function press() {
    if (!interactive) return
    setSweep((s) => s + 1)
    onRequest()
  }

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
        <h3 className="min-w-0 flex-1 text-[17px] font-bold tracking-tight">{title}</h3>
        {badgeLabel ? (
          <motion.span
            layout
            className="shrink-0 px-3 py-1.5 text-[12.5px] font-medium tabular-nums"
            style={{
              clipPath: 'polygon(0 0, calc(100% - 9px) 0, 100% 9px, 100% 100%, 9px 100%, 0 calc(100% - 9px))',
              color:
                tone === 'muted'
                  ? 'color-mix(in oklab, var(--foreground) 55%, transparent)'
                  : accent,
              boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${accent} ${tone === 'muted' ? '16%' : '28%'}, transparent)`,
              background: `color-mix(in oklab, ${accent} ${tone === 'muted' ? '4%' : '6%'}, transparent)`,
            }}
          >
            {badgeLabel}
          </motion.span>
        ) : null}
      </div>

      <SlotRail total={total} left={left} reduce={reduce} live={live} />

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-[13px] tabular-nums text-muted-foreground">{countLabel}</span>
        <span
          className="text-[13px] text-muted-foreground"
          style={tone === 'danger' ? { color: 'var(--destructive)' } : undefined}
        >
          {statusValue}
        </span>
      </div>

      <p className="mt-2 text-[13px] leading-[1.55] text-muted-foreground">{description}</p>

      <motion.button
        type="button"
        disabled={!interactive}
        aria-busy={state === 'submitting'}
        onClick={press}
        whileTap={interactive ? { scale: 0.98 } : undefined}
        whileHover={interactive && !reduce ? { y: -1 } : undefined}
        transition={{ type: 'spring', stiffness: 520, damping: 32 }}
        className={cn(
          'relative mt-4 flex h-[52px] w-full items-center overflow-hidden rounded-[14px] px-4 text-[14.5px] font-semibold tracking-tight',
          state === 'cooldown' && 'tabular-nums',
          interactive
            ? 'cursor-pointer text-foreground'
            : 'cursor-not-allowed text-muted-foreground/75',
          state === 'accepted' && 'text-success',
          state === 'error' && 'text-destructive',
        )}
        style={{
          background: 'color-mix(in oklab, var(--foreground) 3%, transparent)',
          boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${
            state === 'accepted' || state === 'error' ? accent : 'var(--foreground)'
          } ${state === 'accepted' || state === 'error' ? '26%' : '10%'}, transparent)`,
        }}
      >
        {/* press / success sweep — только для активных состояний */}
        {!reduce && tone !== 'muted' ? (
          <motion.span
            key={sweep}
            aria-hidden
            className="pointer-events-none absolute inset-y-0 w-28"
            initial={{ x: '-120%', opacity: sweep === 0 ? 0 : 1 }}
            animate={{ x: '420%', opacity: 0 }}
            transition={{ duration: 0.75, ease: 'easeOut' }}
            style={{
              background: `linear-gradient(90deg, transparent, color-mix(in oklab, ${accent} 26%, transparent), transparent)`,
            }}
          />
        ) : null}

        {/* idle chevrons — только когда действие доступно */}
        {live ? (
          <span className="mr-3 flex shrink-0 items-center gap-1.5">
            <span className="size-[7px] rounded-full bg-success" />
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.span
                key={i}
                className="text-success"
                animate={reduce ? { opacity: 0.45 } : { opacity: [0.18, 0.85, 0.18], x: [0, 2, 0] }}
                transition={
                  reduce
                    ? { duration: 0.3 }
                    : { duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.14 }
                }
              >
                <svg viewBox="0 0 8 12" className="h-[11px] w-[6px]" fill="none">
                  <path
                    d="m1.5 1 5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.span>
            ))}
          </span>
        ) : null}

        <span className="relative flex min-w-0 flex-1 items-center justify-center gap-2">
          <motion.span
            key={state}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="flex min-w-0 items-center gap-2"
          >
            {state === 'submitting' ? (
              <motion.span
                className="block size-[15px] shrink-0 rounded-full border-[1.8px] border-success/30 border-t-success"
                animate={reduce ? undefined : { rotate: 360 }}
                transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
              />
            ) : null}
            {state === 'accepted' ? (
              <svg viewBox="0 0 20 20" className="size-[16px] shrink-0" fill="none">
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
            ) : null}
            <span className="truncate">{buttonLabel}</span>
          </motion.span>
        </span>


        {/* правый арроу-блок появляется только когда есть действие */}
        {live ? (
          <motion.span
            aria-hidden
            className="ml-3 flex h-[38px] w-[46px] shrink-0 items-center justify-center text-black"
            style={{
              clipPath: 'polygon(0 0, calc(100% - 9px) 0, 100% 9px, 100% 100%, 9px 100%, 0 calc(100% - 9px))',
              background:
                'linear-gradient(180deg, color-mix(in oklab, var(--success) 90%, white 10%), var(--success))',
              boxShadow:
                'inset 0 1px 0 color-mix(in oklab, white 30%, transparent), 0 10px 26px -18px color-mix(in oklab, var(--success) 90%, transparent)',
            }}
          >
            <motion.svg
              viewBox="0 0 24 24"
              className="size-[18px]"
              fill="none"
              animate={reduce ? undefined : { x: [0, 2.5, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <path d="M4 12h15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path
                d="m13 6 6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          </motion.span>
        ) : null}
      </motion.button>
    </Reveal>
  )
}

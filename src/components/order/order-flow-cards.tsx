'use client'

/**
 * Два отдельных состояния карточки заказа:
 *  • RecoveryStatusCard — «Восстановление» (идёт рефилл), зелёная схема;
 *  • RefundStatusCard   — «Возврат средств», голубая схема.
 *
 * Правила:
 *  • ни один из блоков не показывает процент / срок — реальных данных нет;
 *  • фаза приходит снаружи (из статуса заказа с бэкенда), поэтому после
 *    перезагрузки рисуется актуальный этап, а не старт процесса заново;
 *  • анимации только CSS-трансформы (60 FPS) и полностью выключаются
 *    при prefers-reduced-motion.
 */

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Eyebrow, Reveal, StatusText } from './primitives'
import { OrderTimeline, type TimelineStep } from './order-timeline'

export type FlowPhase = 'active' | 'success' | 'error'

const TRACK_DOTS = 11

function CardShell({
  title,
  badgeLabel,
  badgeTone,
  headline,
  subtitle,
  visual,
  steps,
  delay,
}: {
  title: string
  badgeLabel: string
  badgeTone: 'live' | 'success' | 'danger'
  headline: string
  subtitle: string
  visual: ReactNode
  steps?: TimelineStep[]
  delay?: number
}) {
  return (
    <Reveal delay={delay} className="relative overflow-hidden rounded-[22px] px-5 pb-5 pt-4.5">
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
        <StatusText tone={badgeTone} label={badgeLabel} pulse={badgeTone !== 'danger'} />
      </div>

      <p className="mt-2.5 font-display text-[22px] font-bold leading-tight tracking-[-0.025em]">
        {headline}
      </p>
      <p className="mt-1 text-[13.5px] leading-[1.5] text-muted-foreground">{subtitle}</p>

      <div className="mt-4">{visual}</div>

      {steps && steps.length > 0 ? (
        <div
          className="mt-4 pt-4"
          style={{ borderTop: '1px solid color-mix(in oklab, var(--foreground) 7%, transparent)' }}
        >
          <OrderTimeline steps={steps} />
        </div>
      ) : null}
    </Reveal>
  )
}

/* ── Восстановление ──────────────────────────────────────────────────── */

function RefillArc({ phase }: { phase: FlowPhase }) {
  const color = phase === 'error' ? 'var(--destructive)' : 'var(--success)'
  return (
    <span className="relative flex size-[42px] shrink-0 items-center justify-center">
      <motion.svg
        viewBox="0 0 44 44"
        className="size-[42px]"
        animate={phase === 'active' ? { rotate: 360 } : { rotate: 0 }}
        transition={
          phase === 'active'
            ? { duration: 1.6, ease: 'linear', repeat: Infinity }
            : { duration: 0.4 }
        }
      >
        <circle cx="22" cy="22" r="16" fill="none" stroke={color} strokeOpacity={0.18} strokeWidth="3" />
        <circle
          cx="22"
          cy="22"
          r="16"
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={phase === 'success' ? '100 0' : '58 100'}
          transform="rotate(-90 22 22)"
          style={{ filter: `drop-shadow(0 0 5px color-mix(in oklab, ${color} 60%, transparent))` }}
        />
      </motion.svg>
      {phase === 'success' ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--success)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute size-[16px]"
        >
          <path d="m5 12.5 4.6 4.5L19 7" />
        </svg>
      ) : null}
    </span>
  )
}

function DotTrack({ phase, color }: { phase: FlowPhase; color: string }) {
  const lit = phase === 'success'
  const active = phase === 'active'
  return (
    <div className="relative h-[14px] flex-1 overflow-hidden">
      <div className="flex h-full items-center justify-between">
        {Array.from({ length: TRACK_DOTS }).map((_, i) => (
          <motion.span
            key={i}
            className="size-[6px] rounded-full"
            style={{ background: color }}
            animate={
              active
                ? {
                    opacity: [0.22, 1, 0.22],
                    scale: [1, 1.35, 1],
                    boxShadow: [
                      '0 0 0px rgba(0,0,0,0)',
                      `0 0 10px color-mix(in oklab, ${color} 75%, transparent)`,
                      '0 0 0px rgba(0,0,0,0)',
                    ],
                  }
                : {
                    opacity: lit ? 1 : 0.22,
                    scale: 1,
                    boxShadow: lit
                      ? `0 0 10px color-mix(in oklab, ${color} 70%, transparent)`
                      : '0 0 0px rgba(0,0,0,0)',
                  }
            }
            transition={
              active
                ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: i * 0.12 }
                : { duration: 0.45, ease: 'easeOut' }
            }
          />
        ))}
      </div>
    </div>
  )
}


export function RecoveryStatusCard({
  phase,
  ru,
  steps,
  delay,
}: {
  phase: FlowPhase
  ru: boolean
  steps: TimelineStep[]
  delay?: number
}) {
  const headline =
    phase === 'success'
      ? ru
        ? 'Показатели восстановлены'
        : 'Metrics restored'
      : phase === 'error'
        ? ru
          ? 'Требует внимания'
          : 'Needs attention'
        : ru
          ? 'Восстанавливаем показатели'
          : 'Restoring metrics'

  const subtitle =
    phase === 'success'
      ? ru
        ? 'Заказ возвращается в статус «Выполнен»'
        : 'The order returns to “Completed”'
      : phase === 'error'
        ? ru
          ? 'Мы разбираемся с рефиллом, поддержка на связи'
          : 'We are looking into the refill, support is available'
        : ru
          ? 'Результат обновится автоматически'
          : 'The result will update automatically'

  return (
    <CardShell
      delay={delay}
      title={ru ? 'Статус заказа' : 'Order status'}
      badgeLabel={
        phase === 'success'
          ? ru
            ? 'Готово'
            : 'Done'
          : phase === 'error'
            ? ru
              ? 'Требует внимания'
              : 'Needs attention'
            : ru
              ? 'Восстановление'
              : 'Recovery'
      }
      badgeTone={phase === 'error' ? 'danger' : 'success'}
      headline={headline}
      subtitle={subtitle}
      visual={
        <div className="flex items-center gap-3.5">
          <RefillArc phase={phase} />
          <DotTrack
            phase={phase}
            color={phase === 'error' ? 'var(--destructive)' : 'var(--success)'}
          />
        </div>
      }
      steps={steps}
    />
  )
}

/* ── Возврат средств ─────────────────────────────────────────────────── */

function NodeCircle({
  children,
  label,
  glow,
}: {
  children: ReactNode
  label: string
  glow?: boolean
}) {
  return (
    <div className="flex w-[62px] shrink-0 flex-col items-center gap-1.5">
      <span
        className={[
          'flex size-[46px] items-center justify-center rounded-full text-muted-foreground',
          glow ? 'animate-flow-wallet text-info' : '',
        ].join(' ')}
        style={{
          background: 'color-mix(in oklab, var(--foreground) 5%, transparent)',
          boxShadow: 'inset 0 0 0 1px color-mix(in oklab, var(--foreground) 9%, transparent)',
        }}
      >
        {children}
      </span>
      <span className="text-[11.5px] text-muted-foreground">{label}</span>
    </div>
  )
}

function ReceiptGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="size-[21px]">
      <path d="M6 3.5h12v15.8l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3V3.5Z" strokeLinejoin="round" />
      <path d="M9 8.5h6M9 12h4" strokeLinecap="round" />
    </svg>
  )
}

function WalletGlyph({ done }: { done?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="size-[21px]">
      <rect x="4" y="6.5" width="16" height="12" rx="3" />
      <path d="M16.5 12.5h1.6" strokeLinecap="round" />
      {done ? (
        <path d="m7 12 2.2 2.2L13.5 10" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M4.5 12.5h4m0 0-1.6-1.7M8.5 12.5 6.9 14.2" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  )
}

export function RefundStatusCard({
  phase,
  ru,
  delay,
}: {
  phase: FlowPhase
  ru: boolean
  delay?: number
}) {
  const done = phase === 'success'
  const color = phase === 'error' ? 'var(--destructive)' : 'var(--info)'

  return (
    <CardShell
      delay={delay}
      title={ru ? 'Статус заказа' : 'Order status'}
      badgeLabel={
        done
          ? ru
            ? 'Возвращено'
            : 'Refunded'
          : phase === 'error'
            ? ru
              ? 'Требует внимания'
              : 'Needs attention'
            : ru
              ? 'Возврат средств'
              : 'Refund'
      }
      badgeTone={phase === 'error' ? 'danger' : 'live'}
      headline={
        done
          ? ru
            ? 'Средства возвращены'
            : 'Funds returned'
          : phase === 'error'
            ? ru
              ? 'Требует внимания'
              : 'Needs attention'
            : ru
              ? 'Возвращаем средства'
              : 'Returning funds'
      }
      subtitle={
        done
          ? ru
            ? 'Баланс уже обновлён'
            : 'Your balance is updated'
          : phase === 'error'
            ? ru
              ? 'Перевод приостановлен, поддержка уже смотрит'
              : 'Transfer paused, support is on it'
            : ru
              ? 'Зачисление произойдёт автоматически'
              : 'The credit will happen automatically'
      }
      visual={
        <div className="flex items-center">
          <NodeCircle label={ru ? 'Заказ' : 'Order'}>
            <ReceiptGlyph />
          </NodeCircle>

          <div className="relative mx-1 h-[46px] flex-1">
            <span
              aria-hidden
              className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2"
              style={{
                background: done
                  ? color
                  : `linear-gradient(90deg, color-mix(in oklab, ${color} 55%, transparent), color-mix(in oklab, ${color} 55%, transparent))`,
                opacity: phase === 'error' ? 0.5 : 0.85,
              }}
            />
            <span
              aria-hidden
              className="absolute left-0 top-1/2 size-[5px] -translate-y-1/2 rounded-full"
              style={{ background: color }}
            />
            <span
              aria-hidden
              className="absolute right-0 top-1/2 size-[5px] -translate-y-1/2 rounded-full"
              style={{ background: color }}
            />
            {phase === 'active' ? (
              <span
                aria-hidden
                className="animate-flow-packet absolute inset-x-0 top-1/2 block h-0"
              >
                <span
                  className="absolute left-0 top-0 block size-[14px] -translate-x-1/2 -translate-y-1/2 rounded-[5px]"
                  style={{
                    background: color,
                    boxShadow: `0 0 18px 2px color-mix(in oklab, ${color} 60%, transparent)`,
                  }}
                />
              </span>
            ) : null}
          </div>

          <NodeCircle label={ru ? 'Баланс' : 'Balance'} glow={phase !== 'error'}>
            <WalletGlyph done={done} />
          </NodeCircle>
        </div>
      }
    />
  )
}

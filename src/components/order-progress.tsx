'use client'

/* ─────────────────────────────────────────────────────────────
 * DESIGN FROZEN (Adeg / выдача аккаунтов)
 * Внешний вид этого экрана зафиксирован по требованию владельца.
 * Не менять разметку, классы, тексты и анимации без явного
 * подтверждения («размораживай дизайн Adeg»).
 * Багфиксы логики — можно, визуал — нет.
 * ───────────────────────────────────────────────────────────── */

import { useEffect, useState } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion'

/** Counts up to `value`, so the percentage feels alive instead of static. */
function Counter({ value }: { value: number }) {
  const mv = useMotionValue(0)
  const rounded = useTransform(mv, (v) => Math.round(v))
  useEffect(() => {
    const controls = animate(mv, value, { duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 })
    return () => controls.stop()
  }, [mv, value])
  return <motion.span>{rounded}</motion.span>
}

import { Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { customLang } from '@/lib/custom-account'
import { updateTestOrder } from '@/lib/demo-orders'
import { dbStatusToOrderStatus } from '@/lib/order-status'
import { useI18n } from '@/lib/i18n'
import type { Order } from '@/lib/types'

type StepState = 'done' | 'active' | 'pending'

type Step = {
  key: string
  title: string
  desc: string
  eta?: string
}

function stepsFor(order: Order, cl: 'ru' | 'en', verified: boolean): Step[] {
  const ru = cl === 'ru'
  const list: Step[] = [
    {
      key: 'paid',
      title: ru ? 'Оплата подтверждена' : 'Payment confirmed',
      desc: ru
        ? 'Средства зачислены, заказ зарегистрирован в системе и защищён гарантией.'
        : 'Funds received, your order is registered and covered by our warranty.',
    },
    {
      key: 'assigned',
      title: ru ? 'Заказ передан персональному менеджеру' : 'Assigned to a dedicated manager',
      desc: ru
        ? 'Специалист принял заказ в работу и подбирает аккаунт под ваши требования.'
        : 'A specialist has picked up your order and is sourcing an account to your spec.',
      eta: ru ? 'обычно 5–30 минут' : 'usually 5–30 minutes',
    },
    {
      key: 'custom',
      title: ru ? 'Кастомизация профиля' : 'Profile customisation',
      desc: ru
        ? 'Ник, юзернейм, аватар, баннер и описание оформляются точно по вашему макету.'
        : 'Name, username, avatar, banner and bio are being set up exactly as you designed.',
      eta: ru ? 'примерно 15 минут' : 'about 15 minutes',
    },
  ]

  if (verified) {
    list.push({
      key: 'verify',
      title: ru ? 'Верификация: проверка на стороне X' : 'Verification: review on X’s side',
      desc: ru
        ? 'Заявка на синюю галочку отправлена. Срок одобрения устанавливает X и он не зависит от нас — мы держим заказ под контролем и сообщим сразу после подтверждения.'
        : 'The verification request has been submitted. Approval timing is set by X and is outside our control — we monitor it and notify you the moment it lands.',
      eta: ru
        ? 'как правило галочка отображается сразу после покупки; если этого не произошло — в течение следующих 24 часов включительно'
        : 'usually the badge appears right after purchase; if not — within the next 24 hours inclusive',
    })
  }

  // Final destination — never entered as a working stage. When the order is
  // ready, the tracker is replaced by the "view account data" button.
  list.push({
    key: 'delivered',
    title: ru ? 'Заказ выполнен и выдан' : 'Order completed & delivered',
    desc: ru
      ? 'Как только работа завершена, здесь появляются данные аккаунта: логин, пароль, почта и 2FA — с экспортом в .txt и .xlsx.'
      : 'Once work is finished, your account details appear here: login, password, mail and 2FA — with .txt and .xlsx export.',
  })

  return list
}


/** Live fulfilment tracker for custom-built ("под ключ") account orders. */
export function OrderProgress({
  order,
  canManage = false,
  detailsOpen = false,
  onToggleDetails,
}: {
  order: Order
  canManage?: boolean
  detailsOpen?: boolean
  onToggleDetails?: () => void
}) {
  const { lang } = useI18n()
  const cl = customLang(lang) as 'ru' | 'en'
  const ru = cl === 'ru'
  const [open, setOpen] = useState(false)
  const verified = order.customAccount?.['profile_verified'] === 'yes'
  const steps = stepsFor(order, cl, verified)
  const [managedStep, setManagedStep] = useState(order.progressStep)
  const userStatus = order.dbStatus ? dbStatusToOrderStatus(order.dbStatus) : order.status

  useEffect(() => {
    setManagedStep(order.progressStep)
  }, [order.progressStep])

  // The final step ("delivered") is a destination, not a working stage — we never
  // enter it; when the order is ready the tracker is swapped for a data button.
  const total = steps.length
  const workMax = total - 1
  let current = 1
  if (userStatus === 'in_progress' || userStatus === 'refilling') current = verified ? 3 : 2
  let done = userStatus === 'completed'
  // An explicit stage set by an admin wins over the status-derived guess.
  if (typeof managedStep === 'number') {
    done = managedStep > workMax
    current = Math.min(Math.max(managedStep, 1), workMax)
  }

  const pct = done ? 100 : Math.round((current / total) * 100)
  const activeStep = steps[current - 1]
  const stepIdx = current

  function changeManagedStep(next: number) {
    const step = Math.min(Math.max(next, 1), total)
    setManagedStep(step)
    updateTestOrder(order.id, {
      progressStep: step,
      status: step > workMax ? 'completed' : 'in_progress',
    })
  }

  const adminControls = canManage ? (
    <div className="border-t border-primary/20 bg-primary/[0.04] px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-primary">Управление этапом</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Тестовый заказ · {done ? 'заказ выдан' : `этап ${current} из ${total}`}
          </p>
        </div>
        <span className="max-w-[52%] truncate text-right text-[11px] font-semibold text-foreground">
          {done ? 'Выполнен и выдан' : steps[current - 1]?.title}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => changeManagedStep(done ? workMax : current - 1)}
          disabled={!done && current <= 1}
          className="pressable flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border-strong bg-card text-[12px] font-bold text-foreground disabled:opacity-30"
        >
          <ChevronLeft className="size-4" /> Назад
        </button>
        <button
          type="button"
          onClick={() => changeManagedStep(current + 1)}
          disabled={done}
          className="pressable flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary text-[12px] font-bold text-primary-foreground disabled:opacity-30"
        >
          Вперёд <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  ) : null

  // Order handed over: the tracker is pointless — surface the account data instead.
  if (done) {
    return (
      <div className="px-4 pt-4 sm:px-0">
        <div className="relative">
          {/* soft amber light leak in the corner */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-primary/10 blur-[52px]"
          />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-2xl border border-border bg-card font-manrope shadow-[0_20px_50px_-30px_rgba(0,0,0,0.9)]"
          >
            {/* asymmetric engraved accent */}
            <motion.span
              aria-hidden
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              className="pointer-events-none absolute left-0 top-0 h-12 w-[2px] origin-top bg-gradient-to-b from-primary to-transparent opacity-60"
            />

            <div className="flex items-center">
              <motion.button
                type="button"
                whileTap={{ scale: 0.985 }}
                transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                onClick={onToggleDetails}
                aria-expanded={detailsOpen}
                aria-controls="order-delivery"
                className="group flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
              >
              <motion.span
                className="relative flex size-8 shrink-0 items-center justify-center"
                initial={{ scale: 0, rotate: -25 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 16, delay: 0.15 }}
              >
                {/* pulsing success halo */}
                <motion.span
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-success"
                  animate={{ scale: [1, 1.55, 1.55], opacity: [0.32, 0, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, delay: 0.6, ease: 'easeOut' }}
                />
                <span className="relative flex size-full items-center justify-center rounded-full bg-success/15 ring-1 ring-success/40">
                  <svg viewBox="0 0 14 11" className="size-3 text-success" fill="none">
                    <motion.path
                      d="M1 5.5 4.667 9.5 13 1"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, ease: [0.65, 0, 0.35, 1], delay: 0.35 }}
                    />
                  </svg>
                </span>
              </motion.span>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  {ru ? 'Заказ выполнен' : 'Order completed'}
                </p>
                <p className="mt-0.5 text-[13px] font-semibold leading-tight text-primary">
                  {detailsOpen
                    ? ru ? 'Скрыть данные аккаунта' : 'Hide account details'
                    : ru ? 'Посмотреть данные от аккаунта' : 'View account details'}
                </p>
              </div>

              <ChevronDown
                className={`size-4 shrink-0 text-primary transition-transform duration-300 ${detailsOpen ? 'rotate-180' : 'group-hover:translate-y-0.5'}`}
                strokeWidth={1.5}
              />
              </motion.button>

              {canManage ? (
                <button
                  type="button"
                  onClick={() => changeManagedStep(workMax)}
                  className="pressable mr-3 flex size-8 shrink-0 items-center justify-center rounded-full border border-border-strong bg-background/60 text-muted-foreground"
                  aria-label="Вернуть на предыдущий этап"
                  title="Вернуть на предыдущий этап"
                >
                  <ChevronLeft className="size-4" />
                </button>
              ) : null}
            </div>

          </motion.div>
        </div>
      </div>
    )
  }



  return (
    <div className="px-4 pt-4 sm:px-0">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden rounded-xl border border-border/60 bg-card font-manrope shadow-[0_14px_36px_-26px_rgba(0,0,0,0.85)]"
      >
        <motion.button
          type="button"
          onClick={() => setOpen((v) => !v)}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 420, damping: 26 }}
          className="group relative block w-full overflow-hidden px-4 pb-2.5 pt-3 text-left"
          aria-expanded={open}
        >
          <motion.span
            className="pointer-events-none absolute -right-10 -top-10 size-24 rounded-full bg-primary/[0.10] blur-2xl"
            animate={{ opacity: [0.35, 1, 0.35], scale: [0.9, 1.15, 0.9] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
          />

          <div className="relative flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="font-heading text-[8.5px] font-bold uppercase leading-none tracking-[0.16em] text-primary">
                {ru ? 'Выполнение заказа' : 'Order progress'}
              </p>
              <AnimatePresence mode="wait" initial={false}>
                <motion.h2
                  key={activeStep?.key ?? 'title'}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-1.5 truncate font-heading text-[15px] font-bold leading-tight text-foreground"
                >
                  {activeStep?.title ?? (ru ? 'Заказ в работе' : 'Order in progress')}

                </motion.h2>
              </AnimatePresence>
            </div>

            <div className="shrink-0 text-right">
              <span className="block text-[8px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {ru ? `Этап ${stepIdx} из ${total}` : `Stage ${stepIdx} of ${total}`}
              </span>
              <div className="mt-0.5 flex items-center justify-end gap-1.5">
                <span className="font-heading text-[17px] font-extrabold leading-none tabular-nums text-primary">
                  <Counter value={pct} />%
                </span>
                <motion.span
                  animate={{ rotate: open ? 180 : 0, y: open ? 0 : [0, 2, 0] }}
                  transition={{
                    rotate: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
                    y: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
                  }}
                  className="inline-flex"
                >
                  <ChevronDown className="size-3.5 text-muted-foreground" strokeWidth={2.4} />
                </motion.span>
              </div>
            </div>
          </div>

          <div className="relative mt-2.5 py-1.5" aria-hidden>
            <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-border">
              <motion.div
                className="relative h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
              >
                <motion.span
                  className="absolute inset-y-0 w-10 bg-gradient-to-r from-transparent via-primary-foreground/70 to-transparent"
                  animate={{ x: ['-40px', '260px'] }}
                  transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 0.9, ease: 'easeInOut' }}
                />
              </motion.div>
              <motion.span
                className="absolute top-1/2 size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_10px_2px] shadow-primary/60"
                initial={{ left: '0%' }}
                animate={{ left: `${pct}%`, scale: [1, 1.35, 1] }}
                transition={{
                  left: { duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 },
                  scale: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' },
                }}
              />
            </div>
            <div className="absolute inset-x-0 top-1.5 flex justify-between px-px">
              {steps.map((s) => (
                <span key={s.key} className="h-1 w-px bg-border" />
              ))}
            </div>
          </div>

          <div className="relative flex items-center justify-between">
            <p className="text-[11px] font-medium text-muted-foreground transition-colors duration-300 group-hover:text-primary">
              {open
                ? ru ? 'Скрыть подробности' : 'Hide details'
                : ru ? 'Посмотреть ход выполнения' : 'View fulfilment details'}
            </p>
            <div className="flex gap-1">
              {steps.map((s, i) => (
                <motion.span
                  key={s.key}
                  className={`size-1 rounded-full ${i < stepIdx ? 'bg-primary' : 'bg-border'}`}
                  animate={
                    i < stepIdx
                      ? { scale: [1, 1.7, 1], opacity: [0.5, 1, 0.5] }
                      : { scale: 1, opacity: 1 }
                  }
                  transition={{
                    duration: 1.6,
                    repeat: i < stepIdx ? Infinity : 0,
                    delay: i * 0.18,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
          </div>
        </motion.button>

        {adminControls}


        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="border-t border-border/70 px-5 pb-5 pt-5">
                <ol className="relative">
                  <motion.span
                    className="absolute left-[9px] top-1 w-px bg-gradient-to-b from-primary/60 via-border to-transparent"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'calc(100% - 1.5rem)', opacity: 1 }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                    aria-hidden
                  />

                  {steps.map((s, i) => {
                    const state: StepState =
                      i + 1 < current ? 'done' : i + 1 === current ? 'active' : 'pending'

                    return (
                      <motion.li
                        key={s.key}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: state === 'pending' ? 0.42 : 1, x: 0 }}
                        transition={{
                          duration: 0.45,
                          delay: 0.12 + i * 0.09,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="relative flex gap-4 pb-6 last:pb-0"
                      >
                        <div className="relative z-10 pt-px">
                          <motion.span
                            className={`flex size-[19px] items-center justify-center rounded-full border bg-card ${
                              state === 'pending'
                                ? 'border-border text-muted-foreground'
                                : state === 'active'
                                  ? 'border-primary text-primary'
                                  : 'border-primary/80 bg-primary text-primary-foreground'
                            }`}
                            animate={
                              state === 'active'
                                ? {
                                    boxShadow: [
                                      '0 0 0 0 color-mix(in oklab, var(--primary) 40%, transparent)',
                                      '0 0 0 7px color-mix(in oklab, var(--primary) 0%, transparent)',
                                    ],

                                  }
                                : {}
                            }
                            transition={{ duration: 1.9, repeat: Infinity, ease: 'easeOut' }}
                          >
                            {state === 'done' ? (
                              <Check className="size-[11px]" strokeWidth={3} />
                            ) : (
                              <span className="font-heading text-[9px] font-bold tabular-nums">{i + 1}</span>
                            )}
                          </motion.span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p
                              className={`font-heading text-[13.5px] leading-snug tracking-[-0.01em] ${
                                state === 'active' ? 'font-bold text-foreground' : 'font-semibold text-foreground/90'
                              }`}
                            >
                              {s.title}
                            </p>
                            {state === 'active' ? (
                              <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-[3px] text-[8.5px] font-bold uppercase tracking-[0.12em] text-primary">
                                {ru ? 'Сейчас' : 'Now'}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-[11.5px] leading-[1.65] text-muted-foreground">{s.desc}</p>
                          {s.eta && state !== 'done' ? (
                            <p className="mt-2.5 inline-flex items-center gap-1.5 text-[10px] font-medium tracking-[0.02em] text-muted-foreground/80">
                              <span className="size-1 rounded-full bg-primary/60" aria-hidden />
                              {state === 'active' ? (ru ? 'Срок: ' : 'Timing: ') : (ru ? 'Ожидает · ' : 'Pending · ')}
                              {s.eta}
                            </p>
                          ) : null}
                        </div>
                      </motion.li>
                    )
                  })}
                </ol>

                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.2 + steps.length * 0.09 }}
                  className="mt-2 rounded-lg border border-border/60 bg-foreground/[0.02] px-3.5 py-3 text-[11px] leading-[1.65] text-muted-foreground"
                >
                  {ru
                    ? 'Страница обновляется автоматически — можно закрыть её и вернуться позже, прогресс не потеряется.'
                    : 'This page updates automatically — feel free to close it and come back later, progress is saved.'}

                </motion.p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

      </motion.div>

    </div>
  )
}

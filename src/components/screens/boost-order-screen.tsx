'use client'

/* ─────────────────────────────────────────────────────────────
 * BOOST ORDERS ONLY (продвижение: фолловеры / лайки / репосты /
 * показы / закладки). Дизайн aged- и custom-заказов живёт в
 * order-screen.tsx и здесь НЕ затрагивается.
 * ───────────────────────────────────────────────────────────── */

import { AnimatePresence, motion } from 'framer-motion'
import { RotateCcw, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { BOOST_MARKS, RegionMark, type BoostMarkId } from '../boost-icons'
import { useToast } from '../toast'
import { OrderHeader } from '../order/order-header'
import { OrderSummaryCard } from '../order/order-summary-card'
import { SocialPostPreview } from '../order/social-post-preview'
import { SocialProfilePreview } from '../order/social-profile-preview'
import { OrderProgressCard } from '../order/order-progress-card'
import { dbStatusToOrderStatus, orderStatusView } from '@/lib/order-status'
import { useServerFn } from '@tanstack/react-start'
import { getOrderRefundState } from '@/lib/admin-orders.functions'
import {
  RecoveryStatusCard,
  RefundStatusCard,
  type FlowPhase,
} from '../order/order-flow-cards'
import { RefillGuaranteeCard, type RefillState } from '../order/refill-guarantee-card'
import { SupportAction } from '../order/support-action'
import { Eyebrow, Reveal, type OrderTone } from '../order/primitives'
import { GlyphRefund, GlyphX, XMark } from '../order/icons'
import { OrderAdminOverride } from '../admin/order-admin-override'
import { useAuth } from '@/lib/auth'
import { SERVICES } from '@/lib/data'
import { useI18n } from '@/lib/i18n'
import { projectOrderId } from '@/lib/order-id'
import { ADMIN_ORDER_STATUSES, type AdminOrderStatus } from '@/lib/admin-orders.shared'
import { useRefill } from '@/lib/use-refill'
import { useStore } from '@/lib/store'
import { loadXTweetFast, extractTweetId, type XTweet } from '@/lib/x-tweet'
import { loadXProfileFast, normalizeXHandle } from '@/lib/x-profile'
import type { XProfileRow } from '@/lib/x-profile.functions'
import type { Order } from '@/lib/types'
import { formatDateTime } from '@/lib/datetime'

const REFILL_LIMIT = 4

function fullDate(ts: number, lang: string) {
  return formatDateTime(ts, lang)
}

function nf(n: number) {
  return n.toLocaleString('en-US')
}


export function BoostOrderScreen({ order }: { order: Order }) {
  const { lang, t } = useI18n()
  const ru = lang === 'ru'
  const navigate = useNavigate()
  const { refillOrder, syncOrderStatus } = useStore()
  const { isAdmin } = useAuth()
  const { show } = useToast()

  const service = useMemo(
    () =>
      SERVICES.find((s) => s.id === order.serviceId) ??
      SERVICES.find((s) => Object.values(s.name).some((n) => n === order.title)) ??
      null,
    [order.serviceId, order.title],
  )

  const category = (service?.categoryId ?? 'followers') as BoostMarkId
  const isFollowers = category === 'followers'
  const Mark = BOOST_MARKS[category] ?? BOOST_MARKS.followers
  const region = isFollowers ? service?.region : undefined

  const volume = order.qty ?? 0
  const orderId = projectOrderId(order.date)
  const [visibleStatus, setVisibleStatus] = useState(order.status)
  const [adminStatus, setAdminStatus] = useState<AdminOrderStatus>(() => {
    if (order.dbStatus) return order.dbStatus
    if (order.status === 'cancelled') return 'declined'
    if (order.status === 'waiting') return 'pending'
    return order.status
  })
  useEffect(() => {
    setVisibleStatus(order.status)
    setAdminStatus(
      order.dbStatus ?? (order.status === 'cancelled'
        ? 'declined'
        : order.status === 'waiting'
          ? 'pending'
          : order.status),
    )
  }, [order.dbStatus, order.status])

  const applyAdminStatus = (next: AdminOrderStatus) => {
    // The callback is invoked only after admin_set_order_status succeeds.
    // Mirror that persisted value into the shared store so route navigation
    // cannot resurrect the stale pre-mutation order object.
    syncOrderStatus(order.id, next)
    setAdminStatus(next)
    if (next === 'completed' || next === 'refunded') setVisibleStatus('completed')
    else if (next === 'declined' || next === 'failed') setVisibleStatus('cancelled')
    else if (next === 'in_progress' || next === 'refilling') setVisibleStatus('in_progress')
    else setVisibleStatus('waiting')
  }

  /* ── Специальные потоки: восстановление (рефилл) и возврат средств ───── */
  const [flow, setFlow] = useState<{ kind: 'recovery' | 'refund'; phase: FlowPhase } | null>(() =>
    adminStatus === 'refilling'
      ? { kind: 'recovery', phase: 'active' }
      : adminStatus === 'refunded'
        ? { kind: 'refund', phase: 'active' }
        : null,
  )
  const prevAdminStatus = useRef(adminStatus)
  useEffect(() => {
    const prev = prevAdminStatus.current
    prevAdminStatus.current = adminStatus
    if (adminStatus === 'refilling') {
      setFlow({ kind: 'recovery', phase: 'active' })
      return
    }
    if (adminStatus === 'refunded') {
      setFlow({ kind: 'refund', phase: 'active' })
      return
    }
    if (adminStatus === 'failed' && (prev === 'refilling' || prev === 'refunded')) {
      setFlow({ kind: prev === 'refilling' ? 'recovery' : 'refund', phase: 'error' })
      return
    }
    // Успешное завершение потока показываем один раз, затем обычная карточка.
    if (prev === 'refilling' && adminStatus === 'completed') {
      setFlow({ kind: 'recovery', phase: 'success' })
      const id = window.setTimeout(() => setFlow(null), 2800)
      return () => window.clearTimeout(id)
    }
    if (prev === 'refunded' && (adminStatus === 'completed' || adminStatus === 'declined')) {
      setFlow({ kind: 'refund', phase: 'success' })
      const id = window.setTimeout(() => setFlow(null), 2800)
      return () => window.clearTimeout(id)
    }
    setFlow(null)
    return
  }, [adminStatus])

  useEffect(() => {
    if (adminStatus === 'failed') setErrorNotice(true)
  }, [adminStatus])

  /** Закрытие окна: подтягиваем фактический статус возврата с бэкенда. */
  const closeErrorNotice = async () => {
    setErrorNotice(false)
    const dbId = refill.state?.dbOrderId
    if (!dbId) return
    try {
      const st = await refundStateFn({ data: { orderId: dbId } })
      if (st.refunded) applyAdminStatus('refunded')
      await refill.reload()
    } catch {
      /* оставляем текущий статус */
    }
  }

  const done = visibleStatus === 'completed'
  const waiting = visibleStatus === 'waiting'
  const cancelled = visibleStatus === 'cancelled'

  /* ── Target data ─────────────────────────────────────────────────────── */
  const [profile, setProfile] = useState<XProfileRow | null>(null)
  const [tweet, setTweet] = useState<XTweet | null>(null)
  const [tweetMissing, setTweetMissing] = useState(false)
  const target = order.target ?? ''

  useEffect(() => {
    let alive = true
    if (!target) return
    void (async () => {
      if (isFollowers) {
        const row = await loadXProfileFast(target).catch(() => null)
        if (alive) setProfile(row)
      } else if (extractTweetId(target)) {
        // Never leave the preview stuck on a skeleton if the API hangs.
        const row = await Promise.race([
          loadXTweetFast(target).catch(() => null),
          new Promise<null>((r) => window.setTimeout(() => r(null), 6000)),
        ])
        if (alive) {
          setTweet(row)
          setTweetMissing(!row)
        }
      } else if (alive) {
        setTweetMissing(true)
      }
    })()
    return () => {
      alive = false
    }
  }, [target, isFollowers])

  const handle = normalizeXHandle(profile?.user_name || tweet?.author_username || target)
  const startFollowers = order.startFollowers ?? profile?.followers ?? 0

  /* ── Live-ish progress ───────────────────────────────────────────────── */
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (done || waiting) return
    const id = window.setInterval(() => setNow(Date.now()), 15000)
    return () => window.clearInterval(id)
  }, [done, waiting])

  /* No per-unit delivery feed exists, so we never derive a fake count here. */


  /* ── Refill: состояние живёт на сервере, строго для ЭТОГО заказа ─────── */
  const [askRefill, setAskRefill] = useState(false)
  /** Окно «Не удалось выполнить заказ» — возврат уже запущен на бэкенде. */
  const [errorNotice, setErrorNotice] = useState(false)
  const refundStateFn = useServerFn(getOrderRefundState)
  const refill = useRefill(order.id)
  const refillReload = refill.reload
  // Статус заказа изменился (в т.ч. через админ-панель) — гарантия пересчитывается с сервера.
  useEffect(() => {
    void refillReload()
  }, [visibleStatus, refillReload])
  // База — источник истины: как только backend подтвердил успешный рефилл и
  // вернул заказ в `completed`, экран сам переключается на «Заказ завершён».
  const serverStatus = refill.state?.orderStatus
  useEffect(() => {
    if (!serverStatus) return
    if (!(ADMIN_ORDER_STATUSES as readonly string[]).includes(serverStatus)) return
    if (serverStatus === adminStatus) return
    applyAdminStatus(serverStatus as AdminOrderStatus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverStatus])

  const refillState = refill.phase as RefillState
  const used = refill.used
  const left = refill.remaining
  const windowEnd = refill.guaranteeEndsAt


  const refillButtonLabel =
    refillState === 'cooldown'
      ? refill.countdown
      : {
          loading: ru ? 'Загрузка…' : 'Loading…',
          submitting: ru ? 'Отправляем…' : 'Submitting…',
          accepted: ru ? 'Рефилл запрошен' : 'Refill requested',
          error: ru ? 'Повторить запрос' : 'Try again',
          limit_exhausted: ru ? 'Лимит исчерпан' : 'Limit reached',
          guarantee_expired: ru ? 'Гарантия завершена' : 'Guarantee ended',
          not_completed: ru ? 'Доступно после завершения' : 'Available after completion',
          available: ru ? 'Запросить рефилл' : 'Request refill',
          cooldown: refill.countdown,
        }[refillState]

  const refillStatusValue = {
    loading: ru ? 'Проверяем статус' : 'Checking status',
    submitting: ru ? 'Запрос обрабатывается' : 'Processing request',
    accepted: ru ? 'Запрос принят' : 'Request accepted',
    error: ru ? 'Не удалось отправить' : 'Request failed',
    limit_exhausted: ru ? 'Все рефиллы использованы' : 'All refills used',
    guarantee_expired: ru ? 'Гарантия завершена' : 'Guarantee ended',
    not_completed: ru ? 'Активируется после завершения' : 'Starts after completion',
    cooldown: ru ? 'Следующий рефилл через' : 'Next refill in',
    available: windowEnd != null ? fullDate(windowEnd, lang) : ru ? '48 ч после завершения' : '48 h after completion',
  }[refillState]

  const refillBadgeLabel =
    refillState === 'loading'
      ? '—'
      : left <= 0
        ? ru
          ? 'Исчерпано'
          : 'Used up'
        : refillState === 'guarantee_expired'
          ? ru
            ? 'Истекло'
            : 'Expired'
          : refillState === 'not_completed'
            ? ru
              ? 'Скоро'
              : 'Soon'
            : ru
              ? `${left} доступны`
              : `${left} available`

  async function doRefill() {
    setAskRefill(false)
    const ok = await refill.request()
    if (ok) {
      refillOrder(order.id)
      show(ru ? 'Рефилл отправлен в обработку' : 'Refill submitted')
    } else if (ok === false) {
      show(ru ? 'Не удалось отправить рефилл' : 'Refill request failed')
    }
  }



  /* ── Status copy ─────────────────────────────────────────────────────── */

  const statusLabel = cancelled
    ? ru
      ? 'Отменён'
      : 'Cancelled'
    : done
      ? ru
        ? 'Завершён'
        : 'Completed'
      : waiting
        ? ru
          ? 'Заказ оформлен'
          : 'Placed'
        : ru
          ? 'В процессе'
          : 'In progress'

  const progressBadgeLabel = cancelled
    ? ru
      ? 'Отменён'
      : 'Cancelled'
    : done
      ? ru
        ? 'Завершён'
        : 'Completed'
      : waiting
        ? ru
          ? 'Заказ оформлен'
          : 'Placed'
        : ru
          ? 'В работе'
          : 'In progress'

  const progressTitle = ru ? 'Статус заказа' : 'Order status'
  const progressHeadline = cancelled
    ? ru
      ? 'Заказ отменён'
      : 'Order cancelled'
    : done
      ? ru
        ? 'Заказ завершён'
        : 'Order completed'
      : waiting
        ? ru
          ? 'Заказ принят'
          : 'Order accepted'
        : ru
          ? 'Продвижение запущено'
          : 'Campaign started'

  const progressSubtitle = cancelled
    ? ru
      ? 'Мы не смогли выполнить этот заказ'
      : 'We were unable to complete this order'
    : undefined

  const progressNote = done || cancelled
    ? undefined
    : waiting
      ? ru
        ? 'Запуск в течение нескольких минут'
        : 'Starting within a few minutes'
      : ru
        ? 'Результат появится после завершения'
        : 'Result will appear after completion'

  const cancelReason =
    order.cancelReason ??
    (ru ? 'Публикация недоступна' : 'Publication unavailable')

  /* ── Единые цвета/тексты по фактическому статусу с backend ──────────── */
  const backendStatus = dbStatusToOrderStatus(adminStatus)
  const isRefill = adminStatus === 'refilling'
  const isRefund = adminStatus === 'refunded'
  const isFailed = adminStatus === 'failed'
  const override = isRefill || isRefund || isFailed
  const overrideView = orderStatusView(backendStatus)
  /* Единственный источник цвета — фактический статус с backend.
   * Для возврата используем золотой акцент, чтобы статус читался как
   * premium-операция, а не «ошибка/инфо». */
  const finalTone: OrderTone = isRefund ? 'live' : overrideView.tone
  const finalStatusLabel = override ? (ru ? overrideView.ru : overrideView.en) : statusLabel
  const finalBadgeLabel = override ? (ru ? overrideView.ru : overrideView.en) : progressBadgeLabel
  const finalHeadline = isRefill
    ? ru
      ? 'Восстанавливаем показатели'
      : 'Restoring the numbers'
    : isRefund
      ? ru
        ? 'Возврат средств'
        : 'Refund in progress'
      : isFailed
        ? ru
          ? 'Не удалось выполнить заказ'
          : 'Order failed'
        : progressHeadline
  const barTone: OrderTone = finalTone

  const serviceName = service?.name[lang] ?? order.title
  const UNITS: Record<string, [string, string]> = {
    followers: ['фолловеров', 'followers'],
    likes: ['лайков', 'likes'],
    retweets: ['репостов', 'reposts'],
    views: ['просмотров', 'views'],
    bookmarks: ['закладок', 'bookmarks'],
    comments: ['комментариев', 'comments'],
  }
  const unitWord = (UNITS[category] ?? ['ед.', 'units'])[ru ? 0 : 1]
  const caption = cancelled
    ? ru
      ? 'Заказ отменён, средства возвращены на баланс.'
      : 'Order cancelled and funds returned to your balance.'
    : done
      ? ru
        ? 'Заказ полностью выполнен и закрыт.'
        : 'The order is fully delivered and closed.'
      : waiting
        ? ru
          ? 'Заказ принят и скоро будет запущен.'
          : 'The order is accepted and starts shortly.'
        : ru
          ? 'Заказ запущен, показатели растут в реальном времени.'
          : 'The order is running and the numbers are growing live.'

  return (
    <div className="min-h-full">
      <OrderHeader
        title={ru ? 'Детали заказа' : 'Order details'}
        backLabel={t('back')}
        onBack={() => void navigate({ to: '/history' })}
      />

      <div
        className="mx-auto flex w-full max-w-[520px] flex-col gap-4 px-4 pt-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}
      >
        <OrderSummaryCard
          mark={
            region ? <RegionMark region={region} className="size-9" /> : <Mark className="size-9" />
          }
          service={serviceName}
          amountLabel={`${nf(volume)} ${unitWord}`}
          orderId={orderId}
          orderLabel={ru ? 'Номер заказа' : 'Order number'}
          statusLabel={finalStatusLabel}
          statusTone={finalTone}
          caption={caption}
          onCopied={() => show(ru ? 'Номер скопирован' : 'Number copied')}
        />

        {/* Админ правит этот заказ прямо здесь, в карточке. */}
        {isAdmin && refill.state?.dbOrderId ? (
          <OrderAdminOverride
            key={refill.state.dbOrderId}
            orderId={refill.state.dbOrderId}
            status={adminStatus}
            onStatusChange={applyAdminStatus}
          />
        ) : null}



        {isFollowers ? (
          <SocialProfilePreview
            profile={profile}
            handle={handle}
            start={startFollowers}
            volume={volume}
            done={done}
            ru={ru}
            lang={lang}
            delay={0.05}
          />
        ) : (

          <SocialPostPreview
            tweet={tweet}
            missing={tweetMissing}
            handle={handle}
            url={target}
            ru={ru}
            category={category}
            volume={volume}
            done={done}
            delay={0.05}
          />
        )}

        {flow?.kind === 'recovery' ? (
          <RecoveryStatusCard
            delay={0.1}
            phase={flow.phase}
            ru={ru}
            steps={[
              { label: ru ? 'Заказ выполнен' : 'Order delivered', state: 'done' },
              {
                label: ru ? 'Рефилл запрошен' : 'Refill requested',
                meta: refill.state?.lastRefillAt
                  ? fullDate(new Date(refill.state.lastRefillAt).getTime(), lang)
                  : undefined,
                state: 'done',
              },
              {
                label: ru ? 'Восстановление' : 'Recovery',
                state: flow.phase === 'error' ? 'danger' : flow.phase === 'success' ? 'done' : 'live',
              },
              {
                label: ru ? 'Проверка результата' : 'Result check',
                meta:
                  flow.phase === 'success'
                    ? ru
                      ? 'Готово'
                      : 'Done'
                    : ru
                      ? 'Ожидает'
                      : 'Pending',
                state: flow.phase === 'success' ? 'done' : 'idle',
              },
            ]}
          />
        ) : flow?.kind === 'refund' ? (
          <RefundStatusCard delay={0.1} phase={flow.phase} ru={ru} />
        ) : (
        <OrderProgressCard
          delay={0.1}
          title={progressTitle}
          badgeLabel={finalBadgeLabel}
          badgeTone={finalTone}
          barTone={barTone}
          complete={done}
          cancelled={cancelled}
          headline={finalHeadline}
          subtitle={progressSubtitle}
          note={progressNote}
          dangerIcon={
            cancelled ? (
              <span className="flex size-12 items-center justify-center rounded-full bg-destructive/[0.08] ring-1 ring-inset ring-destructive/30">
                <GlyphX className="size-5 text-destructive" />
              </span>
            ) : undefined
          }
          reason={
            cancelled
              ? {
                  label: ru ? 'Причина' : 'Reason',
                  text: cancelReason,
                }
              : undefined
          }
          steps={
            cancelled
              ? [
                  {
                    label: ru ? 'Заказ оформлен' : 'Order placed',
                    meta: fullDate(order.date, lang),
                    state: 'done',
                  },
                  {
                    label: ru ? 'Заказ отменён' : 'Order cancelled',
                    state: 'danger',
                  },
                  {
                    label: ru ? 'Средства возвращены на баланс' : 'Funds returned to balance',
                    state: 'idle',
                    icon: <GlyphRefund className="size-[13px]" />,
                  },
                ]
              : [
                  {
                    label: ru ? 'Заказ оформлен' : 'Order placed',
                    meta: fullDate(order.date, lang),
                    state: 'done',
                  },
                  {
                    label: isRefill
                      ? ru
                        ? 'В процессе (refill)'
                        : 'In progress (refill)'
                      : ru
                        ? 'В процессе'
                        : 'In progress',
                    state: done ? 'done' : waiting ? 'idle' : 'live',
                    tone: finalTone,
                  },
                  {
                    label: ru ? 'Заказ завершён' : 'Order completed',
                    meta: done
                      ? order.completedAt
                        ? fullDate(order.completedAt, lang)
                        : ru
                          ? 'Готово'
                          : 'Done'
                      : ru
                        ? 'Ожидает'
                        : 'Pending',
                    state: done ? 'done' : 'idle',
                  },
                ]
          }
        />
        )}


        {errorNotice ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
            <div className="w-full max-w-[420px] rounded-[24px] border border-border bg-card p-5 shadow-2xl">
              <h3 className="font-display text-[19px] font-bold leading-tight">
                {ru ? 'Не удалось выполнить заказ' : 'Order could not be completed'}
              </h3>
              <p className="mt-2 text-[13.5px] leading-[1.55] text-muted-foreground">
                {ru
                  ? 'Во время выполнения произошла ошибка. Возврат средств уже запущен автоматически.'
                  : 'An error occurred during processing. A refund has already been started automatically.'}
              </p>
              <button
                type="button"
                onClick={() => void closeErrorNotice()}
                className="pressable mt-4 w-full rounded-[16px] bg-info px-4 py-3 text-[14px] font-bold text-background"
              >
                {ru ? 'Понятно' : 'Got it'}
              </button>
            </div>
          </div>
        ) : null}

        {cancelled ? (
          <Reveal delay={0.15} className="flex flex-col gap-3">
            <button
              onClick={() => void navigate({ to: '/catalog' })}
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-[18px] bg-transparent px-4 py-3.5 font-semibold text-destructive transition-transform duration-200 active:scale-[0.98]"
              style={{
                boxShadow: 'inset 0 0 0 1px color-mix(in oklab, var(--destructive) 35%, transparent)',
              }}
              type="button"
            >
              <span className="relative z-10 flex items-center gap-2">
                <RotateCcw className="size-4" />
                {ru ? 'Повторить заказ' : 'Repeat order'}
              </span>
              <span
                aria-hidden
                className="absolute inset-0 -z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background:
                    'color-mix(in oklab, var(--destructive) 6%, transparent)',
                }}
              />
            </button>

            <button
              onClick={() => void navigate({ to: '/support' })}
              className="text-center text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              type="button"
            >
              {ru ? 'Связаться с поддержкой' : 'Contact support'}
            </button>
          </Reveal>
        ) : (
          <>
            {order.refillable ? (
              <RefillGuaranteeCard
                delay={0.15}
                title={ru ? 'Рефилл-гарантия' : 'Refill guarantee'}
                used={used}
                total={refill.max}
                badgeLabel={refillBadgeLabel}
                countLabel={
                  ru ? `Использовано ${used} из ${refill.max}` : `${used} of ${refill.max} used`
                }
                description={
                  ru
                    ? 'Бесплатно восстановим списанные показатели.'
                    : 'We restore lost metrics free of charge.'
                }
                statusValue={refillStatusValue}
                state={refillState}
                buttonLabel={refillButtonLabel}
                onRequest={() => setAskRefill(true)}
              />


            ) : null}

            <SupportAction
              label={ru ? 'Нужна помощь?' : 'Need help?'}
              hint={ru ? 'Проблема с заказом — напишите в поддержку' : 'Something wrong? Contact support'}
              onClick={() => void navigate({ to: '/support' })}
            />
          </>
        )}
      </div>

      <AnimatePresence>
        {askRefill ? (
          <RefillSheet
            ru={ru}
            used={used}
            onClose={() => setAskRefill(false)}
            onConfirm={doRefill}
          />
        ) : null}
      </AnimatePresence>
    </div>
  )
}

/* ── Refill confirmation sheet ────────────────────────────────────────── */
function RefillShield() {
  return (
    <div className="relative mx-auto flex size-[132px] items-center justify-center">
      {/* soft radial glow */}
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'radial-gradient(circle, color-mix(in oklab, var(--success) 34%, transparent) 0%, transparent 66%)',
          filter: 'blur(14px)',
        }}
        animate={{ opacity: [0.55, 0.95, 0.55], scale: [0.94, 1.06, 0.94] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.svg
        viewBox="0 0 100 112"
        className="relative size-[104px] text-success"
        initial={{ scale: 0.82, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        style={{ filter: 'drop-shadow(0 0 14px color-mix(in oklab, var(--success) 45%, transparent))' }}
      >
        <motion.path
          d="M50 4 L92 20 V56 C92 82 74 99 50 108 C26 99 8 82 8 56 V20 Z"
          fill="color-mix(in oklab, var(--success) 9%, transparent)"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
        <g transform="translate(50 58)">
          <motion.g
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
          >
            <path
              d="M-22 0a22 22 0 0 1 34-18.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            <path d="M13 -28 v11 h-11" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            <path
              d="M22 0a22 22 0 0 1-34 18.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            <path d="M-13 28 v-11 h11" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          </motion.g>
          <motion.g
            stroke="currentColor"
            strokeWidth="4.5"
            strokeLinecap="round"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.45, type: 'spring', stiffness: 320, damping: 16 }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          >
            <path d="M0 -9 v18" />
            <path d="M-9 0 h18" />
          </motion.g>
        </g>

      </motion.svg>
    </div>
  )
}

function RefillRow({
  icon,
  label,
  value,
  valueClass = '',
  delay,
}: {
  icon: React.ReactNode
  label: string
  value: string
  valueClass?: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-3 px-4 py-3.5"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success/10 text-success ring-1 ring-inset ring-success/25">
        {icon}
      </span>
      <span className="flex-1 text-[14px] text-muted-foreground">{label}</span>
      <span className={`text-[14px] font-semibold tabular-nums ${valueClass}`}>{value}</span>
    </motion.div>
  )
}

function RefillSheet({
  ru,
  used,
  onClose,
  onConfirm,
}: {
  ru: boolean
  used: number
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-[8px]"
    >
      <motion.div
        initial={{ y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 48, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 38 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[520px] rounded-t-[28px] border-t border-white/[0.07] bg-card px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-3"
      >
        <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-white/15" />

        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/[0.06] text-muted-foreground ring-1 ring-inset ring-white/[0.08] transition active:scale-95 active:text-foreground"
        >
          <X className="size-[18px]" />
        </button>

        <div className="pt-4">
          <RefillShield />
        </div>

        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 text-center text-[26px] font-bold leading-tight tracking-tight"
        >
          {ru ? 'Подтвердить рефилл' : 'Confirm refill'}
        </motion.h3>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-2.5 max-w-[300px] text-center text-[14.5px] leading-[1.5] text-muted-foreground"
        >
          {ru
            ? 'Восстановим недостающие показатели и вернём заказ в работу.'
            : 'We restore the missing metrics and put the order back in progress.'}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 divide-y divide-white/[0.06] overflow-hidden rounded-2xl bg-white/[0.03] ring-1 ring-inset ring-white/[0.07]"
        >
          <RefillRow
            delay={0.32}
            icon={
              <svg viewBox="0 0 24 24" fill="none" className="size-[18px]">
                <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v0A1.5 1.5 0 0 1 18.5 9h-13A1.5 1.5 0 0 1 4 7.5Z" stroke="currentColor" strokeWidth="1.7" />
                <path d="M5.5 9.5h13V17a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V9.5Z" stroke="currentColor" strokeWidth="1.7" />
                <path d="M10 13.5h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            }
            label={ru ? 'Будет использован' : 'Will be used'}
            value={
              ru
                ? `${Math.min(used + 1, REFILL_LIMIT)} из ${REFILL_LIMIT} рефиллов`
                : `${Math.min(used + 1, REFILL_LIMIT)} of ${REFILL_LIMIT} refills`
            }
          />
          <RefillRow
            delay={0.38}
            icon={
              <svg viewBox="0 0 24 24" fill="none" className="size-[18px]">
                <path d="M12.6 3.5H19a1.5 1.5 0 0 1 1.5 1.5v6.4a2 2 0 0 1-.59 1.41l-6.5 6.5a2 2 0 0 1-2.83 0l-5.3-5.3a2 2 0 0 1 0-2.83l6.5-6.5a2 2 0 0 1 1.41-.59Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                <circle cx="16.2" cy="7.8" r="1.4" fill="currentColor" />
              </svg>
            }
            label={ru ? 'Стоимость' : 'Price'}
            value={ru ? 'Бесплатно' : 'Free'}
            valueClass="text-success"
          />
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{
            y: -2,
            boxShadow:
              'inset 0 1px 0 color-mix(in oklab, white 40%, transparent), 0 16px 40px -12px color-mix(in oklab, var(--success) 85%, transparent)',
          }}
          whileTap={{ scale: 0.975, y: 0 }}
          onClick={onConfirm}
          className="group mt-6 flex h-[58px] w-full items-center justify-center gap-2.5 rounded-2xl text-[17px] font-semibold tracking-tight text-black"
          style={{
            background: 'linear-gradient(180deg, color-mix(in oklab, var(--success) 88%, white 12%), var(--success))',
            boxShadow:
              'inset 0 1px 0 color-mix(in oklab, white 35%, transparent), 0 10px 30px -12px color-mix(in oklab, var(--success) 70%, transparent)',
          }}
        >
          <motion.svg
            viewBox="0 0 24 24"
            fill="none"
            className="size-[21px]"
            initial={false}
            whileHover={{ scale: 1.06 }}
          >
            <path d="M12 3 20 6v5.5c0 4.7-3.3 8.2-8 9.5-4.7-1.3-8-4.8-8-9.5V6l8-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="m8.8 12.1 2.2 2.2 4.2-4.4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
          {ru ? 'Подтвердить' : 'Confirm'}
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          whileTap={{ scale: 0.975 }}
          onClick={onClose}
          className="mt-3 h-[54px] w-full rounded-2xl bg-white/[0.02] text-[16px] font-medium text-muted-foreground ring-1 ring-inset ring-white/[0.08] transition-all duration-200 hover:bg-destructive/10 hover:text-destructive hover:ring-destructive/40 hover:shadow-[0_10px_30px_-14px_color-mix(in_oklab,var(--destructive)_80%,transparent)] active:text-destructive"
        >
          {ru ? 'Отмена' : 'Cancel'}
        </motion.button>

      </motion.div>
    </motion.div>
  )
}


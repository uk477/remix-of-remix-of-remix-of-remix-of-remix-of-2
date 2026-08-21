'use client'

/* ─────────────────────────────────────────────────────────────
 * BOOST ORDERS ONLY (продвижение: фолловеры / лайки / репосты /
 * показы / закладки). Дизайн aged- и custom-заказов живёт в
 * order-screen.tsx и здесь НЕ затрагивается.
 * ───────────────────────────────────────────────────────────── */

import { AnimatePresence, motion } from 'framer-motion'
import { RotateCcw, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { BOOST_MARKS, RegionMark, type BoostMarkId } from '../boost-icons'
import { VerifiedBadge } from '../icons/verified-badge'
import { useToast } from '../toast'
import { OrderHeader } from '../order/order-header'
import { OrderSummaryCard } from '../order/order-summary-card'
import { SocialPostPreview } from '../order/social-post-preview'
import { OrderProgressCard } from '../order/order-progress-card'
import { RefillGuaranteeCard, type RefillState } from '../order/refill-guarantee-card'
import { SupportAction } from '../order/support-action'
import { Eyebrow, Reveal, type OrderTone } from '../order/primitives'
import { GlyphRefund, GlyphX, XMark } from '../order/icons'
import { SERVICES } from '@/lib/data'
import { useI18n } from '@/lib/i18n'
import { projectOrderId } from '@/lib/order-id'
import { useStore } from '@/lib/store'
import { loadXTweetFast, extractTweetId, type XTweet } from '@/lib/x-tweet'
import { loadXProfileFast, normalizeXHandle } from '@/lib/x-profile'
import type { XProfileRow } from '@/lib/x-profile.functions'
import type { Order } from '@/lib/types'

const REFILL_WINDOW_MS = 48 * 60 * 60 * 1000
const REFILL_LIMIT = 4

function refillKey(id: string) {
  return `aurx.refills.${id}`
}

function readRefills(id: string): number[] {
  try {
    const raw = localStorage.getItem(refillKey(id))
    const arr = raw ? (JSON.parse(raw) as number[]) : []
    return Array.isArray(arr) ? arr.filter((n) => typeof n === 'number') : []
  } catch {
    return []
  }
}

function fullDate(ts: number, lang: string) {
  return new Date(ts).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function nf(n: number) {
  return n.toLocaleString('en-US')
}


export function BoostOrderScreen({ order }: { order: Order }) {
  const { lang, t } = useI18n()
  const ru = lang === 'ru'
  const navigate = useNavigate()
  const { refillOrder } = useStore()
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
  const done = order.status === 'completed'
  const waiting = order.status === 'waiting'
  const cancelled = order.status === 'cancelled'

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


  /* ── Refill ──────────────────────────────────────────────────────────── */
  const [refills, setRefills] = useState<number[]>([])
  const [askRefill, setAskRefill] = useState(false)
  const [refilling, setRefilling] = useState(false)
  const [justSent, setJustSent] = useState(false)
  useEffect(() => setRefills(readRefills(order.id)), [order.id])

  // Гарантия отсчитывается от завершения заказа. Пока заказ не завершён,
  // окно ещё не стартовало — значит истечь оно не может.
  const windowStart = done ? (order.completedAt ?? order.date) : null
  const windowEnd = windowStart != null ? windowStart + REFILL_WINDOW_MS : null
  const inWindow = windowEnd == null || now < windowEnd
  const used = refills.length
  const left = REFILL_LIMIT - used
  const canRefill = Boolean(order.refillable) && inWindow && left > 0

  const refillState: RefillState = refilling
    ? 'loading'
    : justSent
      ? 'sent'
      : canRefill
        ? 'available'
        : 'unavailable'

  const refillButtonLabel =
    refillState === 'loading'
      ? ru
        ? 'Отправляем…'
        : 'Submitting…'
      : refillState === 'sent'
        ? ru
          ? 'Рефилл отправлен'
          : 'Refill submitted'
        : refillState === 'available'
          ? ru
            ? 'Сделать рефилл'
            : 'Request refill'
          : !order.refillable
            ? ru
              ? 'Не предусмотрен'
              : 'Not included'
            : left <= 0
              ? ru
                ? 'Лимит исчерпан'
                : 'Limit reached'
              : ru
                ? 'Срок гарантии истёк'
                : 'Guarantee expired'

  const refillDescription = ru
    ? `Доступно ${left} из ${REFILL_LIMIT} рефиллов. Если показатели просядут, восстановим списания бесплатно в течение 48 часов.`
    : `${left} of ${REFILL_LIMIT} refills available. If the numbers drop, we restore them free of charge within 48 hours.`

  function doRefill() {
    const next = [...refills, Date.now()]
    setAskRefill(false)
    setRefilling(true)
    window.setTimeout(() => {
      setRefills(next)
      try {
        localStorage.setItem(refillKey(order.id), JSON.stringify(next))
      } catch {
        /* ignore */
      }
      refillOrder(order.id)
      setRefilling(false)
      setJustSent(true)
      show(ru ? 'Рефилл отправлен в обработку' : 'Refill submitted')
      window.setTimeout(() => setJustSent(false), 4000)
    }, 900)
  }

  /* ── Status copy ─────────────────────────────────────────────────────── */
  const statusTone: OrderTone = cancelled ? 'danger' : done ? 'success' : waiting ? 'neutral' : 'live'
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
          statusLabel={statusLabel}
          statusTone={statusTone}
          caption={caption}
          onCopied={() => show(ru ? 'Номер скопирован' : 'Number copied')}
        />


        {isFollowers ? (
          <ProfilePreview
            profile={profile}
            handle={handle}
            start={startFollowers}
            projected={startFollowers + volume}
            done={done}
            ru={ru}
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

        <OrderProgressCard
          delay={0.1}
          title={progressTitle}
          badgeLabel={progressBadgeLabel}
          badgeTone={statusTone}
          complete={done}
          cancelled={cancelled}
          headline={progressHeadline}
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
                    label: ru ? 'В процессе' : 'In progress',
                    state: done ? 'done' : waiting ? 'idle' : 'live',
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
                title={ru ? 'Гарантия рефилла' : 'Refill guarantee'}
                countLabel={`${used} / ${REFILL_LIMIT}`}
                description={refillDescription}
                untilLabel={
                  windowEnd != null
                    ? ru
                      ? 'Гарантия действует до'
                      : 'Guarantee valid until'
                    : ru
                      ? 'Гарантия действует'
                      : 'Guarantee window'
                }
                untilValue={
                  windowEnd != null
                    ? fullDate(windowEnd, lang)
                    : ru
                      ? '48 ч после завершения'
                      : '48 h after completion'
                }
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

/* ── Followers target: quoted-profile panel ───────────────────────────── */
function ProfilePreview({
  profile,
  handle,
  start,
  projected,
  done,
  ru,
  delay,
}: {
  profile: XProfileRow | null
  handle: string
  start: number
  projected: number
  done: boolean
  ru: boolean
  delay?: number
}) {
  const p = profile && !profile.not_found ? profile : null
  const vt = (p?.verified_type ?? '').toLowerCase()
  const tone =
    p && (p.is_blue_verified || p.is_verified || vt)
      ? vt === 'business' || vt === 'organization'
        ? 'text-[#e2b719]'
        : vt === 'government'
          ? 'text-[#829aab]'
          : 'text-[#1d9bf0]'
      : null

  return (
    <Reveal delay={delay} className="px-1">
      <div className="mb-2 px-0.5">
        <Eyebrow>{ru ? 'Аккаунт' : 'Target account'}</Eyebrow>
      </div>

      <div
        className="rounded-[18px] p-4"
        style={{
          background: 'color-mix(in oklab, var(--foreground) 3%, transparent)',
          boxShadow: 'inset 0 0 0 1px color-mix(in oklab, var(--foreground) 7%, transparent)',
        }}
      >
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-foreground/[0.06]">
            {p?.avatar_url ? (
              <img src={p.avatar_url} alt="" className="size-full object-cover" />
            ) : (
              <XMark className="size-[42%] text-foreground/70" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-1">
              <span className="truncate text-[15px] font-semibold leading-tight">
                {p?.name || handle || '—'}
              </span>
              {tone ? <VerifiedBadge className={`size-[15px] shrink-0 ${tone}`} /> : null}
            </span>
            <span className="mt-0.5 block truncate text-[13px] leading-tight text-muted-foreground">
              @{handle || 'username'}
            </span>
          </span>
          <XMark className="size-[15px] shrink-0 text-foreground/45" />
        </div>

        <div
          className="mt-3.5 flex items-baseline justify-between gap-3 pt-3"
          style={{ borderTop: '1px solid color-mix(in oklab, var(--foreground) 7%, transparent)' }}
        >
          <span className="text-[13px] text-muted-foreground">
            {ru ? 'Фолловеры' : 'Followers'}
          </span>
          <span className="text-[13.5px] font-semibold tabular-nums">
            {nf(start)}
            <span className="mx-1.5 text-muted-foreground/70">→</span>
            <span className={done ? 'text-success' : 'text-primary'}>{nf(projected)}</span>
          </span>
        </div>
      </div>
    </Reveal>
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
        <motion.g
          style={{ originX: '50px', originY: '58px' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          <path
            d="M28 58a22 22 0 0 1 34-18.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <path d="M63 30 v11 h-11" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          <path
            d="M72 58a22 22 0 0 1-34 18.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <path d="M37 86 v-11 h11" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        </motion.g>
        <motion.g
          stroke="currentColor"
          strokeWidth="4.5"
          strokeLinecap="round"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.45, type: 'spring', stiffness: 320, damping: 16 }}
          style={{ originX: '50px', originY: '58px' }}
        >
          <path d="M50 49 v18" />
          <path d="M41 58 h18" />
        </motion.g>
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
          whileTap={{ scale: 0.975 }}
          onClick={onConfirm}
          className="mt-6 flex h-[58px] w-full items-center justify-center gap-2.5 rounded-2xl text-[17px] font-semibold tracking-tight text-black"
          style={{
            background: 'linear-gradient(180deg, color-mix(in oklab, var(--success) 88%, white 12%), var(--success))',
            boxShadow:
              'inset 0 1px 0 color-mix(in oklab, white 35%, transparent), 0 10px 30px -12px color-mix(in oklab, var(--success) 70%, transparent)',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="size-[21px]">
            <path d="M12 3 20 6v5.5c0 4.7-3.3 8.2-8 9.5-4.7-1.3-8-4.8-8-9.5V6l8-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="m8.8 12.1 2.2 2.2 4.2-4.4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {ru ? 'Подтвердить' : 'Confirm'}
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          whileTap={{ scale: 0.975 }}
          onClick={onClose}
          className="mt-3 h-[54px] w-full rounded-2xl bg-white/[0.02] text-[16px] font-medium text-muted-foreground ring-1 ring-inset ring-white/[0.08] transition-colors active:text-foreground"
        >
          {ru ? 'Отмена' : 'Cancel'}
        </motion.button>
      </motion.div>
    </motion.div>
  )
}


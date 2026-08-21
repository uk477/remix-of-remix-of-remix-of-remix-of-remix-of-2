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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 backdrop-blur-[6px]"
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 38 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[520px] rounded-t-[24px] border-t border-white/[0.07] bg-card px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-3"
      >
        <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-white/15" />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[17px] font-semibold leading-tight tracking-tight">
              {ru ? 'Запросить рефилл' : 'Request a refill'}
            </h3>
            <p className="mt-1.5 text-[13px] leading-[1.5] text-muted-foreground">
              {ru
                ? 'Дозакажем недостающие единицы и вернём заказ в работу.'
                : 'We top up the missing units and put the order back in progress.'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground active:text-foreground"
          >
            <X className="size-[18px]" />
          </button>
        </div>

        <dl className="mt-4 space-y-2.5 border-t border-white/[0.06] pt-4 text-[13px]">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">{ru ? 'Использовано' : 'Used'}</dt>
            <dd className="tabular-nums font-medium">
              {used} <span className="text-muted-foreground">/ {REFILL_LIMIT}</span>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">{ru ? 'Окно гарантии' : 'Guarantee window'}</dt>
            <dd className="font-medium">{ru ? '48 часов' : '48 hours'}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">{ru ? 'Стоимость' : 'Price'}</dt>
            <dd className="font-medium text-success">{ru ? 'Бесплатно' : 'Free'}</dd>
          </div>
        </dl>

        <div className="mt-5 grid grid-cols-[1fr_1.4fr] gap-2.5">
          <button
            onClick={onClose}
            className="h-12 rounded-xl bg-white/[0.05] text-[14px] font-medium text-muted-foreground ring-1 ring-inset ring-white/[0.07] active:scale-[0.98]"
          >
            {ru ? 'Отмена' : 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            className="h-12 rounded-xl bg-primary text-[14px] font-semibold tracking-tight text-primary-foreground shadow-[inset_0_1px_0_color-mix(in_oklab,white_28%,transparent)] transition-transform active:scale-[0.98]"
          >
            {ru ? 'Подтвердить' : 'Confirm refill'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

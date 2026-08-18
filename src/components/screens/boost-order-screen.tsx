'use client'

/* ─────────────────────────────────────────────────────────────
 * BOOST ORDERS ONLY (продвижение: фолловеры / лайки / репосты /
 * показы / закладки). Дизайн aged- и custom-заказов живёт в
 * order-screen.tsx и здесь НЕ затрагивается.
 * ───────────────────────────────────────────────────────────── */

import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  
  BadgeCheck,
  BarChart3,
  Bookmark,
  Check,
  Copy,
  Gauge,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Repeat2,
  RotateCw,
  Share,
  ShieldCheck,
  
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { BOOST_MARKS, RegionMark, type BoostMarkId } from '../boost-icons'
import { VerifiedBadge } from '../icons/verified-badge'
import { AurxMark } from '../aurx-mark'
import { useToast } from '../toast'
import { copyText } from '@/lib/clipboard'
import { SERVICES } from '@/lib/data'
import { compactNumber, money } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { projectOrderId } from '@/lib/order-id'
import { useStore } from '@/lib/store'
import {
  loadXTweetFast,
  extractTweetId,
  decodeTweetText,
  verifiedTone,
  type XTweet,
} from '@/lib/x-tweet'
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
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Thin-space grouping reads cleaner in RU and stays neutral in EN. */
function nf(n: number) {
  return n.toLocaleString('en-US').replace(/,/g, '\u2009')
}

/* ── Animated counter: rolls digits when the value changes ───────────────── */
function Digits({ value, className }: { value: number; className?: string }) {
  const chars = nf(value).split('')
  return (
    <span className={className}>
      {chars.map((c, i) => (
        <motion.span
          key={`${i}-${c}`}
          initial={{ y: '-55%', opacity: 0, filter: 'blur(3px)' }}
          animate={{ y: '0%', opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.42, delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block tabular-nums"
        >
          {c}
        </motion.span>
      ))}
    </span>
  )
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

  const volume = order.qty && order.qty > 1 ? order.qty : (order.qty ?? 0)
  const orderId = projectOrderId(order.date)
  const done = order.status === 'completed'

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
        const row = await loadXTweetFast(target).catch(() => null)
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
  const projected = startFollowers + volume
  const liveFollowers = profile?.followers ?? projected

  /* ── Refill ──────────────────────────────────────────────────────────── */
  const [refills, setRefills] = useState<number[]>([])
  const [askRefill, setAskRefill] = useState(false)
  const [refilling, setRefilling] = useState(false)
  useEffect(() => setRefills(readRefills(order.id)), [order.id])


  const windowEnd = order.date + REFILL_WINDOW_MS
  const inWindow = Date.now() < windowEnd
  const used = refills.length
  const canRefill = Boolean(order.refillable) && inWindow && used < REFILL_LIMIT

  function doRefill() {
    const next = [...refills, Date.now()]
    setRefills(next)
    try {
      localStorage.setItem(refillKey(order.id), JSON.stringify(next))
    } catch {
      /* ignore */
    }
    refillOrder(order.id)
    setAskRefill(false)
    show(ru ? 'Рефилл отправлен в обработку' : 'Refill submitted')
  }

  async function copyId() {
    await copyText(orderId)
    show(ru ? 'ID заказа скопирован' : 'Order ID copied')
  }

  return (
    <div className="mx-auto w-full max-w-[560px] pb-24">
      <div className="px-4 pt-5">
        <button
          onClick={() => void navigate({ to: '/history' })}
          className="flex items-center gap-2 text-[13px] font-semibold text-muted-foreground active:opacity-60"
        >
          <ArrowLeft className="size-4" />
          {t('back')}
        </button>
      </div>

      {/* ── 1. Заголовок заказа ─────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative mt-3 overflow-hidden border-y border-border bg-card px-5 py-3.5 sm:mx-4 sm:rounded-[22px] sm:border"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 size-44 rounded-full bg-primary/10 blur-3xl"
        />
        <motion.div
          aria-hidden
          animate={{ x: ['-120%', '220%'] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2.5 }}
          className="pointer-events-none absolute inset-y-0 w-1/3 bg-linear-to-r from-transparent via-primary/[0.06] to-transparent"
        />

        {/* Строка 1: услуга + статус */}
        <div className="relative flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center">
            {region ? <RegionMark region={region} className="size-9" /> : <Mark className="size-9" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-bold leading-tight">
              {service?.name[lang] ?? order.title}
              {volume > 1 ? (
                <>
                  {' '}
                  <span className="text-muted-foreground/50">·</span>{' '}
                  <span className="tnum text-primary">{nf(volume)}</span>
                </>
              ) : null}
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <motion.span
                aria-hidden
                animate={done ? {} : { opacity: [1, 0.2, 1] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                className={`size-[5px] rounded-full ${done ? 'bg-success' : 'bg-primary'}`}
              />
              <span
                className={`text-[9.5px] font-semibold uppercase tracking-[0.2em] ${done ? 'text-success/90' : 'text-primary/90'}`}
              >
                {done ? t('status_completed') : t('status_in_progress')}
              </span>
            </div>
          </div>
        </div>

        {/* Строка 2: номер заказа */}
        <button
          onClick={() => void copyId()}
          className="group relative mt-3 flex w-full items-center gap-2 border-t border-border/60 pt-2.5 text-left active:opacity-70"
        >
          <span className="text-[9.5px] font-bold uppercase tracking-[0.22em] text-muted-foreground/60">
            {ru ? 'Ваш заказ' : 'Your order'}
          </span>
          <span className="tnum ml-auto font-display text-[15px] font-extrabold leading-none tracking-tight">
            <span className="mr-0.5 text-[12px] font-bold text-primary/60">#</span>
            {orderId}
          </span>
          <Copy className="size-3 text-muted-foreground/50 transition-colors group-hover:text-foreground" />
        </button>
      </motion.section>


      {/* ── 2. Цель заказа ──────────────────────────────────────────────── */}
      {isFollowers ? (
        <FollowersTarget
          profile={profile}
          handle={handle}
          start={startFollowers}
          projected={projected}
          live={liveFollowers}
          done={done}
          ru={ru}
        />
      ) : (
        <PostTarget
          tweet={tweet}
          missing={tweetMissing}
          handle={handle}
          url={target}
          ru={ru}
          category={category}
          volume={volume}
          done={done}

        />

      )}

      {/* ── 3. Статус заказа ────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mt-3 border-y border-border bg-card sm:mx-4 sm:rounded-[26px] sm:border"
      >
        <div className="px-5 pb-5 pt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.26em] text-muted-foreground/70">
              {ru ? 'Статус заказа' : 'Order status'}
            </h2>
            {service ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 text-[10px] font-medium text-muted-foreground/90">
                <Gauge className="size-3 opacity-70" />
                {service.speed[lang]}
              </span>
            ) : null}
          </div>

          <ol className="relative mt-5 pl-9">
            <span
              aria-hidden
              className="pointer-events-none absolute left-[6.5px] top-2 bottom-2 w-px bg-linear-to-b from-border via-border to-transparent"
            />
            <TimelineRow
              tone="done"
              label={ru ? 'Заказ оформлен' : 'Order placed'}
              value={fullDate(order.date, lang)}
            />
            <TimelineRow
              tone={done ? 'done' : 'live'}
              label={ru ? 'Выполнение' : 'Delivery'}
              value={
                done
                  ? ru
                    ? 'Все единицы доставлены'
                    : 'All units delivered'
                  : ru
                    ? `Идёт накрутка · ${nf(volume)}`
                    : `In progress · ${nf(volume)}`
              }
              progress={!done}
            />
            <TimelineRow
              tone={done ? 'done' : 'idle'}
              last
              label={ru ? 'Заказ выполнен' : 'Completed'}
              value={
                done
                  ? order.completedAt
                    ? fullDate(order.completedAt, lang)
                    : ru
                      ? 'Готово'
                      : 'Done'
                  : ru
                    ? 'Ожидается'
                    : 'Pending'
              }
            />
          </ol>

        </div>

        {/* Гарантия рефилла — отдельная «квитанция» */}
        <div className="border-t border-dashed border-border/70 px-5 pb-6 pt-5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-[12px] font-semibold tracking-tight">
              <ShieldCheck className="size-4 text-success/90" strokeWidth={2.2} />
              {ru ? 'Гарантия рефилла' : 'Refill guarantee'}
            </span>
            <span className="tnum text-[11px] font-medium text-muted-foreground/80">
              {REFILL_LIMIT - used} <span className="opacity-40">/</span> {REFILL_LIMIT}
            </span>
          </div>

          <div className="mt-3 flex gap-2 px-0.5">
            {Array.from({ length: REFILL_LIMIT }).map((_, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scaleX: 0.6 }}
                animate={{ opacity: i < REFILL_LIMIT - used ? 1 : 0.2, scaleX: 1 }}
                transition={{ duration: 0.45, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformOrigin: 'left' }}
                className={`h-[3px] flex-1 rounded-full transition-all duration-300 ease-in-out ${
                  i < REFILL_LIMIT - used ? 'bg-primary/70' : 'bg-muted-foreground'
                }`}
              />
            ))}
          </div>

          <p className="mt-3.5 text-[11.5px] leading-[1.55] text-muted-foreground/85">
            {ru ? (
              <>
                Доступно {REFILL_LIMIT} рефилла в течение 48 часов после покупки — до{' '}
                <span className="tnum font-medium text-foreground/80">
                  {fullDate(windowEnd, lang)}
                </span>
                .
              </>
            ) : (
              <>
                {REFILL_LIMIT} refills within 48 hours of purchase — until{' '}
                <span className="tnum font-medium text-foreground/80">
                  {fullDate(windowEnd, lang)}
                </span>
                .
              </>
            )}
          </p>

          <motion.button
            type="button"
            onClick={() => canRefill && !refilling && setAskRefill(true)}
            aria-disabled={!canRefill || refilling}
            whileTap={canRefill ? { scale: 0.985 } : {}}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={`group mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold tracking-tight transition-all duration-300 ease-in-out ${
              canRefill
                ? 'bg-primary text-primary-foreground shadow-[inset_0_1px_0_color-mix(in_oklab,white_26%,transparent),0_10px_26px_-20px_color-mix(in_oklab,var(--primary)_80%,transparent)] hover:brightness-[1.04]'
                : 'border border-border/80 bg-transparent text-muted-foreground/70'
            }`}
          >
            <RotateCw
              className={`size-4 transition-transform duration-300 ease-in-out ${
                refilling ? 'animate-spin' : canRefill ? 'group-hover:-translate-y-px' : ''
              }`}
              strokeWidth={2.2}
            />
            <span>
              {refilling
                ? ru
                  ? 'Отправляем…'
                  : 'Submitting…'
                : ru
                  ? 'Запросить рефилл'
                  : 'Request refill'}
            </span>
          </motion.button>


          {!canRefill ? (
            <p className="mt-2.5 text-center text-[10.5px] text-muted-foreground/60">
              {!order.refillable
                ? ru
                  ? 'Для этой услуги рефилл не предусмотрен'
                  : 'Refill is not available for this service'
                : used >= REFILL_LIMIT
                  ? ru
                    ? 'Лимит рефиллов исчерпан'
                    : 'Refill limit reached'
                  : ru
                    ? 'Окно 48 часов закрыто'
                    : 'The 48-hour window has closed'}
            </p>
          ) : null}
        </div>
      </motion.section>


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

/* ── Timeline row ─────────────────────────────────────────────────────── */
function TimelineRow({
  tone,
  label,
  value,
  last,
  progress,
}: {
  tone: 'done' | 'live' | 'idle'
  label: string
  value: string
  last?: boolean
  progress?: boolean
}) {
  return (
    <li className={`relative ${last ? '' : 'pb-6'}`}>
      <span className="absolute -left-9 top-[2px] flex size-[14px] items-center justify-center">
        {tone === 'live' ? (
          <motion.span
            aria-hidden
            animate={{ scale: [1, 2.4], opacity: [0.35, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
            className="absolute size-[10px] rounded-full bg-primary/40"
          />
        ) : null}
        <span
          className={`relative flex size-[10px] items-center justify-center rounded-full ring-[3px] ring-card transition-all duration-300 ease-in-out ${
            tone === 'done'
              ? 'bg-success/20 text-success'
              : tone === 'live'
                ? 'bg-primary'
                : 'border border-border bg-card'
          }`}
        >
          {tone === 'done' ? <Check className="size-[7px]" strokeWidth={4} /> : null}
        </span>
      </span>

      <p
        className={`text-[13px] font-semibold leading-none tracking-tight transition-colors duration-300 ease-in-out ${
          tone === 'idle' ? 'text-muted-foreground' : ''
        }`}
      >
        {label}
      </p>
      <p className="tnum mt-1.5 text-[11.5px] leading-none text-muted-foreground/70">{value}</p>

      {progress ? (
        <span
          aria-hidden
          className="relative mt-2 block h-[2px] w-[92px] overflow-hidden rounded-full bg-border/60"
        >
          <motion.span
            className="absolute inset-y-0 w-1/3 rounded-full bg-linear-to-r from-transparent via-primary to-transparent"
            animate={{ x: ['-110%', '330%'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
          />
        </span>
      ) : null}
    </li>
  )
}



/* ── Followers target: X profile card with growth arrow ───────────────── */
function FollowersTarget({
  profile,
  handle,
  start,
  projected,
  live,
  done,
  ru,
}: {
  profile: XProfileRow | null
  handle: string
  start: number
  projected: number
  live: number
  done: boolean
  ru: boolean
}) {
  const p = profile && !profile.not_found ? profile : null
  const vt = (p?.verified_type ?? '').toLowerCase()
  const verifiedTone =
    p && (p.is_blue_verified || p.is_verified || vt)
      ? vt === 'business' || vt === 'organization'
        ? 'text-[#e2b719]'
        : vt === 'government'
          ? 'text-[#829aab]'
          : 'text-[#1d9bf0]'
      : null

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mt-3 overflow-hidden border-y border-white/10 bg-black sm:mx-4 sm:rounded-[26px] sm:border"
    >
      <div className="h-[78px] overflow-hidden bg-[#333639]">
        {p?.banner_url ? <img src={p.banner_url} alt="" className="size-full object-cover" /> : null}
      </div>

      <div className="px-4 pb-4">
        <div className="-mt-10 flex size-[72px] items-center justify-center overflow-hidden rounded-full border-[4px] border-black bg-[#1d1f23]">
          {p?.avatar_url ? (
            <img src={p.avatar_url} alt="" className="size-full object-cover" />
          ) : (
            <AurxMark className="size-[70%] opacity-90" />
          )}
        </div>

        <div className="mt-2">
          <p
            className="flex items-center gap-1 text-[19px] font-extrabold leading-tight tracking-[-0.01em] text-white"
            style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
          >
            <span className="min-w-0 truncate">{p?.name || handle || '—'}</span>
            {verifiedTone ? (
              <VerifiedBadge className={`size-[19px] shrink-0 ${verifiedTone}`} />
            ) : null}
          </p>
          <p className="text-[14px] leading-tight text-[#71767b]">@{handle || 'username'}</p>
        </div>

        {/* Followers: current → projected */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[9.5px] font-bold uppercase tracking-[0.22em] text-white/40">
            {ru ? 'Фолловеры' : 'Followers'}
          </p>
          {done ? (
            <div className="mt-1.5 flex items-baseline gap-2">
              <Digits value={live} className="font-display text-[26px] font-black text-white" />
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-success">
                <BadgeCheck className="size-3.5" />
                {ru ? 'доставлено' : 'delivered'}
              </span>
            </div>
          ) : (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="tnum font-display text-[22px] font-black leading-none text-white/85">
                {nf(start)}
              </span>
              <motion.span
                aria-hidden
                animate={{ x: [0, 5, 0], opacity: [0.55, 1, 0.55] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="text-primary"
              >
                <svg viewBox="0 0 34 12" className="h-3 w-8">
                  <path
                    d="M1 6h27M23 1.5 28.5 6 23 10.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.span>
              <motion.span
                animate={{ opacity: [0.75, 1, 0.75] }}
                transition={{ duration: 2.2, repeat: Infinity }}
                className="tnum font-display text-[22px] font-black leading-none text-primary"
              >
                {nf(projected)}
              </motion.span>
              <span className="text-[10.5px] font-semibold text-white/40">
                {ru ? '(примерно)' : '(approx.)'}
              </span>
            </div>
          )}
          {!done ? (
            <p className="mt-2 text-[10.5px] leading-relaxed text-white/45">
              {ru
                ? 'Значение обновится автоматически, как только заказ будет выполнен.'
                : 'The number updates automatically once the order is complete.'}
            </p>
          ) : null}
        </div>
      </div>
    </motion.section>
  )
}

/* ── Метрика поста, которую крутим ────────────────────────────────────── */
const METRIC_TINT: Record<string, string> = {
  reply: '#1d9bf0',
  reposts: '#00ba7c',
  likes: '#f91880',
  views: '#1d9bf0',
  bookmarks: '#1d9bf0',
}



/* ── Post target: tweet card ──────────────────────────────────────────── */
function PostTarget({
  tweet,
  missing,
  handle,
  url,
  ru,
  category,
  volume,
  done,
}: {
  tweet: XTweet | null
  missing: boolean
  handle: string
  url: string
  ru: boolean
  category: string
  volume: number
  done: boolean
}) {
  const p = tweet && !tweet.not_found ? tweet : null
  const href = url.startsWith('http') ? url : handle ? `https://x.com/${handle}` : null
  const loading = !p && !missing
  const tone = p ? verifiedTone(p) : null
  const text = p
    ? decodeTweetText(p.text)
        .replace(/\s*https:\/\/t\.co\/\w+\s*$/g, '')
        .trim()
    : ''
  const postedAt = p?.posted_at
    ? new Date(p.posted_at).toLocaleDateString(ru ? 'ru-RU' : 'en-US', {
        month: 'short',
        day: 'numeric',
      })
    : ''

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-4 mt-3 mb-5 overflow-hidden rounded-2xl border border-white/10 bg-black"
      style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
    >
      {loading ? (
        /* ── скелетон, пока подтягиваем пост ── */
        <div className="flex animate-pulse gap-3 px-4 py-3.5">
          <div className="size-11 shrink-0 rounded-full bg-white/[0.07]" />
          <div className="min-w-0 flex-1 space-y-2 pt-1">
            <div className="h-3 w-1/3 rounded-full bg-white/[0.07]" />
            <div className="h-3 w-full rounded-full bg-white/[0.05]" />
            <div className="h-3 w-4/5 rounded-full bg-white/[0.05]" />
            <div className="h-3 w-24 rounded-full bg-white/[0.04]" />
          </div>
        </div>
      ) : p ? (
        /* ── реальный пост: текст и метрики на всю ширину карточки ── */
        <div className="px-4 pt-3.5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-[40px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1d1f23]">
              {p.author_avatar_url ? (
                <img src={p.author_avatar_url} alt="" className="size-full object-cover" />
              ) : (
                <AurxMark className="size-[70%] opacity-90" />
              )}
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
              <span className="shrink-0 truncate text-[15px] leading-5 font-bold text-white">
                {p.author_name || handle || '—'}
              </span>
              {tone ? <VerifiedBadge className={`size-[16px] shrink-0 ${tone}`} /> : null}
              <span className="min-w-0 truncate text-[15px] leading-5 text-[#71767b]">
                @{p.author_username || handle}
              </span>
              {postedAt ? (
                <span className="shrink-0 whitespace-nowrap text-[15px] leading-5 text-[#71767b]">
                  · {postedAt}
                </span>
              ) : null}
            </div>
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full text-[#71767b]">
              <MoreHorizontal className="size-[18px]" strokeWidth={2} />
            </span>
          </div>

          {text ? (
            <p className="mt-2.5 whitespace-pre-wrap break-words text-[15px] leading-[21px] text-white">
              {text}
            </p>
          ) : null}

          <div className="mt-3 flex items-center gap-[18px] text-[#71767b]">
            {(
              [
                { key: 'reply', icon: MessageCircle, size: 16.5, value: p.reply_count ?? 0 },
                { key: 'reposts', icon: Repeat2, size: 17.5, value: p.retweet_count ?? 0 },
                { key: 'likes', icon: Heart, size: 16.5, value: p.like_count ?? 0 },
                { key: 'views', icon: BarChart3, size: 16.5, value: p.view_count ?? 0 },
                { key: 'bookmarks', icon: Bookmark, size: 16.5, value: p.bookmark_count ?? 0 },
              ] as const
            ).map((m) => {
              const Icon = m.icon
              const isTarget = m.key === category
              const active = isTarget && done
              const tint = METRIC_TINT[m.key]
              const value = active && isTarget ? m.value + volume : m.value
              return (
                <span
                  key={m.key}
                  className="flex shrink-0 items-center gap-1.5 whitespace-nowrap"
                  style={active ? { color: tint } : undefined}
                >
                  <Icon
                    className="shrink-0"
                    style={{ width: m.size, height: m.size }}
                    strokeWidth={1.7}
                    fill={active && (m.key === 'likes' || m.key === 'bookmarks') ? tint : 'none'}
                  />
                  {value > 0 ? (
                    <span
                      className={`text-[13px] leading-none tabular-nums ${active ? 'font-semibold' : ''}`}
                    >
                      {compactNumber(value)}
                    </span>
                  ) : null}
                </span>
              )
            })}
          </div>
        </div>



      ) : (
        /* ── превью недоступно: честный компактный блок ── */
        <div className="flex items-start gap-3 px-4 py-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
            <AurxMark className="size-[55%] opacity-70" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold leading-tight text-white">
              {ru ? 'Превью поста недоступно' : 'Post preview unavailable'}
            </p>
            <p className="mt-1 text-[12px] leading-snug text-white/45">
              {ru
                ? 'Заказ выполняется по ссылке, которую вы указали при оформлении.'
                : 'The order runs on the link you submitted at checkout.'}
            </p>
            {url ? (
              <p className="mt-2 truncate rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-white/55">
                {url}
              </p>
            ) : null}
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2.5 inline-block max-w-full truncate rounded-full border border-white/15 px-3 py-1 text-[11px] font-semibold text-white/70 active:scale-95"
              >
                {ru ? 'Открыть в X' : 'Open in X'}
              </a>
            ) : null}
          </div>
        </div>
      )}
    </motion.section>
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
        className="w-full max-w-[520px] rounded-t-[28px] border-t border-border bg-card px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-3"
      >
        <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-border" />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[17px] font-semibold leading-tight tracking-tight">
              {ru ? 'Запросить рефилл' : 'Request a refill'}
            </h3>
            <p className="mt-1.5 text-[12.5px] leading-[1.55] text-muted-foreground">
              {ru
                ? 'Дозакажем недостающие единицы и вернём заказ в работу.'
                : 'We top up the missing units and put the order back in progress.'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition-colors active:text-foreground"
          >
            <X className="size-[18px]" />
          </button>
        </div>

        <dl className="mt-5 space-y-2.5 border-t border-border/70 pt-4 text-[12.5px]">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">{ru ? 'Использовано' : 'Used'}</dt>
            <dd className="tnum font-medium">
              {used} <span className="text-muted-foreground/50">/ {REFILL_LIMIT}</span>
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
            className="h-[52px] rounded-[16px] border border-border/80 text-[13.5px] font-medium text-muted-foreground transition-colors active:bg-secondary/40"
          >
            {ru ? 'Отмена' : 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            className="h-[52px] rounded-[16px] bg-primary text-[13.5px] font-semibold tracking-tight text-primary-foreground shadow-[inset_0_1px_0_color-mix(in_oklab,white_28%,transparent),0_16px_34px_-24px_color-mix(in_oklab,var(--primary)_80%,transparent)] transition-transform active:scale-[0.985]"
          >
            {ru ? 'Подтвердить рефилл' : 'Confirm refill'}
          </button>
        </div>
      </motion.div>

    </motion.div>
  )
}

'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  LayoutGrid,
  Loader2,
  Search,
  ShieldCheck,
  ShoppingBag,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { money } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { formatDateLong, formatDateNumeric, formatTime } from '@/lib/datetime'
import { orderStatusAccent, orderStatusLabel } from '@/lib/order-status'
import { useAuth } from '@/lib/auth'
import { useNav } from '@/lib/nav'
import { useStore } from '@/lib/store'
import { isTestOrder, orderService } from '@/lib/order-service'
import { SERVICES } from '@/lib/data'
import { BOOST_MARKS, RegionMark, type BoostMarkId } from '../boost-icons'
import type { OrderStatus, Topup, TopupStatus } from '@/lib/types'
import { ScreenHeader } from '../screen-header'
import { TopupDetailsSheet } from '../topup-details-sheet'
import { CoinIcon } from '../ui/coin-icon'
import { XLogo } from '../x-logo'


type Tab = 'orders' | 'topups'

type Row =
  | {
      kind: 'order'
      id: string
      title: string
      date: number
      amount: number
      status: OrderStatus
      refillable: boolean
      itemKind: 'account' | 'boost'
    }
  | {
      kind: 'topup'
      id: string
      coin: string
      network: string
      date: number
      amount: number
      status: TopupStatus
    }

function dateKey(ts: number, lang: string) {
  const d = new Date(ts)
  const today = new Date()
  const yest = new Date()
  yest.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'today'
  if (d.toDateString() === yest.toDateString()) return 'yesterday'
  return formatDateLong(d, lang)
}

function timeOnly(ts: number, lang: string) {
  return formatTime(ts, lang)
}

function statusText(
  status: OrderStatus | TopupStatus,
  t: (k: string) => string,
  ru: boolean,
): string {
  switch (status) {
    case 'success':
      return t('topup_success')
    case 'pending':
      return t('topup_pending')
    case 'declined':
      return t('topup_declined')
    default:
      return orderStatusLabel(status, ru)
  }
}

export function HistoryScreen() {
  const { t, lang } = useI18n()
  const ru = lang === 'ru'
  const { back, param } = useNav()
  const navigate = useNavigate()
  const { orders, topups } = useStore()
  const [openTopupId, setOpenTopupId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [kindFilter, setKindFilter] = useState<'all' | 'account' | 'boost'>('all')

  const tab: Tab = param === 'topups' ? 'topups' : 'orders'

  const openTopup: Topup | null = useMemo(
    () => topups.find((tp) => tp.id === openTopupId) ?? null,
    [openTopupId, topups],
  )


  const orderRows = useMemo(
    () =>
      orders
        .filter((o) => o.paid)
        .sort((a, b) => b.date - a.date),
    [orders],
  )

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase()
    return orderRows.filter((o) => {
      if (kindFilter !== 'all' && o.kind !== kindFilter) return false
      if (!q) return true
      return (
        o.title.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        (o.orderRef ?? '').toLowerCase().includes(q)
      )
    })
  }, [orderRows, kindFilter, query])

  const rows: Row[] = useMemo(() => {
    if (tab === 'orders') return []
    return topups
      .map<Row>((tp) => ({
      kind: 'topup',
      id: tp.id,
      coin: tp.coin,
      network: tp.network,
      date: tp.date,
      amount: tp.amount,
      status: tp.status,
      }))
      .sort((a, b) => b.date - a.date)
  }, [tab, orders, topups])

  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>()
    for (const r of rows) {
      const k = dateKey(r.date, lang)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(r)
    }
    // Newest day first; rows inside a day are already sorted newest-first.
    return Array.from(map.entries()).sort(
      (a, b) => (b[1][0]?.date ?? 0) - (a[1][0]?.date ?? 0),
    )
  }, [rows])


  return (
    <div>
      <ScreenHeader title={t('history_title')} onBack={back} />

      {tab === 'orders' ? (
        <div className="px-4 pt-5">
          <div className="mb-1 flex items-center gap-2">
            <motion.div
              aria-hidden
              animate={{ rotate: [0, 8, 0, -8, 0], scale: [1, 1.08, 1, 1.08, 1] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="flex size-5 items-center justify-center"
            >
              <LayoutGrid className="size-5 text-primary drop-shadow-[0_0_8px_rgba(255,215,0,0.35)]" />
            </motion.div>
            <h1 className="text-[22px] font-bold leading-none">{t('my_orders_title')}</h1>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">{t('my_orders_sub')}</p>

          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('orders_search_ph')}
              className="h-11 w-full rounded-xl border border-white/8 bg-card/60 pl-9 pr-3 text-[13px] outline-none placeholder:text-muted-foreground/70 focus:border-primary/40"
            />
          </div>

          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex min-w-0 gap-2 overflow-x-auto">
              {(
                [
                  ['all', t('filter_all')],
                  ['account', t('filter_accounts')],
                  ['boost', t('filter_promo')],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setKindFilter(k)}
                  className={`shrink-0 rounded-lg px-3.5 py-1.5 text-[12px] font-bold transition-all active:scale-[0.97] ${
                    kindFilter === k
                      ? 'bg-gold-gradient text-[#111] shadow-[0_4px_14px_-4px_rgba(255,215,0,0.45)]'
                      : 'bg-secondary text-muted-foreground hover:bg-white/[0.08] hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="shrink-0 text-[11px] text-muted-foreground/70">
              {filteredOrders.length} {t('orders_count')}
            </span>
          </div>

          {filteredOrders.length === 0 ? (
            <EmptyState icon={ShoppingBag} label={query ? t('orders_none_found') : t('no_paid_orders')} />
          ) : (
            <div className="sm:overflow-hidden sm:rounded-2xl sm:border sm:border-white/[0.06] sm:bg-card/40">
              <div className="hidden items-center gap-3 border-b border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 sm:flex">
                <span className="flex-1">{t('col_order')}</span>
                <span className="w-24 text-center">{t('col_warranty')}</span>
                <span className="w-24 text-center">{t('col_status')}</span>
                <span className="w-20 text-right">{t('col_amount')}</span>
                <span className="w-4" />
              </div>
              <div className="space-y-2.5 sm:space-y-0 sm:divide-y sm:divide-white/[0.05]">
                {filteredOrders.map((o, i) => (
                  <OrderRow
                    key={o.id}
                    order={o}
                    index={i}
                    statusLabel={statusText(o.status, t, ru)}
                    tagLabel={o.kind === 'account' ? t('tag_tw_accounts') : t('filter_promo')}
                    expiredLabel={t('warranty_expired')}
                    onOpen={() => void navigate({ to: '/order/$id', params: { id: o.id } })}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {tab === 'topups' ? (
      <div className="px-4 pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {rows.length === 0 ? (
              <EmptyState icon={Clock} label={t('no_topups')} />
            ) : (
              <div className="space-y-7">
                {grouped.map(([day, list]) => (
                  <section key={day}>
                    <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80">
                      {day === 'today'
                        ? (t('today') ?? 'Today')
                        : day === 'yesterday'
                          ? (t('yesterday') ?? 'Yesterday')
                          : day}
                    </h2>
                    <div className="space-y-2">
                      {list.map((r, i) => {
                        const clickable = true
                        const open = () => {
                          if (r.kind === 'topup') setOpenTopupId(r.id)
                          else void navigate({ to: '/order/$id', params: { id: r.id } })
                        }
                        return (
                          <motion.div
                            key={r.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            onClick={clickable ? open : undefined}
                            role={clickable ? 'button' : undefined}
                            tabIndex={clickable ? 0 : undefined}
                            onKeyDown={
                              clickable
                                ? (e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault()
                                      open()
                                    }
                                  }
                                : undefined
                            }
                            className={`flex items-center gap-4 rounded-2xl border border-white/5 bg-card/60 p-4 transition-transform ${clickable ? 'cursor-pointer active:scale-[0.99] hover:border-white/10' : ''}`}
                          >
                            {r.kind === 'topup' ? (
                              <TopupContent
                                row={r}
                                statusLabel={statusText(r.status, t, ru)}
                              />
                            ) : null}
                          </motion.div>
                        )
                      })}
                    </div>
                  </section>
                ))}
              </div>


            )}
          </motion.div>
        </AnimatePresence>
      </div>
      ) : null}

      <TopupDetailsSheet topup={openTopup} onClose={() => setOpenTopupId(null)} />
    </div>
  )
}


/* ------------ Rows ------------ */

function useCountdown(until?: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!until) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [until])
  if (!until) return null
  const ms = until - now
  if (ms <= 0) return { text: 'expired' as const, ms: 0 }
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const p = (n: number) => String(n).padStart(2, '0')
  return { text: `${p(h)}:${p(m)}:${p(s)}`, ms }
}

/** Warranty countdown color: >12h green, 6–12h amber, <6h red, expired grey. */
function guaranteeTone(ms: number) {
  const h = ms / 3_600_000
  if (ms <= 0) return 'text-muted-foreground/50'
  if (h > 12) return 'text-success'
  if (h > 6) return 'text-primary'
  return 'text-destructive'
}


/** Compact follower/like count for boost order titles: 11100 → 11.1К. */
function compactQty(n: number, lang: 'ru' | 'en') {
  const k = lang === 'ru' ? 'К' : 'K'
  const m = lang === 'ru' ? 'М' : 'M'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}${m}`
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}${k}`
  return String(n)
}

/** Round dark X mark for aged/old accounts. */
function AgedMark({ className = 'size-10' }: { className?: string }) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full border border-white/[0.1] bg-[radial-gradient(120%_120%_at_50%_0%,rgba(255,255,255,0.14),rgba(10,10,12,0.98))] shadow-[0_6px_16px_-10px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.14)] ${className}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-2 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-white/35 to-transparent"
      />
      <div className="flex size-full items-center justify-center">
        <XLogo className="size-[42%] text-foreground" />
      </div>
    </div>
  )
}

/** Catalog logo for the "Аккаунт под ключ" (custom) service. */
function CustomMark({ className = 'size-11' }: { className?: string }) {

  const rows = [
    { y: 6, cls: 'knob-a' },
    { y: 12, cls: 'knob-b' },
    { y: 18, cls: 'knob-c' },
  ]
  return (
    <div
      className={`slider-icon relative shrink-0 overflow-hidden rounded-2xl border border-info/30 bg-info/10 text-info ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="relative size-full p-2"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      >
        {rows.map((r) => (
          <g key={r.y}>
            <line x1={3} y1={r.y} x2={21} y2={r.y} className="opacity-20" />
            <line
              x1={3}
              y1={r.y}
              x2={21}
              y2={r.y}
              pathLength={1}
              className={`slider-fill ${r.cls} opacity-70`}
            />
            <circle
              cx={0}
              cy={r.y}
              r={2.6}
              fill="currentColor"
              stroke="none"
              className={`slider-knob ${r.cls}`}
            />
          </g>
        ))}
      </svg>
    </div>
  )
}

/** Resolve the purchased boost service so the order card shows its catalog logo. */
function boostVisual(order: import('@/lib/types').Order) {
  if (order.kind !== 'boost') return null
  const svc =
    SERVICES.find((s) => s.id === order.serviceId) ??
    SERVICES.find((s) => Object.values(s.name).some((n) => n === order.title))
  if (!svc) return null
  const region = svc.categoryId === 'followers' ? svc.region : undefined
  if (region) {
    return { render: (cls: string) => <RegionMark region={region} className={cls} /> }
  }
  const Mark = BOOST_MARKS[svc.categoryId as BoostMarkId]
  if (!Mark) return null
  return { render: (cls: string) => <Mark className={cls} /> }
}

/**
 * Older boost orders stored the number of targets (usually 1) in `qty`.
 * Recover the purchased volume from the paid amount and catalog rate so those
 * existing orders show the quantity too, without requiring a new purchase.
 */
function boostOrderQty(order: import('@/lib/types').Order) {
  if (order.kind !== 'boost') return null
  if (order.qty && order.qty > 1) return order.qty
  const service =
    SERVICES.find((item) => item.id === order.serviceId) ??
    SERVICES.find((item) => Object.values(item.name).some((name) => name === order.title))
  if (!service || service.pricePer1000 <= 0 || order.amount <= 0) return null
  const inferred = Math.round((order.amount / service.pricePer1000) * 1000)
  return inferred >= service.min && inferred <= service.max ? inferred : null
}

/**
 * Titles that already carry a quantity suffix (e.g. "Аккаунт под ключ · 11.3К")
 * are split so the number renders in gold like boost orders do.
 */
function splitTitleQty(title: string): { base: string; qty: string | null } {
  const match = title.match(/^(.*\S)\s*[·•]\s*([\d\s.,]+[KkКк]?)$/)
  if (!match) return { base: title, qty: null }
  return { base: match[1], qty: match[2].trim() }
}

function OrderRow({
  order,
  index,
  statusLabel,
  tagLabel,
  expiredLabel,
  onOpen,
}: {
  order: import('@/lib/types').Order
  index: number
  statusLabel: string
  tagLabel: string
  expiredLabel: string
  onOpen: () => void
}) {
  const { lang } = useI18n()
  const { isAdmin } = useAuth()
  const cd = useCountdown(order.guaranteeUntil)
  const boost = boostVisual(order)
  const isCustom = orderService(order) === 'custom'
  const boostQty = boostOrderQty(order)
  const titleParts = splitTitleQty(order.title)
  const qtyLabel = boostQty
    ? compactQty(boostQty, lang === 'ru' ? 'ru' : 'en')
    : titleParts.qty

  const done = order.status === 'completed'
  const live = order.status === 'in_progress' || order.status === 'refilling'
  const accent = orderStatusAccent(order.status)

  const dateStr = `${formatDateNumeric(order.date, lang)} ${timeOnly(order.date, lang)}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.24) }}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className="group relative cursor-pointer overflow-hidden rounded-[18px] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012))] p-3.5 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.9)] transition-all active:scale-[0.985] hover:border-white/[0.12] sm:rounded-none sm:border-x-0 sm:border-t-0 sm:border-b sm:bg-transparent sm:p-0 sm:px-4 sm:py-3.5 sm:shadow-none sm:hover:bg-white/[0.03]"
    >
      {/* Mobile card layout — compact premium */}
      <div className="sm:hidden">
        <span
          aria-hidden
          className="absolute inset-y-2 left-0 w-[3px] rounded-r-full transition-colors duration-300"
          style={{ background: accent.rail, boxShadow: accent.glow }}
        />

        <div className="flex items-start gap-3 pl-1.5">
          <div
            className={`relative flex size-11 shrink-0 items-center justify-center ${
              boost || isCustom || order.kind === 'account'
                ? ''
                : 'rounded-2xl border border-primary/25 bg-[linear-gradient(145deg,rgba(255,215,0,0.18),rgba(255,215,0,0.03))]'
            }`}
          >
            {isCustom ? (
              <CustomMark className="size-10" />
            ) : order.kind === 'account' ? (
              <AgedMark className="size-10" />
            ) : boost ? (
              boost.render('size-11')
            ) : done ? (
              <CheckCircle2 className="size-[20px]" style={{ color: accent.color }} />
            ) : live ? (
              <Loader2
                className="size-[20px] animate-spin"
                style={{ color: accent.color }}
              />
            ) : (
              <Zap className="size-[20px]" style={{ color: accent.color }} />
            )}
          </div>


          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-start gap-2">
              <h3 className="min-w-0 flex-1 text-[14.5px] font-semibold leading-[1.3] [overflow-wrap:anywhere]">
                {titleParts.base}
                {qtyLabel ? (
                  <>
                    <span className="mx-1 text-muted-foreground/50">•</span>
                    <span className="font-bold tabular-nums text-primary">{qtyLabel}</span>
                  </>
                ) : null}
              </h3>
              <p className="shrink-0 text-[16px] font-extrabold tabular-nums leading-tight">
                {money(order.amount)}
              </p>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-muted-foreground/80">
              <span className="whitespace-nowrap tabular-nums">{dateStr}</span>
              <span className="opacity-40">•</span>
              <span>{tagLabel}</span>
              {!qtyLabel && order.qty && order.qty > 1 ? (
                <span className="font-bold tabular-nums text-primary">×{order.qty}</span>
              ) : null}
              {isAdmin && isTestOrder(order) ? (
                <span className="rounded-md border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-warning">
                  test
                </span>
              ) : null}
            </div>
          </div>
        </div>


        <div className="mt-3 flex items-center gap-2 border-t border-white/[0.05] pt-2.5">
          <StatusBadge label={statusLabel} status={order.status} />
          {cd ? (
            <span
              className={`flex items-center gap-1 font-mono text-[11px] tabular-nums ${guaranteeTone(cd.ms)}`}
            >
              <ShieldCheck className="size-3" />
              {cd.text === 'expired' ? expiredLabel : cd.text}
            </span>
          ) : null}
          <span className="ml-auto flex items-center gap-0.5 text-[11px] font-semibold text-muted-foreground/60">
            <ChevronRight className="size-4" />
          </span>
        </div>
      </div>

      {/* Desktop table layout */}
      <div className="hidden items-center gap-3 sm:flex">
        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-full ${isCustom || order.kind === 'account' ? '' : 'bg-white/[0.04]'}`}
        >
          {isCustom ? (
            <CustomMark className="size-[34px] rounded-xl" />
          ) : order.kind === 'account' ? (
            <AgedMark className="size-[34px]" />
          ) : boost ? (
            boost.render('size-[32px]')
          ) : live ? (
            <Loader2 className="size-[18px] animate-spin" style={{ color: accent.color }} />
          ) : done ? (
            <CheckCircle2 className="size-[18px]" style={{ color: accent.color }} />
          ) : (
            <Zap className="size-[18px]" style={{ color: accent.color }} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="text-[14px] font-semibold leading-snug break-words">
              {titleParts.base}
              {qtyLabel ? (
                <>
                  <span className="mx-1 text-muted-foreground/50">•</span>
                  <span className="font-bold tabular-nums text-primary">{qtyLabel}</span>
                </>
              ) : null}
            </h3>
            {!qtyLabel && order.qty && order.qty > 1 ? (
              <span className="shrink-0 rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                ×{order.qty}
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="tabular-nums">{dateStr}</span>
            <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[10px]">{tagLabel}</span>
          </div>
        </div>

        <div className="hidden w-24 justify-center sm:flex">
          {cd ? (
            <span
              className={`flex items-center gap-1 font-mono text-[12px] ${guaranteeTone(cd.ms)}`}
            >
              <ShieldCheck className="size-3.5" />
              {cd.text === 'expired' ? expiredLabel : cd.text}
            </span>
          ) : (
            <span className="text-[12px] text-muted-foreground/40">—</span>
          )}
        </div>

        <div className="hidden w-24 justify-center sm:flex">
          <StatusBadge label={statusLabel} status={order.status} />
        </div>

        <div className="shrink-0 text-right sm:w-20">
          <p className="text-[14px] font-bold tabular-nums">{money(order.amount)}</p>
        </div>

        <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
      </div>
    </motion.div>
  )
}

function StatusBadge({ label, status }: { label: string; status: OrderStatus }) {
  const accent = orderStatusAccent(status)
  const animated = status === 'in_progress' || status === 'refilling'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[11px] font-semibold ring-1 transition-colors duration-300 ${accent.badgeClass}`}
    >
      <span className="relative flex size-1.5 items-center justify-center">
        {animated ? (
          <span className="absolute inline-flex size-1.5 animate-ping rounded-full bg-current opacity-60" />
        ) : null}
        <span className="relative size-1.5 rounded-full bg-current" />
      </span>
      {label}
    </span>
  )
}
function TopupContent({
  row,
  statusLabel,
}: {
  row: Extract<Row, { kind: 'topup' }>
  statusLabel: string
}) {
  const { lang } = useI18n()
  const positive = row.status === 'success'
  const declined = row.status === 'declined'

  const amountColor = declined
    ? 'text-muted-foreground line-through'
    : positive
      ? 'text-[#4ade80]'
      : ''

  const statusColor = declined
    ? 'text-destructive'
    : positive
      ? 'text-success'
      : 'text-warning'

  return (
    <>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/[0.04]">
        <CoinIcon symbol={row.coin} network={row.network} className="size-8" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[15px] font-semibold">{row.coin}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {timeOnly(row.date, lang)} <span className="opacity-60">•</span>{' '}
          <span className={statusColor}>{statusLabel}</span>
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-[15px] font-bold tabular-nums ${amountColor}`}>
          {positive ? '+' : ''}
          {money(row.amount)}
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground/70">{row.network}</p>
      </div>
    </>
  )
}

/* ------------ Glyphs ------------ */

function AccountGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 text-primary" fill="none">
      <path
        d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 20c0-3.314 3.582-6 8-6s8 2.686 8 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function BoostGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 text-primary" fill="currentColor">
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  )
}

/* ------------ Empty ------------ */

function EmptyState({
  icon: Icon,
  label,
}: {
  icon: typeof ShoppingBag
  label: string
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-3xl bg-card">
        <Icon className="size-7 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

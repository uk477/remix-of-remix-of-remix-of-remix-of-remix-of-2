'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  CreditCard,
  FlaskConical,
  ShoppingBag,
  Tag,
  Trash2,
  Wallet,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { createFollowHubOrder } from '@/lib/followhub.functions'
import { OTHER_SERVICES, SERVICES } from '@/lib/data'
import { money } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { useNav } from '@/lib/nav'
import { useStore } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { addTestOrder, makeTestOrder } from '@/lib/demo-orders'
import type { BoostService, Order } from '@/lib/types'
import { getBoostStatuses } from '@/lib/boost-status.functions'
import { AUDIENCES, type Audience } from '@/lib/custom-account'
import { ScreenHeader } from '../screen-header'
import { useToast } from '../toast'
import { CoinIcon } from '../ui/coin-icon'
import { XButton } from '../ui/x-button'
import { BOOST_MARKS, RegionMark, type BoostMarkId } from '../boost-icons'
import { BoostUnavailableSheet } from '../boost-unavailable-sheet'
import { XLogo } from '../x-logo'
import { CustomAccountSheet, CustomAccountConfirmSheet } from '../custom-account-builder'

function StaticServiceLogo({ service }: { service: BoostService }) {
  if (service.categoryId === 'followers' && service.region) {
    return <RegionMark region={service.region} className="size-10" />
  }
  const Mark = BOOST_MARKS[service.categoryId as BoostMarkId]
  return Mark ? <Mark className="size-10" /> : null
}

function StaticRegionLogo({
  region,
  className,
}: {
  region: NonNullable<BoostService['region']>
  className?: string
}) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <defs>
        <linearGradient id={`cart-region-${region}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F5D67A" />
          <stop offset="55%" stopColor="#E4B24A" />
          <stop offset="100%" stopColor="#A97514" />
        </linearGradient>
        <clipPath id={`cart-region-${region}-clip`}>
          <circle cx="60" cy="60" r="39" />
        </clipPath>
      </defs>
      <circle cx="60" cy="60" r="52" fill="#100B06" />
      <circle cx="60" cy="60" r="43" fill={`url(#cart-region-${region})`} opacity="0.18" />
      {region === 'global' && (
        <>
          <circle cx="60" cy="60" r="39" fill="#0B0704" />
          <g clipPath={`url(#cart-region-${region}-clip)`}>
            <circle cx="60" cy="60" r="39" fill={`url(#cart-region-${region})`} opacity="0.35" />
            <path d="M36 42c5-4 10-3 12 2 1 6-3 10-6 14-2 4 1 8 4 10-4 4-10 3-14-2-2-6-1-14 4-24z" fill="#F5D67A" opacity="0.9" />
            <path d="M62 40c6-2 12 2 12 8 0 4-3 6-6 8 1 6 4 10 3 16-2 6-8 6-12 2-3-4-3-10-1-14-3-4-4-12 4-20z" fill="#E4B24A" />
            <path d="M84 50c4 0 8 4 6 8-2 4-8 4-10 2zM82 74c3-1 7 1 7 4 0 3-4 4-7 3z" fill="#F5D67A" opacity="0.85" />
            {[-22, -8, 8, 22].map((offset) => (
              <ellipse key={offset} cx="60" cy={60 + offset} rx="36" ry="4" fill="none" stroke="#F5D67A" strokeWidth="0.8" opacity="0.35" />
            ))}
            {[20, 38, 56, 74, 92].map((x) => (
              <ellipse key={x} cx="60" cy="60" rx={Math.abs(x - 60) / 1.15} ry="39" fill="none" stroke="#F5D67A" strokeWidth="0.65" opacity="0.22" />
            ))}
          </g>
          <circle cx="60" cy="60" r="39" fill="none" stroke={`url(#cart-region-${region})`} strokeWidth="2" />
        </>
      )}
      {region === 'jp' && (
        <>
          <circle cx="60" cy="60" r="39" fill="#F5EFDF" />
          <circle cx="60" cy="60" r="16" fill="#BC2626" />
          <circle cx="60" cy="60" r="39" fill="none" stroke={`url(#cart-region-${region})`} strokeWidth="2" />
        </>
      )}
      {region === 'kr' && (
        <>
          <circle cx="60" cy="60" r="39" fill="#F5EFDF" />
          <path d="M60 46a14 14 0 0 1 0 28 7 7 0 0 0 0-14 7 7 0 0 1 0-14z" fill="#C9451F" />
          <path d="M60 74a14 14 0 0 1 0-28 7 7 0 0 0 0 14 7 7 0 0 1 0 14z" fill="#1E3A5F" />
          <g stroke="#0F0A05" strokeWidth="1.7" strokeLinecap="round">
            <line x1="30" y1="36" x2="42" y2="36" /><line x1="30" y1="40" x2="42" y2="40" /><line x1="30" y1="44" x2="42" y2="44" />
            <line x1="78" y1="76" x2="83" y2="76" /><line x1="87" y1="76" x2="92" y2="76" /><line x1="78" y1="80" x2="83" y2="80" /><line x1="87" y1="80" x2="92" y2="80" /><line x1="78" y1="84" x2="83" y2="84" /><line x1="87" y1="84" x2="92" y2="84" />
          </g>
          <circle cx="60" cy="60" r="39" fill="none" stroke={`url(#cart-region-${region})`} strokeWidth="2" />
        </>
      )}
      {region === 'us' && (
        <>
          <g clipPath={`url(#cart-region-${region}-clip)`}>
            {Array.from({ length: 13 }).map((_, i) => <rect key={i} x="21" y={21 + i * 6} width="78" height="6" fill={i % 2 === 0 ? '#C9302C' : '#F5EFDF'} />)}
            <rect x="21" y="21" width="41" height="42" fill="#1E3A5F" />
            {Array.from({ length: 18 }).map((_, i) => <circle key={i} cx={27 + (i % 6) * 5.5} cy={27 + Math.floor(i / 6) * 10} r="1.2" fill="#F5EFDF" />)}
          </g>
          <circle cx="60" cy="60" r="39" fill="none" stroke={`url(#cart-region-${region})`} strokeWidth="2" />
        </>
      )}
    </svg>
  )
}

function StaticCategoryLogo({ category, className }: { category: BoostService['categoryId']; className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden fill="none">
      <circle cx="60" cy="60" r="50" fill="currentColor" opacity="0.12" />
      <circle cx="60" cy="60" r="42" stroke="currentColor" strokeWidth="3" opacity="0.55" />
      {category === 'likes' && <path d="M60 86C38 72 28 59 34 45c5-11 20-10 26 2 6-12 21-13 26-2 6 14-4 27-26 41z" fill="currentColor" />}
      {category === 'views' && <><path d="M22 60s14-24 38-24 38 24 38 24-14 24-38 24-38-24-38-24z" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" /><circle cx="60" cy="60" r="12" fill="currentColor" /></>}
      {category === 'reposts' && <><path d="M34 45h38c8 0 14 6 14 14v6" stroke="currentColor" strokeWidth="9" strokeLinecap="round" /><path d="m74 55 12 12 12-12" stroke="currentColor" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" /><path d="M86 75H48c-8 0-14-6-14-14v-6" stroke="currentColor" strokeWidth="9" strokeLinecap="round" /><path d="M46 65 34 53 22 65" stroke="currentColor" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" /></>}
      {category === 'bookmarks' && <path d="M39 28h42a4 4 0 0 1 4 4v62L60 78 35 94V32a4 4 0 0 1 4-4z" fill="currentColor" />}
      {category === 'followers' && <><circle cx="60" cy="48" r="13" fill="currentColor" /><path d="M35 84c5-15 16-23 25-23s20 8 25 23" stroke="currentColor" strokeWidth="9" strokeLinecap="round" /><circle cx="34" cy="48" r="8" fill="currentColor" opacity="0.65" /><circle cx="86" cy="48" r="8" fill="currentColor" opacity="0.65" /></>}
    </svg>
  )
}

export function CartScreen() {
  const { t, lang } = useI18n()
  const { go } = useNav()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const {
    cart,
    removeFromCart,
    cartTotal,
    balance,
    setBalance,
    applyServerBalance,
    clearCart,
    addOrder,
    registerServerOrder,
    editingCustomKey,
    setEditingCustomKey,
  } = useStore()

  const [confirmingCustomKey, setConfirmingCustomKey] = useState<string | null>(null)
  const { show } = useToast()

  const total = cartTotal
  const enough = balance >= total

  const getStatuses = useServerFn(getBoostStatuses)
  const statusQ = useQuery({
    queryKey: ['boost-statuses'],
    queryFn: () => getStatuses(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  const statusMap = useMemo(() => {
    const m: Record<string, boolean> = {}
    for (const s of statusQ.data?.statuses ?? []) {
      const key = s.region === '_all' ? s.subcategory_id : `${s.subcategory_id}:${s.region}`
      m[key] = s.is_available
    }
    return m
  }, [statusQ.data])

  const isAudienceUp = (a: Audience) =>
    statusMap['followers'] !== false && statusMap[`followers:${a.region}`] !== false

  const [notifyOpen, setNotifyOpen] = useState(false)
  const [notifyAudience, setNotifyAudience] = useState<{ region: string; label: string } | null>(null)

  function onAudienceDown(a: Audience | null) {
    if (!a) return
    setNotifyAudience({ region: a.region, label: a.label[lang === 'en' ? 'en' : 'ru'] })
    setNotifyOpen(true)
  }

  function openItem(refId: string, key: string, kind: 'boost' | 'account') {
    if (refId === 'custom_account') {
      setConfirmingCustomKey(key)
      return
    }
    if (SERVICES.some((s) => s.id === refId)) {
      go('catalog', refId, key)
    } else if (OTHER_SERVICES.some((s) => s.id === refId)) {
      go('services', refId, key)
    } else if (kind === 'account') {
      go('accounts')
    } else {
      go('catalog')
    }
  }

  async function checkoutBalance() {
    if (!enough) {
      show(t('not_enough'))
      go('topup')
      return
    }

    // Заказы продвижения оформляет backend (списание баланса + FollowHub),
    // остальные позиции остаются на прежнем локальном пути оплаты.
    const providerOrders: Order[] = []
    const localOrders: Order[] = []
    let serverBalance: number | null = null
    let localTotal = 0

    try {
      for (const item of cart) {
        const custom = item.refId === 'custom_account'
        const service =
          item.kind === 'boost' ? SERVICES.find((candidate) => candidate.id === item.refId) : undefined

        if (service) {
          const targets = (item.meta?.['targets'] ?? '')
            .split(/[\n,]+/)
            .map((target) => target.trim())
            .filter(Boolean)
          const quantity = Number(item.meta?.['amount'] ?? service.min)
          const result = await createFollowHubOrder({
            data: {
              localOrderId: `FH-${crypto.randomUUID()}`,
              serviceId: service.id,
              category: service.categoryId,
              title: item.title,
              quantity,
              targets,
              ...(item.meta?.['start_followers']
                ? { startFollowers: Number(item.meta['start_followers']) || 0 }
                : {}),
            },
          })
          serverBalance = result.balance
          providerOrders.push({
            id: result.localOrderId,
            date: result.createdAt || Date.now(),
            title: item.title,
            amount: result.amount,
            status: 'in_progress',
            refillable: service.refill,
            kind: 'boost',
            paid: true,
            qty: quantity,
            serviceId: service.id,
            orderRef: result.providerOrderId,
            ...(targets[0] ? { target: targets[0] } : {}),
            ...(item.meta?.['start_followers']
              ? { startFollowers: Number(item.meta['start_followers']) || 0 }
              : {}),
          })
          continue
        }

        localTotal += item.total
        localOrders.push({
          id: `FH-${Math.floor(10000 + Math.random() * 89999)}`,
          date: Date.now(),
          title: item.title,
          amount: item.total,
          status: custom ? 'in_progress' : item.kind === 'account' ? 'completed' : 'in_progress',
          refillable: item.kind === 'boost',
          kind: item.kind,
          paid: true,
          qty: item.qty ?? 1,
          serviceId: item.refId,
          ...(item.meta?.['targets']
            ? { target: item.meta['targets'].split('\n')[0]!.trim() }
            : {}),
          ...(item.meta?.['start_followers']
            ? { startFollowers: Number(item.meta['start_followers']) || 0 }
            : {}),
          ...(custom && item.meta ? { customAccount: item.meta, progressStep: 1 } : {}),
        })
      }

      // Серверное списание уже применено к балансу; локальные позиции
      // доплачиваем прежним путём поверх актуального значения.
      if (serverBalance !== null) applyServerBalance(serverBalance)
      if (localTotal > 0) setBalance((prev) => prev - localTotal)
      providerOrders.forEach((order) => registerServerOrder(order))
      localOrders.forEach((order) => addOrder(order))
      clearCart()
      show(t('payment_success'))
    } catch (error) {
      // Уже принятые backend-заказы остаются в силе: показываем их и баланс.
      if (serverBalance !== null) applyServerBalance(serverBalance)
      providerOrders.forEach((order) => registerServerOrder(order))
      show(error instanceof Error ? error.message : 'Не удалось оформить заказ')
    }
  }

  function checkoutTest() {
    const first = cart[0]
    if (!first) return
    let firstId: string | null = null
    cart.forEach((item) => {
      const order = makeTestOrder({
        title: item.title,
        amount: item.total,
        qty: (item as any).qty ?? 1,
        kind: item.kind,
        refId: item.refId,
        meta: item.meta,
      })
      addTestOrder(order)
      // Keep the instant local test flow, but also persist it for this account.
      // This prevents orders disappearing when local preview storage is reset.
      addOrder(order)
      if (!firstId && item.kind === 'account') firstId = order.id
    })
    clearCart()
    show(lang === 'ru' ? 'Тестовая оплата прошла' : 'Test payment done')
    if (firstId) void navigate({ to: '/order/$id', params: { id: firstId } })
  }

  if (cart.length === 0) {
    return (
      <div>
        <ScreenHeader title={t('nav_cart')} />
        <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
          <div className="mb-5 flex size-20 items-center justify-center rounded-3xl bg-card">
            <ShoppingBag className="size-9 text-muted-foreground" />
          </div>
          <p className="text-xl font-extrabold tracking-tight">{t('cart_empty')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('cart_empty_sub')}</p>
          <XButton variant="solid" size="md" className="mt-6" onClick={() => go('home')}>
            {t('go_to_store')}
          </XButton>
        </div>
      </div>
    )
  }

  return (
    <div>
      <ScreenHeader title={t('nav_cart')} onBack={() => go('home')} />
      <div className="flex min-h-[calc(100dvh-68px)] flex-col px-4 pb-6 pt-4">
        {/* Items */}
        <div className="flex flex-col gap-2.5">
          <AnimatePresence initial={false}>
            {cart.map((item) => {
              const boostSvc = SERVICES.find((s) => s.id === item.refId)
              const platformLabel =
                item.kind === 'account'
                  ? item.refId === 'custom_account'
                    ? 'TWITTER · CUSTOM'
                    : 'TWITTER · AGED'
                  : boostSvc
                    ? 'TWITTER · BOOST'
                    : t('other_services_title')
              return (
                <motion.div
                  key={item.key}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  className="flex items-stretch gap-3 rounded-2xl border border-border bg-card p-3.5"
                >
                  <button
                    type="button"
                    onClick={() => openItem(item.refId, item.key, item.kind)}
                    aria-label={lang === 'ru' ? 'Изменить заказ' : 'Edit order'}
                    className="group flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-80"
                  >
                    <div className="relative flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                      {boostSvc ? (
                        <StaticServiceLogo service={boostSvc} />
                      ) : item.kind === 'account' ? (
                        <XLogo className="size-6 text-primary" />
                      ) : item.kind === 'boost' ? (
                        <Tag className="size-5 text-primary" />
                      ) : (
                        <ShoppingBag className="size-5 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-primary/80">
                        {platformLabel}
                      </p>
                      <p className="line-clamp-2 text-sm font-semibold leading-snug">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        <span className="truncate">{item.subtitle}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{money(item.total)}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => removeFromCart(item.key)}
                    aria-label={t('remove')}
                    className="flex size-8 shrink-0 self-center items-center justify-center rounded-lg bg-secondary text-muted-foreground active:scale-90"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
          </div>

          {/* Checkout panel */}
          <div className="mt-auto pt-4">
            <div className="border-t border-border bg-background pt-3.5">
              <div className="mb-3 space-y-1.5">
                <Row label={t('subtotal')} value={money(cartTotal)} muted />
                <Row label={t('total')} value={money(total)} bold />
              </div>
              <div className="flex gap-2.5">
                <button
                  onClick={checkoutBalance}
                  className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl bg-primary py-2.5 text-primary-foreground active:scale-95"
                >
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    <Wallet className="size-4" />
                    {t('use_balance')}
                  </span>
                  <span className="text-[10px] opacity-80">{money(balance)}</span>
                </button>
                <button
                  onClick={() => go('topup')}
                  className="flex flex-1 flex-col items-center gap-1 rounded-2xl bg-secondary py-2.5 active:scale-95"
                >
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    <CreditCard className="size-4 text-primary" />
                    {t('crypto')}
                  </span>
                  <span className="flex items-center gap-1">
                    <CoinIcon symbol="USDT" className="size-3.5" />
                    <CoinIcon symbol="BTC" className="size-3.5" />
                    <CoinIcon symbol="ETH" className="size-3.5" />
                    <CoinIcon symbol="GRAM" className="size-3.5" />
                  </span>
                </button>
              </div>
              {isAdmin && (
                <button
                  onClick={checkoutTest}
                  className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-primary/50 bg-primary/10 py-2.5 text-sm font-semibold text-primary active:scale-95"
                >
                  <FlaskConical className="size-4" />
                  {lang === 'ru' ? 'Оплатить тестово (админ)' : 'Test pay (admin)'}
                </button>
              )}
            </div>
          </div>
      </div>

      <CustomAccountConfirmSheet
        open={!!confirmingCustomKey}
        editKey={confirmingCustomKey ?? undefined}
        onClose={() => setConfirmingCustomKey(null)}
        onEdit={() => {
          setEditingCustomKey(confirmingCustomKey)
          setConfirmingCustomKey(null)
        }}
        isAudienceUp={isAudienceUp}
        onAudienceDown={onAudienceDown}
      />

      <CustomAccountSheet
        open={!!editingCustomKey}
        editKey={editingCustomKey ?? undefined}
        onClose={() => setEditingCustomKey(null)}
        isAudienceUp={isAudienceUp}
        onAudienceDown={onAudienceDown}
      />

      <BoostUnavailableSheet
        open={notifyOpen}
        onOpenChange={setNotifyOpen}
        subcategory="followers"
        region={(notifyAudience?.region as any) ?? '_all'}
        subcategoryLabel={notifyAudience?.label ?? 'Followers'}
      />
    </div>
  )
}

function Row({
  label,
  value,
  muted,
  bold,
  success,
}: {
  label: string
  value: string
  muted?: boolean
  bold?: boolean
  success?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${muted ? 'text-muted-foreground' : ''}`}>{label}</span>
      <span
        className={`${bold ? 'text-lg font-bold' : 'text-sm font-medium'} ${
          success ? 'text-success' : ''
        }`}
      >
        {value}
      </span>
    </div>
  )
}

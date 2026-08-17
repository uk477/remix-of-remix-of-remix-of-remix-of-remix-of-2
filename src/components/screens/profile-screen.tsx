'use client'

import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { greetingFor, greetingPhrase } from '@/lib/greeting'

import { createPortal } from 'react-dom'
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeft,
  BarChart3,
  Calendar,
  Check,
  ChevronRight,
  ClipboardPaste,
  Copy,
  Gift,
  Globe,
  HelpCircle,
  Infinity as InfinityIcon,
  Info,
  LifeBuoy,
  Percent,
  Plus,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Ticket,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import avatar4 from '@/assets/avatars/image-4.asset.json'
import avatar5 from '@/assets/avatars/image-5.asset.json'
import avatar6 from '@/assets/avatars/image-6.asset.json'
import avatar7 from '@/assets/avatars/image-7.asset.json'
import avatar8 from '@/assets/avatars/image-8.asset.json'
import avatar9 from '@/assets/avatars/image-9.asset.json'
import avatar10 from '@/assets/avatars/image-10.asset.json'
import avatar11 from '@/assets/avatars/image-11.asset.json'

const AVATAR_POOL = [avatar4, avatar5, avatar6, avatar7, avatar8, avatar9, avatar10, avatar11]
import { money } from '@/lib/format'
import { copyText } from '@/lib/clipboard'

import { LANGS, useI18n } from '@/lib/i18n'
import { useNav } from '@/lib/nav'
import {
  filterSeries,
  getEarningsSeries,
  getReferrals,
  sumSeries,
  type Period,
  type Referral,
} from '@/lib/referral-data'
import { useStore } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import type { Lang, Order, Topup } from '@/lib/types'
import { ScreenHeader } from '../screen-header'
import { useToast } from '../toast'
import { CoinIcon } from '../ui/coin-icon'
import { ShieldCheck as ShieldIcon } from 'lucide-react'

const REF_LINK = 'https://t.me/AureXBot?start=ref_8842193'

type ActivityItem =
  | { kind: 'topup'; date: number; id: string; ref: Topup }
  | { kind: 'order'; date: number; id: string; ref: Order }

type SheetKind = null | 'promo' | 'referral' | 'language'
type ReferralView = 'main' | 'info' | 'stats' | 'list' | 'detail'

export function ProfileScreen() {
  const { t, lang, setLang } = useI18n()
  const { go } = useNav()
  const { balance, redeemPromo, topups, orders } = useStore()
  const { isAdmin } = useAuth()
  const { show } = useToast()

  const tgUser = useTelegramUser()
  const [greetTick, setGreetTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setGreetTick((v) => v + 1), 60_000)
    return () => clearInterval(id)
  }, [])
  const greetPhrase = useMemo(
    () => greetingPhrase(lang),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, greetTick],
  )
  const greeting = useMemo(
    () => greetingFor(lang, tgUser.name),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, tgUser.name, greetTick],
  )


  const [sheet, setSheet] = useState<SheetKind>(null)
  const [referralView, setReferralView] = useState<ReferralView>('main')
  const [selectedRefId, setSelectedRefId] = useState<string | null>(null)
  const [statsPeriod, setStatsPeriod] = useState<Period>('week')
  const [promo, setPromo] = useState('')
  const [promoError, setPromoError] = useState(false)

  useEffect(() => {
    if (!sheet) {
      setReferralView('main')
      setSelectedRefId(null)
    }
  }, [sheet])

  // (history previews removed — now navigates to dedicated screen)

  async function copyRef() {
    const ok = await copyText(REF_LINK)
    show(ok ? t('ref_copied') : 'Copy failed')
  }

  async function shareRef() {
    const text = t('ref_share_message')
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(REF_LINK)}&text=${encodeURIComponent(text)}`

    // Inside Telegram Mini App — open native contact picker
    const tg = (typeof window !== 'undefined'
      ? (window as unknown as { Telegram?: { WebApp?: { openTelegramLink?: (u: string) => void } } }).Telegram?.WebApp
      : null)
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(tgUrl)
      return
    }

    // Web fallback — OS share sheet, then t.me/share
    const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }) : null
    if (nav?.share) {
      try {
        await nav.share({ title: 'AureX', text, url: REF_LINK })
        return
      } catch {
        // user cancelled — fall through
      }
    }
    window.open(tgUrl, '_blank')
  }


  async function submitPromo() {
    const bonus = await redeemPromo(promo)
    if (bonus === null) {
      setPromoError(true)
      show(t('promo_used_or_invalid'))
      return
    }
    setPromoError(false)
    setPromo('')
    setSheet(null)
    show(t('promo_success').replace('{x}', money(bonus)))
  }

  const balanceStr = money(balance)
  

  return (
    <div className="relative overflow-hidden">
      <ScreenHeader
        title={t('nav_profile')}
      />

      <div className="relative z-10 px-4 pt-4">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[28px] border border-border-strong bg-card p-4 shadow-[0_24px_80px_-42px_color-mix(in_oklab,var(--primary)_55%,transparent)]"
        >
          <div className="flex items-center gap-4">
            {/* Solar liquid energy avatar */}
            <div className="relative shrink-0">
              <div
                aria-hidden
                className="absolute inset-0 rounded-full bg-primary/25 blur-xl animate-pulse"
              />
              <div
                aria-hidden
                className="absolute -inset-1 rounded-full border border-primary/30 animate-spin [animation-duration:8s]"
              />
              <div
                aria-hidden
                className="absolute -inset-2 rounded-full border border-primary/10 animate-spin [animation-duration:12s] [animation-direction:reverse]"
              />
              {tgUser.photo_url ? (
                <img
                  src={tgUser.photo_url}
                  alt=""
                  className="relative size-14 rounded-full object-cover ring-1 ring-border-strong"
                />
              ) : (
                <div className="relative flex size-14 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(135deg,color-mix(in_oklab,var(--card)_92%,var(--primary)_8%),color-mix(in_oklab,var(--background)_88%,black_12%))] ring-1 ring-white/10">
                  <span className="font-display text-[20px] font-bold text-primary">
                    {tgUser.initial}
                  </span>
                  <div
                    aria-hidden
                    className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_70%)]"
                  />
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center self-stretch [perspective:800px]">
              <motion.div
                key={greeting}
                initial={{ opacity: 0, y: 6, rotateX: -22 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="min-w-0 [transform-style:preserve-3d] [will-change:transform,opacity]"
              >
                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {greetPhrase}
                </p>
                <p className="truncate bg-[linear-gradient(100deg,var(--foreground),color-mix(in_oklab,var(--primary)_75%,var(--foreground)),var(--foreground))] bg-clip-text text-[18px] font-bold leading-tight text-transparent">
                  {tgUser.name}
                </p>
              </motion.div>
            </div>


            <button
              onClick={() => setSheet('language')}
              aria-label={t('language')}
              className="pressable group flex h-9 shrink-0 items-center gap-1 rounded-full border border-border-strong bg-secondary/70 px-3 text-foreground transition-colors hover:border-primary/60"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                {lang}
              </span>
              <ChevronRight className="size-3 text-muted-foreground transition-transform group-active:translate-x-0.5" />
            </button>
          </div>

          <div className="relative mt-4 overflow-hidden rounded-[24px] border border-primary/25 bg-[linear-gradient(145deg,color-mix(in_oklab,var(--card)_88%,var(--primary)_12%),var(--secondary))] p-5">
            <div
              aria-hidden
              className="absolute -right-12 -top-16 size-44 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_24%,transparent),transparent_68%)]"
            />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-[12px] font-medium text-muted-foreground">{t('your_balance')}</p>
                <p className="tnum mt-2 font-display text-[42px] font-semibold leading-none text-foreground">
                  {balanceStr}
                </p>
              </div>
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Wallet className="size-5" strokeWidth={1.8} />
              </div>
            </div>
            <div className="relative mt-5">
              <button
                onClick={() => go('topup')}
                className="pressable flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gold-gradient text-[14px] font-bold text-primary-foreground"
              >
                <Plus className="size-4" strokeWidth={3} />
                {t('topup')}
              </button>
            </div>

          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-4 grid grid-cols-3 gap-2"
        >
          <QuickAction icon={Ticket} label={t('promo_code')} onClick={() => setSheet('promo')} />
          <QuickAction icon={Gift} label={t('referral')} onClick={() => setSheet('referral')} />
          <QuickAction icon={LifeBuoy} label={t('nav_support')} onClick={() => go('support')} />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6"
        >
          <div className="mb-4 flex items-center gap-4 px-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {t('history_title')}
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
          </div>

          <div className="space-y-3">
            <HistoryPrismCard
              icon={ShoppingBag}
              label={t('tab_orders')}
              hint={t('history_orders_desc')}
              onClick={() => go('history', 'orders')}
              accentOpacity={0.5}
            />
            <HistoryPrismCard
              icon={Wallet}
              label={t('tab_topups')}
              hint={t('history_topups_desc')}
              onClick={() => go('history', 'topups')}
              accentOpacity={0.3}
            />
            <HistoryPrismCard
              icon={Info}
              label={t('about_project')}
              hint={t('about_project_desc')}
              onClick={() => go('about')}
              accentOpacity={0.2}
            />
            {isAdmin && (
              <HistoryPrismCard
                icon={ShieldIcon}
                label="Админ-панель"
                hint="Управление заказами, товарами и пользователями"
                onClick={() => go('admin')}
                accentOpacity={0.6}
              />
            )}
          </div>

          <div className="mt-5 flex justify-center">
            <div className="h-1 w-12 rounded-full bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          </div>
        </motion.section>

        <div className="mt-6 flex items-center justify-center gap-3 text-[10.5px] font-semibold uppercase tracking-[0.32em] text-muted-foreground/70">
          <span className="h-px w-10 bg-gradient-to-r from-transparent to-primary/40" />
          <Sparkles className="size-3 text-primary/80" />
          <span className="translate-y-[0.5px]">AureX Agency</span>
          <span className="h-px w-10 bg-gradient-to-l from-transparent to-primary/40" />
        </div>
      </div>

      {/* Bottom sheets */}
      <Sheet open={sheet !== null} onClose={() => setSheet(null)}>
        {sheet === 'promo' && (
          <div>
            <SheetHeader
              icon={Ticket}
              title={t('use_promo')}
              subtitle={t('use_promo_desc')}
              onClose={() => setSheet(null)}
            />

            <div className="relative mt-5 overflow-hidden rounded-[24px] border border-primary/25 bg-[linear-gradient(140deg,color-mix(in_oklab,var(--card)_85%,var(--primary)_15%),var(--secondary))] p-5">
              <div
                aria-hidden
                className="absolute -right-10 -top-14 size-40 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_28%,transparent),transparent_70%)]"
              />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {t('promo_code')}
                  </p>
                  <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70 tabular-nums">
                    {promo.length}/16
                  </span>
                </div>

                {/* Native input — allows paste, autofill, native keyboard */}
                <div
                  className={`mt-3 flex min-h-[56px] items-center gap-2 rounded-2xl border bg-background/40 pl-4 pr-2 ${
                    promoError ? 'border-destructive/60' : 'border-border-strong'
                  }`}
                >
                  <input
                    type="text"
                    inputMode="text"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={16}
                    value={promo}
                    onChange={(e) => {
                      setPromoError(false)
                      setPromo(e.target.value.toUpperCase().replace(/\s+/g, '').slice(0, 16))
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && promo.trim()) void submitPromo()
                    }}
                    onFocus={(e) => {
                      const el = e.currentTarget
                      // Wait one frame after the keyboard begins resizing the visualViewport,
                      // then gently center the field. rAF avoids the jump/lag of setTimeout.
                      requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        })
                      })
                    }}
                    placeholder={t('promo_placeholder')}
                    aria-label={t('promo_code')}
                    style={{ scrollMarginTop: '20vh', scrollMarginBottom: '20vh' }}
                    className="flex-1 min-w-0 bg-transparent font-mono text-[16px] uppercase tracking-[0.28em] text-foreground placeholder:normal-case placeholder:tracking-normal placeholder:text-[14px] placeholder:text-muted-foreground focus:outline-none"
                  />

                  {promo ? (
                    <button
                      onClick={() => {
                        setPromo('')
                        setPromoError(false)
                      }}
                      aria-label="Clear"
                      className="pressable flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        try {
                          const text = (await navigator.clipboard.readText()).trim()
                          if (!text) {
                            show(t('paste_empty'))
                            return
                          }
                          setPromoError(false)
                          setPromo(text.toUpperCase().replace(/\s+/g, '').slice(0, 16))
                        } catch {
                          show(t('paste_denied'))
                        }
                      }}
                      className="pressable flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-primary/15 px-3 text-[12px] font-semibold text-primary"
                    >
                      <ClipboardPaste className="size-3.5" strokeWidth={2.4} />
                      {t('paste')}
                    </button>
                  )}
                </div>


                <button
                  onClick={submitPromo}
                  disabled={!promo.trim()}
                  className="pressable mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gold-gradient py-3.5 text-[14px] font-bold text-primary-foreground disabled:opacity-40"
                >
                  <Sparkles className="size-4" strokeWidth={2.4} />
                  {t('redeem')}
                </button>
              </div>
            </div>


            <ul className="mt-5 space-y-2">
              <PromoPerk icon={ShieldCheck} title={t('promo_perk_once')} desc={t('promo_perk_once_desc')} />
            </ul>

          </div>
        )}

        {sheet === 'referral' && (
          <ReferralSheet
            view={referralView}
            setView={setReferralView}
            selectedRefId={selectedRefId}
            setSelectedRefId={setSelectedRefId}
            statsPeriod={statsPeriod}
            setStatsPeriod={setStatsPeriod}
            onClose={() => setSheet(null)}
            onCopy={copyRef}
            onShare={shareRef}
            lang={lang}
            t={t}
          />
        )}


        {sheet === 'language' && (
          <div>
            <SheetHeader
              icon={Globe}
              title={t('language')}
              onClose={() => setSheet(null)}
            />
            <ul className="mt-5 divide-y divide-border/60 border-y border-border/60">
              {LANGS.map((l) => {
                const active = lang === l.code
                return (
                  <li key={l.code}>
                    <button
                      onClick={() => {
                        setLang(l.code as Lang)
                        setSheet(null)
                      }}
                      className={`flex w-full items-center gap-3 py-3.5 text-left transition-colors ${
                        active ? 'opacity-100' : 'opacity-90 hover:opacity-100'
                      }`}
                    >
                      <span className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-surface-2 ring-1 ring-border/60">
                        <img
                          src={`https://flagcdn.com/w80/${l.country}.png`}
                          srcSet={`https://flagcdn.com/w160/${l.country}.png 2x`}
                          alt=""
                          aria-hidden
                          className="size-full object-cover"
                        />
                      </span>

                      <span className="flex-1 text-[15px] font-semibold">{l.label}</span>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                        {l.code}
                      </span>
                      <span
                        className={`flex size-6 items-center justify-center rounded-full ${
                          active ? 'bg-gold-gradient' : 'border border-border-strong'
                        }`}
                      >
                        {active && <Check className="size-3.5 text-primary-foreground" strokeWidth={3} />}
                      </span>
                    </button>
                  </li>

                )
              })}
            </ul>
          </div>
        )}
      </Sheet>
    </div>
  )
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Ticket
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="pressable flex min-h-[86px] flex-col items-center justify-center gap-2 rounded-[22px] border border-border bg-card/70 px-2 text-center"
    >
      <span className="flex size-10 items-center justify-center rounded-2xl bg-secondary text-primary">
        <Icon className="size-[18px]" strokeWidth={1.7} />
      </span>
      <span className="line-clamp-2 text-[12px] font-semibold leading-tight text-foreground">
        {label}
      </span>
    </button>
  )
}

function HistoryCard({
  icon: Icon,
  label,
  count,
  accent,
  onClick,
}: {
  icon: typeof Ticket
  label: string
  count: number
  accent: 'primary' | 'success'
  onClick: () => void
}) {
  const isPrimary = accent === 'primary'
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="pressable group relative overflow-hidden rounded-[22px] border border-border-strong bg-card p-3.5 text-left"
    >
      <div
        aria-hidden
        className={`absolute -right-8 -top-8 size-24 rounded-full blur-2xl transition-opacity duration-500 group-hover:opacity-100 ${
          isPrimary
            ? 'bg-primary/25 opacity-60'
            : 'bg-success/25 opacity-50'
        }`}
      />
      <div className="relative flex items-center justify-between">
        <span
          className={`flex size-9 items-center justify-center rounded-xl ${
            isPrimary ? 'bg-primary/15 text-primary' : 'bg-success/15 text-success'
          }`}
        >
          <Icon className="size-[17px]" strokeWidth={2} />
        </span>
        <ChevronRight className="size-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5" />
      </div>
      <p className="relative mt-4 text-[13px] font-medium text-muted-foreground">
        {label}
      </p>
      <p className="tnum relative mt-0.5 font-display text-[22px] font-semibold leading-tight text-foreground">
        {count}
      </p>
    </motion.button>
  )
}

function HistoryPrismCard({
  icon: Icon,
  label,
  hint,
  onClick,
  accentOpacity,
}: {
  icon: typeof Ticket
  label: string
  hint?: string
  onClick: () => void
  accentOpacity: number
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-b from-white/[0.08] to-transparent p-px text-left"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-primary/25 via-transparent to-transparent"
        style={{ opacity: accentOpacity }}
      />
      <div className="relative flex items-center gap-4 rounded-[15px] bg-[#0A0A0A] p-4">
        <div className="relative flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] shadow-inner">
          <div aria-hidden className="absolute inset-0 rounded-xl bg-primary/5 blur-[4px]" />
          <Icon className="relative z-10 size-6 text-primary" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold text-foreground">{label}</div>
          {hint && (
            <div className="mt-0.5 truncate text-[12px] text-muted-foreground/70">{hint}</div>
          )}
        </div>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/5 opacity-40 transition-opacity group-hover:opacity-100">
          <ChevronRight className="size-4 text-foreground" strokeWidth={2.5} />
        </div>
      </div>
    </motion.button>
  )
}





function PromoPerk({

  icon: Icon,
  title,
  desc,
}: {
  icon: typeof Ticket
  title: string
  desc: string
}) {
  return (
    <li className="flex items-start gap-3 rounded-2xl border border-border/60 bg-white/[0.02] px-3.5 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
        <Icon className="size-[16px]" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{desc}</p>
      </div>
    </li>
  )
}

function RefStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-white/[0.02] px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className="tnum mt-1 font-display text-[22px] font-semibold leading-tight text-foreground">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

function ShareButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="pressable flex flex-col items-center gap-1 rounded-2xl border border-border-strong bg-white/[0.02] px-2 py-3 text-[11px] font-semibold text-foreground"
    >
      <span className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-primary">
        <ArrowUpRight className="size-4" strokeWidth={2} />
      </span>
      {label}
    </button>
  )
}




function MenuRow({
  icon: Icon,
  label,
  hint,
  value,
  onClick,
}: {
  icon: typeof Ticket
  label: string
  hint?: string
  value?: string
  onClick: () => void
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3.5 text-left transition-colors active:bg-secondary/70"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
          <Icon className="size-[18px]" strokeWidth={1.7} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-foreground">{label}</p>
          {hint && (
            <p className="truncate text-[12px] text-muted-foreground">{hint}</p>
          )}
        </div>
        {value && (
          <span className="text-[13px] font-medium text-muted-foreground">{value}</span>
        )}
        <ChevronRight className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" />
      </button>
    </li>
  )
}

type ActivityGroup = { label: string; items: ActivityItem[] }

function groupByDay(items: ActivityItem[], lang: string): ActivityGroup[] {
  const locale = lang === 'ru' ? 'ru-RU' : lang === 'ar' ? 'ar-SA' : lang === 'zh' ? 'zh-CN' : 'en-US'
  const now = new Date()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const today = startOfDay(now)
  const yesterday = today - 24 * 60 * 60 * 1000

  const todayLabel = lang === 'ru' ? 'Сегодня' : lang === 'ar' ? 'اليوم' : lang === 'zh' ? '今天' : 'Today'
  const yesterdayLabel = lang === 'ru' ? 'Вчера' : lang === 'ar' ? 'أمس' : lang === 'zh' ? '昨天' : 'Yesterday'

  const groups = new Map<string, ActivityGroup>()
  for (const it of items) {
    const day = startOfDay(new Date(it.date))
    let label: string
    if (day === today) label = todayLabel
    else if (day === yesterday) label = yesterdayLabel
    else label = new Date(day).toLocaleDateString(locale, { day: 'numeric', month: 'long' })
    const key = String(day)
    const g = groups.get(key)
    if (g) g.items.push(it)
    else groups.set(key, { label, items: [it] })
  }
  return Array.from(groups.values())
}

function ActivityRow({ item, lang }: { item: ActivityItem; lang: string }) {
  const isTopup = item.kind === 'topup'
  const amount = item.ref.amount
  const positive = isTopup
  const title = isTopup
    ? `${(item.ref as Topup).coin} · ${(item.ref as Topup).network}`
    : (item.ref as Order).title
  const status = isTopup ? (item.ref as Topup).status : (item.ref as Order).status
  const statusLabel = getStatusLabel(status, lang)

  const date = new Date(item.date)
  const locale = lang === 'ru' ? 'ru-RU' : lang === 'ar' ? 'ar-SA' : lang === 'zh' ? 'zh-CN' : 'en-US'
  const dateStr = date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <li className="flex items-center gap-3 rounded-[18px] px-1 py-2.5">
      <div
        className={`flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl ${
          positive ? 'bg-white/[0.04]' : 'bg-secondary text-primary'
        }`}
      >
        {positive ? (
          <CoinIcon symbol={(item.ref as Topup).coin} network={(item.ref as Topup).network} className="size-8" />
        ) : (
          <ArrowUpRight className="size-4" strokeWidth={2} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-foreground">{title}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {dateStr} · {statusLabel}
        </p>
      </div>
      <p
        className={`tnum shrink-0 text-[13px] font-bold ${
          positive ? 'text-success' : 'text-foreground'
        }`}
      >
        {positive ? '+' : '−'}
        {money(Math.abs(amount))}
      </p>
    </li>
  )
}

function useTelegramUser() {
  const [data, setData] = useState<{
    name: string
    initial: string
    id: string
    photo_url?: string
  }>({ name: 'Guest', initial: 'G', id: '—' })

  useEffect(() => {
    const u = typeof window !== 'undefined'
      ? window.Telegram?.WebApp?.initDataUnsafe?.user
      : undefined
    if (!u) return
    const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || 'Guest'
    setData({
      name,
      initial: (name[0] || 'G').toUpperCase(),
      id: u.id ? String(u.id) : '—',
      photo_url: u.photo_url,
    })
  }, [])

  return data
}

function profileSubtitle(lang: string) {
  if (lang === 'ru') return 'Проверенный аккаунт'
  if (lang === 'ar') return 'حساب موثّق'
  if (lang === 'zh') return '已验证账户'
  return 'Verified account'
}

function getStatusLabel(status: string, lang: string) {
  const map: Record<string, Record<string, string>> = {
    pending: { en: 'Awaiting payment', ru: 'Ожидает оплаты', ar: 'بانتظار الدفع', zh: '等待付款', es: 'Pago pendiente', tr: 'Ödeme bekleniyor', pt: 'Aguardando pagamento', fr: 'En attente de paiement', uk: 'Очікує оплати' },
    success: { en: 'Success', ru: 'Успешно', ar: 'ناجح', zh: '成功', es: 'Éxito', tr: 'Başarılı', pt: 'Sucesso', fr: 'Succès', uk: 'Успішно' },
    declined: { en: 'Declined', ru: 'Отклонено', ar: 'مرفوض', zh: '已拒绝', es: 'Rechazado', tr: 'Reddedildi', pt: 'Recusado', fr: 'Refusé', uk: 'Відхилено' },
    waiting: { en: 'Waiting', ru: 'Ожидание', ar: 'قيد الانتظار', zh: '等待中', es: 'En espera', tr: 'Beklemede', pt: 'Aguardando', fr: 'En attente', uk: 'Очікування' },
    in_progress: { en: 'In progress', ru: 'В работе', ar: 'قيد التنفيذ', zh: '进行中', es: 'En progreso', tr: 'İşlemde', pt: 'Em andamento', fr: 'En cours', uk: 'В роботі' },
    completed: { en: 'Completed', ru: 'Выполнен', ar: 'مكتمل', zh: '已完成', es: 'Completado', tr: 'Tamamlandı', pt: 'Concluído', fr: 'Terminé', uk: 'Виконано' },
  }
  return map[status]?.[lang] ?? map[status]?.en ?? status
}

function Sheet({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  const [kbInset, setKbInset] = useState(0)

  useEffect(() => {
    if (!open || typeof document === 'undefined') return

    const { body, documentElement } = document
    const previousBodyOverflow = body.style.overflow
    const previousHtmlOverflow = documentElement.style.overflow

    body.style.overflow = 'hidden'
    documentElement.style.overflow = 'hidden'

    return () => {
      body.style.overflow = previousBodyOverflow
      documentElement.style.overflow = previousHtmlOverflow
    }
  }, [open])

  // Track on-screen keyboard via visualViewport for smooth, jank-free lift
  useEffect(() => {
    if (!open || typeof window === 'undefined') return
    const vv = window.visualViewport
    if (!vv) return
    let raf = 0
    const update = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
        setKbInset(inset)
      })
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      cancelAnimationFrame(raf)
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      setKbInset(0)
    }
  }, [open])

  if (!open) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-hidden">
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-background/85"
      />
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        style={{
          maxHeight: `calc(100dvh - 18px - ${kbInset}px)`,
          transform: `translate3d(0, -${kbInset}px, 0)`,
          transition:
            'max-height 220ms cubic-bezier(0.22, 1, 0.36, 1), transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
          willChange: 'transform, max-height',
        }}
        className="relative mx-auto flex w-full max-w-[480px] flex-col rounded-t-[28px] border-t border-border-strong bg-popover shadow-2xl"
      >
        <div className="mx-auto mt-3 mb-2 h-1.5 w-10 shrink-0 rounded-full bg-border-strong" />
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-2"
          style={{ WebkitOverflowScrolling: 'touch' as any, scrollBehavior: 'smooth' }}
        >
          {children}
        </div>
      </motion.div>
    </div>,
    document.body,
  )
}

function SheetHeader({
  icon: Icon,
  title,
  subtitle,
  onClose,
  right,
}: {
  icon: typeof Ticket
  title: string
  subtitle?: string
  onClose: () => void
  right?: React.ReactNode
}) {
  return (
      <div className="flex items-start gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border-strong bg-white/[0.03]">
        <Icon className="size-[18px] text-primary" strokeWidth={1.6} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-[18px] font-semibold leading-tight tracking-tight break-words">{title}</h3>
        {subtitle && (
          <p className="mt-1 text-[12px] leading-snug text-muted-foreground break-words">{subtitle}</p>
        )}
      </div>
      {right}
      <button
        onClick={onClose}
        aria-label="Close"
        className="pressable flex size-9 shrink-0 items-center justify-center rounded-full border border-border-strong text-muted-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

// ============================================================================
// Referral sheet — main / info / stats / list
// ============================================================================

type TFn = (key: string) => string

function ReferralSheet({
  view,
  setView,
  selectedRefId,
  setSelectedRefId,
  statsPeriod,
  setStatsPeriod,
  onClose,
  onCopy,
  onShare,
  lang,
  t,
}: {
  view: ReferralView
  setView: (v: ReferralView) => void
  selectedRefId: string | null
  setSelectedRefId: (id: string | null) => void
  statsPeriod: Period
  setStatsPeriod: (p: Period) => void
  onClose: () => void
  onCopy: () => void
  onShare: () => void
  lang: string
  t: TFn
}) {
  const referrals = useMemo(() => {
    const list = getReferrals()
    return list.map((r, i) => ({
      ...r,
      avatarUrl: r.avatarUrl ?? AVATAR_POOL[i % AVATAR_POOL.length]?.url,
    }))
  }, [])
  const series = useMemo(() => getEarningsSeries(), [])

  if (view === 'info') {
    const steps: Array<{
      icon: typeof Ticket
      title: string
      desc: string
      tone: 'primary' | 'success' | 'danger'
    }> = [
      { icon: InfinityIcon, title: t('ref_info_1_title'), desc: t('ref_info_1_desc'), tone: 'primary' },
      { icon: Percent, title: t('ref_info_2_title'), desc: t('ref_info_2_desc'), tone: 'success' },
      { icon: Wallet, title: t('ref_info_3_title'), desc: t('ref_info_3_desc'), tone: 'primary' },
      { icon: AlertTriangle, title: t('ref_info_4_title'), desc: t('ref_info_4_desc'), tone: 'danger' },
    ]
    const toneMap = {
      primary: { ring: 'border-primary/30', glow: 'bg-primary/25', chip: 'bg-primary/15 text-primary' },
      success: { ring: 'border-success/30', glow: 'bg-success/25', chip: 'bg-success/15 text-success' },
      danger:  { ring: 'border-destructive/30', glow: 'bg-destructive/25', chip: 'bg-destructive/15 text-destructive' },
    } as const
    return (
      <div>
        <SheetHeader
          icon={Info}
          title={t('referral_info_title')}
          onClose={onClose}
          right={<BackChip t={t} onClick={() => setView('main')} />}
        />

        {/* 3D hero */}
        <motion.div
          initial={{ opacity: 0, y: 16, rotateX: -8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 22 }}
          style={{ transformPerspective: 900 }}
          className="relative mt-5 overflow-hidden rounded-[24px] border border-primary/30 bg-[linear-gradient(150deg,color-mix(in_oklab,var(--card)_78%,var(--primary)_22%),var(--secondary))] px-5 py-6"
        >
          <motion.div
            aria-hidden
            initial={{ scale: 0.6, opacity: 0.4 }}
            animate={{ scale: [0.9, 1.05, 0.9], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -right-12 -top-12 size-48 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_35%,transparent),transparent_70%)]"
          />
          <div className="relative flex items-center gap-4">
            <motion.div
              animate={{ rotateY: [0, 360] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              style={{ transformStyle: 'preserve-3d' }}
              className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-primary/40 bg-gold-gradient text-primary-foreground shadow-lg shadow-primary/30"
            >
              <Sparkles className="size-6" strokeWidth={2} />
            </motion.div>
            <p className="font-display text-[16px] font-semibold leading-snug tracking-tight text-foreground">
              {t('ref_info_hero')}
            </p>
          </div>
        </motion.div>

        {/* Steps */}
        <div className="mt-4 space-y-2.5">
          {steps.map((s, i) => {
            const tone = toneMap[s.tone]
            const Icon = s.icon
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 14, rotateX: -6 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ delay: 0.08 * (i + 1), type: 'spring', stiffness: 260, damping: 24 }}
                style={{ transformPerspective: 800 }}
                className={`relative overflow-hidden rounded-2xl border ${tone.ring} bg-card px-4 py-3.5`}
              >
                <div aria-hidden className={`absolute -right-8 -top-8 size-24 rounded-full blur-2xl ${tone.glow}`} />
                <div className="relative flex items-start gap-3.5">
                  <motion.span
                    whileHover={{ rotateY: 180 }}
                    transition={{ duration: 0.6 }}
                    style={{ transformStyle: 'preserve-3d' }}
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone.chip}`}
                  >
                    <Icon className="size-[18px]" strokeWidth={2} />
                  </motion.span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold leading-tight text-foreground">{s.title}</p>
                    <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{s.desc}</p>
                  </div>
                  <span className="tnum mt-0.5 shrink-0 font-display text-[13px] font-semibold text-muted-foreground/70">
                    0{i + 1}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    )
  }


  if (view === 'stats') {
    return (
      <StatsView
        series={series}
        period={statsPeriod}
        setPeriod={setStatsPeriod}
        referralsCount={referrals.length}
        onClose={onClose}
        onBack={() => setView('main')}
        lang={lang}
        t={t}
      />
    )
  }

  if (view === 'list') {
    return (
      <ListView
        referrals={referrals}
        onSelect={(id) => { setSelectedRefId(id); setView('detail') }}
        onClose={onClose}
        onBack={() => setView('main')}
        lang={lang}
        t={t}
      />
    )
  }

  if (view === 'detail') {
    const ref = referrals.find((r) => r.id === selectedRefId) ?? referrals[0]
    return (
      <DetailView
        referral={ref}
        onClose={onClose}
        onBack={() => setView('list')}
        lang={lang}
        t={t}
      />
    )
  }

  // main
  const totalEarned = referrals.reduce((s, r) => s + r.earned, 0)
  return (
    <div>
      <SheetHeader
        icon={Gift}
        title={t('referral')}
        onClose={onClose}
        right={
          <button
            onClick={() => setView('info')}
            aria-label={t('referral_info_title')}
            className="pressable mr-1 flex size-9 items-center justify-center rounded-full border border-border-strong text-muted-foreground transition-colors hover:text-foreground"
          >
            <HelpCircle className="size-[18px]" strokeWidth={1.8} />
          </button>
        }
      />

      <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card px-4 py-4 shadow-[0_16px_40px_-30px_color-mix(in_oklab,var(--gold)_45%,transparent)]">
        <div className="flex flex-col items-center text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {t('ref_total')} {t('earned')}
          </p>
          <h1 className="mt-1.5 flex items-baseline justify-center font-display text-[30px] font-light leading-none text-foreground">
            <span className="mr-0.5 text-[17px] font-normal text-gold">$</span>
            <span className="tnum">{money(totalEarned).replace(/^\$/, '')}</span>
          </h1>
        </div>



        <div className="mt-3 grid grid-cols-2 gap-2">
          <NavCard
            icon={BarChart3}
            label={t('ref_stats')}
            hint={t('ref_stats_desc')}
            accent="primary"
            onClick={() => setView('stats')}
          />
          <NavCard
            icon={Users}
            label={t('ref_list')}
            hint={t('ref_list_desc')}
            accent="primary"
            badge={String(referrals.length)}
            onClick={() => setView('list')}
          />
        </div>
      </section>


      {/* Referral link chip with inline copy */}
      <div className="mt-6">
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {t('ref_your_link')}
        </p>
        <button
          onClick={onCopy}
          className="pressable group flex w-full items-center gap-3 rounded-2xl border border-border bg-secondary/50 px-4 py-3 text-left"
        >
          <code dir="ltr" className="min-w-0 flex-1 truncate font-mono text-[12px] text-foreground/80">
            {REF_LINK}
          </code>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-card text-primary transition-colors group-active:bg-primary/15">
            <Copy className="size-3.5" />
          </span>
        </button>
      </div>

      <button
        onClick={onShare}
        className="pressable mt-4 flex h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[14px] font-semibold text-primary-foreground active:scale-[0.98]"
      >
        <Send className="size-4" strokeWidth={2.2} />
        {t('ref_share')}
      </button>

    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-secondary/60 px-3 py-2.5">
      <p className="tnum truncate text-[15px] font-semibold leading-tight text-foreground">{value}</p>
      <p className="mt-1 truncate text-[11px] leading-tight text-muted-foreground">{label}</p>
    </div>
  )
}


function BackChip({ t, onClick }: { t: TFn; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="pressable mr-1 flex h-9 items-center gap-1 rounded-full border border-border-strong bg-secondary px-3 text-[13px] font-semibold text-foreground"
    >
      <ArrowLeft className="size-3.5" />
      {t('back')}
    </button>
  )
}

function NavCard({
  icon: Icon,
  label,
  hint,
  accent,
  badge,
  onClick,
}: {
  icon: typeof Ticket
  label: string
  hint: string
  accent: 'primary' | 'success'
  badge?: string
  onClick: () => void
}) {
  const isPrimary = accent === 'primary'
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="pressable group rounded-xl border border-border bg-card p-2.5 text-left transition-colors active:bg-secondary/60"
    >
      <div className="flex items-center justify-between">
        <span
          className={`flex size-7 items-center justify-center rounded-lg ${
            isPrimary ? 'bg-primary/15 text-primary' : 'bg-success/15 text-success'
          }`}
        >
          <Icon className="size-[14px]" strokeWidth={2} />
        </span>
        {badge ? (
          <span className={`tnum rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isPrimary ? 'bg-primary/15 text-primary' : 'bg-success/15 text-success'}`}>
            {badge}
          </span>
        ) : (
          <ChevronRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        )}
      </div>
      <p className="mt-2 text-[12px] font-semibold leading-tight text-foreground">
        {label}
      </p>
      <p className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-muted-foreground">
        {hint}
      </p>

    </motion.button>
  )
}

// ---------- Stats view ---------------------------------------------------------

function StatsView({
  series,
  period,
  setPeriod,
  referralsCount,
  onClose,
  onBack,
  lang,
  t,
}: {
  series: ReturnType<typeof getEarningsSeries>
  period: Period
  setPeriod: (p: Period) => void
  referralsCount: number
  onClose: () => void
  onBack: () => void
  lang: string
  t: TFn
}) {
  const filtered = useMemo(() => filterSeries(series, period), [series, period])
  const total = useMemo(() => sumSeries(filtered), [filtered])
  const avg = referralsCount > 0 ? total / referralsCount : 0
  const best = useMemo(
    () => filtered.reduce((b, p) => (p.amount > b.amount ? p : b), { date: 0, amount: 0 }),
    [filtered],
  )
  const max = useMemo(() => filtered.reduce((m, p) => Math.max(m, p.amount), 0), [filtered])

  const locale = lang === 'ru' ? 'ru-RU' : lang === 'ar' ? 'ar-SA' : lang === 'zh' ? 'zh-CN' : 'en-US'

  return (
    <div>
      <SheetHeader
        icon={BarChart3}
        title={t('ref_stats')}
        subtitle={t('ref_stats_desc')}
        onClose={onClose}
        right={<BackChip t={t} onClick={onBack} />}
      />

      {/* Period tabs */}
      <div className="mt-5 grid grid-cols-4 gap-1 rounded-full border border-border-strong bg-secondary/60 p-1">
        {(['24h', 'week', 'month', 'all'] as Period[]).map((p) => {
          const active = p === period
          const label =
            p === '24h' ? t('period_24h') :
            p === 'week' ? t('period_week') :
            p === 'month' ? t('period_month') : t('period_all')
          return (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`h-9 rounded-full text-[12px] font-semibold transition-colors ${
                active
                  ? 'bg-gold-gradient text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Big total — 3D tilt hero */}
      <TiltHero total={total} label={t('ref_total_period')}>
        <EarningsBars points={filtered} max={max} locale={locale} />
      </TiltHero>

      {/* Secondary stats */}
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <RefStat label={t('ref_avg_per_ref')} value={money(avg)} />
        <RefStat
          label={t('ref_best_day')}
          value={best.amount > 0 ? money(best.amount) : '—'}
          hint={
            best.amount > 0
              ? new Date(best.date).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
              : undefined
          }
        />
      </div>

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-[20px] border border-border bg-card/60">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-3.5 text-primary" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {t('history_title')}
            </p>
          </div>
          <span className="tnum text-[11px] text-muted-foreground">
            {filtered.filter((p) => p.amount > 0).length}
          </span>
        </div>
        {filtered.filter((p) => p.amount > 0).length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
            {t('ref_no_earnings')}
          </p>
        ) : (
          <ul className="max-h-[420px] divide-y divide-border/40 overflow-y-auto overscroll-contain">
            {[...filtered]
              .filter((p) => p.amount > 0)
              .sort((a, b) => b.date - a.date)
              .map((p) => (
                <li key={p.date} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-success/12 text-success">
                    <ArrowDownLeft className="size-3.5" strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-foreground">
                      {new Date(p.date).toLocaleDateString(locale, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {new Date(p.date).toLocaleDateString(locale, { weekday: 'long' })}
                    </p>
                  </div>
                  <p className="tnum shrink-0 text-[13px] font-bold text-success">
                    +{money(p.amount)}
                  </p>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function TiltHero({
  total,
  label,
  children,
}: {
  total: number
  label: string
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rx = useSpring(useTransform(my, [-1, 1], [6, -6]), { stiffness: 160, damping: 20 })
  const ry = useSpring(useTransform(mx, [-1, 1], [-8, 8]), { stiffness: 160, damping: 20 })

  // Parallax offsets for depth layers
  const coinX = useSpring(useTransform(mx, [-1, 1], [-14, 14]), { stiffness: 140, damping: 22 })
  const coinY = useSpring(useTransform(my, [-1, 1], [-10, 10]), { stiffness: 140, damping: 22 })
  const amountX = useSpring(useTransform(mx, [-1, 1], [6, -6]), { stiffness: 140, damping: 22 })
  const glareX = useTransform(mx, [-1, 1], ['20%', '80%'])
  const glareY = useTransform(my, [-1, 1], ['25%', '75%'])
  const glare = useTransform(
    [glareX, glareY],
    ([x, y]) =>
      `radial-gradient(260px circle at ${x} ${y}, color-mix(in oklab, var(--success) 22%, transparent), transparent 60%)`,
  )

  // Count-up animation for the amount
  const mvTotal = useMotionValue(0)
  const smoothTotal = useSpring(mvTotal, { stiffness: 90, damping: 20 })
  const [display, setDisplay] = useState(total)
  useEffect(() => {
    mvTotal.set(total)
    const unsub = smoothTotal.on('change', (v) => setDisplay(v))
    return () => unsub()
  }, [total, mvTotal, smoothTotal])

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    mx.set(((e.clientX - r.left) / r.width) * 2 - 1)
    my.set(((e.clientY - r.top) / r.height) * 2 - 1)
  }
  const reset = () => {
    mx.set(0)
    my.set(0)
  }

  return (
    <div className="mt-4" style={{ perspective: 1200 }}>
      <motion.div
        ref={ref}
        onPointerMove={handleMove}
        onPointerLeave={reset}
        onPointerCancel={reset}
        style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }}
        className="relative overflow-hidden rounded-[24px] border border-success/25 bg-[linear-gradient(140deg,color-mix(in_oklab,var(--card)_82%,var(--success)_18%),var(--secondary))] p-5 shadow-[0_20px_60px_-30px_color-mix(in_oklab,var(--success)_60%,transparent)]"
      >
        {/* Pointer-following glare */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: glare }}
        />

        {/* Grid mesh for depth */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(color-mix(in oklab, var(--success) 60%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab, var(--success) 60%, transparent) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
            transform: 'translateZ(-40px)',
            maskImage:
              'radial-gradient(circle at 30% 50%, black 20%, transparent 75%)',
          }}
        />

        {/* Floating stacked coin — parallax + breathing, not just spinning */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute right-3 top-3"
          style={{ x: coinX, y: coinY, transformStyle: 'preserve-3d' }}
        >
          <motion.div
            className="relative size-[86px]"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Back coin */}
            <motion.div
              className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,color-mix(in_oklab,var(--success)_55%,white_10%),color-mix(in_oklab,var(--success)_35%,black_25%))] opacity-70"
              style={{ transform: 'translateZ(-18px) translate(6px,8px) scale(0.9)' }}
            />
            {/* Middle coin */}
            <motion.div
              className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,color-mix(in_oklab,var(--success)_70%,white_15%),color-mix(in_oklab,var(--success)_40%,black_15%))]"
              style={{ transform: 'translateZ(-8px) translate(3px,4px) scale(0.95)' }}
            />
            {/* Front coin with subtle wobble (not 360) */}
            <motion.div
              className="absolute inset-0 rounded-full border border-white/20 bg-[radial-gradient(circle_at_35%_30%,color-mix(in_oklab,var(--success)_85%,white_30%),color-mix(in_oklab,var(--success)_50%,black_10%))] shadow-[inset_0_-8px_16px_rgba(0,0,0,0.3),0_10px_24px_-10px_color-mix(in_oklab,var(--success)_70%,transparent)]"
              animate={{ rotateY: [-18, 18, -18], rotateX: [8, -6, 8] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="flex h-full items-center justify-center font-display text-[26px] font-bold text-white/95 [text-shadow:0_1px_0_rgba(0,0,0,0.25)]">
                $
              </div>
              {/* Shine sweep */}
              <motion.div
                aria-hidden
                className="absolute inset-0 overflow-hidden rounded-full"
              >
                <motion.div
                  className="absolute -inset-y-2 left-[-40%] w-1/3 rotate-[20deg] bg-gradient-to-r from-transparent via-white/45 to-transparent"
                  animate={{ x: ['0%', '360%'] }}
                  transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.2 }}
                />
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Content */}
        <div className="relative" style={{ transform: 'translateZ(30px)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {label}
          </p>

          <motion.div
            className="relative mt-2 pr-[92px]"
            style={{ x: amountX, transformStyle: 'preserve-3d' }}
          >
            <span
              aria-hidden
              className="tnum absolute inset-0 pr-[92px] font-display text-[40px] font-semibold leading-none text-success/25 blur-[6px]"
              style={{ transform: 'translateZ(-30px)' }}
            >
              {money(display)}
            </span>
            <span
              className="tnum relative block font-display text-[40px] font-semibold leading-none text-success"
              style={{ transform: 'translateZ(20px)' }}
            >
              {money(display)}
            </span>
          </motion.div>

          <div className="mt-6" style={{ transform: 'translateZ(15px)' }}>
            {children}
          </div>
        </div>
      </motion.div>
    </div>
  )
}



function EarningsBars({
  points,
  max,
  locale,
}: {
  points: { date: number; amount: number }[]
  max: number
  locale: string
}) {
  const bars = useMemo(() => points.slice(-40), [points])
  const defaultIdx = useMemo(() => {
    for (let i = bars.length - 1; i >= 0; i--) if (bars[i].amount > 0) return i
    return bars.length - 1
  }, [bars])
  const [selectedIdx, setSelectedIdx] = useState<number | null>(defaultIdx)
  const [containerW, setContainerW] = useState(0)
  const rowRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSelectedIdx(defaultIdx)
  }, [defaultIdx])

  // Measure chart width for tooltip clamping
  useEffect(() => {
    if (!rowRef.current) return
    const el = rowRef.current
    const update = () => setContainerW(el.getBoundingClientRect().width)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Deselect when tapping outside chart
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) setSelectedIdx(null)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [])

  if (points.length === 0 || max === 0) {
    return (
      <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-border/60 text-[11px] text-muted-foreground">
        —
      </div>
    )
  }

  const barFromClientX = (clientX: number): number | null => {
    const el = rowRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const x = clientX - rect.left
    if (rect.width <= 0) return null
    const idx = Math.floor((x / rect.width) * bars.length)
    return Math.max(0, Math.min(bars.length - 1, idx))
  }

  const selected = selectedIdx != null ? bars[selectedIdx] : null

  // Tooltip position in px, clamped so it never clips edges
  const TOOLTIP_HALF = 40 // approx half tooltip width
  const rawLeft =
    selectedIdx != null && bars.length > 1
      ? (selectedIdx / (bars.length - 1)) * containerW
      : containerW / 2
  const leftPx =
    containerW > 0
      ? Math.max(TOOLTIP_HALF, Math.min(containerW - TOOLTIP_HALF, rawLeft))
      : rawLeft
  // Arrow follows the actual bar (may be offset from tooltip center when clamped)
  const arrowOffset = rawLeft - leftPx

  return (
    <div ref={rootRef} className="select-none">
      {/* Tooltip rail */}
      <div className="relative mb-2 h-10">
        <AnimatePresence>
          {selected && (
            <motion.div
              key="tt"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0, left: leftPx }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30, opacity: { duration: 0.12 } }}
              className="pointer-events-none absolute top-0 -translate-x-1/2"
              style={{ left: leftPx }}
            >
              <div className="flex flex-col items-center">
                <div className="rounded-lg border border-success/30 bg-[color-mix(in_oklab,var(--card)_92%,var(--success)_8%)] px-2.5 py-1 text-center shadow-[0_6px_18px_-8px_color-mix(in_oklab,var(--success)_60%,transparent)]">
                  <p className="tnum text-[13px] font-bold leading-none text-success">
                    +{selected.amount.toFixed(2)}$
                  </p>
                  <p className="mt-0.5 whitespace-nowrap text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                    {new Date(selected.date).toLocaleDateString(locale, {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>
                <div
                  className="mt-[1px] size-1.5 rotate-45 border-b border-r border-success/30 bg-[color-mix(in_oklab,var(--card)_92%,var(--success)_8%)]"
                  style={{ transform: `translateX(${arrowOffset}px) rotate(45deg)` }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bars — hover/drag to inspect, tap outside to close */}
      <div
        ref={rowRef}
        onPointerMove={(e) => {
          const idx = barFromClientX(e.clientX)
          if (idx != null) setSelectedIdx(idx)
        }}
        onPointerDown={(e) => {
          e.stopPropagation()
          const idx = barFromClientX(e.clientX)
          if (idx != null) setSelectedIdx((cur) => (cur === idx ? null : idx))
        }}
        onPointerLeave={() => {
          // Keep last tap selection on touch; only clear on mouse leave
          // (touch devices don't fire pointerleave until finger lifts anyway)
        }}
        className="relative flex h-24 touch-none items-end gap-[3px]"
      >
        {bars.map((p, i) => {
          const h = Math.max(3, (p.amount / max) * 100)
          const isZero = p.amount === 0
          const isSelected = i === selectedIdx
          return (
            <div key={p.date} className="pointer-events-none relative flex h-full flex-1 items-end">
              <motion.span
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: i * 0.008, type: 'spring', stiffness: 200, damping: 22 }}
                className={`block w-full rounded-t-[3px] transition-colors ${
                  isSelected
                    ? 'bg-[linear-gradient(to_top,var(--success),color-mix(in_oklab,var(--success)_40%,white))] shadow-[0_0_12px_color-mix(in_oklab,var(--success)_55%,transparent)]'
                    : isZero
                      ? 'bg-border/60'
                      : 'bg-[linear-gradient(to_top,color-mix(in_oklab,var(--success)_55%,transparent),color-mix(in_oklab,var(--success)_85%,transparent))]'
                }`}
              />
              {isSelected && (
                <motion.span
                  layoutId="bar-selected-underline"
                  className="absolute -bottom-1.5 left-1/2 h-0.5 w-3 -translate-x-1/2 rounded-full bg-success"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}



// ---------- List view ---------------------------------------------------------

function ListView({
  referrals,
  onSelect,
  onClose,
  onBack,
  lang,
  t,
}: {
  referrals: Referral[]
  onSelect: (id: string) => void
  onClose: () => void
  onBack: () => void
  lang: string
  t: TFn
}) {
  const locale = lang === 'ru' ? 'ru-RU' : lang === 'ar' ? 'ar-SA' : lang === 'zh' ? 'zh-CN' : 'en-US'
  const totalEarned = referrals.reduce((s, r) => s + r.earned, 0)
  const totalSpent = referrals.reduce((s, r) => s + r.spent, 0)

  return (
    <div>
      <SheetHeader
        icon={Users}
        title={t('ref_list')}
        subtitle={`${referrals.length} · ${money(totalEarned)}`}
        onClose={onClose}
        right={<BackChip t={t} onClick={onBack} />}
      />

      <section className="mt-8 px-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground/60">
          {t('ref_your_cut')}
        </p>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="tnum font-display text-[56px] font-medium leading-[0.9] tracking-[-0.04em] text-foreground">
            {money(totalEarned).replace('$', '')}
          </span>
          <span className="font-display text-[22px] font-light leading-none tracking-[-0.02em] text-muted-foreground/70">
            USD
          </span>
        </div>
        <p className="mt-4 max-w-[280px] text-[13px] leading-snug text-muted-foreground">
          {lang === 'ru'
            ? `С ${referrals.length} приглашённых · всего потрачено ${money(totalSpent)}`
            : `From ${referrals.length} invited · ${money(totalSpent)} spent total`}
        </p>
      </section>

      {referrals.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center text-[13px] text-muted-foreground">
          {t('ref_no_list')}
        </p>
      ) : (
        <section className="mt-10">
          <div className="mb-1 flex items-baseline justify-between px-1">
            <p className="font-display text-[13px] font-medium leading-none tracking-[-0.01em] text-foreground">
              {t('ref_list')}
            </p>
            <p className="tnum text-[12px] font-medium text-muted-foreground/60">
              {String(referrals.length).padStart(2, '0')}
            </p>
          </div>
          <ul className="divide-y divide-border/40">
            {referrals.map((r, i) => (
              <ReferralCard
                key={r.id}
                referral={r}
                index={i}
                locale={locale}
                onClick={() => onSelect(r.id)}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}


function ReferralCard({
  referral: r,
  index,
  locale,
  onClick,
}: {
  referral: Referral
  index: number
  locale: string
  onClick: () => void
}) {
  const joined = new Date(r.joinedAt).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
  })
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.03, ease: [0.2, 0.7, 0.2, 1] }}
      className="group relative"
    >
      <button
        type="button"
        onClick={onClick}
        className="pressable -mx-1 flex w-[calc(100%+8px)] items-center gap-4 rounded-2xl px-1 py-4 text-left transition-colors active:bg-white/[0.02]"
      >
        {r.avatarUrl ? (
          <img
            src={r.avatarUrl}
            alt=""
            className="size-11 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-[15px] font-medium text-foreground"
            aria-hidden
          >
            {r.initial}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="font-display text-[15px] font-medium leading-tight tracking-[-0.015em] text-foreground break-words">
            {r.name}
          </p>
          <p className="mt-1 font-mono text-[11.5px] leading-none tracking-tight text-muted-foreground/70 break-all">
            @{r.username}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="tnum font-display text-[16px] font-medium leading-none tracking-[-0.02em] text-foreground">
              +{money(r.earned)}
            </p>
            <p className="tnum mt-1.5 text-[11px] leading-none text-muted-foreground/60">
              {joined}
            </p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground/40" strokeWidth={2} />
        </div>
      </button>
    </motion.li>
  )
}


// ---------- Detail view -------------------------------------------------------

function DetailView({
  referral: r,
  onClose,
  onBack,
  lang,
  t,
}: {
  referral: Referral
  onClose: () => void
  onBack: () => void
  lang: string
  t: TFn
}) {
  const locale = lang === 'ru' ? 'ru-RU' : lang === 'ar' ? 'ar-SA' : lang === 'zh' ? 'zh-CN' : 'en-US'
  const joinedDate = new Date(r.joinedAt)
  const joinedDay = joinedDate.getDate()
  const joinedMonthIdx = joinedDate.getMonth()
  const joinedYear = joinedDate.getFullYear()
  const RU_MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
  const EN_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const AR_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
  const joinedFull =
    lang === 'ru'
      ? `С ${joinedDay} ${RU_MONTHS_GEN[joinedMonthIdx]} ${joinedYear} г.`
      : lang === 'zh'
        ? `自 ${joinedYear}年${joinedMonthIdx + 1}月${joinedDay}日`
        : lang === 'ar'
          ? `منذ ${joinedDay} ${AR_MONTHS[joinedMonthIdx]} ${joinedYear}`
          : `Since ${EN_MONTHS[joinedMonthIdx]} ${joinedDay}, ${joinedYear}`

  const daysAgo = Math.max(1, Math.floor((Date.now() - r.joinedAt) / (24 * 60 * 60 * 1000)))
  const joinedLabel = lang === 'ru' ? 'В боте' : lang === 'zh' ? '加入' : lang === 'ar' ? 'انضم' : 'Joined'
  const profileLabel = lang === 'ru' ? 'Профиль' : lang === 'zh' ? '资料' : lang === 'ar' ? 'الملف' : 'Profile'
  const txLabel = lang === 'ru' ? 'Транзакции' : lang === 'zh' ? '交易' : lang === 'ar' ? 'المعاملات' : 'Transactions'
  const emptyLabel = lang === 'ru' ? 'Пока нет покупок' : lang === 'zh' ? '暂无购买' : lang === 'ar' ? 'لا مشتريات بعد' : 'No purchases yet'
  const earnedShort = lang === 'ru' ? 'вам' : lang === 'zh' ? '给你' : lang === 'ar' ? 'لك' : 'to you'
  const totalLabel = lang === 'ru' ? 'Всего заработано' : lang === 'zh' ? '总收益' : lang === 'ar' ? 'إجمالي الأرباح' : 'Total earned'
  const spentLabel = lang === 'ru' ? 'потратил' : lang === 'zh' ? '花费' : lang === 'ar' ? 'أنفق' : 'spent'
  const daysLabel =
    lang === 'ru'
      ? `${daysAgo} ${pluralRu(daysAgo, 'день', 'дня', 'дней')} назад`
      : lang === 'zh'
        ? `${daysAgo} 天前`
        : lang === 'ar'
          ? `منذ ${daysAgo} يوم`
          : `${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`

  return (
    <div>
      <SheetHeader
        icon={Users}
        title={profileLabel}
        onClose={onClose}
        right={<BackChip t={t} onClick={onBack} />}
      />

      {/* Profile hero */}
      <section className="mt-6 flex items-center gap-4">
        {r.avatarUrl ? (
          <img
            src={r.avatarUrl}
            alt=""
            className="size-16 shrink-0 rounded-full object-cover ring-1 ring-border-strong"
          />
        ) : (
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-[22px] font-medium text-foreground ring-1 ring-border-strong">
            {r.initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-display text-[18px] font-semibold leading-tight tracking-[-0.02em] text-foreground break-words">
            {r.name}
          </p>
          <p className="mt-1 font-mono text-[12px] leading-none text-muted-foreground break-all">
            @{r.username}
          </p>
          <p className="mt-1.5 font-mono text-[10.5px] leading-none uppercase tracking-[0.14em] text-muted-foreground/60">
            ID {r.id.toUpperCase()}
          </p>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border/50 bg-white/[0.015] px-4 py-3">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground/60">
            {joinedLabel}
          </p>
          <p className="mt-1.5 font-display text-[13px] font-medium uppercase tracking-[0.06em] leading-tight text-foreground">
            {joinedFull}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground/70">{daysLabel}</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-white/[0.015] px-4 py-3">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground/60">
            {totalLabel}
          </p>
          <p className="tnum mt-1.5 font-display text-[16px] font-medium leading-tight text-foreground">
            +{money(r.earned)}
          </p>
          <p className="tnum mt-0.5 text-[11px] text-muted-foreground/70">
            {spentLabel} {money(r.spent)}
          </p>
        </div>
      </section>

      {/* Transactions */}
      <section className="mt-7">
        <div className="mb-1 flex items-baseline justify-between px-1">
          <p className="font-display text-[13px] font-medium leading-none tracking-[-0.01em] text-foreground">
            {txLabel}
          </p>
          <p className="tnum text-[12px] font-medium text-muted-foreground/60">
            {String(r.transactions.length).padStart(2, '0')}
          </p>
        </div>
        {r.transactions.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-border/60 px-4 py-6 text-center text-[13px] text-muted-foreground">
            {emptyLabel}
          </p>
        ) : (
          <ul className="divide-y divide-border/40">
            {r.transactions.map((tx) => {
              const d = new Date(tx.date).toLocaleDateString(locale, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
              const time = new Date(tx.date).toLocaleTimeString(locale, {
                hour: '2-digit',
                minute: '2-digit',
              })
              return (
                <li key={tx.id} className="grid grid-cols-[1fr_auto] items-center gap-3 py-3.5">
                  <div className="min-w-0">
                    <p className="tnum font-display text-[14px] font-medium leading-tight text-foreground">
                      {d}
                    </p>
                    <p className="tnum mt-1 font-mono text-[11px] leading-none text-muted-foreground/60">
                      {time} · {spentLabel} {money(tx.spent)}
                    </p>
                  </div>
                  <p className="tnum font-display text-[15px] font-medium leading-none tracking-[-0.02em] text-foreground">
                    +{money(tx.earned)}
                    <span className="ml-1.5 text-[10.5px] font-normal text-muted-foreground/60">{earnedShort}</span>
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}




function Avatar({ referral }: { referral: Referral }) {
  if (referral.avatarUrl) {
    return (
      <img
        src={referral.avatarUrl}
        alt={referral.name}
        className="size-11 shrink-0 rounded-full object-cover ring-1 ring-border-strong"
      />
    )
  }
  return (
    <div
      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-[16px] font-semibold text-foreground ring-1 ring-border-strong"
      aria-hidden
    >
      {referral.initial}
    </div>
  )
}


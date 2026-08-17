'use client'

import { motion } from 'framer-motion'
import {
  ArrowUpRight,
  BadgeCheck,
  BrainCircuit,
  ChevronRight,
  Hourglass,
  Plus,
  Rocket,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { ACCOUNTS, MARKET_CATEGORIES, OTHER_SERVICES, SERVICES } from '@/lib/data'
import { money } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { useNav } from '@/lib/nav'
import { useStore } from '@/lib/store'
import type { MarketCategory } from '@/lib/types'
import { AurxMark } from '../aurx-mark'

const ease = [0.22, 1, 0.36, 1] as const

const ICONS: Record<string, LucideIcon> = {
  Rocket,
  Hourglass,
  Users,
  BrainCircuit,
  BadgeCheck,
  Sparkles,
}

// Highlight the standalone "X" in the hero title with the gold gradient
function renderHeroTitle(title: string) {
  return title.split(/(\bX\b)/).map((part, i) =>
    part === 'X' ? (
      <span key={i} className="text-gold-gradient">
        X
      </span>
    ) : (
      part
    ),
  )
}

function catMeta(cat: MarketCategory) {
  if (cat.route === 'catalog') {
    const from = Math.min(...SERVICES.map((s) => s.pricePer1000))
    return { from, count: SERVICES.length }
  }
  if (cat.route === 'services') {
    const from = Math.min(...OTHER_SERVICES.map((s) => s.price))
    return { from, count: OTHER_SERVICES.length }
  }
  const items = ACCOUNTS.filter((a) => a.category === cat.id)
  const from = items.length ? Math.min(...items.map((a) => a.pricePerAccount)) : 0
  return { from, count: items.length }
}

export function HomeScreen() {
  const { t, lang } = useI18n()
  const { go } = useNav()
  const { balance, cartCount } = useStore()

  const featured = MARKET_CATEGORIES.filter((c) => c.featured)
  const rest = MARKET_CATEGORIES.filter((c) => !c.featured)

  return (
    <div className="px-4 pt-3">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center">
            <AurxMark className="size-10" />
          </div>

          <div className="leading-none">
            <p className="font-display text-[17px] font-extrabold tracking-tight text-gold-gradient">
              {t('app_name')}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">{t('app_tagline')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => go('topup')}
            aria-label={t('topup')}
            className="pressable flex items-center gap-1.5 rounded-full border border-border bg-card py-1.5 pl-3 pr-1.5"
          >
            <Wallet className="size-4 text-primary" />
            <span className="tnum text-sm font-bold">{money(balance)}</span>
            <span className="flex size-6 items-center justify-center rounded-full bg-gold-gradient">
              <Plus className="size-3.5 text-primary-foreground" strokeWidth={3} />
            </span>
          </button>

          <button
            onClick={() => go('cart')}
            aria-label={t('nav_cart')}
            className="pressable relative flex size-10 items-center justify-center rounded-full border border-border bg-card"
          >
            <ShoppingBag className="size-[18px]" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex min-w-[18px] items-center justify-center rounded-full bg-gold-gradient px-1 text-[10px] font-bold text-primary-foreground ring-2 ring-background">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="mb-6"
      >
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1">
          <span className="size-1.5 rounded-full bg-primary animate-live" />
          <span className="text-[11px] font-bold tracking-wider text-primary">
            {t('badge_live')}
          </span>
          <span className="text-[11px] text-muted-foreground">·</span>
          <span className="text-[11px] font-medium text-muted-foreground">
            {t('badge_instant')}
          </span>
        </div>
        <h1 className="font-display text-pretty text-[32px] font-extrabold leading-[1.05] tracking-tight">
          {renderHeroTitle(t('hero_title'))}
        </h1>
        <p className="mt-2.5 max-w-[20rem] text-pretty text-[14px] leading-relaxed text-muted-foreground">
          {t('hero_sub')}
        </p>
      </motion.section>

      {/* Categories */}
      <div className="mb-2.5 flex items-center justify-between px-1">
        <p className="font-display text-base font-extrabold tracking-tight">
          {t('categories_title')}
        </p>
        <span className="text-[12px] text-muted-foreground">
          {MARKET_CATEGORIES.length}
        </span>
      </div>

      {/* Featured (Boost) — full width */}
      {featured.map((cat, i) => {
        const meta = catMeta(cat)
        const Icon = ICONS[cat.icon] ?? Rocket
        return (
          <motion.button
            key={cat.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.05, duration: 0.5, ease }}
            whileTap={{ scale: 0.98 }}
            onClick={() => go(cat.route, cat.id)}
            className="sheen gold-ring group relative mb-3 flex w-full items-center gap-4 overflow-hidden rounded-3xl border border-primary/40 bg-primary/10 p-5 text-start"
          >
            <div className="pointer-events-none absolute -bottom-6 -end-4 opacity-[0.12] transition-transform duration-500 group-hover:scale-110">
              <Icon className="size-32 text-primary" />
            </div>
            <div className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gold-gradient">
              <Icon className="size-7 text-primary-foreground" strokeWidth={2.4} />
            </div>
            <div className="relative min-w-0 flex-1">
              <p className="font-display text-[18px] font-extrabold tracking-tight">
                {cat.name[lang]}
              </p>
              <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                {cat.desc[lang]}
              </p>
              <p className="mt-2 text-[12px] font-semibold text-primary">
                {t('from_price')} {money(meta.from)}
                <span className="text-muted-foreground"> · {meta.count} {t('items_count')}</span>
              </p>
            </div>
            <ArrowUpRight className="relative size-5 shrink-0 text-primary rtl:rotate-90" />
          </motion.button>
        )
      })}

      {/* Rest — 2-col grid */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        {rest.map((cat, i) => {
          const meta = catMeta(cat)
          const Icon = ICONS[cat.icon] ?? Users
          const isBlue = cat.accent === 'blue'
          return (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + i * 0.05, duration: 0.5, ease }}
              whileTap={{ scale: 0.97 }}
              onClick={() => go(cat.route, cat.id)}
              className="group relative flex h-44 flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card p-4 text-start transition-colors active:bg-secondary"
            >
              <div className="pointer-events-none absolute -bottom-5 -end-3 opacity-[0.1] transition-transform duration-500 group-hover:scale-110">
                <Icon className={`size-24 ${isBlue ? 'text-info' : 'text-primary'}`} />
              </div>
              <div
                className={`relative flex size-11 items-center justify-center rounded-2xl ${
                  isBlue ? 'bg-info/15 text-info' : 'bg-primary/15 text-primary'
                }`}
              >
                <Icon className="size-[22px]" strokeWidth={2.3} />
              </div>
              <div className="relative">
                <p className="font-display text-[14px] font-extrabold leading-tight tracking-tight text-pretty">
                  {cat.name[lang]}
                </p>
                <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                  {cat.desc[lang]}
                </p>
                <p
                  className={`mt-1.5 flex items-center gap-1 text-[11px] font-semibold ${
                    isBlue ? 'text-info' : 'text-primary'
                  }`}
                >
                  {t('from_price')} {money(meta.from)}
                  <ChevronRight className="size-3.5 rtl:rotate-180" />
                </p>
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Sell your account CTA */}
      <motion.button
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5, ease }}
        whileTap={{ scale: 0.98 }}
        onClick={() => go('sell')}
        className="group relative mb-6 flex w-full items-center gap-4 overflow-hidden rounded-3xl border border-border-strong bg-elevated p-5 text-start"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,color-mix(in_oklab,var(--gold)_14%,transparent),transparent_60%)]" />
        <div className="pointer-events-none absolute -bottom-6 -end-3 opacity-[0.1] transition-transform duration-500 group-hover:scale-110">
          <Tag className="size-28 text-primary" />
        </div>
        <div className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10">
          <Tag className="size-6 text-primary" strokeWidth={2.3} />
        </div>
        <div className="relative min-w-0 flex-1">
          <p className="font-display text-[16px] font-extrabold tracking-tight">
            {t('sell_title')}
          </p>
          <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
            {t('sell_banner_desc')}
          </p>
        </div>
        <ArrowUpRight className="relative size-5 shrink-0 text-primary rtl:rotate-90" />
      </motion.button>

      {/* Trust line */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mb-2 flex items-center justify-center gap-2 text-[12px] text-muted-foreground"
      >
        <ShieldCheck className="size-4 text-primary" />
        {t('trust_line')}
      </motion.div>
    </div>
  )
}

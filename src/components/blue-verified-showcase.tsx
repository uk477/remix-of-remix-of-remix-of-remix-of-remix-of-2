'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Lock, Check } from 'lucide-react'
import { XLogo } from '@/components/x-logo'
import { VerifiedBadge } from '@/components/icons/verified-badge'
import { money } from '@/lib/format'
import type { AgedAccount, Lang } from '@/lib/types'

const BLUE = 'oklch(0.72 0.15 235)'

const COPY = {
  ru: {
    followersCap: 'ФОЛЛОВЕРЫ',
    followers: 'фолловеров',
    tweets: 'твитов',
    registered: 'регистрация',
    random: 'Выдаётся случайный',
    pcs: 'шт.',
    check: 'Галочка',
    checkValue: 'Оплачена на 30 дней',
    warranty: 'Гарантия',
    warrantyValue: '48 часов',
    about: 'Об аккаунте',
    buy: 'Купить',
    soldOut: 'Нет в наличии',
  },
  en: {
    followersCap: 'FOLLOWERS',
    followers: 'followers',
    tweets: 'tweets',
    registered: 'registered',
    random: 'Random account',
    pcs: 'pcs',
    check: 'Checkmark',
    checkValue: 'Paid for 30 days',
    warranty: 'Warranty',
    warrantyValue: '48 hours',
    about: 'About the account',
    buy: 'Buy',
    soldOut: 'Sold out',
  },
}

function fmtShort(n: number, ru: boolean) {
  if (n >= 1000) {
    const v = n / 1000
    const s = Number.isInteger(v) ? String(v) : v.toFixed(1)
    return `${s}${ru ? 'к' : 'K'}`
  }
  return String(n)
}

function rangeLabel(a: AgedAccount, ru: boolean) {
  const r = a.followersRange
  if (r) return `${fmtShort(r[0], ru)}–${fmtShort(r[1], ru)}`
  return fmtShort(a.followers ?? 0, ru)
}

export function BlueVerifiedShowcase({
  list,
  lang,
  onOpen,
  onAdminMenu,
}: {
  list: AgedAccount[]
  lang: string
  onOpen: (a: AgedAccount) => void
  onAdminMenu?: (a: AgedAccount) => void
}) {
  const ru = lang === 'ru'
  const L = ru ? COPY.ru : COPY.en

  const tiers = useMemo(
    () =>
      [...list].sort(
        (a, b) => (a.followersRange?.[1] ?? a.followers ?? 0) - (b.followersRange?.[1] ?? b.followers ?? 0),
      ),
    [list],
  )

  const [activeId, setActiveId] = useState<string | null>(tiers[0]?.id ?? null)
  useEffect(() => {
    if (!tiers.length) return
    if (!activeId || !tiers.some((t) => t.id === activeId)) setActiveId(tiers[0].id)
  }, [tiers, activeId])

  const active = tiers.find((t) => t.id === activeId) ?? tiers[0]
  const [aboutOpen, setAboutOpen] = useState(false)

  if (!active) return null

  const soldOut = active.stock <= 0
  const desc = active.description?.[lang as Lang] ?? active.description?.en ?? ''
  const stockTone =
    active.stock <= 0
      ? 'border-destructive/40 bg-destructive/10 text-destructive'
      : active.stock <= 10
        ? 'border-primary/40 bg-primary/10 text-primary'
        : 'border-info/40 bg-info/10 text-info'

  return (
    <div className="flex flex-1 flex-col pb-28">
      {/* Tier selector */}
      <div className="px-4 pt-3">
        <p className="font-dm-sans text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/70">
          {L.followersCap}
        </p>
        <div className="mt-2 flex items-stretch gap-1 overflow-x-auto border-b border-border/70">
          {tiers.map((t) => {
            const on = t.id === active.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveId(t.id)}
                className="relative flex min-w-0 flex-1 shrink-0 flex-col items-center gap-0.5 px-2 pb-2.5 pt-1 outline-none"
              >
                <span
                  className={`font-space-grotesk whitespace-nowrap text-[15px] font-bold tracking-[-0.02em] transition-colors ${
                    on ? 'text-foreground' : 'text-muted-foreground/60'
                  }`}
                >
                  {rangeLabel(t, ru)}
                </span>
                <span
                  className={`font-dm-sans text-[12px] font-semibold tabular-nums transition-colors ${
                    on ? 'text-primary' : 'text-muted-foreground/45'
                  }`}
                >
                  ${Math.round(t.pricePerAccount)}
                </span>
                {on && (
                  <motion.span
                    layoutId="blue-tier-underline"
                    className="absolute -bottom-px left-3 right-3 h-[2px] rounded-full bg-primary"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Preview card */}
      <div className="px-4 pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onContextMenu={(e) => {
              if (onAdminMenu) {
                e.preventDefault()
                onAdminMenu(active)
              }
            }}
            className="relative overflow-hidden rounded-2xl border border-border/70 bg-card"
          >
            {/* Hero band */}
            <div className="relative h-24 overflow-hidden bg-gradient-to-br from-[#101a24] to-[#0c1016]">
              <div
                aria-hidden
                className="absolute inset-0 opacity-[0.14]"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(115deg, rgba(255,255,255,0.6) 0 1px, transparent 1px 9px)',
                }}
              />
              <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/55 px-2.5 py-1.5 backdrop-blur">
                <Lock className="size-3 text-white/60" strokeWidth={2.4} />
                <span className="font-dm-sans text-[11px] font-medium text-white/80">{L.random}</span>
              </div>
            </div>

            {/* Avatar */}
            <div className="relative px-4">
              <div className="absolute -top-8 left-4">
                <div className="relative flex size-16 items-center justify-center rounded-full border-[3px] border-card bg-black">
                  <XLogo className="size-7 text-white" />
                  <VerifiedBadge
                    className="absolute -bottom-0.5 right-0 size-[18px] rounded-full bg-card"
                    style={{ color: BLUE }}
                  />
                </div>
              </div>
              <div className="h-10" />
            </div>

            {/* Identity */}
            <div className="px-4 pt-1">
              <div className="flex items-center gap-1.5">
                <h2 className="font-space-grotesk text-[19px] font-bold tracking-[-0.02em] text-foreground">
                  Blue Verified
                </h2>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="font-dm-sans text-[13px] text-muted-foreground">@</span>
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className="size-2.5 rounded-[3px] bg-muted-foreground/25" />
                ))}
              </div>
              <div className="mt-3 space-y-2">
                <div className="h-2 w-[85%] rounded-full bg-muted-foreground/15" />
                <div className="h-2 w-[62%] rounded-full bg-muted-foreground/15" />
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-start gap-6 px-4 pb-5 pt-4">
              <Stat value={rangeLabel(active, ru)} label={L.followers} />
              <Stat value={ru ? '0–5 000' : '0–5,000'} label={L.tweets} />
              <Stat value={active.yearRange || String(active.year ?? '—')} label={L.registered} />
            </div>

            {/* Stock chip */}
            <div
              className={`absolute right-3 top-[86px] rounded-lg border px-2.5 py-1 font-dm-sans text-[12px] font-bold tabular-nums ${stockTone}`}
            >
              {active.stock} {L.pcs}
            </div>
          </motion.div>
      </AnimatePresence>
      </div>

      {/* Description */}
      {desc && (
        <p className="px-4 pt-4 font-dm-sans text-[14px] leading-relaxed text-muted-foreground">
          {desc}
        </p>
      )}

      {/* Spec rows */}
      <div className="mt-4 px-4">
        <SpecRow label={L.check} value={L.checkValue} />
        <SpecRow label={L.warranty} value={L.warrantyValue} />

        <button
          type="button"
          onClick={() => setAboutOpen((v) => !v)}
          className="flex w-full items-center justify-between border-b border-border/60 py-4 text-left outline-none"
        >
          <span className="font-dm-sans text-[14px] font-semibold text-foreground">{L.about}</span>
          <ChevronDown
            className={`size-4 text-muted-foreground transition-transform duration-300 ${aboutOpen ? 'rotate-180' : ''}`}
          />
        </button>
        <AnimatePresence initial={false}>
          {aboutOpen && (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              {active.features.map((f, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 py-2 font-dm-sans text-[13px] text-muted-foreground first:pt-3"
                >
                  <Check className="mt-0.5 size-3.5 shrink-0 text-info" strokeWidth={2.6} />
                  {f[lang as Lang] ?? f.en}
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky buy bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3 backdrop-blur">
        <motion.button
          type="button"
          whileTap={{ scale: soldOut ? 1 : 0.985 }}
          disabled={soldOut}
          onClick={() => onOpen(active)}
          className="flex h-14 w-full items-center overflow-hidden rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
        >
          <span className="flex-1 px-5 text-left font-dm-sans text-[15px] font-semibold">
            {soldOut ? L.soldOut : L.buy}
          </span>
          <span className="flex h-full items-center border-l border-black/15 px-5 font-space-grotesk text-[19px] font-bold tabular-nums">
            {money(active.pricePerAccount)}
          </span>
        </motion.button>
      </div>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-space-grotesk text-[16px] font-bold tracking-[-0.02em] tabular-nums text-foreground">
        {value}
      </span>
      <span className="font-dm-sans text-[12px] text-muted-foreground">{label}</span>
    </div>
  )
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-4">
      <span className="font-dm-sans text-[14px] text-muted-foreground">{label}</span>
      <span className="font-dm-sans text-[14px] font-semibold text-foreground">{value}</span>
    </div>
  )
}

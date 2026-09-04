'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Lock } from 'lucide-react'
import { XLogo } from '@/components/x-logo'
import { VerifiedBadge } from '@/components/icons/verified-badge'
import {
  IconAgeRings,
  IconPoolShuffle,
  IconMailVault,
  IconKey2FA,
  IconBoostReady,
  IconBulkExport,
  IconBlueCheck,
  IconWarrantyClock,
} from '@/components/icons/blue-account-icons'
import { money } from '@/lib/format'
import type { AgedAccount, Lang } from '@/lib/types'

const BLUE = 'oklch(0.72 0.15 235)'

const ABOUT_ICONS = [
  IconAgeRings,
  IconPoolShuffle,
  IconMailVault,
  IconKey2FA,
  IconBoostReady,
  IconBulkExport,
] as const


const COPY = {
  ru: {
    followersCap: 'ФОЛЛОВЕРЫ',
    followers: 'фолловеров',
    tweets: 'твитов',
    registered: 'регистрация',
    random: 'Выдаётся случайный',
    hidden: 'Скрыт',
    pcs: 'шт.',
    check: 'Галочка',
    checkValue: 'Оплачена на 30 дней',
    warranty: 'Гарантия',
    warrantyValue: '48 часов',
    about: 'Об аккаунте',
    aboutKicker: 'Что вы получаете',
    aboutIntro:
      'Свежий аккаунт с оплаченной синей галочкой и небольшой аудиторией. Чистая база под любые задачи.',
    aboutItems: [
      {
        tag: 'Возраст',
        t: 'История, а не витрина',
        d: 'Регистрация **2009–2026**, живая лента и чистая репутация: без блокировок, жалоб и следов перепродажи.',
      },
      {
        tag: 'Пул',
        t: 'Профиль выдаётся случайно',
        d: 'Аккаунт берётся из закрытого пула. Ник, аватар и описание **переписываете под себя** за пару минут.',
      },
      {
        tag: 'Почта',
        t: 'Ящик идёт в комплекте',
        d: 'Полный доступ к привязанной почте: восстановление и коды подтверждения **остаются на вашей стороне**.',
      },
      {
        tag: 'Доступ',
        t: 'Логин, пароль и 2FA-ключ',
        d: 'Данные приходят сразу после оплаты. Меняете пароль первым делом — и аккаунт **только ваш**.',
      },
      {
        tag: 'Буст',
        t: 'Готов к продвижению',
        d: 'Сразу запускайте наши **фолловеров, лайки и просмотры** — прогрев и отлёжка не нужны.',
      },
      {
        tag: 'Опт',
        t: 'Партии и выгрузка списком',
        d: 'Нужен объём? Соберём партию под задачу и отдадим **таблицей** — напишите в поддержку.',
      },
    ],
    aboutNote:
      'Зайдите в аккаунт сразу после покупки: гарантия и бесплатная замена действуют **48 часов** с момента выдачи.',
    buy: 'Купить',
    soldOut: 'Нет в наличии',
  },
  en: {
    followersCap: 'FOLLOWERS',
    followers: 'followers',
    tweets: 'tweets',
    registered: 'registered',
    random: 'Random account',
    hidden: 'Hidden',
    pcs: 'pcs',
    check: 'Checkmark',
    checkValue: 'Paid for 30 days',
    warranty: 'Warranty',
    warrantyValue: '48 hours',
    about: 'About the account',
    aboutKicker: 'What you get',
    aboutIntro:
      'Fresh account with a paid blue checkmark and a small audience. Clean base for any task.',
    aboutItems: [
      {
        tag: 'Age',
        t: 'History, not a shell',
        d: 'Registered between **2009 and 2026**, organic activity and a clean record: no strikes, no complaints, no resale traces.',
      },
      {
        tag: 'Pool',
        t: 'Profile assigned at random',
        d: 'The account comes from a closed pool. Handle, avatar and bio are **yours to rewrite** in a couple of minutes.',
      },
      {
        tag: 'Mail',
        t: 'Mailbox included',
        d: 'Full access to the linked email, so recovery and confirmation codes **stay on your side**.',
      },
      {
        tag: 'Access',
        t: 'Login, password and 2FA key',
        d: 'Credentials arrive right after payment. Change the password first and the account is **only yours**.',
      },
      {
        tag: 'Boost',
        t: 'Promotion-ready',
        d: 'Run our **followers, likes and views** on it immediately — no warm-up, no cool-down.',
      },
      {
        tag: 'Bulk',
        t: 'Batches and export',
        d: 'Need volume? We assemble a batch and hand it over as a **spreadsheet** — just ask support.',
      },
    ],
    aboutNote:
      'Log in right after purchase: warranty and free replacement are valid for **48 hours** after delivery.',
    buy: 'Buy',
    soldOut: 'Sold out',
  },
}

/** Подсветка **ключевых** фрагментов внутри строки. */
function Rich({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return (
    <span className={className}>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-foreground/90">
            {p}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </span>
  )
}



const EASE = [0.22, 1, 0.36, 1] as const

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
      ? 'border-destructive/40 bg-destructive/12 text-destructive'
      : active.stock <= 10
        ? 'border-primary/45 bg-primary/12 text-primary'
        : 'border-info/40 bg-info/12 text-info'

  return (
    <div className="flex flex-1 flex-col pb-32">
      {/* Tier selector */}
      <div className="px-4 pt-3">
        <div className="flex items-center gap-2">
          <span className="h-px flex-none w-4 bg-gradient-to-r from-transparent to-primary/60" />
          <p className="font-dm-sans text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/75">
            {L.followersCap}
          </p>
        </div>
        <div className="mt-2.5 flex items-stretch gap-1 overflow-x-auto border-b border-border/70">
          {tiers.map((t) => {
            const on = t.id === active.id
            return (
              <motion.button
                key={t.id}
                type="button"
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                onClick={() => setActiveId(t.id)}
                className="relative flex min-w-0 flex-1 shrink-0 flex-col items-center gap-0.5 px-2 pb-3 pt-1.5 outline-none"
              >
                <span
                  className={`font-space-grotesk whitespace-nowrap text-[16px] font-bold leading-none tracking-[-0.03em] transition-colors duration-200 ${
                    on ? 'text-foreground' : 'text-muted-foreground/55'
                  }`}
                >
                  {rangeLabel(t, ru)}
                </span>
                <span
                  className={`font-dm-sans text-[12px] font-bold tabular-nums leading-none transition-colors duration-200 ${
                    on ? 'text-primary' : 'text-muted-foreground/40'
                  }`}
                >
                  ${Math.round(t.pricePerAccount)}
                </span>
                {on && (
                  <>
                    <motion.span
                      layoutId="blue-tier-underline"
                      className="absolute -bottom-px left-2.5 right-2.5 h-[2.5px] rounded-full bg-primary"
                      transition={{ type: 'spring', stiffness: 430, damping: 36 }}
                    />
                    <motion.span
                      layoutId="blue-tier-glow"
                      aria-hidden
                      className="pointer-events-none absolute -bottom-2 left-1/2 h-8 w-16 -translate-x-1/2 rounded-full bg-primary/25 blur-xl"
                      transition={{ type: 'spring', stiffness: 430, damping: 36 }}
                    />
                  </>
                )}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Preview card */}
      <div className="px-4 pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.3, ease: EASE }}
            onContextMenu={(e) => {
              if (onAdminMenu) {
                e.preventDefault()
                onAdminMenu(active)
              }
            }}
            className="relative overflow-hidden rounded-[20px] border border-border/70 bg-card shadow-[0_18px_50px_-30px_rgba(0,0,0,0.9)]"
          >
            {/* Hero band */}
            <div className="relative h-24 overflow-hidden bg-gradient-to-br from-[#0f1a26] via-[#0d1219] to-[#0a0d12]">
              <div
                aria-hidden
                className="absolute inset-0 opacity-[0.13]"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(115deg, rgba(255,255,255,0.65) 0 1px, transparent 1px 9px)',
                }}
              />
              <motion.div
                aria-hidden
                className="absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/12 to-transparent"
                animate={{ x: ['0%', '460%'] }}
                transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.6 }}
              />
              <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-white/12 bg-black/60 px-2.5 py-1.5 backdrop-blur">
                <Lock className="size-3 text-white/60" strokeWidth={2.6} />
                <span className="font-dm-sans text-[11px] font-semibold tracking-[0.01em] text-white/85">
                  {L.random}
                </span>
              </div>
            </div>

            {/* Avatar */}
            <div className="relative px-4">
              <motion.div
                className="absolute -top-8 left-4"
                initial={{ scale: 0.86, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.06, type: 'spring', stiffness: 380, damping: 24 }}
              >
                <div className="relative flex size-16 select-none items-center justify-center rounded-full border-[3px] border-card bg-black blur-[5px]">
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-full"
                    style={{ boxShadow: `0 0 0 1px ${BLUE}22, 0 8px 24px -10px ${BLUE}` }}
                  />
                  <XLogo className="size-7 text-white" />
                </div>
              </motion.div>
              <div className="h-10" />
            </div>

            {/* Identity */}
            <div className="px-4 pt-1">
              <div className="flex items-center gap-1.5">
                <h2 className="font-space-grotesk text-[20px] font-bold leading-none tracking-[-0.035em] text-foreground blur-[5px] select-none">
                  Classic Drift
                </h2>
                <motion.span
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.14, type: 'spring', stiffness: 500, damping: 18 }}
                  className="inline-flex"
                >
                  <VerifiedBadge className="size-[19px]" style={{ color: BLUE }} />
                </motion.span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="select-none font-dm-sans text-[13.5px] text-muted-foreground/70 blur-[4px]">
                  @classicdrift_92
                </span>
              </div>

              <div className="mt-3 space-y-2">
                <div className="h-2 w-[85%] rounded-full bg-muted-foreground/14 blur-[3px]" />
                <div className="h-2 w-[62%] rounded-full bg-muted-foreground/14 blur-[3px]" />
              </div>

            </div>

            {/* Stats */}
            <div className="flex items-start gap-6 px-4 pb-5 pt-4">
              <Stat value={rangeLabel(active, ru)} label={L.followers} delay={0.05} />
              <Stat value={ru ? '0–5 000' : '0–5,000'} label={L.tweets} delay={0.11} />
              <Stat value="2009–2026" label={L.registered} delay={0.17} />
            </div>

            {/* Stock chip */}
            <motion.div
              key={`stock-${active.id}`}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.25, ease: EASE }}
              className={`absolute right-3 top-[86px] rounded-full border px-2.5 py-1 font-dm-sans text-[12px] font-bold tabular-nums backdrop-blur ${stockTone}`}
            >
              {active.stock} {L.pcs}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Description */}
      <AnimatePresence mode="wait">
        {desc && (
          <motion.div
            key={`d-${active.id}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="px-4 pt-4"
          >
            <div className="relative rounded-[16px] border border-border/60 bg-card/50 px-4 py-3.5 pl-5">
              <span
                aria-hidden
                className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
                style={{ background: `linear-gradient(180deg, ${BLUE}, ${BLUE}22)` }}
              />
              <p className="font-dm-sans text-[13.5px] leading-[1.7] text-muted-foreground">{desc}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spec rows */}
      <div className="mt-4 px-4">
        <SpecRow
          icon={<IconBlueCheck className="size-[18px]" style={{ color: BLUE }} />}
          label={L.check}
          value={L.checkValue}
        />
        <SpecRow
          icon={<IconWarrantyClock className="size-[18px] text-primary" />}
          label={L.warranty}
          value={L.warrantyValue}
        />

        <motion.button
          type="button"
          whileTap={{ scale: 0.99 }}
          onClick={() => setAboutOpen((v) => !v)}
          className="flex w-full items-center justify-between border-b border-border/60 py-4 text-left outline-none"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-[10px] border"
              style={{ background: `${BLUE}12`, borderColor: `${BLUE}2e`, color: BLUE }}
            >
              <XLogo className="size-[13px]" />
            </span>
            <span className="min-w-0">
              <span className="block font-space-grotesk text-[14.5px] font-bold leading-none tracking-[-0.02em] text-foreground">
                {L.about}
              </span>
              <span className="mt-1 block font-dm-sans text-[11px] uppercase leading-none tracking-[0.14em] text-muted-foreground/70">
                {L.aboutKicker}
              </span>
            </span>
          </span>
          <motion.span
            animate={{ rotate: aboutOpen ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border/70 bg-card"
          >
            <ChevronDown className="size-4 text-muted-foreground" />
          </motion.span>
        </motion.button>

        <AnimatePresence initial={false}>
          {aboutOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="overflow-hidden"
            >
              <div className="mt-4 overflow-hidden rounded-[18px] border border-border/70 bg-card/70">
                <div className="relative px-4 py-4">
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, ${BLUE}88, transparent)` }}
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -left-10 -top-14 size-32 rounded-full blur-2xl"
                    style={{ background: `${BLUE}1f` }}
                  />
                  <Rich
                    text={L.aboutIntro}
                    className="relative block font-dm-sans text-[13.5px] leading-[1.75] text-muted-foreground"
                  />
                </div>

                <ul className="px-4 pb-1">
                  {L.aboutItems.map((item, i) => {
                    const Icon = ABOUT_ICONS[i % ABOUT_ICONS.length]
                    return (
                      <motion.li
                        key={item.t}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.06 + i * 0.05, duration: 0.3, ease: EASE }}
                        className="flex items-start gap-3 border-t border-border/40 py-3.5"
                      >
                        <span
                          className="mt-px flex size-8 shrink-0 items-center justify-center rounded-[10px] border"
                          style={{
                            background: `linear-gradient(145deg, ${BLUE}1f, transparent)`,
                            borderColor: `${BLUE}33`,
                          }}
                        >
                          <Icon className="size-[17px]" style={{ color: BLUE }} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="font-space-grotesk text-[13.5px] font-bold leading-tight tracking-[-0.015em] text-foreground">
                              {item.t}
                            </span>
                            <span
                              className="rounded-full px-1.5 py-[2px] font-dm-sans text-[9.5px] font-bold uppercase leading-none tracking-[0.1em]"
                              style={{ background: `${BLUE}18`, color: BLUE }}
                            >
                              {item.tag}
                            </span>
                          </span>
                          <Rich
                            text={item.d}
                            className="mt-1.5 block font-dm-sans text-[12.5px] leading-[1.65] text-muted-foreground"
                          />
                        </span>
                      </motion.li>
                    )
                  })}
                </ul>

                <div className="flex items-start gap-2.5 border-t border-border/60 bg-primary/[0.07] px-4 py-3.5">
                  <IconWarrantyClock className="mt-px size-[18px] shrink-0 text-primary" />
                  <Rich
                    text={L.aboutNote}
                    className="font-dm-sans text-[12.5px] leading-[1.6] text-muted-foreground"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>


      {/* Sticky buy bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/92 px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3 backdrop-blur-xl">
        <motion.button
          type="button"
          whileTap={{ scale: soldOut ? 1 : 0.975 }}
          transition={{ type: 'spring', stiffness: 520, damping: 30 }}
          disabled={soldOut}
          onClick={() => onOpen(active)}
          className="relative flex h-14 w-full items-center overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-[0_14px_38px_-16px_var(--color-primary)] disabled:opacity-40 disabled:shadow-none"
        >
          {!soldOut && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -left-1/4 w-1/4 skew-x-[-20deg] bg-white/25 blur-[2px]"
              animate={{ x: ['0%', '560%'] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.8 }}
            />
          )}
          <span className="relative flex-1 px-5 text-left font-dm-sans text-[15px] font-bold tracking-[0.01em]">
            {soldOut ? L.soldOut : L.buy}
          </span>
          <span className="relative flex h-full items-center border-l border-black/15 px-5 font-space-grotesk text-[20px] font-bold tabular-nums tracking-[-0.02em]">
            {money(active.pricePerAccount)}
          </span>
        </motion.button>
      </div>
    </div>
  )
}

function Stat({ value, label, delay = 0 }: { value: string; label: string; delay?: number }) {
  return (
    <motion.div
      className="flex flex-col"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: EASE }}
    >
      <span className="font-space-grotesk text-[17px] font-bold leading-none tracking-[-0.03em] tabular-nums text-foreground">
        {value}
      </span>
      <span className="mt-1.5 font-dm-sans text-[12px] text-muted-foreground">{label}</span>
    </motion.div>
  )
}

function SpecRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-4">
      <span className="flex items-center gap-2 font-dm-sans text-[14px] text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-dm-sans text-[14px] font-semibold text-foreground">{value}</span>
    </div>
  )
}

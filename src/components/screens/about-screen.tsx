'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { MessageCircle, ScrollText, Send, ShieldCheck, Star } from 'lucide-react'

import { ScreenHeader } from '@/components/screen-header'
import { XLogo } from '@/components/x-logo'
import { RulesSheet } from '@/components/rules-sheet'
import { useI18n } from '@/lib/i18n'
import { useNav } from '@/lib/nav'

const STATS = [
  { value: '1000+', label: { en: 'Sales', ru: 'ПРОДАЖ', ar: 'مبيعات', zh: '销售', es: 'Ventas', tr: 'Satış', pt: 'Vendas', fr: 'Ventes', uk: 'Продажів' }, highlight: false },
  { value: '4.9', label: { en: 'Rating', ru: 'Рейтинг', ar: 'التقييم', zh: '评分', es: 'Valoración', tr: 'Puan', pt: 'Avaliação', fr: 'Note', uk: 'Рейтинг' }, highlight: true },
  { value: '24/7', label: { en: 'Support', ru: 'Саппорт', ar: 'الدعم', zh: '客服', es: 'Soporte', tr: 'Destek', pt: 'Suporte', fr: 'Assistance', uk: 'Підтримка' }, highlight: false },
]


const PRIMARY_LINKS = [
  {
    icon: Send,
    iconColor: 'text-sky-400',
    iconBg: 'bg-sky-500/15',
    titleKey: 'link_channel',
    descKey: 'link_channel_desc',
    href: 'https://t.me/aurex_news',
  },
  {
    icon: MessageCircle,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/15',
    titleKey: 'link_contact',
    descKey: 'link_contact_desc',
    href: 'https://t.me/aurex_support',
  },
] as const

const SECONDARY_LINKS = [
  {
    icon: ScrollText,
    titleKey: 'link_rules',
    descKey: 'link_rules_desc',
    href: 'https://t.me/aurex_rules',
  },
  {
    icon: Star,
    titleKey: 'link_reviews',
    descKey: 'link_reviews_desc',
    href: 'https://t.me/aurex_reviews',
  },
] as const

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
})

export function AboutScreen() {
  const { t, lang } = useI18n()
  const { back, canGoBack } = useNav()
  const [rulesOpen, setRulesOpen] = useState(false)

  return (
    <div className="relative overflow-hidden">
      {/* ambient gold glows */}
      <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-primary/10 blur-[100px]" />
      <div className="pointer-events-none absolute top-1/3 -left-24 size-64 rounded-full bg-primary/5 blur-[80px]" />

      <ScreenHeader title={t('about')} onBack={canGoBack ? back : undefined} />

      <div className="relative z-10 space-y-6 px-5 pt-6">
        {/* Brand hero */}
        <motion.section
          {...fadeUp(0)}
          className="flex flex-col items-center pt-4"
        >
          <div className="relative">
            <div className="absolute inset-0 animate-pulse bg-primary/25 blur-3xl" />
            <div className="relative flex size-28 rotate-45 items-center justify-center border-2 border-primary bg-black/40 backdrop-blur-xl">
              <div className="-rotate-45">
                <XLogo className="size-10 text-primary" />
              </div>
            </div>
          </div>
          <h2 className="mt-8 text-4xl font-extrabold tracking-tighter">
            Aure<span className="text-primary">X</span>
          </h2>
          <p className="mt-2 text-xs font-medium uppercase tracking-[0.28em] text-white/50">
            Premium X Marketplace
          </p>
        </motion.section>

        {/* Stats row */}
        <motion.section {...fadeUp(0.08)} className="grid grid-cols-3 gap-3">
          {STATS.map((s, i) => (
            <motion.div
              key={i}
              whileTap={{ scale: 0.96 }}
              className={
                s.highlight
                  ? 'flex flex-col items-center justify-center gap-1 rounded-2xl bg-primary p-4 shadow-[0_10px_30px_-10px_var(--primary)]'
                  : 'flex flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-4'
              }
            >
              <span
                className={
                  s.highlight
                    ? 'text-lg font-bold text-black'
                    : 'text-lg font-bold text-primary'
                }
              >
                {s.value}
              </span>
              <span
                className={
                  s.highlight
                    ? 'text-center text-[10px] font-bold uppercase tracking-wider text-black/60'
                    : 'text-center text-[10px] font-bold uppercase tracking-wider text-white/40'
                }
              >
                {s.label[lang]}
              </span>
            </motion.div>
          ))}
        </motion.section>

        {/* Security note */}
        <motion.section {...fadeUp(0.14)}>
          <div className="flex items-center gap-3 rounded-r-xl border-l-2 border-primary bg-gradient-to-r from-primary/15 to-transparent px-4 py-3">
            <ShieldCheck className="size-5 shrink-0 text-primary" />
            <span className="text-xs font-medium leading-relaxed text-white/80">
              {t('secure_note')}
            </span>
          </div>
        </motion.section>

        {/* Primary channel links */}
        <section className="space-y-3">
          {PRIMARY_LINKS.map((l, i) => (
            <motion.a
              key={l.titleKey}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              {...fadeUp(0.2 + i * 0.06)}
              whileTap={{ scale: 0.98 }}
              className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-colors hover:border-primary/50"
            >
              <div className="flex items-center gap-4">
                <span
                  className={`flex size-10 items-center justify-center rounded-xl ${l.iconBg}`}
                >
                  <l.icon className={`size-5 ${l.iconColor}`} />
                </span>
                <div>
                  <div className="text-sm font-bold">
                    {t(l.titleKey as never)}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-white/40">
                    {t(l.descKey as never)}
                  </div>
                </div>
              </div>
              <svg
                className="size-4 text-white/25 transition-colors group-hover:text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </motion.a>
          ))}

          {/* Secondary links — compact grid */}
          <motion.div {...fadeUp(0.34)} className="grid grid-cols-2 gap-3">
            {/* Rules — opens sheet */}
            <motion.button
              key="link_rules"
              onClick={() => setRulesOpen(true)}
              whileTap={{ scale: 0.97 }}
              className="group flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition-colors hover:border-primary/50"
            >
              <ScrollText className="size-4 text-primary/80 transition-colors group-hover:text-primary" />
              <div>
                <div className="text-xs font-bold">
                  {t('link_rules' as never)}
                </div>
                <div className="mt-1 text-[9px] uppercase leading-tight tracking-wider text-white/30">
                  {t('link_rules_desc' as never)}
                </div>
              </div>
            </motion.button>

            {/* Reviews — external link */}
            <motion.a
              key="link_reviews"
              href="https://t.me/aurex_reviews"
              target="_blank"
              rel="noopener noreferrer"
              whileTap={{ scale: 0.97 }}
              className="group flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-colors hover:border-primary/50"
            >
              <Star className="size-4 text-primary/80 transition-colors group-hover:text-primary" />
              <div>
                <div className="text-xs font-bold">
                  {t('link_reviews' as never)}
                </div>
                <div className="mt-1 text-[9px] uppercase leading-tight tracking-wider text-white/30">
                  {t('link_reviews_desc' as never)}
                </div>
              </div>
            </motion.a>
          </motion.div>
        </section>

        <p className="pt-2 text-center text-[10px] font-medium uppercase tracking-[0.25em] text-white/25">
          AureX · v2.4
        </p>
      </div>

      <RulesSheet open={rulesOpen} onOpenChange={setRulesOpen} />
    </div>
  )
}

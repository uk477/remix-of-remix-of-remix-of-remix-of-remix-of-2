'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, ShieldCheck, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { LANGS, useI18n } from '@/lib/i18n'
import type { Lang } from '@/lib/types'
import { AurxMark } from './aurx-mark'
import { Flag } from './ui/flag'
import { XButton } from './ui/x-button'

const SUBTITLE: Record<Lang, string> = {
  en: 'Choose your language to continue',
  ru: 'Выберите язык, чтобы продолжить',
  ar: 'اختر لغتك للمتابعة',
  zh: '选择语言以继续',
  es: 'Elige tu idioma para continuar',
  tr: 'Devam etmek için dilini seç',
  pt: 'Escolha seu idioma para continuar',
  fr: 'Choisissez votre langue pour continuer',
  uk: 'Виберіть мову, щоб продовжити',
}

const CONTINUE: Record<Lang, string> = {
  en: 'Continue',
  ru: 'Продолжить',
  ar: 'متابعة',
  zh: '继续',
  es: 'Continuar',
  tr: 'Devam et',
  pt: 'Continuar',
  fr: 'Continuer',
  uk: 'Продовжити',
}


// Kinetic multilingual greeting that cycles above the wordmark
const GREETINGS = ['Welcome', 'Добро пожаловать', 'أهلاً وسهلاً', 'Bienvenue', '欢迎', 'Bienvenido', 'Hoş geldiniz', 'Bem-vindo', 'Ласкаво просимо']

// Decorative floating sparks (deterministic positions to avoid hydration drift)
const SPARKS = [
  { left: '12%', top: '18%', size: 3, delay: 0, dur: 6 },
  { left: '82%', top: '12%', size: 4, delay: 1.2, dur: 7 },
  { left: '68%', top: '30%', size: 2, delay: 0.6, dur: 5.5 },
  { left: '24%', top: '40%', size: 2, delay: 2.1, dur: 6.5 },
  { left: '90%', top: '46%', size: 3, delay: 1.8, dur: 7.5 },
  { left: '6%', top: '54%', size: 2, delay: 0.9, dur: 6 },
]

export function LanguageGate() {
  const { confirmLang } = useI18n()
  const [selected, setSelected] = useState<Lang>('en')
  const [greetIdx, setGreetIdx] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setGreetIdx((i) => (i + 1) % GREETINGS.length)
    }, 2200)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative z-50 mx-auto flex h-svh w-full max-w-[480px] flex-col overflow-hidden bg-background">
      {/* Layered animated background */}
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-[360px]" />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[150%] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--gold)_26%,transparent),transparent_70%)] blur-2xl"
        animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.08, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-[-10%] right-[-15%] h-72 w-72 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--gold-deep)_22%,transparent),transparent_70%)] blur-2xl"
        animate={{ opacity: [0.35, 0.7, 0.35] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
      {SPARKS.map((s, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="pointer-events-none absolute rounded-full bg-primary/70"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size }}
          animate={{ y: [0, -18, 0], opacity: [0, 1, 0] }}
          transition={{ duration: s.dur, repeat: Infinity, ease: 'easeInOut', delay: s.delay }}
        />
      ))}

      <div className="relative z-10 flex h-full flex-col justify-between px-5 pb-6 pt-10">
        <div className="shrink-0">
          {/* Logo mark with pulsing glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 16 }}
            className="relative mb-5 flex size-[52px] items-center justify-center"
          >
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-[18px] bg-[radial-gradient(circle,color-mix(in_oklab,var(--gold)_55%,transparent),transparent_70%)] blur-md"
              animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.12, 1] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="gold-ring sheen relative flex size-[52px] items-center justify-center rounded-[18px] border border-border-strong bg-card">
              <AurxMark className="size-8" />
            </div>
          </motion.div>

          {/* Kinetic multilingual greeting */}
          <div className="mb-1.5 h-5 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={greetIdx}
                dir="auto"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="text-[12px] font-bold uppercase tracking-[0.28em] text-primary/90"
              >
                {GREETINGS[greetIdx]}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Wordmark */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-[38px] font-extrabold leading-[0.95] tracking-tight"
          >
            <span className="text-gold-gradient">AureX</span>
          </motion.h1>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.28 }}
            className="mt-1 flex items-center gap-2"
          >
            <span className="text-[11px] font-bold uppercase tracking-[0.5em] text-muted-foreground">
              Agency
            </span>
            <span className="h-px flex-1 bg-gradient-to-r from-border-strong to-transparent" />
          </motion.div>

          <motion.p
            key={selected}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            dir="auto"
            className="mt-3 text-[13px] text-muted-foreground"
          >
            {SUBTITLE[selected]}
          </motion.p>
        </div>

          {/* Language cards with real flags — fills the available viewport space */}
          <div className="lang-list flex min-h-0 flex-1 flex-col justify-center gap-1.5 py-2">
            {LANGS.map((l, i) => {
              const active = selected === l.code
              return (
                <motion.button
                  key={l.code}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.08, type: 'spring', stiffness: 220, damping: 20 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelected(l.code)}
                  className={`lang-card relative flex min-h-[40px] flex-1 items-center gap-3 overflow-hidden rounded-xl border px-3 py-1.5 text-start transition-all duration-300 ${
                    active
                      ? 'border-primary/70 bg-primary/[0.08] gold-ring'
                      : 'border-border bg-card'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="lang-active-sheen"
                      aria-hidden
                      className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,color-mix(in_oklab,var(--gold)_16%,transparent)_50%,transparent_65%)]"
                    />
                  )}
                  <Flag country={l.country} className="lang-flag size-8" />
                  <span className="relative flex-1">
                    <span dir="auto" className="lang-label block text-[14px] font-bold leading-tight">
                      {l.label}
                    </span>
                    <span className="lang-native block text-[11px] text-muted-foreground">
                      {l.native}
                    </span>
                  </span>
                  <span className="lang-code relative text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {l.code}
                  </span>
                  <span
                    className={`lang-check relative flex size-5 items-center justify-center rounded-full transition-colors ${
                      active ? 'bg-primary' : 'border border-border-strong'
                    }`}
                  >
                    <AnimatePresence>
                      {active && (
                        <motion.span
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                        >
                          <Check className="size-3.5 text-primary-foreground" strokeWidth={3} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                </motion.button>
              )
            })}
          </div>

        {/* Footer: CTA + trust */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="flex shrink-0 flex-col gap-3"
        >
          <XButton variant="solid" size="md" block onClick={() => confirmLang(selected)}>
            {CONTINUE[selected]}
          </XButton>
          <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-3 text-primary" />
              Secure crypto checkout
            </span>
            <span className="h-3 w-px bg-border-strong" />
            <span className="flex items-center gap-1.5">
              <Sparkles className="size-3 text-primary" />
              Est. 2026
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

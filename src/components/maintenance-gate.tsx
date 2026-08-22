'use client'

import { motion } from 'framer-motion'
import { BellRing, Wrench, Clock, ShieldCheck, Loader2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { useI18n } from '@/lib/i18n'
import { formatDateTime } from '@/lib/datetime'
import { useMaintenance } from '@/lib/maintenance'
import { useAuth } from '@/lib/auth'
import {
  getMyMaintenanceNotify,
  setMaintenanceNotify,
} from '@/lib/maintenance-notify.functions'


function formatEta(eta: string, lang: string) {
  try {
    return formatDateTime(eta, lang)
  } catch {
    return ''
  }
}

function useCountdown(eta: string | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!eta) return
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [eta])
  if (!eta) return null
  const diff = new Date(eta).getTime() - now
  if (diff <= 0) return null
  const mins = Math.floor(diff / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return { h, m }
}

export function MaintenanceScreen() {
  const { lang } = useI18n()
  const { state, previewClosed, setPreviewClosed } = useMaintenance()
  const { isAdmin } = useAuth()
  const globalMsg = lang === 'ru' ? state?.message_ru : state?.message_en
  const globalFallback =
    lang === 'ru'
      ? 'Ведутся технические работы. Скоро вернёмся.'
      : 'Maintenance in progress. We\'ll be back soon.'
  const msg = globalMsg || globalFallback
  const eta = state?.eta ?? null
  const cd = useCountdown(eta)

  return (
    <div className="relative flex h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-background px-6">
      {isAdmin && previewClosed && (
        <button
          onClick={() => setPreviewClosed(false)}
          className="absolute right-4 top-[calc(env(safe-area-inset-top)+12px)] z-10 inline-flex items-center gap-1.5 rounded-full border border-border bg-card/90 px-3 py-1.5 text-[11.5px] font-semibold text-foreground shadow-sm backdrop-blur transition-colors hover:bg-accent"
        >
          <X className="size-3.5" />
          {lang === 'ru' ? 'Закрыть предпросмотр' : 'Exit preview'}
        </button>
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--primary)_20%,transparent),transparent_70%)]" />
        <div className="bg-grid absolute inset-x-0 top-0 h-[420px] opacity-70" />
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative mx-auto flex w-full max-w-sm flex-col items-center text-center"
      >
        <motion.div
          animate={{ rotate: [0, -8, 8, -6, 6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          className="relative flex size-24 items-center justify-center rounded-[28px] bg-gold-gradient text-primary-foreground shadow-[0_20px_60px_-15px_color-mix(in_oklab,var(--primary)_60%,transparent)]"
        >
          <Wrench className="size-11" strokeWidth={2.2} />
          <motion.span
            initial={{ opacity: 0.4, scale: 1 }}
            animate={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
            className="absolute inset-0 rounded-[28px] border-2 border-primary/60"
          />
        </motion.div>

        <h1 className="mt-7 font-display text-[26px] font-bold leading-tight tracking-tight">
          {lang === 'ru' ? 'Тех. работы' : 'Maintenance'}
        </h1>

        <p className="mt-3 max-w-[300px] text-[14px] leading-relaxed text-muted-foreground">
          {msg}
        </p>

        {eta && (
          <div className="mt-6 flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-[12.5px] font-semibold text-primary">
            <Clock className="size-3.5" />
            {cd
              ? lang === 'ru'
                ? `Осталось ~${cd.h ? cd.h + ' ч ' : ''}${cd.m} мин`
                : `~${cd.h ? cd.h + ' h ' : ''}${cd.m} min left`
              : formatEta(eta, lang)}
          </div>
        )}

        <NotifyToggle lang={lang} />

        <div className="mt-6 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          {lang === 'ru' ? 'Ожидание восстановления' : 'Waiting for restore'}
        </div>
      </motion.div>
    </div>
  )
}

function NotifyToggle({ lang }: { lang: string }) {
  const getFn = useServerFn(getMyMaintenanceNotify)
  const setFn = useServerFn(setMaintenanceNotify)
  const [on, setOn] = useState<boolean | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let alive = true
    getFn()
      .then((r) => alive && setOn(!!r.subscribed))
      .catch(() => alive && setOn(false))
    return () => {
      alive = false
    }
  }, [getFn])

  const toggle = async () => {
    if (on === null || pending) return
    const next = !on
    setPending(true)
    setOn(next)
    try {
      await setFn({ data: { enabled: next } })
    } catch {
      setOn(!next)
    } finally {
      setPending(false)
    }
  }

  const title = on
    ? lang === 'ru'
      ? 'Мы напомним'
      : "We'll ping you"
    : lang === 'ru'
      ? 'Напомнить о запуске'
      : 'Notify me on launch'
  const hint = on
    ? lang === 'ru'
      ? 'Сообщение придёт сюда, в этот бот'
      : 'A message will arrive in this bot'
    : lang === 'ru'
      ? 'Пришлём сюда, как только всё заработает'
      : 'Sent here the moment we are back'

  const disabled = on === null || pending

  return (
    <button
      onClick={toggle}
      disabled={disabled}
      aria-pressed={!!on}
      className="mt-7 flex w-full max-w-[320px] items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-accent/40 disabled:opacity-70"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {pending || on === null ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <BellRing className="size-4" strokeWidth={2.2} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-[15px] font-semibold leading-tight tracking-tight text-foreground">
          {title}
        </p>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground/90">{hint}</p>
      </div>
      <span
        className={`relative ml-1 flex h-[26px] w-[44px] shrink-0 items-center rounded-full transition-colors ${
          on ? 'bg-primary' : 'bg-muted-foreground/25'
        }`}
      >
        <motion.span
          className="absolute left-[3px] top-[3px] size-[20px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
          animate={{ x: on ? 18 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </span>
    </button>
  )
}


export function MaintenanceStripe() {
  const { lang } = useI18n()
  const { state, whitelisted } = useMaintenance()
  if (!state?.enabled) return null
  return (
    <div className="border-b border-primary/30 bg-primary/15 px-3 py-1.5 text-center text-[11px] font-semibold text-primary">
      <span className="inline-flex items-center gap-1.5">
        <ShieldCheck className="size-3" />
        {lang === 'ru'
          ? whitelisted
            ? 'Тех. режим активен — вы в whitelist'
            : 'Тех. режим активен (админ)'
          : whitelisted
            ? 'Maintenance active — you are whitelisted'
            : 'Maintenance active (admin)'}
      </span>
    </div>
  )
}
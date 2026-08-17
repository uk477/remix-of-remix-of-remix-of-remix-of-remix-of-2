'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, BellOff, BellRing, Loader2, Sparkles, Wrench } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { Sheet, SheetContent } from '@/components/ui/sheet'

import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { useToast } from './toast'
import {
  listMyBoostSubscriptions,
  subscribeBoostNotify,
  unsubscribeBoostNotify,
  type BoostRegion,
  type BoostSubcatId,
} from '@/lib/boost-status.functions'

type Copy = {
  eyebrow: string
  title: string
  lead: string
  bullets: { title: string; body: string }[]
  notifyTitle: string
  notifyBody: string
  notifyCtaOn: string
  notifyCtaOff: string
  notifyOn: string
  notifyOff: string
  notifyNeedsAuth: string
  toastOn: string
  toastOff: string
  footer: string
}

function useCopy(subcatLabel: string): Copy {
  const { lang } = useI18n()
  const isRu = lang === 'ru' || lang === 'uk'
  return isRu
    ? {
        eyebrow: 'ВРЕМЕННО НЕДОСТУПНО',
        title: `«${subcatLabel}» временно не работает`,
        lead: 'У провайдера тех. работы, поэтому мы поставили сервис на паузу. Вернём, как только всё починят.',
        bullets: [
          {
            title: 'Заказы недоступны',
            body: 'Оформление отключено — ничего не спишется и не зависнет.',
          },
          {
            title: 'Уже разбираемся',
            body: 'Как только провайдер починит — включим автоматически.',
          },
          {
            title: 'Баланс в безопасности',
            body: 'Деньги остаются на счёте — можно оплатить любую другую услугу.',
          },
        ],
        notifyTitle: 'Оповестить, когда заработает',
        notifyBody: 'Пришлём уведомление в Telegram-бот, как только сервис снова будет доступен.',
        notifyCtaOn: 'Оповещу в Telegram',
        notifyCtaOff: 'Отменить оповещение',
        notifyOn: 'Уведомление включено',
        notifyOff: 'Уведомление выключено',
        notifyNeedsAuth: 'Войди в аккаунт, чтобы получить уведомление',
        toastOn: 'Готово — сообщим в Telegram, как заработает',
        toastOff: 'Уведомление отменено',
        footer: '',
      }
    : {
        eyebrow: 'TEMPORARILY UNAVAILABLE',
        title: `“${subcatLabel}” is temporarily down`,
        lead: 'Our provider is doing maintenance, so we paused the service. It will be back as soon as they fix it.',
        bullets: [
          {
            title: 'Orders are disabled',
            body: 'Checkout is off — nothing will be charged or stuck.',
          },
          {
            title: 'We are on it',
            body: 'The moment the provider is back, we re-enable it automatically.',
          },
          {
            title: 'Balance is safe',
            body: 'Your funds stay on the account — spend them on any other service.',
          },
        ],
        notifyTitle: 'Notify me when it is back',
        notifyBody: 'We will ping you in the Telegram bot the moment the service is available again.',
        notifyCtaOn: 'Notify me on Telegram',
        notifyCtaOff: 'Cancel notification',
        notifyOn: 'Notification is on',
        notifyOff: 'Notification is off',
        notifyNeedsAuth: 'Sign in to receive the notification',
        toastOn: 'Done — we will ping you on Telegram when it is back',
        toastOff: 'Notification cancelled',
        footer: '',
      }
}

export function BoostUnavailableSheet({
  open,
  onOpenChange,
  subcategory,
  region = '_all',
  subcategoryLabel,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  subcategory: BoostSubcatId
  region?: BoostRegion
  subcategoryLabel: string
}) {
  const copy = useCopy(subcategoryLabel)
  const { user } = useAuth()
  const { show } = useToast()

  const listFn = useServerFn(listMyBoostSubscriptions)
  const subFn = useServerFn(subscribeBoostNotify)
  const unsubFn = useServerFn(unsubscribeBoostNotify)

  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState(false)

  // Load current subscription state when opened
  useEffect(() => {
    if (!open || !user) return
    let cancelled = false
    setLoading(true)
    listFn()
      .then((r) => {
        if (cancelled) return
        setSubscribed(
          r.subscribed.some((s) => s.subcategory_id === subcategory && s.region === region),
        )
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [open, user, subcategory, region, listFn])

  async function toggle() {
    if (!user) return
    setPending(true)
    const nextOn = !subscribed
    try {
      if (nextOn) {
        await subFn({ data: { subcategory, region } })
        setSubscribed(true)
        show(copy.toastOn)
      } else {
        await unsubFn({ data: { subcategory, region } })
        setSubscribed(false)
        show(copy.toastOff)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setPending(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="border-t border-destructive/40 bg-background p-0 sm:max-w-lg sm:mx-auto max-h-[92dvh] overflow-y-auto overscroll-contain"
      >
        <div>

          <div className="relative px-5 pb-8 pt-6">
            {/* Ambient red glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-70"
              style={{
                background:
                  'radial-gradient(70% 100% at 50% 0%, color-mix(in oklab, hsl(0 84% 60%) 28%, transparent), transparent 70%)',
              }}
            />

            {/* Icon block */}
            <div className="relative mx-auto mb-4 flex size-20 items-center justify-center">
              <motion.div
                aria-hidden
                className="absolute inset-0 rounded-full border-2 border-destructive/50"
                animate={{ rotate: [0, 360], scale: [1, 1.06, 1] }}
                transition={{ duration: 6, ease: 'linear', repeat: Infinity }}
              />
              <motion.div
                animate={{ rotate: [-6, 6, -6] }}
                transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity }}
                className="relative flex size-14 items-center justify-center rounded-2xl bg-destructive/15 text-destructive shadow-[0_10px_28px_-8px_hsl(0_84%_50%/0.6)]"
              >
                <Wrench className="size-7" strokeWidth={2.4} />
              </motion.div>
            </div>

            <p className="relative text-center text-[10.5px] font-black uppercase tracking-[0.22em] text-destructive">
              {copy.eyebrow}
            </p>
            <h3 className="relative mt-1 text-center font-display text-[22px] font-extrabold leading-tight tracking-tight">
              {copy.title}
            </h3>
            <p className="relative mx-auto mt-3 max-w-md text-center text-[13.5px] leading-relaxed text-muted-foreground">
              {copy.lead}
            </p>

            {/* Bullets */}
            <ul className="relative mt-5 space-y-2.5">
              {copy.bullets.map((b, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.06 }}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-card/70 p-3.5"
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                    {i === 0 ? (
                      <AlertTriangle className="size-4" strokeWidth={2.4} />
                    ) : i === 1 ? (
                      <Wrench className="size-4" strokeWidth={2.4} />
                    ) : (
                      <Sparkles className="size-4" strokeWidth={2.4} />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-bold leading-snug">{b.title}</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                      {b.body}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ul>

            {/* Notify CTA — compact on-brand card */}
            <div className="relative mt-5">
              <motion.button
                type="button"
                onClick={toggle}
                disabled={!user || pending || loading}
                aria-pressed={subscribed}
                whileTap={!user || pending || loading ? undefined : { scale: 0.985 }}
                transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                className={`relative block w-full overflow-hidden rounded-2xl border p-3 text-left transition-colors ${
                  subscribed
                    ? 'border-emerald-500/40 bg-emerald-500/[0.06]'
                    : 'border-border bg-card hover:bg-accent/40'
                } ${!user || pending || loading ? 'opacity-70' : ''}`}
              >
                <div className="relative flex items-center gap-3">
                  {/* Bell with subtle ring pulse */}
                  <div className="relative flex size-10 shrink-0 items-center justify-center">
                    <motion.span
                      aria-hidden
                      className={`absolute inset-0 rounded-full border ${
                        subscribed ? 'border-emerald-500/50' : 'border-primary/40'
                      }`}
                      animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                      transition={{ duration: 2.2, ease: 'easeOut', repeat: Infinity }}
                    />
                    <span
                      className={`relative flex size-10 items-center justify-center rounded-full ${
                        subscribed
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-primary/12 text-primary'
                      }`}
                    >
                      <motion.span
                        animate={
                          subscribed && !loading && !pending
                            ? { rotate: [0, -10, 10, -6, 6, 0] }
                            : { rotate: 0 }
                        }
                        transition={{ duration: 1.1, repeat: subscribed ? Infinity : 0, repeatDelay: 2.2 }}
                        className="flex items-center justify-center"
                      >
                        {loading || pending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : subscribed ? (
                          <BellRing className="size-4" strokeWidth={2.4} />
                        ) : (
                          <BellOff className="size-4" strokeWidth={2.4} />
                        )}
                      </motion.span>
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold leading-tight tracking-tight text-foreground">
                      {!user
                        ? copy.notifyNeedsAuth
                        : subscribed
                          ? copy.notifyOn
                          : copy.notifyTitle}
                    </p>
                    <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground line-clamp-2">
                      {!user
                        ? '—'
                        : subscribed
                          ? copy.notifyCtaOff
                          : copy.notifyBody}
                    </p>
                  </div>

                  {/* iOS-style switch */}
                  <motion.span
                    aria-hidden
                    className={`relative ml-1 flex h-[28px] w-[48px] shrink-0 items-center rounded-full transition-colors ${
                      subscribed ? 'bg-emerald-500' : 'bg-muted-foreground/25'
                    }`}
                  >
                    <motion.span
                      className="absolute left-[3px] top-[3px] size-[22px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2),0_0_0_0.5px_rgba(0,0,0,0.04)]"
                      animate={{ x: subscribed ? 20 : 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                    />
                  </motion.span>
                </div>
              </motion.button>
            </div>





          </div>
        </div>

      </SheetContent>
    </Sheet>
  )
}

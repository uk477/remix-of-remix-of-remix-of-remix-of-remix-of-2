'use client'

import { motion } from 'framer-motion'
import {
  AtSign,
  BadgeCheck,
  ChevronRight,
  KeyRound,
  Megaphone,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Trash2,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { OTHER_SERVICES } from '@/lib/data'
import { money } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { useNav } from '@/lib/nav'
import { useStore } from '@/lib/store'
import type { OtherService } from '@/lib/types'
import { ScreenHeader } from '../screen-header'
import { useToast } from '../toast'
import { XButton } from '../ui/x-button'

const ICONS: Record<string, LucideIcon> = {
  BadgeCheck,
  Trash2,
  AtSign,
  ShieldAlert,
  KeyRound,
  Megaphone,
  Sparkles,
}

export function ServicesScreen() {
  const { t, lang } = useI18n()
  const { back, param } = useNav()
  const [service, setService] = useState<OtherService | null>(null)

  useEffect(() => {
    if (!param) return
    const svc = OTHER_SERVICES.find((s) => s.id === param)
    if (svc) setService(svc)
  }, [param])

  if (service) {
    return <ServiceDetail service={service} onBack={() => setService(null)} />
  }

  return (
    <div>
      <ScreenHeader
        title={t('other_services_title')}
        subtitle={t('other_services_sub')}
        onBack={back}
      />
      <div className="flex flex-col gap-3 px-4 pt-4">
        {OTHER_SERVICES.map((s, i) => {
          const Icon = ICONS[s.icon] ?? Sparkles
          return (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setService(s)}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 text-left transition-colors active:bg-secondary"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                  <Icon className="size-6 text-primary" strokeWidth={2.2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{s.name[lang]}</p>
                    {s.badge && (
                      <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                        {s.badge[lang]}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {s.description[lang]}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-primary">{money(s.price)}</p>
                  <p className="text-[11px] text-muted-foreground">{s.unit[lang]}</p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground rtl:rotate-180" />
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

function ServiceDetail({
  service,
  onBack,
}: {
  service: OtherService
  onBack: () => void
}) {
  const { t, lang } = useI18n()
  const { addToCart, balance, setBalance, addOrder } = useStore()
  const { go } = useNav()
  const { show } = useToast()

  const Icon = ICONS[service.icon] ?? Sparkles
  const total = service.price
  const enough = balance >= total

  function addCart() {
    addToCart({
      key: `${service.id}-${Date.now()}`,
      kind: 'boost',
      refId: service.id,
      title: service.name[lang],
      subtitle: service.unit[lang],
      qty: 1,
      unitPrice: total,
      total,
    })
    show(t('added'))
  }

  function payBalance() {
    if (!enough) {
      show(t('not_enough'))
      go('topup')
      return
    }
    setBalance((b) => b - total)
    addOrder({
      id: `FH-${Math.floor(10000 + Math.random() * 89999)}`,
      date: Date.now(),
      title: service.name[lang],
      amount: total,
      status: 'in_progress',
      refillable: false,
      kind: 'boost',
      paid: true,
      serviceId: service.id,
    })
    show(t('payment_success'))
  }

  return (
    <div>
      <ScreenHeader
        title={service.name[lang]}
        subtitle={service.unit[lang]}
        onBack={onBack}
      />
      <div className="px-4 pt-4">
        <div className="relative mb-5 overflow-hidden rounded-3xl border border-border bg-card p-5">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/15 blur-2xl" />
          <div className="relative flex items-start justify-between">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/15">
              <Icon className="size-7 text-primary" strokeWidth={2.2} />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{money(service.price)}</p>
              <p className="text-xs text-muted-foreground">{service.unit[lang]}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {service.description[lang]}
          </p>
        </div>

        <p className="mb-2.5 px-1 text-sm font-medium">{t('whats_included')}</p>
        <div className="flex flex-col gap-2">
          {service.features.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 rounded-2xl border border-border bg-card px-4 py-3"
            >
              <BadgeCheck className="size-4 shrink-0 text-primary" />
              <span className="text-sm">{f[lang]}</span>
            </div>
          ))}
        </div>

        {!enough && (
          <p className="mt-3 rounded-xl bg-warning/10 px-3 py-2 text-center text-xs text-warning">
            {t('not_enough')}
          </p>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="glass fixed inset-x-0 bottom-[88px] z-30 mx-auto flex w-[min(480px,100%)] items-center gap-2.5 border-t border-border px-4 py-3">
        <div className="shrink-0">
          <p className="text-[11px] text-muted-foreground">{t('total')}</p>
          <p className="text-lg font-bold">{money(total)}</p>
        </div>
        <XButton variant="outline" onClick={addCart} className="flex-1">
          <ShoppingBag className="size-4" />
          {t('add_to_cart')}
        </XButton>
        <XButton onClick={payBalance} className="flex-1">
          <Wallet className="size-4" />
          {t('buy_now')}
        </XButton>
      </div>
    </div>
  )
}

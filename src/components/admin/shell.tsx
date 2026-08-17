'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Bell,
  Boxes,
  ClipboardList,
  FolderTree,
  Handshake,
  Loader2,
  MessageSquare,
  Package,
  Percent,
  RefreshCw,
  Send,
  ShieldCheck,
  Users,
  Wallet,
  Wrench,
  Zap,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/lib/auth'
import { useNav } from '@/lib/nav'


export type AdminSection =
  | 'overview'
  | 'users'
  | 'orders'
  | 'topups'
  | 'products'
  | 'categories'
  | 'pricing'
  | 'applications'
  | 'support'
  | 'broadcasts'
  | 'audit'
  | 'maintenance'
  | 'boost_status'
  | 'boost_stats'
  | 'x_parser'

export const SECTIONS: {
  id: AdminSection
  label: string
  icon: React.ComponentType<{ className?: string }>
  group: 'main' | 'commerce' | 'ops'
}[] = [
  { id: 'overview', label: 'Обзор', icon: BarChart3, group: 'main' },
  { id: 'users', label: 'Пользователи', icon: Users, group: 'main' },
  { id: 'orders', label: 'Продажи', icon: Package, group: 'commerce' },
  { id: 'topups', label: 'Пополнения', icon: Wallet, group: 'commerce' },
  { id: 'products', label: 'Товары', icon: Boxes, group: 'commerce' },
  { id: 'categories', label: 'Категории', icon: FolderTree, group: 'commerce' },
  { id: 'pricing', label: 'Наценка', icon: Percent, group: 'commerce' },
  { id: 'applications', label: 'Заявки', icon: Handshake, group: 'ops' },
  { id: 'support', label: 'Саппорт', icon: MessageSquare, group: 'ops' },
  { id: 'broadcasts', label: 'Рассылки', icon: Send, group: 'ops' },
  { id: 'audit', label: 'Аудит', icon: ClipboardList, group: 'ops' },
  { id: 'maintenance', label: 'Тех.режим', icon: Wrench, group: 'ops' },
  { id: 'boost_status', label: 'Boost статус', icon: Zap, group: 'ops' },
  { id: 'boost_stats', label: 'Boost стата', icon: Activity, group: 'ops' },
  { id: 'x_parser', label: 'X-парсер', icon: RefreshCw, group: 'commerce' },
]

export function AdminGate({ children }: { children: (section: AdminSection, refresh: () => void, refreshKey: number) => ReactNode }) {
  const { back } = useNav()
  const { user, isAdmin, loading } = useAuth()
  const [section, setSection] = useState<AdminSection>('overview')
  const [refreshKey, setRefreshKey] = useState(0)
  const [notif, setNotif] = useState({ apps: 0, topups: 0, threads: 0 })

  const refresh = () => setRefreshKey((k) => k + 1)

  // Live badges for nav
  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    async function pull() {
      const [a, t, s] = await Promise.all([
        supabase.from('supplier_applications').select('*', { count: 'exact', head: true }).eq('status', 'new'),
        supabase.from('topups').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('support_threads').select('*', { count: 'exact', head: true }).gt('unread_admin', 0),
      ])
      if (!cancelled) setNotif({ apps: a.count ?? 0, topups: t.count ?? 0, threads: s.count ?? 0 })
    }
    pull()
    const ch = supabase
      .channel('admin-badges')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'supplier_applications' }, pull)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'topups' }, pull)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, pull)
      .subscribe()
    return () => {
      cancelled = true
      supabase.removeChannel(ch)
    }
  }, [isAdmin])

  if (loading || !user) {
    return (
      <div className="flex h-[100dvh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="relative min-h-[100dvh]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(80%_60%_at_50%_0%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent)]" />
        <div className="relative flex flex-col px-4 pt-4">
          <button onClick={back} className="pressable flex size-10 items-center justify-center rounded-full border border-border bg-card">
            <ArrowLeft className="size-4" />
          </button>
          <div className="mx-auto mt-16 max-w-sm rounded-[28px] border border-primary/30 bg-card p-6 text-center shadow-[0_20px_60px_-30px_rgba(201,168,76,0.4)]">
            <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-gold-gradient text-primary-foreground">
              <ShieldCheck className="size-7" strokeWidth={2.4} />
            </div>
            <h2 className="mt-4 font-display text-[20px] font-bold tracking-tight">Только для админов</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              Этот раздел доступен только администраторам.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const badge = (id: AdminSection) => {
    if (id === 'applications' && notif.apps) return notif.apps
    if (id === 'topups' && notif.topups) return notif.topups
    if (id === 'support' && notif.threads) return notif.threads
    return 0
  }

  const current = SECTIONS.find((s) => s.id === section)!
  const totalBadge = notif.apps + notif.topups + notif.threads

  return (
    <div className="min-h-[100dvh] bg-background pb-8">
      {/* Ambient gold glow */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-72 bg-[radial-gradient(70%_50%_at_50%_0%,color-mix(in_oklab,var(--primary)_10%,transparent),transparent)]" />

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button
            onClick={back}
            className="pressable flex size-9 items-center justify-center rounded-full border border-border bg-card"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gold-gradient text-primary-foreground">
              <ShieldCheck className="size-4" strokeWidth={2.6} />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-[14px] font-bold leading-tight">AURX Console</p>
              <p className="truncate text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
                {current.label}
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={refresh}
              aria-label="Обновить"
              className="pressable flex size-9 items-center justify-center rounded-full border border-border bg-card"
            >
              <RefreshCw className="size-4" />
            </button>
            <div className="relative">
              <button className="pressable flex size-9 items-center justify-center rounded-full border border-border bg-card">
                <Bell className="size-4" />
              </button>
              {totalBadge > 0 && (
                <span className="tnum absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {totalBadge > 99 ? '99+' : totalBadge}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Section nav */}
        <nav className="grid grid-cols-5 gap-1 px-3 pb-2">
          {SECTIONS.map((s) => {
            const active = section === s.id
            const b = badge(s.id)
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`pressable relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-[10px] font-semibold leading-tight transition-all ${
                  active
                    ? 'border-primary/60 bg-primary/15 text-primary shadow-[0_2px_12px_-4px_color-mix(in_oklab,var(--primary)_60%,transparent)]'
                    : 'border-transparent bg-transparent text-muted-foreground hover:bg-card hover:text-foreground'
                }`}
              >
                <div className="relative">
                  <s.icon className="size-4" />
                  {b > 0 && (
                    <span className="tnum absolute -right-2 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive px-1 text-[8px] font-bold text-destructive-foreground">
                      {b > 9 ? '9+' : b}
                    </span>
                  )}
                </div>
                <span className="w-full truncate">{s.label}</span>
              </button>
            )
          })}
        </nav>
      </header>

      {/* Content */}
      <div className="relative z-10 px-4 pt-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={section + refreshKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {children(section, refresh, refreshKey)}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

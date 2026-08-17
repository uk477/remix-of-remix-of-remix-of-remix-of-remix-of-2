'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  Ban,
  Clock,
  DollarSign,
  Handshake,
  Package,
  ShieldCheck,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { supabase } from '@/integrations/supabase/client'
import { money } from '@/lib/format'
import { useAuth } from '@/lib/auth'
import {
  Card,
  Chip,
  ChipRow,
  Drawer,
  Empty,
  Field,
  GhostButton,
  NumIn,
  PrimaryButton,
  ReadRow,
  SearchInput,
  SectionHeader,
  SelectPill,
  Skeleton,
  StatTile,
  StatusPill,
  TextArea,
  TextIn,
} from './primitives'
import { useToast } from '../toast'

// ═══════════════════════════════════════════════════════════════════════════
// OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════

type Range = '24h' | '7d' | '30d' | 'all'

const RANGES: { id: Range; label: string; days: number | null; bucket: 'hour' | 'day' }[] = [
  { id: '24h', label: '24ч', days: 1, bucket: 'hour' },
  { id: '7d', label: '7д', days: 7, bucket: 'day' },
  { id: '30d', label: '30д', days: 30, bucket: 'day' },
  { id: 'all', label: 'Всё', days: null, bucket: 'day' },
]

type Overview = {
  users: number
  usersInRange: number
  orders: number
  ordersPending: number
  ordersCompletedRange: number
  topups: number
  topupsPending: number
  salesAll: number
  salesRange: number
  topupsAll: number
  topupsRange: number
  aov: number
  suppliers: number
  chart: { d: string; sales: number; topups: number; orders: number }[]
  recentTopups: {
    id: string
    amount_usd: number
    coin: string
    status: string
    created_at: string
    user_id: string
  }[]
}

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10)
}

function isoHour(d: Date) {
  return d.toISOString().slice(0, 13)
}

export function OverviewSection() {
  const [range, setRange] = useState<Range>('7d')
  const [data, setData] = useState<Overview | null>(null)
  const [usersOpen, setUsersOpen] = useState(false)


  useEffect(() => {
    let cancelled = false
    setData(null)
    ;(async () => {
      const cfg = RANGES.find((r) => r.id === range)!
      const now = new Date()
      const start = cfg.days === null ? null : new Date(now.getTime() - (cfg.days === 1 ? 24 * 3600_000 : cfg.days * 86400_000))
      if (start && cfg.bucket === 'day') start.setHours(0, 0, 0, 0)
      if (start && cfg.bucket === 'hour') start.setMinutes(0, 0, 0)
      const startIso = start?.toISOString()

      const usersRangeQ = supabase.from('profiles').select('*', { count: 'exact', head: true })
      if (startIso) usersRangeQ.gte('created_at', startIso)

      const topupsRangeQ = supabase.from('topups').select('amount_usd,created_at').eq('status', 'success')
      if (startIso) topupsRangeQ.gte('created_at', startIso)

      const salesRangeQ = supabase.from('orders').select('amount_usd,created_at').eq('status', 'completed')
      if (startIso) salesRangeQ.gte('created_at', startIso)

      const ordRangeQ = supabase.from('orders').select('created_at,status')
      if (startIso) ordRangeQ.gte('created_at', startIso)

      const [uAll, uRange, oAll, oPend, tAll, tPend, topupsAllRows, salesAllRows, sNew, topupsRange, salesRange, ordRange, recent] =
        await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          usersRangeQ,
          supabase.from('orders').select('*', { count: 'exact', head: true }),
          supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .in('status', ['pending', 'in_progress', 'waiting']),
          supabase.from('topups').select('*', { count: 'exact', head: true }),
          supabase.from('topups').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('topups').select('amount_usd').eq('status', 'success'),
          supabase.from('orders').select('amount_usd').eq('status', 'completed'),
          supabase
            .from('supplier_applications')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'new'),
          topupsRangeQ,
          salesRangeQ,
          ordRangeQ,
          supabase
            .from('topups')
            .select('id,amount_usd,coin,status,created_at,user_id')
            .order('created_at', { ascending: false })
            .limit(6),
        ])

      if (cancelled) return

      const topupsAll = (topupsAllRows.data ?? []).reduce((s, r) => s + Number(r.amount_usd || 0), 0)
      const salesAll = (salesAllRows.data ?? []).reduce((s, r) => s + Number(r.amount_usd || 0), 0)
      const salesCountAll = (salesAllRows.data ?? []).length
      const aov = salesCountAll > 0 ? salesAll / salesCountAll : 0

      // Build bucketed chart
      const bucketKey = (d: Date) => (cfg.bucket === 'hour' ? isoHour(d) : isoDay(d))
      const bucketLabel = (k: string) =>
        cfg.bucket === 'hour' ? k.slice(11, 13) + ':00' : k.slice(5)
      const byBucket = new Map<string, { sales: number; topups: number; orders: number }>()

      if (start) {
        const buckets = cfg.bucket === 'hour' ? 24 : cfg.days!
        const step = cfg.bucket === 'hour' ? 3600_000 : 86400_000
        for (let i = 0; i < buckets; i++) {
          const d = new Date(start.getTime() + i * step)
          byBucket.set(bucketKey(d), { sales: 0, topups: 0, orders: 0 })
        }
      }

      ;(salesRange.data ?? []).forEach((r) => {
        const k = bucketKey(new Date(r.created_at))
        const b = byBucket.get(k) ?? { sales: 0, topups: 0, orders: 0 }
        b.sales += Number(r.amount_usd || 0)
        byBucket.set(k, b)
      })
      ;(topupsRange.data ?? []).forEach((r) => {
        const k = bucketKey(new Date(r.created_at))
        const b = byBucket.get(k) ?? { sales: 0, topups: 0, orders: 0 }
        b.topups += Number(r.amount_usd || 0)
        byBucket.set(k, b)
      })
      ;(ordRange.data ?? []).forEach((r) => {
        const k = bucketKey(new Date(r.created_at))
        const b = byBucket.get(k) ?? { sales: 0, topups: 0, orders: 0 }
        b.orders += 1
        byBucket.set(k, b)
      })

      const chart = Array.from(byBucket.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => ({
          d: bucketLabel(k),
          sales: Math.round(v.sales * 100) / 100,
          topups: Math.round(v.topups * 100) / 100,
          orders: v.orders,
        }))
      const salesRangeSum = chart.reduce((s, x) => s + x.sales, 0)
      const topupsRangeSum = chart.reduce((s, x) => s + x.topups, 0)
      const ordersCompletedRange = (salesRange.data ?? []).length

      setData({
        users: uAll.count ?? 0,
        usersInRange: uRange.count ?? 0,
        orders: oAll.count ?? 0,
        ordersPending: oPend.count ?? 0,
        ordersCompletedRange,
        topups: tAll.count ?? 0,
        topupsPending: tPend.count ?? 0,
        salesAll,
        salesRange: salesRangeSum,
        topupsAll,
        topupsRange: topupsRangeSum,
        aov,
        suppliers: sNew.count ?? 0,
        chart,
        recentTopups: (recent.data as Overview['recentTopups']) ?? [],
      })
    })()
    return () => {
      cancelled = true
    }
  }, [range])

  const rangeLabel = RANGES.find((r) => r.id === range)!.label

  if (!data) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Обзор" />
        <ChipRow>
          {RANGES.map((r) => (
            <Chip key={r.id} active={range === r.id} onClick={() => setRange(r.id)}>
              {r.label}
            </Chip>
          ))}
        </ChipRow>
        <Skeleton rows={6} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Обзор"
        subtitle={`За ${rangeLabel.toLowerCase()}: ${money(data.salesRange)} продаж • ${money(data.topupsRange)} пополнений`}
      />

      <ChipRow>
        {RANGES.map((r) => (
          <Chip key={r.id} active={range === r.id} onClick={() => setRange(r.id)}>
            {r.label}
          </Chip>
        ))}
      </ChipRow>


      {/* Hero KPI: Sales revenue + chart */}
      <Card hero className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Выручка с продаж
            </p>
            <p className="tnum mt-2 font-display text-[34px] font-bold leading-none text-primary">
              {money(data.salesAll)}
            </p>
            <p className="mt-2 flex items-center gap-1 text-[11.5px] text-muted-foreground">
              <TrendingUp className="size-3.5 text-success" />
              <span className="text-success font-semibold">+{money(data.salesRange)}</span>
              за {rangeLabel.toLowerCase()} • {data.ordersCompletedRange} завершённых
            </p>
          </div>
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/20 text-primary">
            <DollarSign className="size-5" />
          </div>
        </div>
        <div className="mt-4 h-32 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.chart} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="gGold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="d"
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ stroke: 'var(--primary)', strokeOpacity: 0.3 }}
                contentStyle={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  fontSize: 11,
                }}
                formatter={(v: number, name: string) => [money(v), name === 'sales' ? 'Продажи' : 'Пополнения']}
                labelStyle={{ color: 'var(--muted-foreground)' }}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="var(--primary)"
                strokeWidth={2}
                fill="url(#gGold)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Topups summary card */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Пополнения баланса
            </p>
            <p className="tnum mt-2 font-display text-[28px] font-bold leading-none">
              {money(data.topupsAll)}
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <ArrowUpRight className="size-3.5 text-success" />
                <span className="text-success font-semibold">+{money(data.topupsRange)}</span>
                за {rangeLabel.toLowerCase()}
              </span>
              <span className="opacity-60">•</span>
              <span>{data.topups} всего</span>
              {data.topupsPending > 0 && (
                <>
                  <span className="opacity-60">•</span>
                  <span className="text-warning">{data.topupsPending} ждут</span>
                </>
              )}
            </p>
          </div>
          <div className="flex size-11 items-center justify-center rounded-2xl bg-success/15 text-success">
            <Wallet className="size-5" />
          </div>
        </div>
      </Card>

      {/* Bento grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="Ср. чек"
          value={money(data.aov)}
          hint={data.ordersCompletedRange ? `${data.ordersCompletedRange} за ${rangeLabel.toLowerCase()}` : 'нет продаж'}
          icon={TrendingUp}
          tone={data.aov > 0 ? 'gold' : 'default'}
        />
        <StatTile
          label="Заказы"
          value={String(data.orders)}
          hint={`${data.ordersPending} в работе`}
          icon={Package}
          tone={data.ordersPending > 0 ? 'warn' : 'default'}
        />
        <StatTile
          label="Пользователи"
          value={String(data.users)}
          hint={data.usersInRange ? `+${data.usersInRange} за ${rangeLabel.toLowerCase()}` : `0 за ${rangeLabel.toLowerCase()}`}
          icon={Users}
          onClick={() => setUsersOpen(true)}
        />
        <StatTile
          label="Заявки"
          value={String(data.suppliers)}
          hint={data.suppliers ? 'требуют ответа' : 'новых нет'}
          icon={Handshake}
          tone={data.suppliers > 0 ? 'gold' : 'default'}
        />
      </div>

      {/* Topups bar chart */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-[15px] font-bold">Пополнения, {rangeLabel.toLowerCase()}</p>
          <span className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
            <Wallet className="mr-1 inline size-3" /> {money(data.topupsRange)}
          </span>
        </div>
        <div className="h-32 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.chart} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="2 4" />
              <XAxis
                dataKey="d"
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  fontSize: 11,
                }}
                formatter={(v: number) => [money(v), 'Пополнения']}
              />
              <Bar dataKey="topups" fill="var(--success)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Recent topups */}
      <div>
        <SectionHeader title="Последние пополнения" />
        {data.recentTopups.length === 0 ? (
          <Empty text="Пока пусто" icon={Wallet} />
        ) : (
          <ul className="space-y-2">
            {data.recentTopups.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border-strong bg-card px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-secondary text-primary">
                    <ArrowDownRight className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold">{t.coin.toUpperCase()}</p>
                    <p className="text-[10.5px] text-muted-foreground">
                      {new Date(t.created_at).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="tnum text-[13px] font-bold text-primary">{money(t.amount_usd)}</p>
                  <StatusPill status={t.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <UsersChartDrawer open={usersOpen} onClose={() => setUsersOpen(false)} totalUsers={data.users} />
    </div>
  )
}

// ─── Users signup chart drawer ─────────────────────────────────────────────

function UsersChartDrawer({
  open,
  onClose,
  totalUsers,
}: {
  open: boolean
  onClose: () => void
  totalUsers: number
}) {
  const [range, setRange] = useState<Range>('7d')
  const [chart, setChart] = useState<{ d: string; users: number }[] | null>(null)
  const [rangeTotal, setRangeTotal] = useState(0)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setChart(null)
    ;(async () => {
      const cfg = RANGES.find((r) => r.id === range)!
      const now = new Date()
      const start =
        cfg.days === null
          ? null
          : new Date(now.getTime() - (cfg.days === 1 ? 24 * 3600_000 : cfg.days * 86400_000))
      if (start && cfg.bucket === 'day') start.setHours(0, 0, 0, 0)
      if (start && cfg.bucket === 'hour') start.setMinutes(0, 0, 0)

      const q = supabase.from('profiles').select('created_at').order('created_at', { ascending: true })
      if (start) q.gte('created_at', start.toISOString())
      const { data: rows } = await q
      if (cancelled) return

      const bucketKey = (d: Date) => (cfg.bucket === 'hour' ? isoHour(d) : isoDay(d))
      const bucketLabel = (k: string) =>
        cfg.bucket === 'hour' ? k.slice(11, 13) + ':00' : k.slice(5)
      const byBucket = new Map<string, number>()

      if (start) {
        const buckets = cfg.bucket === 'hour' ? 24 : cfg.days!
        const step = cfg.bucket === 'hour' ? 3600_000 : 86400_000
        for (let i = 0; i < buckets; i++) {
          const d = new Date(start.getTime() + i * step)
          byBucket.set(bucketKey(d), 0)
        }
      }
      ;(rows ?? []).forEach((r) => {
        const k = bucketKey(new Date(r.created_at))
        byBucket.set(k, (byBucket.get(k) ?? 0) + 1)
      })

      const arr = Array.from(byBucket.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => ({ d: bucketLabel(k), users: v }))
      setChart(arr)
      setRangeTotal(arr.reduce((s, x) => s + x.users, 0))
    })()
    return () => {
      cancelled = true
    }
  }, [open, range])

  const rangeLabel = RANGES.find((r) => r.id === range)!.label

  return (
    <Drawer open={open} onClose={onClose} title="Пользователи" subtitle={`Всего: ${totalUsers}`}>
      <div className="space-y-4">
        <ChipRow>
          {RANGES.map((r) => (
            <Chip key={r.id} active={range === r.id} onClick={() => setRange(r.id)}>
              {r.label}
            </Chip>
          ))}
        </ChipRow>

        <Card hero className="p-5">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Новых за {rangeLabel.toLowerCase()}
          </p>
          <p className="tnum mt-2 font-display text-[34px] font-bold leading-none text-primary">
            +{rangeTotal}
          </p>
          <div className="mt-4 h-40 -mx-1">
            {!chart ? (
              <div className="h-full animate-pulse rounded-2xl bg-card/60" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
                  <defs>
                    <linearGradient id="gUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="2 4" />
                  <XAxis
                    dataKey="d"
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                    width={22}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      fontSize: 11,
                    }}
                    labelStyle={{ color: 'var(--muted-foreground)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fill="url(#gUsers)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {chart && chart.length > 0 && (
          <Card>
            <p className="mb-2 font-display text-[13px] font-bold">Разбивка</p>
            <ul className="scrollbar-none max-h-72 space-y-1 overflow-y-auto">
              {chart
                .slice()
                .reverse()
                .map((x) => (
                  <li
                    key={x.d}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[12px] odd:bg-card/40"
                  >
                    <span className="text-muted-foreground">{x.d}</span>
                    <span className="tnum font-bold">+{x.users}</span>
                  </li>
                ))}
            </ul>
          </Card>
        )}
      </div>
    </Drawer>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// USERS  — rich drawer with balance adjust, admin toggle, block, history
// ═══════════════════════════════════════════════════════════════════════════

type ProfileRow = {
  id: string
  username: string | null
  display_name: string | null
  telegram_id: string | null
  telegram_username: string | null
  avatar_url: string | null
  balance: number
  blocked: boolean
  language: string
  created_at: string
  last_seen_at: string | null
}

type BalTx = {
  id: string
  delta: number
  balance_after: number
  kind: string
  reason: string | null
  created_at: string
}

type UserOrder = {
  id: string
  title: string
  amount_usd: number
  status: string
  created_at: string
}

export function UsersSection() {
  const { user: me } = useAuth()
  const { show } = useToast()
  const [rows, setRows] = useState<ProfileRow[] | null>(null)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'admins' | 'blocked'>('all')
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set())
  const [openId, setOpenId] = useState<string | null>(null)

  async function load() {
    setRows(null)
    const [pRes, rRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('user_roles').select('user_id').eq('role', 'admin'),
    ])
    setRows((pRes.data as ProfileRow[]) ?? [])
    setAdminIds(new Set(((rRes.data as { user_id: string }[]) ?? []).map((r) => r.user_id)))
  }
  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    if (!rows) return []
    const s = q.toLowerCase().trim()
    return rows.filter((r) => {
      if (filter === 'admins' && !adminIds.has(r.id)) return false
      if (filter === 'blocked' && !r.blocked) return false
      if (!s) return true
      return (
        (r.username ?? '').toLowerCase().includes(s) ||
        (r.display_name ?? '').toLowerCase().includes(s) ||
        (r.telegram_username ?? '').toLowerCase().includes(s) ||
        (r.telegram_id ?? '').includes(q) ||
        r.id.startsWith(q)
      )
    })
  }, [rows, q, filter, adminIds])

  const openUser = rows?.find((r) => r.id === openId) ?? null

  return (
    <div className="space-y-4">
      <SectionHeader title="Пользователи" subtitle={rows ? `${rows.length} всего` : ''} />

      <div className="space-y-2">
        <SearchInput value={q} onChange={setQ} placeholder="Имя, @username, tg id, uuid…" />
        <ChipRow>
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
            Все
          </Chip>
          <Chip active={filter === 'admins'} onClick={() => setFilter('admins')} count={adminIds.size}>
            Админы
          </Chip>
          <Chip
            active={filter === 'blocked'}
            onClick={() => setFilter('blocked')}
            count={rows?.filter((r) => r.blocked).length ?? 0}
          >
            Заблок.
          </Chip>
        </ChipRow>
      </div>

      {!rows ? (
        <Skeleton />
      ) : filtered.length === 0 ? (
        <Empty text="Никого не найдено" icon={UserRound} />
      ) : (
        <ul className="space-y-2">
          {filtered.map((p) => {
            const isA = adminIds.has(p.id)
            const name = p.display_name || p.username || p.telegram_username || 'Аноним'
            const initials = name
              .split(' ')
              .map((s) => s[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()
            return (
              <li key={p.id}>
                <button
                  onClick={() => setOpenId(p.id)}
                  className="pressable flex w-full items-center gap-3 rounded-2xl border border-border-strong bg-card p-3 text-left"
                >
                  <div className="relative">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="size-11 rounded-2xl object-cover" />
                    ) : (
                      <div className="flex size-11 items-center justify-center rounded-2xl bg-gold-gradient font-display text-[14px] font-bold text-primary-foreground">
                        {initials}
                      </div>
                    )}
                    {isA && (
                      <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-card">
                        <ShieldCheck className="size-3" strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-[14px] font-semibold">{name}</p>
                      {p.blocked && (
                        <span className="rounded-full bg-destructive/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-destructive">
                          blocked
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
                      {p.telegram_username
                        ? `@${p.telegram_username}`
                        : p.telegram_id
                          ? `tg:${p.telegram_id}`
                          : p.id.slice(0, 8)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tnum text-[14px] font-bold text-primary">{money(p.balance)}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <UserDrawer
        profile={openUser}
        isAdmin={openUser ? adminIds.has(openUser.id) : false}
        selfId={me?.id ?? ''}
        onClose={() => setOpenId(null)}
        onRefresh={load}
        show={show}
      />
    </div>
  )
}

function UserDrawer({
  profile,
  isAdmin,
  selfId,
  onClose,
  onRefresh,
  show,
}: {
  profile: ProfileRow | null
  isAdmin: boolean
  selfId: string
  onClose: () => void
  onRefresh: () => void
  show: (msg: string) => void
}) {
  const [tab, setTab] = useState<'info' | 'balance' | 'orders'>('info')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [balMode, setBalMode] = useState<'credit' | 'debit' | 'set'>('credit')
  const [balAmount, setBalAmount] = useState(0)
  const [balReason, setBalReason] = useState('')
  const [balBusy, setBalBusy] = useState(false)
  const [history, setHistory] = useState<BalTx[] | null>(null)
  const [orders, setOrders] = useState<UserOrder[] | null>(null)

  useEffect(() => {
    if (!profile) return
    setTab('info')
    setName(profile.display_name ?? '')
    setUsername(profile.username ?? '')
    setBalAmount(0)
    setBalReason('')
    setBalMode('credit')
    setHistory(null)
    setOrders(null)
    ;(async () => {
      const [h, o] = await Promise.all([
        supabase
          .from('balance_transactions')
          .select('id,delta,balance_after,kind,reason,created_at')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('orders')
          .select('id,title,amount_usd,status,created_at')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(20),
      ])
      setHistory((h.data as BalTx[]) ?? [])
      setOrders((o.data as UserOrder[]) ?? [])
    })()
  }, [profile])

  if (!profile) return <Drawer open={false} onClose={onClose} title="" children={null} />

  const name0 = profile.display_name || profile.username || profile.telegram_username || 'Аноним'

  async function saveInfo() {
    if (!profile) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: name || null, username: username || null })
      .eq('id', profile.id)
    setSaving(false)
    if (error) return show('Ошибка: ' + error.message)
    show('Сохранено')
    onRefresh()
  }

  async function toggleBlock() {
    if (!profile) return
    if (!confirm(profile.blocked ? 'Разблокировать?' : 'Заблокировать пользователя?')) return
    const { error } = await supabase
      .from('profiles')
      .update({ blocked: !profile.blocked })
      .eq('id', profile.id)
    if (error) return show('Ошибка: ' + error.message)
    show(profile.blocked ? 'Разблокирован' : 'Заблокирован')
    onRefresh()
    onClose()
  }

  async function toggleAdmin() {
    if (!profile) return
    if (isAdmin) {
      if (!confirm('Забрать права админа?')) return
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', profile.id)
        .eq('role', 'admin')
      if (error) return show('Ошибка: ' + error.message)
    } else {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: profile.id, role: 'admin' })
      if (error) return show('Ошибка: ' + error.message)
    }
    show('Готово')
    onRefresh()
  }

  async function adjustBalance() {
    if (!profile) return
    if (balAmount <= 0 && balMode !== 'set') return show('Введи сумму')
    if (!balReason.trim()) return show('Укажи причину — обязательно')
    setBalBusy(true)
    const { data, error } = await supabase.rpc('admin_adjust_balance', {
      _user_id: profile.id,
      _mode: balMode,
      _amount: balAmount,
      _reason: balReason.trim(),
    })
    setBalBusy(false)
    if (error) return show('Ошибка: ' + error.message)
    show(`Баланс: ${money(Number(data ?? 0))}`)
    setBalAmount(0)
    setBalReason('')
    onRefresh()
    // Reload user tx history
    const h = await supabase
      .from('balance_transactions')
      .select('id,delta,balance_after,kind,reason,created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setHistory((h.data as BalTx[]) ?? [])
  }

  const tgLink = profile.telegram_username
    ? `https://t.me/${profile.telegram_username}`
    : profile.telegram_id
      ? `tg://user?id=${profile.telegram_id}`
      : null

  return (
    <Drawer
      open={!!profile}
      onClose={onClose}
      title={name0}
      subtitle={profile.telegram_username ? `@${profile.telegram_username}` : profile.id.slice(0, 12)}
    >
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-[linear-gradient(140deg,color-mix(in_oklab,var(--card)_78%,var(--primary)_22%),var(--secondary))] p-5">
        <div className="flex items-center gap-3">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="size-14 rounded-2xl object-cover" />
          ) : (
            <div className="flex size-14 items-center justify-center rounded-2xl bg-gold-gradient font-display text-[18px] font-bold text-primary-foreground">
              {name0.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[16px] font-bold">{name0}</p>
            <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
              Создан {new Date(profile.created_at).toLocaleDateString('ru-RU')}
              {profile.last_seen_at &&
                ` · был ${new Date(profile.last_seen_at).toLocaleDateString('ru-RU')}`}
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Баланс
            </p>
            <p className="tnum mt-1 font-display text-[28px] font-bold leading-none text-primary">
              {money(profile.balance)}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {isAdmin && (
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                admin
              </span>
            )}
            {profile.blocked && (
              <span className="rounded-full bg-destructive/20 px-2 py-0.5 text-[10px] font-bold uppercase text-destructive">
                blocked
              </span>
            )}
            <span className="rounded-full bg-secondary/70 px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
              {profile.language}
            </span>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {tgLink ? (
          <a
            href={tgLink}
            target="_blank"
            rel="noreferrer"
            className="pressable flex h-11 items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 text-[12px] font-bold text-primary"
          >
            Telegram
          </a>
        ) : (
          <div className="flex h-11 items-center justify-center rounded-xl border border-border bg-card text-[11px] text-muted-foreground">
            нет TG
          </div>
        )}
        {profile.id !== selfId && (
          <GhostButton
            onClick={toggleAdmin}
            size="sm"
            tone={isAdmin ? 'default' : 'primary'}
            icon={ShieldCheck}
          >
            {isAdmin ? 'Снять' : 'Админ'}
          </GhostButton>
        )}
        {profile.id !== selfId && (
          <GhostButton
            onClick={toggleBlock}
            size="sm"
            tone={profile.blocked ? 'default' : 'destructive'}
            icon={Ban}
          >
            {profile.blocked ? 'Разблок' : 'Блок'}
          </GhostButton>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-5 flex gap-1 rounded-xl bg-secondary/50 p-1">
        {(['info', 'balance', 'orders'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-1.5 text-[12px] font-semibold transition-colors ${
              tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            {t === 'info' ? 'Инфо' : t === 'balance' ? 'Баланс' : 'Заказы'}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {tab === 'info' && (
          <>
            <Field label="Отображаемое имя">
              <TextIn value={name} onChange={setName} />
            </Field>
            <Field label="Username">
              <TextIn value={username} onChange={setUsername} />
            </Field>
            <ReadRow label="UUID" value={profile.id} mono copyable />
            <ReadRow label="Telegram ID" value={profile.telegram_id ?? ''} copyable />
            <ReadRow label="Telegram Username" value={profile.telegram_username ?? ''} copyable />
            <ReadRow label="Язык" value={profile.language} />
            <ReadRow
              label="Зарегистрирован"
              value={new Date(profile.created_at).toLocaleString('ru-RU')}
            />
            <PrimaryButton onClick={saveInfo} loading={saving} icon={BadgeCheck}>
              Сохранить
            </PrimaryButton>
          </>
        )}

        {tab === 'balance' && (
          <>
            <Field label="Операция">
              <SelectPill<'credit' | 'debit' | 'set'>
                value={balMode}
                onChange={setBalMode}
                options={[
                  { value: 'credit', label: '+ Начислить' },
                  { value: 'debit', label: '− Списать' },
                  { value: 'set', label: '= Установить' },
                ]}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Сумма $">
                <NumIn value={balAmount} onChange={setBalAmount} />
              </Field>
              <Field label="Итог">
                <div className="tnum flex h-[42px] items-center justify-center rounded-xl border border-primary/30 bg-primary/5 text-[15px] font-bold text-primary">
                  {money(
                    balMode === 'credit'
                      ? profile.balance + balAmount
                      : balMode === 'debit'
                        ? profile.balance - balAmount
                        : balAmount,
                  )}
                </div>
              </Field>
            </div>
            <Field label="Причина (в аудит)" hint="Обязательное поле — попадёт в audit log">
              <TextIn value={balReason} onChange={setBalReason} placeholder="например: возврат за #A123" />
            </Field>
            <PrimaryButton onClick={adjustBalance} loading={balBusy} icon={DollarSign}>
              Применить
            </PrimaryButton>

            <div className="mt-6">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                История баланса
              </p>
              {history === null ? (
                <Skeleton rows={3} />
              ) : history.length === 0 ? (
                <Empty text="Пока пусто" icon={Clock} />
              ) : (
                <ul className="space-y-1.5">
                  {history.map((h) => (
                    <li
                      key={h.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/60 px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <div
                          className={`flex size-7 items-center justify-center rounded-lg ${h.delta >= 0 ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}
                        >
                          {h.delta >= 0 ? (
                            <ArrowUpRight className="size-3.5" />
                          ) : (
                            <ArrowDownRight className="size-3.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-semibold">
                            {h.reason || h.kind}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(h.created_at).toLocaleString('ru-RU')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`tnum text-[13px] font-bold ${h.delta >= 0 ? 'text-success' : 'text-destructive'}`}
                        >
                          {h.delta >= 0 ? '+' : ''}
                          {money(h.delta)}
                        </p>
                        <p className="tnum text-[10px] text-muted-foreground">{money(h.balance_after)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {tab === 'orders' && (
          <>
            {orders === null ? (
              <Skeleton rows={3} />
            ) : orders.length === 0 ? (
              <Empty text="У пользователя нет заказов" icon={Package} />
            ) : (
              <ul className="space-y-2">
                {orders.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/60 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold">{o.title}</p>
                      <p className="text-[10.5px] text-muted-foreground">
                        {new Date(o.created_at).toLocaleString('ru-RU')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="tnum text-[13px] font-bold text-primary">{money(o.amount_usd)}</p>
                      <StatusPill status={o.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </Drawer>
  )
}

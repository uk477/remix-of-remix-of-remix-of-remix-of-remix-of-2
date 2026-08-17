'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import {
  Activity,
  ArrowDown,
  ArrowDownCircle,
  ArrowUp,
  ArrowUpCircle,
  BellRing,
  CalendarRange,
  Download,
  Filter,
  RefreshCw,
  Timer,
  TrendingUp,
  Zap,
} from 'lucide-react'
import {
  adminListBoostEvents,
  adminListBoostSubscribers,
  type BoostRegion,
  type BoostStatusEvent,
  type BoostSubcatId,
  type BoostSubscriber,
} from '@/lib/boost-status.functions'
import { Empty, SectionHeader, Skeleton, StatTile } from './primitives'
import { useToast } from '../toast'

const SUBCAT_LABELS: Record<BoostSubcatId, string> = {
  followers: 'Фолловеры',
  likes: 'Лайки',
  views: 'Просмотры',
  reposts: 'Репосты',
  bookmarks: 'Закладки',
}

const REGION_LABELS: Record<BoostRegion, string> = {
  _all: 'Вся категория',
  global: 'Global',
  jp: 'Япония',
  kr: 'Корея',
  us: 'США',
}

const REGION_SHORT: Record<BoostRegion, string> = {
  _all: '—',
  global: 'GLB',
  jp: 'JP',
  kr: 'KR',
  us: 'US',
}

const SOURCE_LABELS: Record<string, string> = {
  auto: 'Авто',
  admin_ping: 'Ручной пинг',
  admin_override: 'Админ',
}

type Preset = '1h' | '24h' | '7d' | '30d' | 'all'
const PRESETS: { id: Preset; label: string; ms: number | null }[] = [
  { id: '1h', label: '1ч', ms: 3600_000 },
  { id: '24h', label: '24ч', ms: 24 * 3600_000 },
  { id: '7d', label: '7д', ms: 7 * 24 * 3600_000 },
  { id: '30d', label: '30д', ms: 30 * 24 * 3600_000 },
  { id: 'all', label: 'Всё', ms: null },
]

function labelFor(subcat: BoostSubcatId, region: BoostRegion) {
  const s = SUBCAT_LABELS[subcat] ?? subcat
  if (region === '_all') return s
  return `${s} · ${REGION_LABELS[region] ?? region}`
}

function fmtDuration(ms: number) {
  if (ms < 0) ms = 0
  if (ms < 60_000) return `${Math.round(ms / 1000)}с`
  if (ms < 3600_000) return `${Math.round(ms / 60_000)} мин`
  if (ms < 86_400_000) {
    const h = Math.floor(ms / 3600_000)
    const m = Math.round((ms % 3600_000) / 60_000)
    return m ? `${h}ч ${m}м` : `${h}ч`
  }
  const d = Math.floor(ms / 86_400_000)
  const h = Math.round((ms % 86_400_000) / 3600_000)
  return h ? `${d}д ${h}ч` : `${d}д`
}

// ─── МСК time helpers ────────────────────────────────────────────────────
const MSK_FMT = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Moscow',
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})
function fmtMsk(iso: string): { date: string; time: string } {
  const parts = MSK_FMT.formatToParts(new Date(iso))
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return {
    date: `${g('day')}.${g('month')}.${g('year')}`,
    time: `${g('hour')}:${g('minute')}`,
  }
}

type StatusRow = {
  subcategory_id: BoostSubcatId
  region: BoostRegion
  is_available: boolean
  down_since: string | null
  last_checked_at: string | null
  last_error: string | null
  manual_override: 'force_up' | 'force_down' | null
}

type EnrichedEvent = BoostStatusEvent & { durationMs: number | null }

// ─── Filter chips ────────────────────────────────────────────────────────
function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`pressable shrink-0 rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition-colors ${
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border bg-card text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4">
      {children}
    </div>
  )
}

function StatusBadge({ up, override }: { up: boolean; override?: 'force_up' | 'force_down' | null }) {
  if (override === 'force_down') {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-destructive/40 bg-destructive/15 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-destructive">
        <span className="size-1.5 rounded-full bg-destructive" /> FORCE DOWN
      </span>
    )
  }
  if (override === 'force_up') {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-primary">
        <span className="size-1.5 rounded-full bg-primary" /> FORCE UP
      </span>
    )
  }
  return up ? (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-success/40 bg-success/15 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-success">
      <span className="size-1.5 rounded-full bg-success animate-pulse" /> ONLINE
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-destructive/40 bg-destructive/15 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-destructive">
      <span className="size-1.5 rounded-full bg-destructive animate-pulse" /> DOWN
    </span>
  )
}

export function BoostStatsSection() {
  const { show } = useToast()
  const listFn = useServerFn(adminListBoostEvents)
  const listSubsFn = useServerFn(adminListBoostSubscribers)

  const [preset, setPreset] = useState<Preset>('24h')
  const [fSubcat, setFSubcat] = useState<BoostSubcatId | null>(null)
  const [fRegion, setFRegion] = useState<BoostRegion | null>(null)
  const [fEvent, setFEvent] = useState<'up' | 'down' | null>(null)
  const [fSource, setFSource] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')

  const [events, setEvents] = useState<BoostStatusEvent[] | null>(null)
  const [statuses, setStatuses] = useState<StatusRow[]>([])
  const [subs, setSubs] = useState<Record<string, number>>({})
  const [subscribers, setSubscribers] = useState<BoostSubscriber[] | null>(null)

  const rangeFrom = useMemo(() => {
    const p = PRESETS.find((x) => x.id === preset)
    if (!p?.ms) return null
    return new Date(Date.now() - p.ms).toISOString()
  }, [preset])

  const load = useCallback(async () => {
    setEvents(null)
    try {
      const [r, s] = await Promise.all([
        listFn({
          data: {
            limit: 500,
            from: rangeFrom,
            subcategory: fSubcat,
            region: fRegion,
            event: fEvent,
            source: fSource,
          },
        }),
        listSubsFn(),
      ])
      setEvents(r.events)
      setStatuses(r.statuses)
      setSubs(r.subscriberCounts)
      setSubscribers(s.subscribers)
    } catch (e) {
      show((e as Error).message || 'Ошибка загрузки')
      setEvents([])
      setSubscribers([])
    }
  }, [listFn, listSubsFn, show, rangeFrom, fSubcat, fRegion, fEvent, fSource])

  useEffect(() => {
    load()
  }, [load])

  const downNow = useMemo(() => statuses.filter((s) => !s.is_available), [statuses])
  const upCount = statuses.length - downNow.length
  const waitingSubs = useMemo(
    () => Object.values(subs).reduce((a, b) => a + b, 0),
    [subs],
  )

  // Enrich events with paired durations (per subcat:region, chronological)
  const enrichedEvents: EnrichedEvent[] = useMemo(() => {
    if (!events) return []
    const byKey: Record<string, BoostStatusEvent[]> = {}
    for (const e of events) {
      const k = `${e.subcategory_id}:${e.region}`
      ;(byKey[k] ??= []).push(e)
    }
    const durMap = new Map<string, number>()
    for (const list of Object.values(byKey)) {
      const asc = [...list].sort(
        (a, b) => +new Date(a.created_at) - +new Date(b.created_at),
      )
      let openDown: BoostStatusEvent | null = null
      for (const e of asc) {
        if (e.event === 'down') openDown = e
        else if (e.event === 'up' && openDown) {
          durMap.set(e.id, +new Date(e.created_at) - +new Date(openDown.created_at))
          openDown = null
        }
      }
    }
    return events.map((e) => ({ ...e, durationMs: durMap.get(e.id) ?? null }))
  }, [events])

  const sortedEvents = useMemo(() => {
    const arr = [...enrichedEvents]
    arr.sort((a, b) => {
      const d = +new Date(a.created_at) - +new Date(b.created_at)
      return sortDir === 'asc' ? d : -d
    })
    return arr
  }, [enrichedEvents, sortDir])

  const metrics = useMemo(() => {
    if (!events) return { incidents: 0, resolved: 0, notified: 0, avgMttr: 0 }
    const incidents = events.filter((e) => e.event === 'down').length
    const resolved = events.filter((e) => e.event === 'up').length
    const notified = events.reduce((a, e) => a + (e.event === 'up' ? e.notified_count : 0), 0)
    const durations = enrichedEvents
      .filter((e) => e.event === 'up' && e.durationMs != null)
      .map((e) => e.durationMs as number)
    const avgMttr = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0
    return { incidents, resolved, notified, avgMttr }
  }, [events, enrichedEvents])

  const activeFiltersCount =
    (fSubcat ? 1 : 0) + (fRegion ? 1 : 0) + (fEvent ? 1 : 0) + (fSource ? 1 : 0)

  const resetFilters = () => {
    setFSubcat(null)
    setFRegion(null)
    setFEvent(null)
    setFSource(null)
  }

  const exportCsv = () => {
    if (!sortedEvents.length) {
      show('Нечего экспортировать')
      return
    }
    const header = [
      'Дата (МСК)',
      'Время (МСК)',
      'Категория',
      'Регион',
      'Событие',
      'Длительность инцидента',
      'Оповещено',
      'Источник',
      'Ошибка',
    ]
    const rows = sortedEvents.map((e) => {
      const t = fmtMsk(e.created_at)
      return [
        t.date,
        t.time,
        SUBCAT_LABELS[e.subcategory_id] ?? e.subcategory_id,
        REGION_LABELS[e.region] ?? e.region,
        e.event === 'up' ? 'Восстановление' : 'Отключение',
        e.event === 'up' && e.durationMs != null ? fmtDuration(e.durationMs) : '',
        e.event === 'up' ? String(e.notified_count) : '',
        SOURCE_LABELS[e.source] ?? e.source,
        (e.error ?? '').replace(/\r?\n/g, ' '),
      ]
    })
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n')
    // BOM for Excel
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const suffix = preset === 'all' ? 'всё' : preset
    a.href = url
    a.download = `boost-события_${suffix}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Sort statuses: DOWN first, then by subcat/region
  const sortedStatuses = useMemo(() => {
    return [...statuses].sort((a, b) => {
      if (a.is_available !== b.is_available) return a.is_available ? 1 : -1
      if (a.subcategory_id !== b.subcategory_id)
        return a.subcategory_id.localeCompare(b.subcategory_id)
      return a.region.localeCompare(b.region)
    })
  }, [statuses])

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Boost — статистика"
        subtitle="Онлайн статус, инциденты, MTTR и ожидающие подписки"
        action={
          <div className="flex items-center gap-1.5">
            <button
              onClick={exportCsv}
              className="pressable flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground"
              title="Экспорт CSV"
            >
              <Download className="size-3.5" />
            </button>
            <button
              onClick={load}
              className="pressable flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground"
              title="Обновить"
            >
              <RefreshCw className="size-3.5" />
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2">
        <StatTile
          label="Онлайн сейчас"
          value={`${upCount}/${statuses.length}`}
          icon={Zap}
          tone={downNow.length === 0 ? 'success' : 'warn'}
          size="sm"
        />
        <StatTile
          label="Выключено сейчас"
          value={String(downNow.length)}
          icon={ArrowDownCircle}
          tone={downNow.length === 0 ? 'default' : 'destructive'}
          size="sm"
        />
        <StatTile
          label="Ждут уведомления"
          value={String(waitingSubs)}
          icon={BellRing}
          tone="gold"
          size="sm"
          hint="Всего по всем сервисам"
        />
        <StatTile
          label="Инцидентов"
          value={String(metrics.incidents)}
          icon={ArrowDownCircle}
          tone="default"
          size="sm"
          hint={`восст.: ${metrics.resolved}`}
        />
        <StatTile
          label="Средний MTTR"
          value={metrics.avgMttr ? fmtDuration(metrics.avgMttr) : '—'}
          icon={Timer}
          tone="default"
          size="sm"
          hint="время восстановления"
        />
        <StatTile
          label="Оповещено"
          value={String(metrics.notified)}
          icon={TrendingUp}
          tone="default"
          size="sm"
          hint="за период"
        />
      </div>

      {/* ─── Live status table ─────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
            Сейчас · онлайн статус
          </p>
          <p className="text-[10px] text-muted-foreground">обновлено сейчас</p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border-strong bg-card">
          {/* header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-b border-border bg-secondary/40 px-3 py-2 text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Сервис</span>
            <span className="text-center">Статус</span>
            <span className="text-right">Длительность</span>
            <span className="text-right">Ждут</span>
          </div>
          {sortedStatuses.length === 0 ? (
            <div className="px-3 py-6 text-center text-[12px] text-muted-foreground">
              Нет данных
            </div>
          ) : (
            sortedStatuses.map((s, i) => {
              const key = `${s.subcategory_id}:${s.region}`
              const waiting = subs[key] ?? 0
              const downMs = s.down_since
                ? Date.now() - new Date(s.down_since).getTime()
                : 0
              const isDown = !s.is_available
              return (
                <div
                  key={key}
                  className={`grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-3 py-2.5 ${
                    i > 0 ? 'border-t border-border/60' : ''
                  } ${isDown ? 'bg-destructive/5' : ''}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold">
                      {SUBCAT_LABELS[s.subcategory_id] ?? s.subcategory_id}
                    </p>
                    <p className="text-[10.5px] text-muted-foreground">
                      {REGION_LABELS[s.region] ?? s.region}
                      {s.last_error && isDown ? ` · ${s.last_error}` : ''}
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <StatusBadge up={s.is_available} override={s.manual_override} />
                  </div>
                  <div className="tnum text-right text-[12px] font-semibold">
                    {isDown && s.down_since ? (
                      <span className="text-destructive">{fmtDuration(downMs)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                  <div className="tnum flex justify-end text-[12px] font-bold">
                    {waiting > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-primary">
                        <BellRing className="size-3" />
                        {waiting}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ─── Period + filters ──────────────────────────────────────── */}
      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
          <CalendarRange className="size-3" />
          Период журнала
        </div>
        <ChipRow>
          {PRESETS.map((p) => (
            <Chip key={p.id} active={preset === p.id} onClick={() => setPreset(p.id)}>
              {p.label}
            </Chip>
          ))}
        </ChipRow>
      </div>

      <div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="pressable flex w-full items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5"
        >
          <div className="flex items-center gap-2">
            <Filter className="size-3.5 text-muted-foreground" />
            <span className="text-[12.5px] font-semibold">Фильтры</span>
            {activeFiltersCount > 0 && (
              <span className="tnum rounded-full bg-primary px-1.5 py-0.5 text-[9.5px] font-bold text-primary-foreground">
                {activeFiltersCount}
              </span>
            )}
          </div>
          {activeFiltersCount > 0 && (
            <span
              onClick={(e) => {
                e.stopPropagation()
                resetFilters()
              }}
              className="text-[11px] font-semibold text-primary"
            >
              Сброс
            </span>
          )}
        </button>

        {showFilters && (
          <div className="mt-2 space-y-3 rounded-xl border border-border bg-card/50 p-3">
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Категория
              </p>
              <ChipRow>
                <Chip active={!fSubcat} onClick={() => setFSubcat(null)}>Все</Chip>
                {(Object.keys(SUBCAT_LABELS) as BoostSubcatId[]).map((s) => (
                  <Chip key={s} active={fSubcat === s} onClick={() => setFSubcat(s)}>
                    {SUBCAT_LABELS[s]}
                  </Chip>
                ))}
              </ChipRow>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Регион
              </p>
              <ChipRow>
                <Chip active={!fRegion} onClick={() => setFRegion(null)}>Все</Chip>
                {(Object.keys(REGION_LABELS) as BoostRegion[]).map((r) => (
                  <Chip key={r} active={fRegion === r} onClick={() => setFRegion(r)}>
                    {REGION_LABELS[r]}
                  </Chip>
                ))}
              </ChipRow>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Событие
              </p>
              <ChipRow>
                <Chip active={!fEvent} onClick={() => setFEvent(null)}>Все</Chip>
                <Chip active={fEvent === 'down'} onClick={() => setFEvent('down')}>Отключения</Chip>
                <Chip active={fEvent === 'up'} onClick={() => setFEvent('up')}>Восстановления</Chip>
              </ChipRow>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Источник
              </p>
              <ChipRow>
                <Chip active={!fSource} onClick={() => setFSource(null)}>Все</Chip>
                {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                  <Chip key={k} active={fSource === k} onClick={() => setFSource(k)}>
                    {v}
                  </Chip>
                ))}
              </ChipRow>
            </div>
          </div>
        )}
      </div>

      {/* ─── Boost notify subscribers table ─────────────────────────── */}
      <BoostSubscribersTable subscribers={subscribers} />

      {/* ─── Journal table (horizontal scroll) ─────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
            Журнал событий
          </p>
          <div className="flex items-center gap-2">
            {events && (
              <span className="tnum text-[10.5px] font-semibold text-muted-foreground">
                {events.length}
              </span>
            )}
            <button
              onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
              className="pressable flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
              title="Сортировка по времени"
            >
              {sortDir === 'desc' ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />}
              {sortDir === 'desc' ? 'Сначала новые' : 'Сначала старые'}
            </button>
          </div>
        </div>

        {!events ? (
          <Skeleton rows={6} />
        ) : sortedEvents.length === 0 ? (
          <Empty text="Событий в выбранном периоде нет" icon={Activity} />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border-strong bg-card">
            <div className="scrollbar-none max-h-[520px] overflow-auto">
              <table className="w-full min-w-[640px] border-collapse text-[11.5px]">
                <thead className="sticky top-0 z-10 bg-secondary/80 backdrop-blur">
                  <tr className="text-left text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="whitespace-nowrap px-3 py-2">Время МСК</th>
                    <th className="whitespace-nowrap px-2 py-2">Сервис</th>
                    <th className="whitespace-nowrap px-2 py-2 text-center">Событие</th>
                    <th className="whitespace-nowrap px-2 py-2 text-right">Длит.</th>
                    <th className="whitespace-nowrap px-2 py-2 text-right">Оповещ.</th>
                    <th className="whitespace-nowrap px-2 py-2">Источник</th>
                    <th className="whitespace-nowrap px-3 py-2">Ошибка</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEvents.map((e, i) => {
                    const up = e.event === 'up'
                    const t = fmtMsk(e.created_at)
                    return (
                      <tr
                        key={e.id}
                        className={`${i > 0 ? 'border-t border-border/60' : ''} ${
                          up ? '' : 'bg-destructive/[0.04]'
                        }`}
                      >
                        <td className="tnum whitespace-nowrap px-3 py-2 align-top">
                          <div className="font-semibold">{t.time}</div>
                          <div className="text-[9.5px] text-muted-foreground">{t.date}</div>
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 align-top">
                          <div className="font-semibold">
                            {SUBCAT_LABELS[e.subcategory_id] ?? e.subcategory_id}
                          </div>
                          <div className="text-[9.5px] text-muted-foreground">
                            {REGION_SHORT[e.region] ?? e.region}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-center align-top">
                          {up ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/15 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-success">
                              <ArrowUpCircle className="size-3" /> UP
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/15 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-destructive">
                              <ArrowDownCircle className="size-3" /> DOWN
                            </span>
                          )}
                        </td>
                        <td className="tnum whitespace-nowrap px-2 py-2 text-right align-top font-semibold">
                          {up && e.durationMs != null ? (
                            fmtDuration(e.durationMs)
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="tnum whitespace-nowrap px-2 py-2 text-right align-top">
                          {up && e.notified_count > 0 ? (
                            <span className="inline-flex items-center gap-1 font-bold text-primary">
                              <BellRing className="size-3" />
                              {e.notified_count}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 align-top text-muted-foreground">
                          {SOURCE_LABELS[e.source] ?? e.source}
                        </td>
                        <td className="px-3 py-2 align-top text-muted-foreground">
                          {e.error ? (
                            <span className="line-clamp-2 max-w-[220px] break-words">
                              {e.error}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border bg-secondary/30 px-3 py-1.5 text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              ← прокрутите вбок для полной таблицы →
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Boost subscribers table ──────────────────────────────────────────
function subDisplay(s: BoostSubscriber): string {
  return (
    s.display_name ||
    (s.telegram_username ? '@' + s.telegram_username : '') ||
    (s.username ? '@' + s.username : '') ||
    (s.telegram_id ? 'tg:' + s.telegram_id : '') ||
    s.user_id.slice(0, 8)
  )
}

function BoostSubscribersTable({
  subscribers,
}: {
  subscribers: BoostSubscriber[] | null
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
          Ждут уведомления о буст-сервисах
        </p>
        {subscribers && (
          <span className="tnum text-[10.5px] font-semibold text-muted-foreground">
            {subscribers.length}
          </span>
        )}
      </div>
      {subscribers === null ? (
        <Skeleton rows={2} />
      ) : subscribers.length === 0 ? (
        <Empty text="Никто пока не ждёт" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border-strong bg-card">
          <div className="max-h-[360px] overflow-y-auto">
            <table className="w-full text-[11.5px]">
              <thead className="sticky top-0 z-[1] bg-secondary/70 text-[9.5px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-bold">Пользователь</th>
                  <th className="px-3 py-2 text-left font-bold">Сервис</th>
                  <th className="px-3 py-2 text-left font-bold">Регион</th>
                  <th className="px-3 py-2 text-right font-bold">Подписался (МСК)</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((s, i) => (
                  <tr
                    key={s.user_id + s.subcategory_id + s.region}
                    className={i > 0 ? 'border-t border-border/60' : ''}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {s.avatar_url ? (
                          <img
                            src={s.avatar_url}
                            alt=""
                            className="size-7 shrink-0 rounded-full border border-border object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                            {(subDisplay(s)[0] || '?').toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{subDisplay(s)}</p>
                          <p className="truncate text-[9.5px] text-muted-foreground">
                            <span className="font-mono">{s.user_id.slice(0, 8)}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 font-semibold">
                      {SUBCAT_LABELS[s.subcategory_id] ?? s.subcategory_id}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {REGION_LABELS[s.region] ?? s.region}
                    </td>
                    <td className="tnum px-3 py-2 text-right text-muted-foreground">
                      {(() => { const t = fmtMsk(s.created_at); return `${t.date} ${t.time}` })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}


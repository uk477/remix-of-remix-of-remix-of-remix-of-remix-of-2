'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { Activity, BellRing, Loader2, RefreshCw, Wrench, Zap } from 'lucide-react'
import {
  adminListBoostStatuses,
  adminUpdateBoostStatus,
  adminPingBoostNow,
  type BoostRegion,
  type BoostServiceStatus,
  type BoostSubcatId,
} from '@/lib/boost-status.functions'
import { Card, SectionHeader, Skeleton } from './primitives'
import { useToast } from '../toast'

const SUBCAT_LABELS: Record<BoostSubcatId, string> = {
  followers: 'Фолловеры',
  likes: 'Лайки',
  views: 'Просмотры',
  reposts: 'Репосты',
  bookmarks: 'Закладки',
}

const REGION_LABELS: Record<Exclude<BoostRegion, '_all'>, string> = {
  global: 'Global',
  jp: 'Япония',
  kr: 'Корея',
  us: 'США',
}

const SUBCAT_ORDER: BoostSubcatId[] = ['followers', 'likes', 'views', 'reposts', 'bookmarks']
const REGION_ORDER: Exclude<BoostRegion, '_all'>[] = ['global', 'jp', 'kr', 'us']

export function BoostStatusSection() {
  const { show } = useToast()
  const listFn = useServerFn(adminListBoostStatuses)
  const updateFn = useServerFn(adminUpdateBoostStatus)
  const pingFn = useServerFn(adminPingBoostNow)

  const [rows, setRows] = useState<BoostServiceStatus[] | null>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [pending, setPending] = useState<string | null>(null)

  const load = useCallback(async () => {
    setRows(null)
    try {
      const r = await listFn()
      setRows(r.rows)
      setCounts(r.subscriberCounts)
    } catch (e) {
      show((e as Error).message || 'Ошибка загрузки')
      setRows([])
    }
  }, [listFn, show])

  useEffect(() => {
    load()
  }, [load])

  // Group rows by subcategory, with '_all' as the master row
  const grouped = useMemo(() => {
    const map = new Map<
      BoostSubcatId,
      { master?: BoostServiceStatus; regions: Map<BoostRegion, BoostServiceStatus> }
    >()
    for (const id of SUBCAT_ORDER)
      map.set(id, { regions: new Map<BoostRegion, BoostServiceStatus>() })
    for (const row of rows ?? []) {
      const bucket =
        map.get(row.subcategory_id) ??
        { regions: new Map<BoostRegion, BoostServiceStatus>() }
      if (row.region === '_all') bucket.master = row
      else bucket.regions.set(row.region, row)
      map.set(row.subcategory_id, bucket)
    }
    return map
  }, [rows])

  async function saveRow(row: BoostServiceStatus, patch: Partial<BoostServiceStatus>) {
    const key = `${row.subcategory_id}:${row.region}`
    setPending(key)
    try {
      await updateFn({
        data: {
          subcategory: row.subcategory_id,
          region: row.region,
          manual_override:
            patch.manual_override !== undefined
              ? patch.manual_override
              : row.manual_override,
        },
      })
      show('Сохранено')
      await load()
    } catch (e) {
      show((e as Error).message || 'Ошибка')
    } finally {
      setPending(null)
    }
  }

  async function pingNow(row: BoostServiceStatus) {
    const key = `${row.subcategory_id}:${row.region}`
    setPending(key)
    try {
      const r = await pingFn({
        data: { subcategory: row.subcategory_id, region: row.region },
      })
      show(`Проверено: ${r.checked}, оповещено: ${r.notified}`)
      await load()
    } catch (e) {
      show((e as Error).message || 'Ошибка')
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Boost — статус сервисов"
        subtitle="Ручное вкл/выкл по подкатегории и по регионам фолловеров + авто-пинг"
        action={
          <button
            onClick={load}
            className="pressable flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-[11.5px] font-semibold text-muted-foreground"
          >
            <RefreshCw className="size-3.5" />
            Обновить
          </button>
        }
      />

      {!rows ? (
        <Skeleton />
      ) : (
        <div className="space-y-3">
          {SUBCAT_ORDER.map((id) => {
            const g = grouped.get(id)
            if (!g?.master) return null
            const isFollowers = id === 'followers'
            return (
              <div key={id} className="space-y-2">
                <RowCard
                  row={g.master}
                  title={SUBCAT_LABELS[id]}
                  subtitle={isFollowers ? 'Мастер-переключатель (вся категория)' : undefined}
                  subscribers={counts[`${id}:_all`] ?? 0}
                  pending={pending === `${id}:_all`}
                  onSave={(patch) => saveRow(g.master!, patch)}
                  onPing={() => pingNow(g.master!)}
                />
                {isFollowers && (
                  <div className="ml-3 space-y-2 border-s-2 border-border ps-3">
                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                      Регионы
                    </p>
                    {REGION_ORDER.map((r) => {
                      const rr = g.regions.get(r)
                      if (!rr) return null
                      const key = `${id}:${r}`
                      const masterOff = g.master!.is_available === false
                      return (
                        <RowCard
                          key={r}
                          row={rr}
                          compact
                          title={REGION_LABELS[r]}
                          subtitle={masterOff ? 'Заблокировано мастер-переключателем' : undefined}
                          subscribers={counts[key] ?? 0}
                          pending={pending === key}
                          onSave={(patch) => saveRow(rr, patch)}
                          onPing={() => pingNow(rr)}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function RowCard({
  row,
  title,
  subtitle,
  subscribers,
  pending,
  compact,
  onSave,
  onPing,
}: {
  row: BoostServiceStatus
  title: string
  subtitle?: string
  subscribers: number
  pending: boolean
  compact?: boolean
  onSave: (patch: Partial<BoostServiceStatus>) => void
  onPing: () => void
}) {
  const statusColor = row.is_available
    ? 'text-success bg-success/15 border-success/40'
    : 'text-destructive bg-destructive/15 border-destructive/40'

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`font-display font-extrabold tracking-tight ${compact ? 'text-[14px]' : 'text-[16px]'}`}>
              {title}
            </p>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusColor}`}
            >
              {row.is_available ? 'online' : 'offline'}
            </span>
            {row.manual_override && (
              <span className="rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                {row.manual_override === 'force_up' ? 'FORCE UP' : 'FORCE DOWN'}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              {subtitle}
            </p>
          )}
          <p className="mt-1 text-[11px] text-muted-foreground">
            {row.last_checked_at
              ? `Проверено: ${new Date(row.last_checked_at).toLocaleString('ru-RU')}`
              : 'Авто-проверка каждые 5 минут'}
            {row.last_error ? ` · ${row.last_error}` : ''}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-bold">
            <BellRing className="size-3.5 text-primary" />
            {subscribers}
          </div>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
            Ручной режим
          </p>
          <button
            onClick={onPing}
            disabled={pending}
            className="pressable flex h-7 items-center gap-1 rounded-lg border border-border bg-card px-2 text-[10.5px] font-semibold text-muted-foreground disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Activity className="size-3" />
            )}
            Проверить
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              { v: null,          label: 'Авто',   icon: RefreshCw },
              { v: 'force_up',    label: 'ВКЛ',    icon: Zap },
              { v: 'force_down',  label: 'ВЫКЛ',   icon: Wrench },
            ] as const
          ).map((opt) => {
            const active = (row.manual_override ?? null) === opt.v
            return (
              <button
                key={opt.label}
                onClick={() => onSave({ manual_override: opt.v })}
                disabled={pending}
                className={`pressable flex h-9 items-center justify-center gap-1.5 rounded-xl border text-[11.5px] font-semibold transition-colors ${
                  active
                    ? opt.v === 'force_down'
                      ? 'border-destructive/60 bg-destructive/20 text-destructive'
                      : 'border-primary/60 bg-primary/20 text-primary'
                    : 'border-border bg-card text-muted-foreground'
                } ${pending ? 'opacity-60' : ''}`}
              >
                <opt.icon className="size-3.5" />
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

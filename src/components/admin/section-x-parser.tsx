'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Check,
  CheckCheck,
  Link2Off,
  Loader2,
  RefreshCw,
  Radar,
  Users,
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useFollowerAccounts } from '@/lib/follower-accounts'
import { normalizeXHandle } from '@/lib/x-profile'
import {
  refreshAccountsFromX,
  getXSyncRuns,
  type XRefreshReport,
  type XSyncRun,
} from '@/lib/x-refresh.functions'
import {
  Card,
  Chip,
  ChipRow,
  Empty,
  GhostButton,
  PrimaryButton,
  SearchInput,
  SectionHeader,
  Skeleton,
  StatTile,
} from './primitives'
import { useToast } from '../toast'

type XProfileLite = {
  username_key: string
  name: string | null
  avatar_url: string | null
  followers: number
  not_found: boolean
  fetched_at: string
}

const STALE_MS = 6 * 60 * 60 * 1000

function ago(iso: string | undefined) {
  if (!iso) return 'никогда'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'только что'
  if (m < 60) return `${m} мин назад`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} ч назад`
  return `${Math.floor(h / 24)} д назад`
}

type Filter = 'all' | 'stale' | 'nolink' | 'problem'

export function XParserSection() {
  const { rows, loading, reload } = useFollowerAccounts()
  const { show } = useToast()
  const [profiles, setProfiles] = useState<Record<string, XProfileLite>>({})
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<'all' | 'selected' | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [report, setReport] = useState<XRefreshReport | null>(null)
  const [runs, setRuns] = useState<XSyncRun[]>([])

  const loadProfiles = useCallback(async () => {
    const { data } = await supabase
      .from('x_profiles')
      .select('username_key,name,avatar_url,followers,not_found,fetched_at')
    const next: Record<string, XProfileLite> = {}
    ;(data ?? []).forEach((r) => {
      next[(r as XProfileLite).username_key] = r as XProfileLite
    })
    setProfiles(next)
  }, [])

  useEffect(() => {
    loadProfiles()
  }, [loadProfiles])

  const loadRuns = useCallback(async () => {
    try {
      setRuns(await getXSyncRuns())
    } catch {
      /* не критично для раздела */
    }
  }, [])

  useEffect(() => {
    loadRuns()
  }, [loadRuns])


  const items = useMemo(
    () =>
      rows.map((r) => {
        const handle = normalizeXHandle(r.account_url)
        const p = handle ? profiles[handle.toLowerCase()] : undefined
        const stale = !p || Date.now() - new Date(p.fetched_at).getTime() > STALE_MS
        return {
          id: r.id,
          title: r.name_ru || r.name_en || 'Без названия',
          category: r.category,
          handle,
          profile: p,
          stale,
          problem: Boolean(p?.not_found),
        }
      }),
    [rows, profiles],
  )

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return items.filter((i) => {
      if (filter === 'stale' && (!i.handle || !i.stale)) return false
      if (filter === 'nolink' && i.handle) return false
      if (filter === 'problem' && !i.problem) return false
      if (!needle) return true
      return (
        i.title.toLowerCase().includes(needle) ||
        i.handle.toLowerCase().includes(needle) ||
        (i.profile?.name ?? '').toLowerCase().includes(needle)
      )
    })
  }, [items, q, filter])

  const withLink = items.filter((i) => i.handle).length
  const noLink = items.length - withLink
  const staleCount = items.filter((i) => i.handle && i.stale).length
  const problemCount = items.filter((i) => i.problem).length

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const selectFiltered = () =>
    setSelected((prev) => {
      const next = new Set(prev)
      filtered.filter((i) => i.handle).forEach((i) => next.add(i.id))
      return next
    })

  const finish = async (r: XRefreshReport) => {
    setReport(r)
    await Promise.all([loadProfiles(), reload(), loadRuns()])
    const extra = [
      r.notFound ? `не найдено ${r.notFound}` : '',
      r.failed ? `ошибок ${r.failed}` : '',
      r.skipped ? `без ссылки ${r.skipped}` : '',
    ]
      .filter(Boolean)
      .join(' · ')
    show(
      r.updated
        ? `Обновлено ${r.updated}${extra ? ` · ${extra}` : ''}`
        : `Нечего обновлять${extra ? ` · ${extra}` : ''}`,
    )
  }

  const runAll = async () => {
    setBusy('all')
    setReport(null)
    try {
      const r = await refreshAccountsFromX({ data: { all: true } })
      await finish(r)
    } catch (e) {
      show(e instanceof Error ? `Ошибка: ${e.message}` : 'Ошибка обновления')
    } finally {
      setBusy(null)
    }
  }

  const runSelected = async () => {
    const ids = Array.from(selected)
    if (!ids.length) return
    setBusy('selected')
    setReport(null)
    try {
      const r = await refreshAccountsFromX({ data: { ids } })
      await finish(r)
      setSelected(new Set())
    } catch (e) {
      show(e instanceof Error ? `Ошибка: ${e.message}` : 'Ошибка обновления')
    } finally {
      setBusy(null)
    }
  }

  const runOne = async (id: string) => {
    setBusyId(id)
    try {
      const r = await refreshAccountsFromX({ data: { ids: [id] } })
      await Promise.all([loadProfiles(), reload()])
      const res = r.results[0]
      if (res?.ok) {
        show(`@${res.handle} · ${(res.followers ?? 0).toLocaleString('ru-RU')} подписчиков`)
      } else {
        show(res?.notFound ? 'Аккаунт не найден в X' : res?.error ?? 'Не удалось обновить')
      }
    } catch (e) {
      show(e instanceof Error ? `Ошибка: ${e.message}` : 'Ошибка обновления')
    } finally {
      setBusyId(null)
    }
  }


  return (
    <div className="space-y-4">
      <SectionHeader
        title="X-парсер"
        subtitle="Подтягивает реальные аватар, баннер, имя и подписчиков с x.com по юзернейму. Aged-аккаунты не затрагиваются."
      />

      <div className="grid grid-cols-2 gap-2">
        <StatTile label="Карточек" value={String(items.length)} icon={Users} tone="gold" />
        <StatTile label="Со ссылкой на X" value={String(withLink)} icon={Radar} />
        <StatTile label="Требуют обновления" value={String(staleCount)} icon={RefreshCw} tone={staleCount ? 'warn' : 'default'} />
        <StatTile label="Без ссылки" value={String(noLink)} icon={Link2Off} tone={noLink ? 'destructive' : 'default'} />
      </div>

      <Card hero>
        <p className="text-[12.5px] text-muted-foreground">
          Один запрос ≈ $0.001. Обновляются: имя, @юзернейм, аватар, баннер, подписчики,
          подписки, галочка и год регистрации.
        </p>
        <div className="mt-3 grid gap-2">
          <PrimaryButton
            onClick={runAll}
            loading={busy === 'all'}
            disabled={busy !== null || !withLink}
            icon={RefreshCw}
          >
            Обновить все карточки ({withLink})
          </PrimaryButton>
          <GhostButton
            onClick={() => (busy ? undefined : runSelected())}
            tone={selected.size ? 'primary' : 'default'}
            icon={busy === 'selected' ? Loader2 : CheckCheck}
          >
            {busy === 'selected'
              ? 'Обновляю выбранные…'
              : `Обновить выбранные (${selected.size})`}
          </GhostButton>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[13px] font-bold">Автопроверка раз в неделю</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Каждый понедельник в 03:00 UTC все карточки со ссылкой на X проверяются
              автоматически: ник, имя, аватар, баннер, подписчики, галочка, год.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-bold text-success">
            вкл
          </span>
        </div>
        <div className="mt-3 space-y-1.5">
          {runs.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">Запусков ещё не было.</p>
          ) : (
            runs.slice(0, 5).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-secondary/40 px-2.5 py-1.5 text-[11.5px]"
              >
                <span className="font-semibold">
                  {r.source === 'cron' ? 'Авто' : 'Вручную'} · {ago(r.started_at)}
                </span>
                <span className="text-muted-foreground">
                  {r.updated}/{r.requested}
                  {r.not_found ? ` · нет ${r.not_found}` : ''}
                  {r.failed ? ` · ошибок ${r.failed}` : ''}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>



      <AnimatePresence>
        {report && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Card>
              <p className="text-[13px] font-bold">Результат обновления</p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11.5px]">
                <span className="rounded-full bg-success/15 px-2.5 py-1 font-semibold text-success">
                  обновлено {report.updated}
                </span>
                {!!report.notFound && (
                  <span className="rounded-full bg-warning/15 px-2.5 py-1 font-semibold text-warning">
                    не найдено {report.notFound}
                  </span>
                )}
                {!!report.failed && (
                  <span className="rounded-full bg-destructive/15 px-2.5 py-1 font-semibold text-destructive">
                    ошибок {report.failed}
                  </span>
                )}
                {!!report.skipped && (
                  <span className="rounded-full bg-secondary px-2.5 py-1 font-semibold text-muted-foreground">
                    без ссылки {report.skipped}
                  </span>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <SearchInput value={q} onChange={setQ} placeholder="Поиск по названию или @юзернейму" />

      <ChipRow>
        <Chip active={filter === 'all'} onClick={() => setFilter('all')} count={items.length}>
          Все
        </Chip>
        <Chip active={filter === 'stale'} onClick={() => setFilter('stale')} count={staleCount}>
          Устарели
        </Chip>
        <Chip active={filter === 'problem'} onClick={() => setFilter('problem')} count={problemCount}>
          Проблемные
        </Chip>
        <Chip active={filter === 'nolink'} onClick={() => setFilter('nolink')} count={noLink}>
          Без ссылки
        </Chip>
      </ChipRow>

      <div className="flex gap-2">
        <button
          onClick={selectFiltered}
          className="pressable flex-1 rounded-xl border border-border bg-card py-2 text-[12px] font-bold"
        >
          Выбрать всё на экране
        </button>
        <button
          onClick={() => setSelected(new Set())}
          className="pressable flex-1 rounded-xl border border-border bg-card py-2 text-[12px] font-bold text-muted-foreground"
        >
          Снять выделение
        </button>
      </div>

      {loading ? (
        <Skeleton rows={5} />
      ) : filtered.length === 0 ? (
        <Empty text="Карточек не найдено" icon={Radar} />
      ) : (
        <div className="space-y-2">
          {filtered.map((i) => {
            const isSel = selected.has(i.id)
            return (
              <div
                key={i.id}
                className={`flex items-center gap-3 rounded-2xl border p-3 transition-colors ${
                  isSel ? 'border-primary bg-primary/10' : 'border-border-strong bg-card'
                }`}
              >
                <button
                  onClick={() => i.handle && toggle(i.id)}
                  disabled={!i.handle}
                  className={`flex size-5 shrink-0 items-center justify-center rounded-md border disabled:opacity-30 ${
                    isSel ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                  }`}
                >
                  {isSel && <Check className="size-3.5" strokeWidth={3} />}
                </button>

                <button
                  onClick={() => i.handle && toggle(i.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <div className="size-9 shrink-0 overflow-hidden rounded-full bg-secondary">
                    {i.profile?.avatar_url && (
                      <img src={i.profile.avatar_url} alt="" className="size-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold">
                      {i.profile?.name || i.title}
                    </p>
                    <p className="truncate text-[11.5px] text-muted-foreground">
                      {i.handle ? `@${i.handle}` : 'нет ссылки на X'}
                      {i.profile && !i.profile.not_found && (
                        <> · {i.profile.followers.toLocaleString('ru-RU')} подписчиков</>
                      )}
                    </p>
                    <p
                      className={`mt-0.5 flex items-center gap-1 text-[10.5px] font-semibold ${
                        i.problem
                          ? 'text-destructive'
                          : i.stale
                          ? 'text-warning'
                          : 'text-success'
                      }`}
                    >
                      {i.problem && <AlertTriangle className="size-3" />}
                      {i.problem
                        ? 'аккаунт не найден в X'
                        : `обновлено ${ago(i.profile?.fetched_at)}`}
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => i.handle && runOne(i.id)}
                  disabled={!i.handle || busyId === i.id || busy !== null}
                  className="pressable flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary/40 disabled:opacity-40"
                  aria-label="Обновить карточку"
                >
                  {busyId === i.id ? (
                    <Loader2 className="size-4 animate-spin text-primary" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

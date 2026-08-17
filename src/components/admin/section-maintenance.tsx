'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Ban,
  BellRing,
  CheckCircle2,
  Clock,
  Globe,
  Loader2,
  MessageSquareText,
  Power,
  PowerOff,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UserPlus,
  UserX,
  Wrench,
  X,
  Plus,
  Eye,
} from 'lucide-react'
import { useMaintenance } from '@/lib/maintenance'

import { useServerFn } from '@tanstack/react-start'
import { supabase } from '@/integrations/supabase/client'
import {
  adminListMaintenanceSubscribers,
  adminNotifyMaintenanceSubscribers,
  type MaintenanceSubscriber,
} from '@/lib/maintenance-notify.functions'
import { useToast } from '../toast'
import { Card, Field, SectionHeader, Skeleton, TextArea } from './primitives'
import { searchUserIds, useUserLookup, userDisplay } from './use-user-lookup'

type MState = {
  enabled: boolean
  message_ru: string
  message_en: string
  eta: string | null
  updated_at: string
  updated_by: string | null
}

type WLRow = { user_id: string; note: string | null; added_at: string }
type TGRow = { user_id: string; note: string | null; added_at: string }

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16)
}

function fromDatetimeLocal(v: string): string | null {
  if (!v) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

type TabId = 'global' | 'targets' | 'whitelist'

export function MaintenanceSection() {
  const { show } = useToast()
  const { previewClosed, setPreviewClosed } = useMaintenance()


  const [state, setState] = useState<MState | null>(null)
  const [msgRu, setMsgRu] = useState('')
  const [msgEn, setMsgEn] = useState('')
  const [eta, setEta] = useState('')
  const [savingMsg, setSavingMsg] = useState(false)
  const [savingTgl, setSavingTgl] = useState(false)

  const [wl, setWl] = useState<WLRow[] | null>(null)
  const [tg, setTg] = useState<TGRow[] | null>(null)

  // Maintenance notify subscribers
  const listSubsFn = useServerFn(adminListMaintenanceSubscribers)
  const notifyAllFn = useServerFn(adminNotifyMaintenanceSubscribers)
  const [subs, setSubs] = useState<MaintenanceSubscriber[] | null>(null)
  const [sending, setSending] = useState(false)

  const [tab, setTab] = useState<TabId>('global')

  // Add-user picker (shared between targets & whitelist tabs)
  type PickerMode = 'auto' | 'uuid' | 'telegram_id' | 'username'
  const [picker, setPicker] = useState<{ kind: 'wl' | 'tg' } | null>(null)
  const [mode, setMode] = useState<PickerMode>('auto')
  const [q, setQ] = useState('')
  const [note, setNote] = useState('')
  const [searchResults, setSearchResults] = useState<string[] | null>(null)
  const [rawUuidFallback, setRawUuidFallback] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)

  const userIds = useMemo(() => {
    const s = new Set<string>()
    ;(wl ?? []).forEach((r) => s.add(r.user_id))
    ;(tg ?? []).forEach((r) => s.add(r.user_id))
    ;(searchResults ?? []).forEach((id) => s.add(id))
    return Array.from(s)
  }, [wl, tg, searchResults])
  const { map: users } = useUserLookup(userIds)

  const loadState = useCallback(async () => {
    const { data } = await supabase
      .from('maintenance_state')
      .select('*')
      .eq('singleton', true)
      .maybeSingle()
    if (data) {
      const s = data as MState
      setState(s)
      setMsgRu(s.message_ru ?? '')
      setMsgEn(s.message_en ?? '')
      setEta(toDatetimeLocal(s.eta))
    }
  }, [])

  const loadWl = useCallback(async () => {
    const { data } = await supabase
      .from('maintenance_whitelist')
      .select('user_id,note,added_at')
      .order('added_at', { ascending: false })
    setWl((data as WLRow[]) ?? [])
  }, [])

  const loadTg = useCallback(async () => {
    const { data } = await supabase
      .from('maintenance_targets')
      .select('user_id,note,added_at')
      .order('added_at', { ascending: false })
    setTg((data as TGRow[]) ?? [])
  }, [])

  const loadSubs = useCallback(async () => {
    try {
      const r = await listSubsFn()
      setSubs(r.subscribers)
    } catch (e) {
      show((e as Error).message || 'Ошибка загрузки подписчиков')
      setSubs([])
    }
  }, [listSubsFn, show])

  useEffect(() => {
    loadState()
    loadWl()
    loadTg()
    loadSubs()
    const ch = supabase
      .channel('admin-maint')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_state' }, loadState)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_whitelist' }, loadWl)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_targets' }, loadTg)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_notify_subscriptions' }, loadSubs)
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [loadState, loadWl, loadTg, loadSubs])

  async function sendNotifyAll() {
    if (!subs?.length) return
    if (!window.confirm(`Отправить уведомление ${subs.length} подписчикам и очистить список?`)) return
    setSending(true)
    try {
      const r = await notifyAllFn()
      show(`Отправлено ${r.notified} из ${r.total}`)
      await loadSubs()
    } catch (e) {
      show((e as Error).message || 'Ошибка отправки')
    } finally {
      setSending(false)
    }
  }



  async function toggleGlobal(nextEnabled: boolean) {
    if (nextEnabled && !window.confirm('Закрыть бот для всех, кроме админов и whitelist?')) return
    setSavingTgl(true)
    const { data, error } = await supabase.rpc('admin_set_maintenance', {
      _enabled: nextEnabled,
      _message_ru: msgRu,
      _message_en: msgEn,
      _eta: fromDatetimeLocal(eta) as unknown as string,
    })
    setSavingTgl(false)
    if (error) return show('Ошибка: ' + error.message)
    if (data) setState(data as MState)
    await loadState()
    show(nextEnabled ? 'Глобальный тех. режим включён' : 'Тех. режим выключен')
  }

  async function saveMessages() {
    if (!state) return
    setSavingMsg(true)
    const { data, error } = await supabase.rpc('admin_set_maintenance', {
      _enabled: state.enabled,
      _message_ru: msgRu,
      _message_en: msgEn,
      _eta: fromDatetimeLocal(eta) as unknown as string,
    })
    setSavingMsg(false)
    if (error) return show('Ошибка: ' + error.message)
    if (data) setState(data as MState)
    show('Сохранено')
  }

  function openPicker(kind: 'wl' | 'tg') {
    setPicker({ kind })
    setMode('auto')
    setQ('')
    setNote('')
    setSearchResults(null)
    setRawUuidFallback(null)
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  async function runSearch() {
    const raw = q.trim().replace(/^@/, '')
    setRawUuidFallback(null)
    if (!raw) {
      setSearchResults(null)
      return
    }
    setSearching(true)
    try {
      const excludeSet = new Set(
        (picker?.kind === 'wl' ? wl : tg)?.map((r) => r.user_id) ?? [],
      )
      let ids: string[] = []

      if (mode === 'uuid') {
        if (!UUID_RE.test(raw)) {
          show('Введите валидный UUID')
          setSearchResults([])
          return
        }
        // Try to find profile; if not — allow direct block anyway
        const { data } = await supabase.from('profiles').select('id').eq('id', raw).maybeSingle()
        if (data) ids = [data.id as string]
        else setRawUuidFallback(raw)
      } else if (mode === 'telegram_id') {
        if (!/^\d+$/.test(raw)) {
          show('Telegram ID — только цифры')
          setSearchResults([])
          return
        }
        const { data } = await supabase.from('profiles').select('id').eq('telegram_id', raw).limit(50)
        ids = (data ?? []).map((r) => r.id as string)
      } else if (mode === 'username') {
        const like = `%${raw}%`
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .or(
            [
              `username.ilike.${like}`,
              `telegram_username.ilike.${like}`,
              `display_name.ilike.${like}`,
            ].join(','),
          )
          .limit(100)
        ids = (data ?? []).map((r) => r.id as string)
      } else {
        // auto
        if (UUID_RE.test(raw)) {
          const { data } = await supabase.from('profiles').select('id').eq('id', raw).maybeSingle()
          if (data) ids = [data.id as string]
          else setRawUuidFallback(raw)
        } else {
          ids = await searchUserIds(raw)
        }
      }

      setSearchResults(ids.filter((id) => !excludeSet.has(id)))
    } finally {
      setSearching(false)
    }
  }

  async function addUser(uid: string) {
    if (!picker) return
    setAddingId(uid)
    const rpc = picker.kind === 'wl' ? 'admin_whitelist_add' : 'admin_target_add'
    const { error } = await supabase.rpc(rpc, { _user_id: uid, _note: note })
    setAddingId(null)
    if (error) return show('Ошибка: ' + error.message)
    show(picker.kind === 'wl' ? 'Добавлен в whitelist' : 'Пользователь заблокирован')
    setPicker(null)
  }



  async function removeUser(kind: 'wl' | 'tg', uid: string) {
    if (!window.confirm(kind === 'wl' ? 'Убрать из whitelist?' : 'Разблокировать пользователя?')) return
    const rpc = kind === 'wl' ? 'admin_whitelist_remove' : 'admin_target_remove'
    const { error } = await supabase.rpc(rpc, { _user_id: uid })
    if (error) return show('Ошибка: ' + error.message)
    show('Готово')
  }

  const isOn = !!state?.enabled
  const wlCount = wl?.length ?? 0
  const tgCount = tg?.length ?? 0

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Режим обслуживания"
        subtitle="Управляйте доступом к боту — глобально или для конкретных пользователей"
      />

      {/* Live status hero */}
      <div
        className={`relative overflow-hidden rounded-[28px] border p-5 transition-colors ${
          isOn
            ? 'border-warning/50 bg-[linear-gradient(140deg,color-mix(in_oklab,var(--card)_82%,var(--warning)_18%),var(--card))]'
            : tgCount > 0
              ? 'border-primary/40 bg-[linear-gradient(140deg,color-mix(in_oklab,var(--card)_84%,var(--primary)_16%),var(--card))]'
              : 'border-success/40 bg-success/10'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex size-14 items-center justify-center rounded-2xl ${
              isOn
                ? 'bg-warning/25 text-warning'
                : tgCount > 0
                  ? 'bg-primary/20 text-primary'
                  : 'bg-success/20 text-success'
            }`}
          >
            {isOn ? (
              <Wrench className="size-6" strokeWidth={2.4} />
            ) : tgCount > 0 ? (
              <UserX className="size-6" strokeWidth={2.4} />
            ) : (
              <CheckCircle2 className="size-6" strokeWidth={2.4} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[18px] font-bold leading-tight">
              {isOn
                ? 'Глобальный тех. режим'
                : tgCount > 0
                  ? `Точечно заблокировано: ${tgCount}`
                  : 'Всё работает'}
            </p>
            <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
              {isOn
                ? `Работают только админы и whitelist (${wlCount})`
                : tgCount > 0
                  ? 'Глобально бот открыт, но часть пользователей заблокирована индивидуально'
                  : 'Бот доступен всем пользователям'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-border bg-card p-1">
        <TabBtn active={tab === 'global'} onClick={() => setTab('global')} icon={Globe} label="Глобально" />
        <TabBtn active={tab === 'targets'} onClick={() => setTab('targets')} icon={Ban} label="Блокировки" count={tgCount} />
        <TabBtn active={tab === 'whitelist'} onClick={() => setTab('whitelist')} icon={ShieldCheck} label="Whitelist" count={wlCount} />
      </div>

      {/* GLOBAL tab */}
      {tab === 'global' && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold">Закрыть бот для всех</p>
                <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground">
                  Все действия (заказы, пополнения, обращения) блокируются. Обход невозможен — правила действуют на уровне БД.
                </p>
              </div>
              <button
                onClick={() => toggleGlobal(!isOn)}
                disabled={savingTgl}
                aria-label="Toggle maintenance"
                className={`relative flex h-8 w-14 shrink-0 items-center rounded-full transition-colors ${
                  isOn ? 'bg-warning' : 'bg-muted'
                }`}
              >
                <span
                  className={`absolute left-1 flex size-6 items-center justify-center rounded-full bg-white text-[0.7rem] shadow-md transition-transform ${
                    isOn ? 'translate-x-6 text-warning' : 'translate-x-0 text-muted-foreground'
                  }`}
                >
                  {savingTgl ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : isOn ? (
                    <Power className="size-3" strokeWidth={3} />
                  ) : (
                    <PowerOff className="size-3" strokeWidth={3} />
                  )}
                </span>
              </button>
            </div>
          </Card>

          <Card>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[13px] font-semibold">
                  <Eye className="size-3.5 text-primary" />
                  Предпросмотр для админа
                </p>
                <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground">
                  Локально покажет вам экран «бот закрыт», как его видят обычные пользователи. Ни на кого не влияет и сохраняется только в вашем браузере.
                </p>
                {previewClosed && (
                  <p className="mt-1.5 text-[11px] font-semibold text-warning">
                    Активен — перезагрузите вкладку, чтобы увидеть экран.
                  </p>
                )}
              </div>
              <button
                onClick={() => setPreviewClosed(!previewClosed)}
                aria-label="Toggle preview"
                className={`relative flex h-8 w-14 shrink-0 items-center rounded-full transition-colors ${
                  previewClosed ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`absolute left-1 flex size-6 items-center justify-center rounded-full bg-white shadow-md transition-transform ${
                    previewClosed ? 'translate-x-6 text-primary' : 'translate-x-0 text-muted-foreground'
                  }`}
                >
                  <Eye className="size-3" strokeWidth={3} />
                </span>
              </button>
            </div>
          </Card>

          <Card>

            <p className="mb-3 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <MessageSquareText className="size-3" />
              Сообщение пользователям
            </p>
            <div className="space-y-3">
              <Field label="Русский">
                <TextArea
                  value={msgRu}
                  onChange={setMsgRu}
                  rows={2}
                  placeholder="Ведутся тех. работы. Скоро вернёмся."
                />
              </Field>
              <Field label="English">
                <TextArea
                  value={msgEn}
                  onChange={setMsgEn}
                  rows={2}
                  placeholder="Maintenance in progress. We'll be back soon."
                />
              </Field>
              <Field label="Окончание (ETA)" hint="Показывается пользователю как обратный отсчёт">
                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={eta}
                    onChange={(e) => setEta(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background/50 px-3 py-2.5 text-[13px] outline-none focus:border-primary/60"
                  />
                  {eta && (
                    <button
                      onClick={() => setEta('')}
                      className="pressable flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground"
                      aria-label="Сброс ETA"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              </Field>
              <button
                onClick={saveMessages}
                disabled={savingMsg}
                className="pressable flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gold-gradient text-[13.5px] font-bold text-primary-foreground disabled:opacity-50"
              >
                {savingMsg ? <Loader2 className="size-4 animate-spin" /> : <Clock className="size-4" strokeWidth={2.6} />}
                Сохранить
              </button>
            </div>
          </Card>

          <NotifySubscribersCard
            subs={subs}
            sending={sending}
            onSend={sendNotifyAll}
            onReload={loadSubs}
          />
        </div>
      )}


      {/* TARGETS tab */}
      {tab === 'targets' && (
        <div className="space-y-3">
          <Card className="border-destructive/30 bg-destructive/5">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-destructive">Индивидуальная блокировка</p>
                <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                  Пользователь не сможет пользоваться ботом, пока вы не снимете блокировку. Работает независимо от глобального режима.
                </p>
              </div>
            </div>
          </Card>

          <button
            onClick={() => openPicker('tg')}
            className="pressable flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 text-[13px] font-bold text-destructive"
          >
            <UserX className="size-4" />
            Заблокировать пользователя
          </button>

          <UserList
            rows={tg}
            users={users}
            kind="tg"
            onRemove={(id) => removeUser('tg', id)}
            emptyText="Никто не заблокирован индивидуально"
          />
        </div>
      )}

      {/* WHITELIST tab */}
      {tab === 'whitelist' && (
        <div className="space-y-3">
          <Card className="border-primary/30 bg-primary/5">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-primary">Whitelist глобального режима</p>
                <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                  Эти пользователи продолжат пользоваться ботом даже когда глобальный тех. режим включён. Админам это не нужно — они и так имеют полный доступ.
                </p>
              </div>
            </div>
          </Card>

          <button
            onClick={() => openPicker('wl')}
            className="pressable flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 text-[13px] font-bold text-primary"
          >
            <UserPlus className="size-4" />
            Добавить в whitelist
          </button>

          <UserList
            rows={wl}
            users={users}
            kind="wl"
            onRemove={(id) => removeUser('wl', id)}
            emptyText="Whitelist пуст"
          />
        </div>
      )}

      {/* User picker sheet */}
      {picker && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setPicker(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[520px] rounded-t-[28px] border-t border-border-strong bg-background p-5"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)' }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border-strong" />
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-[17px] font-bold">
                  {picker.kind === 'wl' ? 'Добавить в whitelist' : 'Заблокировать пользователя'}
                </p>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                  Выберите тип и введите значение — так никто не запутается
                </p>
              </div>
              <button
                onClick={() => setPicker(null)}
                className="pressable flex size-8 items-center justify-center rounded-full bg-secondary"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Mode selector */}
            <div className="mb-3 grid grid-cols-4 gap-1 rounded-xl border border-border bg-card p-1">
              {([
                { id: 'auto', label: 'Авто' },
                { id: 'username', label: '@Username' },
                { id: 'telegram_id', label: 'Telegram ID' },
                { id: 'uuid', label: 'UUID' },
              ] as { id: PickerMode; label: string }[]).map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setMode(m.id)
                    setSearchResults(null)
                    setRawUuidFallback(null)
                  }}
                  className={`pressable rounded-lg py-1.5 text-[11px] font-semibold transition-colors ${
                    mode === m.id
                      ? 'bg-gold-gradient text-primary-foreground shadow-sm'
                      : 'text-muted-foreground'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3">
                <Search className="size-3.5 text-muted-foreground" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                  placeholder={
                    mode === 'uuid'
                      ? '00000000-0000-0000-0000-000000000000'
                      : mode === 'telegram_id'
                        ? 'Только цифры, напр. 123456789'
                        : mode === 'username'
                          ? '@username или имя'
                          : 'Введите что угодно…'
                  }
                  className={`w-full bg-transparent py-2.5 text-[13px] outline-none placeholder:text-muted-foreground ${
                    mode === 'uuid' ? 'font-mono text-[12px]' : ''
                  }`}
                />
                <button
                  onClick={runSearch}
                  disabled={!q.trim() || searching}
                  className="pressable rounded-full bg-primary/15 px-3 py-1 text-[11px] font-semibold text-primary disabled:opacity-40"
                >
                  {searching ? '…' : 'Найти'}
                </button>
              </div>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Заметка (опционально)"
                className="w-full rounded-xl border border-border bg-background/50 px-3 py-2.5 text-[13px] outline-none focus:border-primary/60"
              />
            </div>

            <div className="mt-3 max-h-[45vh] space-y-1.5 overflow-y-auto">
              {searchResults === null && !rawUuidFallback ? (
                <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-[12px] text-muted-foreground">
                  Введите запрос и нажмите «Найти»
                </p>
              ) : rawUuidFallback ? (
                <div className="rounded-xl border border-dashed border-warning/40 bg-warning/5 p-3">
                  <p className="text-[12px] font-semibold text-warning">
                    Профиль не найден
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                    UUID валидный, но такого пользователя ещё нет в базе. Можно всё равно применить правило — оно сработает, когда он зайдёт впервые.
                  </p>
                  <button
                    onClick={() => addUser(rawUuidFallback)}
                    disabled={addingId !== null}
                    className={`pressable mt-2.5 flex h-10 w-full items-center justify-center gap-1.5 rounded-lg text-[12px] font-bold text-white disabled:opacity-50 ${
                      picker.kind === 'wl' ? 'bg-primary' : 'bg-destructive'
                    }`}
                  >
                    {addingId === rawUuidFallback ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : picker.kind === 'wl' ? (
                      <UserPlus className="size-3.5" />
                    ) : (
                      <UserX className="size-3.5" />
                    )}
                    {picker.kind === 'wl' ? 'Всё равно добавить' : 'Всё равно заблокировать'}
                  </button>
                </div>
              ) : searchResults!.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-[12px] text-muted-foreground">
                  Ничего не найдено
                </p>
              ) : (
                searchResults!.slice(0, 30).map((id) => {
                  const u = users[id]
                  const initial = (userDisplay(u)[0] || '?').toUpperCase()
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2"
                    >
                      {u?.avatar_url ? (
                        <img
                          src={u.avatar_url}
                          alt=""
                          className="size-10 shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-[13px] font-bold text-muted-foreground">
                          {initial}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold">{userDisplay(u)}</p>
                        <p className="truncate text-[10.5px] text-muted-foreground">
                          {u?.telegram_username
                            ? '@' + u.telegram_username + ' · '
                            : u?.username
                              ? '@' + u.username + ' · '
                              : ''}
                          {u?.telegram_id ? 'tg:' + u.telegram_id : id.slice(0, 8)}
                        </p>
                      </div>
                      <button
                        onClick={() => addUser(id)}
                        disabled={addingId === id}
                        className={`pressable flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50 ${
                          picker.kind === 'wl' ? 'bg-primary' : 'bg-destructive'
                        }`}
                      >
                        {addingId === id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : picker.kind === 'wl' ? (
                          <UserPlus className="size-3" />
                        ) : (
                          <UserX className="size-3" />
                        )}
                        {picker.kind === 'wl' ? 'Добавить' : 'Блок'}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function TabBtn({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
  count?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`pressable flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[12px] font-semibold transition-colors ${
        active
          ? 'bg-gold-gradient text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      <Icon className="size-3.5" />
      <span className="truncate">{label}</span>
      {typeof count === 'number' && count > 0 && (
        <span
          className={`tnum rounded-full px-1.5 py-px text-[9.5px] font-bold ${
            active ? 'bg-primary-foreground/25' : 'bg-card text-foreground'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  )
}

function UserList({
  rows,
  users,
  kind,
  onRemove,
  emptyText,
}: {
  rows: (WLRow | TGRow)[] | null
  users: Record<string, import('./use-user-lookup').UserLite>
  kind: 'wl' | 'tg'
  onRemove: (id: string) => void
  emptyText: string
}) {
  if (rows === null) return <Skeleton rows={2} />
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-10 text-center">
        <p className="text-[12.5px] text-muted-foreground">{emptyText}</p>
      </div>
    )
  }
  return (
    <div className="space-y-1.5">
      {rows.map((r) => {
        const u = users[r.user_id]
        const initial = (userDisplay(u)[0] || '?').toUpperCase()
        return (
          <div
            key={r.user_id}
            className={`flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 ${
              kind === 'wl' ? 'border-primary/25 bg-primary/5' : 'border-destructive/25 bg-destructive/5'
            }`}
          >
            {u?.avatar_url ? (
              <img src={u.avatar_url} alt="" className="size-9 shrink-0 rounded-xl object-cover" />
            ) : (
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold ${
                  kind === 'wl' ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'
                }`}
              >
                {initial}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold">{userDisplay(u)}</p>
              <p className="truncate text-[10.5px] text-muted-foreground">
                {u?.telegram_username
                  ? '@' + u.telegram_username + ' · '
                  : u?.username
                    ? '@' + u.username + ' · '
                    : ''}
                {r.note ? r.note + ' · ' : ''}
                {new Date(r.added_at).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}
              </p>
            </div>
            <button
              onClick={() => onRemove(r.user_id)}
              className="pressable flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-destructive"
              aria-label="Удалить"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ─── Maintenance notify subscribers ──────────────────────────────────────
function subDisplay(s: MaintenanceSubscriber): string {
  return (
    s.display_name ||
    (s.telegram_username ? '@' + s.telegram_username : '') ||
    (s.username ? '@' + s.username : '') ||
    (s.telegram_id ? 'tg:' + s.telegram_id : '') ||
    s.user_id.slice(0, 8)
  )
}

function fmtMskFull(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function NotifySubscribersCard({
  subs,
  sending,
  onSend,
  onReload,
}: {
  subs: MaintenanceSubscriber[] | null
  sending: boolean
  onSend: () => void
  onReload: () => void
}) {
  const count = subs?.length ?? 0
  return (
    <Card>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold">
            <BellRing className="size-3.5 text-primary" />
            Ждут уведомления
            <span className="tnum ml-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
              {count}
            </span>
          </p>
          <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground">
            Пользователи нажали «оповестить когда бот заработает». Нажми
            «Отправить всем» — им придёт сообщение в бот, а список очистится.
          </p>
        </div>
        <button
          onClick={onReload}
          className="pressable flex size-8 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground"
          title="Обновить"
        >
          <Loader2 className="size-3.5" />
        </button>
      </div>

      <button
        onClick={onSend}
        disabled={sending || count === 0}
        className="pressable mb-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[13.5px] font-bold text-primary-foreground disabled:opacity-40"
      >
        {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        {sending ? 'Отправка…' : `Отправить всем (${count})`}
      </button>

      {subs === null ? (
        <Skeleton rows={3} />
      ) : subs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-6 text-center text-[12px] text-muted-foreground">
          Пока никто не ждёт
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-strong">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-border bg-secondary/40 px-3 py-2 text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Аватар</span>
            <span>Пользователь</span>
            <span className="text-right">Подписался (МСК)</span>
          </div>
          <div className="max-h-[320px] overflow-y-auto">
            {subs.map((s, i) => (
              <div
                key={s.user_id}
                className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2 ${
                  i > 0 ? 'border-t border-border/60' : ''
                }`}
              >
                {s.avatar_url ? (
                  <img
                    src={s.avatar_url}
                    alt=""
                    className="size-8 shrink-0 rounded-full border border-border object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                    {(subDisplay(s)[0] || '?').toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold">{subDisplay(s)}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {s.telegram_username ? '@' + s.telegram_username + ' · ' : ''}
                    <span className="font-mono">{s.user_id.slice(0, 8)}</span>
                  </p>
                </div>
                <p className="tnum text-right text-[11px] text-muted-foreground">
                  {fmtMskFull(s.created_at)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

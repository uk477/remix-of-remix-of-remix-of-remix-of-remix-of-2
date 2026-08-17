'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ClipboardList,
  Handshake,
  Inbox,
  MessageSquare,
  Send,
  Sparkles,
  Users as UsersIcon,
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/lib/auth'
import {
  Card,
  Chip,
  ChipRow,
  Drawer,
  Empty,
  Field,
  GhostButton,
  PrimaryButton,
  SectionHeader,
  Skeleton,
  TextArea,
  TextIn,
} from './primitives'
import { useToast } from '../toast'

// ═══════════════════════════════════════════════════════════════════════════
// APPLICATIONS (supplier)
// ═══════════════════════════════════════════════════════════════════════════

type AppStatus = 'new' | 'reviewing' | 'approved' | 'declined'
const APP_STATUSES: AppStatus[] = ['new', 'reviewing', 'approved', 'declined']
const appLabel = (s: AppStatus) =>
  ({ new: 'Новая', reviewing: 'Смотрю', approved: 'Принято', declined: 'Отказ' })[s]

type SupplierRow = {
  id: string
  service_name: string
  description: string
  price: string | null
  negotiable: boolean
  telegram: string
  status: AppStatus
  admin_note: string | null
  archived: boolean
  created_at: string
}

function formatPrice(s: { price: string | null; negotiable: boolean }) {
  const p = s.price?.trim()
  if (!p) return s.negotiable ? 'Договорная' : '—'
  return /[$€₽¥£₴]|USD|EUR|RUB|USDT/i.test(p) ? p : `${p}$`
}



export function ApplicationsSection() {
  const { show } = useToast()
  const [rows, setRows] = useState<SupplierRow[] | null>(null)
  const [filter, setFilter] = useState<AppStatus | 'all' | 'archived'>('all')
  const [edit, setEdit] = useState<SupplierRow | null>(null)

  const load = useCallback(async () => {
    setRows(null)
    const { data } = await supabase
      .from('supplier_applications')
      .select('*')
      .order('created_at', { ascending: false })
    setRows((data as SupplierRow[]) ?? [])
  }, [])
  useEffect(() => {
    load()
    const channel = supabase
      .channel('supplier_applications_admin')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'supplier_applications' },
        () => load(),
      )
      .subscribe()
    const iv = setInterval(load, 15000)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(iv)
    }
  }, [load])

  const counts = useMemo(() => {
    const c: Record<string, number> = { archived: 0 }
    ;(rows ?? []).forEach((r) => {
      if (r.archived) c.archived += 1
      else c[r.status] = (c[r.status] ?? 0) + 1
    })
    return c
  }, [rows])

  const filtered = useMemo(() => {
    if (!rows) return []
    if (filter === 'archived') return rows.filter((r) => r.archived)
    if (filter === 'all') return rows.filter((r) => !r.archived)
    return rows.filter((r) => !r.archived && r.status === filter)
  }, [rows, filter])

  const activeCount = useMemo(
    () => (rows ?? []).filter((r) => !r.archived).length,
    [rows],
  )

  async function openRow(row: SupplierRow) {
    setEdit(row)
    if (row.status === 'new') {
      await supabase
        .from('supplier_applications')
        .update({ status: 'reviewing' })
        .eq('id', row.id)
      setRows((prev) =>
        (prev ?? []).map((r) => (r.id === row.id ? { ...r, status: 'reviewing' } : r)),
      )
    }
  }

  async function archiveRow(row: SupplierRow) {
    const next = !row.archived
    const { error } = await supabase
      .from('supplier_applications')
      .update({ archived: next })
      .eq('id', row.id)
    if (error) return show('Ошибка: ' + error.message)
    show(next ? 'В архиве' : 'Возвращено')
    setEdit(null)
    load()
  }

  const telegramHref = (tg: string) =>
    tg.startsWith('@')
      ? `https://t.me/${tg.slice(1)}`
      : tg.startsWith('http')
        ? tg
        : `https://t.me/${tg}`

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Заявки"
        subtitle={counts.new ? `${counts.new} новых` : 'без новых'}
      />
      <ChipRow>
        <Chip active={filter === 'all'} onClick={() => setFilter('all')} count={activeCount}>
          Активные
        </Chip>
        <Chip active={filter === 'archived'} onClick={() => setFilter('archived')} count={counts.archived}>
          Архив
        </Chip>
      </ChipRow>

      {!rows ? (
        <Skeleton />
      ) : filtered.length === 0 ? (
        <Empty text="Заявок нет" icon={Handshake} />
      ) : (
        <ul className="space-y-2">
          {filtered.map((s) => {
            const isNew = s.status === 'new' && !s.archived
            return (
              <li key={s.id}>
                <button
                  onClick={() => openRow(s)}
                  className={`pressable w-full rounded-2xl border bg-card p-3 text-left ${s.archived ? 'border-border opacity-60' : 'border-border-strong'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {isNew ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wider text-primary">
                            <span className="size-1 rounded-full bg-primary" />
                            Новая
                          </span>
                        ) : !s.archived ? (
                          <span className="rounded-full bg-secondary px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Просмотрено
                          </span>
                        ) : null}
                        <p className="truncate text-[14px] font-semibold">{s.service_name}</p>
                      </div>

                      <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                        {s.description}
                      </p>
                      <p className="mt-1 truncate text-[11px] text-primary">{s.telegram}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tnum text-[13px] font-bold">
                        {formatPrice(s)}
                      </p>


                    </div>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <Drawer
        open={!!edit}
        onClose={() => setEdit(null)}
        title="Заявка"
        subtitle={edit?.service_name}
        footer={
          edit && (
            <div className="grid grid-cols-2 gap-2">
              <GhostButton
                onClick={() => archiveRow(edit)}
                tone={edit.archived ? undefined : 'destructive'}
              >
                {edit.archived ? 'Из архива' : 'В архив'}
              </GhostButton>
              <PrimaryButton onClick={() => setEdit(null)}>Готово</PrimaryButton>
            </div>
          )
        }
      >
        {edit && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border-strong bg-gradient-to-br from-primary/10 to-transparent p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Услуга
              </p>
              <p className="mt-1 text-[17px] font-bold leading-tight">{edit.service_name}</p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Цена
                  </p>
                  <p className="tnum mt-0.5 text-[15px] font-bold text-primary">
                    {formatPrice(edit)}
                  </p>


                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Telegram
                  </p>
                  <p className="mt-0.5 text-[13px] font-semibold text-primary">
                    {edit.telegram}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card/50 p-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Описание
              </p>
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed">
                {edit.description || '—'}
              </p>
            </div>

            <a
              href={telegramHref(edit.telegram)}
              target="_blank"
              rel="noreferrer"
              className="pressable flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-[13px] font-bold text-primary-foreground"
            >
              <Send className="size-4" /> Написать в Telegram
            </a>
          </div>
        )}
      </Drawer>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SUPPORT — real-time chat threads
// ═══════════════════════════════════════════════════════════════════════════

type SupportThread = {
  id: string
  user_id: string
  subject: string | null
  status: string
  unread_admin: number
  unread_user: number
  last_message_at: string
  created_at: string
}
type SupportMessage = {
  id: string
  thread_id: string
  sender: string
  from_admin: boolean
  body: string
  created_at: string
}

export function SupportSection() {
  const { show } = useToast()
  const { user } = useAuth()
  const [threads, setThreads] = useState<SupportThread[] | null>(null)
  const [profiles, setProfiles] = useState<Record<string, { name: string; avatar: string | null }>>({})
  const [openId, setOpenId] = useState<string | null>(null)
  const [messages, setMessages] = useState<SupportMessage[] | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const loadThreads = useCallback(async () => {
    setThreads(null)
    const { data } = await supabase
      .from('support_threads')
      .select('*')
      .order('last_message_at', { ascending: false })
      .limit(200)
    const t = (data as SupportThread[]) ?? []
    setThreads(t)
    if (t.length) {
      const ids = Array.from(new Set(t.map((x) => x.user_id)))
      const { data: p } = await supabase
        .from('profiles')
        .select('id,display_name,username,telegram_username,avatar_url')
        .in('id', ids)
      const map: Record<string, { name: string; avatar: string | null }> = {}
      ;(p ?? []).forEach((r: any) => {
        map[r.id] = {
          name: r.display_name || r.username || r.telegram_username || 'Аноним',
          avatar: r.avatar_url,
        }
      })
      setProfiles(map)
    }
  }, [])
  useEffect(() => {
    loadThreads()
    const ch = supabase
      .channel('admin-threads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_threads' }, loadThreads)
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [loadThreads])

  const openThread = threads?.find((t) => t.id === openId) ?? null

  useEffect(() => {
    if (!openId) {
      setMessages(null)
      return
    }
    setMessages(null)
    supabase
      .from('support_messages')
      .select('*')
      .eq('thread_id', openId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages((data as SupportMessage[]) ?? []))
    // Mark read for admin
    supabase.from('support_threads').update({ unread_admin: 0 }).eq('id', openId).then(() => {})
    const ch = supabase
      .channel('thread-' + openId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `thread_id=eq.${openId}` },
        (payload) => {
          setMessages((prev) => [...(prev ?? []), payload.new as SupportMessage])
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [openId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!draft.trim() || !openId || !user) return
    setSending(true)
    const body = draft.trim()
    setDraft('')
    const { error } = await supabase.from('support_messages').insert({
      thread_id: openId,
      sender: user.id,
      from_admin: true,
      body,
    })
    if (!error) {
      await supabase
        .from('support_threads')
        .update({ last_message_at: new Date().toISOString(), unread_user: (openThread?.unread_user ?? 0) + 1 })
        .eq('id', openId)
    } else {
      show('Ошибка: ' + error.message)
      setDraft(body)
    }
    setSending(false)
  }

  async function setStatus(status: string) {
    if (!openId) return
    const { error } = await supabase.from('support_threads').update({ status }).eq('id', openId)
    if (error) show('Ошибка: ' + error.message)
    else loadThreads()
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Саппорт"
        subtitle={
          threads
            ? `${threads.length} тредов · ${threads.filter((t) => t.unread_admin > 0).length} непрочитано`
            : ''
        }
      />

      {!threads ? (
        <Skeleton />
      ) : threads.length === 0 ? (
        <Empty text="Пока нет обращений" icon={MessageSquare} />
      ) : (
        <ul className="space-y-2">
          {threads.map((t) => {
            const p = profiles[t.user_id]
            const name = p?.name ?? 'Аноним'
            return (
              <li key={t.id}>
                <button
                  onClick={() => setOpenId(t.id)}
                  className="pressable flex w-full items-center gap-3 rounded-2xl border border-border-strong bg-card p-3 text-left"
                >
                  {p?.avatar ? (
                    <img src={p.avatar} alt="" className="size-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex size-10 items-center justify-center rounded-full bg-gold-gradient text-[13px] font-bold text-primary-foreground">
                      {name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[13.5px] font-semibold">{name}</p>
                      <p className="shrink-0 text-[10.5px] text-muted-foreground">
                        {new Date(t.last_message_at).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                      {t.subject || 'Без темы'}
                    </p>
                  </div>
                  {t.unread_admin > 0 && (
                    <span className="tnum flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                      {t.unread_admin > 9 ? '9+' : t.unread_admin}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <Drawer
        open={!!openThread}
        onClose={() => setOpenId(null)}
        title={openThread ? profiles[openThread.user_id]?.name ?? 'Тред' : ''}
        subtitle={openThread?.subject ?? undefined}
        footer={
          <div className="space-y-2">
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ответить пользователю…"
                rows={2}
                className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-primary/60"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send()
                }}
              />
              <button
                onClick={send}
                disabled={!draft.trim() || sending}
                className="pressable flex h-11 shrink-0 items-center justify-center gap-1 rounded-xl bg-gold-gradient px-4 text-[13px] font-bold text-primary-foreground disabled:opacity-50"
              >
                <Send className="size-4" />
              </button>
            </div>
            <div className="flex gap-1.5">
              {['open', 'in_progress', 'resolved'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold ${
                    openThread?.status === s
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-border bg-card text-muted-foreground'
                  }`}
                >
                  {s === 'open' ? 'Открыт' : s === 'in_progress' ? 'В работе' : 'Решён'}
                </button>
              ))}
            </div>
          </div>
        }
      >
        <div ref={scrollRef} className="space-y-2">
          {messages === null ? (
            <Skeleton rows={4} />
          ) : messages.length === 0 ? (
            <Empty text="Сообщений ещё нет" />
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.from_admin ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[82%] rounded-2xl px-3 py-2 text-[13px] ${
                    m.from_admin
                      ? 'rounded-br-md bg-gold-gradient text-primary-foreground'
                      : 'rounded-bl-md bg-card'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p
                    className={`mt-1 text-[9.5px] ${
                      m.from_admin ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}
                  >
                    {new Date(m.created_at).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </Drawer>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// BROADCASTS — simple: title + text + optional image, отправить всем
// ═══════════════════════════════════════════════════════════════════════════

type Broadcast = {
  id: string
  title: string
  body: string
  image_url: string | null
  audience: any
  channel: string
  status: string
  stats: any
  created_at: string
  sent_at: string | null
}

export function BroadcastsSection() {
  const { show } = useToast()
  const { user } = useAuth()
  const [rows, setRows] = useState<Broadcast[] | null>(null)
  const [edit, setEdit] = useState<Partial<Broadcast> | null>(null)

  const load = useCallback(async () => {
    setRows(null)
    const { data } = await supabase
      .from('broadcast_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    setRows((data as Broadcast[]) ?? [])
  }, [])
  useEffect(() => {
    load()
  }, [load])

  async function send() {
    if (!edit) return
    if (!edit.title?.trim() || !edit.body?.trim()) return show('Заполни заголовок и текст')
    const payload = {
      title: edit.title.trim(),
      body: edit.body.trim(),
      image_url: edit.image_url?.trim() || null,
      audience: { kind: 'all' },
      channel: 'inapp',
      status: 'sent',
      created_by: user?.id ?? null,
      sent_at: new Date().toISOString(),
      stats: {},
    }
    const q = edit.id
      ? supabase.from('broadcast_campaigns').update(payload as never).eq('id', edit.id)
      : supabase.from('broadcast_campaigns').insert(payload as never)
    const { error } = await q
    if (error) return show('Ошибка: ' + error.message)
    show('Отправлено')
    setEdit(null)
    load()
  }

  async function remove(id: string) {
    const { error } = await supabase.from('broadcast_campaigns').delete().eq('id', id)
    if (error) return show('Ошибка: ' + error.message)
    show('Удалено')
    setEdit(null)
    load()
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Рассылки"
        action={
          <button
            onClick={() => setEdit({ title: '', body: '', image_url: '' })}
            className="pressable flex h-9 items-center gap-1 rounded-xl bg-gold-gradient px-3 text-[12px] font-bold text-primary-foreground"
          >
            <Sparkles className="size-3.5" strokeWidth={2.6} />
            Новая
          </button>
        }
      />

      {!rows ? (
        <Skeleton />
      ) : rows.length === 0 ? (
        <Empty text="Пока нет рассылок" icon={Send} />
      ) : (
        <ul className="space-y-2">
          {rows.map((b) => (
            <li key={b.id}>
              <button
                onClick={() => setEdit(b)}
                className="pressable w-full rounded-2xl border border-border-strong bg-card p-3 text-left"
              >
                <p className="truncate text-[14px] font-semibold">{b.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[11.5px] text-muted-foreground">
                  {b.body}
                </p>
                <p className="mt-1 text-[10.5px] text-muted-foreground">
                  {b.sent_at
                    ? `Отправлено ${new Date(b.sent_at).toLocaleString('ru-RU')}`
                    : `Создано ${new Date(b.created_at).toLocaleString('ru-RU')}`}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Drawer
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? 'Рассылка' : 'Новая рассылка'}
        footer={
          <div className="grid grid-cols-2 gap-2">
            {edit?.id ? (
              <GhostButton onClick={() => remove(edit.id!)} tone="destructive">
                Удалить
              </GhostButton>
            ) : (
              <GhostButton onClick={() => setEdit(null)}>Отмена</GhostButton>
            )}
            <PrimaryButton onClick={send} icon={Send}>
              Отправить
            </PrimaryButton>
          </div>
        }
      >
        {edit && (
          <div className="space-y-3">
            <Field label="Заголовок">
              <TextIn
                value={edit.title ?? ''}
                onChange={(v) => setEdit({ ...edit, title: v })}
              />
            </Field>
            <Field label="Текст">
              <TextArea
                value={edit.body ?? ''}
                onChange={(v) => setEdit({ ...edit, body: v })}
                rows={5}
              />
            </Field>
            <Field label="Картинка URL (опционально)">
              <TextIn
                value={edit.image_url ?? ''}
                onChange={(v) => setEdit({ ...edit, image_url: v })}
                placeholder="https://…"
              />
            </Field>
          </div>
        )}
      </Drawer>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// AUDIT LOG
// ═══════════════════════════════════════════════════════════════════════════

type AuditRow = {
  id: string
  admin_id: string
  action: string
  target_type: string | null
  target_id: string | null
  payload: any
  created_at: string
}

export function AuditSection() {
  const [rows, setRows] = useState<AuditRow[] | null>(null)
  const [q, setQ] = useState('')
  const [live, setLive] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('admin_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300)
    setRows((data as AuditRow[]) ?? [])
  }, [])

  useEffect(() => {
    load()
    const ch = supabase
      .channel('admin-audit')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_audit_log' },
        (payload) => {
          setRows((prev) => [(payload.new as AuditRow), ...(prev ?? [])].slice(0, 500))
        },
      )
      .subscribe((status) => {
        setLive(status === 'SUBSCRIBED')
      })
    return () => {
      supabase.removeChannel(ch)
    }
  }, [load])

  const filtered = useMemo(() => {
    if (!rows) return []
    if (!q) return rows
    const s = q.toLowerCase()
    return rows.filter(
      (r) =>
        r.action.toLowerCase().includes(s) ||
        (r.target_type ?? '').toLowerCase().includes(s) ||
        (r.target_id ?? '').includes(q),
    )
  }, [rows, q])

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Аудит"
        subtitle="Все действия админов — прозрачно и без правок"
        action={
          <button
            onClick={load}
            className="pressable flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-[11.5px] font-semibold text-muted-foreground"
          >
            <span
              className={`inline-block size-1.5 rounded-full ${live ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`}
            />
            {live ? 'Live' : 'Обновить'}
          </button>
        }
      />
      <TextIn value={q} onChange={setQ} placeholder="Фильтр по action / target…" />

      {!rows ? (
        <Skeleton />
      ) : filtered.length === 0 ? (
        <Empty text="Записей нет" icon={ClipboardList} />
      ) : (
        <ul className="space-y-1.5">
          {filtered.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-border bg-card px-3 py-2.5 text-[12px]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-md bg-primary/15 px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-primary">
                  {r.action}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleString('ru-RU')}
                </span>
              </div>
              {r.target_type && (
                <p className="mt-1.5 truncate font-mono text-[10.5px] text-muted-foreground">
                  {r.target_type} · {r.target_id?.slice(0, 12)}
                </p>
              )}
              {r.payload && (
                <pre className="scrollbar-none mt-1 overflow-x-auto rounded-md bg-background/60 px-2 py-1 font-mono text-[10px] text-muted-foreground">
                  {JSON.stringify(r.payload, null, 2).slice(0, 200)}
                </pre>
              )}
              <p className="mt-1 font-mono text-[9.5px] text-muted-foreground">
                admin: {r.admin_id.slice(0, 12)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

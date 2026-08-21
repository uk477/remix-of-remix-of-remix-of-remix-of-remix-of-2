'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { adminSaveOrder, notifyTestOrderReady } from '@/lib/order-notify.functions'
import {
  Boxes,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  FileText,
  FolderTree,
  ExternalLink,
  Lock,
  Package,

  Plus,
  Sparkles,
  Trash2,
  Wallet,
  X,
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { money } from '@/lib/format'
import { downloadCSV, downloadTXT } from '@/lib/export'
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
  Disclosure,
  ListGroup,
  ListRow,
  SectionHeader,
  SelectPill,
  Skeleton,
  StatusPill,
  TextArea,
  TextIn,
  Toggle,
} from './primitives'
import { useToast } from '../toast'
import { OrderAdminOverride } from './order-admin-override'
import { useUserLookup, userDisplay, userSearchHaystack } from './use-user-lookup'
import { loadTestOrders, updateTestOrder } from '@/lib/demo-orders'
import type { Order } from '@/lib/types'
import { OrderDeliveryEditor } from './order-delivery-editor'
import { FIELDS_ORDER_KEY, type DeliveredAccount } from '@/lib/order-delivery'
import { customSpecOf, customSpecRows, customSpecSummary } from '@/lib/order-spec'
import { SpecMedia } from './spec-media'

/** Fulfilment stages shown to the buyer in the order-progress tracker. */
const PROGRESS_STEPS = [
  'Оплата подтверждена',
  'Передан менеджеру',
  'Кастомизация профиля',
  'Верификация (X)',
  'Выполнен и выдан',
]
/** Verification stage only exists for orders that bought the blue badge. */
function stepsForSpec(spec: Record<string, string> | null | undefined) {
  const verified = spec?.['profile_verified'] === 'yes'
  return verified ? PROGRESS_STEPS : PROGRESS_STEPS.filter((_, i) => i !== 3)
}
/** Same fallback the buyer-facing tracker uses when no stage was set yet. */
function currentStepOf(args: {
  spec: Record<string, string> | null | undefined
  step?: number | undefined
  status?: string
}) {
  if (typeof args.step === 'number') return args.step
  const total = stepsForSpec(args.spec).length
  if (args.status === 'completed') return total
  return args.spec?.['profile_verified'] === 'yes' ? 3 : 2
}

/** The brief for a custom build, from either a DB row or a local test order. */
function specOfRow(row: { meta?: Record<string, unknown> | null }, local?: Order) {
  return customSpecOf(row.meta) ?? local?.customAccount ?? null
}

/** Test orders live in localStorage, not the database. */
const isLocalOrder = (id: string) => id.startsWith('test-') || id.startsWith('demo-')

// ═══════════════════════════════════════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════════════════════════════════════

type OrderStatus =
  | 'pending'
  | 'in_progress'
  | 'waiting'
  | 'completed'
  | 'declined'
  | 'refunded'
  | 'failed'
  | 'refilling'
const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'in_progress',
  'waiting',
  'completed',
  'declined',
  'refunded',
  'failed',
  'refilling',
]
const orderLabel = (s: OrderStatus) =>
  ({
    pending: 'Новый',
    in_progress: 'В работе',
    waiting: 'Ожидание',
    completed: 'Готов',
    declined: 'Отклонён',
    refunded: 'Возврат',
    failed: 'Ошибка',
    refilling: 'Рефилл',
  })[s] ?? s


// Forward pipeline the admin walks an order through, left → right.
const PIPELINE: OrderStatus[] = ['pending', 'in_progress', 'waiting', 'completed']
const pipelineIndex = (s: OrderStatus) => {
  const i = PIPELINE.indexOf(s)
  return i < 0 ? PIPELINE.length : i
}
const nextStage = (s: OrderStatus): OrderStatus | null => {
  const i = pipelineIndex(s)
  return i < PIPELINE.length - 1 ? PIPELINE[i + 1]! : null
}
const prevStage = (s: OrderStatus): OrderStatus | null => {
  const i = pipelineIndex(s)
  return i > 0 ? PIPELINE[i - 1]! : null
}

type OrderRow = {
  id: string
  user_id: string
  title: string
  qty: number
  amount_usd: number
  status: OrderStatus
  admin_note: string | null
  meta?: Record<string, unknown> | null
  created_at: string
}

function ExportButtons({ onCSV, onTXT, disabled }: { onCSV: () => void; onTXT: () => void; disabled?: boolean }) {
  return (
    <div className="flex gap-1.5">
      <button
        onClick={onCSV}
        disabled={disabled}
        className="pressable flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-[11px] font-semibold text-muted-foreground disabled:opacity-40"
      >
        <Download className="size-3" /> CSV
      </button>
      <button
        onClick={onTXT}
        disabled={disabled}
        className="pressable flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-[11px] font-semibold text-muted-foreground disabled:opacity-40"
      >
        <FileText className="size-3" /> TXT
      </button>
    </div>
  )
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function OrdersSection() {
  const { show } = useToast()
  const [rows, setRows] = useState<OrderRow[] | null>(null)
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const [onlyCustom, setOnlyCustom] = useState(false)
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState<OrderRow | null>(null)
  const [localOrders, setLocalOrders] = useState<Record<string, Order>>({})
  const [dbIdByLocal, setDbIdByLocal] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setRows(null)
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000)
    if (error) show('Ошибка: ' + error.message)
    // Test purchases live in this browser only — surface them so the pipeline
    // can be walked through before real orders exist.
    const test = loadTestOrders()
    setLocalOrders(Object.fromEntries(test.map((o) => [o.id, o])))
    const local: OrderRow[] = test.map((o) => ({
      id: o.id,
      user_id: '',
      title: o.title,
      qty: o.qty ?? 1,
      amount_usd: o.amount,
      status: o.status as OrderStatus,
      admin_note: null,
      meta: {
        accounts: o.accounts ?? [],
        ...(o.customAccount ? { custom_account: o.customAccount } : {}),
        ...(typeof o.progressStep === 'number' ? { progress_step: o.progressStep } : {}),
      },
      created_at: new Date(o.date).toISOString(),
    }))
    const localIds = new Set(local.map((order) => order.id))
    // Тестовый заказ в списке показывается локальной копией, но в БД у него
    // есть настоящая строка (meta.local_id). Админ-оверрайд работает только
    // по реальному UUID, поэтому держим карту local id → db id.
    const dbMap: Record<string, string> = {}
    const persistedByLocal = new Map<string, OrderRow>()
    const persisted = ((data as OrderRow[]) ?? []).filter((order) => {
      const localId = (order.meta as { local_id?: string } | null)?.local_id
      if (localId) {
        dbMap[localId] = order.id
        persistedByLocal.set(localId, order)
      }
      return !localId || !localIds.has(localId)
    })
    const syncedLocal = local.map((order) => {
      const dbOrder = persistedByLocal.get(order.id)
      return dbOrder
        ? {
            ...order,
            status: dbOrder.status,
            admin_note: dbOrder.admin_note,
            meta: dbOrder.meta,
          }
        : order
    })
    setDbIdByLocal(dbMap)
    setRows([...syncedLocal, ...persisted])
  }, [show])
  useEffect(() => {
    load()
  }, [load])

  const userIds = useMemo(
    () => Array.from(new Set((rows ?? []).map((r) => r.user_id).filter(Boolean))),
    [rows],
  )
  const { map: users } = useUserLookup(userIds)

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    ;(rows ?? []).forEach((r) => (c[r.status] = (c[r.status] ?? 0) + 1))
    return c
  }, [rows])

  const filtered = useMemo(() => {
    if (!rows) return []
    const needle = q.trim().toLowerCase().replace(/^@/, '')
    return rows.filter((r) => {
      if (filter !== 'all' && r.status !== filter) return false
      if (onlyCustom && !specOfRow(r)) return false
      if (!needle) return true
      if (r.title.toLowerCase().includes(needle)) return true
      if (r.id.toLowerCase().startsWith(needle)) return true
      if (userSearchHaystack(users[r.user_id]).includes(needle)) return true
      return false
    })
  }, [rows, filter, onlyCustom, q, users])

  const customCount = useMemo(() => (rows ?? []).filter((r) => !!specOfRow(r)).length, [rows])

  function exportRows(kind: 'csv' | 'txt') {
    const data = filtered.map((r) => {
      const u = users[r.user_id]
      return {
        id: r.id,
        date: fmtDate(r.created_at),
        user: isLocalOrder(r.id) ? 'Тестовый покупатель' : userDisplay(u),
        telegram: u?.telegram_username ? '@' + u.telegram_username : (u?.telegram_id ?? ''),
        user_id: r.user_id,
        title: r.title,
        qty: r.qty,
        amount_usd: Number(r.amount_usd).toFixed(2),
        status: orderLabel(r.status),
        admin_note: r.admin_note ?? '',
      }
    })
    const cols = [
      { key: 'id' as const, label: 'ID' },
      { key: 'date' as const, label: 'Дата' },
      { key: 'user' as const, label: 'Покупатель' },
      { key: 'telegram' as const, label: 'Telegram' },
      { key: 'user_id' as const, label: 'User ID' },
      { key: 'title' as const, label: 'Товар' },
      { key: 'qty' as const, label: 'Кол-во' },
      { key: 'amount_usd' as const, label: 'Сумма USD' },
      { key: 'status' as const, label: 'Статус' },
      { key: 'admin_note' as const, label: 'Заметка' },
    ]
    const name = `orders_${new Date().toISOString().slice(0, 10)}`
    if (kind === 'csv') downloadCSV(name, data, cols)
    else downloadTXT(name, data, cols)
  }

  const saveOrder = useServerFn(adminSaveOrder)
  const notifyTest = useServerFn(notifyTestOrderReady)

  async function commit(ord: OrderRow) {
    if (isLocalOrder(ord.id)) {
      const local =
        ord.status === 'completed'
          ? 'completed'
          : ord.status === 'in_progress' || ord.status === 'pending'
            ? 'in_progress'
            : 'waiting'
      const prev = loadTestOrders().find((o) => o.id === ord.id)?.status ?? null
      updateTestOrder(ord.id, { status: local })
      // Same "ready for delivery" bot message as real orders — sent once on the
      // transition, to the admin's own chat since the order is browser-local.
      if (local === 'completed' && prev !== 'completed') {
        try {
          const r = await notifyTest({ data: { title: ord.title } })
          show(r.notified ? 'Готов · уведомление отправлено в бот' : 'Готов · Telegram не привязан')
        } catch {
          show('Готов · уведомление не отправлено')
        }
      } else {
        show('Сохранено · тестовый заказ')
      }
      return true
    }
    const res = await saveOrder({ data: { orderId: ord.id, status: ord.status, adminNote: ord.admin_note ?? null } })
    if (!res.ok) {
      show('Ошибка сохранения')
      return false
    }
    show(
      res.transitionedToCompleted
        ? res.notified
          ? 'Готов · клиент оповещён в боте'
          : 'Готов · клиент без Telegram'
        : 'Сохранено',
    )
    return true
  }

  /** Persist the admin-composed delivery payload (which fields the buyer gets). */
  async function saveDelivery(ord: OrderRow, accounts: DeliveredAccount[]) {
    // Handing the credentials over IS the last stage. At the pre-hand-over step
    // saving the fields finishes the order in one move; if the order is already
    // handed over this is a silent correction — no stage change, no new ping.
    const spec = specOfRow(ord, localOrders[ord.id])
    const total = spec ? stepsForSpec(spec).length : PIPELINE.length
    const cur = spec
      ? currentStepOf({
          spec,
          step: (ord.meta?.['progress_step'] as number | undefined) ?? undefined,
          status: ord.status,
        })
      : Math.min(pipelineIndex(ord.status) + 1, total)
    const finalize = cur < total
    const status: OrderStatus = finalize ? 'completed' : ord.status
    const step = finalize ? total : cur

    // Mirror the saved credentials into the open drawer, otherwise the
    // "delivery filled" guard below still sees the pre-save state.
    const syncEdit = () =>
      setEdit((e) =>
        e && e.id === ord.id
          ? { ...e, status, meta: { ...(e.meta ?? {}), accounts, progress_step: step } }
          : e,
      )
    const syncRows = () =>
      setRows((prev) =>
        prev?.map((row) =>
          row.id === ord.id
            ? { ...row, status, meta: { ...(row.meta ?? {}), accounts, progress_step: step } }
            : row,
        ) ?? prev,
      )

    if (isLocalOrder(ord.id)) {
      updateTestOrder(ord.id, {
        accounts,
        progressStep: step,
        ...(finalize ? { status: 'completed' as const } : {}),
      })

      setLocalOrders((prev) => ({
        ...prev,
        [ord.id]: {
          ...(prev[ord.id] ?? localOrders[ord.id]),
          accounts,
          progressStep: step,
          ...(finalize ? { status: 'completed' as const } : {}),

        } as Order,
      }))
      syncRows()
      syncEdit()
      show(finalize ? 'Аккаунт выдан клиенту · тестовый заказ' : 'Данные обновлены · тихо')
      return true
    }
    const res = await saveOrder({
      data: {
        orderId: ord.id,
        status,
        adminNote: ord.admin_note ?? null,
        accounts,
        progressStep: step,
      },
    })
    if (!res.ok) {
      show('Ошибка сохранения')
      return false
    }
    syncEdit()
    syncRows()
    show(
      finalize
        ? res.notified
          ? 'Аккаунт выдан · клиент оповещён в боте'
          : 'Аккаунт выдан клиенту'
        : 'Данные обновлены — клиент не оповещён',
    )
    return true
  }


  /** Whether an order already has at least one non-empty delivered account. */
  function hasDeliveredData(ord: OrderRow) {
    const list: unknown[] = isLocalOrder(ord.id)
      ? ((ord.meta?.['accounts'] as unknown[] | undefined) ??
        (localOrders[ord.id]?.accounts as unknown[] | undefined) ??
        [])
      : ((ord.meta?.['accounts'] as unknown[] | undefined) ?? [])
    return list.some(
      (a) =>
        a &&
        typeof a === 'object' &&
        Object.entries(a as Record<string, unknown>).some(
          ([k, v]) => k !== FIELDS_ORDER_KEY && String(v ?? '').trim() !== '',
        ),
    )
  }



  // Buyer-facing fulfilment stage (1…N) of a custom build. Works for real DB
  // orders (stored in meta.progress_step) and for browser-local test orders.
  async function setStage(ord: OrderRow, step: number) {
    const spec = specOfRow(ord, localOrders[ord.id])
    const total = stepsForSpec(spec).length
    const n = Math.min(Math.max(step, 1), total)
    const current = currentStepOf({
      spec,
      step: (ord.meta?.['progress_step'] as number | undefined) ?? undefined,
      status: ord.status,
    })

    // A completed hand-over is final. Keep this guard in the mutation itself,
    // not only in disabled UI, so no stale button or direct call can roll it back.
    if (current >= total && n < total) {
      show('Заказ уже выдан — этапы закрыты навсегда')
      return
    }
    const status: OrderStatus = n >= total ? 'completed' : 'in_progress'

    // Last stage = handover. Without delivered credentials the buyer would open
    // an empty card, so refuse and point the admin at the delivery block.
    if (n >= total && !hasDeliveredData(ord)) {
      show('Сначала заполните «Выдачу данных клиенту» и сохраните заказ')
      return
    }


    // Keep the open drawer in sync — `cur` is derived from meta.progress_step,
    // so without this the arrows look dead until the drawer is reopened.
    const syncEdit = () =>
      setEdit((e) =>
        e && e.id === ord.id
          ? { ...e, status, meta: { ...(e.meta ?? {}), progress_step: n } }
          : e,
      )

    if (isLocalOrder(ord.id)) {
      updateTestOrder(ord.id, { progressStep: n, status })
      setLocalOrders((prev) => ({
        ...prev,
        [ord.id]: {
          ...(prev[ord.id] ?? localOrders[ord.id]),
          progressStep: n,
          status,
        } as Order,
      }))
      setRows((prev) =>
        prev?.map((row) =>
          row.id === ord.id
            ? { ...row, status, meta: { ...(row.meta ?? {}), progress_step: n } }
            : row,
        ) ?? prev,
      )
      syncEdit()
      show(`Этап ${n}/${total} · тестовый заказ`)
      return
    }

    const res = await saveOrder({
      data: {
        orderId: ord.id,
        status,
        adminNote: ord.admin_note ?? null,
        progressStep: n,
      },
    })
    if (!res.ok) {
      show('Ошибка сохранения этапа')
      return
    }
    show(
      res.transitionedToCompleted
        ? res.notified
          ? `Этап ${n}/${total} · клиент оповещён в боте`
          : `Этап ${n}/${total} · клиент без Telegram`
        : `Этап ${n}/${total} сохранён`,
    )
    syncEdit()
    setRows((prev) =>
      prev?.map((row) =>
        row.id === ord.id
          ? { ...row, status, meta: { ...(row.meta ?? {}), progress_step: n } }
          : row,
      ) ?? prev,
    )
  }



  // Advance / retreat the order along the pipeline without opening the full
  // edit drawer — one tap flips it to the next stage and saves immediately.
  async function advance(ord: OrderRow, target: OrderStatus) {
    if (ord.status === target) return
    const ok = await commit({ ...ord, status: target })
    if (ok) {
      setEdit((e) => (e && e.id === ord.id ? { ...e, status: target } : e))
      load()
    }
  }


  return (
    <div className="space-y-4">
      <SectionHeader
        title="Продажи"
        subtitle={rows ? `${rows.length} заказов · показано ${filtered.length}` : ''}
        action={<ExportButtons onCSV={() => exportRows('csv')} onTXT={() => exportRows('txt')} disabled={!filtered.length} />}
      />
      <div className="space-y-2">
        <SearchInput value={q} onChange={setQ} placeholder="Товар, ID, @username, telegram_id…" />
        <ChipRow>
          <Chip active={filter === 'all'} onClick={() => setFilter('all')} count={rows?.length}>
            Все
          </Chip>
          {ORDER_STATUSES.map((s) => (
            <Chip key={s} active={filter === s} onClick={() => setFilter(s)} count={counts[s]}>
              {orderLabel(s)}
            </Chip>
          ))}
          <Chip active={onlyCustom} onClick={() => setOnlyCustom((v) => !v)} count={customCount}>
            Под ключ
          </Chip>
        </ChipRow>
      </div>

      {!rows ? (
        <Skeleton />
      ) : filtered.length === 0 ? (
        <Empty text="Заказов не найдено" icon={Package} />
      ) : (
        <ul className="space-y-2">
          {filtered.map((o) => {
            const u = users[o.user_id]
            return (
              <li key={o.id}>
                <div className="flex items-stretch gap-1 rounded-2xl border border-border-strong bg-card p-3">
                  <button
                    onClick={() => setEdit(o)}
                    className="pressable flex min-w-0 flex-1 items-start justify-between gap-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-[14px] font-semibold">
                        {specOfRow(o, localOrders[o.id]) ? (
                          <Sparkles className="size-3.5 shrink-0 text-primary" />
                        ) : null}
                        <span className="min-w-0 truncate">{o.title}</span>
                        {o.status === 'pending' ? (
                          <span className="shrink-0 rounded-md bg-primary/15 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-primary">
                            new
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 truncate text-[11.5px] text-primary/90">
                        {isLocalOrder(o.id) ? 'Тестовый покупатель' : userDisplay(u)}
                      </p>
                      {(() => {
                        const spec = specOfRow(o, localOrders[o.id])
                        if (!spec) return null
                        const steps = stepsForSpec(spec)
                        const cur = currentStepOf({
                          spec,
                          step: (o.meta?.['progress_step'] as number | undefined) ?? undefined,
                          status: o.status,
                        })
                        return (
                          <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
                            Под ключ · {customSpecSummary(spec)} · этап {cur}/{steps.length}
                          </p>
                        )
                      })()}
                      <p className="mt-0.5 truncate font-mono text-[10.5px] text-muted-foreground">
                        #{o.id.slice(0, 8)} · qty {o.qty} · {fmtDate(o.created_at)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tnum text-[14px] font-bold text-primary">{money(o.amount_usd)}</p>
                      <div className="mt-1">
                        <StatusPill status={o.status} label={orderLabel(o.status)} />
                      </div>
                    </div>
                  </button>
                  {nextStage(o.status) ? (
                    <button
                      onClick={() => {
                        const n = nextStage(o.status)
                        if (n) advance(o, n)
                      }}
                      title={`→ ${orderLabel(nextStage(o.status)!)}`}
                      className="pressable flex w-9 shrink-0 flex-col items-center justify-center rounded-xl bg-gold-gradient text-primary-foreground"
                    >
                      <ChevronRight className="size-4" strokeWidth={3} />
                      <span className="mt-0.5 text-[8.5px] font-bold leading-none">
                        {orderLabel(nextStage(o.status)!).slice(0, 5)}
                      </span>
                    </button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Drawer
        open={!!edit}
        onClose={() => setEdit(null)}
        title="Заказ"
        subtitle={edit ? `#${edit.id.slice(0, 8)}` : ''}
      >
        {edit && (
          <div className="space-y-5 pb-2">
            {(() => {
              const spec = specOfRow(edit, localOrders[edit.id])
              const steps = spec
                ? stepsForSpec(spec)
                : ['Новый', 'В работе', 'Подготовка выдачи', 'Выдан']
              const total = steps.length
              const cur = spec
                ? currentStepOf({
                    spec,
                    step: (edit.meta?.['progress_step'] as number | undefined) ?? undefined,
                    status: edit.status,
                  })
                : Math.min(pipelineIndex(edit.status) + 1, total)
              const u = users[edit.user_id]
              // Credentials can only be composed once the order reaches the
              // hand-over stage — before that there is nothing to hand over.
              const deliveryUnlocked = cur >= total - 1
              const overrideId = isLocalOrder(edit.id) ? dbIdByLocal[edit.id] : edit.id
              // Handover done → the pipeline is frozen. Rolling back is an
              // explicit, deliberate action, not a stray tap on a step row.
              const flowLocked = cur >= total

              const goto = (n: number) =>
                spec ? void setStage(edit, n) : void advance(edit, PIPELINE[n - 1]!)
              const delivered = ((edit.meta?.['accounts'] as DeliveredAccount[] | undefined) ??
                (isLocalOrder(edit.id) ? localOrders[edit.id]?.accounts : undefined) ??
                []) as DeliveredAccount[]
              const deliveredCount = delivered.filter((a) =>
                Object.entries(a ?? {}).some(
                  ([k, v]) => k !== FIELDS_ORDER_KEY && String(v ?? '').trim() !== '',
                ),
              ).length

              return (
                <>
                  {/* ── Head: what was bought, for how much, by whom ───────── */}
                  <header className="relative overflow-hidden rounded-[22px] border border-border-strong bg-card px-4 pb-4 pt-4 shadow-[0_1px_0_0_hsl(0_0%_100%/0.03)_inset,0_24px_48px_-32px_hsl(0_0%_0%/0.9)]">
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -right-16 -top-20 size-40 rounded-full bg-primary/10 blur-3xl"
                    />
                    <p className="text-[9.5px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      {spec ? 'Аккаунт под ключ' : 'Заказ из каталога'}
                    </p>
                    <div className="mt-2.5 flex items-end justify-between gap-4">
                      <h3 className="min-w-0 font-display text-[19px] font-semibold leading-[1.15] tracking-[-0.01em]">
                        {edit.title}
                      </h3>
                      <p className="tnum shrink-0 font-display text-[22px] font-semibold leading-none tracking-[-0.02em] text-primary">
                        {money(edit.amount_usd)}
                      </p>
                    </div>
                    <div className="mt-3.5 flex items-center gap-2.5 border-t border-border/60 pt-3">
                      <StatusPill status={edit.status} label={orderLabel(edit.status)} />
                      <span className="text-[11px] text-muted-foreground">
                        {fmtDate(edit.created_at)}
                      </span>
                      <span className="text-border">·</span>
                      <span className="text-[11px] text-muted-foreground">{edit.qty} шт.</span>
                    </div>
                  </header>

                  {overrideId ? (
                    <OrderAdminOverride
                      key={overrideId}
                      orderId={overrideId}
                      status={edit.status}
                      onStatusChange={(next: string) => {
                        setEdit((prev) =>
                          prev && prev.id === edit.id
                            ? { ...prev, status: next as OrderStatus }
                            : prev,
                        )
                        setRows((prev) =>
                          prev
                            ? prev.map((r) =>
                                r.id === edit.id ? { ...r, status: next as OrderStatus } : r,
                              )
                            : prev,
                        )
                      }}
                    />
                  ) : (
                    <p className="rounded-[18px] border border-border bg-secondary/20 px-4 py-3 text-[11.5px] leading-relaxed text-muted-foreground">
                      Admin override недоступен: заказ существует только локально в этом браузере
                      и не сохранён в базе.
                    </p>
                  )}

                  {/* ── Flow control. At hand-over it disappears entirely:
                      from there the only action left is issuing the account. ── */}
                  {!deliveryUnlocked && (
                  <section>

                    <div className="mb-2 flex items-baseline justify-between px-1">
                      <p className="text-[9.5px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        Ход выполнения
                      </p>
                      <p className="tnum text-[10.5px] font-medium text-muted-foreground">
                        {cur} / {total}
                      </p>
                    </div>
                    <div className="overflow-hidden rounded-[22px] border border-border-strong bg-card">
                      <ol className="divide-y divide-border/50">
                        {steps.map((label, i) => {
                          const n = i + 1
                          const done = n < cur
                          const active = n === cur
                          return (
                            <li key={label}>
                              <button
                                onClick={() => goto(n)}
                                disabled={flowLocked}
                                className="group flex w-full items-center gap-3.5 px-4 py-3 text-left transition-colors duration-300 hover:bg-secondary/25 active:bg-secondary/40 disabled:pointer-events-none"
                              >
                                <span
                                  className={[
                                    'flex size-6 shrink-0 items-center justify-center rounded-full text-[10.5px] font-semibold transition-all duration-300',
                                    active
                                      ? 'bg-gold-gradient text-primary-foreground shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]'
                                      : done
                                        ? 'bg-primary/12 text-primary'
                                        : 'border border-border text-muted-foreground/70 group-hover:border-border-strong',
                                  ].join(' ')}
                                >
                                  {done ? <Check className="size-3" strokeWidth={3} /> : n}
                                </span>
                                <span
                                  className={[
                                    'min-w-0 flex-1 truncate text-[13.5px] transition-colors duration-300',
                                    active
                                      ? 'font-semibold text-foreground'
                                      : done
                                        ? 'text-muted-foreground'
                                        : 'text-muted-foreground/60',
                                  ].join(' ')}
                                >
                                  {label}
                                </span>
                                {active && (
                                  <span className="shrink-0 text-[9.5px] font-semibold uppercase tracking-[0.18em] text-primary">
                                    {flowLocked ? 'выдан' : 'сейчас'}
                                  </span>
                                )}
                              </button>
                            </li>
                          )
                        })}
                      </ol>
                      {flowLocked ? (
                        <div className="flex items-center gap-3 border-t border-border/60 px-3 py-2.5">
                          <Lock className="size-3.5 shrink-0 text-muted-foreground/70" />
                          <p className="min-w-0 flex-1 text-[11px] leading-snug text-muted-foreground">
                            Заказ выдан — этапы закрыты навсегда.
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 border-t border-border/60 px-3 py-2.5">
                          <button
                            onClick={() => goto(cur - 1)}
                            disabled={cur <= 1}
                            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border text-[12px] font-semibold text-muted-foreground transition-all duration-200 hover:border-border-strong hover:text-foreground active:scale-[0.98] disabled:pointer-events-none disabled:opacity-30"
                          >
                            <ChevronLeft className="size-3.5" strokeWidth={2.5} /> Назад
                          </button>
                          <button
                            onClick={() => goto(cur + 1)}
                            className="flex h-9 flex-[1.4] items-center justify-center gap-1.5 rounded-xl bg-gold-gradient text-[12px] font-bold text-primary-foreground transition-transform duration-200 active:scale-[0.98]"
                          >
                            {`Далее · ${steps[cur] ?? ''}`}
                            <ChevronRight className="size-3.5" strokeWidth={2.5} />
                          </button>
                        </div>
                      )}

                    </div>
                  </section>
                  )}


                  {/* ── Brief: read once, then work ────────────────────────── */}
                  {spec && (
                    <Disclosure label="Бриф покупателя" hint={customSpecSummary(spec)}>
                      <SpecMedia spec={spec} />
                      <div className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border bg-background/30">

                        {customSpecRows(spec).map((r) => (
                          <ListRow
                            key={r.label}
                            label={r.label}
                            value={r.value}
                            {...(r.href ? { href: r.href } : {})}
                            {...(r.download ? { download: r.download } : {})}
                            {...(r.copy ? { copyable: true } : {})}
                            {...(r.accent ? { accent: true } : {})}
                          />
                        ))}
                      </div>
                      <p className="mt-2 px-1 text-[10.5px] leading-relaxed text-muted-foreground">
                        Иконка ⤓ — скачать аватар/баннер, иконка ⧉ — скопировать имя, юзернейм, био
                        или ссылку на файл.
                      </p>
                    </Disclosure>
                  )}


                  {/* ── Delivery: unlocked only at hand-over ───────────────── */}
                  {deliveryUnlocked ? (
                    <>
                      <div className="rounded-[18px] border border-border-strong bg-card px-4 py-3">
                        <p className="text-[9.5px] font-semibold uppercase tracking-[0.22em] text-primary">
                          {flowLocked ? 'Аккаунт выдан' : 'Финальный шаг · выдача'}
                        </p>
                        <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
                          {flowLocked
                            ? 'Заказ закрыт. Правки полей ниже сохраняются тихо — покупатель видит их сразу, повторных уведомлений нет.'
                            : 'Заполните поля и нажмите «Выдать» — заказ сразу перейдёт в статус «Выдан», а клиент получит уведомление в боте.'}
                        </p>
                      </div>
                      {flowLocked && deliveredCount === 0 ? (
                        <div className="rounded-[18px] border border-destructive/35 bg-destructive/5 px-4 py-3">
                          <p className="text-[12px] font-semibold text-foreground">Данные аккаунта не сохранены</p>
                          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                            Этот заказ завершён без сохранённых полей. Добавьте данные ниже.
                          </p>
                        </div>
                      ) : null}
                      <OrderDeliveryEditor
                        key={edit.id}
                        qty={edit.qty}
                        accounts={delivered}
                        onSave={(accounts) => saveDelivery(edit, accounts)}
                      />
                    </>
                  ) : (

                    <section className="rounded-[22px] border border-dashed border-border bg-card/40 px-4 py-5 text-center">
                      <Lock className="mx-auto size-4 text-muted-foreground/70" />
                      <p className="mt-2.5 text-[12.5px] font-semibold">Выдача данных закрыта</p>
                      <p className="mx-auto mt-1 max-w-[16rem] text-[11.5px] leading-relaxed text-muted-foreground">
                        Поля для аккаунтов откроются на этапе «{steps[total - 2]}» — когда заказ
                        будет готов к передаче покупателю.
                      </p>
                      <button
                        onClick={() => goto(total - 1)}
                        className="mt-3 text-[11.5px] font-semibold text-primary underline decoration-primary/30 decoration-1 underline-offset-4 transition-colors duration-200 hover:decoration-primary"
                      >
                        Перейти к этапу выдачи
                      </button>
                    </section>
                  )}

                  {deliveredCount > 0 && (
                    <p className="px-1 text-[11px] text-muted-foreground">
                      Покупателю выдано аккаунтов: {deliveredCount}
                    </p>
                  )}

                  {/* ── Cold data ──────────────────────────────────────────── */}
                  <ListGroup caption="Реквизиты">
                    <ListRow
                      label="Покупатель"
                      value={isLocalOrder(edit.id) ? 'Тестовый покупатель' : userDisplay(u)}
                    />
                    {u?.telegram_username ? (
                      <ListRow label="Telegram" value={'@' + u.telegram_username} copyable />
                    ) : null}
                    <ListRow label="User ID" value={edit.user_id} mono copyable />
                    <ListRow label="Order ID" value={edit.id} mono copyable />
                  </ListGroup>

                  {/* ── Destructive, kept quiet ────────────────────────────── */}
                  <div className="flex items-center gap-4 px-1 pt-1">
                    <button
                      onClick={() => advance(edit, 'declined')}
                      className="text-[11.5px] font-semibold text-muted-foreground underline decoration-border decoration-1 underline-offset-4 transition-colors duration-200 hover:text-destructive hover:decoration-destructive/50"
                    >
                      Отклонить заказ
                    </button>
                    <button
                      onClick={() => advance(edit, 'refunded')}
                      className="text-[11.5px] font-semibold text-muted-foreground underline decoration-border decoration-1 underline-offset-4 transition-colors duration-200 hover:text-foreground hover:decoration-foreground/40"
                    >
                      Вернуть деньги
                    </button>
                  </div>
                </>
              )
            })()}
          </div>
        )}

      </Drawer>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TOPUPS
// ═══════════════════════════════════════════════════════════════════════════

type TopupStatus = 'pending' | 'success' | 'declined' | 'expired'
const TOPUP_STATUSES: TopupStatus[] = ['pending', 'success', 'declined', 'expired']
const topupLabel = (s: TopupStatus) =>
  ({ pending: 'Ждёт', success: 'Успех', declined: 'Отклонён', expired: 'Истёк' })[s]

type TopupRow = {
  id: string
  user_id: string
  coin: string
  network: string | null
  amount_usd: number
  amount_coin: number | null
  address: string
  tx_hash: string | null
  status: TopupStatus
  created_at: string
}

export function TopupsSection() {
  const { show } = useToast()
  const [rows, setRows] = useState<TopupRow[] | null>(null)
  const [filter, setFilter] = useState<TopupStatus | 'all'>('all')
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState<TopupRow | null>(null)

  const load = useCallback(async () => {
    setRows(null)
    const { data, error } = await supabase
      .from('topups')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000)
    if (error) show('Ошибка: ' + error.message)
    setRows((data as TopupRow[]) ?? [])
  }, [show])
  useEffect(() => {
    load()
  }, [load])

  const userIds = useMemo(() => Array.from(new Set((rows ?? []).map((r) => r.user_id))), [rows])
  const { map: users } = useUserLookup(userIds)

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    ;(rows ?? []).forEach((r) => (c[r.status] = (c[r.status] ?? 0) + 1))
    return c
  }, [rows])

  const filtered = useMemo(() => {
    if (!rows) return []
    const needle = q.trim().toLowerCase().replace(/^@/, '')
    return rows.filter((r) => {
      if (filter !== 'all' && r.status !== filter) return false
      if (!needle) return true
      if (r.coin.toLowerCase().includes(needle)) return true
      if ((r.tx_hash ?? '').toLowerCase().includes(needle)) return true
      if (r.id.toLowerCase().startsWith(needle)) return true
      if (userSearchHaystack(users[r.user_id]).includes(needle)) return true
      return false
    })
  }, [rows, filter, q, users])

  function exportRows(kind: 'csv' | 'txt') {
    const data = filtered.map((r) => {
      const u = users[r.user_id]
      return {
        id: r.id,
        date: fmtDate(r.created_at),
        user: userDisplay(u),
        telegram: u?.telegram_username ? '@' + u.telegram_username : (u?.telegram_id ?? ''),
        user_id: r.user_id,
        coin: r.coin.toUpperCase(),
        network: (r.network ?? '').toUpperCase(),
        amount_usd: Number(r.amount_usd).toFixed(2),
        amount_coin: r.amount_coin ?? '',
        address: r.address,
        tx_hash: r.tx_hash ?? '',
        status: topupLabel(r.status),
      }
    })
    const cols = [
      { key: 'id' as const, label: 'ID' },
      { key: 'date' as const, label: 'Дата' },
      { key: 'user' as const, label: 'Покупатель' },
      { key: 'telegram' as const, label: 'Telegram' },
      { key: 'user_id' as const, label: 'User ID' },
      { key: 'coin' as const, label: 'Монета' },
      { key: 'network' as const, label: 'Сеть' },
      { key: 'amount_usd' as const, label: 'Сумма USD' },
      { key: 'amount_coin' as const, label: 'Сумма монеты' },
      { key: 'address' as const, label: 'Адрес' },
      { key: 'tx_hash' as const, label: 'TX Hash' },
      { key: 'status' as const, label: 'Статус' },
    ]
    const name = `topups_${new Date().toISOString().slice(0, 10)}`
    if (kind === 'csv') downloadCSV(name, data, cols)
    else downloadTXT(name, data, cols)
  }

  async function approve(t: TopupRow) {
    const { error } = await supabase.rpc('admin_adjust_balance', {
      _user_id: t.user_id,
      _mode: 'credit',
      _amount: Number(t.amount_usd),
      _reason: `topup ${t.id.slice(0, 8)} ${t.coin.toUpperCase()}`,
    })
    if (error) return show('Ошибка баланса: ' + error.message)
    const { error: e2 } = await supabase
      .from('topups')
      .update({ status: 'success', tx_hash: t.tx_hash })
      .eq('id', t.id)
    if (e2) return show('Ошибка: ' + e2.message)
    show(`Зачислено ${money(t.amount_usd)}`)
    setEdit(null)
    load()
  }

  async function decline(t: TopupRow) {
    const { error } = await supabase
      .from('topups')
      .update({ status: 'declined', tx_hash: t.tx_hash })
      .eq('id', t.id)
    if (error) return show('Ошибка: ' + error.message)
    show('Отклонено')
    setEdit(null)
    load()
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Пополнения"
        subtitle={
          rows
            ? `${rows.length} всего · ${counts.pending ?? 0} ждут · показано ${filtered.length}`
            : ''
        }
        action={<ExportButtons onCSV={() => exportRows('csv')} onTXT={() => exportRows('txt')} disabled={!filtered.length} />}
      />
      <div className="space-y-2">
        <SearchInput value={q} onChange={setQ} placeholder="Монета, tx, ID, @username, telegram_id…" />
        <ChipRow>
          <Chip active={filter === 'all'} onClick={() => setFilter('all')} count={rows?.length}>
            Все
          </Chip>
          {TOPUP_STATUSES.map((s) => (
            <Chip key={s} active={filter === s} onClick={() => setFilter(s)} count={counts[s]}>
              {topupLabel(s)}
            </Chip>
          ))}
        </ChipRow>
      </div>

      {!rows ? (
        <Skeleton />
      ) : filtered.length === 0 ? (
        <Empty text="Пополнений нет" icon={Wallet} />
      ) : (
        <ul className="space-y-2">
          {filtered.map((t) => {
            const u = users[t.user_id]
            return (
              <li key={t.id}>
                <button
                  onClick={() => setEdit(t)}
                  className="pressable flex w-full items-center gap-3 rounded-2xl border border-border-strong bg-card p-3 text-left"
                >
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary font-display text-[11px] font-bold text-primary">
                    {t.coin.slice(0, 4).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold">
                      {t.coin.toUpperCase()}
                      {t.network ? ` · ${t.network.toUpperCase()}` : ''}
                    </p>
                    <p className="mt-0.5 truncate text-[11.5px] text-primary/90">{userDisplay(u)}</p>
                    <p className="mt-0.5 truncate font-mono text-[10.5px] text-muted-foreground">
                      #{t.id.slice(0, 8)} · {fmtDate(t.created_at)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tnum text-[14px] font-bold text-primary">{money(t.amount_usd)}</p>
                    <div className="mt-1">
                      <StatusPill status={t.status} label={topupLabel(t.status)} />
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
        title="Пополнение"
        subtitle={edit ? `${edit.coin.toUpperCase()} · ${money(edit.amount_usd)}` : ''}
        footer={
          edit && edit.status === 'pending' ? (
            <div className="grid grid-cols-2 gap-2">
              <GhostButton onClick={() => decline(edit)} tone="destructive" icon={X}>
                Отклонить
              </GhostButton>
              <PrimaryButton onClick={() => approve(edit)} icon={Check}>
                Зачислить
              </PrimaryButton>
            </div>
          ) : null
        }
      >
        {edit && (
          <div className="space-y-3">
            <ReadRow label="ID" value={edit.id} mono copyable />
            <ReadRow label="Покупатель" value={userDisplay(users[edit.user_id])} />
            <ReadRow label="User ID" value={edit.user_id} mono copyable />
            {users[edit.user_id]?.telegram_username && (
              <ReadRow label="Telegram" value={'@' + users[edit.user_id]!.telegram_username!} copyable />
            )}
            <ReadRow
              label="Монета"
              value={`${edit.coin.toUpperCase()}${edit.network ? ' · ' + edit.network.toUpperCase() : ''}`}
            />
            <ReadRow label="Сумма USD" value={money(edit.amount_usd)} />
            {edit.amount_coin != null && (
              <ReadRow label="Сумма в монете" value={String(edit.amount_coin)} />
            )}
            <ReadRow label="Дата" value={fmtDate(edit.created_at)} />
            <ReadRow label="Адрес получения" value={edit.address} mono copyable />
            <Field label="TX Hash">
              <TextIn
                value={edit.tx_hash ?? ''}
                onChange={(v) => setEdit({ ...edit, tx_hash: v })}
                placeholder="0x…"
              />
            </Field>
            {edit.status !== 'pending' && (
              <ReadRow label="Статус" value={topupLabel(edit.status)} />
            )}

          </div>
        )}
      </Drawer>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTS — with live preview
// ═══════════════════════════════════════════════════════════════════════════

type ProductRow = {
  id: string
  category_id: string | null
  slug: string | null
  title_ru: string
  title_en: string
  title_zh: string
  description_ru: string | null
  description_en: string | null
  description_zh: string | null
  price_usd: number
  stock: number
  active: boolean
  sort_order: number
  image_url: string | null
  tags: string[]
}
type CategoryRow = {
  id: string
  slug: string
  title_ru: string
  title_en: string
  title_zh: string
  icon: string | null
  sort_order: number
  active: boolean
}

export function ProductsSection() {
  const { show } = useToast()
  const [rows, setRows] = useState<ProductRow[] | null>(null)
  const [cats, setCats] = useState<CategoryRow[]>([])
  const [q, setQ] = useState('')
  const [catFilter, setCatFilter] = useState<string>('all')
  const [edit, setEdit] = useState<Partial<ProductRow> | null>(null)

  const load = useCallback(async () => {
    setRows(null)
    const [p, c] = await Promise.all([
      supabase
        .from('products')
        .select('*')
        .order('sort_order')
        .order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('sort_order'),
    ])
    setRows((p.data as ProductRow[]) ?? [])
    setCats((c.data as CategoryRow[]) ?? [])
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    if (!rows) return []
    return rows.filter((p) => {
      if (catFilter !== 'all' && p.category_id !== catFilter) return false
      if (q) {
        const s = q.toLowerCase()
        return (
          (p.title_ru ?? '').toLowerCase().includes(s) ||
          (p.slug ?? '').toLowerCase().includes(s)
        )
      }
      return true
    })
  }, [rows, q, catFilter])

  async function save() {
    if (!edit) return
    if (!edit.title_ru || !edit.title_en || !edit.title_zh)
      return show('Заполни названия на всех языках')
    const payload = {
      slug: edit.slug || null,
      title_ru: edit.title_ru,
      title_en: edit.title_en,
      title_zh: edit.title_zh,
      description_ru: edit.description_ru ?? null,
      description_en: edit.description_en ?? null,
      description_zh: edit.description_zh ?? null,
      category_id: edit.category_id ?? null,
      price_usd: Number(edit.price_usd ?? 0),
      stock: Number(edit.stock ?? 0),
      active: edit.active ?? true,
      sort_order: Number(edit.sort_order ?? 0),
      image_url: edit.image_url ?? null,
      tags: edit.tags ?? [],
    }
    const q = edit.id
      ? supabase.from('products').update(payload as never).eq('id', edit.id)
      : supabase.from('products').insert(payload as never)
    const { error } = await q
    if (error) return show('Ошибка: ' + error.message)
    show('Сохранено')
    setEdit(null)
    load()
  }

  async function del(id: string) {
    if (!confirm('Удалить товар?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) return show('Ошибка: ' + error.message)
    show('Удалено')
    load()
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Товары"
        subtitle={rows ? `${rows.length} позиций` : ''}
        action={
          <button
            onClick={() =>
              setEdit({
                active: true,
                price_usd: 0,
                stock: 0,
                sort_order: 0,
                title_ru: '',
                title_en: '',
                title_zh: '',
                tags: [],
              })
            }
            className="pressable flex h-9 items-center gap-1 rounded-xl bg-gold-gradient px-3 text-[12px] font-bold text-primary-foreground"
          >
            <Plus className="size-4" strokeWidth={3} />
            Товар
          </button>
        }
      />
      <div className="space-y-2">
        <SearchInput value={q} onChange={setQ} placeholder="Название или slug…" />
        <ChipRow>
          <Chip active={catFilter === 'all'} onClick={() => setCatFilter('all')}>
            Все
          </Chip>
          {cats.map((c) => (
            <Chip
              key={c.id}
              active={catFilter === c.id}
              onClick={() => setCatFilter(c.id)}
            >
              {c.title_ru}
            </Chip>
          ))}
        </ChipRow>
      </div>

      {!rows ? (
        <Skeleton />
      ) : filtered.length === 0 ? (
        <Empty text="Товаров нет" icon={Boxes} />
      ) : (
        <ul className="space-y-2">
          {filtered.map((p) => (
            <li key={p.id} className="rounded-2xl border border-border-strong bg-card p-3">
              <div className="flex items-start gap-3">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt=""
                    className="size-14 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                    <Boxes className="size-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[14px] font-semibold">{p.title_ru}</p>
                    {!p.active && (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase">
                        off
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate font-mono text-[10.5px] text-muted-foreground">
                    {p.slug || '—'}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                    <span className="tnum font-bold text-primary">{money(p.price_usd)}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">stock {p.stock}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => setEdit(p)}
                    className="pressable flex size-8 items-center justify-center rounded-lg bg-secondary"
                  >
                    <Edit3 className="size-3.5" />
                  </button>
                  <button
                    onClick={() => del(p.id)}
                    className="pressable flex size-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Drawer
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? 'Редактирование' : 'Новый товар'}
        subtitle={edit?.title_ru || edit?.slug || ''}
        footer={<PrimaryButton onClick={save} icon={Check}>Сохранить</PrimaryButton>}
      >
        {edit && (
          <div className="space-y-4">
            {/* Live preview */}
            <div className="rounded-2xl border border-primary/30 bg-[linear-gradient(140deg,color-mix(in_oklab,var(--card)_82%,var(--primary)_18%),var(--secondary))] p-3">
              <p className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <Eye className="size-3" /> Превью
              </p>
              <div className="flex items-start gap-3 rounded-xl bg-background/50 p-3">
                {edit.image_url ? (
                  <img
                    src={edit.image_url}
                    alt=""
                    className="size-16 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                    <Boxes className="size-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[14px] font-semibold">
                    {edit.title_ru || 'Название'}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                    {edit.description_ru || 'Описание появится тут…'}
                  </p>
                  <p className="tnum mt-2 text-[15px] font-bold text-primary">
                    {money(Number(edit.price_usd ?? 0))}
                  </p>
                </div>
              </div>
            </div>

            <Field label="Slug (URL)">
              <TextIn
                value={edit.slug ?? ''}
                onChange={(v) => setEdit({ ...edit, slug: v })}
                placeholder="my-product"
              />
            </Field>
            <Field label="Категория">
              <SelectPill<string>
                value={edit.category_id ?? ''}
                options={[
                  { value: '', label: '— без —' },
                  ...cats.map((c) => ({ value: c.id, label: c.title_ru })),
                ]}
                onChange={(v) => setEdit({ ...edit, category_id: v || null })}
              />
            </Field>

            <div className="rounded-2xl border border-border p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Названия
              </p>
              <div className="space-y-2">
                <Field label="🇷🇺 Русский">
                  <TextIn
                    value={edit.title_ru ?? ''}
                    onChange={(v) => setEdit({ ...edit, title_ru: v })}
                  />
                </Field>
                <Field label="🇺🇸 English">
                  <TextIn
                    value={edit.title_en ?? ''}
                    onChange={(v) => setEdit({ ...edit, title_en: v })}
                  />
                </Field>
                <Field label="🇨🇳 中文">
                  <TextIn
                    value={edit.title_zh ?? ''}
                    onChange={(v) => setEdit({ ...edit, title_zh: v })}
                  />
                </Field>
              </div>
            </div>

            <div className="rounded-2xl border border-border p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Описания
              </p>
              <div className="space-y-2">
                <Field label="🇷🇺 Русский">
                  <TextArea
                    value={edit.description_ru ?? ''}
                    onChange={(v) => setEdit({ ...edit, description_ru: v })}
                    rows={3}
                  />
                </Field>
                <Field label="🇺🇸 English">
                  <TextArea
                    value={edit.description_en ?? ''}
                    onChange={(v) => setEdit({ ...edit, description_en: v })}
                    rows={3}
                  />
                </Field>
                <Field label="🇨🇳 中文">
                  <TextArea
                    value={edit.description_zh ?? ''}
                    onChange={(v) => setEdit({ ...edit, description_zh: v })}
                    rows={3}
                  />
                </Field>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Field label="Цена $">
                <NumIn
                  value={edit.price_usd ?? 0}
                  onChange={(v) => setEdit({ ...edit, price_usd: v })}
                />
              </Field>
              <Field label="Остаток">
                <NumIn
                  value={edit.stock ?? 0}
                  onChange={(v) => setEdit({ ...edit, stock: v })}
                />
              </Field>
              <Field label="Порядок">
                <NumIn
                  value={edit.sort_order ?? 0}
                  onChange={(v) => setEdit({ ...edit, sort_order: v })}
                />
              </Field>
            </div>
            <Field label="Картинка URL">
              <TextIn
                value={edit.image_url ?? ''}
                onChange={(v) => setEdit({ ...edit, image_url: v })}
                placeholder="https://…"
              />
            </Field>
            <Field label="Теги (через запятую)">
              <TextIn
                value={(edit.tags ?? []).join(', ')}
                onChange={(v) =>
                  setEdit({
                    ...edit,
                    tags: v
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </Field>
            <Toggle
              label="Активен"
              value={!!edit.active}
              onChange={(v) => setEdit({ ...edit, active: v })}
              hint="Отключённые товары не видны в каталоге"
            />
          </div>
        )}
      </Drawer>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════

export function CategoriesSection() {
  const { show } = useToast()
  const [rows, setRows] = useState<CategoryRow[] | null>(null)
  const [edit, setEdit] = useState<Partial<CategoryRow> | null>(null)

  const load = useCallback(async () => {
    setRows(null)
    const { data } = await supabase.from('categories').select('*').order('sort_order')
    setRows((data as CategoryRow[]) ?? [])
  }, [])
  useEffect(() => {
    load()
  }, [load])

  async function save() {
    if (!edit?.slug || !edit.title_ru || !edit.title_en || !edit.title_zh)
      return show('Заполни все языки и slug')
    const payload = {
      slug: edit.slug,
      title_ru: edit.title_ru,
      title_en: edit.title_en,
      title_zh: edit.title_zh,
      icon: edit.icon ?? null,
      sort_order: Number(edit.sort_order ?? 0),
      active: edit.active ?? true,
    }
    const q = edit.id
      ? supabase.from('categories').update(payload as never).eq('id', edit.id)
      : supabase.from('categories').insert(payload as never)
    const { error } = await q
    if (error) return show('Ошибка: ' + error.message)
    show('Сохранено')
    setEdit(null)
    load()
  }

  async function del(id: string) {
    if (!confirm('Удалить категорию?')) return
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) return show('Ошибка: ' + error.message)
    show('Удалено')
    load()
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Категории"
        subtitle={rows ? `${rows.length} категорий` : ''}
        action={
          <button
            onClick={() => setEdit({ active: true, sort_order: 0 })}
            className="pressable flex h-9 items-center gap-1 rounded-xl bg-gold-gradient px-3 text-[12px] font-bold text-primary-foreground"
          >
            <Plus className="size-4" strokeWidth={3} />
            Добавить
          </button>
        }
      />

      {!rows ? (
        <Skeleton />
      ) : rows.length === 0 ? (
        <Empty text="Категорий нет" icon={FolderTree} />
      ) : (
        <ul className="space-y-2">
          {rows.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 rounded-2xl border border-border-strong bg-card p-3"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
                <FolderTree className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold">{c.title_ru}</p>
                <p className="mt-0.5 truncate font-mono text-[10.5px] text-muted-foreground">
                  {c.slug} · sort {c.sort_order}
                </p>
              </div>
              {!c.active && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase">
                  off
                </span>
              )}
              <button
                onClick={() => setEdit(c)}
                className="pressable flex size-8 items-center justify-center rounded-lg bg-secondary"
              >
                <Edit3 className="size-3.5" />
              </button>
              <button
                onClick={() => del(c.id)}
                className="pressable flex size-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Drawer
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? 'Категория' : 'Новая категория'}
        footer={<PrimaryButton onClick={save} icon={Check}>Сохранить</PrimaryButton>}
      >
        {edit && (
          <div className="space-y-3">
            <Field label="Slug">
              <TextIn value={edit.slug ?? ''} onChange={(v) => setEdit({ ...edit, slug: v })} />
            </Field>
            <Field label="🇷🇺 Название">
              <TextIn
                value={edit.title_ru ?? ''}
                onChange={(v) => setEdit({ ...edit, title_ru: v })}
              />
            </Field>
            <Field label="🇺🇸 Title">
              <TextIn
                value={edit.title_en ?? ''}
                onChange={(v) => setEdit({ ...edit, title_en: v })}
              />
            </Field>
            <Field label="🇨🇳 名称">
              <TextIn
                value={edit.title_zh ?? ''}
                onChange={(v) => setEdit({ ...edit, title_zh: v })}
              />
            </Field>
            <Field label="Иконка (lucide)">
              <TextIn value={edit.icon ?? ''} onChange={(v) => setEdit({ ...edit, icon: v })} />
            </Field>
            <Field label="Порядок">
              <NumIn
                value={edit.sort_order ?? 0}
                onChange={(v) => setEdit({ ...edit, sort_order: v })}
              />
            </Field>
            <Toggle
              label="Активна"
              value={!!edit.active}
              onChange={(v) => setEdit({ ...edit, active: v })}
            />
          </div>
        )}
      </Drawer>
    </div>
  )
}

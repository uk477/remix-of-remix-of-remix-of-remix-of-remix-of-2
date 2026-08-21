'use client'

/**
 * ADMIN OVERRIDE — панель полного ручного управления ОДНИМ конкретным заказом.
 *
 * Ключевые правила:
 *  • все действия идут по точному orderId выбранного заказа и не затрагивают
 *    другие заказы (сервер работает строго по `orders.id`);
 *  • админ-рефилл пишется в `order_refills` с source='admin' и НЕ участвует
 *    в клиентских лимитах (4 шт / 12 ч / 48 ч) — они считают только
 *    source='customer';
 *  • право проверяется на сервере (has_role внутри SECURITY DEFINER функций),
 *    видимость кнопок здесь — только UX.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { Loader2, RefreshCw, ShieldAlert, Undo2, Zap } from 'lucide-react'
import {
  adminForceRefill,
  adminOrderRefills,
  adminRefundOrder,
  adminSetOrderStatus,
  getOrderRefundState,
  type AdminRefillOverview,
  type RefundState,
} from '@/lib/admin-orders.functions'
import { ADMIN_ORDER_STATUSES, type AdminOrderStatus } from '@/lib/admin-orders.shared'
import { formatCountdown } from '@/lib/use-refill'
import { useToast } from '../toast'
import { GhostButton, PrimaryButton } from './primitives'

const STATUS_LABEL: Record<AdminOrderStatus, string> = {
  pending: 'Ожидает',
  in_progress: 'В работе',
  waiting: 'Ожидание',
  completed: 'Завершён',
  declined: 'Отменён',
  failed: 'Ошибка',
  refilling: 'Рефилл',
  refunded: 'Возврат',
}

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'medium' }) : '—'

export function OrderAdminOverride({
  orderId,
  status,
  onStatusChange,
}: {
  orderId: string
  status: string
  /** Локальный заказ (тестовый) не имеет строки в БД — оверрайд недоступен. */
  onStatusChange?: (next: AdminOrderStatus) => void
}) {
  const { show } = useToast()
  const setStatusFn = useServerFn(adminSetOrderStatus)
  const forceRefillFn = useServerFn(adminForceRefill)
  const overviewFn = useServerFn(adminOrderRefills)
  const refundFn = useServerFn(adminRefundOrder)
  const refundStateFn = useServerFn(getOrderRefundState)

  const [target, setTarget] = useState<AdminOrderStatus>(
    (ADMIN_ORDER_STATUSES as readonly string[]).includes(status)
      ? (status as AdminOrderStatus)
      : 'pending',
  )
  const [saving, setSaving] = useState(false)
  const [refilling, setRefilling] = useState(false)
  const [data, setData] = useState<AdminRefillOverview | null>(null)
  const [refund, setRefund] = useState<RefundState | null>(null)
  const [refunding, setRefunding] = useState(false)
  const [askRefund, setAskRefund] = useState(false)
  const [tick, setTick] = useState(0)
  const skew = useRef(0)

  const load = useCallback(async () => {
    try {
      const res = await overviewFn({ data: { orderId } })
      skew.current = new Date(res.serverNow).getTime() - Date.now()
      setData(res)
    } catch {
      setData(null)
    }
    try {
      setRefund(await refundStateFn({ data: { orderId } }))
    } catch {
      setRefund(null)
    }
  }, [overviewFn, refundStateFn, orderId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [])
  void tick

  useEffect(() => {
    setTarget(
      (ADMIN_ORDER_STATUSES as readonly string[]).includes(status)
        ? (status as AdminOrderStatus)
        : 'pending',
    )
  }, [status])

  const apply = async () => {
    if (saving) return
    setSaving(true)
    try {
      const updated = await setStatusFn({ data: { orderId, status: target } })
      onStatusChange?.(updated.status)
      show(`Статус → ${STATUS_LABEL[target]}`)
      await load()
    } catch (e) {
      show('Ошибка: ' + (e instanceof Error ? e.message : 'не удалось'))
    } finally {
      setSaving(false)
    }
  }

  const force = async () => {
    if (refilling) return
    setRefilling(true)
    try {
      const res = await forceRefillFn({ data: { orderId } })
      show(`Рефилл #${res.refillNumber} запущен (admin)`)
      await load()
    } catch (e) {
      show('Ошибка: ' + (e instanceof Error ? e.message : 'не удалось'))
    } finally {
      setRefilling(false)
    }
  }

  const doRefund = async () => {
    if (refunding) return
    setRefunding(true)
    setAskRefund(false)
    try {
      const res = await refundFn({ data: { orderId } })
      show(
        res.alreadyRefunded
          ? 'Возврат по этому заказу уже был выполнен'
          : `Возврат оформлен: $${Number(res.amount).toFixed(2)}`,
      )
      onStatusChange?.('refunded')
      setTarget('refunded')
      await load()
    } catch (e) {
      show('Ошибка возврата: ' + (e instanceof Error ? e.message : 'не удалось'))
    } finally {
      setRefunding(false)
    }
  }

  const nextAt = data?.customerNextRefillAt ? new Date(data.customerNextRefillAt).getTime() : null
  const left = nextAt ? Math.max(0, nextAt - (Date.now() + skew.current)) : 0

  return (
    <section className="overflow-hidden rounded-[22px] border border-destructive/35 bg-card">
      <header className="flex items-center gap-2 border-b border-destructive/25 bg-destructive/10 px-4 py-2.5">
        <ShieldAlert className="size-4 text-destructive" />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-destructive">
          Admin override
        </p>
        <button
          onClick={() => void load()}
          className="pressable ml-auto flex size-7 items-center justify-center rounded-full border border-border bg-card"
          aria-label="Обновить"
        >
          <RefreshCw className="size-3.5" />
        </button>
      </header>

      <div className="space-y-4 p-4">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Действия применяются только к заказу{' '}
          <span className="tnum font-semibold text-foreground">#{orderId.slice(0, 8)}</span> и
          игнорируют клиентские ограничения (12 ч, 4 рефилла, 48 ч гарантии, текущий статус).
        </p>

        {/* Статус */}
        <div>
          <p className="mb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Статус заказа
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ADMIN_ORDER_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setTarget(s)}
                className={[
                  'pressable rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition-colors',
                  target === s
                    ? 'border-primary/60 bg-primary/15 text-primary'
                    : 'border-border bg-secondary/30 text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <div className="mt-3">
            <PrimaryButton onClick={apply} disabled={saving}>
              {saving ? 'Сохраняем…' : 'Обновить статус'}
            </PrimaryButton>
          </div>
        </div>

        {/* Force refill */}
        <div className="rounded-[18px] border border-border-strong bg-secondary/20 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold">Принудительный рефилл</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Без кулдауна и лимитов. Не расходует клиентские рефиллы.
              </p>
            </div>
            <button
              onClick={force}
              disabled={refilling}
              className="pressable flex shrink-0 items-center gap-1.5 rounded-xl bg-gold-gradient px-3.5 py-2.5 text-[12px] font-bold text-primary-foreground disabled:opacity-70"
            >
              {refilling ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Zap className="size-3.5" strokeWidth={2.6} />
              )}
              Force refill
            </button>
          </div>
        </div>

        {/* Возврат средств */}
        <div className="rounded-[18px] border border-info/30 bg-info/[0.06] p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold">Возврат средств</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {refund?.refunded
                  ? `Уже возвращено ($${Number(refund.amount ?? 0).toFixed(2)}, источник: ${
                      refund.refundSource === 'admin' ? 'админ' : 'авто при ошибке'
                    })`
                  : 'Вернёт сумму заказа на баланс и переведёт заказ в статус «Возврат средств».'}
              </p>
            </div>
            <button
              onClick={() => setAskRefund(true)}
              disabled={refunding || !!refund?.refunded}
              className="pressable flex shrink-0 items-center gap-1.5 rounded-xl bg-info px-3.5 py-2.5 text-[12px] font-bold text-background disabled:opacity-50"
            >
              {refunding ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Undo2 className="size-3.5" strokeWidth={2.6} />
              )}
              Оформить возврат
            </button>
          </div>

          {askRefund ? (
            <div className="mt-3 flex items-center gap-2">
              <PrimaryButton onClick={doRefund} disabled={refunding}>
                Подтвердить возврат
              </PrimaryButton>
              <GhostButton onClick={() => setAskRefund(false)}>Отмена</GhostButton>
            </div>
          ) : null}
        </div>

        {/* Клиентские счётчики */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-[16px] border border-border bg-card px-3 py-2.5">
            <p className="text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground">
              Рефиллов клиента
            </p>
            <p className="tnum mt-1 text-[15px] font-bold">
              {data ? `${data.customerUsed} / ${data.customerMax}` : '—'}
            </p>
          </div>
          <div className="rounded-[16px] border border-border bg-card px-3 py-2.5">
            <p className="text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground">
              Кулдаун клиента
            </p>
            <p className="tnum mt-1 text-[15px] font-bold">
              {left > 0 ? formatCountdown(left) : 'нет'}
            </p>
          </div>
        </div>

        {/* История рефиллов */}
        <div>
          <p className="mb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            История рефиллов
          </p>
          {!data ? (
            <p className="text-[11.5px] text-muted-foreground">Загрузка…</p>
          ) : data.history.length === 0 ? (
            <p className="text-[11.5px] text-muted-foreground">Рефиллов не было.</p>
          ) : (
            <ul className="divide-y divide-border/50 overflow-hidden rounded-[16px] border border-border">
              {data.history.map((r) => (
                <li key={r.refillId} className="flex items-center gap-3 px-3 py-2.5">
                  <span
                    className={[
                      'shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em]',
                      r.source === 'admin'
                        ? 'bg-destructive/15 text-destructive'
                        : 'bg-primary/12 text-primary',
                    ].join(' ')}
                  >
                    {r.source === 'admin' ? 'admin' : 'клиент'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold">
                      #{r.refillNumber ?? '—'} · {r.status}
                      {r.prevStatus ? ` · было: ${r.prevStatus}` : ''}
                    </p>
                    <p className="tnum truncate text-[10.5px] text-muted-foreground">
                      {fmt(r.requestedAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <GhostButton onClick={() => void load()}>Обновить данные</GhostButton>
      </div>
    </section>
  )
}

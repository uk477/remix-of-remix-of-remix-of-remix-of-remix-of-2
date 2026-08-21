import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import {
  parseAdminOrderId,
  parseAdminOrderStatus,
  type AdminOrderStatus,
} from './admin-orders.shared'

/**
 * Админ-оверрайд для одного КОНКРЕТНОГО заказа.
 * Роль проверяется на сервере (внутри SECURITY DEFINER функций через has_role),
 * поэтому обычный клиент не может вызвать это ни из консоли, ни напрямую по URL.
 */

export type AdminRefillRecord = {
  refillId: string
  orderId: string
  userId: string
  adminId: string | null
  source: 'customer' | 'admin'
  status: string
  prevStatus: string | null
  refillNumber: number | null
  providerOrderId: string | null
  requestedAt: string
  completedAt: string | null
}

export type AdminRefillOverview = {
  history: AdminRefillRecord[]
  customerUsed: number
  customerMax: number
  customerLastRefillAt: string | null
  customerNextRefillAt: string | null
  serverNow: string
}

export const adminSetOrderStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string; status: AdminOrderStatus }) => ({
    orderId: parseAdminOrderId(input?.orderId),
    status: parseAdminOrderStatus(input?.status),
  }))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc('admin_set_order_status', {
      _order_id: data.orderId,
      _status: data.status,
    })
    if (error) throw new Error(error.message)
    return row as unknown as { id: string; status: AdminOrderStatus }
  })

export const adminForceRefill = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string; note?: string }) => ({
    orderId: parseAdminOrderId(input?.orderId),
    note: input?.note ? String(input.note).slice(0, 300) : undefined,
  }))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc('admin_force_refill', {
      _order_id: data.orderId,
      _note: data.note ?? undefined,
    })
    if (error) throw new Error(error.message)
    return res as unknown as { refillId: string; refillNumber: number }
  })

export const adminOrderRefills = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string }) => ({ orderId: parseAdminOrderId(input?.orderId) }))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc('admin_order_refills', {
      _order_id: data.orderId,
    })
    if (error) throw new Error(error.message)
    return res as unknown as AdminRefillOverview
  })

/* ── Возврат средств ─────────────────────────────────────────────────────
 * Ручной (админ) и автоматический (ошибка выполнения) возврат идут через
 * одну и ту же серверную функцию `refund_order`, которая проверяет заказ,
 * оплату, владельца и идемпотентность (одна запись возврата на orderId).
 */

export type RefundResult = {
  refundId: string
  orderId: string
  userId: string
  amount: number
  refundSource: 'admin' | 'automatic_error'
  status: 'processing' | 'completed' | 'failed'
  alreadyRefunded: boolean
  orderStatus: string
  serverNow: string
}

export type RefundState = {
  orderId: string
  orderStatus: string
  refunded: boolean
  refundId: string | null
  refundSource: 'admin' | 'automatic_error' | null
  refundStatus: 'processing' | 'completed' | 'failed' | null
  amount: number | null
  completedAt: string | null
  serverNow: string
}

export const adminRefundOrder = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string; reason?: string }) => ({
    orderId: parseAdminOrderId(input?.orderId),
    reason: input?.reason ? String(input.reason).slice(0, 300) : undefined,
  }))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc('admin_refund_order', {
      _order_id: data.orderId,
      _reason: data.reason ?? undefined,
    })
    if (error) throw new Error(error.message)
    return res as unknown as RefundResult
  })

export const getOrderRefundState = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string }) => ({ orderId: parseAdminOrderId(input?.orderId) }))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc('order_refund_state', {
      _order_id: data.orderId,
    })
    if (error) throw new Error(error.message)
    return res as unknown as RefundState
  })

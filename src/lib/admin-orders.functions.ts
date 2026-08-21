import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

/**
 * Админ-оверрайд для одного КОНКРЕТНОГО заказа.
 * Роль проверяется на сервере (внутри SECURITY DEFINER функций через has_role),
 * поэтому обычный клиент не может вызвать это ни из консоли, ни напрямую по URL.
 */

export const ADMIN_ORDER_STATUSES = [
  'pending',
  'in_progress',
  'waiting',
  'completed',
  'declined',
  'failed',
  'refilling',
  'refunded',
] as const

export type AdminOrderStatus = (typeof ADMIN_ORDER_STATUSES)[number]

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

const uuid = (v: unknown) => {
  const s = String(v ?? '')
  if (!/^[0-9a-f-]{36}$/i.test(s)) throw new Error('orderId must be a real order id')
  return s
}

export const adminSetOrderStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string; status: AdminOrderStatus }) => {
    if (!ADMIN_ORDER_STATUSES.includes(input?.status)) throw new Error('Unknown status')
    return { orderId: uuid(input?.orderId), status: input.status }
  })
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
    orderId: uuid(input?.orderId),
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
  .inputValidator((input: { orderId: string }) => ({ orderId: uuid(input?.orderId) }))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc('admin_order_refills', {
      _order_id: data.orderId,
    })
    if (error) throw new Error(error.message)
    return res as unknown as AdminRefillOverview
  })

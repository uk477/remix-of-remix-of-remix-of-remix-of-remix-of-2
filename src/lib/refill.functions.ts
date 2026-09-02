import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

/** Серверное состояние рефилл-гарантии — всегда для одного конкретного заказа. */
export type RefillServerState = {
  orderId: string
  /** Реальный UUID заказа в базе (нужен админ-панели); null для локальных заказов. */
  dbOrderId: string | null
  orderStatus: string | null
  paid: boolean
  refillable: boolean
  eligible: boolean
  guaranteeStartedAt: string | null
  guaranteeEndsAt: string | null
  usedRefills: number
  maxRefills: number
  lastRefillAt: string | null
  nextRefillAt: string | null
  canRequest: boolean
  canRequestRefill: boolean
  serverNow: string
}

const PROVIDER_REFILL_UNAVAILABLE =
  'Автоматический рефилл временно недоступен: поставщик не предоставляет API для отправки заявки'

export const getRefillState = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string }) => {
    if (!input?.orderId) throw new Error('orderId required')
    return { orderId: String(input.orderId) }
  })
  .handler(async ({ data, context }) => {
    const { data: state, error } = await context.supabase.rpc('refill_state', {
      _order_key: data.orderId,
    })
    if (error) throw new Error(error.message)
    return state as unknown as RefillServerState
  })

export const requestRefill = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string; idempotencyKey: string }) => {
    if (!input?.orderId) throw new Error('orderId required')
    if (!input?.idempotencyKey) throw new Error('idempotencyKey required')
    return {
      orderId: String(input.orderId),
      idempotencyKey: String(input.idempotencyKey).slice(0, 120),
    }
  })
  .handler(async ({ data, context }) => {
    const { data: order, error: orderError } = await context.supabase
      .from('orders')
      .select('id, status, meta')
      .or(`id.eq.${data.orderId},meta->>local_id.eq.${data.orderId}`)
      .maybeSingle()
    if (orderError) throw new Error(orderError.message)
    if (!order) throw new Error('Order not found')
    if (order.status === 'refunded') throw new Error('Refunded orders cannot be refilled')

    const { data: refund, error: refundError } = await context.supabase
      .from('order_refunds')
      .select('id')
      .eq('order_id', order.id)
      .maybeSingle()
    if (refundError) throw new Error(refundError.message)
    if (refund) throw new Error('Refunded orders cannot be refilled')

    // The documented supplier API has purchase and order reads, but no refill
    // command. Do not create a local request until external work is accepted;
    // doing so would leave the order in `refilling` forever.
    throw new Error(PROVIDER_REFILL_UNAVAILABLE)
  })

/**
 * Пометить рефилл выполненным. Триггер в базе автоматически возвращает
 * заказ в статус «завершён» (исходный completed_at не перезаписывается).
 */
export const completeRefill = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string; refillId?: string }) => {
    if (!input?.orderId) throw new Error('orderId required')
    return {
      orderId: String(input.orderId),
      refillId: input.refillId ? String(input.refillId) : undefined,
    }
  })
  .handler(async ({ data, context }) => {
    const { data: state, error } = await context.supabase.rpc('complete_refill', {
      _order_key: data.orderId,
      _refill_id: data.refillId,
    })
    if (error) throw new Error(error.message)
    return state as unknown as RefillServerState
  })

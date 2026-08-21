import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

/** Серверное состояние рефилл-гарантии — всегда для одного конкретного заказа. */
export type RefillServerState = {
  orderId: string
  /** Реальный UUID заказа в базе (нужен админ-панели); null для локальных заказов. */
  dbOrderId: string | null
  eligible: boolean
  guaranteeStartedAt: string | null
  guaranteeEndsAt: string | null
  usedRefills: number
  maxRefills: number
  lastRefillAt: string | null
  nextRefillAt: string | null
  canRequest: boolean
  serverNow: string
}

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
    const { data: state, error } = await context.supabase.rpc('request_refill', {
      _order_key: data.orderId,
      _client_token: data.idempotencyKey,
    })
    if (error) throw new Error(error.message)
    return state as unknown as RefillServerState
  })

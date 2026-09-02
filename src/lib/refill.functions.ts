import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { fhGetOrder, fhNewOrder, followHubStatus } from './followhub.server'

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
  refillId?: string
  refillStatus?: string
}

const PROVIDER_REFILL_UNAVAILABLE =
  'Автоматический рефилл временно недоступен: поставщик не предоставляет API для отправки заявки'
const REFILL_PROVIDER_ERROR = 'Не удалось отправить рефилл поставщику. Заказ возвращён в прежний статус.'

function isProviderFailure(status: string) {
  return ['failed', 'error', 'cancelled', 'canceled', 'declined', 'rejected'].includes(
    status.toLowerCase(),
  )
}

type RefillRpcContext = {
  supabase: {
    rpc: (
      fn: 'refill_state',
      args: { _order_key: string },
    ) => PromiseLike<{ data: unknown; error: { message: string } | null }>
  }
}

async function readRefillState(
  context: RefillRpcContext,
  orderId: string,
): Promise<RefillServerState> {
  const { data: state, error } = await context.supabase.rpc('refill_state', {
    _order_key: orderId,
  })
  if (error) throw new Error(error.message)
  return state as unknown as RefillServerState
}

export const getRefillState = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string }) => {
    if (!input?.orderId) throw new Error('orderId required')
    return { orderId: String(input.orderId) }
  })
  .handler(async ({ data, context }): Promise<RefillServerState> => readRefillState(context, data.orderId))

/**
 * Создаёт один компенсирующий заказ FollowHub за счёт сервиса.
 * База сначала резервирует идемпотентную заявку, а внешний вызов выполняется
 * только после claim — поэтому повторное нажатие не создаёт дубликат.
 */
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
  .handler(async ({ data, context }): Promise<RefillServerState> => {
    const current = await readRefillState(context, data.orderId)
    if (!current.dbOrderId) throw new Error('Order not found')
    if (current.orderStatus === 'refunded') throw new Error('Refunded orders cannot be refilled')
    if (!current.canRequest) throw new Error('Refill is not available yet')

    const { data: order, error: orderError } = await context.supabase
      .from('orders')
      .select('id, meta')
      .eq('id', current.dbOrderId)
      .maybeSingle()
    if (orderError) throw new Error(orderError.message)
    if (!order) throw new Error('Order not found')

    const meta = (order.meta ?? {}) as Record<string, unknown>
    if (meta['provider'] !== 'followhub') throw new Error(PROVIDER_REFILL_UNAVAILABLE)

    const providerServiceId = typeof meta['followhub_service_id'] === 'string' ? meta['followhub_service_id'] : ''
    const quantity = Math.floor(Number(meta['quantity_per_target']))
    const targets = Array.isArray(meta['targets'])
      ? meta['targets'].filter((value): value is string => typeof value === 'string' && value.trim() !== '')
      : typeof meta['target'] === 'string' && meta['target'].trim() !== ''
        ? [meta['target']]
        : []
    if (!providerServiceId || !Number.isFinite(quantity) || quantity < 1 || targets.length === 0) {
      throw new Error(PROVIDER_REFILL_UNAVAILABLE)
    }

    const { data: requested, error: requestError } = await context.supabase.rpc('request_refill', {
      _order_key: current.dbOrderId,
      _client_token: data.idempotencyKey,
    })
    if (requestError) throw new Error(requestError.message)

    const requestedState = requested as RefillServerState & {
      refillId?: string
      refillStatus?: string
    }
    if (!requestedState.refillId) throw new Error('Refill reservation failed')

    const { data: claim, error: claimError } = await context.supabase.rpc('refill_claim_provider', {
      _refill_id: requestedState.refillId,
    })
    if (claimError) throw new Error(claimError.message)

    const claimed = claim as { claimed?: boolean; status?: string; providerOrderId?: string | null }
    if (!claimed.claimed) return readRefillState(context, current.dbOrderId)

    try {
      const provider = await fhNewOrder({
        serviceId: providerServiceId,
        amount: quantity,
        targets,
        additionalId: `${current.dbOrderId}:refill:${requestedState.refillId}`,
        additionalRefillDays: 0,
      })
      const { error: attachError } = await context.supabase.rpc('refill_attach_provider', {
        _refill_id: requestedState.refillId,
        _provider_order_id: provider.orderId,
      })
      if (attachError) throw new Error(attachError.message)
      return readRefillState(context, current.dbOrderId)
    } catch (error) {
      console.error('[refill] FollowHub compensation order failed', error)
      await context.supabase.rpc('refill_fail', {
        _refill_id: requestedState.refillId,
        _error: error instanceof Error ? error.message.slice(0, 300) : 'provider_error',
      })
      throw new Error(REFILL_PROVIDER_ERROR)
    }
  })

/** Синхронизирует активный компенсационный заказ FollowHub с нашей базой. */
export const syncRefill = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string }) => {
    if (!input?.orderId) throw new Error('orderId required')
    return { orderId: String(input.orderId) }
  })
  .handler(async ({ data, context }): Promise<RefillServerState> => {
    const state = await readRefillState(context, data.orderId)
    if (!state.dbOrderId || state.orderStatus !== 'refilling') return state

    const { data: refill, error: refillError } = await context.supabase
      .from('order_refills')
      .select('id, provider_order_id, status')
      .eq('order_id', state.dbOrderId)
      .eq('source', 'customer')
      .in('status', ['starting', 'in_progress'])
      .order('requested_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (refillError) throw new Error(refillError.message)
    if (!refill?.provider_order_id) return state

    try {
      const provider = await fhGetOrder(refill.provider_order_id)
      const providerStatus = provider.targets.map((target) => target.status).find(isProviderFailure)
      if (providerStatus) {
        await context.supabase.rpc('refill_fail', {
          _refill_id: refill.id,
          _error: `FollowHub status: ${providerStatus}`,
        })
        return readRefillState(context, state.dbOrderId)
      }

      if (followHubStatus(provider.targets) === 'completed') {
        const { error: completeError } = await context.supabase.rpc('complete_refill', {
          _order_key: state.dbOrderId,
          _refill_id: refill.id,
        })
        if (completeError) throw new Error(completeError.message)
        return readRefillState(context, state.dbOrderId)
      }
    } catch (error) {
      console.error('[refill] FollowHub status sync failed', error)
    }

    return readRefillState(context, state.dbOrderId)
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

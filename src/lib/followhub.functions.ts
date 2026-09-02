import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { SERVICES } from './data'
import {
  chooseFollowHubService,
  fhGetOrder,
  fhGetServices,
  fhNewOrder,
  followHubStatus,
  type FollowHubOrder,
} from './followhub.server'

export type FollowHubOrderResult = {
  orderId: string
  localOrderId: string
  providerOrderId: string
  status: string
  amount: number
  balance: number
  createdAt: number
}

const categoryNames = new Set(['followers', 'likes', 'reposts', 'bookmarks', 'views'])

function parseTargets(input: unknown) {
  if (!Array.isArray(input)) throw new Error('targets must be an array')
  const targets = input.map((value) => String(value).trim()).filter(Boolean).slice(0, 100)
  if (targets.length === 0) throw new Error('At least one target is required')
  return targets
}

export const createFollowHubOrder = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    localOrderId: string
    serviceId: string
    category: string
    title: string
    quantity: number
    targets: string[]
    startFollowers?: number
  }) => {
    const localOrderId = String(input?.localOrderId ?? '').slice(0, 120)
    const serviceId = String(input?.serviceId ?? '').slice(0, 120)
    const category = String(input?.category ?? '').toLowerCase()
    const title = String(input?.title ?? '').slice(0, 300)
    const quantity = Math.floor(Number(input?.quantity))
    const targets = parseTargets(input?.targets)
    const startFollowers = Number(input?.startFollowers)
    if (!localOrderId || !serviceId || !title) throw new Error('Order fields are required')
    if (!categoryNames.has(category)) throw new Error('Unsupported FollowHub service category')
    if (!Number.isFinite(quantity) || quantity < 1) throw new Error('Invalid quantity')
    return {
      localOrderId,
      serviceId,
      category,
      title,
      quantity,
      targets,
      ...(Number.isFinite(startFollowers) && startFollowers >= 0 ? { startFollowers } : {}),
    }
  })
  .handler(async ({ data, context }): Promise<FollowHubOrderResult> => {
    const localService = SERVICES.find((service) => service.id === data.serviceId)
    if (!localService || localService.categoryId !== data.category) {
      throw new Error('Service is no longer available')
    }
    if (data.quantity < localService.min || data.quantity > localService.max) {
      throw new Error('Quantity is outside the service limits')
    }

    const amount = (localService.pricePer1000 * data.quantity * data.targets.length) / 1000
    const services = await fhGetServices()
    const providerService = chooseFollowHubService(services, data.category, localService.name.en)
    if (data.quantity < providerService.min || data.quantity > providerService.max) {
      throw new Error('This quantity is outside the provider limits')
    }

    const meta = {
      kind: 'boost',
      paid: true,
      refillable: providerService.refillPeriod > 0,
      local_id: data.localOrderId,
      service_id: data.serviceId,
      target: data.targets[0],
      targets: data.targets,
      provider: 'followhub',
      followhub_service_id: providerService.id,
      followhub_service_min: providerService.min,
      followhub_service_max: providerService.max,
      followhub_refill_period: providerService.refillPeriod,
      quantity_per_target: data.quantity,
      ...(data.startFollowers !== undefined ? { start_followers: data.startFollowers } : {}),
    }

    const { data: placed, error: placeError } = await context.supabase.rpc('place_order', {
      _title: data.title,
      _amount: amount,
      _qty: data.targets.length,
      _meta: meta,
    })
    if (placeError) throw new Error(placeError.message)

    const placedOrderId = String((placed as { order_id?: string } | null)?.order_id ?? '')
    const balance = Number((placed as { balance?: number } | null)?.balance)
    if (!placedOrderId || !Number.isFinite(balance)) throw new Error('Order reservation failed')

    try {
      const provider = await fhNewOrder({
        serviceId: providerService.id,
        amount: data.quantity,
        targets: data.targets,
        additionalId: placedOrderId,
        additionalRefillDays: 0,
      })
      const { error: attachError } = await context.supabase.rpc('provider_attach_order', {
        _order_id: placedOrderId,
        _provider: 'followhub',
        _provider_order_id: provider.orderId,
      })
      if (attachError) throw new Error(attachError.message)

      return {
        orderId: placedOrderId,
        localOrderId: data.localOrderId,
        providerOrderId: provider.orderId,
        status: 'in_progress',
        amount,
        balance,
        createdAt: provider.createdDate,
      }
    } catch (error) {
      console.error('[followhub] order creation failed; starting automatic refund', error)
      const { error: refundError } = await context.supabase.rpc('refund_order', {
        _order_id: placedOrderId,
        _source: 'automatic_error',
        _actor: undefined,
        _reason: 'FollowHub order was not accepted',
      })
      if (refundError) console.error('[followhub] automatic refund failed', refundError)
      throw new Error('FollowHub не принял заказ. Средства возвращены на баланс.')
    }
  })

export type FollowHubOrderStatusResult = {
  order: FollowHubOrder
  status: 'waiting' | 'in_progress' | 'completed'
}

export const followHubOrderStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { providerOrderId: string }) => {
    const providerOrderId = String(input?.providerOrderId ?? '').slice(0, 160)
    if (!providerOrderId) throw new Error('providerOrderId required')
    return { providerOrderId }
  })
  .handler(async ({ data }): Promise<FollowHubOrderStatusResult> => {
    const order = await fhGetOrder(data.providerOrderId)
    return { order, status: followHubStatus(order.targets) }
  })

/**
 * Тянет актуальное состояние заказа у FollowHub и переносит его в базу.
 * База остаётся единственным источником истины: RPC не трогает терминальные
 * статусы (возврат, отмена) и активный рефилл.
 */
export const syncFollowHubOrder = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string }) => {
    const orderId = String(input?.orderId ?? '').slice(0, 120)
    if (!orderId) throw new Error('orderId required')
    return { orderId }
  })
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc('refill_resolve_order', {
      _order_key: data.orderId,
      _user_id: context.userId,
    })
    if (error) throw new Error(error.message)
    const order = (Array.isArray(row) ? row[0] : row) as
      | { id: string; status: string; meta: Record<string, unknown> | null }
      | null
    if (!order?.id) throw new Error('Order not found')

    const meta = (order.meta ?? {}) as Record<string, unknown>
    if (meta['provider'] !== 'followhub') return { synced: false as const, status: order.status }
    const providerOrderId = typeof meta['provider_order_id'] === 'string' ? meta['provider_order_id'] : ''
    if (!providerOrderId) return { synced: false as const, status: order.status }

    let provider
    try {
      provider = await fhGetOrder(providerOrderId)
    } catch (fetchError) {
      console.error('[followhub] status sync failed', fetchError)
      return { synced: false as const, status: order.status }
    }

    const status = followHubStatus(provider.targets)
    const received = provider.targets.reduce((sum, target) => sum + (Number(target.received) || 0), 0)
    const startCount = Number(provider.targets[0]?.startCount)

    const { data: result, error: syncError } = await context.supabase.rpc('provider_sync_order', {
      _order_id: order.id,
      _status: status,
      _received: received,
      ...(Number.isFinite(startCount) ? { _start_count: startCount } : {}),
    })
    if (syncError) throw new Error(syncError.message)

    const next = result as { status?: string } | null
    return { synced: true as const, status: next?.status ?? status, received }
  })

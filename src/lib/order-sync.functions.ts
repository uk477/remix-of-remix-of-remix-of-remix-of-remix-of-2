import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import {
  normalizeOrderDetail,
  mergeOrderDetails,
  GUARANTEE_MS,
  type SupplierDelivery,
} from './order-sync.server'
import { spCall } from './socialplatforms.server'

export type OrderDeliveryResult = SupplierDelivery & {
  /** 'supplier' when the payload came from the API, 'local' when only our row exists. */
  source: 'supplier' | 'local'
  error?: string
}

/** `order.detail` is per-order; a batch is resolved through the `orders` list. */
async function fetchBatchDetails(batchId: string): Promise<unknown[]> {
  const list = await spCall<{
    orders?: Array<{ id?: string; batchId?: string }>
  }>('orders', { page: 1, limit: 100 })
  const ids = (list.orders ?? [])
    .filter((o) => o?.batchId === batchId && !!o.id)
    .map((o) => o.id as string)
    .slice(0, 100)
  if (ids.length === 0) return []
  return Promise.all(ids.map((id) => spCall<unknown>('order.detail', { orderId: id, order: id })))
}

/**
 * Live order state for the order details page: warranty deadline, status and
 * the delivered accounts, read from the supplier on every request so the page
 * never renders stale credentials. RLS scopes the lookup to the caller's own
 * orders, so an order ref cannot be probed by guessing ids.
 */
export const getOrderDelivery = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string }) => {
    if (!input?.orderId) throw new Error('orderId required')
    return { orderId: String(input.orderId).slice(0, 100) }
  })
  .handler(async ({ data, context }): Promise<OrderDeliveryResult> => {
    const { data: row, error } = await context.supabase
      .from('orders')
      .select('id, qty, amount_usd, status, meta, created_at')
      .eq('id', data.orderId)
      .maybeSingle()

    if (error) throw new Error('Order lookup failed')
    if (!row) throw new Error('Order not found')

    const meta = (row.meta ?? {}) as Record<string, unknown>
    const createdAt = new Date(row.created_at).getTime()
    const localFallback: OrderDeliveryResult = {
      source: 'local',
      status: row.status,
      qty: Number(row.qty ?? 1) || 1,
      amount: Number(row.amount_usd) || undefined,
      createdAt,
      guaranteeUntil:
        typeof meta['guarantee_until'] === 'number'
          ? (meta['guarantee_until'] as number)
          : createdAt + GUARANTEE_MS,
      accounts: Array.isArray(meta['accounts'])
        ? (meta['accounts'] as Record<string, string>[])
        : [],
    }

    const ref = (typeof meta['order_ref'] === 'string' ? meta['order_ref'] : '').replace(
      /^auto:/,
      '',
    )
    // Ids captured at purchase time (`product.purchase` → orders[].id) are the
    // cheapest path: one `order.detail` per delivered account, no list scan.
    const knownIds = Array.isArray(meta['order_ids'])
      ? (meta['order_ids'] as unknown[]).filter((v): v is string => typeof v === 'string')
      : []
    if (!ref && knownIds.length === 0) return localFallback

    try {
      let normalized: SupplierDelivery
      if (knownIds.length > 0) {
        normalized = mergeOrderDetails(
          await Promise.all(
            knownIds
              .slice(0, 100)
              .map((id) => spCall<unknown>('order.detail', { orderId: id, order: id })),
          ),
        )
      } else {
        normalized = normalizeOrderDetail(
          await spCall<unknown>('order.detail', { orderId: ref, order: ref }),
        )
        // Not a single order id → treat the ref as a purchase batch id.
        if (normalized.accounts.length === 0) {
          const details = await fetchBatchDetails(ref)
          if (details.length > 0) normalized = mergeOrderDetails(details)
        }
      }
      return {
        source: 'supplier',
        status: normalized.status ?? localFallback.status,
        qty: normalized.qty ?? localFallback.qty,
        amount: normalized.amount ?? localFallback.amount,
        createdAt: normalized.createdAt ?? createdAt,
        // Warranty always runs 48h from the purchase we recorded, unless the
        // supplier states an explicit deadline of its own.
        guaranteeUntil: normalized.guaranteeUntil ?? createdAt + GUARANTEE_MS,
        accounts: normalized.accounts.length > 0 ? normalized.accounts : localFallback.accounts,
      }
    } catch (e) {
      console.error('[order-sync] supplier order.detail failed', e)
      // A ref that is a batch id makes `order.detail` 404 — retry as a batch.
      if (ref) {
        try {
          const details = await fetchBatchDetails(ref)
          if (details.length > 0) {
            const merged = mergeOrderDetails(details)
            return {
              source: 'supplier',
              status: merged.status ?? localFallback.status,
              qty: merged.qty ?? localFallback.qty,
              amount: merged.amount ?? localFallback.amount,
              createdAt: merged.createdAt ?? createdAt,
              guaranteeUntil: merged.guaranteeUntil ?? createdAt + GUARANTEE_MS,
              accounts: merged.accounts.length > 0 ? merged.accounts : localFallback.accounts,
            }
          }
        } catch (e2) {
          console.error('[order-sync] supplier batch lookup failed', e2)
        }
      }
      return { ...localFallback, error: 'supplier_unavailable' }
    }
  })

/**
 * Low-level client for the socialplatforms.org reseller API.
 * Single endpoint, action-based, Bearer auth. Server-only.
 */
const ENDPOINT = 'https://socialplatforms.org/api/reseller/api-order'

export type SpAction =
  | 'balance'
  | 'profile'
  | 'categories'
  | 'products'
  | 'product.detail'
  | 'product.stock'
  | 'product.items'
  | 'product.purchase'
  | 'orders'
  | 'order.detail'

export type SpProduct = {
  id: string
  slug: string
  title: string
  price: number
  stock: number
  category: string
  categorySlug: string
  selectivePurchase: boolean
  hasDynamicPricing: boolean
}

export type SpStockItem = {
  id: string
  price: number
  attributes: Record<string, string | number | boolean | null>
}

export class SpApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'SpApiError'
  }
}

export async function spCall<T>(
  action: SpAction,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const key = process.env['SOCIALPLATFORMS_API_KEY']
  if (!key) throw new SpApiError(500, 'SOCIALPLATFORMS_API_KEY is not configured')

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ action, ...payload }),
  })

  const text = await res.text()
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    throw new SpApiError(res.status, `Non-JSON response [${res.status}]: ${text.slice(0, 200)}`)
  }

  const err = (json as { error?: string } | null)?.error
  if (!res.ok || err) {
    console.error(`[socialplatforms] ${action} failed [${res.status}]: ${text.slice(0, 400)}`)
    throw new SpApiError(res.status, err ?? `Request failed [${res.status}]`)
  }
  return json as T
}

/**
 * Read-only supplier responses are cached in-process and de-duplicated while
 * in flight. The catalog changes slowly, but the UI asks the same questions a
 * lot (per-filter counts, page re-fetches, union count recomputation), so this
 * removes the vast majority of upstream round-trips.
 */
const CACHE_TTL_MS = 90_000
const CACHE_MAX = 800
const cache = new Map<string, { at: number; value: unknown }>()
const inflight = new Map<string, Promise<unknown>>()

export async function spCallCached<T>(
  action: SpAction,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const key = `${action}:${JSON.stringify(payload)}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value as T
  const pending = inflight.get(key)
  if (pending) return pending as Promise<T>

  const task = spCall<T>(action, payload)
    .then((value) => {
      if (cache.size >= CACHE_MAX) {
        const oldest = cache.keys().next().value
        if (oldest) cache.delete(oldest)
      }
      cache.set(key, { at: Date.now(), value })
      return value
    })
    .finally(() => {
      inflight.delete(key)
    })
  inflight.set(key, task)
  return task
}

export type SpItemsPageRaw = {
  items: SpStockItem[]
  totalCount: number
  pagination?: { page: number; limit: number; totalPages: number }
}

/**
 * The supplier ANDs every filter key, and different stock batches expose
 * different attribute names for the same real feature (e.g. cookies are
 * `has_cookie` in one batch and `has_ct0` in another). To express an OR we
 * run one query per key-combination ("variant") and union the results.
 */
export async function spItemsUnionCount(
  product: string,
  variants: Array<Record<string, unknown>>,
): Promise<{ totalCount: number; perVariant: number[] }> {
  if (variants.length === 1) {
    const filters = variants[0] ?? {}
    const res = await spCallCached<SpItemsPageRaw>('product.items', {
      product,
      page: 1,
      limit: 1,
      ...(Object.keys(filters).length > 0 ? { filters } : {}),
    })
    return { totalCount: res.totalCount ?? 0, perVariant: [res.totalCount ?? 0] }
  }
  const perVariant = await Promise.all(
    variants.map(async (filters) => {
      const res = await spCallCached<SpItemsPageRaw>('product.items', {
        product,
        page: 1,
        limit: 1,
        ...(Object.keys(filters).length > 0 ? { filters } : {}),
      })
      return res.totalCount ?? 0
    }),
  )
  return { totalCount: perVariant.reduce((sum, n) => sum + n, 0), perVariant }
}

async function fetchRange(
  product: string,
  filters: Record<string, unknown>,
  start: number,
  count: number,
  pageSize: number,
): Promise<SpStockItem[]> {
  const firstPage = Math.floor(start / pageSize) + 1
  const skip = start % pageSize
  const pages = Math.ceil((skip + count) / pageSize)
  const results = await Promise.all(
    Array.from({ length: pages }, (_, i) =>
      spCallCached<SpItemsPageRaw>('product.items', {
        product,
        page: firstPage + i,
        limit: pageSize,
        ...(Object.keys(filters).length > 0 ? { filters } : {}),
      }),
    ),
  )
  return results.flatMap((r) => r.items ?? []).slice(skip, skip + count)
}

export async function spItemsUnion(
  product: string,
  variants: Array<Record<string, unknown>>,
  page: number,
  limit: number,
): Promise<{
  items: SpStockItem[]
  totalCount: number
  pagination: { page: number; limit: number; totalPages: number }
}> {
  if (variants.length === 1) {
    const filters = variants[0] ?? {}
    const res = await spCallCached<SpItemsPageRaw>('product.items', {
      product,
      page,
      limit,
      ...(Object.keys(filters).length > 0 ? { filters } : {}),
    })
    return {
      items: res.items ?? [],
      totalCount: res.totalCount ?? 0,
      pagination: res.pagination ?? {
        page,
        limit,
        totalPages: Math.max(1, Math.ceil((res.totalCount ?? 0) / limit)),
      },
    }
  }
  const { totalCount, perVariant } = await spItemsUnionCount(product, variants)
  const start = (page - 1) * limit
  const end = start + limit
  const chunks: SpStockItem[] = []
  let cursor = 0
  for (let i = 0; i < variants.length; i += 1) {
    const count = perVariant[i] ?? 0
    const variantStart = cursor
    cursor += count
    if (count === 0 || cursor <= start || variantStart >= end) continue
    const from = Math.max(0, start - variantStart)
    const take = Math.min(count - from, end - Math.max(start, variantStart))
    if (take <= 0) continue
    chunks.push(...(await fetchRange(product, variants[i]!, from, take, limit)))
  }
  const seen = new Set<string>()
  const items = chunks.filter((item) => !seen.has(item.id) && (seen.add(item.id), true))
  return {
    items,
    totalCount,
    pagination: { page, limit, totalPages: Math.max(1, Math.ceil(totalCount / limit)) },
  }
}

/**
 * Normalizes a supplier `order.detail` response into the shape the order
 * screen renders. The supplier is not strict about field naming across
 * product batches, so every read is defensive.
 */
import { ITEM_ID_KEY, type DeliveredAccount } from './order-delivery'

export const GUARANTEE_MS = 2 * 24 * 60 * 60 * 1000

type Raw = Record<string, unknown>

function str(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return String(v)
}

function ts(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v > 1e12 ? v : v * 1000
  if (typeof v === 'string') {
    const parsed = Date.parse(v)
    if (!Number.isNaN(parsed)) return parsed
  }
  return undefined
}

function pick(raw: Raw, keys: string[]): unknown {
  for (const k of keys) {
    if (raw[k] !== undefined && raw[k] !== null && raw[k] !== '') return raw[k]
  }
  return undefined
}

/**
 * The documented delivery payload carries credentials in a single delimited
 * string (`data: "username:password:email:email_pass"`). Field names are not
 * included, so we map tokens by shape: emails, long hex tokens and base32 2FA
 * secrets are recognised, the rest falls back to username/password order.
 */
export function parseDataLine(line: string): DeliveredAccount {
  const raw = line.trim()
  if (!raw) return {}
  const sep = raw.includes(':') ? ':' : raw.includes('|') ? '|' : raw.includes(';') ? ';' : ':'
  const tokens = raw.split(sep).map((t) => t.trim()).filter((t) => t !== '')
  const out: DeliveredAccount = {}
  const rest: string[] = []

  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i]!
    if (t.includes('@') && !out['hotmail_email']) {
      out['hotmail_email'] = t
      const next = tokens[i + 1]
      if (next && !next.includes('@')) {
        out['hotmail_pass'] = next
        i += 1
      }
      continue
    }
    if (/^[0-9]+-[A-Za-z0-9_-]{20,}$/.test(t) && !out['auth_token']) {
      out['auth_token'] = t
      continue
    }
    if (/^[a-f0-9]{40,}$/i.test(t)) {
      if (!out['auth_token']) out['auth_token'] = t
      else if (!out['ct0']) out['ct0'] = t
      continue
    }
    if (/^[A-Z2-7]{16,32}$/.test(t) && !out['twofa']) {
      out['twofa'] = t
      continue
    }
    rest.push(t)
  }

  if (rest[0] && !out['username']) out['username'] = rest[0]
  if (rest[1] && !out['password']) out['password'] = rest[1]
  for (let i = 2; i < rest.length; i += 1) out[`extra_${i - 1}`] = rest[i]!
  return out
}

/** Supplier nests credentials under varying keys; flatten to a flat map. */
function toAccount(entry: unknown): DeliveredAccount {
  if (typeof entry === 'string') return parseDataLine(entry)
  if (!entry || typeof entry !== 'object') return {}
  const raw = entry as Raw
  const attrsRaw = raw['attributes'] ?? raw['fields'] ?? null
  const attrs = (attrsRaw && typeof attrsRaw === 'object' ? attrsRaw : {}) as Raw
  // `data` is documented as a delimited credential string, but some batches
  // return an object instead — accept both.
  const dataRaw = raw['data']
  const dataObj = dataRaw && typeof dataRaw === 'object' ? (dataRaw as Raw) : {}
  const dataLine = typeof dataRaw === 'string' ? parseDataLine(dataRaw) : {}
  const merged: Raw = { ...raw, ...dataObj, ...attrs, ...dataLine }
  delete merged['attributes']
  delete merged['fields']
  delete merged['data']
  const out: DeliveredAccount = {}
  for (const [k, v] of Object.entries(merged)) {
    if (v === null || v === undefined || typeof v === 'object') continue
    out[k.toLowerCase()] = str(v)
  }
  // Every delivered item is its own supplier order: keep its id separate from
  // the credential fields so each card can show the real per-item id.
  const itemId = pick(merged, [
    'id',
    'orderId',
    'order_id',
    'orderRef',
    'order_ref',
    'reference',
    'uuid',
    'stockItemId',
    'stock_item_id',
  ])
  if (itemId !== undefined && typeof itemId !== 'object') {
    out[ITEM_ID_KEY] = str(itemId)
  }
  delete out['id']
  delete out['uuid']
  delete out['stockitemid']
  delete out['stock_item_id']
  delete out['batchid']
  delete out['batch_id']
  delete out['status']
  delete out['type']
  delete out['source']
  delete out['amount']
  delete out['price']
  delete out['createdat']
  delete out['created_at']
  delete out['warrantyexpiresat']
  delete out['warranty_expires_at']
  delete out['product']
  delete out['productslug']
  delete out['product_slug']
  return out
}

export type SupplierDelivery = {
  status?: string
  qty?: number
  amount?: number
  createdAt?: number
  guaranteeUntil?: number
  accounts: DeliveredAccount[]
}

export function normalizeOrderDetail(payload: unknown): SupplierDelivery {
  const root = (payload && typeof payload === 'object' ? payload : {}) as Raw
  const raw = ((root['order'] ?? root['batch'] ?? root) as Raw) ?? {}

  const listSource =
    pick(raw, ['items', 'accounts', 'deliveredItems', 'delivered', 'orders', 'stockItems']) ?? []
  let accounts = Array.isArray(listSource)
    ? listSource.map(toAccount).filter((a) => Object.keys(a).length > 0)
    : []

  // `order.detail` documents a single order per call: credentials live on the
  // root object itself (`data`, `attributes`), with no nested list.
  if (accounts.length === 0) {
    const single = toAccount(raw)
    const meaningful = Object.keys(single).filter((k) => k !== ITEM_ID_KEY)
    if (meaningful.length > 0) accounts = [single]
  }

  const createdAt = ts(pick(raw, ['createdAt', 'created_at', 'purchasedAt', 'date']))
  const guaranteeUntil =
    ts(
      pick(raw, [
        'guaranteeUntil',
        'guarantee_until',
        'warrantyUntil',
        'warranty_until',
        'warrantyExpiresAt',
        'warranty_expires_at',
        'replacementUntil',
      ]),
    ) ?? (createdAt !== undefined ? createdAt + GUARANTEE_MS : undefined)

  const qtyRaw = pick(raw, ['quantity', 'qty', 'count'])
  const amountRaw = pick(raw, ['total', 'totalPrice', 'amount', 'price'])

  return {
    status: typeof raw['status'] === 'string' ? raw['status'] : undefined,
    qty: Number(qtyRaw) || accounts.length || undefined,
    amount: Number(amountRaw) || undefined,
    createdAt,
    guaranteeUntil,
    accounts,
  }
}

/**
 * A customer purchase maps to one supplier batch: `product.purchase` returns
 * `orders[]` sharing a `batchId`, and each order can be re-read individually.
 * Merges those per-order details into a single delivery for the order page.
 */
export function mergeOrderDetails(details: unknown[]): SupplierDelivery {
  const parts = details.map(normalizeOrderDetail)
  const accounts = parts.flatMap((p) => p.accounts)
  const createdAt = parts.map((p) => p.createdAt).filter((v): v is number => typeof v === 'number')
  const guarantees = parts
    .map((p) => p.guaranteeUntil)
    .filter((v): v is number => typeof v === 'number')
  const amount = parts.reduce((sum, p) => sum + (p.amount ?? 0), 0)
  const statuses = parts.map((p) => p.status).filter((s): s is string => !!s)
  const pending = statuses.find((s) => s.toUpperCase() !== 'COMPLETED')
  return {
    status: pending ?? statuses[0],
    qty: accounts.length || undefined,
    amount: amount || undefined,
    createdAt: createdAt.length ? Math.min(...createdAt) : undefined,
    guaranteeUntil: guarantees.length ? Math.min(...guarantees) : undefined,
    accounts,
  }
}

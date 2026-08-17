/**
 * Fake delivered orders shown only to admins, so the order details /
 * export UI can be reviewed without a real supplier delivery.
 */
import type { Order } from './types'
import { ITEM_ID_KEY } from './order-delivery'

const DAY = 24 * 60 * 60 * 1000
const GUARANTEE_MS = 2 * DAY // 48h from purchase

const NAMES = [
  'RobertELewis',
  'MariaKHolt',
  'DanielPGrant',
  'EmilyRWard',
  'JacobTMoore',
  'OliviaSHayes',
  'LucasNBrady',
  'SophiaMReed',
]

function fakeRefreshToken(seed: string): string {
  // Looks like a Microsoft OAuth refresh token, but is not valid.
  const part = (len: number) =>
    Array.from({ length: len }, (_, j) => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
      return chars[(seed.charCodeAt(j % seed.length) + j) % chars.length]
    }).join('')
  return `${part(32)}.${part(132)}.${part(32)}.${part(24)}.${part(44)}.${part(24)}.${part(8)}`
}

/** cuid2-ish per-item order id, matching the supplier's `auto:<cuid>` shape. */
function fakeItemId(seed: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let x = (seed + 1) * 2654435761
  let out = 'c'
  for (let i = 0; i < 24; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff
    out += chars[x % chars.length]
  }
  return out
}

type AccOverrides = {
  /** Followers the product promises (e.g. 3500 for a "3.5K" listing). */
  followers?: number
  /** Creation year range: 'fresh' → recent account, 'aged' → 2012–2015. */
  age?: 'fresh' | 'aged'
}

function creationDate(i: number, age: 'fresh' | 'aged'): string {
  if (age === 'aged') {
    const y = 2012 + (i % 4)
    return `${y}-0${(i % 8) + 1}-1${i % 9}`
  }
  const d = new Date(Date.now() - (30 + (i % 120)) * DAY)
  return d.toISOString().slice(0, 10)
}

function acc(i: number, o: AccOverrides = {}): Record<string, string> {
  const n = String(i).padStart(2, '0')
  const age = o.age ?? 'aged'
  const followers =
    o.followers !== undefined ? o.followers : i % 4 === 0 ? 0 : 4 + (i % 37)
  return {
    // Each delivered account is a separate supplier purchase → its own id.
    [ITEM_ID_KEY]: `auto:${fakeItemId(i)}`,
    username: `${NAMES[i % NAMES.length]}${(i % 9) + 1}`,
    password: `Pa55w0rd!${n}xY`,
    hotmail_email: `demo${n}@hotmail.com`,
    hotmail_pass: `M4ilPass_${n}`,
    phone: `+1555010${n}`,
    ct0: `${n}a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6b7c8d9e0f1a2`,
    auth_token: `${n}9f8e7d6c5b4a39281706abcdef1234567890abcd`,
    twofa: `JBSWY3DPEHPK3PX${n}`,
    date: creationDate(i, age),
    followers: String(followers),
    follows: String(followers > 1000 ? 100 + (i % 400) : i % 3 === 0 ? 1 : 5 + (i % 11)),
    posts: String(followers > 1000 ? 20 + (i % 180) : i % 5 === 0 ? 1 : 2 + (i % 9)),
    blue: i % 3 === 0 ? 'true' : 'false',
    creation_country: ['United States', 'Germany', 'United Kingdom', 'Netherlands'][i % 4]!,
    // Demo-only, non-working Microsoft OAuth credentials so the Mail Reader autofill UI can be verified.
    refresh_token: fakeRefreshToken(`demo-refresh-${n}`),
    client_id: '9e5f95bf-c04e-4d75-8f9f-39d6941d8869',
  }
}

export const DEMO_ORDERS: Order[] = [
  {
    id: 'demo-order-aged',
    date: Date.now() - 2 * 60 * 60 * 1000,
    title: 'Old Dated Accounts (2012–2015)',
    amount: 0.35,
    status: 'completed',
    refillable: false,
    kind: 'account',
    paid: true,
    qty: 1,
    orderRef: 'auto:demo1cmskev7cy0jcyr01iuz30vrxa',
    guaranteeUntil: Date.now() - 2 * 60 * 60 * 1000 + GUARANTEE_MS,
    emailAccess: true,
    twofa: true,
    accounts: [acc(1)],
  },
  {
    id: 'demo-order-bulk',
    date: Date.now() - 3 * DAY,
    title: 'Fresh Accounts — bulk pack',
    amount: 12.5,
    status: 'completed',
    refillable: false,
    kind: 'account',
    paid: true,
    qty: 5,
    orderRef: 'auto:demo2b8f3ac91de04772a6c5',
    guaranteeUntil: Date.now() - 3 * DAY + GUARANTEE_MS,
    emailAccess: true,
    twofa: false,
    accounts: [acc(2), acc(3), acc(4), acc(5), acc(6)],
  },
  {
    id: 'demo-order-boost-followers',
    date: Date.now() - 45 * 60 * 1000,
    title: 'X Followers — Global (5 000)',
    amount: 8.4,
    status: 'in_progress',
    refillable: true,
    kind: 'boost',
    paid: true,
    qty: 5000,
    orderRef: 'auto:demo3boostfollowers9a71c4',
  },
  {
    id: 'demo-order-boost-views',
    date: Date.now() - 5 * DAY,
    title: 'X Post Views — Fast (50 000)',
    amount: 3.2,
    status: 'completed',
    refillable: false,
    kind: 'boost',
    paid: true,
    qty: 50000,
    orderRef: 'auto:demo4boostviews42dd0b7e',
  },
]

/* ── Test purchases created from the cart (admin only, stored locally) ───── */

const TEST_KEY = 'test_orders_v2'
const LEGACY_TEST_KEYS = ['test_orders_v1']
export const TEST_ORDERS_EVENT = 'test-orders-changed'

/**
 * Older test orders were generated with prefixed tokens (`ct0_…`, `auth_…`,
 * `rt_…`, `cid_…`). Strip those prefixes so stored orders show raw values.
 */
const PREFIXES: Record<string, string[]> = {
  ct0: ['ct0_'],
  auth_token: ['auth_', 'auth_token_'],
  refresh_token: ['rt_', 'refresh_'],
  client_id: ['cid_', 'client_'],
}

function sanitizeOrders(orders: Order[]): Order[] {
  return orders.map((o) => {
    const isCustomAccount = /аккаунт под ключ|custom account/i.test(o.title)
    return {
    ...o,
    // Custom-account orders start in progress, but respect an admin-advanced
    // status once one has been stored.
    status: isCustomAccount ? (o.status ?? 'in_progress') : o.status,
    guaranteeUntil: isCustomAccount ? undefined : o.guaranteeUntil,
    customAccount: isCustomAccount
      ? fillCustomAccount(o.customAccount, followersFromTitle(o.title))
      : o.customAccount,
    // Delivered credentials belong to the order even when it is a custom
    // build. Older code cleared them on every localStorage read, which made a
    // successful admin hand-over disappear immediately.
    accounts: o.accounts?.map((a) => {
      const next: Record<string, string> = { ...a }
      for (const [key, prefixes] of Object.entries(PREFIXES)) {
        const v = next[key]
        if (typeof v !== 'string') continue
        for (const p of prefixes) {
          if (v.startsWith(p)) {
            next[key] = v.slice(p.length)
            break
          }
        }
      }
      return next
    }),
  }
  })
}

/**
 * A paid custom-account order always went through the builder, so its spec is
 * never blank. Older test orders were saved before the profile draft was
 * persisted — backfill a plausible spec so the preview is never empty.
 */
const FILL_NAMES = ['Alex Mercer', 'Nova Reed', 'Kai Lindberg', 'Mia Vetrov', 'Leo Marchetti']
const FILL_BIOS = [
  'building things on the internet · dm open',
  'crypto · markets · signals',
  'photography, travel and coffee',
  'founder · writing about growth',
]

function fillCustomAccount(
  meta: Record<string, string> | undefined,
  followers?: number,
): Record<string, string> {
  const m: Record<string, string> = { ...(meta ?? {}) }
  if (!m['followers'] || m['followers'] === '—') m['followers'] = String(followers ?? 5000)
  const hasProfile = !!m['profile_name'] && m['profile_name'] !== '—'
  if (!hasProfile) {
    const idx = Math.abs(Number(m['followers']) || 0) % FILL_NAMES.length
    const name = FILL_NAMES[idx]!
    m['profile_name'] = name
    m['profile_handle'] = '@' + name.toLowerCase().replace(/[^a-z]/g, '') + (10 + (idx * 7) % 89)
    m['profile_bio'] = FILL_BIOS[idx % FILL_BIOS.length]!
    m['profile_verified'] = m['profile_verified'] ?? 'no'
    m['profile_following_range'] = m['profile_following_range'] ?? '30-50'
    m['profile_posts_range'] = m['profile_posts_range'] ?? '0-50'
    m['year'] = m['year'] ?? '2021'
  }
  return m
}

export function loadTestOrders(): Order[] {
  if (typeof window === 'undefined') return []
  try {
    // Drop legacy test orders (boosts were saved as account orders).
    for (const k of LEGACY_TEST_KEYS) window.localStorage.removeItem(k)
    const raw = window.localStorage.getItem(TEST_KEY)
    return raw ? sanitizeOrders(JSON.parse(raw) as Order[]) : []
  } catch {
    return []
  }
}

export function addTestOrder(order: Order) {
  if (typeof window === 'undefined') return
  const next = [order, ...loadTestOrders()].slice(0, 30)
  window.localStorage.setItem(TEST_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(TEST_ORDERS_EVENT))
}

/** Patch a locally stored test order (used by the admin pipeline stepper). */
export function updateTestOrder(id: string, patch: Partial<Order>) {
  if (typeof window === 'undefined') return
  const next = loadTestOrders().map((o) => (o.id === id ? { ...o, ...patch } : o))
  window.localStorage.setItem(TEST_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(TEST_ORDERS_EVENT))
}

export function clearTestOrders() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(TEST_KEY)
  window.dispatchEvent(new Event(TEST_ORDERS_EVENT))
}

/** Followers promised by a listing title: "3.5K" → 3500, "2M" → 2000000. */
function followersFromTitle(title: string): number | undefined {
  const m = title.match(/(\d+(?:[.,]\d+)?)\s*([KkКкMmМм])(?![a-zA-Zа-яА-Я])/)
  if (m) {
    const n = Number(m[1]!.replace(',', '.'))
    const mult = /[KkКк]/.test(m[2]!) ? 1000 : 1_000_000
    return Math.round(n * mult)
  }
  const plain = title.match(/(?:^|[^\d])(\d{3,7})(?:[^\d]|$)/)
  return plain ? Number(plain[1]) : undefined
}

/** Aged listings mention years or "old/dated/отлёж" wording. */
function ageFromTitle(title: string): 'fresh' | 'aged' {
  return /\b(19|20)\d{2}\b|aged|old|dated|стары|отлеж|отлёж/i.test(title) ? 'aged' : 'fresh'
}

/** Build a fake order: accounts get generated credentials, boosts do not. */
export function makeTestOrder(input: {
  title: string
  amount: number
  qty?: number
  kind?: 'account' | 'boost'
  refId?: string
  meta?: Record<string, string>
}): Order {
  const qty = Math.max(1, input.qty ?? 1)
  const seed = Math.floor(Math.random() * 90) + 10
  const id = `test-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  const now = Date.now()
  if (input.kind === 'boost') {
    // For boosts the cart's `qty` counts targets, while the promised volume
    // (followers / likes / reposts) lives in meta.amount — that's what the
    // buyer sees next to the order title.
    const metaAmount = Number(input.meta?.['amount'])
    const boostQty = Number.isFinite(metaAmount) && metaAmount > 0 ? Math.round(metaAmount) : qty
    return {
      id,
      date: now,
      title: input.title,
      amount: input.amount,
      status: 'in_progress',
      refillable: true,
      kind: 'boost',
      paid: true,
      qty: boostQty,
      ...(input.refId ? { serviceId: input.refId } : {}),
      ...(input.meta?.['targets']
        ? { target: input.meta['targets'].split('\n')[0]!.trim() }
        : {}),
      ...(input.meta?.['start_followers']
        ? { startFollowers: Number(input.meta['start_followers']) || 0 }
        : {}),
      orderRef: `auto:test${id.replace(/-/g, '')}`,
    }
  }
  if (input.refId === 'custom_account') {
    return {
      id,
      date: now,
      title: input.title,
      amount: input.amount,
      status: 'in_progress',
      refillable: false,
      kind: 'account',
      paid: true,
      qty: 1,
      orderRef: `auto:test${id.replace(/-/g, '')}`,
      customAccount: input.meta,
    }
  }
  return {
    id,
    date: now,
    title: input.title,
    amount: input.amount,
    status: 'completed',
    refillable: false,
    kind: 'account',
    paid: true,
    qty,
    orderRef: `auto:test${id.replace(/-/g, '')}`,
    guaranteeUntil: now + GUARANTEE_MS,
    emailAccess: true,
    twofa: true,
    accounts: Array.from({ length: qty }, (_, i) =>
      acc(seed + i, {
        age: ageFromTitle(input.title),
        followers: followersFromTitle(input.title),
      }),
    ),
  }
}

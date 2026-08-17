import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useLocalState } from './persistent-state'
import type { CartItem, Order, OrderStatus, Topup, TopupStatus } from './types'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './auth'
import { TEST_ORDERS_EVENT, loadTestOrders } from './demo-orders'

type StoreContextType = {
  balance: number
  setBalance: (updater: number | ((prev: number) => number)) => void
  cart: CartItem[]
  addToCart: (item: CartItem) => void
  removeFromCart: (key: string) => void
  clearCart: () => void
  cartCount: number
  cartTotal: number
  editingCustomKey: string | null
  setEditingCustomKey: (key: string | null) => void
  orders: Order[]
  addOrder: (order: Order) => void
  refillOrder: (id: string) => void
  topups: Topup[]
  addTopup: (topup: Topup) => void
  updateTopup: (id: string, patch: Partial<Topup>) => void
  redeemPromo: (code: string) => Promise<number | null>
  soldAccounts: Record<string, number>
  recordAccountPurchase: (accountId: string, qty: number) => void
  loading: boolean
  isAdmin: boolean
}

const StoreContext = createContext<StoreContextType | null>(null)

const K = {
  cart: 'aurex:v2:cart',
  redeemed: 'aurex:v2:redeemed',
  soldAccounts: 'aurex:v2:soldAccounts',
} as const

// ─── Mappers between DB rows and local shapes ────────────────────────────────
type DBOrderStatus = 'pending' | 'in_progress' | 'waiting' | 'completed' | 'declined' | 'refunded'
type DBTopupStatus = 'pending' | 'success' | 'declined' | 'expired'

function dbToOrderStatus(s: DBOrderStatus): OrderStatus {
  if (s === 'completed' || s === 'refunded') return 'completed'
  if (s === 'in_progress') return 'in_progress'
  return 'waiting'
}

function dbToTopupStatus(s: DBTopupStatus): TopupStatus {
  if (s === 'success') return 'success'
  if (s === 'pending') return 'pending'
  return 'declined'
}

function orderStatusToDB(s: OrderStatus): DBOrderStatus {
  return s === 'waiting' ? 'pending' : s
}

function topupStatusToDB(s: TopupStatus): DBTopupStatus {
  return s
}

/** Shape of the `orders` row we care about (hydration + realtime share it). */
type OrderRow = {
  id: string
  created_at: string
  title: string
  amount_usd: number | string
  status: string
  qty: number | null
  meta: unknown
}

/**
 * Single source of truth for DB row → local `Order`. Used both by the initial
 * hydration and by the realtime stream, so a live update carries exactly the
 * same fields (delivered accounts, stage, guarantee) as a fresh page load.
 */
function mapOrderRow(o: OrderRow): Order {
  const date = new Date(o.created_at).getTime()
  const m = (o.meta ?? {}) as Record<string, unknown>
  const kind = ((m['kind'] as 'boost' | 'account' | undefined) ?? 'boost') as 'boost' | 'account'
  const guaranteeUntilFromMeta = m['guarantee_until'] as number | undefined
  const localId = m['local_id'] as string | undefined
  return {
    id: localId ?? o.id,
    date,
    title: o.title,
    amount: Number(o.amount_usd),
    status: dbToOrderStatus(o.status as DBOrderStatus),
    refillable: !!m['refillable'],
    kind,
    paid: !!m['paid'],
    qty: Number(o.qty ?? 1) || 1,
    orderRef: (m['order_ref'] as string | undefined) ?? undefined,
    guaranteeUntil:
      guaranteeUntilFromMeta ?? (kind === 'account' ? date + 2 * 24 * 60 * 60 * 1000 : undefined),
    emailAccess: !!m['email_access'],
    twofa: !!m['twofa'],
    accounts: (m['accounts'] as Record<string, string>[] | undefined) ?? undefined,
    customAccount: (m['custom_account'] as Record<string, string> | undefined) ?? undefined,
    progressStep: (m['progress_step'] as number | undefined) ?? undefined,
    serviceId: (m['service_id'] as string | undefined) ?? undefined,
    target: (m['target'] as string | undefined) ?? undefined,
    startFollowers:
      typeof m['start_followers'] === 'number' ? (m['start_followers'] as number) : undefined,
    completedAt: (m['completed_at'] as number | undefined) ?? undefined,
  }
}


export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, isAdmin } = useAuth()

  const [balance, setBalanceState] = useState<number>(0)
  const [ordersRaw, setOrders] = useState<Order[]>([])
  // Test purchases made in this browser are kept in localStorage. They must
  // remain visible to their creator even while the admin role is still loading.
  const [testOrders, setTestOrders] = useState<Order[]>([])
  useEffect(() => {
    const sync = () => setTestOrders(loadTestOrders())
    sync()
    window.addEventListener(TEST_ORDERS_EVENT, sync)
    return () => window.removeEventListener(TEST_ORDERS_EVENT, sync)
  }, [])
  // A test purchase can exist both locally and as its persisted DB twin (linked
  // by meta.local_id). Show it once — the local copy wins, it is the freshest.
  const orders = useMemo(() => {
    const seen = new Set<string>()
    const out: Order[] = []
    for (const o of [...testOrders, ...ordersRaw]) {
      const key = o.id || `${o.title}|${o.date}|${o.amount}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(o)
    }
    return out
  }, [testOrders, ordersRaw])
  const [topups, setTopups] = useState<Topup[]>([])
  const [cart, setCart] = useLocalState<CartItem[]>(K.cart, [])
  const [redeemed, setRedeemed] = useLocalState<string[]>(K.redeemed, [])
  const [soldAccounts, setSoldAccounts] = useLocalState<Record<string, number>>(
    K.soldAccounts,
    {},
  )
  const [editingCustomKey, setEditingCustomKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const userIdRef = useRef<string | null>(null)

  // ─── Hydrate from Cloud once user is available ─────────────────────────────
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }
    userIdRef.current = user.id
    let cancelled = false
    setLoading(true)

    // Make sure the profile row exists (balance, promo, orders depend on it).
    void (supabase.rpc as unknown as (fn: string) => Promise<unknown>)('ensure_profile')

    const ordersQuery = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    Promise.all([
      supabase.from('profiles').select('balance').eq('id', user.id).maybeSingle(),
      isAdmin ? ordersQuery : ordersQuery.eq('user_id', user.id),
      supabase
        .from('topups')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200),
    ]).then(([profileRes, ordersRes, topupsRes]) => {
      if (cancelled) return
      setBalanceState(Number(profileRes.data?.balance ?? 0))
      setOrders((prev) => {
        const rows = (ordersRes.data ?? []).map(mapOrderRow)
        // Keep any locally-created order that has not landed in the DB yet.
        const ids = new Set(rows.map((r) => r.id))
        return [...rows, ...prev.filter((o) => !ids.has(o.id))]
      })

      const TOPUP_TTL_MS = 30 * 60 * 1000
      const nowMs = Date.now()
      setTopups(
        (topupsRes.data ?? []).map((t) => {
          const createdAt = new Date(t.created_at).getTime()
          const meta = (t.address ? { address: t.address } : {}) as { address?: string }
          const dbStatus = dbToTopupStatus(t.status as DBTopupStatus)
          const expired = dbStatus === 'pending' && nowMs - createdAt > TOPUP_TTL_MS
          return {
            id: t.id,
            date: createdAt,
            amount: Number(t.amount_usd),
            coin: t.coin,
            network: t.network ?? '',
            status: expired ? ('declined' as const) : dbStatus,
            closedAt: expired
              ? createdAt + TOPUP_TTL_MS
              : t.updated_at
                ? new Date(t.updated_at).getTime()
                : undefined,
            address: meta.address,
            txHash: t.tx_hash ?? undefined,
          }
        }),
      )

      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [user, authLoading, isAdmin])

  // ─── Live stream: orders + balance ─────────────────────────────────────────
  // A shop used by hundreds of buyers cannot rely on a page reload: whatever the
  // admin saves (delivered accounts, stage, status) must appear in the buyer's
  // open order screen instantly, and the balance must follow every server-side
  // credit/debit. RLS scopes the stream to the caller's own rows.
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`store:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          const row = payload.new as OrderRow | null
          if (payload.eventType === 'DELETE') {
            const gone = (payload.old as { id?: string } | null)?.id
            if (gone) setOrders((prev) => prev.filter((o) => o.id !== gone))
            return
          }
          if (!row?.id) return
          const next = mapOrderRow(row)
          setOrders((prev) => {
            const i = prev.findIndex((o) => o.id === next.id)
            if (i === -1) return [next, ...prev]
            const out = [...prev]
            out[i] = { ...prev[i], ...next }
            return out
          })
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          const next = (payload.new as { balance?: number | string } | null)?.balance
          if (next !== undefined && next !== null) setBalanceState(Number(next))
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [user])


  // ─── Auto-expire pending topups after 30 minutes ──────────────────────────
  useEffect(() => {
    const TOPUP_TTL_MS = 30 * 60 * 1000
    const tick = () => {
      const now = Date.now()
      setTopups((prev) => {
        let changed = false
        const next = prev.map((tp) => {
          if (tp.status === 'pending' && now - tp.date > TOPUP_TTL_MS) {
            changed = true
            return { ...tp, status: 'declined' as const, closedAt: tp.date + TOPUP_TTL_MS }
          }
          return tp
        })
        return changed ? next : prev
      })
    }
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])



  // ─── Balance ────────────────────────────────────────────────────────────────
  const setBalance = useCallback(
    (updater: number | ((prev: number) => number)) => {
      setBalanceState((prev) => {
        const next = typeof updater === 'function' ? (updater as (p: number) => number)(prev) : updater
        const uid = userIdRef.current
        if (uid) {
          supabase
            .from('profiles')
            .update({ balance: next })
            .eq('id', uid)
            .then(({ error }) => {
              if (error) console.error('[store] balance sync failed', error)
            })
        }
        return next
      })
    },
    [],
  )

  // ─── Cart ───────────────────────────────────────────────────────────────────
  const addToCart = useCallback(
    (item: CartItem) => {
      setCart((prev) => {
        const existing = prev.find((p) => p.key === item.key)
        if (existing) {
          return prev.map((p) => (p.key === item.key ? item : p))
        }
        return [...prev, item]
      })
    },
    [setCart],
  )
  const removeFromCart = useCallback(
    (key: string) => setCart((prev) => prev.filter((p) => p.key !== key)),
    [setCart],
  )
  const clearCart = useCallback(() => setCart([]), [setCart])

  // ─── Orders ─────────────────────────────────────────────────────────────────
  const addOrder = useCallback((order: Order) => {
    setOrders((prev) => (prev.some((item) => item.id === order.id) ? prev : [order, ...prev]))
    const uid = userIdRef.current
    if (!uid) return
    supabase
      .from('orders')
      .insert({
        user_id: uid,
        title: order.title,
        amount_usd: order.amount,
        status: orderStatusToDB(order.status),
        qty: order.qty ?? 1,
        meta: {
          refillable: order.refillable,
          kind: order.kind,
          paid: order.paid,
          local_id: order.id,
           ...(order.orderRef ? { order_ref: order.orderRef } : {}),
           ...(order.guaranteeUntil ? { guarantee_until: order.guaranteeUntil } : {}),
           ...(order.emailAccess ? { email_access: true } : {}),
           ...(order.twofa ? { twofa: true } : {}),
           ...(order.accounts ? { accounts: order.accounts } : {}),
           ...(typeof order.progressStep === 'number'
             ? { progress_step: order.progressStep }
             : {}),
          // Custom orders carry the buyer's brief so the admin sees the exact spec.
          ...(order.customAccount ? { custom_account: order.customAccount } : {}),
          // Boost orders keep their catalog service, target and the follower
          // snapshot taken at purchase, so the order screen can show growth.
          ...(order.serviceId ? { service_id: order.serviceId } : {}),
          ...(order.target ? { target: order.target } : {}),
          ...(typeof order.startFollowers === 'number'
            ? { start_followers: order.startFollowers }
            : {}),
          ...(order.completedAt ? { completed_at: order.completedAt } : {}),
        },
      })
      .then(({ error }) => {
        if (error) console.error('[store] order insert failed', error)
      })
  }, [])

  const refillOrder = useCallback((id: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id && (o.status === 'waiting' || o.status === 'completed')
          ? { ...o, status: 'in_progress' as const }
          : o,
      ),
    )
    // Note: RLS blocks users from updating orders directly. Admin flips the status.
    // Left as optimistic-only for now; a server function will handle refill later.
  }, [])

  // ─── Topups ─────────────────────────────────────────────────────────────────
  const addTopup = useCallback((topup: Topup) => {
    setTopups((prev) => [topup, ...prev])
    const uid = userIdRef.current
    if (!uid) return
    supabase
      .from('topups')
      .insert({
        id: topup.id,
        user_id: uid,
        coin: topup.coin,
        network: topup.network || null,
        amount_usd: topup.amount,
        address: topup.address ?? '',
        status: topupStatusToDB(topup.status),
      })
      .then(({ error }) => {
        if (error) console.error('[store] topup insert failed', error)
      })
  }, [])


  const updateTopup = useCallback((id: string, patch: Partial<Topup>) => {
    setTopups((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
    const uid = userIdRef.current
    if (!uid) return
    const dbPatch: { status?: DBTopupStatus; address?: string; tx_hash?: string } = {}
    if (patch.status) dbPatch.status = topupStatusToDB(patch.status)
    if (patch.address !== undefined) dbPatch.address = patch.address ?? ''
    if (patch.txHash !== undefined) dbPatch.tx_hash = patch.txHash
    if (Object.keys(dbPatch).length === 0) return
    supabase
      .from('topups')
      .update(dbPatch)
      .eq('id', id)
      .eq('user_id', uid)
      .then(({ error }) => {
        if (error) console.error('[store] topup update failed', error)
      })
  }, [])

  // ─── Promo ──────────────────────────────────────────────────────────────────
  const redeemPromo = useCallback(
    async (code: string) => {
      const key = code.trim().toUpperCase()
      if (!key) return null
      const { data, error } = await supabase.rpc('redeem_promo', { _code: key })
      if (error) {
        console.error('[store] promo redeem failed', error.message)
        return null
      }
      const res = data as { bonus?: number; balance?: number; code?: string } | null
      if (!res || typeof res.bonus !== 'number') return null
      if (typeof res.balance === 'number') setBalanceState(res.balance)
      setRedeemed((prev) => (prev.includes(key) ? prev : [...prev, key]))
      return res.bonus
    },
    [setRedeemed],
  )

  const recordAccountPurchase = useCallback(
    (accountId: string, qty: number) => {
      if (!accountId || !qty || qty <= 0) return
      setSoldAccounts((prev) => ({
        ...prev,
        [accountId]: (prev[accountId] ?? 0) + qty,
      }))
    },
    [setSoldAccounts],
  )

  const cartCount = cart.length
  const cartTotal = useMemo(() => cart.reduce((sum, i) => sum + i.total, 0), [cart])

  const value = useMemo<StoreContextType>(
    () => ({
      balance,
      setBalance,
      cart,
      addToCart,
      removeFromCart,
      clearCart,
      cartCount,
      cartTotal,
      editingCustomKey,
      setEditingCustomKey,
      orders,
      addOrder,
      refillOrder,
      topups,
      addTopup,
      updateTopup,
      redeemPromo,
      soldAccounts,
      recordAccountPurchase,
      loading,
      isAdmin,
    }),
    [
      balance,
      setBalance,
      cart,
      addToCart,
      removeFromCart,
      clearCart,
      cartCount,
      cartTotal,
      editingCustomKey,
      setEditingCustomKey,
      orders,
      addOrder,
      refillOrder,
      topups,
      addTopup,
      updateTopup,
      redeemPromo,
      soldAccounts,
      recordAccountPurchase,
      loading,
      isAdmin,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

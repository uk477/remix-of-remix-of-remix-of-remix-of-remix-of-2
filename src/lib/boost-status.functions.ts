import { createServerFn } from '@tanstack/react-start'
import { createClient } from '@supabase/supabase-js'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import type { Database } from '@/integrations/supabase/types'

export type BoostSubcatId = 'followers' | 'likes' | 'views' | 'reposts' | 'bookmarks'
export type BoostRegion = '_all' | 'global' | 'jp' | 'kr' | 'us'

export type BoostServiceStatus = {
  subcategory_id: BoostSubcatId
  region: BoostRegion
  is_available: boolean
  api_ping_url: string | null
  ping_method: string
  ping_expect_status: number
  manual_override: 'force_up' | 'force_down' | null
  last_checked_at: string | null
  last_error: string | null
  down_since: string | null
  updated_at: string
}

function fetchShimmedKey(key: string): typeof fetch {
  return (input, init) => {
    const h = new Headers(init?.headers)
    if (key.startsWith('sb_') && h.get('Authorization') === `Bearer ${key}`) {
      h.delete('Authorization')
    }
    h.set('apikey', key)
    return fetch(input, { ...init, headers: h })
  }
}

// ─── Public: list statuses (per subcat and per followers-region) ───────
export const getBoostStatuses = createServerFn({ method: 'GET' }).handler(async () => {
  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!
  const sb = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: { fetch: fetchShimmedKey(key) },
  })
  const { data, error } = await sb
    .from('boost_service_status')
    .select('subcategory_id,region,is_available,manual_override,down_since,updated_at')
  if (error) return { statuses: [], error: error.message }
  return {
    statuses: (data ?? []).map((r) => ({
      subcategory_id: r.subcategory_id as BoostSubcatId,
      region: ((r as { region: string }).region ?? '_all') as BoostRegion,
      is_available: r.is_available as boolean,
      manual_override: (r.manual_override ?? null) as 'force_up' | 'force_down' | null,
      down_since: (r.down_since as string | null) ?? null,
      updated_at: r.updated_at as string,
    })),
    error: null as string | null,
  }
})

// ─── Auth: subscribe / unsubscribe / list mine ─────────────────────────
export const subscribeBoostNotify = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { subcategory: BoostSubcatId; region?: BoostRegion }) => data)
  .handler(async ({ data, context }) => {
    const region = data.region ?? '_all'
    const { error } = await context.supabase
      .from('boost_notify_subscriptions')
      .upsert(
        { user_id: context.userId, subcategory_id: data.subcategory, region },
        { onConflict: 'user_id,subcategory_id,region' },
      )
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const unsubscribeBoostNotify = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { subcategory: BoostSubcatId; region?: BoostRegion }) => data)
  .handler(async ({ data, context }) => {
    const region = data.region ?? '_all'
    const { error } = await context.supabase
      .from('boost_notify_subscriptions')
      .delete()
      .eq('user_id', context.userId)
      .eq('subcategory_id', data.subcategory)
      .eq('region', region)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const listMyBoostSubscriptions = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('boost_notify_subscriptions')
      .select('subcategory_id,region')
      .eq('user_id', context.userId)
    if (error) throw new Error(error.message)
    return {
      subscribed: (data ?? []).map((r) => ({
        subcategory_id: r.subcategory_id as BoostSubcatId,
        region: ((r as { region: string }).region ?? '_all') as BoostRegion,
      })),
    }
  })

// ─── Admin: full status list + update ──────────────────────────────────
type AuthedSupabase = ReturnType<typeof createClient<Database>>

async function assertAdmin(supabase: AuthedSupabase, userId: string) {
  const { data, error } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' })
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Forbidden')
}

export const adminListBoostStatuses = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId)
    const { data, error } = await context.supabase
      .from('boost_service_status')
      .select('*')
      .order('subcategory_id')
      .order('region')
    if (error) throw new Error(error.message)

    const { data: subs } = await context.supabase
      .from('boost_notify_subscriptions')
      .select('subcategory_id,region')

    const counts: Record<string, number> = {}
    ;(subs ?? []).forEach((s) => {
      const key = `${s.subcategory_id}:${(s as { region: string }).region ?? '_all'}`
      counts[key] = (counts[key] ?? 0) + 1
    })

    return {
      rows: (data ?? []) as BoostServiceStatus[],
      subscriberCounts: counts,
    }
  })

export const adminUpdateBoostStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      subcategory: BoostSubcatId
      region?: BoostRegion
      api_ping_url?: string | null
      ping_method?: string
      ping_expect_status?: number
      manual_override?: 'force_up' | 'force_down' | null
    }) => data,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId)
    const region: BoostRegion = data.region ?? '_all'

    type Patch = Database['public']['Tables']['boost_service_status']['Update']
    const patch: Patch = {}
    if ('api_ping_url' in data) patch.api_ping_url = data.api_ping_url || null
    if ('ping_method' in data) patch.ping_method = data.ping_method || 'GET'
    if ('ping_expect_status' in data) patch.ping_expect_status = data.ping_expect_status ?? 200
    if ('manual_override' in data) {
      patch.manual_override = data.manual_override ?? null
      if (data.manual_override === 'force_up') {
        patch.is_available = true
        patch.down_since = null
        patch.last_error = null
      } else if (data.manual_override === 'force_down') {
        patch.is_available = false
        patch.down_since = new Date().toISOString()
      }
    }

    const { error } = await context.supabase
      .from('boost_service_status')
      .update(patch)
      .eq('subcategory_id', data.subcategory)
      .eq('region', region)
    if (error) throw new Error(error.message)

    if (data.manual_override === 'force_up') {
      const { runHealthCheck } = await import('./boost-health.server')
      await runHealthCheck({
        onlySubcategory: data.subcategory,
        onlyRegion: region,
        forceNotify: true,
        source: 'admin_override',
      })
    } else if (data.manual_override === 'force_down') {
      const { runHealthCheck } = await import('./boost-health.server')
      await runHealthCheck({
        onlySubcategory: data.subcategory,
        onlyRegion: region,
        source: 'admin_override',
      })
    }

    return { ok: true }
  })

// Manual "check now" from admin — runs the pinger for one row
export const adminPingBoostNow = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { subcategory: BoostSubcatId; region?: BoostRegion }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId)
    const { runHealthCheck } = await import('./boost-health.server')
    const result = await runHealthCheck({
      onlySubcategory: data.subcategory,
      onlyRegion: data.region ?? '_all',
      source: 'admin_ping',
    })
    return result
  })

// ─── Admin: statistics ─────────────────────────────────────────────────
export type BoostStatusEvent = {
  id: string
  subcategory_id: BoostSubcatId
  region: BoostRegion
  event: 'up' | 'down'
  source: string
  error: string | null
  notified_count: number
  created_at: string
}

export const adminListBoostEvents = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data:
      | {
          limit?: number
          from?: string | null
          to?: string | null
          subcategory?: BoostSubcatId | null
          region?: BoostRegion | null
          event?: 'up' | 'down' | null
          source?: string | null
        }
      | undefined) => data ?? {},
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId)
    const limit = Math.min(Math.max(data.limit ?? 300, 1), 1000)

    let q = context.supabase
      .from('boost_status_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (data.from) q = q.gte('created_at', data.from)
    if (data.to) q = q.lte('created_at', data.to)
    if (data.subcategory) q = q.eq('subcategory_id', data.subcategory)
    if (data.region) q = q.eq('region', data.region)
    if (data.event) q = q.eq('event', data.event)
    if (data.source) q = q.eq('source', data.source)
    const { data: events, error } = await q
    if (error) throw new Error(error.message)

    const { data: subs } = await context.supabase
      .from('boost_notify_subscriptions')
      .select('subcategory_id,region')

    const subscriberCounts: Record<string, number> = {}
    ;(subs ?? []).forEach((s) => {
      const key = `${s.subcategory_id}:${(s as { region: string }).region ?? '_all'}`
      subscriberCounts[key] = (subscriberCounts[key] ?? 0) + 1
    })

    const { data: statuses } = await context.supabase
      .from('boost_service_status')
      .select('subcategory_id,region,is_available,down_since,last_checked_at,last_error,manual_override')
      .order('subcategory_id')
      .order('region')

    return {
      events: (events ?? []) as BoostStatusEvent[],
      subscriberCounts,
      statuses: (statuses ?? []) as Array<{
        subcategory_id: BoostSubcatId
        region: BoostRegion
        is_available: boolean
        down_since: string | null
        last_checked_at: string | null
        last_error: string | null
        manual_override: 'force_up' | 'force_down' | null
      }>,
    }
  })

// ─── Admin: subscribers with profile info ──────────────────────────────
export type BoostSubscriber = {
  user_id: string
  subcategory_id: BoostSubcatId
  region: BoostRegion
  created_at: string
  display_name: string | null
  username: string | null
  telegram_username: string | null
  telegram_id: string | null
  avatar_url: string | null
}

export const adminListBoostSubscribers = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId)
    const { data, error } = await context.supabase
      .from('boost_notify_subscriptions')
      .select('user_id,subcategory_id,region,created_at')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    const ids = Array.from(new Set((data ?? []).map((r) => r.user_id as string)))
    if (!ids.length) return { subscribers: [] as BoostSubscriber[] }
    const { data: profiles } = await context.supabase
      .from('profiles')
      .select('id,display_name,username,telegram_username,telegram_id,avatar_url')
      .in('id', ids)
    const pmap = new Map<string, Record<string, string | null>>()
    ;(profiles ?? []).forEach((p) =>
      pmap.set(p.id as string, p as unknown as Record<string, string | null>),
    )
    return {
      subscribers: (data ?? []).map((r) => {
        const p = pmap.get(r.user_id as string) ?? {}
        return {
          user_id: r.user_id as string,
          subcategory_id: r.subcategory_id as BoostSubcatId,
          region: ((r as { region: string }).region ?? '_all') as BoostRegion,
          created_at: r.created_at as string,
          display_name: p.display_name ?? null,
          username: p.username ?? null,
          telegram_username: p.telegram_username ?? null,
          telegram_id: p.telegram_id ?? null,
          avatar_url: p.avatar_url ?? null,
        } as BoostSubscriber
      }),
    }
  })



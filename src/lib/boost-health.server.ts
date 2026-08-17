// Server-only helpers for the boost health check. Never import this from
// client-reachable modules at module scope — always `await import()` inside a
// server function or route handler.
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'

type SubcatId = 'followers' | 'likes' | 'views' | 'reposts' | 'bookmarks'
type RegionId = '_all' | 'global' | 'jp' | 'kr' | 'us'

function admin() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
  )
}

async function pingOnce(url: string, method: string, expect: number, timeoutMs = 8000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { method, signal: ctrl.signal })
    return { ok: res.status === expect, status: res.status, error: null as string | null }
  } catch (e) {
    return { ok: false, status: 0, error: (e as Error).message }
  } finally {
    clearTimeout(t)
  }
}

async function notifySubscribers(
  sb: ReturnType<typeof admin>,
  subcat: SubcatId,
  region: RegionId,
) {
  const { boostBackText, normalizeLang, sendTelegramMessage } = await import('./telegram-notify.server')

  const { data: subs } = await sb
    .from('boost_notify_subscriptions')
    .select('user_id')
    .eq('subcategory_id', subcat)
    .eq('region', region)

  if (!subs?.length) return { notified: 0 }

  const userIds = subs.map((s) => s.user_id as string)
  const { data: profiles } = await sb
    .from('profiles')
    .select('id,telegram_id,language')
    .in('id', userIds)

  let sent = 0
  for (const p of profiles ?? []) {
    const chatId = (p as { telegram_id: string | null }).telegram_id
    if (!chatId) continue
    const lang = normalizeLang((p as { language: string | null }).language)
    const text = boostBackText(subcat, region, lang)
    const r = await sendTelegramMessage(chatId, text)
    if (r.ok) sent += 1
  }

  await sb
    .from('boost_notify_subscriptions')
    .delete()
    .eq('subcategory_id', subcat)
    .eq('region', region)

  return { notified: sent }
}

export async function runHealthCheck(opts?: {
  onlySubcategory?: SubcatId
  onlyRegion?: RegionId
  forceNotify?: boolean
  source?: 'auto' | 'admin_ping' | 'admin_override'
}) {
  const sb = admin()
  const source = opts?.source ?? 'auto'
  let q = sb.from('boost_service_status').select('*')
  if (opts?.onlySubcategory) q = q.eq('subcategory_id', opts.onlySubcategory)
  if (opts?.onlyRegion) q = q.eq('region', opts.onlyRegion)
  const { data: rows, error } = await q
  if (error) return { checked: 0, notified: 0, error: error.message }

  let checked = 0
  let notified = 0
  const now = new Date().toISOString()

  for (const row of rows ?? []) {
    const subcat = row.subcategory_id as SubcatId
    const region = ((row as { region: string }).region ?? '_all') as RegionId
    const wasDown = !row.is_available
    let nextAvailable = row.is_available as boolean
    let lastError: string | null = row.last_error as string | null
    const override = (row.manual_override ?? null) as 'force_up' | 'force_down' | null

    if (override === 'force_down') {
      nextAvailable = false
    } else if (override === 'force_up') {
      nextAvailable = true
      lastError = null
    } else if (row.api_ping_url) {
      const r = await pingOnce(
        row.api_ping_url as string,
        (row.ping_method as string) || 'GET',
        (row.ping_expect_status as number) || 200,
      )
      nextAvailable = r.ok
      lastError = r.ok ? null : (r.error ?? `HTTP ${r.status}`)
      checked += 1
    } else {
      continue
    }

    type Patch = Database['public']['Tables']['boost_service_status']['Update']
    const patch: Patch = {
      is_available: nextAvailable,
      last_checked_at: now,
      last_error: lastError,
    }
    if (!nextAvailable && !row.down_since) patch.down_since = now
    if (nextAvailable) patch.down_since = null

    await sb
      .from('boost_service_status')
      .update(patch)
      .eq('subcategory_id', subcat)
      .eq('region', region)

    const cameBackUp = wasDown && nextAvailable
    const wentDown = !wasDown && !nextAvailable

    if (cameBackUp || (opts?.forceNotify && nextAvailable)) {
      const r = await notifySubscribers(sb, subcat, region)
      notified += r.notified
      if (cameBackUp) {
        await sb.from('boost_status_events').insert({
          subcategory_id: subcat,
          region,
          event: 'up',
          source,
          notified_count: r.notified,
        })
      }
    } else if (wentDown) {
      // Each outage starts with a fresh bell — clear any stale subscriptions.
      await sb
        .from('boost_notify_subscriptions')
        .delete()
        .eq('subcategory_id', subcat)
        .eq('region', region)
      await sb.from('boost_status_events').insert({
        subcategory_id: subcat,
        region,
        event: 'down',
        source,
        error: lastError,
      })
    }
  }

  return { checked, notified, error: null as string | null }
}

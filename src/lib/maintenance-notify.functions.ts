import { createServerFn } from '@tanstack/react-start'
import { createClient } from '@supabase/supabase-js'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import type { Database } from '@/integrations/supabase/types'

type AuthedSupabase = ReturnType<typeof createClient<Database>>

async function assertAdmin(sb: AuthedSupabase, uid: string) {
  const { data, error } = await sb.rpc('has_role', { _user_id: uid, _role: 'admin' })
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Forbidden')
}

export type MaintenanceSubscriber = {
  user_id: string
  created_at: string
  display_name: string | null
  username: string | null
  telegram_username: string | null
  telegram_id: string | null
  avatar_url: string | null
}

// ─── User: read/toggle own subscription ─────────────────────────────
export const getMyMaintenanceNotify = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('maintenance_notify_subscriptions')
      .select('user_id')
      .eq('user_id', context.userId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return { subscribed: !!data }
  })

export const setMaintenanceNotify = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { enabled: boolean }) => data)
  .handler(async ({ data, context }) => {
    if (data.enabled) {
      const { error } = await context.supabase
        .from('maintenance_notify_subscriptions')
        .upsert({ user_id: context.userId }, { onConflict: 'user_id' })
      if (error) throw new Error(error.message)
    } else {
      const { error } = await context.supabase
        .from('maintenance_notify_subscriptions')
        .delete()
        .eq('user_id', context.userId)
      if (error) throw new Error(error.message)
    }
    return { ok: true }
  })

// ─── Admin: list subscribers, send-all ──────────────────────────────
export const adminListMaintenanceSubscribers = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId)
    const { data, error } = await context.supabase
      .from('maintenance_notify_subscriptions')
      .select('user_id,created_at')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    const ids = (data ?? []).map((r) => r.user_id as string)
    if (!ids.length) return { subscribers: [] as MaintenanceSubscriber[] }
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
          created_at: r.created_at as string,
          display_name: p.display_name ?? null,
          username: p.username ?? null,
          telegram_username: p.telegram_username ?? null,
          telegram_id: p.telegram_id ?? null,
          avatar_url: p.avatar_url ?? null,
        } as MaintenanceSubscriber
      }),
    }
  })

export const adminNotifyMaintenanceSubscribers = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data: subs } = await supabaseAdmin
      .from('maintenance_notify_subscriptions')
      .select('user_id')
    if (!subs?.length) return { notified: 0, total: 0 }
    const ids = subs.map((s) => s.user_id as string)
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id,telegram_id,language')
      .in('id', ids)
    const { maintenanceBackText, normalizeLang, sendTelegramMessage } = await import(
      './telegram-notify.server'
    )
    let sent = 0
    for (const p of profiles ?? []) {
      const chatId = (p as { telegram_id: string | null }).telegram_id
      if (!chatId) continue
      const lang = normalizeLang((p as { language: string | null }).language)
      const text = maintenanceBackText(lang)
      const r = await sendTelegramMessage(chatId, text)
      if (r.ok) sent += 1
    }
    await supabaseAdmin
      .from('maintenance_notify_subscriptions')
      .delete()
      .in('user_id', ids)
    await supabaseAdmin.from('admin_audit_log').insert({
      admin_id: context.userId,
      action: 'maintenance_notify_send',
      target_type: 'maintenance',
      target_id: 'all',
      payload: { total: subs.length, sent },
    })
    return { notified: sent, total: subs.length }
  })

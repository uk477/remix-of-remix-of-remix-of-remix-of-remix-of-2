import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import type { XRefreshReport, XRefreshResult } from './x-refresh.server'

export type { XRefreshReport, XRefreshResult }

export type XSyncRun = {
  id: string
  source: string
  scope: string
  requested: number
  updated: number
  not_found: number
  failed: number
  skipped: number
  duration_ms: number
  started_at: string
  finished_at: string
}

/**
 * Force-refresh live X data (avatar/banner/name/counts/verification) for
 * follower + smart accounts. Manual: either selected ids or all.
 * The weekly automatic pass lives in /api/public/hooks/x-refresh.
 */
export const refreshAccountsFromX = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ids?: string[]; all?: boolean }) => ({
    ids: Array.isArray(input?.ids) ? input.ids.slice(0, 300) : [],
    all: Boolean(input?.all),
  }))
  .handler(async ({ data, context }): Promise<XRefreshReport> => {
    const { data: isAdmin } = await context.supabase.rpc('has_role', {
      _user_id: context.userId,
      _role: 'admin',
    })
    if (!isAdmin) throw new Error('Forbidden')

    const { runXRefresh } = await import('./x-refresh.server')
    return runXRefresh({ ids: data.ids, all: data.all, source: 'manual' })
  })

/** Last sync runs (admin only) — powers the "последняя проверка" panel. */
export const getXSyncRuns = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<XSyncRun[]> => {
    const { data: isAdmin } = await context.supabase.rpc('has_role', {
      _user_id: context.userId,
      _role: 'admin',
    })
    if (!isAdmin) throw new Error('Forbidden')

    const { data, error } = await context.supabase
      .from('x_sync_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10)
    if (error) throw new Error(error.message)
    return (data ?? []) as XSyncRun[]
  })

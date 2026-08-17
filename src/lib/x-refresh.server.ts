import { normalizeXHandle, verificationFromX } from './x-utils'

export type XRefreshResult = {
  id: string
  handle: string
  ok: boolean
  notFound?: boolean
  error?: string
  name?: string | null
  followers?: number
  verification?: 'none' | 'blue' | 'gold' | 'gray'
  year?: string
}

export type XRefreshReport = {
  requested: number
  updated: number
  notFound: number
  failed: number
  skipped: number
  results: XRefreshResult[]
}

type RunParams = {
  ids?: string[]
  all?: boolean
  /** 'manual' — из админки, 'cron' — еженедельная автопроверка */
  source?: 'manual' | 'cron'
}

/**
 * Core X refresh routine — shared by the admin server function and the weekly
 * cron route. Pulls live X data (name/avatar/counts/verification) and writes
 * the derived fields back to follower_accounts + x_profiles cache.
 */
export async function runXRefresh(params: RunParams): Promise<XRefreshReport> {
  const ids = Array.isArray(params.ids) ? params.ids.slice(0, 300) : []
  const all = Boolean(params.all)
  const source = params.source ?? 'manual'
  const startedAt = new Date()

  const apiKey = process.env['GETXAPI_API_KEY']
  if (!apiKey) throw new Error('GETXAPI_API_KEY is not configured')

  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

  let query = supabaseAdmin
    .from('follower_accounts')
    .select('id, account_url, name_en, category, verification')
  if (!all) {
    if (!ids.length) {
      return { requested: 0, updated: 0, notFound: 0, failed: 0, skipped: 0, results: [] }
    }
    query = query.in('id', ids)
  }
  const { data: rows, error } = await query
  if (error) throw new Error(error.message)

  const targets = (rows ?? []).map((r) => ({
    id: r.id as string,
    handle: normalizeXHandle(r.account_url as string | null),
    verification: (r.verification as 'none' | 'blue' | 'gold' | 'gray' | null) ?? null,
  }))

  const results: XRefreshResult[] = []
  let skipped = 0
  const work = targets.filter((t) => {
    if (!t.handle) {
      skipped += 1
      results.push({ id: t.id, handle: '', ok: false, error: 'Нет ссылки на X' })
      return false
    }
    return true
  })

  const nowIso = () => new Date().toISOString()

  async function runOne(t: {
    id: string
    handle: string
    verification: 'none' | 'blue' | 'gold' | 'gray' | null
  }) {
    const key = t.handle.toLowerCase()
    try {
      const res = await fetch(
        `https://api.getxapi.com/twitter/user/info?userName=${encodeURIComponent(key)}`,
        { headers: { Authorization: `Bearer ${apiKey}` } },
      )
      const body = await res.text()
      if (!res.ok) {
        if (res.status === 404) {
          await supabaseAdmin.from('x_profiles').upsert({
            username_key: key,
            user_name: t.handle,
            not_found: true,
            fetched_at: nowIso(),
          })
          await supabaseAdmin
            .from('follower_accounts')
            .update({ x_synced_at: nowIso(), x_sync_error: 'Аккаунт не найден в X' })
            .eq('id', t.id)
          results.push({ id: t.id, handle: t.handle, ok: false, notFound: true })
          return
        }
        await supabaseAdmin
          .from('follower_accounts')
          .update({ x_sync_error: `HTTP ${res.status}` })
          .eq('id', t.id)
        results.push({ id: t.id, handle: t.handle, ok: false, error: `HTTP ${res.status}` })
        return
      }

      const json = JSON.parse(body) as { data?: Record<string, unknown> }
      const u = json?.data
      if (!u) {
        await supabaseAdmin
          .from('follower_accounts')
          .update({ x_sync_error: 'Пустой ответ API' })
          .eq('id', t.id)
        results.push({ id: t.id, handle: t.handle, ok: false, error: 'Пустой ответ API' })
        return
      }

      const followers = Number(u.followers ?? 0)
      const isBlue = Boolean(u.isBlueVerified)
      const { resolveVerifiedType } = await import('./x-badge.server')
      const pinnedId = Array.isArray(u.pinnedTweetIds)
        ? String((u.pinnedTweetIds as unknown[])[0] ?? '')
        : ''
      const vType =
        ((u.verifiedType as string) ?? null) ||
        (isBlue ? await resolveVerifiedType(String(u.userName ?? t.handle), pinnedId) : null)


      const verification = verificationFromX(isBlue, vType, Boolean(u.isVerified), t.verification)
      const createdAt = (u.createdAt as string) ?? null
      const year = createdAt ? String(new Date(createdAt).getUTCFullYear()) : ''
      const handle = String(u.userName ?? t.handle)

      await supabaseAdmin.from('x_profiles').upsert({
        username_key: key,
        user_name: handle,
        name: (u.name as string) ?? null,
        avatar_url: (u.profilePicture as string) ?? null,
        banner_url: (u.coverPicture as string) ?? null,
        description: (u.description as string) ?? null,
        followers,
        following: Number(u.following ?? 0),
        is_blue_verified: isBlue,
        is_verified: Boolean(u.isVerified),
        verified_type: vType,
        joined_at: createdAt,
        not_found: false,
        fetched_at: nowIso(),
      })

      const patch: {
        followers: number
        verification: string
        x_synced_at: string
        x_sync_error: null
        year_range?: string
        account_url?: string
      } = {
        followers,
        verification,
        x_synced_at: nowIso(),
        x_sync_error: null,
      }
      if (year) patch.year_range = year
      // Handle может смениться — держим ссылку актуальной.
      if (handle && handle.toLowerCase() !== key) {
        patch.account_url = `https://x.com/${handle}`
      }
      await supabaseAdmin.from('follower_accounts').update(patch).eq('id', t.id)

      results.push({
        id: t.id,
        handle,
        ok: true,
        name: (u.name as string) ?? null,
        followers,
        verification,
        year,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка запроса'
      await supabaseAdmin
        .from('follower_accounts')
        .update({ x_sync_error: message })
        .eq('id', t.id)
      results.push({ id: t.id, handle: t.handle, ok: false, error: message })
    }
  }

  const CONCURRENCY = 4
  let cursor = 0
  async function worker() {
    while (cursor < work.length) {
      const t = work[cursor++]
      if (t) await runOne(t)
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, work.length) }, () => worker()))

  const report: XRefreshReport = {
    requested: targets.length,
    updated: results.filter((r) => r.ok).length,
    notFound: results.filter((r) => r.notFound).length,
    failed: results.filter((r) => !r.ok && !r.notFound && r.handle).length,
    skipped,
    results,
  }

  const finishedAt = new Date()
  await supabaseAdmin.from('x_sync_runs').insert({
    source,
    scope: all ? 'all' : 'selected',
    requested: report.requested,
    updated: report.updated,
    not_found: report.notFound,
    failed: report.failed,
    skipped: report.skipped,
    duration_ms: finishedAt.getTime() - startedAt.getTime(),
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
  })

  return report
}

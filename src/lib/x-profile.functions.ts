import { createServerFn } from '@tanstack/react-start'
import { normalizeXHandle, X_PROFILE_TTL_MS } from './x-utils'

export type XProfileRow = {
  username_key: string
  user_name: string
  name: string | null
  avatar_url: string | null
  banner_url: string | null
  description: string | null
  followers: number
  following: number
  is_blue_verified: boolean
  is_verified: boolean
  verified_type: string | null
  joined_at: string | null
  not_found: boolean
  fetched_at: string
}

export const syncXProfiles = createServerFn({ method: 'POST' })
  .inputValidator((input: { handles: string[]; force?: boolean }) => ({
    handles: (input?.handles ?? []).slice(0, 25),
    force: Boolean(input?.force),
  }))
  .handler(async ({ data }): Promise<XProfileRow[]> => {
    const keys = Array.from(
      new Set(data.handles.map((h) => normalizeXHandle(h).toLowerCase()).filter(Boolean)),
    )
    if (!keys.length) return []

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

    const { data: cached } = await supabaseAdmin
      .from('x_profiles')
      .select('*')
      .in('username_key', keys)

    const cachedRows = (cached ?? []) as XProfileRow[]
    const byKey = new Map(cachedRows.map((r) => [r.username_key, r]))

    const apiKey = process.env.GETXAPI_API_KEY
    const now = Date.now()
    const stale = keys.filter((k) => {
      const row = byKey.get(k)
      if (!row) return true
      if (data.force) return true
      return now - new Date(row.fetched_at).getTime() > X_PROFILE_TTL_MS
    })

    if (!apiKey || !stale.length) return cachedRows

    for (const key of stale) {
      try {
        const res = await fetch(
          `https://api.getxapi.com/twitter/user/info?userName=${encodeURIComponent(key)}`,
          { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(9000) },
        )
        const body = await res.text()
        if (!res.ok) {
          console.error(`GetXAPI failed for ${key} [${res.status}]: ${body}`)
          if (res.status === 404) {
            const row = {
              username_key: key,
              user_name: key,
              not_found: true,
              fetched_at: new Date().toISOString(),
            }
            await supabaseAdmin.from('x_profiles').upsert(row)
            byKey.set(key, { ...(byKey.get(key) as XProfileRow), ...row } as XProfileRow)
          }
          continue
        }

        const json = JSON.parse(body) as {
          status?: string
          data?: Record<string, unknown>
        }
        const u = json?.data
        if (!u) continue

        // GetXAPI never returns the badge colour; resolve it for free.
        const { resolveVerifiedType } = await import('./x-badge.server')
        const pinned = Array.isArray(u.pinnedTweetIds)
          ? String((u.pinnedTweetIds as unknown[])[0] ?? '')
          : ''
        const verifiedType =
          ((u.verifiedType as string) ?? null) ||
          (u.isBlueVerified ? await resolveVerifiedType(String(u.userName ?? key), pinned) : null)


        const row: XProfileRow = {
          username_key: key,
          user_name: String(u.userName ?? key),
          name: (u.name as string) ?? null,
          avatar_url: ((u.profilePicture as string) ?? '').replace('_400x400', '_400x400') || null,
          banner_url: (u.coverPicture as string) ?? null,
          description: (u.description as string) ?? null,
          followers: Number(u.followers ?? 0),
          following: Number(u.following ?? 0),
          is_blue_verified: Boolean(u.isBlueVerified),
          is_verified: Boolean(u.isVerified),
          verified_type: verifiedType,

          joined_at: (u.createdAt as string) ?? null,
          not_found: false,
          fetched_at: new Date().toISOString(),
        }
        await supabaseAdmin.from('x_profiles').upsert(row)
        byKey.set(key, row)
      } catch (err) {
        console.error(`GetXAPI error for ${key}:`, err)
      }
    }

    return Array.from(byKey.values())
  })

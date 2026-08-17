'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export type UserLite = {
  id: string
  display_name: string | null
  username: string | null
  telegram_username: string | null
  telegram_id: string | null
  avatar_url: string | null
  balance: number
}

export type UserMap = Record<string, UserLite>

export function useUserLookup(ids: string[]) {
  const [map, setMap] = useState<UserMap>({})
  const [loading, setLoading] = useState(false)
  const key = ids.slice().sort().join(',')

  const load = useCallback(async () => {
    if (!ids.length) {
      setMap({})
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id,display_name,username,telegram_username,telegram_id,avatar_url,balance')
      .in('id', ids)
    const next: UserMap = {}
    ;(data ?? []).forEach((r) => {
      next[r.id as string] = r as UserLite
    })
    setMap(next)
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    load()
  }, [load])

  return { map, loading, reload: load }
}

export function userDisplay(u: UserLite | undefined | null): string {
  if (!u) return 'Аноним'
  return (
    u.display_name ||
    (u.telegram_username ? '@' + u.telegram_username : '') ||
    (u.username ? '@' + u.username : '') ||
    (u.telegram_id ? 'tg:' + u.telegram_id : '') ||
    u.id.slice(0, 8)
  )
}

export function userSearchHaystack(u: UserLite | undefined | null): string {
  if (!u) return ''
  return [
    u.id,
    u.display_name ?? '',
    u.username ?? '',
    u.telegram_username ?? '',
    u.telegram_id ?? '',
  ]
    .join(' ')
    .toLowerCase()
}

// Resolve user IDs matching a free-form query (id / username / telegram)
export async function searchUserIds(query: string): Promise<string[]> {
  const q = query.trim().replace(/^@/, '')
  if (!q) return []
  // Exact id
  if (/^[0-9a-f-]{8,}$/i.test(q)) return [q]
  const like = `%${q}%`
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .or(
      [
        `display_name.ilike.${like}`,
        `username.ilike.${like}`,
        `telegram_username.ilike.${like}`,
        `telegram_id.ilike.${like}`,
      ].join(','),
    )
    .limit(200)
  return (data ?? []).map((r) => r.id as string)
}

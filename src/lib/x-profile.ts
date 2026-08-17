'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { syncXProfiles, type XProfileRow } from './x-profile.functions'
import { normalizeXHandle } from './x-utils'

export type XProfile = XProfileRow

export { normalizeXHandle }

const cache = new Map<string, XProfile>()
const inflight = new Set<string>()

/** Cron refreshes everything weekly — only fall back to the paid API past that. */
const STALE_MS = 7 * 24 * 60 * 60 * 1000

let prefetchPromise: Promise<void> | null = null
const subscribers = new Set<() => void>()

function notify() {
  subscribers.forEach((fn) => fn())
}

/**
 * Loads the whole x_profiles cache table in ONE request and fills the in-memory
 * map. Every card then renders final data on first paint instead of firing its
 * own query and flipping content a second later.
 */
export function prefetchXProfiles(): Promise<void> {
  if (prefetchPromise) return prefetchPromise
  prefetchPromise = (async () => {
    const { data } = await supabase.from('x_profiles').select('*')
    ;(data as XProfile[] | null)?.forEach((row) => {
      cache.set(row.username_key, row)
    })
    notify()
  })().catch(() => {
    // allow a later retry
    prefetchPromise = null
  })
  return prefetchPromise
}

/** Live X profile data (name, @handle, avatar, banner, counts) for a handle. */
export function useXProfile(rawHandle: string | undefined | null) {
  const key = normalizeXHandle(rawHandle).toLowerCase()
  const [profile, setProfile] = useState<XProfile | null>(() => cache.get(key) ?? null)

  useEffect(() => {
    let alive = true
    if (!key) {
      setProfile(null)
      return
    }
    setProfile(cache.get(key) ?? null)

    const sync = () => {
      if (alive) setProfile(cache.get(key) ?? null)
    }
    subscribers.add(sync)

    const run = async () => {
      // 1. One shared batch read for every card on screen.
      await prefetchXProfiles()
      const row = cache.get(key) ?? null
      if (alive) setProfile(row)

      // 2. Only hit the paid provider when the weekly sync left us with nothing.
      const stale = !row || Date.now() - new Date(row.fetched_at).getTime() > STALE_MS
      if (!stale || inflight.has(key)) return
      inflight.add(key)
      try {
        const rows = await syncXProfiles({ data: { handles: [key] } })
        const fresh = rows.find((r) => r.username_key === key)
        if (fresh) {
          cache.set(key, fresh)
          if (alive) setProfile(fresh)
        }
      } catch {
        /* ignore — fall back to manual data */
      } finally {
        inflight.delete(key)
      }
    }
    run()
    return () => {
      alive = false
      subscribers.delete(sync)
    }
  }, [key])

  return profile && !profile.not_found ? profile : null
}

/**
 * Cache-only variant: reads whatever the weekly sync already stored and never
 * calls the paid provider. Use it for cosmetic previews.
 */
export function useCachedXProfile(rawHandle: string | undefined | null) {
  const key = normalizeXHandle(rawHandle).toLowerCase()
  const [profile, setProfile] = useState<XProfile | null>(() => cache.get(key) ?? null)

  useEffect(() => {
    let alive = true
    if (!key) {
      setProfile(null)
      return
    }
    const sync = () => {
      if (alive) setProfile(cache.get(key) ?? null)
    }
    sync()
    subscribers.add(sync)
    prefetchXProfiles().then(sync)
    return () => {
      alive = false
      subscribers.delete(sync)
    }
  }, [key])

  return profile && !profile.not_found ? profile : null
}

/**
 * Fast path for the manual "Применить" action.
 * 1. In-memory cache (already warmed by prefetch) → instant, zero requests.
 * 2. One targeted row read from our own cache table → cheap, no paid API.
 * 3. Paid provider only when we have nothing or the row is older than a week.
 */
export async function loadXProfileFast(rawHandle: string): Promise<XProfile | null> {
  const key = normalizeXHandle(rawHandle).toLowerCase()
  if (!key) return null

  const fresh = (row: XProfile | null | undefined) =>
    !!row && Date.now() - new Date(row.fetched_at).getTime() <= STALE_MS

  const mem = cache.get(key)
  if (fresh(mem)) return mem!.not_found ? null : mem!

  if (!mem) {
    const { data } = await supabase
      .from('x_profiles')
      .select('*')
      .eq('username_key', key)
      .maybeSingle()
    const row = data as XProfile | null
    if (row) {
      cache.set(key, row)
      notify()
      if (fresh(row)) return row.not_found ? null : row
    }
  }

  const rows = await syncXProfiles({ data: { handles: [key] } })
  const row = rows.find((r) => r.username_key === key) ?? null
  if (row) {
    cache.set(key, row)
    notify()
  }
  return row && !row.not_found ? row : null
}

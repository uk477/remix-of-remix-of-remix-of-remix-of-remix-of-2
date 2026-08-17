'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './auth'

export type MaintenanceState = {
  enabled: boolean
  message_ru: string
  message_en: string
  eta: string | null
  updated_at: string
}

type MaintenanceContextType = {
  state: MaintenanceState | null
  loading: boolean
  whitelisted: boolean
  /** User is individually blocked from bot (independent of global state). */
  targeted: boolean
  /** Bot is blocked for this user (maintenance on AND not admin AND not whitelisted). */
  blocked: boolean
  /** True until state + own target/whitelist have been fetched at least once. */
  resolving: boolean
  /** Admin-only local preview: force-show the maintenance screen for testing. */
  previewClosed: boolean
  setPreviewClosed: (v: boolean) => void
  refresh: () => void
}

const PREVIEW_KEY = 'aurx_maint_preview'

const Ctx = createContext<MaintenanceContextType>({
  state: null,
  loading: true,
  whitelisted: false,
  targeted: false,
  blocked: false,
  resolving: true,
  previewClosed: false,
  setPreviewClosed: () => {},
  refresh: () => {},
})


export function MaintenanceProvider({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const userId = user?.id ?? null
  const [state, setState] = useState<MaintenanceState | null>(null)
  const [whitelisted, setWhitelisted] = useState(false)
  const [targeted, setTargeted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [wlLoaded, setWlLoaded] = useState(false)
  const [tgLoaded, setTgLoaded] = useState(false)
  const [tick, setTick] = useState(0)
  const [previewClosed, setPreviewClosedState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try { return window.localStorage.getItem(PREVIEW_KEY) === '1' } catch { return false }
  })
  const setPreviewClosed = useCallback((v: boolean) => {
    setPreviewClosedState(v)
    try {
      if (v) window.localStorage.setItem(PREVIEW_KEY, '1')
      else window.localStorage.removeItem(PREVIEW_KEY)
    } catch { /* ignore */ }
  }, [])

  const refresh = useCallback(() => setTick((t) => t + 1), [])


  // Load state
  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabase
        .from('maintenance_state')
        .select('enabled,message_ru,message_en,eta,updated_at')
        .eq('singleton', true)
        .maybeSingle()
      if (!cancelled) {
        setState((data as MaintenanceState) ?? null)
        setLoading(false)
      }
    }
    load()
    const ch = supabase
      .channel('maintenance-state')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maintenance_state' },
        () => load(),
      )
      .subscribe()
    return () => {
      cancelled = true
      supabase.removeChannel(ch)
    }
  }, [tick])

  // Load own whitelist row
  useEffect(() => {
    if (!userId) {
      setWhitelisted(false)
      setWlLoaded(true)
      return
    }
    let cancelled = false
    async function load() {
      const { data } = await supabase
        .from('maintenance_whitelist')
        .select('user_id')
        .eq('user_id', userId!)
        .maybeSingle()
      if (!cancelled) {
        setWhitelisted(!!data)
        setWlLoaded(true)
      }
    }
    load()
    const ch = supabase
      .channel('maintenance-wl-' + userId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maintenance_whitelist', filter: `user_id=eq.${userId}` },
        () => load(),
      )
      .subscribe()
    return () => {
      cancelled = true
      supabase.removeChannel(ch)
    }
  }, [userId, tick])

  // Load own target row (individual block)
  useEffect(() => {
    if (!userId) {
      setTargeted(false)
      setTgLoaded(true)
      return
    }
    let cancelled = false
    async function load() {
      const { data } = await supabase
        .from('maintenance_targets')
        .select('user_id')
        .eq('user_id', userId!)
        .maybeSingle()
      if (!cancelled) {
        setTargeted(!!data)
        setTgLoaded(true)
      }
    }
    load()
    const ch = supabase
      .channel('maintenance-tg-' + userId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maintenance_targets', filter: `user_id=eq.${userId}` },
        () => load(),
      )
      .subscribe()
    return () => {
      cancelled = true
      supabase.removeChannel(ch)
    }
  }, [userId, tick])

  const globalBlock = !!state?.enabled && !whitelisted
  const blocked = !isAdmin && !authLoading && (targeted || globalBlock)
  // Resolving: auth still loading, or (signed-in user) any of state/whitelist/target not fetched yet.
  const resolving =
    authLoading || loading || (!!userId && (!wlLoaded || !tgLoaded))

  return (
    <Ctx.Provider value={{ state, loading, whitelisted, targeted, blocked, resolving, previewClosed, setPreviewClosed, refresh }}>
      {children}
    </Ctx.Provider>
  )

}

export function useMaintenance() {
  return useContext(Ctx)
}
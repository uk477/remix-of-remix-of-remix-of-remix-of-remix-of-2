'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { repriceSupplierAccounts } from './data'
import {
  DEFAULT_DATED_MARKUP,
  DEFAULT_FRESH_MARKUP,
  DEFAULT_MIN_PRICE,
  getMarkup,
  setMarkup,
  type MarkupConfig,
} from './supplier-twitter'

export type PricingSettings = {
  fresh_markup: number
  dated_markup: number
  min_price: number
}

type PricingCtx = {
  settings: MarkupConfig
  loading: boolean
  /** Bumped on every change — use as a dependency to recompute prices. */
  version: number
  refresh: () => void
  save: (next: PricingSettings) => Promise<{ ok: boolean; error?: string }>
}

const Ctx = createContext<PricingCtx>({
  settings: { fresh: DEFAULT_FRESH_MARKUP, dated: DEFAULT_DATED_MARKUP, min: DEFAULT_MIN_PRICE },
  loading: true,
  version: 0,
  refresh: () => {},
  save: async () => ({ ok: false }),
})

export function PricingProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<MarkupConfig>(() => getMarkup())
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0)
  const [tick, setTick] = useState(0)

  const apply = useCallback((row: PricingSettings | null) => {
    const next = setMarkup({
      fresh: row ? Number(row.fresh_markup) : DEFAULT_FRESH_MARKUP,
      dated: row ? Number(row.dated_markup) : DEFAULT_DATED_MARKUP,
      min: row ? Number(row.min_price) : DEFAULT_MIN_PRICE,
    })
    repriceSupplierAccounts()
    setSettings(next)
    setVersion((v) => v + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabase
        .from('pricing_settings')
        .select('fresh_markup,dated_markup,min_price')
        .eq('singleton', true)
        .maybeSingle()
      if (cancelled) return
      apply((data as PricingSettings | null) ?? null)
      setLoading(false)
    }
    load()
    const ch = supabase
      .channel('pricing-settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pricing_settings' },
        () => load(),
      )
      .subscribe()
    return () => {
      cancelled = true
      supabase.removeChannel(ch)
    }
  }, [apply, tick])

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  const save = useCallback(
    async (next: PricingSettings) => {
      const { error } = await supabase
        .from('pricing_settings')
        .update({
          fresh_markup: next.fresh_markup,
          dated_markup: next.dated_markup,
          min_price: next.min_price,
          updated_at: new Date().toISOString(),
        })
        .eq('singleton', true)
      if (error) return { ok: false, error: error.message }
      apply(next)
      return { ok: true }
    },
    [apply],
  )

  return (
    <Ctx.Provider value={{ settings, loading, version, refresh, save }}>{children}</Ctx.Provider>
  )
}

export function usePricing() {
  return useContext(Ctx)
}

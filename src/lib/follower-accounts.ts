import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { AgedAccount, Localized, Verification } from './types'
import { isTopicId } from './topics'
import { prefetchXProfiles } from './x-profile'

export type SmartFollower = {
  label: string
  avatar_url?: string | null
}

export type FollowerAccountRow = {
  id: string
  slug: string | null
  name_ru: string
  name_en: string
  description_ru: string
  description_en: string
  description_enabled?: boolean
  year_range: string
  price_per_account: number
  stock: number
  followers: number
  smart_followers: number | null
  smart_followers_list?: SmartFollower[] | null
  verification: Verification
  badge_ru: string | null
  badge_en: string | null
  features: { ru: string; en: string }[]
  sort_order: number
  is_active: boolean
  created_at: string
  topic_id: string | null
  topic_ids: string[] | null
  account_url: string | null
  category: 'followers_acc' | 'smart_acc'
}

export type FollowerAccountInput = Omit<
  FollowerAccountRow,
  'id' | 'slug' | 'sort_order' | 'topic_ids' | 'smart_followers' | 'category' | 'created_at'
> & {
  sort_order?: number
  topic_ids: string[]
  smart_followers?: number | null
  smart_followers_list?: SmartFollower[] | null
  category?: 'followers_acc' | 'smart_acc'
}



let followerAccountsCache: FollowerAccountRow[] | null = null

function fillLocalized(ru: string, en: string): Localized {
  return { ru, en, ar: en, zh: en, es: en, tr: en, pt: en, fr: en, uk: ru }
}

export function rowToAccount(r: FollowerAccountRow): AgedAccount {
  return {
    id: r.id,
    category: r.category ?? 'followers_acc',
    name: fillLocalized(r.name_ru, r.name_en),
    description: fillLocalized(r.description_ru, r.description_en),
    descriptionEnabled: r.description_enabled ?? false,
    yearRange: r.year_range || '2020',
    pricePerAccount: Number(r.price_per_account),
    stock: r.stock,
    followers: r.followers || undefined,
    smartFollowers: r.smart_followers ?? undefined,
    smartFollowersList: Array.isArray(r.smart_followers_list)
      ? (r.smart_followers_list as SmartFollower[]).filter((x) => x && (x.label || x.avatar_url))
      : [],
    verification: r.verification,
    topicId: r.topic_id ?? undefined,
    topicIds: Array.isArray(r.topic_ids)
      ? r.topic_ids.filter((t): t is string => isTopicId(t))
      : r.topic_id && isTopicId(r.topic_id)
      ? [r.topic_id]
      : [],
    badge:
      r.badge_ru || r.badge_en
        ? fillLocalized(r.badge_ru || r.badge_en || '', r.badge_en || r.badge_ru || '')
        : undefined,
    features: (r.features ?? []).map((f) => fillLocalized(f.ru || f.en, f.en || f.ru)),
    sortOrder: r.sort_order,
    accountUrl: r.account_url ?? undefined,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : undefined,
  }
}


export function useFollowerAccounts() {
  const [rows, setRows] = useState<FollowerAccountRow[]>(() => followerAccountsCache ?? [])
  const [loading, setLoading] = useState(() => followerAccountsCache === null)

  const load = useCallback(async () => {
    // Fetch both datasets concurrently, but do not expose the account list until
    // the X-profile cache is ready. Otherwise the first detail open renders the
    // fallback profile while every later open uses the already-warmed cache.
    const [{ data, error }] = await Promise.all([
      supabase
        .from('follower_accounts')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
      prefetchXProfiles(),
    ])
    if (error) {
      console.error('[follower_accounts] load', error)
      setLoading(false)
      return
    }
    const nextRows = (data ?? []) as unknown as FollowerAccountRow[]
    followerAccountsCache = nextRows
    setRows(nextRows)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const ch = supabase
      .channel('follower_accounts_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'follower_accounts' },
        () => load(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [load])

  return { rows, loading, reload: load }
}

export async function createFollowerAccount(input: FollowerAccountInput) {
  let nextSort = input.sort_order
  if (nextSort == null) {
    const { data: minRow } = await supabase
      .from('follower_accounts')
      .select('sort_order')
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle()
    const min = minRow?.sort_order ?? 0
    // Put new card at the very top so admin sees it immediately.
    nextSort = min - 10
  }
  const { data, error } = await supabase
    .from('follower_accounts')
    .insert({
      name_ru: input.name_ru,
      name_en: input.name_en,
      description_ru: input.description_ru,
      description_en: input.description_en,
      description_enabled: input.description_enabled ?? false,
      year_range: input.year_range,
      price_per_account: input.price_per_account,
      stock: input.stock,
      followers: input.followers,
      verification: input.verification,
      badge_ru: input.badge_ru,
      badge_en: input.badge_en,
      features: input.features,
      is_active: input.is_active,
      topic_id: input.topic_id,
      topic_ids: input.topic_ids,
      account_url: input.account_url ?? null,
      smart_followers: input.smart_followers ?? null,
      smart_followers_list: input.smart_followers_list ?? [],
      category: input.category ?? 'followers_acc',
      sort_order: nextSort,
    })

    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateFollowerAccount(id: string, input: Partial<FollowerAccountInput>) {
  const { error } = await supabase.from('follower_accounts').update(input).eq('id', id)
  if (error) throw error
}

export async function deleteFollowerAccount(id: string) {
  const { error } = await supabase.from('follower_accounts').delete().eq('id', id)
  if (error) throw error
}

/**
 * Persist a new ordering. Writes sort_order = (i+1)*10 for every id.
 */
export async function reorderFollowerAccounts(orderedIds: string[]) {
  const updates = orderedIds.map((id, i) =>
    supabase.from('follower_accounts').update({ sort_order: (i + 1) * 10 }).eq('id', id),
  )
  const results = await Promise.all(updates)
  const failed = results.find((r) => r.error)
  if (failed?.error) throw failed.error
}

/**
 * Swap sort_order between two accounts.
 */
export async function swapFollowerAccounts(idA: string, idB: string) {
  const { data, error } = await supabase
    .from('follower_accounts')
    .select('id, sort_order')
    .in('id', [idA, idB])
  if (error) throw error
  const a = data?.find((r) => r.id === idA)
  const b = data?.find((r) => r.id === idB)
  if (!a || !b) throw new Error('Accounts not found')
  const [ra, rb] = await Promise.all([
    supabase.from('follower_accounts').update({ sort_order: b.sort_order }).eq('id', idA),
    supabase.from('follower_accounts').update({ sort_order: a.sort_order }).eq('id', idB),
  ])
  if (ra.error) throw ra.error
  if (rb.error) throw rb.error
}

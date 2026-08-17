import { SERVICES } from './data'
import type { Lang } from './types'

/**
 * "Custom account" builder — an aged X account assembled to order:
 * base account (by registration year) + followers pumped through the same
 * boost provider used by the Boost catalogue.
 *
 * Availability mirrors the boost `followers` service: when the provider is
 * down for a region, that audience (and the whole builder, if global is down)
 * is disabled exactly like in Boost.
 */

export const CUSTOM_MIN = 1000
export const CUSTOM_MAX = 20000
export const CUSTOM_STEP = 500

export type AudienceId = 'global' | 'jp' | 'kr' | 'us'

export type Audience = {
  id: AudienceId
  /** boost region key used by boost_service_status (`followers:<region>`) */
  region: 'global' | 'jp' | 'kr' | 'us'
  serviceId: string
  label: Record<'ru' | 'en', string>
  hint: Record<'ru' | 'en', string>
  flag: string
  pricePer1000: number
  perDay: number
}

function per1000(id: string, fallback: number) {
  return SERVICES.find((s) => s.id === id)?.pricePer1000 ?? fallback
}

export const AUDIENCES: Audience[] = [
  {
    id: 'global',
    region: 'global',
    serviceId: 'svc_glob_followers',
    label: { ru: 'Глобальные', en: 'Global' },
    hint: { ru: 'Аватарки, стабильно', en: 'With avatars, stable' },
    flag: '🌍',
    // Custom-account builder rate for global followers.
    pricePer1000: 2,
    perDay: 5000,
  },
  {
    id: 'us',
    region: 'us',
    serviceId: 'svc_us_followers',
    label: { ru: 'США', en: 'USA' },
    hint: { ru: 'Западная аудитория', en: 'Western audience' },
    flag: '🇺🇸',
    pricePer1000: per1000('svc_us_followers', 6.5),
    perDay: 1000,
  },
  {
    id: 'jp',
    region: 'jp',
    serviceId: 'svc_jp_followers',
    label: { ru: 'Япония', en: 'Japan' },
    hint: { ru: 'Локальная активность', en: 'Local activity' },
    flag: '🇯🇵',
    pricePer1000: per1000('svc_jp_followers', 5.5),
    perDay: 500,
  },
  {
    id: 'kr',
    region: 'kr',
    serviceId: 'svc_kr_followers',
    label: { ru: 'Корея', en: 'Korea' },
    hint: { ru: 'K-pop и KR-запуски', en: 'K-pop & KR launches' },
    flag: '🇰🇷',
    pricePer1000: per1000('svc_kr_followers', 5.9),
    perDay: 500,
  },
]

/** Base account tiers by registration year (price of the account itself). */
export type BaseTier = {
  id: string
  year: string
  price: number
  label: Record<'ru' | 'en', string>
}

export const BASE_TIERS: BaseTier[] = [
  { id: 'fresh', year: '2024–2026', price: 4, label: { ru: 'Свежий', en: 'Fresh' } },
  { id: 'mid', year: '2020–2023', price: 9, label: { ru: 'Отлежавшийся', en: 'Aged' } },
  { id: 'old', year: '2015–2019', price: 18, label: { ru: 'Старый', en: 'Old' } },
  { id: 'og', year: '2009–2014', price: 39, label: { ru: 'OG', en: 'OG' } },
]

/** Selectable registration years (2009 … 2026). */
export const YEARS: string[] = Array.from({ length: 2026 - 2009 + 1 }, (_, i) =>
  String(2009 + i),
)

/** Maps an exact registration year to its pricing tier. */
export function tierForYear(year: string): BaseTier {
  const y = Number(year)
  if (y >= 2024) return BASE_TIERS[0]
  if (y >= 2020) return BASE_TIERS[1]
  if (y >= 2015) return BASE_TIERS[2]
  return BASE_TIERS[3]
}

export type FollowingRangeId = '0-30' | '30-50' | '50-100' | '100-300' | '500+'

export const FOLLOWING_RANGES: { id: FollowingRangeId; label: string }[] = [
  { id: '0-30', label: '0–30' },
  { id: '30-50', label: '30–50' },
  { id: '50-100', label: '50–100' },
  { id: '100-300', label: '100–300' },
  { id: '500+', label: '500+' },
]

export function followingLabel(id: FollowingRangeId) {
  return FOLLOWING_RANGES.find((r) => r.id === id)?.label ?? id
}

export type PostCountRangeId = '0-50' | '50-100' | '100-500' | '500-1000' | '1000-10000+' | 'any'

export const POST_COUNT_RANGES: { id: PostCountRangeId; label: string; preview: number }[] = [
  { id: '0-50', label: '0–50', preview: 47 },
  { id: '50-100', label: '50–100', preview: 73 },
  { id: '100-500', label: '100–500', preview: 284 },
  { id: '500-1000', label: '500–1000', preview: 742 },
  { id: '1000-10000+', label: '1000–10000+', preview: 4231 },
  { id: 'any', label: 'Без разницы', preview: 1234 },
]

export function postCountLabel(id: PostCountRangeId) {
  return POST_COUNT_RANGES.find((r) => r.id === id)?.label ?? id
}

export function postCountPreview(id: PostCountRangeId) {
  return POST_COUNT_RANGES.find((r) => r.id === id)?.preview ?? 0
}

const FOLLOWING_BOUNDS: Record<FollowingRangeId, [number, number]> = {
  '0-30': [0, 30],
  '30-50': [30, 50],
  '50-100': [50, 100],
  '100-300': [100, 300],
  '500+': [500, 900],
}

const POST_BOUNDS: Record<PostCountRangeId, [number, number]> = {
  '0-50': [0, 50],
  '50-100': [50, 100],
  '100-500': [100, 500],
  '500-1000': [500, 1000],
  '1000-10000+': [1000, 10000],
  any: [80, 3000],
}

const randIn = ([min, max]: [number, number]) => min + Math.floor(Math.random() * (max - min + 1))

/** Random plausible following count inside the chosen range. */
export function randomFollowingCount(id: FollowingRangeId) {
  return randIn(FOLLOWING_BOUNDS[id] ?? [0, 30])
}

/** Random plausible post count inside the chosen range. */
export function randomPostCount(id: PostCountRangeId) {
  return randIn(POST_BOUNDS[id] ?? [0, 50])
}

export type ExtraId = 'verified' | 'design' | 'warmup'

export type Extra = {
  id: ExtraId
  price: number
  label: Record<'ru' | 'en', string>
  hint: Record<'ru' | 'en', string>
}

export const EXTRAS: Extra[] = [
  {
    id: 'verified',
    price: 14,
    label: { ru: 'Синяя галочка', en: 'Blue checkmark' },
    hint: { ru: 'Оформим верификацию на месяц', en: 'Verification for one month' },
  },
  {
    id: 'design',
    price: 9,
    label: { ru: 'Оформление профиля', en: 'Profile design' },
    hint: { ru: 'Аватар, шапка, био под нишу', en: 'Avatar, banner, niche bio' },
  },
  {
    id: 'warmup',
    price: 12,
    label: { ru: 'Прогрев 7 дней', en: '7-day warm-up' },
    hint: { ru: 'Посты и активность до выдачи', en: 'Posts and activity before handover' },
  },
]

/** Volume discount on the followers part. */
export function volumeDiscount(followers: number) {
  if (followers >= 15000) return 0.15
  if (followers >= 10000) return 0.1
  if (followers >= 5000) return 0.05
  return 0
}

export type CustomQuote = {
  basePrice: number
  followersPrice: number
  followersFull: number
  discount: number
  discountAmount: number
  extrasPrice: number
  total: number
  etaDays: number
}

export function quoteCustomAccount(input: {
  followers: number
  audience: Audience
  base: BaseTier
  extras: ExtraId[]
}): CustomQuote {
  const followers = Math.min(CUSTOM_MAX, Math.max(CUSTOM_MIN, input.followers))
  const followersFull = (followers / 1000) * input.audience.pricePer1000
  const discount = volumeDiscount(followers)
  const discountAmount = followersFull * discount
  const followersPrice = followersFull - discountAmount
  const extrasPrice = EXTRAS.filter((e) => input.extras.includes(e.id)).reduce(
    (s, e) => s + e.price,
    0,
  )
  const total = input.base.price + followersPrice + extrasPrice
  const etaDays = Math.max(1, Math.ceil(followers / input.audience.perDay))
  return {
    basePrice: input.base.price,
    followersPrice,
    followersFull,
    discount,
    discountAmount,
    extrasPrice,
    total,
    etaDays,
  }
}

export function customLang(lang: Lang): 'ru' | 'en' {
  return lang === 'ru' || lang === 'uk' ? 'ru' : 'en'
}

export function fmtFollowers(n: number) {
  if (n >= 1000) {
    const k = n / 1000
    return `${Number.isInteger(k) ? k : k.toFixed(1)}K`
  }
  return String(n)
}

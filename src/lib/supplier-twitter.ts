/**
 * Live supplier catalog snapshot (socialplatforms.org reseller API).
 * Base prices/stock are what the supplier charges us; retail price adds markup.
 */

/** Which supplier product the markup applies to. */
export type MarkupKind = 'fresh' | 'dated'

function envNum(raw: unknown, fallback: number): number {
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {}

/** Defaults (overridable via .env, then live-overridden from the admin panel). */
export const DEFAULT_FRESH_MARKUP = envNum(env['VITE_MARKUP_FRESH'], 2.5)
export const DEFAULT_DATED_MARKUP = envNum(env['VITE_MARKUP_DATED'], 2.0)
export const DEFAULT_MIN_PRICE = Number(env['VITE_MARKUP_MIN_PRICE']) >= 0 &&
  Number.isFinite(Number(env['VITE_MARKUP_MIN_PRICE']))
  ? Number(env['VITE_MARKUP_MIN_PRICE'])
  : 0

export type MarkupConfig = { fresh: number; dated: number; min: number }

let current: MarkupConfig = {
  fresh: DEFAULT_FRESH_MARKUP,
  dated: DEFAULT_DATED_MARKUP,
  min: DEFAULT_MIN_PRICE,
}

export function getMarkup(): MarkupConfig {
  return { ...current }
}

/** Live-update the markup (no reload/restart needed). */
export function setMarkup(next: Partial<MarkupConfig>): MarkupConfig {
  current = {
    fresh: next.fresh && next.fresh > 0 ? next.fresh : current.fresh,
    dated: next.dated && next.dated > 0 ? next.dated : current.dated,
    min: typeof next.min === 'number' && next.min >= 0 ? next.min : current.min,
  }
  return { ...current }
}

/** Backwards-compatible alias (old dated multiplier). */
export const SUPPLIER_MARKUP = DEFAULT_DATED_MARKUP
/** Minimum retail price per account. */
export const SUPPLIER_MIN_PRICE = DEFAULT_MIN_PRICE

export function retailPrice(base: number, kind: MarkupKind = 'dated'): number {
  const mult = kind === 'fresh' ? current.fresh : current.dated
  const raw = Math.max(base * mult, current.min)
  // exact multiplier, rounded up to the nearest cent
  return Math.ceil(raw * 100) / 100
}

export type SupplierYear = {
  year: number
  /** supplier price per account, USD */
  base: number
  stock: number
}

/** Old Dated Twitter Accounts — per creation year (supplier `old-dated-twitter-accounts`). */
export const SUPPLIER_OLD_DATED: SupplierYear[] = [
  { year: 2007, base: 10.0, stock: 484 },
  { year: 2008, base: 5.0, stock: 2539 },
  { year: 2009, base: 0.5, stock: 1340 },
  { year: 2010, base: 0.4, stock: 2594 },
  { year: 2011, base: 0.35, stock: 5681 },
  { year: 2012, base: 0.35, stock: 1095 },
  { year: 2013, base: 0.35, stock: 150 },
  { year: 2014, base: 0.35, stock: 332 },
  { year: 2015, base: 0.35, stock: 125 },
  { year: 2016, base: 0.35, stock: 109 },
  { year: 2017, base: 0.35, stock: 17 },
  { year: 2018, base: 0.35, stock: 0 },
  { year: 2019, base: 0.35, stock: 1 },
  { year: 2020, base: 0.35, stock: 5 },
  { year: 2021, base: 0.35, stock: 65 },
  { year: 2022, base: 0.35, stock: 36 },
  { year: 2023, base: 0.35, stock: 19 },
  { year: 2024, base: 0.35, stock: 24 },
  { year: 2025, base: 0.35, stock: 16 },
  { year: 2026, base: 15.2, stock: 2 },
]

/** Fresh Twitter Accounts — bulk blanks (supplier `fresh-twitter-accounts`). */
export const SUPPLIER_FRESH = {
  slug: 'fresh-twitter-accounts',
  base: 0.05,
  stock: 951,
  year: 2026,
}

export const SUPPLIER_TOTAL_STOCK =
  SUPPLIER_OLD_DATED.reduce((s, y) => s + y.stock, 0) + SUPPLIER_FRESH.stock

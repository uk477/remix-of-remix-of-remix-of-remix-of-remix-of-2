import type { Lang } from './types'

/**
 * Единая точка форматирования дат/времени.
 * Локаль подбирается по выбранному языку интерфейса — так пользователь видит
 * привычный для своей страны порядок «день/месяц», 12/24-часовой формат и
 * названия месяцев на родном языке.
 */
export const LOCALE_BY_LANG: Record<Lang, string> = {
  en: 'en-GB', // day-first, 24h — ближе к международной аудитории, чем en-US
  ru: 'ru-RU',
  ar: 'ar-EG',
  zh: 'zh-CN',
  es: 'es-ES',
  tr: 'tr-TR',
  pt: 'pt-PT',
  fr: 'fr-FR',
  uk: 'uk-UA',
}

/** Арабский по умолчанию рисует индо-арабские цифры — принудительно latn для читаемости сумм/ID. */
const NUMBERING_LATN: Partial<Record<Lang, boolean>> = { ar: true }

export function localeFor(lang: string | undefined | null): string {
  const key = (lang ?? 'en') as Lang
  const base = LOCALE_BY_LANG[key] ?? 'en-GB'
  return NUMBERING_LATN[key] ? `${base}-u-nu-latn` : base
}

function fmt(lang: string, opts: Intl.DateTimeFormatOptions) {
  try {
    return new Intl.DateTimeFormat(localeFor(lang), opts)
  } catch {
    return new Intl.DateTimeFormat('en-GB', opts)
  }
}

function toDate(value: number | string | Date): Date | null {
  const d = value instanceof Date ? value : new Date(value)
  return Number.isFinite(d.getTime()) ? d : null
}

/** 22 авг., 14:30 */
export function formatDateTime(value: number | string | Date, lang: string): string {
  const d = toDate(value)
  if (!d) return ''
  return fmt(lang, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/** 22 августа 2026 г. */
export function formatDateLong(value: number | string | Date, lang: string): string {
  const d = toDate(value)
  if (!d) return ''
  return fmt(lang, { day: '2-digit', month: 'long', year: 'numeric' }).format(d)
}

/** 22.08.2026 */
export function formatDateNumeric(value: number | string | Date, lang: string): string {
  const d = toDate(value)
  if (!d) return ''
  return fmt(lang, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
}

/** 22 авг. */
export function formatDateShort(value: number | string | Date, lang: string): string {
  const d = toDate(value)
  if (!d) return ''
  return fmt(lang, { day: 'numeric', month: 'short' }).format(d)
}

/** 14:30 (или 2:30 PM там, где это принято) */
export function formatTime(value: number | string | Date, lang: string): string {
  const d = toDate(value)
  if (!d) return ''
  return fmt(lang, { hour: '2-digit', minute: '2-digit' }).format(d)
}

/** 22 авг. 2026, 14:30 */
export function formatDateTimeFull(value: number | string | Date, lang: string): string {
  const d = toDate(value)
  if (!d) return ''
  return fmt(lang, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/** Числа в локальном формате разделителей. */
export function formatNumber(n: number, lang: string, opts?: Intl.NumberFormatOptions): string {
  try {
    return new Intl.NumberFormat(localeFor(lang), opts).format(n)
  } catch {
    return n.toLocaleString('en-US', opts)
  }
}

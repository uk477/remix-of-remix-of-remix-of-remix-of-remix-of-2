/**
 * Reads a custom ("под ключ") order specification — the meta captured by the
 * builder at checkout — into a flat, human-labelled list for the admin panel.
 * Admin needs to see the exact brief before touching status or delivery.
 */
import { AUDIENCES, fmtFollowers } from './custom-account'

export type SpecRow = {
  label: string
  value: string
  /** Media links get opened, not copied. */
  href?: string
  /** Media URL offered as a file download. */
  download?: string
  /** Text the admin will need to paste into X — show a copy button. */
  copy?: boolean
  /** Highlighted rows: things that change the fulfilment work. */
  accent?: boolean
}

const clean = (v?: string) => (v && v !== '—' && v.trim() !== '' ? v.trim() : '')

export function isCustomSpec(meta: Record<string, unknown> | null | undefined): boolean {
  if (!meta) return false
  const spec = meta['custom_account'] ?? meta['customAccount']
  return !!spec && typeof spec === 'object'
}

/** Pulls the spec object out of an order's meta, whatever shape it was stored in. */
export function customSpecOf(
  meta: Record<string, unknown> | null | undefined,
): Record<string, string> | null {
  if (!meta) return null
  const spec = (meta['custom_account'] ?? meta['customAccount']) as unknown
  if (spec && typeof spec === 'object' && !Array.isArray(spec)) {
    return Object.fromEntries(
      Object.entries(spec as Record<string, unknown>).map(([k, v]) => [k, String(v ?? '')]),
    )
  }
  return null
}

export function customSpecRows(spec: Record<string, string>): SpecRow[] {
  const rows: SpecRow[] = []
  const audience = AUDIENCES.find((a) => a.id === spec['audience'])
  const followers = Number(spec['followers']) || 0

  if (followers) rows.push({ label: 'Подписчики', value: fmtFollowers(followers), accent: true })
  if (spec['year']) rows.push({ label: 'Год регистрации', value: spec['year'], accent: true })
  if (audience) rows.push({ label: 'Аудитория', value: audience.label.ru })
  rows.push({
    label: 'Синяя галочка',
    value: spec['profile_verified'] === 'yes' ? 'Да — нужна верификация' : 'Не требуется',
    accent: spec['profile_verified'] === 'yes',
  })

  const name = clean(spec['profile_name'])
  const handle = clean(spec['profile_handle'])
  const bio = clean(spec['profile_bio'])
  if (name) rows.push({ label: 'Имя профиля', value: name, copy: true })
  if (handle) rows.push({ label: 'Юзернейм', value: handle, copy: true })
  if (bio) rows.push({ label: 'Описание (bio)', value: bio, copy: true })

  const following = clean(spec['profile_following'])
  const posts = clean(spec['profile_posts'])
  if (following) rows.push({ label: 'Подписки', value: following })
  if (posts) rows.push({ label: 'Посты', value: posts })

  const avatar = clean(spec['profile_avatar_url'])
  const banner = clean(spec['profile_banner_url'])
  if (avatar)
    rows.push({ label: 'Аватар', value: 'Открыть', href: avatar, download: avatar, copy: true })
  if (banner)
    rows.push({ label: 'Баннер', value: 'Открыть', href: banner, download: banner, copy: true })

  const extras = clean(spec['extras'])
  if (extras) rows.push({ label: 'Доп. опции', value: extras })
  const eta = clean(spec['eta'])
  if (eta) rows.push({ label: 'Срок, обещанный покупателю', value: `до ${eta} дн.` })

  return rows
}


/** One-line summary for order lists. */
export function customSpecSummary(spec: Record<string, string>): string {
  const parts = [
    Number(spec['followers']) ? fmtFollowers(Number(spec['followers'])) : '',
    spec['year'] ?? '',
    AUDIENCES.find((a) => a.id === spec['audience'])?.label.ru ?? '',
    spec['profile_verified'] === 'yes' ? 'галочка' : '',
  ].filter(Boolean)
  return parts.join(' · ')
}

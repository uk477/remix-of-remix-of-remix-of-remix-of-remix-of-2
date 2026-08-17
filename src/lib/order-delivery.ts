/**
 * Delivered-account payload helpers for the post-payment order page.
 * Field catalogue, quick templates and text formatting live here so the
 * screen stays presentational.
 */
import type { Lang } from './types'
import { countryName } from './countries'

export type DeliveredAccount = Record<string, string>

/**
 * Reserved key holding the supplier's per-item order id. Each account in a
 * batch is a separate purchase on the supplier side, so it carries its own id;
 * the batch ref only groups them. Prefixed with `__` so it never shows up in
 * the field catalogue, previews or exports.
 */
export const ITEM_ID_KEY = '__order_id'

/**
 * Reserved key: which mail provider the delivered mailbox belongs to. Chosen by
 * the admin per account, drives the buyer-side «Как войти в почту?» guide.
 */
export const MAIL_PROVIDER_KEY = '__mail'

export type MailProvider = 'firstmail' | 'gmail' | 'outlook'

export const MAIL_PROVIDERS: { id: MailProvider; label: string; host: string; url: string }[] = [
  { id: 'firstmail', label: 'FirstMail', host: 'firstmail.ltd', url: 'https://firstmail.ltd/login' },
  { id: 'gmail', label: 'Gmail', host: 'gmail.com', url: 'https://mail.google.com' },
  { id: 'outlook', label: 'Outlook / Hotmail', host: 'outlook.com', url: 'https://outlook.live.com' },
]

export function mailProvider(acc: DeliveredAccount): MailProvider | null {
  const raw = acc[MAIL_PROVIDER_KEY]
  return MAIL_PROVIDERS.some((p) => p.id === raw) ? (raw as MailProvider) : null
}

/**
 * Provider guessed from the delivered mailbox domain. Used as a fallback when
 * the admin never ticked a provider (or the flag was lost in an older payload),
 * so the buyer's «Как войти в почту?» guide never silently disappears.
 */
export function mailProviderFromDomain(acc: DeliveredAccount): MailProvider | null {
  const email = (acc['hotmail_email'] ?? acc['email'] ?? '').toLowerCase().trim()
  const domain = email.includes('@') ? email.split('@').pop()! : ''
  if (!domain) return null
  if (/(^|\.)firstmail\.|fmail|^firstmail/.test(domain)) return 'firstmail'
  if (/(^|\.)(gmail\.com|googlemail\.com)$/.test(domain)) return 'gmail'
  if (/(^|\.)(outlook\.|hotmail\.|live\.|msn\.)/.test(domain)) return 'outlook'
  return null
}

/** Explicit admin choice, falling back to the mailbox domain. */
export function effectiveMailProvider(acc: DeliveredAccount): MailProvider | null {
  return mailProvider(acc) ?? mailProviderFromDomain(acc)
}



/** Per-account order id, falling back to the batch ref when absent. */
export function accountOrderId(acc: DeliveredAccount, fallback: string): string {
  const own = acc[ITEM_ID_KEY]
  return (own && own.trim() ? own : fallback).replace(/^auto:/, '')
}

export type KnownFieldKey =
  | 'username'
  | 'password'
  | 'hotmail_email'
  | 'hotmail_pass'
  | 'phone'
  | 'ct0'
  | 'auth_token'
  | 'twofa'
  | 'date'
  | 'followers'
  | 'follows'
  | 'posts'
  | 'blue'
  | 'creation_country'
  | 'refresh_token'
  | 'client_id'

/**
 * A delivered field key. Catalogue keys are known, but the admin may also
 * invent arbitrary ones (`custom_1`, `proxy`, …) — hence the open string.
 */
export type FieldKey = KnownFieldKey | (string & {})



export const FIELD_ORDER: FieldKey[] = [
  'username',
  'password',
  'hotmail_email',
  'hotmail_pass',
  'phone',
  'ct0',
  'auth_token',
  'twofa',
  'date',
  'followers',
  'follows',
  'posts',
  'blue',
  'creation_country',
  'refresh_token',
  'client_id',
]

/** Human labels for the field catalogue (admin picker + buyer cards). */
export const FIELD_LABELS: Record<FieldKey, { ru: string; en: string }> = {
  username: { ru: 'Логин', en: 'Username' },
  password: { ru: 'Пароль', en: 'Password' },
  hotmail_email: { ru: 'Почта', en: 'Email' },
  hotmail_pass: { ru: 'Пароль почты', en: 'Email password' },
  phone: { ru: 'Телефон', en: 'Phone' },
  ct0: { ru: 'CT0', en: 'CT0' },
  auth_token: { ru: 'Auth token', en: 'Auth token' },
  twofa: { ru: '2FA', en: '2FA' },
  date: { ru: 'Дата создания', en: 'Created' },
  followers: { ru: 'Подписчики', en: 'Followers' },
  follows: { ru: 'Подписки', en: 'Following' },
  posts: { ru: 'Посты', en: 'Posts' },
  blue: { ru: 'Blue', en: 'Blue' },
  creation_country: { ru: 'Страна', en: 'Country' },
  refresh_token: { ru: 'Refresh token', en: 'Refresh token' },
  client_id: { ru: 'Client ID', en: 'Client ID' },
}

export function fieldLabel(f: FieldKey, lang?: string): string {
  const entry = FIELD_LABELS[f]
  if (!entry) return f
  return lang === 'ru' || lang === 'uk' ? entry.ru : entry.en
}

/**
 * Reserved key holding the admin-chosen field order for one delivered account,
 * as a comma-separated list. Lets the admin decide *which* fields the buyer
 * gets and in *what* order, per account. Absent → natural catalogue order.
 */
export const FIELDS_ORDER_KEY = '__fields'

/** Fields to show for one account: admin order when set, catalogue order else. */
export function accountFieldOrder(acc: DeliveredAccount): FieldKey[] {
  const raw = acc[FIELDS_ORDER_KEY]
  const present = (f: FieldKey) => {
    const v = acc[f]
    return v !== undefined && String(v).trim() !== ''
  }
  if (raw && raw.trim()) {
    const chosen = raw
      .split(',')
      .map((s) => s.trim())
      .filter((f) => f !== '' && !isReservedKey(f) && present(f))
    if (chosen.length) return chosen
  }
  const known = FIELD_ORDER.filter(present)
  const extra = Object.keys(acc).filter(
    (k) => !isReservedKey(k) && !FIELD_ORDER.includes(k as KnownFieldKey) && present(k),
  )
  return [...known, ...extra]
}

/** Reserved payload keys (`__…`) never surface as buyer-visible fields. */
export function isReservedKey(key: string): boolean {
  return key.startsWith('__')
}

/**
 * Reserved key holding per-account custom field captions as JSON
 * (`{"password":"Пароль X","custom_1":"Прокси"}`). The buyer's card, the copy
 * dumps and the spreadsheet all read from here, so a rename by the admin is
 * instantly reflected everywhere the client looks.
 */
export const LABELS_KEY = '__labels'

export function accountLabels(acc: DeliveredAccount): Record<string, string> {
  try {
    const parsed = JSON.parse(acc[LABELS_KEY] || '{}') as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    const out: Record<string, string> = {}
    Object.entries(parsed as Record<string, unknown>).forEach(([k, v]) => {
      if (typeof v === 'string' && v.trim()) out[k] = v.trim()
    })
    return out
  } catch {
    return {}
  }
}

/** Public fallback names for legacy supplier keys. */
export function publicFieldKey(f: FieldKey): string {
  return f === 'hotmail_pass' ? 'mail_pass' : f
}

/**
 * Exactly the caption the buyer sees for one field: the admin's custom name
 * when set, otherwise the raw payload key (the historical, frozen look).
 */
export function buyerFieldLabel(acc: DeliveredAccount, f: FieldKey): string {
  return accountLabels(acc)[f] || publicFieldKey(f)
}

/**
 * Column caption for dumps/spreadsheets: the admin's custom name when set,
 * otherwise the raw payload key — exactly what the buyer sees on the card.
 * Never invents a translated caption the admin never typed.
 */
export function exportHeader(
  accounts: DeliveredAccount[],
  f: FieldKey,
  fallback?: string,
  _lang?: string,
): string {
  for (const acc of accounts) {
    const custom = accountLabels(acc)[f]
    if (custom) return custom
  }
  return fallback ?? publicFieldKey(f)
}


/** Free-form key for a brand-new admin-invented field. */
export function customFieldKey(taken: string[]): string {
  let n = 1
  while (taken.includes(`custom_${n}`)) n += 1
  return `custom_${n}`
}

/** Fields hidden behind an eye toggle (credentials / tokens). */
export const SECRET_FIELDS = new Set<string>([

  'password',
  'hotmail_email',
  'hotmail_pass',
  'phone',
  'ct0',
  'auth_token',
  'twofa',
  'refresh_token',
  'client_id',
])

export type TemplateId = 'original' | 'login' | 'api'

export const TEMPLATES: { id: TemplateId; fields: FieldKey[] }[] = [
  { id: 'original', fields: FIELD_ORDER },

  { id: 'login', fields: ['username', 'password', 'hotmail_email', 'hotmail_pass', 'twofa'] },
  { id: 'api', fields: ['auth_token', 'ct0', 'refresh_token', 'client_id'] },
]

export function maskValue(value: string): string {
  const len = Math.min(Math.max(value.length, 6), 22)
  return '•'.repeat(len)
}

/** Normalize a stored field value for display / copy / export. */
export function displayValue(field: FieldKey, value: string): string {
  if (field === 'creation_country') return countryName(value)
  return value
}

export const DELIMITERS = [':', '|', ',', 'TAB', 'SPACE', ';'] as const
export type Delimiter = (typeof DELIMITERS)[number]

export function delimiterChar(d: Delimiter): string {
  if (d === 'TAB') return '\t'
  if (d === 'SPACE') return ' '
  return d
}

/** Labelled block per account, one `label: value` per line. */
export function formatReadable(
  accounts: DeliveredAccount[],
  fields: FieldKey[],
  _lang?: string,
): string {
  const single = accounts.length < 2
  const label = (acc: DeliveredAccount, f: FieldKey) =>
    accountLabels(acc)[f] || publicFieldKey(f)
  return accounts
    .map(
      (acc, i) =>
        `${single ? '' : `#${i + 1}\n`}${fields
          .map((f) => `${label(acc, f)}: ${displayValue(f, acc[f] ?? '')}`)
          .join('\n')}`,
    )
    .join('\n' + '─'.repeat(28) + '\n')
}



/** One line per account, values joined with the chosen delimiter. */
export function formatOriginal(
  accounts: DeliveredAccount[],
  fields: FieldKey[],
  delimiter: Delimiter,
): string {
  const sep = delimiterChar(delimiter)
  const single = accounts.length < 2
  return accounts
    .map((acc, i) => {
      const line = fields.map((f) => displayValue(f, acc[f] ?? '')).join(sep)
      return single ? line : `#${i + 1}\n${line}`
    })
    .join('\n\n')
}

export function formatAccounts(
  accounts: DeliveredAccount[],
  template: TemplateId,
  fields: FieldKey[],
  delimiter: Delimiter = ':',
  lang?: string,
): string {
  return template === 'original'
    ? formatReadable(accounts, fields, lang)
    : formatOriginal(accounts, fields, delimiter)
}


export function formatCsv(accounts: DeliveredAccount[], fields: FieldKey[]): string {
  const header = fields.map((f) => exportHeader(accounts, f)).join(',')

  const rows = accounts.map((acc) =>
    fields
      .map((f) => {
        const v = String(acc[f] ?? '')
        if (v.includes(',') || v.includes('"') || v.includes('\n')) {
          return `"${v.replace(/"/g, '""')}"`
        }
        return v
      })
      .join(','),
  )
  return [header, ...rows].join('\n')
}

/* ─── Local strings (ru/en; other languages fall back to en) ─────────────── */

type Str = { en: string; ru: string }

const S: Record<string, Str> = {
  back: { en: 'Back to Orders', ru: 'Назад к Заказам' },
  order_id: { en: 'Order ID', ru: 'Order ID' },
  items: { en: 'items', ru: 'Товары' },
  completed: { en: 'Completed', ru: 'Выполнен' },
  in_progress: { en: 'In progress', ru: 'В процессе' },
  waiting: { en: 'Waiting', ru: 'Ожидание' },
  guarantee_active: { en: 'Warranty until:', ru: 'Гарантия до:' },
  guarantee_expired: { en: 'Warranty expired:', ru: 'Гарантия истекла:' },
  preview_expired: { en: 'Preview: +48h', ru: 'Показать как через 48ч' },
  preview_expired_off: { en: 'Back to now', ru: 'Вернуть как сейчас' },
  email_access: { en: 'Get code from email', ru: 'Получить код с почты' },
  twofa_protect: { en: 'Get 2FA code', ru: 'Получить код 2FA' },
  gen_codes: { en: 'Open tool', ru: 'Открыть инструмент' },
  copy_all: { en: 'Copy all', ru: 'Копировать всё' },
  export_txt: { en: 'Export .txt', ru: 'Экспорт .txt' },
  hide_all: { en: 'Hide all', ru: 'Скрыть всё' },
  show_all: { en: 'Show all', ru: 'Показать всё' },
  format_title_single: { en: 'Export account', ru: 'Экспортировать аккаунт' },
  format_title_plural: { en: 'Export accounts', ru: 'Экспортировать аккаунты' },
  format_sub: { en: 'Configure the format and get the dump for {n} {acc}', ru: 'Настройте формат и получите выгрузку для {n} {acc}' },
  quick_templates: { en: 'Quick templates', ru: 'Быстрые шаблоны' },
  delimiter: { en: 'Delimiter', ru: 'Разделитель' },
  fields_order: { en: 'Fields & order', ru: 'Поля и порядок' },
  select_all: { en: 'Select all', ru: 'Выбрать все' },
  clear_all: { en: 'Clear all', ru: 'Снять все' },
  preview: { en: 'Preview', ru: 'Предпросмотр' },
  preview_more: {
    en: 'The preview shows the first 5 accounts. The remaining {n} are not displayed here — download the .txt or .xlsx file to see the full list.',
    ru: 'В предпросмотре показаны первые 5 аккаунтов. Остальные {n} здесь не отображаются — скачайте файл .txt или .xlsx, чтобы увидеть полный список.',
  },
  preview_hint: {
    en: 'Every field is labelled — tap a field to copy it.',
    ru: 'Каждое поле подписано — коснитесь поля, чтобы скопировать.',
  },
  copy_n: { en: 'Copy {n} accounts', ru: 'Копировать {n} аккаунтов' },
  download_txt: { en: 'DOWNLOAD .TXT', ru: 'СКАЧАТЬ В .TXT' },
  download_csv_sheets: { en: 'DOWNLOAD .XLSX (EXCEL / SHEETS)', ru: 'СКАЧАТЬ В .XLSX (EXCEL / ТАБЛИЦЫ)' },
  download_csv_hint: {
    en: 'Open with Google Sheets — not Google Docs',
    ru: 'Открывать в Google Таблицах, а не в Google Docs',
  },
  choose_format: { en: 'Choose a format to download your data', ru: 'Выберите подходящий формат для скачивания данных' },
  copied: { en: 'Copied', ru: 'Скопировано' },
  empty: {
    en: 'Account data will appear here right after delivery.',
    ru: 'Данные аккаунтов появятся здесь сразу после выдачи.',
  },
  order_title: { en: 'Order', ru: 'Заказ' },
  tpl_original: { en: 'Original', ru: 'Оригинал' },
  tpl_login: { en: 'Login', ru: 'Вход' },
  tpl_api: { en: 'API / Bot', ru: 'API / Бот' },
  tpl_info: { en: 'Account info', ru: 'Информация об аккаунте' },
}

export function ruAccountPlural(n: number): string {
  // Genitive forms after "для N ..."
  const last = n % 10
  const lastTwo = n % 100
  if (lastTwo >= 11 && lastTwo <= 14) return 'аккаунтов'
  if (last === 1) return 'аккаунта'
  return 'аккаунтов'
}

export function orderText(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const entry = S[key]
  if (!entry) return key
  const raw = lang === 'ru' || lang === 'uk' ? entry.ru : entry.en
  if (!vars) return raw
  return Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, String(v)), raw)
}

export function templateLabel(lang: Lang, id: TemplateId): string {
  return orderText(lang, `tpl_${id}`)
}
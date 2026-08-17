/** Client-side helpers for the free developer tools (all run locally). */

// ── Base32 / TOTP ──────────────────────────────────────────────────────
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Decode(input: string): Uint8Array {
  const clean = input.replace(/[\s=-]/g, '').toUpperCase()
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const ch of clean) {
    const idx = B32.indexOf(ch)
    if (idx === -1) throw new Error('Invalid base32 character: ' + ch)
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bits -= 8
      out.push((value >>> bits) & 0xff)
    }
  }
  return new Uint8Array(out)
}

/** Extracts the secret from a raw key or an otpauth:// URI. */
export function normalizeTotpSecret(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.toLowerCase().startsWith('otpauth://')) {
    try {
      const u = new URL(trimmed)
      return u.searchParams.get('secret') ?? ''
    } catch {
      return ''
    }
  }
  return trimmed.replace(/\s+/g, '')
}

/**
 * Structural check for a TOTP secret. A random string of A-Z/2-7 letters is
 * technically decodable base32, so without this the tool happily produced a
 * code for garbage input. Real 2FA keys use the base32 alphabet, are at least
 * 16 chars long and have a byte-aligned length.
 */
export function validateTotpSecret(secret: string): string | null {
  const clean = secret.replace(/[\s=-]/g, '').toUpperCase()
  if (!clean) return 'Enter a secret key'
  const bad = [...clean].find((ch) => B32.indexOf(ch) === -1)
  if (bad) return `Invalid character in key: “${bad}”`
  if (clean.length < 16) return 'Key is too short — real 2FA keys are 16+ characters'
  if (clean.length > 128) return 'Key is too long to be a valid 2FA secret'
  // A TOTP secret is random key material. Repetitive strings made from valid
  // Base32 letters (for example ERGERGERGERG...) are decodable, but are not
  // credible secrets. The upstream API generates a code for any decodable
  // Base32 input, so reject obvious low-entropy garbage before calling it.
  if (new Set(clean).size < Math.min(8, Math.floor(clean.length / 2))) {
    return 'Invalid secret key'
  }
  // Valid base32 chunk remainders: 0, 2, 4, 5, 7 characters.
  if (![0, 2, 4, 5, 7].includes(clean.length % 8)) {
    return 'This is not a valid 2FA key — wrong length'
  }
  return null
}

export async function generateTotp(
  secret: string,
  opts: { digits?: number; period?: number; at?: number } = {},
): Promise<string> {
  const digits = opts.digits ?? 6
  const period = opts.period ?? 30
  const counter = Math.floor((opts.at ?? Date.now()) / 1000 / period)
  const key = base32Decode(secret)
  if (!key.length) throw new Error('Empty secret')

  const msg = new Uint8Array(8)
  let c = counter
  for (let i = 7; i >= 0; i--) {
    msg[i] = c & 0xff
    c = Math.floor(c / 256)
  }
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as unknown as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, msg as unknown as ArrayBuffer))
  const offset = sig[sig.length - 1] & 0x0f
  const bin =
    ((sig[offset] & 0x7f) << 24) |
    (sig[offset + 1] << 16) |
    (sig[offset + 2] << 8) |
    sig[offset + 3]
  return String(bin % 10 ** digits).padStart(digits, '0')
}

export function totpRemaining(period = 30): number {
  return period - (Math.floor(Date.now() / 1000) % period)
}

// ── Base64 ─────────────────────────────────────────────────────────────
export function b64Encode(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin)
}

export function b64Decode(text: string): string {
  const bin = atob(text.replace(/\s+/g, ''))
  const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

// ── JSON ───────────────────────────────────────────────────────────────
export function formatJson(text: string, indent = 2): string {
  return JSON.stringify(JSON.parse(text), null, indent)
}

export function minifyJson(text: string): string {
  return JSON.stringify(JSON.parse(text))
}

// ── Password generator ─────────────────────────────────────────────────
export type PwOptions = {
  length: number
  upper: boolean
  lower: boolean
  digits: boolean
  symbols: boolean
}

export function generatePassword(o: PwOptions): string {
  let pool = ''
  if (o.upper) pool += 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  if (o.lower) pool += 'abcdefghijkmnopqrstuvwxyz'
  if (o.digits) pool += '23456789'
  if (o.symbols) pool += '!@#$%^&*()-_=+[]{}<>?'
  if (!pool) pool = 'abcdefghijkmnopqrstuvwxyz'
  const bytes = new Uint32Array(o.length)
  crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < o.length; i++) out += pool[bytes[i] % pool.length]
  return out
}

// ── Cookie parser ──────────────────────────────────────────────────────
export type ParsedCookie = { name: string; value: string }

export function parseCookies(raw: string): ParsedCookie[] {
  const text = raw.trim()
  if (!text) return []
  // JSON export (EditThisCookie / Cookie-Editor)
  if (text.startsWith('[') || text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text)
      const arr = Array.isArray(parsed) ? parsed : [parsed]
      return arr
        .filter((c) => c && typeof c === 'object')
        .map((c) => ({ name: String(c.name ?? ''), value: String(c.value ?? '') }))
        .filter((c) => c.name)
    } catch {
      /* fall through to header parsing */
    }
  }
  return text
    .split(/;|\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const i = part.indexOf('=')
      return i === -1
        ? { name: part, value: '' }
        : { name: part.slice(0, i).trim(), value: part.slice(i + 1).trim() }
    })
    .filter((c) => c.name)
}

export function cookiesToHeader(cookies: ParsedCookie[]): string {
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ')
}

// ── Timestamp ──────────────────────────────────────────────────────────
export function parseTimestampInput(raw: string): Date | null {
  const text = raw.trim()
  if (!text) return null
  if (/^\d+$/.test(text)) {
    const n = Number(text)
    // seconds vs milliseconds vs microseconds
    const ms = text.length <= 10 ? n * 1000 : text.length <= 13 ? n : Math.floor(n / 1000)
    const d = new Date(ms)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const d = new Date(text)
  return Number.isNaN(d.getTime()) ? null : d
}

// ── Hotmail credential line ────────────────────────────────────────────
export type MailCreds = { email: string; password: string; refresh_token: string; client_id: string }

/** Parses `email:pass:refresh_token:client_id` (extra colons kept in token). */
export function parseMailLine(line: string): MailCreds | null {
  const parts = line.trim().split(/[:|]/).filter(Boolean)
  if (parts.length < 4) return null
  const [email, password, refresh_token, ...rest] = parts
  return {
    email,
    password,
    refresh_token,
    client_id: rest.join(':'),
  }
}
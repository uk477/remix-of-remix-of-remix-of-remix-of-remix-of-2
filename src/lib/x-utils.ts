import type { Verification } from './types'

export function normalizeXHandle(raw: string | undefined | null): string {
  if (!raw) return ''
  return raw
    .trim()
    .replace(/^@/, '')
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/^(x|twitter)\.com\//i, '')
    .split(/[/?#]/)[0]
    .replace(/[^A-Za-z0-9_]/g, '')
    .slice(0, 15)
}

function trimCompact(value: number) {
  // Keep up to two decimals without rounding the real count upward:
  // 3,969,999 -> 3.96кк, 3,900,000 -> 3.9кк.
  const t = Math.floor(value * 100) / 100
  return t.toFixed(2).replace(/\.0+$|(?<=\.[0-9])0$/, '')
}


export function formatCompactFollowers(n: number): string {
  if (n >= 1_000_000) return `${trimCompact(n / 1_000_000)}кк`
  if (n >= 1_000) return `${trimCompact(n / 1_000)}к`
  return String(n)
}

// Latin variant used inside the account detail view: 3.96M / 23.5K
export function formatCompactFollowersLatin(n: number): string {
  if (n >= 1_000_000) return `${trimCompact(n / 1_000_000)}M`
  if (n >= 1_000) return `${trimCompact(n / 1_000)}K`
  return String(n)
}

export function verificationFromX(
  isBlueVerified: boolean | undefined,
  verifiedType: string | null | undefined,
  isVerified?: boolean,
  current?: Verification | null,
): Verification {
  const type = (verifiedType ?? '').toLowerCase()
  if (type === 'business' || type === 'organization') return 'gold'
  if (type === 'government') return 'gray'
  // The provider only exposes `isBlueVerified` and never the badge colour,
  // so an existing manual choice (gold / gray) must win over a blind "blue".
  if (isBlueVerified || isVerified) {
    if (current === 'gold' || current === 'gray') return current
    return isBlueVerified ? 'blue' : 'gray'
  }
  return 'none'
}

export const X_PROFILE_TTL_MS = 6 * 60 * 60 * 1000
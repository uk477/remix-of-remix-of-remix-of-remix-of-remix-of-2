// Mock referrals + earnings data. Deterministic so numbers don't jitter.

export type ReferralTx = {
  id: string
  date: number // ms
  spent: number // USD user spent that day
  earned: number // your 5% cut that day
}

export type Referral = {
  id: string
  name: string
  username: string
  avatarUrl?: string
  bio?: string
  initial: string
  hue: number
  joinedAt: number // ms
  spent: number
  earned: number
  transactions: ReferralTx[]
}

export type EarningPoint = {
  date: number // ms (bucket start)
  amount: number
}

const DAY = 24 * 60 * 60 * 1000

type Row = {
  id: string
  name: string
  username: string
  bio?: string
  initial: string
  hue: number
  daysAgo: number
  spent: number
  earned: number
}

const ROWS: Row[] = [
  { id: 'r1', name: 'Alex Morozov',   username: 'alex_mrz',    bio: 'Product designer · Moscow', initial: 'A', hue: 32,  daysAgo: 2,   spent: 18.4, earned: 0.92 },
  { id: 'r2', name: 'Дарья К.',       username: 'daria_k',     bio: 'Marketing @ small studio', initial: 'Д', hue: 340, daysAgo: 6,   spent: 12.0, earned: 0.60 },
  { id: 'r3', name: 'Yusuf A.',       username: 'yusuf99',     bio: 'Crypto & football', initial: 'Y', hue: 150, daysAgo: 11,  spent: 7.20, earned: 0.36 },
  { id: 'r4', name: 'Mia Chen',       username: 'mia.chen',    bio: 'SMM manager', initial: 'M', hue: 265, daysAgo: 18,  spent: 24.5, earned: 1.22 },
  { id: 'r5', name: 'Иван Петров',    username: 'ivanp',       bio: 'Разработчик, Петербург', initial: 'И', hue: 210, daysAgo: 27,  spent: 3.60, earned: 0.18 },
  { id: 'r6', name: 'Layla H.',       username: 'layla.h',     bio: 'Just looking around', initial: 'L', hue: 20,  daysAgo: 41,  spent: 0.00, earned: 0.00 },
  { id: 'r7', name: 'Никита С.',      username: 'nkt_s',       bio: 'TG-каналы, автомобили', initial: 'Н', hue: 190, daysAgo: 63,  spent: 2.80, earned: 0.14 },
]

// Deterministic pseudo-random from seed
function rand(seed: number): number {
  const s = Math.sin(seed) * 43758.5453
  return s - Math.floor(s)
}

function buildTransactions(row: Row, joinedAt: number, now: number): ReferralTx[] {
  if (row.spent === 0) return []
  const txs: ReferralTx[] = []
  // Spread across the elapsed days since join. 2–6 tx typically.
  const seedBase = row.id.charCodeAt(1) * 131
  const count = Math.min(6, Math.max(2, Math.round(rand(seedBase) * 5) + 1))
  // Weights determine tx amount distribution
  const weights: number[] = []
  let wSum = 0
  for (let i = 0; i < count; i++) {
    const w = 0.4 + rand(seedBase + i * 7) * 1.2
    weights.push(w); wSum += w
  }
  const elapsed = Math.max(1, Math.floor((now - joinedAt) / DAY))
  for (let i = 0; i < count; i++) {
    const dayOffset = Math.floor((i / Math.max(1, count - 1)) * (elapsed - 1))
    const date = joinedAt + dayOffset * DAY + Math.floor(rand(seedBase + 99 + i) * DAY * 0.6)
    const spent = +(row.spent * (weights[i] / wSum)).toFixed(2)
    const earned = +(spent * 0.05).toFixed(2)
    txs.push({ id: `${row.id}_tx${i}`, date, spent, earned })
  }
  // Sort newest first
  return txs.sort((a, b) => b.date - a.date)
}

// Base "now" — recomputed at read time via function to keep dates fresh-ish.
export function getReferrals(): Referral[] {
  const now = Date.now()
  return ROWS.map((r) => {
    const joinedAt = now - r.daysAgo * DAY
    return {
      id: r.id,
      name: r.name,
      username: r.username,
      bio: r.bio,
      initial: r.initial,
      hue: r.hue,
      joinedAt,
      spent: r.spent,
      earned: r.earned,
      transactions: buildTransactions(r, joinedAt, now),
    }
  })
}

// Daily earnings for the last 90 days (deterministic pseudo-random).
export function getEarningsSeries(): EarningPoint[] {
  const now = Date.now()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const startMs = start.getTime()

  const out: EarningPoint[] = []
  for (let i = 89; i >= 0; i--) {
    const s = Math.sin(i * 1.37) * 43758.5453
    const r = s - Math.floor(s)
    const zero = ((i * 7) % 5) === 0
    const amount = zero ? 0 : +(r * 0.55 + 0.02).toFixed(2)
    out.push({ date: startMs - i * DAY, amount })
  }
  out[out.length - 1] = { date: startMs, amount: 0.31 }
  return out
}

export type Period = '24h' | 'week' | 'month' | 'all'

export function filterSeries(series: EarningPoint[], period: Period): EarningPoint[] {
  const now = Date.now()
  const cutoff =
    period === '24h' ? now - DAY :
    period === 'week' ? now - 7 * DAY :
    period === 'month' ? now - 30 * DAY :
    0
  return series.filter((p) => p.date >= cutoff)
}

export function sumSeries(points: EarningPoint[]): number {
  return points.reduce((s, p) => s + p.amount, 0)
}

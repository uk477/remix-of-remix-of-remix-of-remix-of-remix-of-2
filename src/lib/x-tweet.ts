'use client'

import { fetchXTweet, type XTweetRow } from './x-tweet.functions'

export type XTweet = XTweetRow

const mem = new Map<string, { row: XTweet; at: number }>()
const inflight = new Map<string, Promise<XTweet | null>>()

/** Same window as the server cache — avoids duplicate round-trips per session. */
const MEM_TTL_MS = 10 * 60 * 1000

/** Pull the numeric status id out of any x.com / twitter.com post link. */
export function extractTweetId(input: string): string {
  const m = String(input ?? '').match(/status(?:es)?\/(\d{5,25})/i)
  if (m) return m[1]
  const bare = String(input ?? '').trim()
  return /^\d{5,25}$/.test(bare) ? bare : ''
}

/**
 * Manual-only tweet loader used by the "Применить" button.
 * 1. In-memory hit → instant, zero requests.
 * 2. Server fn → reads our own cache table, calls the paid API only when the
 *    row is missing or older than 10 minutes.
 */
export async function loadXTweetFast(rawUrl: string): Promise<XTweet | null> {
  const id = extractTweetId(rawUrl)
  if (!id) return null

  const hit = mem.get(id)
  if (hit && Date.now() - hit.at <= MEM_TTL_MS) return hit.row.not_found ? null : hit.row

  const pending = inflight.get(id)
  if (pending) return pending

  const promise = (async () => {
    try {
      const row = await fetchXTweet({ data: { id } })
      if (row) mem.set(id, { row, at: Date.now() })
      return row && !row.not_found ? row : null
    } finally {
      inflight.delete(id)
    }
  })()
  inflight.set(id, promise)
  return promise
}

/** X API отдаёт текст с HTML-энтити (&gt; &amp; &#39;) — раскодируем как в самом X. */
export function decodeTweetText(raw: string | null | undefined): string {
  let s = String(raw ?? '')
  if (!s) return ''
  s = s.replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
  s = s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
  s = s
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
  return s
}

/** Цвет галочки как в X: синяя / золотая (бизнес) / серая (гос). */
export function verifiedTone(t: {
  is_blue_verified?: boolean | null
  is_verified?: boolean | null
  verified_type?: string | null
}): string | null {
  const type = (t.verified_type ?? '').toLowerCase()
  if (!t.is_blue_verified && !t.is_verified && !type) return null
  if (type === 'business' || type === 'organization') return 'text-[#e2b719]'
  if (type === 'government') return 'text-[#829aab]'
  return 'text-[#1d9bf0]'
}

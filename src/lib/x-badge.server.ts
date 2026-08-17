/**
 * GetXAPI never exposes the badge colour (it only returns `isBlueVerified`),
 * so every account looked blue — including gold (business/organization) and
 * gray (government) ones. Two free public sources do expose it, so we use
 * them and fall back silently when unavailable. No GetXAPI credits are spent.
 */
export type XVerifiedType = 'Business' | 'Government' | null

function normalizeType(raw: string | null | undefined): XVerifiedType {
  const t = (raw ?? '').toLowerCase()
  if (t === 'business' || t === 'organization') return 'Business'
  if (t === 'government') return 'Government'
  return null
}

/** Resolve the badge type straight from a username (fxtwitter mirror). */
export async function fetchVerifiedTypeByUsername(
  username: string | null | undefined,
): Promise<XVerifiedType> {
  const name = String(username ?? '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 15)
  if (!name) return null
  try {
    const res = await fetch(`https://api.fxtwitter.com/${name}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const json = (await res.json()) as { user?: { verification?: { type?: string } } }
    return normalizeType(json?.user?.verification?.type)
  } catch {
    return null
  }
}

/** Fallback: X's own syndication endpoint, keyed by a tweet id. */
export async function fetchVerifiedTypeByTweet(
  tweetId: string | null | undefined,
): Promise<XVerifiedType> {
  const id = String(tweetId ?? '').replace(/\D/g, '')
  if (!id) return null
  try {
    const res = await fetch(
      `https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=a&lang=en`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      },
    )
    if (!res.ok) return null
    const json = (await res.json()) as { user?: { verified_type?: string } }
    return normalizeType(json?.user?.verified_type)
  } catch {
    return null
  }
}

/** Best-effort resolution: username first, tweet id as backup. */
export async function resolveVerifiedType(
  username: string | null | undefined,
  tweetId?: string | null,
): Promise<XVerifiedType> {
  return (await fetchVerifiedTypeByUsername(username)) ?? (await fetchVerifiedTypeByTweet(tweetId))
}

import { createServerFn } from '@tanstack/react-start'

export type XTweetRow = {
  tweet_id: string
  author_username: string | null
  author_name: string | null
  author_avatar_url: string | null
  is_blue_verified: boolean
  verified_type: string | null
  text: string | null
  like_count: number
  retweet_count: number
  reply_count: number
  quote_count: number
  view_count: number
  bookmark_count: number
  posted_at: string | null
  not_found: boolean
  fetched_at: string
}

/** Engagement moves fast, but not that fast — 10 minutes keeps API spend low. */
const TWEET_TTL_MS = 10 * 60 * 1000

export const fetchXTweet = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string; force?: boolean }) => ({
    id: String(input?.id ?? '').replace(/\D/g, '').slice(0, 25),
    force: Boolean(input?.force),
  }))
  .handler(async ({ data }): Promise<XTweetRow | null> => {
    if (!data.id) return null

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

    const { data: cached } = await supabaseAdmin
      .from('x_tweets')
      .select('*')
      .eq('tweet_id', data.id)
      .maybeSingle()

    const cachedRow = (cached ?? null) as XTweetRow | null
    const fresh =
      cachedRow && Date.now() - new Date(cachedRow.fetched_at).getTime() <= TWEET_TTL_MS

    if (cachedRow && fresh && !data.force) return cachedRow

    const apiKey = process.env['GETXAPI_API_KEY']
    if (!apiKey) return cachedRow

    try {
      const res = await fetch(
        `https://api.getxapi.com/twitter/tweet/detail?id=${encodeURIComponent(data.id)}`,
        { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(9000) },
      )
      const body = await res.text()
      if (!res.ok) {
        console.error(`GetXAPI tweet failed for ${data.id} [${res.status}]: ${body}`)
        if (res.status === 404) {
          const row = {
            tweet_id: data.id,
            not_found: true,
            fetched_at: new Date().toISOString(),
          }
          await supabaseAdmin.from('x_tweets').upsert(row)
          return { ...(cachedRow ?? ({} as XTweetRow)), ...row } as XTweetRow
        }
        return cachedRow
      }

      const json = JSON.parse(body) as { data?: Record<string, unknown> }
      const tw = json?.data
      if (!tw) return cachedRow
      const author = (tw.author ?? {}) as Record<string, unknown>

      const { resolveVerifiedType } = await import('./x-badge.server')
      const verifiedType =
        ((author.verifiedType as string) ?? null) ||
        (author.isBlueVerified
          ? await resolveVerifiedType((author.userName as string) ?? null, data.id)
          : null)


      const row: XTweetRow = {
        tweet_id: data.id,
        author_username: (author.userName as string) ?? null,
        author_name: (author.name as string) ?? null,
        author_avatar_url: ((author.profilePicture as string) ?? '').replace(
          '_normal',
          '_400x400',
        ) || null,
        is_blue_verified: Boolean(author.isBlueVerified),
        verified_type: verifiedType,

        text: (tw.text as string) ?? null,
        like_count: Number(tw.likeCount ?? 0),
        retweet_count: Number(tw.retweetCount ?? 0),
        reply_count: Number(tw.replyCount ?? 0),
        quote_count: Number(tw.quoteCount ?? 0),
        view_count: Number(tw.viewCount ?? 0),
        bookmark_count: Number(tw.bookmarkCount ?? 0),
        posted_at: tw.createdAt ? new Date(String(tw.createdAt)).toISOString() : null,
        not_found: false,
        fetched_at: new Date().toISOString(),
      }
      await supabaseAdmin.from('x_tweets').upsert(row)
      return row
    } catch (err) {
      console.error(`GetXAPI tweet error for ${data.id}:`, err)
      return cachedRow
    }
  })

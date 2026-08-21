'use client'

import { BarChart3, Bookmark, ExternalLink, Heart, MessageCircle, Repeat2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { AurxMark } from '../aurx-mark'
import { VerifiedBadge } from '../icons/verified-badge'
import { OrderCard, Skeleton } from './primitives'
import { compactNumber } from '@/lib/format'
import { decodeTweetText, verifiedTone, type XTweet } from '@/lib/x-tweet'

const METRIC_TINT: Record<string, string> = {
  reply: '#1d9bf0',
  reposts: '#00ba7c',
  likes: '#f91880',
  views: '#1d9bf0',
  bookmarks: '#1d9bf0',
}

export function SocialPostPreview({
  tweet,
  missing,
  handle,
  url,
  ru,
  category,
  volume,
  done,
  delay,
}: {
  tweet: XTweet | null
  missing: boolean
  handle: string
  url: string
  ru: boolean
  category: string
  volume: number
  done: boolean
  delay?: number
}) {
  const p = tweet && !tweet.not_found ? tweet : null
  const href = url.startsWith('http') ? url : handle ? `https://x.com/${handle}` : null
  const loading = !p && !missing
  const tone = p ? verifiedTone(p) : null
  const text = p
    ? decodeTweetText(p.text)
        .replace(/\s*https:\/\/t\.co\/\w+\s*$/g, '')
        .trim()
    : ''
  const postedAt = p?.posted_at
    ? new Date(p.posted_at).toLocaleDateString(ru ? 'ru-RU' : 'en-US', {
        month: 'short',
        day: 'numeric',
      })
    : ''

  const body = loading ? (
    <div className="flex gap-3 p-4">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2 pt-1">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  ) : p ? (
    <div className="p-4">
      <div className="flex items-center gap-2.5">
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.06]">
          {p.author_avatar_url ? (
            <img src={p.author_avatar_url} alt="" className="size-full object-cover" />
          ) : (
            <AurxMark className="size-[70%] opacity-90" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1">
            <span className="truncate text-[15px] font-semibold leading-tight">
              {p.author_name || handle || '—'}
            </span>
            {tone ? <VerifiedBadge className={`size-[15px] shrink-0 ${tone}`} /> : null}
          </span>
          <span className="mt-0.5 block truncate text-[13px] leading-tight text-muted-foreground">
            @{p.author_username || handle}
            {postedAt ? ` · ${postedAt}` : ''}
          </span>
        </span>
        <ExternalLink className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} />
      </div>

      {text ? (
        <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-[1.45] text-foreground">
          {text}
        </p>
      ) : null}

      <div className="mt-3.5 flex items-center gap-4 border-t border-white/[0.06] pt-3 text-muted-foreground">
        {(
          [
            { key: 'reply', icon: MessageCircle, value: p.reply_count ?? 0 },
            { key: 'reposts', icon: Repeat2, value: p.retweet_count ?? 0 },
            { key: 'likes', icon: Heart, value: p.like_count ?? 0 },
            { key: 'views', icon: BarChart3, value: p.view_count ?? 0 },
            { key: 'bookmarks', icon: Bookmark, value: p.bookmark_count ?? 0 },
          ] as const
        ).map((m) => {
          const isTarget = m.key === category
          const active = isTarget && done
          const tint = METRIC_TINT[m.key]
          const value = active ? m.value + volume : m.value
          const Icon = m.icon
          return (
            <span
              key={m.key}
              className="flex shrink-0 items-center gap-1.5 whitespace-nowrap"
              style={active ? { color: tint } : undefined}
            >
              <Icon
                className="size-4 shrink-0"
                strokeWidth={1.8}
                fill={active && (m.key === 'likes' || m.key === 'bookmarks') ? tint : 'none'}
              />
              {value > 0 ? (
                <span className="text-[12.5px] leading-none tabular-nums">
                  {compactNumber(value)}
                </span>
              ) : null}
            </span>
          )
        })}
      </div>
    </div>
  ) : (
    <div className="flex items-start gap-3 p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05]">
        <AurxMark className="size-[55%] opacity-70" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold leading-tight">
          {ru ? 'Превью публикации недоступно' : 'Post preview unavailable'}
        </span>
        <span className="mt-1 block text-[13px] leading-snug text-muted-foreground">
          {ru
            ? 'Заказ выполняется по ссылке, указанной при оформлении.'
            : 'The order runs on the link submitted at checkout.'}
        </span>
        {url ? (
          <span className="mt-2 block truncate rounded-lg bg-white/[0.04] px-2 py-1 text-[12px] text-muted-foreground">
            {url}
          </span>
        ) : null}
      </span>
      {href ? <ExternalLink className="size-4 shrink-0 text-muted-foreground" /> : null}
    </div>
  )

  return (
    <OrderCard delay={delay} className="overflow-hidden p-0">
      {href ? (
        <motion.a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          whileTap={{ scale: 0.99 }}
          className="block transition-colors hover:bg-white/[0.02]"
        >
          {body}
        </motion.a>
      ) : (
        body
      )}
    </OrderCard>
  )
}

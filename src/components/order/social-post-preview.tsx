'use client'

import { motion } from 'framer-motion'
import { Eyebrow, Reveal, Skeleton } from './primitives'
import {
  GlyphArrowUpRight,
  XBookmark,
  XLike,
  XMark,
  XReply,
  XRepost,
  XViews,
} from './icons'
import { VerifiedBadge } from '../icons/verified-badge'
import { compactNumber } from '@/lib/format'
import { decodeTweetText, verifiedTone, type XTweet } from '@/lib/x-tweet'

const METRIC_TINT: Record<string, string> = {
  reply: '#1d9bf0',
  retweets: '#00ba7c',
  likes: '#f91880',
  views: '#1d9bf0',
  bookmarks: '#1d9bf0',
}

/**
 * The target post, framed as a quoted document: hairline panel, no shadow,
 * native X iconography. Deliberately quieter than the progress deck.
 */
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
    <div className="flex gap-3">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2 pt-1">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  ) : p ? (
    <>
      <div className="flex items-center gap-2.5">
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-foreground/[0.06]">
          {p.author_avatar_url ? (
            <img src={p.author_avatar_url} alt="" className="size-full object-cover" />
          ) : (
            <XMark className="size-[42%] text-foreground/70" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1">
            <span className="truncate text-[14.5px] font-semibold leading-tight">
              {p.author_name || handle || '—'}
            </span>
            {tone ? <VerifiedBadge className={`size-[15px] shrink-0 ${tone}`} /> : null}
          </span>
          <span className="mt-0.5 block truncate text-[13px] leading-tight text-muted-foreground">
            @{p.author_username || handle}
            {postedAt ? ` · ${postedAt}` : ''}
          </span>
        </span>
        <XMark className="size-[15px] shrink-0 text-foreground/45" />
      </div>

      {text ? (
        <p className="mt-3 whitespace-pre-wrap break-words text-[14.5px] leading-[1.45] text-foreground/92">
          {text}
        </p>
      ) : null}

      <div
        className="mt-3.5 flex items-center gap-4 pt-3 text-muted-foreground/85"
        style={{ borderTop: '1px solid color-mix(in oklab, var(--foreground) 7%, transparent)' }}
      >
        {(
          [
            { key: 'reply', Icon: XReply, value: p.reply_count ?? 0 },
            { key: 'retweets', Icon: XRepost, value: p.retweet_count ?? 0 },
            { key: 'likes', Icon: XLike, value: p.like_count ?? 0 },
            { key: 'views', Icon: XViews, value: p.view_count ?? 0 },
            { key: 'bookmarks', Icon: XBookmark, value: p.bookmark_count ?? 0 },
          ] as const
        ).map((m) => {
          const active = m.key === category && done
          const tint = METRIC_TINT[m.key]
          const value = active ? m.value + volume : m.value
          const Icon = m.Icon as (props: {
            className?: string
            filled?: boolean
          }) => React.ReactElement
          return (
            <motion.span
              key={m.key}
              initial={false}
              animate={active ? { scale: [1, 1.12, 1] } : {}}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="flex shrink-0 items-center gap-1.5 whitespace-nowrap"
              style={active ? { color: tint } : undefined}
            >
              <Icon className="size-[15px] shrink-0" filled={active} />
              {value > 0 ? (
                <span className="text-[12px] leading-none tabular-nums">
                  {compactNumber(value)}
                </span>
              ) : null}
            </motion.span>
          )
        })}
      </div>
    </>
  ) : (
    <div className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground/[0.05]">
        <XMark className="size-[40%] text-foreground/55" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold leading-tight">
          {ru ? 'Превью публикации недоступно' : 'Post preview unavailable'}
        </span>
        <span className="mt-1 block text-[13px] leading-[1.5] text-muted-foreground">
          {ru
            ? 'Заказ выполняется по ссылке, указанной при оформлении.'
            : 'The order runs on the link submitted at checkout.'}
        </span>
        {url ? (
          <span className="mt-2 block truncate font-mono text-[11.5px] text-muted-foreground/70">
            {url}
          </span>
        ) : null}
      </span>
    </div>
  )

  return (
    <Reveal delay={delay} className="px-1">
      <div className="mb-2 flex items-center justify-between gap-3 px-0.5">
        <Eyebrow>{ru ? 'Публикация' : 'Target post'}</Eyebrow>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground active:opacity-60"
          >
            {ru ? 'Открыть' : 'Open'}
            <GlyphArrowUpRight className="size-[13px]" />
          </a>
        ) : null}
      </div>

      <div
        className="rounded-[18px] p-4"
        style={{
          background: 'color-mix(in oklab, var(--foreground) 3%, transparent)',
          boxShadow: 'inset 0 0 0 1px color-mix(in oklab, var(--foreground) 7%, transparent)',
        }}
      >
        {body}
      </div>
    </Reveal>
  )
}

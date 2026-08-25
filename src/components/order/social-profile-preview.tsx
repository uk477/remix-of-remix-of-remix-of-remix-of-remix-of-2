'use client'

import { motion } from 'framer-motion'
import { Eyebrow, Reveal, Skeleton } from './primitives'
import { GlyphArrowUpRight, XMark } from './icons'
import { VerifiedBadge } from '../icons/verified-badge'
import { verifiedTone } from '@/lib/x-tweet'
import { localeFor } from '@/lib/datetime'
import type { XProfileRow } from '@/lib/x-profile.functions'

function grouped(n: number, lang: string) {
  try {
    return new Intl.NumberFormat(localeFor(lang)).format(Math.max(0, Math.round(n)))
  } catch {
    return String(n)
  }
}

/** «апреля 2009» / «April 2009» — как в шапке профиля X. */
function joinedLabel(value: string, lang: string) {
  const d = new Date(value)
  if (!Number.isFinite(d.getTime())) return ''
  try {
    return new Intl.DateTimeFormat(localeFor(lang), { month: 'long', year: 'numeric' }).format(d)
  } catch {
    return ''
  }
}

function CalendarGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Целевой аккаунт для заказов на подписчиков: настоящая шапка профиля X
 * (баннер, аватар, верификация, дата регистрации, реальные счётчики) плюс
 * нижняя лента «На старте → После выполнения».
 */
export function SocialProfilePreview({
  profile,
  handle,
  start,
  volume,
  done,
  ru,
  lang,
  delay,
}: {
  profile: XProfileRow | null
  handle: string
  start: number
  volume: number
  done: boolean
  ru: boolean
  lang: string
  delay?: number
}) {
  const p = profile && !profile.not_found ? profile : null
  const loading = !profile
  const tone = p ? verifiedTone(p) : null
  const href = handle ? `https://x.com/${handle}` : null
  const joined = p?.joined_at ? joinedLabel(p.joined_at, lang) : ''
  const startCount = p?.followers ?? start
  const projected = startCount + volume

  return (
    <Reveal delay={delay} className="px-1">
      <div className="mb-2 px-0.5">
        <Eyebrow>{ru ? 'Аккаунт' : 'Target account'}</Eyebrow>
      </div>

      <motion.div
        whileTap={{ scale: 0.988 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className="overflow-hidden rounded-[20px]"
        style={{
          background: 'color-mix(in oklab, var(--foreground) 3%, transparent)',
          boxShadow: 'inset 0 0 0 1px color-mix(in oklab, var(--foreground) 7%, transparent)',
        }}
      >
        {/* Banner */}
        <div className="relative h-[104px] w-full bg-foreground/[0.06]">
          {loading ? (
            <Skeleton className="size-full rounded-none" />
          ) : p?.banner_url ? (
            <img src={p.banner_url} alt="" className="size-full object-cover" />
          ) : (
            <div
              className="size-full"
              style={{
                background:
                  'linear-gradient(135deg, color-mix(in oklab, var(--primary) 22%, transparent), transparent 70%)',
              }}
            />
          )}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-14"
            style={{
              background: 'linear-gradient(to top, var(--background), transparent)',
              opacity: 0.55,
            }}
          />
        </div>

        <div className="relative px-4 pb-4">
          {/* Avatar + open link */}
          <div className="flex items-end justify-between">
            <span
              className="-mt-9 flex size-[72px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-background"
              style={{ boxShadow: '0 0 0 3px var(--background)' }}
            >
              {loading ? (
                <Skeleton className="size-full rounded-full" />
              ) : p?.avatar_url ? (
                <img src={p.avatar_url} alt="" className="size-full object-cover" />
              ) : (
                <XMark className="size-[38%] text-foreground/70" />
              )}
            </span>

            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={ru ? 'Открыть профиль' : 'Open profile'}
                className="mb-1 inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground active:opacity-60"
                style={{
                  boxShadow: 'inset 0 0 0 1px color-mix(in oklab, var(--foreground) 12%, transparent)',
                }}
              >
                <GlyphArrowUpRight className="size-[15px]" />
              </a>
            ) : null}
          </div>

          {/* Identity */}
          <div className="mt-2.5">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            ) : (
              <>
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-[19px] font-bold leading-tight">
                    {p?.name || handle || '—'}
                  </span>
                  {tone ? <VerifiedBadge className={`size-[17px] shrink-0 ${tone}`} /> : null}
                </div>
                <div className="mt-0.5 truncate text-[13.5px] leading-tight text-muted-foreground">
                  @{p?.user_name || handle || 'username'}
                </div>
              </>
            )}
          </div>

          {joined ? (
            <div className="mt-3 flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <CalendarGlyph className="size-[14px] shrink-0" />
              <span>
                {ru ? `В X с ${joined}` : `Joined X in ${joined}`}
              </span>
            </div>
          ) : null}

          {!loading && p ? (
            <div className="mt-2.5 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-[13px] text-muted-foreground">
              <span>
                <span className="font-semibold text-foreground tabular-nums">
                  {grouped(p.following ?? 0, lang)}
                </span>{' '}
                {ru ? 'читаемых' : 'following'}
              </span>
              <span>
                <span className="font-semibold text-foreground tabular-nums">
                  {grouped(p.followers ?? 0, lang)}
                </span>{' '}
                {ru ? 'подписчиков' : 'followers'}
              </span>
            </div>
          ) : null}
        </div>

        {/* Delivery strip */}
        <div
          className="grid grid-cols-[1fr_auto_1fr] items-center"
          style={{
            borderTop: '1px solid color-mix(in oklab, var(--foreground) 7%, transparent)',
            background: 'color-mix(in oklab, var(--foreground) 2.5%, transparent)',
          }}
        >
          <div className="px-3 py-3 text-center">
            <div className="text-[11.5px] uppercase tracking-[0.06em] text-muted-foreground">
              {ru ? 'На старте' : 'At start'}
            </div>
            <div className="mt-1 text-[15px] font-semibold tabular-nums">
              {grouped(startCount, lang)}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: (delay ?? 0) + 0.2, type: 'spring', stiffness: 320, damping: 24 }}
            className="mx-1 rounded-full px-3 py-1 text-[13px] font-semibold tabular-nums"
            style={{
              color: done ? 'var(--success)' : 'var(--primary)',
              background: done
                ? 'color-mix(in oklab, var(--success) 14%, transparent)'
                : 'color-mix(in oklab, var(--primary) 14%, transparent)',
            }}
          >
            +{grouped(volume, lang)}
          </motion.div>

          <div className="px-3 py-3 text-center">
            <div className="text-[11.5px] uppercase tracking-[0.06em] text-muted-foreground">
              {ru ? 'После выполнения' : 'After delivery'}
            </div>
            <div
              className="mt-1 text-[15px] font-semibold tabular-nums"
              style={{ color: done ? 'var(--success)' : 'var(--primary)' }}
            >
              {grouped(projected, lang)}
            </div>
          </div>
        </div>
      </motion.div>
    </Reveal>
  )
}

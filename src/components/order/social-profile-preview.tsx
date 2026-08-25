'use client'

import { motion } from 'framer-motion'
import { CalendarDays } from 'lucide-react'
import { Eyebrow, Reveal } from './primitives'
import { GlyphArrowUpRight } from './icons'
import { VerifiedBadge } from '../icons/verified-badge'
import { DigitRoll } from '../ui/digit-roll'
import { AurxMark } from '../brand'
import { verifiedTone } from '@/lib/x-tweet'
import { cn } from '@/lib/utils'
import type { XProfileRow } from '@/lib/x-profile.functions'

function joinedLabel(raw: string | null | undefined): string | null {
  if (!raw) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  return `Joined ${d.toLocaleString('en-US', { month: 'long' })} ${d.getFullYear()}`
}

/**
 * Целевой аккаунт: то же нативное оформление профиля X, что и на экране
 * покупки (menu → boost → followers), с реальными данными аккаунта.
 */
export function SocialProfilePreview({
  profile,
  handle,
  start,
  volume,
  done,
  ru,
  delay,
}: {
  profile: XProfileRow | null
  handle: string
  start: number
  volume: number
  done: boolean
  ru: boolean
  lang?: string
  delay?: number
}) {
  const live = profile && !profile.not_found ? profile : null
  const startCount = live?.followers ?? start
  const total = startCount + volume
  const digits = total.toLocaleString('en-US').split('')
  const displayHandle = live?.user_name || handle || 'username'
  const displayName = live?.name || handle || 'Name'
  const tone = live ? verifiedTone(live) : null
  const joined = joinedLabel(live?.joined_at) ?? ''
  const following = (live?.following ?? 0).toLocaleString('en-US')
  const href = handle ? `https://x.com/${handle}` : null
  const accent = done ? 'var(--success)' : 'var(--primary)'

  return (
    <Reveal delay={delay} className="px-1">
      <div className="mb-2 flex items-center justify-between gap-3 px-0.5">
        <Eyebrow>{ru ? 'Аккаунт' : 'Target account'}</Eyebrow>
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

      <motion.div
        whileTap={{ scale: 0.99 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className="overflow-hidden rounded-2xl border border-white/10 bg-black"
      >
        {/* Banner */}
        <div className="h-[76px] overflow-hidden bg-[#333639]">
          {live?.banner_url ? (
            <img src={live.banner_url} alt="" className="size-full object-cover" />
          ) : null}
        </div>

        <div className="relative px-4 pb-4">
          <div className="flex items-start justify-between">
            <div className="-mt-10 flex size-[72px] items-center justify-center overflow-hidden rounded-full border-[4px] border-black bg-[#1d1f23]">
              {live?.avatar_url ? (
                <img src={live.avatar_url} alt="" className="size-full object-cover" />
              ) : (
                <AurxMark className="size-[70%] opacity-90" />
              )}
            </div>
          </div>

          <div className="mt-2">
            <p
              className="flex items-center gap-1 text-[19px] font-extrabold leading-tight tracking-[-0.01em] text-white"
              style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
            >
              <span className="min-w-0 truncate">{displayName}</span>
              {tone ? <VerifiedBadge className={cn('size-[19px] shrink-0', tone)} /> : null}
            </p>
            <p
              className="text-[14px] leading-tight text-[#71767b]"
              style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
            >
              @{displayHandle}
            </p>
          </div>

          {joined ? (
            <div className="mt-3 flex items-center gap-1 text-[14px] text-[#71767b]">
              <CalendarDays className="size-[16px]" strokeWidth={2} />
              <span>{joined}</span>
            </div>
          ) : null}

          <div className="mt-3 flex items-center gap-5 text-[14px] text-[#71767b]">
            <span>
              <span className="font-bold text-white">{following}</span> Following
            </span>
            <span className="flex items-baseline gap-1">
              <DigitRoll digits={digits} />
              <span>Followers</span>
            </span>
          </div>
        </div>

        {/* Delivery strip */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center border-t border-white/10">
          <div className="px-3 py-2.5 text-center">
            <div className="text-[10.5px] uppercase tracking-[0.06em] text-white/40">
              {ru ? 'На старте' : 'At start'}
            </div>
            <div className="mt-0.5 text-[14px] font-semibold tabular-nums text-white/90">
              {startCount.toLocaleString('en-US')}
            </div>
          </div>
          <div
            className="rounded-full px-2.5 py-1 text-[12.5px] font-semibold tabular-nums"
            style={{ color: accent, background: `color-mix(in oklab, ${accent} 14%, transparent)` }}
          >
            +{volume.toLocaleString('en-US')}
          </div>
          <div className="px-3 py-2.5 text-center">
            <div className="text-[10.5px] uppercase tracking-[0.06em] text-white/40">
              {ru ? 'После выполнения' : 'After delivery'}
            </div>
            <div className="mt-0.5 text-[14px] font-semibold tabular-nums" style={{ color: accent }}>
              {total.toLocaleString('en-US')}
            </div>
          </div>
        </div>
      </motion.div>
    </Reveal>
  )
}

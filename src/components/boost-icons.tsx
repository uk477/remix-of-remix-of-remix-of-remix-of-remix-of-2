'use client'

/**
 * Custom 2D/3D-flavored SVG marks for the Boost subcategories.
 * These are hand-authored — no lucide fallbacks — so the app has a distinct
 * visual language across Followers / Likes / Impressions / Reposts / Bookmarks
 * and the four Followers regions.
 *
 * Every mark is a square SVG that fills its container, uses currentColor for
 * the accent stroke, and has a soft animated highlight so the tiles feel alive.
 */

import { motion } from 'framer-motion'

type MarkProps = { className?: string }

// ── Shared gradient defs, unique ids per mark ─────────────────────────────
function GoldGrad({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#F5D67A" />
        <stop offset="55%" stopColor="#E4B24A" />
        <stop offset="100%" stopColor="#A97514" />
      </linearGradient>
      <radialGradient id={`${id}-glow`} cx="0.5" cy="0.4" r="0.7">
        <stop offset="0%" stopColor="#FFE9A8" stopOpacity="0.9" />
        <stop offset="60%" stopColor="#E4B24A" stopOpacity="0.15" />
        <stop offset="100%" stopColor="#E4B24A" stopOpacity="0" />
      </radialGradient>
    </defs>
  )
}

// ── FOLLOWERS: three orbiting profile chips around a central node ─────────
export function FollowersMark({ className }: MarkProps) {
  const id = 'mk-fol'
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <GoldGrad id={id} />
      <circle cx="60" cy="60" r="54" fill={`url(#${id}-glow)`} />
      {/* orbit ring */}
      <motion.circle
        cx="60" cy="60" r="34"
        fill="none" stroke={`url(#${id})`} strokeWidth="1.2" strokeDasharray="3 5"
        style={{ transformOrigin: '60px 60px' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 22, ease: 'linear', repeat: Infinity }}
      />
      {/* central avatar */}
      <circle cx="60" cy="60" r="14" fill={`url(#${id})`} />
      <circle cx="60" cy="55" r="4.2" fill="#1a1208" />
      <path d="M50 70c2-4 6-6 10-6s8 2 10 6" stroke="#1a1208" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* orbiting chips */}
      <motion.g
        style={{ transformOrigin: '60px 60px' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 14, ease: 'linear', repeat: Infinity }}
      >
        <circle cx="94" cy="60" r="7" fill="#0F0A05" stroke={`url(#${id})`} strokeWidth="1.5" />
        <circle cx="94" cy="58" r="2" fill="#F5D67A" />
      </motion.g>
      <motion.g
        style={{ transformOrigin: '60px 60px' }}
        animate={{ rotate: -360 }}
        transition={{ duration: 18, ease: 'linear', repeat: Infinity }}
      >
        <circle cx="34" cy="76" r="6" fill="#0F0A05" stroke={`url(#${id})`} strokeWidth="1.4" />
        <circle cx="34" cy="74.5" r="1.7" fill="#F5D67A" />
      </motion.g>
      <motion.g
        style={{ transformOrigin: '60px 60px' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 26, ease: 'linear', repeat: Infinity, delay: 0.5 }}
      >
        <circle cx="42" cy="34" r="5.5" fill="#0F0A05" stroke={`url(#${id})`} strokeWidth="1.4" />
        <circle cx="42" cy="33" r="1.5" fill="#F5D67A" />
      </motion.g>
    </svg>
  )
}

// ── LIKES: pulsing 3D-ish heart with a spark trail ───────────────────────
export function LikesMark({ className }: MarkProps) {
  const id = 'mk-like'
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <GoldGrad id={id} />
      <circle cx="60" cy="60" r="54" fill={`url(#${id}-glow)`} />
      <motion.g
        style={{ transformOrigin: '60px 62px' }}
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path
          d="M60 90 C 34 74, 22 58, 30 42 C 36 30, 52 30, 60 44 C 68 30, 84 30, 90 42 C 98 58, 86 74, 60 90 Z"
          fill={`url(#${id})`}
        />
        {/* 3D specular */}
        <path
          d="M40 44 C 44 38, 52 38, 56 44 C 52 42, 46 44, 42 50 Z"
          fill="#FFF3C4" opacity="0.55"
        />
      </motion.g>
      {/* spark */}
      <motion.circle
        cx="92" cy="34" r="2.2" fill="#FFE9A8"
        animate={{ opacity: [0, 1, 0], scale: [0.4, 1.4, 0.4] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      />
      <motion.circle
        cx="28" cy="42" r="1.6" fill="#FFE9A8"
        animate={{ opacity: [0, 1, 0], scale: [0.4, 1.2, 0.4] }}
        transition={{ duration: 2.2, repeat: Infinity, delay: 0.6 }}
      />
    </svg>
  )
}

// ── IMPRESSIONS: iris + radar sweeping rings ─────────────────────────────
export function ImpressionsMark({ className }: MarkProps) {
  const id = 'mk-imp'
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <GoldGrad id={id} />
      <circle cx="60" cy="60" r="54" fill={`url(#${id}-glow)`} />
      {/* eye lens */}
      <ellipse cx="60" cy="60" rx="46" ry="26" fill="none" stroke={`url(#${id})`} strokeWidth="2.2" />
      <circle cx="60" cy="60" r="14" fill={`url(#${id})`} />
      <circle cx="60" cy="60" r="6.5" fill="#0F0A05" />
      <circle cx="63.5" cy="57" r="2.2" fill="#FFF3C4" />
      {/* sweep rings */}
      {[0, 0.6, 1.2].map((d, i) => (
        <motion.circle
          key={i}
          cx="60" cy="60" r="14"
          fill="none" stroke="#F5D67A" strokeWidth="1"
          initial={{ r: 14, opacity: 0.7 }}
          animate={{ r: [14, 46], opacity: [0.7, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: d, ease: 'easeOut' }}
        />
      ))}
    </svg>
  )
}

// ── REPOSTS: two intertwined arrows forming a loop ───────────────────────
export function RepostsMark({ className }: MarkProps) {
  const id = 'mk-rep'
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <GoldGrad id={id} />
      <circle cx="60" cy="60" r="54" fill={`url(#${id}-glow)`} />
      <motion.g
        style={{ transformOrigin: '60px 60px' }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 6, ease: 'easeInOut', repeat: Infinity }}
      >
        <path
          d="M34 46 h44 a10 10 0 0 1 10 10 v14"
          fill="none" stroke={`url(#${id})`} strokeWidth="6" strokeLinecap="round"
        />
        <path d="M78 62 l10 12 l10 -12" fill="none" stroke={`url(#${id})`} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d="M86 74 h-44 a10 10 0 0 1 -10 -10 v-14"
          fill="none" stroke={`url(#${id})`} strokeWidth="6" strokeLinecap="round"
        />
        <path d="M42 58 l-10 -12 l-10 12" fill="none" stroke={`url(#${id})`} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </motion.g>
    </svg>
  )
}

// ── BOOKMARKS: bookmark ribbon with folding highlight ────────────────────
export function BookmarksMark({ className }: MarkProps) {
  const id = 'mk-bm'
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <GoldGrad id={id} />
      <circle cx="60" cy="60" r="54" fill={`url(#${id}-glow)`} />
      <motion.g
        style={{ transformOrigin: '60px 60px' }}
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path
          d="M40 26 h40 a4 4 0 0 1 4 4 v66 l-24 -16 l-24 16 v-66 a4 4 0 0 1 4 -4 z"
          fill={`url(#${id})`}
        />
        {/* folded highlight */}
        <path d="M40 26 h20 v10 l-20 12 z" fill="#FFF3C4" opacity="0.35" />
        <path d="M60 60 l24 16 v-14 z" fill="#7A5210" opacity="0.5" />
      </motion.g>
    </svg>
  )
}

// ── Region flags for followers — simple, stylized, generated (not photos) ─
export function RegionMark({
  region,
  className,
}: {
  region: 'global' | 'jp' | 'kr' | 'us'
  className?: string
}) {
  const id = `mk-r-${region}`
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <GoldGrad id={id} />
      {/* Extra defs per region */}
      <defs>
        <radialGradient id={`${id}-sphere`} cx="0.35" cy="0.32" r="0.85">
          <stop offset="0%" stopColor="#FFE9A8" stopOpacity="0.85" />
          <stop offset="35%" stopColor="#E4B24A" stopOpacity="0.55" />
          <stop offset="70%" stopColor="#7A5210" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#0B0704" stopOpacity="1" />
        </radialGradient>
        <clipPath id={`${id}-clip`}>
          <circle cx="60" cy="60" r="40" />
        </clipPath>
      </defs>
      <circle cx="60" cy="60" r="54" fill={`url(#${id}-glow)`} />

      {region === 'global' && (
        <>
          {/* Sphere base with a soft radial highlight — reads as 3D */}
          <circle cx="60" cy="60" r="40" fill="#0B0704" />
          <circle cx="60" cy="60" r="40" fill={`url(#${id}-sphere)`} opacity="0.9" />
          <g clipPath={`url(#${id}-clip)`}>
            {/* Continents — stylized abstract landmasses in gold */}
            <motion.g
              style={{ transformOrigin: '60px 60px' }}
              animate={{ rotate: 360 }}
              transition={{ duration: 32, ease: 'linear', repeat: Infinity }}
            >
              {/* Americas */}
              <path
                d="M36 42 c4 -4 10 -3 12 2 c1 6 -3 10 -6 14 c-2 4 1 8 4 10 c-4 4 -10 3 -14 -2 c-2 -6 -1 -14 4 -24 z"
                fill={`url(#${id})`} opacity="0.9"
              />
              {/* Africa + Europe */}
              <path
                d="M62 40 c6 -2 12 2 12 8 c0 4 -3 6 -6 8 c1 6 4 10 3 16 c-2 6 -8 6 -12 2 c-3 -4 -3 -10 -1 -14 c-3 -4 -4 -12 4 -20 z"
                fill={`url(#${id})`} opacity="0.95"
              />
              {/* Asia / Australia */}
              <path
                d="M84 50 c4 0 8 4 6 8 c-2 4 -8 4 -10 2 z M82 74 c3 -1 7 1 7 4 c0 3 -4 4 -7 3 z"
                fill={`url(#${id})`} opacity="0.9"
              />
              {/* pinprick city lights */}
              {[
                [44, 48], [48, 62], [66, 46], [72, 60], [82, 66], [78, 54],
              ].map(([x, y]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r="0.9" fill="#FFF3C4" />
              ))}
            </motion.g>
            {/* Latitude/longitude wire grid — gives 3D volume */}
            {[-24, -8, 8, 24].map((oy) => (
              <ellipse
                key={`lat-${oy}`}
                cx="60" cy={60 + oy} rx={Math.sqrt(Math.max(1600 - oy * oy, 0))} ry={4 - Math.abs(oy) / 12}
                fill="none" stroke="#E4B24A" strokeWidth="0.6" opacity="0.35"
              />
            ))}
            <motion.g
              style={{ transformOrigin: '60px 60px' }}
              animate={{ rotate: 360 }}
              transition={{ duration: 32, ease: 'linear', repeat: Infinity }}
            >
              {[-60, -30, 0, 30, 60].map((d) => (
                <ellipse
                  key={`lon-${d}`}
                  cx="60" cy="60" rx={40 * Math.abs(Math.cos((d * Math.PI) / 180))} ry="40"
                  fill="none" stroke="#E4B24A" strokeWidth="0.6" opacity="0.28"
                />
              ))}
            </motion.g>
            {/* Specular highlight blob */}
            <ellipse cx="48" cy="44" rx="14" ry="8" fill="#FFF3C4" opacity="0.18" />
          </g>
          {/* Rim */}
          <circle cx="60" cy="60" r="40" fill="none" stroke={`url(#${id})`} strokeWidth="2" />
          {/* Outer orbit ring */}
          <motion.ellipse
            cx="60" cy="60" rx="48" ry="16"
            fill="none" stroke="#F5D67A" strokeWidth="0.8" strokeDasharray="2 4" opacity="0.55"
            style={{ transformOrigin: '60px 60px' }}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 18, ease: 'linear', repeat: Infinity }}
          />
        </>
      )}

      {region === 'jp' && (
        <>
          {/* Flag field — off-white on gold-lit dark background */}
          <circle cx="60" cy="60" r="40" fill="#F5EFDF" />
          <motion.circle
            cx="60" cy="60" r="16" fill="#BC2626"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <circle cx="60" cy="60" r="40" fill="none" stroke={`url(#${id})`} strokeWidth="2" />
        </>
      )}

      {region === 'kr' && (
        <>
          {/* South Korea — Taegeukgi: white field, taegeuk in center, 4 trigrams (gonggwae) in corners */}
          <circle cx="60" cy="60" r="40" fill="#F5EFDF" />
          {/* Taegeuk: two comma halves that spin */}
          <motion.g
            style={{ transformOrigin: '60px 60px' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 18, ease: 'linear', repeat: Infinity }}
          >
            {/* upper red half (rendered in warm gold to stay on-brand) */}
            <path
              d="M60 46 a14 14 0 0 1 0 28 a7 7 0 0 0 0 -14 a7 7 0 0 1 0 -14 z"
              fill="#C9451F"
            />
            {/* lower blue half (rendered in deep gold/brown) */}
            <path
              d="M60 74 a14 14 0 0 1 0 -28 a7 7 0 0 0 0 14 a7 7 0 0 1 0 14 z"
              fill="#1E3A5F"
            />
          </motion.g>
          {/* 4 trigrams: three horizontal bars each, one or two split */}
          {/* ☰ top-left (Heaven) — 3 solid bars */}
          <g stroke="#0F0A05" strokeWidth="1.6" strokeLinecap="round">
            <line x1="30" y1="36" x2="42" y2="36" />
            <line x1="30" y1="40" x2="42" y2="40" />
            <line x1="30" y1="44" x2="42" y2="44" />
          </g>
          {/* ☷ bottom-right (Earth) — 3 split bars */}
          <g stroke="#0F0A05" strokeWidth="1.6" strokeLinecap="round">
            <line x1="78" y1="76" x2="83" y2="76" /><line x1="87" y1="76" x2="92" y2="76" />
            <line x1="78" y1="80" x2="83" y2="80" /><line x1="87" y1="80" x2="92" y2="80" />
            <line x1="78" y1="84" x2="83" y2="84" /><line x1="87" y1="84" x2="92" y2="84" />
          </g>
          {/* ☵ top-right (Water) — split, solid, split */}
          <g stroke="#0F0A05" strokeWidth="1.6" strokeLinecap="round">
            <line x1="78" y1="36" x2="83" y2="36" /><line x1="87" y1="36" x2="92" y2="36" />
            <line x1="78" y1="40" x2="92" y2="40" />
            <line x1="78" y1="44" x2="83" y2="44" /><line x1="87" y1="44" x2="92" y2="44" />
          </g>
          {/* ☲ bottom-left (Fire) — solid, split, solid */}
          <g stroke="#0F0A05" strokeWidth="1.6" strokeLinecap="round">
            <line x1="30" y1="76" x2="42" y2="76" />
            <line x1="30" y1="80" x2="34" y2="80" /><line x1="38" y1="80" x2="42" y2="80" />
            <line x1="30" y1="84" x2="42" y2="84" />
          </g>
          <circle cx="60" cy="60" r="40" fill="none" stroke={`url(#${id})`} strokeWidth="2" />
        </>
      )}

      {region === 'us' && (
        <>
          {/* Stars & stripes — 13 alternating stripes, blue canton with stars */}
          <g clipPath={`url(#${id}-clip)`}>
            {/* Stripes */}
            {Array.from({ length: 13 }).map((_, i) => (
              <rect
                key={i}
                x="20" y={20 + i * 6.15} width="80" height="6.15"
                fill={i % 2 === 0 ? '#C9302C' : '#F5EFDF'}
              />
            ))}
            {/* Canton */}
            <rect x="20" y="20" width="42" height="43" fill="#1E3A5F" />
            {/* 5×4 star grid — real 5-point stars */}
            {Array.from({ length: 5 }).map((_, r) =>
              Array.from({ length: 4 }).map((_, c) => (
                <Star
                  key={`${r}-${c}`}
                  cx={26 + c * 9}
                  cy={25 + r * 8.5}
                  size={2.6}
                  fill="#F5EFDF"
                />
              )),
            )}
          </g>
          <circle cx="60" cy="60" r="40" fill="none" stroke={`url(#${id})`} strokeWidth="2" />
          {/* subtle shine sweep */}
          <motion.ellipse
            cx="60" cy="60" rx="18" ry="42"
            fill="#FFF3C4" opacity="0.08"
            style={{ transformOrigin: '60px 60px' }}
            animate={{ rotate: [15, 25, 15] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </>
      )}
    </svg>
  )
}

// ── 5-point star helper ─────────────────────────────────────────────────
function Star({
  cx, cy, size, fill,
}: { cx: number; cy: number; size: number; fill: string }) {
  // Build a 5-point star path around (cx, cy) with outer radius `size`
  const outer = size
  const inner = size * 0.4
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = (Math.PI / 5) * i - Math.PI / 2
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`)
  }
  return <polygon points={pts.join(' ')} fill={fill} />
}

export const BOOST_MARKS = {
  followers: FollowersMark,
  likes: LikesMark,
  views: ImpressionsMark, // 'views' category id maps to Impressions label
  reposts: RepostsMark,
  bookmarks: BookmarksMark,
} as const

export type BoostMarkId = keyof typeof BOOST_MARKS
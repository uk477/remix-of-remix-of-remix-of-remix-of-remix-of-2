import type { SVGProps } from 'react'

/**
 * Hand-drawn icon set for the order screen.
 *
 * Two families live here:
 *  – X (Twitter) brand glyphs: the official wordmark and the native reply /
 *    repost / like / views / bookmark paths, so the post preview reads as a
 *    real X surface instead of a generic icon set.
 *  – AureX UI glyphs: thin, 1.5px, 24-grid strokes drawn for this screen only.
 */

type P = SVGProps<SVGSVGElement>

/* ── X brand ──────────────────────────────────────────────────────────── */

function Brand({ children, ...p }: P & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
      {children}
    </svg>
  )
}

export function XMark(p: P) {
  return (
    <Brand {...p}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </Brand>
  )
}

export function XReply(p: P) {
  return (
    <Brand {...p}>
      <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z" />
    </Brand>
  )
}

export function XRepost(p: P) {
  return (
    <Brand {...p}>
      <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z" />
    </Brand>
  )
}

export function XLike({ filled, ...p }: P & { filled?: boolean }) {
  return (
    <Brand {...p}>
      {filled ? (
        <path d="M20.884 13.19c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z" />
      ) : (
        <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z" />
      )}
    </Brand>
  )
}

export function XViews(p: P) {
  return (
    <Brand {...p}>
      <path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z" />
    </Brand>
  )
}

export function XBookmark({ filled, ...p }: P & { filled?: boolean }) {
  return (
    <Brand {...p}>
      {filled ? (
        <path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5z" />
      ) : (
        <path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.224-.5-.5-.5h-11z" />
      )}
    </Brand>
  )
}

export function XFollowers(p: P) {
  return (
    <Brand {...p}>
      <path d="M5.651 19h12.698c-.337-1.8-1.023-3.21-1.945-4.19C15.318 13.65 13.838 13 12 13s-3.317.65-4.404 1.81c-.922.98-1.608 2.39-1.945 4.19zm.486-5.56C7.627 11.85 9.648 11 12 11s4.373.85 5.863 2.44c1.477 1.58 2.366 3.8 2.632 6.46l.11 1.1H3.395l.11-1.1c.266-2.66 1.155-4.88 2.632-6.46zM12 4c-1.105 0-2 .9-2 2s.895 2 2 2 2-.9 2-2-.895-2-2-2zM8 6c0-2.21 1.791-4 4-4s4 1.79 4 4-1.791 4-4 4-4-1.79-4-4z" />
    </Brand>
  )
}

/* ── AureX UI glyphs — 24 grid, 1.5 stroke ────────────────────────────── */

function Line({ children, ...p }: P & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...p}
    >
      {children}
    </svg>
  )
}

export function GlyphBack(p: P) {
  return (
    <Line strokeWidth={1.8} {...p}>
      <path d="M14.5 5 8 12l6.5 7" />
    </Line>
  )
}

export function GlyphCopy(p: P) {
  return (
    <Line {...p}>
      <rect x="9" y="9" width="11" height="11" rx="3" />
      <path d="M15.5 5.5A2.5 2.5 0 0 0 13 3H7a4 4 0 0 0-4 4v6a2.5 2.5 0 0 0 2.5 2.5" />
    </Line>
  )
}

export function GlyphCheck(p: P) {
  return (
    <Line strokeWidth={2.2} {...p}>
      <path d="m5 12.5 4.6 4.5L19 7" />
    </Line>
  )
}

export function GlyphShield(p: P) {
  return (
    <Line {...p}>
      <path d="M12 2.75 4.75 5.6v5.6c0 4.6 3 8.1 7.25 10.05C16.25 19.3 19.25 15.8 19.25 11.2V5.6L12 2.75Z" />
      <path d="m8.9 11.9 2.2 2.2 4-4.4" strokeWidth={1.8} />
    </Line>
  )
}

export function GlyphRefill(p: P) {
  return (
    <Line {...p}>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20.4 3.6v4.2h-4.2" />
    </Line>
  )
}

export function GlyphLock(p: P) {
  return (
    <Line {...p}>
      <rect x="4.75" y="10.5" width="14.5" height="10.25" rx="3.2" />
      <path d="M8.4 10.3V7.9a3.6 3.6 0 0 1 7.2 0v2.4" />
    </Line>
  )
}

export function GlyphSupport(p: P) {
  return (
    <Line {...p}>
      <path d="M4.6 15.4v-3.6a7.4 7.4 0 0 1 14.8 0v3.6" />
      <path d="M4.6 13.6h1.3a1.9 1.9 0 0 1 1.9 1.9v2a1.9 1.9 0 0 1-1.9 1.9H6a1.4 1.4 0 0 1-1.4-1.4v-4.4Z" />
      <path d="M19.4 13.6h-1.3a1.9 1.9 0 0 0-1.9 1.9v2c0 1.05.85 1.9 1.9 1.9h.1c.77 0 1.2-.63 1.2-1.4v-4.4Z" />
      <path d="M18.4 19.6c0 1.3-1.5 2.3-3.6 2.4" />
    </Line>
  )
}

export function GlyphArrowUpRight(p: P) {
  return (
    <Line {...p}>
      <path d="M7.5 16.5 16.5 7.5" />
      <path d="M9.6 7.5h6.9v6.9" />
    </Line>
  )
}

export function GlyphChevronRight(p: P) {
  return (
    <Line strokeWidth={1.8} {...p}>
      <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
    </Line>
  )
}

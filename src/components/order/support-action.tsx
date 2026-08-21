'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { GlyphChevronRight, GlyphSupport } from './icons'

/** Plain row, not a card — the page ends on a quiet action, not another box. */
export function SupportAction({
  label,
  hint,
  onClick,
}: {
  label: string
  hint?: string
  onClick: () => void
}) {
  const reduce = useReducedMotion()
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="group mx-1 flex w-[calc(100%-0.5rem)] items-center gap-3 rounded-[14px] px-1 py-3 text-left transition-colors"
    >
      <GlyphSupport className="size-[19px] shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium leading-tight">{label}</span>
        {hint ? (
          <span className="mt-0.5 block text-[12.5px] leading-[1.4] text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </span>
      <motion.span
        aria-hidden
        initial={false}
        whileHover={reduce ? undefined : { x: 2 }}
        className="text-muted-foreground/70"
      >
        <GlyphChevronRight className="size-[15px]" />
      </motion.span>
    </motion.button>
  )
}

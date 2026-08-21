'use client'

import { motion } from 'framer-motion'
import { LifeBuoy, ChevronRight } from 'lucide-react'

export function SupportAction({
  label,
  hint,
  onClick,
}: {
  label: string
  hint?: string
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex min-h-[52px] w-full items-center gap-3 rounded-[20px] border border-white/[0.07] bg-card/60 px-4 py-3 text-left transition-colors hover:bg-card"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.05]">
        <LifeBuoy className="size-[18px] text-muted-foreground" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium">{label}</span>
        {hint ? (
          <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">{hint}</span>
        ) : null}
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </motion.button>
  )
}

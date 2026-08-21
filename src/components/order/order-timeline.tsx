'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TimelineStep = {
  label: string
  meta?: string
  state: 'done' | 'live' | 'idle'
}

export function OrderTimeline({ steps }: { steps: TimelineStep[] }) {
  const reduce = useReducedMotion()
  return (
    <ol className="relative flex flex-col gap-3">
      {steps.map((s, i) => (
        <li key={s.label} className="relative flex items-center gap-3">
          {i < steps.length - 1 ? (
            <span
              aria-hidden
              className={cn(
                'absolute left-[9px] top-[22px] h-[calc(100%-10px)] w-px',
                s.state === 'done' ? 'bg-success/35' : 'bg-white/[0.08]',
              )}
            />
          ) : null}

          <span className="relative z-10 flex size-[18px] shrink-0 items-center justify-center">
            {s.state === 'done' ? (
              <span className="flex size-[18px] items-center justify-center rounded-full bg-success/15">
                <Check className="size-3 shrink-0 text-success" strokeWidth={3} />
              </span>
            ) : s.state === 'live' ? (
              <>
                {!reduce && (
                  <motion.span
                    aria-hidden
                    animate={{ scale: [1, 1.8], opacity: [0.45, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                    className="absolute size-[10px] rounded-full bg-primary"
                  />
                )}
                <span className="relative size-[10px] rounded-full bg-primary shadow-[0_0_10px_-1px_color-mix(in_oklab,var(--primary)_80%,transparent)]" />
              </>
            ) : (
              <span className="size-[10px] rounded-full border border-white/15 bg-transparent" />
            )}
          </span>

          <span className="min-w-0 flex-1">
            <span
              className={cn(
                'block truncate text-[14px] font-medium leading-tight',
                s.state === 'idle' ? 'text-muted-foreground' : 'text-foreground',
              )}
            >
              {s.label}
            </span>
          </span>

          {s.meta ? (
            <span className="shrink-0 tabular-nums text-[12px] text-muted-foreground">
              {s.meta}
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  )
}

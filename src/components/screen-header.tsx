'use client'

import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string
  subtitle?: string
  onBack?: () => void
  right?: React.ReactNode
}) {
  const { dir } = useI18n()
  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft
  return (
    <header className="relative z-10 flex items-center gap-3 border-b border-border bg-background px-4 py-3.5 shadow-[0_8px_20px_-16px_rgba(0,0,0,0.8)]">
      {onBack ? (
        <button
          onClick={onBack}
          aria-label="Back"
          data-screen-back=""
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground transition-transform active:scale-90"
        >
          <BackIcon className="size-5" />
        </button>
      ) : right ? (
        <div className="size-9 shrink-0" aria-hidden />
      ) : null}
      <div className="min-w-0 flex-1 text-center">
        <h1 className="truncate text-[19px] font-extrabold leading-tight tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {right || (onBack ? <div className="size-9 shrink-0" /> : null)}
    </header>
  )
}

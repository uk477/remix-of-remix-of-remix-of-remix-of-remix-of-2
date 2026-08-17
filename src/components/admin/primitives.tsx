'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  Search,
  X,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useToast } from '../toast'

// ─── Shell primitives ───────────────────────────────────────────────────────

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-[22px] font-bold leading-tight tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function Card({
  children,
  className = '',
  hero,
}: {
  children: ReactNode
  className?: string
  hero?: boolean
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border p-4 ${
        hero
          ? 'border-primary/40 bg-[linear-gradient(140deg,color-mix(in_oklab,var(--card)_82%,var(--primary)_18%),var(--secondary))]'
          : 'border-border-strong bg-card'
      } ${className}`}
    >
      {children}
    </div>
  )
}

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  size = 'md',
  onClick,
}: {
  label: string
  value: string
  hint?: string
  icon: React.ComponentType<{ className?: string }>
  tone?: 'default' | 'gold' | 'success' | 'warn' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
}) {
  const toneCls = {
    default: 'border-border-strong bg-card',
    gold: 'border-primary/40 bg-[linear-gradient(140deg,color-mix(in_oklab,var(--card)_78%,var(--primary)_22%),var(--secondary))]',
    success: 'border-success/40 bg-success/10',
    warn: 'border-warning/40 bg-warning/10',
    destructive: 'border-destructive/40 bg-destructive/10',
  }[tone]
  const iconTone = {
    default: 'text-muted-foreground',
    gold: 'text-primary',
    success: 'text-success',
    warn: 'text-warning',
    destructive: 'text-destructive',
  }[tone]
  const valueSize = size === 'lg' ? 'text-[28px]' : size === 'sm' ? 'text-[18px]' : 'text-[22px]'
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className={`pressable relative w-full overflow-hidden rounded-3xl border p-4 text-left ${toneCls} ${onClick ? 'transition-transform active:scale-[0.98]' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        <Icon className={`size-4 ${iconTone}`} />
      </div>
      <p className={`tnum mt-2 font-display font-bold leading-none ${valueSize}`}>{value}</p>
      {hint && <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>}
    </Comp>
  )
}


export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl bg-card/60" />
      ))}
    </div>
  )
}

export function Empty({ text, icon: Icon }: { text: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-3xl border border-dashed border-border py-14 text-center">
      {Icon && (
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-secondary/50 text-muted-foreground">
          <Icon className="size-5" />
        </div>
      )}
      <p className="text-[13px] text-muted-foreground">{text}</p>
    </div>
  )
}

// ─── Chips ──────────────────────────────────────────────────────────────────

export function ChipRow({ children }: { children: ReactNode }) {
  return <div className="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1">{children}</div>
}

export function Chip({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  count?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`pressable shrink-0 rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition-colors ${
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border bg-card text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
      {typeof count === 'number' && (
        <span
          className={`tnum ml-1.5 rounded-full px-1.5 py-px text-[9.5px] font-bold ${
            active ? 'bg-primary-foreground/20' : 'bg-background/60 text-muted-foreground'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  )
}

// ─── Search ─────────────────────────────────────────────────────────────────

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3">
      <Search className="size-3.5 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent py-2.5 text-[13px] outline-none placeholder:text-muted-foreground"
      />
      {value && (
        <button onClick={() => onChange('')} className="text-muted-foreground">
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}

// ─── Pills / Badges ─────────────────────────────────────────────────────────

export function StatusPill({ status, label }: { status: string; label?: string }) {
  const tone =
    status === 'success' || status === 'completed' || status === 'approved' || status === 'open'
      ? 'bg-success/15 text-success border-success/30'
      : status === 'declined' || status === 'expired' || status === 'refunded' || status === 'failed'
        ? 'bg-destructive/15 text-destructive border-destructive/30'
        : status === 'pending' || status === 'new' || status === 'draft'
          ? 'bg-warning/15 text-warning border-warning/30'
          : status === 'in_progress' || status === 'reviewing' || status === 'sending'
            ? 'bg-primary/15 text-primary border-primary/30'
            : 'bg-muted text-muted-foreground border-border'
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide ${tone}`}
    >
      {label ?? status}
    </span>
  )
}

// ─── Drawer / Sheet ─────────────────────────────────────────────────────────

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])
  if (!mounted) return null
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            key="sh"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 34, stiffness: 340 }}
            className="fixed inset-0 z-[101] mx-auto flex h-[100dvh] w-full max-w-[520px] flex-col border-t border-primary/20 bg-background"
          >

            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border-strong" style={{ marginTop: 'calc(env(safe-area-inset-top) + 0.5rem)' }} />
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-3">

              <div className="min-w-0">
                <h3 className="truncate font-display text-[17px] font-bold">{title}</h3>
                {subtitle && (
                  <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{subtitle}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="pressable flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              {children}
            </div>
            {footer && (
              <div className="border-t border-border bg-card/80 p-3 backdrop-blur">{footer}</div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}

// ─── Form atoms ─────────────────────────────────────────────────────────────

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="block">
      <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      {children}
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </label>
  )
}

export function TextIn({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-border bg-background/50 px-3 py-2.5 text-[13px] outline-none transition-colors focus:border-primary/60 focus:bg-background"
    />
  )
}

export function NumIn({
  value,
  onChange,
  placeholder,
}: {
  value: number
  onChange: (v: number) => void
  placeholder?: string
}) {
  return (
    <input
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(Number(e.target.value.replace(',', '.')) || 0)}
      placeholder={placeholder}
      className="tnum w-full rounded-xl border border-border bg-background/50 px-3 py-2.5 text-[13px] outline-none focus:border-primary/60 focus:bg-background"
    />
  )
}

export function TextArea({
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  rows?: number
  placeholder?: string
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full resize-y rounded-xl border border-border bg-background/50 px-3 py-2.5 text-[13px] outline-none focus:border-primary/60 focus:bg-background"
    />
  )
}

export function Toggle({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  hint?: string
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-3 text-left"
    >
      <div>
        <p className="text-[13px] font-semibold">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
      </div>
      <span
        className={`flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors ${value ? 'bg-gold-gradient' : 'bg-muted'}`}
      >
        <span className={`size-5 rounded-full bg-white shadow-sm transition-transform ${value ? 'translate-x-4' : ''}`} />
      </span>
    </button>
  )
}

export function SelectPill<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`pressable shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-semibold ${
            value === o.value
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-card text-muted-foreground'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ReadRow({
  label,
  value,
  mono,
  copyable,
}: {
  label: string
  value: string
  mono?: boolean
  copyable?: boolean
}) {
  const { show } = useToast()
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card/50 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        <p className={`mt-1 break-all text-[13px] ${mono ? 'font-mono text-[11.5px]' : ''}`}>
          {value || <span className="text-muted-foreground">—</span>}
        </p>
      </div>
      {copyable && value && (
        <button
          onClick={() => {
            navigator.clipboard?.writeText(value)
            show('Скопировано')
          }}
          className="pressable mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground"
        >
          <Copy className="size-3.5" />
        </button>
      )}
    </div>
  )
}

/**
 * Telegram-style grouped list: one caption, one rounded card, hairline rows.
 * Replaces stacks of bordered Field/ReadRow boxes so drawers read as a flat
 * settings list instead of dozens of competing cards.
 */
export function ListGroup({
  caption,
  children,
  action,
}: {
  caption?: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section>
      {(caption || action) && (
        <div className="mb-1.5 flex items-end justify-between gap-2 px-1">
          {caption && (
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {caption}
            </p>
          )}
          {action}
        </div>
      )}
      <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border-strong bg-card">
        {children}
      </div>
    </section>
  )
}

/** One row of a ListGroup: label left, value right, optional copy / link / tap. */
export function ListRow({
  label,
  value,
  mono,
  copyable,
  href,
  download,
  accent,
  onClick,
  right,
}: {
  label: string
  value?: string
  mono?: boolean
  copyable?: boolean
  href?: string
  /** Media URL: shows a download button that saves the file. */
  download?: string
  accent?: boolean
  onClick?: () => void
  right?: ReactNode
}) {
  const { show } = useToast()
  const valueCls = [
    'min-w-0 flex-1 break-words text-right text-[13px]',
    mono ? 'font-mono text-[11.5px]' : '',
    accent ? 'font-bold text-primary' : 'font-medium',
  ].join(' ')
  const body = (
    <>
      <p className="shrink-0 text-[12px] text-muted-foreground">{label}</p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-w-0 flex-1 items-center justify-end gap-1 text-[13px] font-semibold text-primary"
        >
          {value} <ExternalLink className="size-3 shrink-0" />
        </a>
      ) : value !== undefined ? (
        <p className={valueCls}>{value || <span className="text-muted-foreground">—</span>}</p>
      ) : null}
      {right}
      {download && (
        <a
          href={download}
          download
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title="Скачать файл"
          className="pressable flex size-6 shrink-0 items-center justify-center rounded-md text-primary"
        >
          <Download className="size-3.5" />
        </a>
      )}
      {copyable && (value || href) && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigator.clipboard?.writeText(download || href || value || '')
            show('Скопировано')
          }}

          className="pressable flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground"
        >
          <Copy className="size-3.5" />
        </button>
      )}
    </>
  )

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="pressable flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors active:bg-secondary/40"
      >
        {body}
      </button>
    )
  }
  return <div className="flex items-center gap-3 px-3.5 py-2.5">{body}</div>
}

/** Collapsed-by-default block; keeps rarely-used detail out of the way. */
export function Disclosure({
  label,
  children,
  defaultOpen,
  hint,
}: {
  label: string
  children: ReactNode
  defaultOpen?: boolean
  hint?: string
}) {
  const [open, setOpen] = useState(!!defaultOpen)
  return (
    <section className="overflow-hidden rounded-2xl border border-border-strong bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="pressable flex w-full items-center gap-2 px-3.5 py-3 text-left"
      >
        <span className="min-w-0 flex-1 text-[13px] font-semibold">{label}</span>
        {hint && <span className="shrink-0 text-[11.5px] text-muted-foreground">{hint}</span>}
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/70 p-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

export function PrimaryButton({
  onClick,
  children,
  disabled,
  loading,
  icon: Icon,
  size = 'md',
}: {
  onClick: () => void
  children: ReactNode
  disabled?: boolean
  loading?: boolean
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>
  size?: 'sm' | 'md' | 'lg'
}) {
  const h = size === 'sm' ? 'h-9 text-[12.5px]' : size === 'lg' ? 'h-12 text-[14px]' : 'h-11 text-[13.5px]'
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`pressable flex w-full items-center justify-center gap-2 rounded-xl bg-gold-gradient font-bold text-primary-foreground disabled:opacity-50 ${h}`}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : Icon ? <Icon className="size-4" strokeWidth={3} /> : null}
      {children}
    </button>
  )
}

export function GhostButton({
  onClick,
  children,
  tone = 'default',
  icon: Icon,
  size = 'md',
}: {
  onClick: () => void
  children: ReactNode
  tone?: 'default' | 'destructive' | 'primary'
  icon?: React.ComponentType<{ className?: string }>
  size?: 'sm' | 'md'
}) {
  const toneCls = {
    default: 'border-border bg-card text-foreground',
    primary: 'border-primary/40 bg-primary/10 text-primary',
    destructive: 'border-destructive/40 bg-destructive/10 text-destructive',
  }[tone]
  const h = size === 'sm' ? 'h-9 text-[12px]' : 'h-11 text-[13px]'
  return (
    <button
      onClick={onClick}
      className={`pressable flex w-full items-center justify-center gap-2 rounded-xl border font-bold ${toneCls} ${h}`}
    >
      {Icon && <Icon className="size-4" />}
      {children}
    </button>
  )
}

export function SaveBar({
  onSave,
  saving,
  label = 'Сохранить',
}: {
  onSave: () => void
  saving?: boolean
  label?: string
}) {
  return (
    <PrimaryButton onClick={onSave} loading={saving} icon={Check} size="lg">
      {label}
    </PrimaryButton>
  )
}

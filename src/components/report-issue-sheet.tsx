'use client'

import { motion } from 'framer-motion'
import {
  Ban,
  Check,
  KeyRound,
  MoreHorizontal,
  OctagonAlert,
  PackageX,
  ShieldAlert,
  Upload,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useI18n } from '@/lib/i18n'
import { useToast } from './toast'

type ReasonId = 'wrong_password' | 'banned' | 'suspended' | 'missing_data' | 'other'

const REASONS: { id: ReasonId; icon: typeof Ban; en: string; ru: string; tone: string }[] = [
  {
    id: 'wrong_password',
    icon: KeyRound,
    en: 'Wrong password',
    ru: 'Неверный пароль',
    tone: 'text-amber-400',
  },
  { id: 'banned', icon: Ban, en: 'Account banned', ru: 'Аккаунт забанен', tone: 'text-rose-400' },
  {
    id: 'suspended',
    icon: ShieldAlert,
    en: 'Account suspended',
    ru: 'Аккаунт заморожен',
    tone: 'text-orange-400',
  },
  {
    id: 'missing_data',
    icon: PackageX,
    en: 'Missing data',
    ru: 'Не хватает данных',
    tone: 'text-sky-400',
  },
  { id: 'other', icon: MoreHorizontal, en: 'Other', ru: 'Другое', tone: 'text-violet-400' },
]

export function ReportIssueSheet({
  open,
  onOpenChange,
  account,
  orderRef,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  account?: string
  orderRef?: string
}) {
  const { lang } = useI18n()
  const ru = lang === 'ru' || lang === 'uk'
  const { show } = useToast()
  const [reason, setReason] = useState<ReasonId | null>(null)
  const [desc, setDesc] = useState('')
  const [shots, setShots] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      setReason(null)
      setDesc('')
      setShots([])
      setSending(false)
    }
  }, [open])

  const canSubmit = !!reason && !sending

  function submit() {
    if (!canSubmit) return
    setSending(true)
    window.setTimeout(() => {
      onOpenChange(false)
      show({
        title: ru ? 'Жалоба отправлена' : 'Dispute submitted',
        description: ru
          ? 'Мы проверим и ответим в поддержке'
          : 'We will review it and reply in support',
        variant: 'success',
      })
    }, 550)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto rounded-t-3xl border-t border-destructive/25 bg-card p-0"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(120%_100%_at_50%_0%,color-mix(in_oklab,var(--destructive)_18%,transparent),transparent_70%)]" />

        <div className="relative px-5 pb-6 pt-5">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />

          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/12 text-destructive">
              <OctagonAlert className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-extrabold tracking-tight">
                {ru ? 'Сообщить о проблеме' : 'Report an issue'}
              </h2>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {account ? `@${account}` : null}
                {account && orderRef ? ' · ' : null}
                {orderRef ? orderRef.replace(/^auto:/, '').slice(0, 12) : null}
              </p>
            </div>
          </div>

          {/* Reason */}
          <p className="mt-5 mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {ru ? 'Причина' : 'Reason'} <span className="text-destructive">*</span>
          </p>
          <div className="grid gap-2">
            {REASONS.map((r) => {
              const active = reason === r.id
              const Icon = r.icon
              return (
                <button
                  key={r.id}
                  onClick={() => setReason(r.id)}
                  className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all active:scale-[0.99] ${
                    active
                      ? 'border-destructive/50 bg-destructive/10 shadow-[0_0_0_1px_color-mix(in_oklab,var(--destructive)_25%,transparent)]'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                  }`}
                >
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] ${r.tone}`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 text-[13px] font-semibold">
                    {ru ? r.ru : r.en}
                  </span>
                  <span
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      active
                        ? 'border-destructive bg-destructive text-white'
                        : 'border-white/20'
                    }`}
                  >
                    {active ? <Check className="size-3" strokeWidth={3} /> : null}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Description */}
          <p className="mt-5 mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {ru ? 'Описание' : 'Description'}
          </p>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] focus-within:border-destructive/40">
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value.slice(0, 1000))}
              rows={4}
              placeholder={
                ru ? 'Опишите проблему подробно…' : 'Describe the issue in detail…'
              }
              className="w-full resize-none bg-transparent px-3 py-2.5 text-[13px] outline-none placeholder:text-muted-foreground/60"
            />
            <div className="px-3 pb-2 text-right text-[10px] text-muted-foreground/60">
              {desc.length}/1000
            </div>
          </div>

          {/* Screenshots */}
          <p className="mt-5 mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {ru ? 'Скриншоты' : 'Screenshots'}{' '}
            <span className="font-medium normal-case tracking-normal text-muted-foreground/60">
              ({ru ? 'необязательно' : 'optional'})
            </span>
          </p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group w-full rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-3 py-4 transition-colors hover:border-destructive/40 hover:bg-destructive/[0.06] active:scale-[0.99]"
          >
            <span className="flex items-center justify-center gap-2 text-[13px] font-semibold text-muted-foreground transition-colors group-hover:text-foreground">
              <Upload className="size-4" />
              {ru ? 'Загрузить фото' : 'Upload a photo'}
            </span>
            <span className="mt-1 block text-[10px] text-muted-foreground/60">
              JPG · PNG · WEBP · HEIC · GIF
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif,image/*"
              multiple
              hidden
              onChange={(e) => {
                const files = Array.from(e.target.files ?? [])
                setShots((s) => [...s, ...files.map((f) => URL.createObjectURL(f))].slice(0, 6))
                e.target.value = ''
              }}
            />
          </button>

          {shots.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {shots.map((src, idx) => (
                <motion.div
                  key={`${src}-${idx}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative size-16 overflow-hidden rounded-xl border border-white/10 bg-black/40"
                >
                  <img src={src} alt="" className="size-full object-cover" />
                </motion.div>
              ))}
            </div>
          ) : null}

          {/* Actions */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-2xl border border-white/12 bg-white/[0.03] py-3 text-[13px] font-bold transition-colors hover:bg-white/[0.06]"
            >
              {ru ? 'Отмена' : 'Cancel'}
            </button>
            <button
              onClick={submit}
              disabled={!canSubmit}
              className="rounded-2xl bg-destructive py-3 text-[13px] font-extrabold text-white shadow-[0_10px_30px_-12px_color-mix(in_oklab,var(--destructive)_70%,transparent)] transition-all active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
            >
              {sending
                ? ru
                  ? 'Отправка…'
                  : 'Sending…'
                : ru
                  ? 'Отправить жалобу'
                  : 'Submit dispute'}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Pencil, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { RichTextEditor } from '@/components/rich-text-editor'
import { RichText } from '@/lib/rich-text'
import { useScrollLock } from '@/lib/use-scroll-lock'


export function AccountDescriptionSheet({
  open,
  onClose,
  text,
  lang,
  canEdit = false,
  onSave,
}: {
  open: boolean
  onClose: () => void
  title: string
  handle: string
  text: string
  lang: string
  /** Admin-only: enables inline editing right inside the sheet. */
  canEdit?: boolean
  onSave?: (next: string) => Promise<void>
}) {
  useScrollLock(open)
  const isRu = lang === 'ru'
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(text)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setDraft(text)
    setError(null)
    // Empty description + admin → open straight into the editor.
    setEditing(canEdit && text.trim().length === 0)
  }, [open, text, canEdit])

  const save = async (next: string) => {
    if (!onSave || saving) return
    setSaving(true)
    setError(null)
    try {
      await onSave(next)
      setEditing(false)
      if (!next.trim()) onClose()
    } catch (e) {
      console.error('[description] save', e)
      setError(isRu ? 'Не удалось сохранить. Попробуй ещё раз.' : 'Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }


  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[95] flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="relative w-full max-w-[480px] max-h-[90vh] overflow-y-auto rounded-t-[32px] border-t border-primary/30 bg-[#0A0A0A] shadow-[0_-10px_40px_color-mix(in_oklab,var(--primary)_10%,transparent)]"
          >
            {/* Gold hairline at the very top edge */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-0 h-[2px] w-40 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60"
            />

            {/* Grabber + close */}
            <div className="relative flex items-center justify-center px-6 pb-5 pt-3">
              <div className="h-1 w-10 rounded-full bg-white/10" />
              <button
                onClick={onClose}
                aria-label={isRu ? 'Закрыть' : 'Close'}
                className="absolute right-4 top-3 flex size-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-muted-foreground transition-colors hover:bg-white/[0.07] hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="relative px-6 pb-10">
              {/* Header */}
              <div className="mb-7 text-center">
                <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-primary/70">
                  {isRu ? 'Описание' : 'Description'}
                </span>
              </div>


              {/* Body */}
              {editing ? (
                <div>
                  <RichTextEditor
                    value={draft}
                    onChange={setDraft}
                    isRu={isRu}
                    placeholder={
                      isRu
                        ? 'Особенности аккаунта…\n\n**жирный**, *курсив*, ==выделение==\n- пункт списка\n\n| Параметр | Значение |\n| --- | --- |'
                        : 'Account highlights…\n\n**bold**, *italic*, ==highlight==\n- bullet item'
                    }
                  />
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/70">
                    {isRu
                      ? 'Выдели текст и жми кнопку — форматирование применится к выделению. Есть заголовки, списки, цитаты, таблицы и разделители.'
                      : 'Select text and hit a button — formatting applies to the selection. Headings, lists, quotes, tables and dividers included.'}
                  </p>

                  {error && (
                    <p className="mt-3 rounded-lg border border-destructive/25 bg-destructive/[0.07] px-3 py-2 text-[12px] font-medium text-destructive">
                      {error}
                    </p>
                  )}

                  <div className="mt-6 space-y-3">

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => save(draft)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-gold-deep py-4 text-[15px] font-bold text-primary-foreground shadow-[0_4px_20px_color-mix(in_oklab,var(--primary)_25%,transparent)] transition-transform active:scale-[0.98] disabled:opacity-60"
                    >
                      {saving && <Loader2 className="size-4 animate-spin" />}
                      {isRu ? 'Сохранить' : 'Save'}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        if (!text.trim()) return onClose()
                        setDraft(text)
                        setEditing(false)
                      }}
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-4 text-[15px] font-medium text-muted-foreground transition-transform active:scale-[0.98]"
                    >
                      {isRu ? 'Отмена' : 'Cancel'}
                    </button>
                    {text.trim().length > 0 && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => save('')}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/[0.07] py-3.5 text-[13px] font-semibold text-destructive transition-transform active:scale-[0.98]"
                      >
                        <Trash2 className="size-4" />
                        {isRu ? 'Удалить описание' : 'Delete description'}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* Gradient-bordered dossier card */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="mb-8 rounded-2xl bg-gradient-to-b from-primary/25 via-primary/10 to-transparent p-[1px]"
                  >
                    <div className="relative overflow-hidden rounded-[15px] bg-[#0F0F0F] p-5">
                      {/* inner gold wash */}
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 top-0 h-24"
                        style={{
                          background:
                            'radial-gradient(90% 100% at 50% 0%, color-mix(in oklab, var(--primary) 10%, transparent), transparent 70%)',
                        }}
                      />
                      <div className="relative">
                        <RichText text={text} />
                      </div>

                    </div>
                  </motion.div>


                  {/* Actions */}
                  <div className="space-y-3">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-gold-deep py-4 text-[15px] font-bold text-primary-foreground shadow-[0_4px_20px_color-mix(in_oklab,var(--primary)_25%,transparent)] transition-transform active:scale-[0.98]"
                      >
                        <Pencil className="size-4" />
                        {isRu ? 'Редактировать описание' : 'Edit description'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onClose}
                      className={
                        canEdit
                          ? 'w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-4 text-[15px] font-medium text-muted-foreground transition-transform active:scale-[0.98]'
                          : 'w-full rounded-xl bg-gradient-to-r from-primary to-gold-deep py-4 text-[15px] font-bold text-primary-foreground shadow-[0_4px_20px_color-mix(in_oklab,var(--primary)_25%,transparent)] transition-transform active:scale-[0.98]'
                      }
                    >
                      {isRu ? 'Понятно' : 'Got it'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

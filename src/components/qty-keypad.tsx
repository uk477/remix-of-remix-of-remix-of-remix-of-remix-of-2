'use client'

import { useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Delete } from 'lucide-react'

/**
 * Numeric keypad sheet used to type an exact amount (mirrors the Boost order
 * form keypad) — avoids the native mobile keyboard inside the mini app.
 */
export function QtyKeypad({
  open,
  title,
  min,
  max,
  doneLabel,
  onClose,
  onCommit,
}: {
  open: boolean
  title: string
  min: number
  max: number
  doneLabel: string
  onClose: () => void
  onCommit: (n: number) => void
}) {
  const [draft, setDraft] = useState('')

  const press = useCallback((key: string) => {
    setDraft((prev) => {
      if (key === 'back') return prev.length <= 1 ? '' : prev.slice(0, -1)
      if (prev.replace(/^0+/, '').length >= 7) return prev
      if (prev === '0') return key
      return prev + key
    })
  }, [])

  function commit() {
    if (draft !== '') {
      const n = Number(draft)
      if (Number.isFinite(n) && n > 0) onCommit(Math.min(Math.max(n, min), max))
    }
    setDraft('')
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="qty-keypad"
          className="fixed inset-0 z-[90] flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={commit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            exit={{ y: '110%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="relative w-full max-w-[440px] rounded-t-[28px] border border-white/5 bg-card/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-24px_60px_-10px_rgba(0,0,0,0.6)] backdrop-blur-xl"
            style={{ touchAction: 'none' }}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/15" />
            <div className="mb-3 flex items-baseline justify-between px-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {title}
              </span>
              <motion.span
                key={draft || '0'}
                initial={{ scale: 0.9, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                className="tnum font-mono text-2xl font-bold text-primary"
              >
                {(Number(draft) || 0).toLocaleString()}
              </motion.span>
            </div>
            <div className="mb-2 flex justify-between px-2 text-[10px] font-semibold text-muted-foreground/70">
              <span>{min.toLocaleString()}</span>
              <span>{max.toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'].map((k, i) => {
                if (k === '') return <div key={`sp-${i}`} className="h-14" />
                const isAction = k === 'back'
                return (
                  <motion.button
                    key={k}
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    onClick={() => press(k)}
                    className={`relative flex h-14 items-center justify-center rounded-2xl border font-mono text-2xl font-semibold tabular-nums transition-colors ${
                      isAction
                        ? 'border-white/5 bg-white/[0.03] text-muted-foreground'
                        : 'border-white/5 bg-white/[0.06] text-foreground'
                    } active:border-primary/40`}
                  >
                    {isAction ? <Delete className="size-5" /> : k}
                  </motion.button>
                )
              })}
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={commit}
              className="mt-3 w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground"
            >
              {doneLabel}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

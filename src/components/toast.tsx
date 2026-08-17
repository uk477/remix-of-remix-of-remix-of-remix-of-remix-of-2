'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, Info, TriangleAlert } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

export type ToastVariant = 'success' | 'error' | 'info'

export type ToastOptions = {
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

type ToastPayload = {
  id: number
  title: string
  description?: string
  variant: ToastVariant
}

type ToastContextType = {
  show: (msg: string | ToastOptions, opts?: ToastOptions) => void
}
const ToastContext = createContext<ToastContextType | null>(null)

const STYLES: Record<ToastVariant, { icon: typeof Check; accent: string; tint: string }> = {
  success: { icon: Check, accent: 'var(--success)', tint: 'text-success' },
  error: { icon: TriangleAlert, accent: 'var(--destructive)', tint: 'text-destructive' },
  info: { icon: Info, accent: 'var(--primary)', tint: 'text-primary' },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastPayload | null>(null)
  const timerRef = useRef<number | null>(null)
  const idRef = useRef(0)

  const clear = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  const show = useCallback(
    (msg: string | ToastOptions, opts?: ToastOptions) => {
      const o: ToastOptions = typeof msg === 'string' ? { title: msg, ...opts } : msg
      idRef.current += 1
      setToast({
        id: idRef.current,
        title: o.title ?? '',
        description: o.description,
        variant: o.variant ?? 'success',
      })
      clear()
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null
        setToast(null)
      }, o.duration ?? 2600)
    },
    [clear],
  )

  useEffect(() => () => clear(), [clear])

  const value = useMemo(() => ({ show }), [show])
  const style = STYLES[toast?.variant ?? 'success']
  const Icon = style.icon

  return (
    <ToastContext.Provider value={value}>
      {children}
      <AnimatePresence mode="wait">
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -12, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 520, damping: 32 }}
            className="pointer-events-none fixed inset-x-0 top-[max(16px,env(safe-area-inset-top))] z-[200] flex justify-center px-4"
          >
            <button
              type="button"
              onClick={() => setToast(null)}
              className="pointer-events-auto inline-flex max-w-[min(92vw,320px)] items-center gap-2 rounded-full border border-border/60 bg-background/92 px-3.5 py-2 text-left shadow-[0_10px_30px_-8px_rgba(0,0,0,0.7)] backdrop-blur-xl"
            >
              <span
                className="flex size-5 shrink-0 items-center justify-center rounded-full"
                style={{ background: `color-mix(in oklab, ${style.accent} 18%, transparent)` }}
              >
                <Icon className="size-3" strokeWidth={3} style={{ color: style.accent }} />
              </span>

              <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-semibold leading-tight tracking-tight text-foreground">
                  {toast.title}
                </span>
                {toast.description && (
                  <span className="mt-0.5 block truncate text-[11px] leading-tight text-muted-foreground">
                    {toast.description}
                  </span>
                )}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

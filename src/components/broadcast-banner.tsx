'use client'

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Megaphone, X } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/lib/auth'

type Broadcast = {
  id: string
  title: string
  body: string
  image_url: string | null
  sent_at: string | null
  created_at: string
}

export function BroadcastBanner() {
  const { user } = useAuth()
  const [item, setItem] = useState<Broadcast | null>(null)

  const loadNext = useCallback(async () => {
    if (!user) return
    const { data: reads } = await supabase
      .from('broadcast_reads')
      .select('broadcast_id')
      .eq('user_id', user.id)
    const seen = new Set((reads ?? []).map((r) => r.broadcast_id))
    const { data } = await supabase
      .from('broadcast_campaigns')
      .select('id,title,body,image_url,sent_at,created_at')
      .eq('channel', 'inapp')
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(20)
    const next = ((data as Broadcast[]) ?? []).find((b) => !seen.has(b.id))
    setItem(next ?? null)
  }, [user])

  useEffect(() => {
    loadNext()
    if (!user) return
    const ch = supabase
      .channel('inapp-broadcasts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'broadcast_campaigns' },
        loadNext,
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [user, loadNext])

  async function dismiss() {
    if (!user || !item) return
    const b = item
    setItem(null)
    await supabase
      .from('broadcast_reads')
      .insert({ broadcast_id: b.id, user_id: user.id })
    setTimeout(loadNext, 250)
  }

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="fixed inset-x-0 top-0 z-40 flex justify-center px-3 pt-[calc(env(safe-area-inset-top)+8px)]"
        >
          <div className="w-full max-w-[456px] overflow-hidden rounded-2xl border border-primary/50 bg-[linear-gradient(140deg,color-mix(in_oklab,var(--card)_78%,var(--primary)_22%),var(--secondary))] shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
            {item.image_url && (
              <img
                src={item.image_url}
                alt=""
                className="h-28 w-full object-cover"
              />
            )}
            <div className="flex items-start gap-3 p-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gold-gradient text-primary-foreground">
                <Megaphone className="size-4" strokeWidth={2.6} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-bold">{item.title}</p>
                <p className="mt-0.5 whitespace-pre-wrap text-[12px] text-muted-foreground">
                  {item.body}
                </p>
              </div>
              <button
                onClick={dismiss}
                aria-label="Закрыть"
                className="pressable flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

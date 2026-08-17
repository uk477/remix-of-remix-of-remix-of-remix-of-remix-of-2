import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { normalizeLang, sendTelegramMessage, type Lang } from './telegram-notify.server'

// ─── Localized "order ready" copy ──────────────────────────────────────
const ORDER_READY: Record<Lang, (title: string) => string> = {
  en: (t) => `AURX\n\nYour order is ready for delivery! \n«${t}»\nOpen the bot to receive your accounts.`,
  ru: (t) => `AURX\n\nВаш заказ готов к выдаче! \n«${t}»\nОткройте бот, чтобы забрать данные.`,
  uk: (t) => `AURX\n\nВаше замовлення готове до видачі! \n«${t}»\nВідкрийте бота, щоб забрати дані.`,
  ar: (t) => `AURX\n\nطلبك جاهز للتسليم! \n«${t}»\nافتح البوت لاستلام حساباتك.`,
  zh: (t) => `AURX\n\n您的订单已准备就绪!\n「${t}」\n打开机器人即可领取账号。`,
  es: (t) => `AURX\n\n¡Tu pedido está listo! \n«${t}»\nAbre el bot para recibir tus cuentas.`,
  tr: (t) => `AURX\n\nSiparişin teslime hazır! \n«${t}»\nHesaplarını almak için botu aç.`,
  pt: (t) => `AURX\n\nSeu pedido está pronto! \n«${t}»\nAbra o bot para receber suas contas.`,
  fr: (t) => `AURX\n\nVotre commande est prête ! \n«${t}»\nOuvrez le bot pour récupérer vos comptes.`,
}

type OrderStatus = 'pending' | 'in_progress' | 'waiting' | 'completed' | 'declined' | 'refunded'

/**
 * Admin saves an order (status + note). When the status transitions to
 * `completed` (ready for delivery), the buyer gets a Telegram notification
 * immediately — exactly once per transition.
 *
 * Centralizing the update here lets us detect the status change atomically and
 * fire the notification on the server, where the Telegram gateway key lives.
 */
export const adminSaveOrder = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      orderId: string
      status: OrderStatus
      adminNote: string | null
      accounts?: Record<string, string>[] | null
      /** Buyer-visible fulfilment stage (1-based) for custom orders. */
      progressStep?: number | null
    }) => {
      if (!input?.orderId) throw new Error('orderId required')
      const allowed: OrderStatus[] = [
        'pending',
        'in_progress',
        'waiting',
        'completed',
        'declined',
        'refunded',
      ]
      if (!allowed.includes(input.status)) throw new Error('invalid status')
      // Delivery payload: admin-picked fields/values per account.
      const accounts = Array.isArray(input.accounts)
        ? input.accounts.slice(0, 500).map((acc) => {
            const out: Record<string, string> = {}
            Object.entries(acc ?? {}).forEach(([k, v]) => {
              if (typeof k === 'string' && k.length <= 40) out[k] = String(v ?? '').slice(0, 2000)
            })
            return out
          })
        : null
      return {
        orderId: String(input.orderId).slice(0, 100),
        status: input.status,
        adminNote: input.adminNote ?? null,
        accounts,
        progressStep:
          typeof input.progressStep === 'number'
            ? Math.min(Math.max(Math.round(input.progressStep), 1), 20)
            : null,
      }
    },
  )

  .handler(async ({ data, context }) => {
    const { supabase } = context

    // Admin-only guard.
    const { data: isAdmin, error: roleErr } = await supabase.rpc('has_role', {
      _user_id: context.userId,
      _role: 'admin',
    })
    if (roleErr) throw new Error(roleErr.message)
    if (!isAdmin) throw new Error('Forbidden')

    // Read the current row to detect the status transition.
    const { data: row, error: readErr } = await supabase
      .from('orders')
      .select('status, user_id, title, meta')
      .eq('id', data.orderId)
      .maybeSingle()
    if (readErr) throw new Error(readErr.message)
    if (!row) throw new Error('Order not found')

    const prevStatus = row.status as OrderStatus | null

    const patch: {
      status: OrderStatus
      admin_note: string | null
      meta?: Record<string, unknown>
    } = {
      status: data.status,
      admin_note: data.adminNote,
    }
    // Delivery payload and buyer-visible stage both live in meta — the same
    // place the buyer's order page reads them from.
    if (data.accounts || data.progressStep !== null) {
      const meta = ((row as { meta?: Record<string, unknown> | null }).meta ?? {}) as Record<
        string,
        unknown
      >
      patch.meta = {
        ...meta,
        ...(data.accounts ? { accounts: data.accounts } : {}),
        ...(data.progressStep !== null ? { progress_step: data.progressStep } : {}),
      }
    }

    const { error: updErr } = await supabase
      .from('orders')
      .update(patch as never)
      .eq('id', data.orderId)
    if (updErr) throw new Error(updErr.message)


    // Fire the buyer notification exactly once on the → completed transition.
    let notified = false
    if (data.status === 'completed' && prevStatus !== 'completed') {
      const userId = row.user_id as string
      const { data: profile } = await supabase
        .from('profiles')
        .select('telegram_id, language')
        .eq('id', userId)
        .maybeSingle()
      const chatId = (profile as { telegram_id?: string | null } | null)?.telegram_id ?? null
      if (chatId) {
        const lang = normalizeLang((profile as { language?: string | null } | null)?.language ?? null)
        const text = ORDER_READY[lang](String(row.title ?? ''))
        const r = await sendTelegramMessage(String(chatId), text)
        notified = r.ok
      }
    }

    return { ok: true, notified, transitionedToCompleted: data.status === 'completed' && prevStatus !== 'completed' }
  })

/**
 * Local test orders live in the admin's browser, so there is no DB row to read.
 * This mirrors the "order ready" notification for them: it sends the exact same
 * message to the calling admin's own Telegram chat.
 */
export const notifyTestOrderReady = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { title: string }) => ({
    title: String(input?.title ?? '').slice(0, 200),
  }))
  .handler(async ({ data, context }) => {
    const { supabase } = context
    const { data: isAdmin, error: roleErr } = await supabase.rpc('has_role', {
      _user_id: context.userId,
      _role: 'admin',
    })
    if (roleErr) throw new Error(roleErr.message)
    if (!isAdmin) throw new Error('Forbidden')

    const { data: profile } = await supabase
      .from('profiles')
      .select('telegram_id, language')
      .eq('id', context.userId)
      .maybeSingle()
    const chatId = (profile as { telegram_id?: string | null } | null)?.telegram_id ?? null
    if (!chatId) return { ok: true, notified: false }

    const lang = normalizeLang((profile as { language?: string | null } | null)?.language ?? null)
    const r = await sendTelegramMessage(String(chatId), ORDER_READY[lang](data.title))
    return { ok: true, notified: r.ok }
  })

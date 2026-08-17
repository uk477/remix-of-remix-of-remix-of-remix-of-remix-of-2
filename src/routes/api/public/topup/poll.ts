import { createFileRoute } from '@tanstack/react-router'
import { verifyIncomingPayment, requiredConfirmations } from '@/lib/topup-verify.server'
import { normalizeLang, sendTelegramMessage, type Lang } from '@/lib/telegram-notify.server'

// Localized copy for topup notifications
const TOPUP_SUCCESS: Record<Lang, (amt: string) => string> = {
  en: (a) => `AURX\n\nPayment confirmed on-chain. Your balance has been credited: +${a}.`,
  ru: (a) => `AURX\n\nПлатёж подтверждён в блокчейне. Баланс пополнен: +${a}.`,
  uk: (a) => `AURX\n\nПлатіж підтверджено у блокчейні. Баланс поповнено: +${a}.`,
  ar: (a) => `AURX\n\nتم تأكيد الدفع على البلوكشين. تم تعزيز الرصيد: +${a}.`,
  zh: (a) => `AURX\n\n链上已确认收款,余额已到账:+${a}。`,
  es: (a) => `AURX\n\nPago confirmado en la cadena. Tu saldo se ha recargado: +${a}.`,
  tr: (a) => `AURX\n\nÖdeme zincir üzerinde doğrulandı. Bakiye yüklendi: +${a}.`,
  pt: (a) => `AURX\n\nPagamento confirmado em cadeia. Seu saldo foi creditado: +${a}.`,
  fr: (a) => `AURX\n\nPaiement confirmé sur la blockchain. Votre solde a été crédité : +${a}.`,
}
const TOPUP_EXPIRED: Record<Lang, string> = {
  en: 'AURX\n\nYour top-up expired without a confirmed payment. You can start a new one anytime.',
  ru: 'AURX\n\nВремя пополнения истекло — платёж не найден. Можно оформить новое.',
  uk: 'AURX\n\nЧас поповнення вичерпано — платіж не знайдено. Можете створити нове.',
  ar: 'AURX\n\nانتهت مهلة الشحن دون تأكيد الدفع. يمكنك بدء عملية جديدة.',
  zh: 'AURX\n\n充值超时,未检测到已确认的付款。您可以随时重新发起。',
  es: 'AURX\n\nTu recarga expiró sin un pago confirmado. Puedes iniciar una nueva cuando quieras.',
  tr: 'AURX\n\nYükleme süresi doldu; onaylı ödeme bulunamadı. İstediğin zaman yeni bir yükleme başlatabilirsin.',
  pt: 'AURX\n\nSua recarga expirou sem um pagamento confirmado. Você pode iniciar outra a qualquer momento.',
  fr: 'AURX\n\nVotre recharge a expiré sans paiement confirmé. Vous pouvez en démarrer une nouvelle à tout moment.',
}

const TOPUP_TTL_MS = 30 * 60 * 1000

export const Route = createFileRoute('/api/public/topup/poll')({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

        // Fetch pending topups that the user confirmed as paid, or that are old enough to expire
        const cutoff = new Date(Date.now() - TOPUP_TTL_MS).toISOString()
        const { data: pending, error } = await supabaseAdmin
          .from('topups')
          .select('id, user_id, coin, network, amount_usd, address, created_at, rate, confirmations, required_confirmations, verifier_state, user_confirmed_at, detected_tx_hash')
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
          .limit(50)

        if (error) {
          console.error('[topup:poll:fetch]', error)
          return Response.json({ ok: false, error: error.message }, { status: 500 })
        }

        const results: { id: string; state: string }[] = []

        for (const tp of pending ?? []) {
          const createdMs = new Date(tp.created_at).getTime()
          const expired = Date.now() - createdMs > TOPUP_TTL_MS
          const userConfirmed = !!tp.user_confirmed_at

          // Only scan after user pressed "I paid" (avoid burning API quota on abandoned invoices)
          if (!userConfirmed && !expired) continue

          if (expired && tp.verifier_state !== 'success') {
            await supabaseAdmin
              .from('topups')
              .update({ status: 'declined', verifier_state: 'declined', updated_at: new Date().toISOString() })
              .eq('id', tp.id)
              .eq('status', 'pending')
            await notifyUser(supabaseAdmin, tp.user_id, (lang) => TOPUP_EXPIRED[lang])
            results.push({ id: tp.id, state: 'expired' })
            continue
          }

          const usdRate = Number(tp.rate ?? 0) > 0 ? Number(tp.rate) : await guessRate(tp.coin)
          const required = requiredConfirmations(tp.coin, tp.network ?? '')

          const result = await verifyIncomingPayment({
            symbol: tp.coin,
            network: tp.network ?? '',
            address: tp.address,
            expectedUsd: Number(tp.amount_usd),
            usdRate,
            createdAtMs: createdMs,
          })

          if (result && 'manualRequired' in result) {
            await supabaseAdmin
              .from('topups')
              .update({ verifier_state: 'manual_required', required_confirmations: required, last_checked_at: new Date().toISOString() })
              .eq('id', tp.id)
            results.push({ id: tp.id, state: 'manual_required' })
            continue
          }

          if (!result) {
            await supabaseAdmin
              .from('topups')
              .update({ verifier_state: 'scanning', required_confirmations: required, last_checked_at: new Date().toISOString(), check_error: null })
              .eq('id', tp.id)
            results.push({ id: tp.id, state: 'scanning' })
            continue
          }

          if (result.confirmations >= required) {
            // Credit balance atomically; ignores if already credited
            const { error: crErr } = await supabaseAdmin.rpc('credit_topup', { _topup_id: tp.id })
            if (crErr) {
              console.error('[topup:credit]', tp.id, crErr)
              await supabaseAdmin
                .from('topups')
                .update({ verifier_state: 'confirming', confirmations: result.confirmations, required_confirmations: required, detected_tx_hash: result.txHash, detected_amount: result.amountUsd, tx_hash: result.txHash, check_error: crErr.message, last_checked_at: new Date().toISOString() })
                .eq('id', tp.id)
              results.push({ id: tp.id, state: 'credit_failed' })
              continue
            }
            await supabaseAdmin
              .from('topups')
              .update({ confirmations: result.confirmations, required_confirmations: required, detected_tx_hash: result.txHash, detected_amount: result.amountUsd, detected_at: new Date().toISOString(), tx_hash: result.txHash, last_checked_at: new Date().toISOString() })
              .eq('id', tp.id)
            await notifyUser(supabaseAdmin, tp.user_id, (lang) => TOPUP_SUCCESS[lang](`$${Number(tp.amount_usd).toFixed(2)}`))
            results.push({ id: tp.id, state: 'success' })
          } else {
            await supabaseAdmin
              .from('topups')
              .update({
                verifier_state: 'confirming',
                confirmations: result.confirmations,
                required_confirmations: required,
                detected_tx_hash: result.txHash,
                detected_amount: result.amountUsd,
                detected_at: tp.detected_tx_hash ? undefined : new Date().toISOString(),
                tx_hash: result.txHash,
                last_checked_at: new Date().toISOString(),
                check_error: null,
              })
              .eq('id', tp.id)
            results.push({ id: tp.id, state: `confirming_${result.confirmations}_${required}` })
          }
        }

        return Response.json({ ok: true, processed: results.length, results })
      },
    },
  },
})

async function notifyUser(
  supabaseAdmin: import('@supabase/supabase-js').SupabaseClient,
  userId: string,
  build: (lang: Lang) => string,
): Promise<void> {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('telegram_id, language')
    .eq('id', userId)
    .maybeSingle()
  if (!profile?.telegram_id) return
  const lang = normalizeLang(profile.language as string | null)
  await sendTelegramMessage(String(profile.telegram_id), build(lang))
}

// Fallback rate if the topup row didn't store it — use a cheap public feed.
async function guessRate(symbol: string): Promise<number> {
  try {
    const s = symbol.toUpperCase()
    if (['USDT', 'USDC', 'DAI'].includes(s)) return 1
    const map: Record<string, string> = {
      BTC: 'bitcoin', LTC: 'litecoin', DOGE: 'dogecoin', ETH: 'ethereum', BNB: 'binancecoin',
      POL: 'matic-network', TRX: 'tron', TON: 'the-open-network', GRAM: 'the-open-network', SOL: 'solana', XRP: 'ripple', XMR: 'monero',
      BASE: 'ethereum',
    }
    const id = map[s]
    if (!id) return 0
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`)
    if (!r.ok) return 0
    const j = (await r.json()) as Record<string, { usd?: number }>
    return j[id]?.usd ?? 0
  } catch {
    return 0
  }
}

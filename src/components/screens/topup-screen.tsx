'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  Clock,
  Copy,
  Delete,
  Loader2,
  QrCode,
  Shield,
  TrendingUp,
  X,
} from 'lucide-react'
import QRCode from 'qrcode'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { COIN_GROUPS, COINS } from '@/lib/data'
import { cryptoAmount, money } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { useNav } from '@/lib/nav'
import { useStore } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { useSessionState } from '@/lib/persistent-state'
import { copyText } from '@/lib/clipboard'

import { supabase } from '@/integrations/supabase/client'
import { useRouterState } from '@tanstack/react-router'
import { ScreenHeader } from '../screen-header'
import { MoneroManagerSheet } from '../monero-manager-sheet'
import { useToast } from '../toast'
import { Button } from '../ui/button'
import { CoinIcon } from '../ui/coin-icon'


// BIP-21 style payment URIs; wallets ignore params they don't understand,
// and fall back to the plain address when the scheme is unknown.
const URI_SCHEMES: Record<string, string> = {
  BTC: 'bitcoin', LTC: 'litecoin', DOGE: 'dogecoin', XMR: 'monero',
  ETH: 'ethereum', BNB: 'ethereum', POL: 'ethereum', BASE: 'ethereum',
  TRX: 'tron', TON: 'ton', GRAM: 'ton', SOL: 'solana', XRP: 'ripple',
}
function paymentUri(symbol: string, network: string, address: string, amount: string) {
  const key = URI_SCHEMES[symbol] ?? URI_SCHEMES[network] ?? ''
  const amt = amount && Number(amount) > 0 ? `?amount=${amount}` : ''
  return key ? `${key}:${address}${amt}` : address
}


const PRESETS = [5, 10, 25, 50, 100]

// Monero TXID: 64 lowercase hex chars. Strip spaces, "0x", and any stray
// characters pasted from wallets/explorers so a valid hash never reads as invalid.
function sanitizeTxid(raw: string) {
  return raw
    .trim()
    .replace(/^0x/i, '')
    .replace(/[^0-9a-fA-F]/g, '')
    .toLowerCase()
    .slice(0, 64)
}

export function TopupScreen() {
  const { t } = useI18n()
  // t() echoes the key back when a translation is missing — fall back to copy.
  const tr = (key: string, fallback: string) => {
    const v = t(key)
    return !v || v === key ? fallback : v
  }
  const { back, go } = useNav()
  const { addTopup, updateTopup, topups } = useStore()
  const { user } = useAuth()
  const { show } = useToast()
  const resumeId = useRouterState({
    select: (s) => (s.location.search as { resume?: string })?.resume ?? null,
  })


  // Flow state is session-backed: iOS / Telegram WebViews get discarded when
  // the app is backgrounded, and a plain useState would drop the user back on
  // the first step after they return from their wallet app.
  const [amount, setAmount] = useSessionState<string>('aurex:topup:amount', '10')
  const amountNum = Number(amount) || 0
  const [keypadOpen, setKeypadOpen] = useState(false)

  const [groupId, setGroupId] = useSessionState<string | null>('aurex:topup:group', null)
  const [coinId, setCoinId] = useSessionState<string | null>('aurex:topup:coin', null)
  const [stage, setStage] = useSessionState<
    'amount' | 'pay' | 'xmr_hash' | 'xmr_pending' | 'done'
  >('aurex:topup:stage', 'amount')
  const [xmrHash, setXmrHash] = useSessionState('aurex:topup:xmrhash', '')
  const [xmrSheet, setXmrSheet] = useState(false)
  const [xmrSubmitting, setXmrSubmitting] = useState(false)
  const xmrHashValid = /^[0-9a-f]{64}$/.test(xmrHash)
  const [copied, setCopied] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [expiresAt, setExpiresAt] = useSessionState<number | null>('aurex:topup:expires', null)
  const [topupId, setTopupId] = useSessionState<string | null>('aurex:topup:id', null)
  const [now, setNow] = useState(() => Date.now())
  const [verify, setVerify] = useState<{
    state: 'awaiting_user' | 'scanning' | 'confirming' | 'success' | 'declined' | 'manual_required'
    confirmations: number
    required: number
    detectedTx?: string | null
  }>({ state: 'awaiting_user', confirmations: 0, required: 0 })
  const [invoice, setInvoice] = useSessionState<{
    coinId: string
    usd: number
    rate: number
    sendAmount: string
  } | null>('aurex:topup:invoice', null)

  // Once the flow finished, drop the saved snapshot so the next top-up starts
  // from a clean amount screen.
  useEffect(() => {
    if (stage !== 'done') return
    try {
      for (const k of [
        'aurex:topup:amount',
        'aurex:topup:group',
        'aurex:topup:coin',
        'aurex:topup:stage',
        'aurex:topup:xmrhash',
        'aurex:topup:expires',
        'aurex:topup:id',
        'aurex:topup:invoice',
      ]) {
        sessionStorage.removeItem(k)
      }
    } catch {
      /* ignore */
    }
  }, [stage])


  // Resume a pending top-up when the URL carries ?resume=<id>
  useEffect(() => {
    if (!resumeId || topupId === resumeId) return
    const pending = topups.find((tp) => tp.id === resumeId && tp.status === 'pending')
    if (!pending) return
    const match =
      COINS.find(
        (c) =>
          c.symbol.toUpperCase() === pending.coin.toUpperCase() &&
          c.network.toUpperCase() === pending.network.toUpperCase(),
      ) ?? COINS.find((c) => c.symbol.toUpperCase() === pending.coin.toUpperCase())
    if (!match) return
    const grp = COIN_GROUPS.find((g) => g.networks.some((n) => n.id === match.id))
    setGroupId(grp?.id ?? null)
    setCoinId(match.id)
    setAmount(String(Math.round(pending.amount)))
    setTopupId(pending.id)
    setInvoice({
      coinId: match.id,
      usd: pending.amount,
      rate: match.usdRate,
      sendAmount: cryptoAmount(pending.amount, match.usdRate),
    })
    setExpiresAt(pending.date + 30 * 60 * 1000)
    setStage('pay')
  }, [resumeId, topups, topupId])


  // ─── Live verification: watch topup row for status/confirmation changes ─
  useEffect(() => {
    if (!topupId || stage === 'amount') return
    const activeTopupId = topupId
    let cancelled = false

    async function pull() {
      const { data } = await supabase
        .from('topups')
        .select('status, verifier_state, confirmations, required_confirmations, detected_tx_hash, user_confirmed_at')
        .eq('id', activeTopupId)
        .maybeSingle()
      if (cancelled || !data) return
      const row = data as {
        status: string
        verifier_state: string | null
        confirmations: number | null
        required_confirmations: number | null
        detected_tx_hash: string | null
        user_confirmed_at: string | null
      }


      setVerify({
        state: (row.verifier_state as typeof verify.state) ?? 'awaiting_user',
        confirmations: row.confirmations ?? 0,
        required: row.required_confirmations ?? 0,
        detectedTx: row.detected_tx_hash,
      })
      if (row.status === 'success') {
        setStage('done')
      } else if (row.status === 'declined') {
        show(t('expired') ?? 'Expired')
        back()
      }
    }

    void pull()

    // Kick the on-chain verifier so the invoice is scanned right away instead
    // of waiting for the next scheduled run.
    const kick = () => {
      void fetch('/api/public/topup/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
        .then(() => pull())
        .catch(() => {})
    }
    kick()

    const channel = supabase
      .channel(`topup-${activeTopupId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'topups', filter: `id=eq.${activeTopupId}` },
        () => void pull(),
      )
      .subscribe()

    const id = setInterval(pull, 15_000)
    const kickId = setInterval(kick, 30_000)
    return () => {
      cancelled = true
      clearInterval(id)
      clearInterval(kickId)
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topupId, stage])






  const group = COIN_GROUPS.find((g) => g.id === groupId) ?? null
  const coin = coinId ? COINS.find((c) => c.id === coinId) ?? null : null

  const rate = invoice && coin?.id === invoice.coinId ? invoice.rate : (coin?.usdRate ?? 1)
  const invoiceUsd = useMemo(
    () => +(amountNum + (Math.floor(Math.random() * 90) + 10) / 10000).toFixed(4),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [amountNum, coinId, stage === 'pay'],
  )

  const sendAmount = invoice && coin?.id === invoice.coinId ? invoice.sendAmount : coin ? cryptoAmount(invoiceUsd, rate) : ''

  function lockInvoice() {
    if (!coin) return
    const fixedUsd = +(amountNum + (Math.floor(Math.random() * 90) + 10) / 10000).toFixed(4)
    const fixedRate = coin.usdRate
    setInvoice({
      coinId: coin.id,
      usd: fixedUsd,
      rate: fixedRate,
      sendAmount: cryptoAmount(fixedUsd, fixedRate),
    })
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`
    setTopupId(id)
    addTopup({
      id,
      date: Date.now(),
      amount: fixedUsd,
      coin: coin.symbol,
      network: coin.network,
      status: 'pending',
      address: coin.address,
    })

    setStage('pay')
  }

  function selectGroup(id: string) {
    const g = COIN_GROUPS.find((x) => x.id === id)
    if (!g) return
    // Monero can't be credited automatically — route the user to a manager
    // instead of letting them start an invoice that nobody can verify.
    if (g.symbol === 'XMR') {
      setXmrSheet(true)
      return
    }
    setGroupId(id)
    setInvoice(null)
    // Auto-pick network if only one; otherwise clear selection
    setCoinId(g.networks.length === 1 ? g.networks[0].id : null)
  }

  async function copyAddress() {
    if (!coin) return
    const ok = await copyText(coin.address)
    if (!ok) {
      show(tr('copy_failed', 'Copy failed — select the address manually'))
      return
    }
    setCopied(true)
    show(t('copied'))
    setTimeout(() => setCopied(false), 1500)
  }

  async function copyAmount() {
    if (!sendAmount) return
    const ok = await copyText(sendAmount)
    show(ok ? t('copied') : tr('copy_failed', 'Copy failed — select the amount manually'))
  }


  async function confirmPaid() {
    if (!topupId || !user) return
    // Monero can't be verified automatically (private ledger) — collect the
    // tx hash from the user and hand it to the manual review queue.
    if (coin?.symbol === 'XMR') {
      setStage('xmr_hash')
      return
    }
    // Do NOT credit the balance here. Mark the invoice as "user says paid" so
    // the on-chain verifier picks it up. Balance is credited only after the
    // required number of confirmations by the server poller.
    const { error } = await supabase
      .from('topups')
      .update({
        user_confirmed_at: new Date().toISOString(),
        verifier_state: 'scanning',
      })
      .eq('id', topupId)
      .eq('user_id', user.id)
    if (error) {
      console.error('[topup] mark paid failed', error)
      show(t('error') ?? 'Error')
      return
    }
    setVerify({ state: 'scanning', confirmations: 0, required: 0 })
    show(t('verifying_note') ?? 'Payment is being verified')
    back()
  }

  async function submitXmrHash() {
    if (!topupId || !user || !xmrHashValid || xmrSubmitting) return
    setXmrSubmitting(true)
    const hash = xmrHash.trim().toLowerCase()
    const { error } = await supabase
      .from('topups')
      .update({
        user_confirmed_at: new Date().toISOString(),
        verifier_state: 'manual_required',
        tx_hash: hash,
        detected_tx_hash: hash,
      })
      .eq('id', topupId)
      .eq('user_id', user.id)
    setXmrSubmitting(false)
    if (error) {
      console.error('[topup] xmr hash submit failed', error)
      show(t('error') ?? 'Error')
      return
    }
    setStage('xmr_pending')
  }

  async function pasteXmrHash() {
    const apply = (text: string | null | undefined) => {
      const clean = sanitizeTxid((text ?? '').trim())
      if (clean) {
        setXmrHash(clean)
        return true
      }
      return false
    }

    // 1) Telegram Mini App clipboard bridge (works inside the TG WebView).
    const tg = (window as any)?.Telegram?.WebApp
    // readTextFromClipboard landed in Bot API 6.4 — calling it on older
    // clients throws a console error and never invokes the callback.
    if (tg?.isVersionAtLeast?.('6.4') && typeof tg?.readTextFromClipboard === 'function') {

      const got = await new Promise<boolean>((resolve) => {
        let settled = false
        try {
          tg.readTextFromClipboard((text: string) => {
            settled = true
            resolve(apply(text))
          })
        } catch {
          resolve(false)
          return
        }
        setTimeout(() => {
          if (!settled) resolve(false)
        }, 1200)
      })
      if (got) return
    }

    // 2) Standard async clipboard API (needs secure context + permission).
    try {
      const text = await navigator.clipboard?.readText()
      if (apply(text)) return
      show(t('paste_empty') ?? 'Clipboard is empty')
      return
    } catch {
      /* fall through to manual paste */
    }

    // 3) Fallback: focus the field so the user can paste manually.
    const el = document.getElementById('xmr-hash') as HTMLTextAreaElement | null
    el?.focus()
    show(t('paste_denied') ?? 'Clipboard access denied')
  }






  // Mark invoice declined when timer expires (declared below; effect runs after render)


  // 30-min invoice timer — starts when entering pay stage. Track previous
  // stage so the initial mount (stage='amount') doesn't wipe values that a
  // parallel resume-from-URL effect just set.
  const prevStageRef = useRef(stage)
  useEffect(() => {
    const prev = prevStageRef.current
    prevStageRef.current = stage
    if (stage === 'pay') {
      setExpiresAt((cur) => cur ?? Date.now() + 30 * 60 * 1000)
    } else if (stage === 'amount' && prev !== 'amount') {
      setExpiresAt(null)
      setInvoice(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage])
  useEffect(() => {
    if (!expiresAt || stage !== 'pay') return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [expiresAt, stage])
  const msLeft = expiresAt ? Math.max(0, expiresAt - now) : 30 * 60 * 1000
  const secLeft = Math.ceil(msLeft / 1000)
  const mm = String(Math.floor(secLeft / 60)).padStart(2, '0')
  const ss = String(secLeft % 60).padStart(2, '0')
  const timerProgress = expiresAt ? msLeft / (30 * 60 * 1000) : 1
  const expired = expiresAt !== null && msLeft <= 0

  // Mark invoice declined when timer expires
  useEffect(() => {
    if (expired && topupId && stage === 'pay') {
      updateTopup(topupId, { status: 'declined', closedAt: Date.now(), address: coin?.address })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expired])


  const qrPayload = coin ? paymentUri(coin.symbol, coin.network, coin.address, sendAmount) : ''

  useEffect(() => {
    if (!qrOpen || !qrPayload) return
    QRCode.toDataURL(qrPayload, {
      width: 560,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''))
  }, [qrOpen, qrPayload])

  const canContinue = amountNum >= 1 && !!coin

  // ------- Custom numeric keypad handlers -------
  const keypadPress = useCallback((key: string) => {
    setAmount((prev) => {
      if (key === 'back') return prev.length <= 1 ? '0' : prev.slice(0, -1)
      if (key === '.') {
        if (prev.includes('.')) return prev
        return (prev === '' ? '0' : prev) + '.'
      }
      // digit
      if (prev === '0') return key
      // limit decimals to 2 places, total length reasonable
      if (prev.includes('.')) {
        const [, dec = ''] = prev.split('.')
        if (dec.length >= 2) return prev
      }
      if (prev.replace('.', '').length >= 7) return prev
      return prev + key
    })
  }, [])

  function closeKeypad() {
    setKeypadOpen(false)
    setAmount((prev) => {
      if (prev === '' || prev === '.') return '1'
      const n = Number(prev)
      if (!isFinite(n) || n < 1) return '1'
      // trim trailing dot
      return prev.endsWith('.') ? prev.slice(0, -1) : prev
    })
  }




  return (
    <div>
      <ScreenHeader title={t('topup_title')} onBack={back} />
      <div className="px-4 pt-4">
        <AnimatePresence mode="wait">
          {stage === 'amount' && (
            <motion.div
              key="amount"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              {/* Amount */}
              <div className="mb-5 rounded-3xl border border-border bg-card px-6 py-5 text-center">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t('amount_usd')}</p>
                <div className="mt-3 flex items-baseline justify-center">
                  <span className="mr-1 text-2xl font-semibold text-muted-foreground/70">$</span>
                  <motion.button
                    type="button"
                    onClick={() => setKeypadOpen(true)}
                    whileTap={{ scale: 0.97 }}
                    className={`relative bg-transparent text-center text-5xl font-bold tabular-nums leading-none tracking-tight outline-none transition-colors ${
                      keypadOpen ? 'text-primary' : 'text-foreground'
                    }`}
                    aria-label={t('amount_usd')}
                  >
                    {amount || '0'}
                    {keypadOpen && (
                      <motion.span
                        aria-hidden
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="ml-0.5 inline-block h-10 w-[3px] translate-y-1 rounded-sm bg-primary align-middle"
                      />
                    )}
                  </motion.button>
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">{t('min_topup')}</p>
              </div>

              <div className="mb-6 grid grid-cols-5 gap-2">

                {PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setAmount(String(p))}
                    className={`rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                      amountNum === p ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                    }`}
                  >
                    ${p}
                  </button>
                ))}
              </div>


              {/* Coin grid */}
              <p className="mb-2.5 px-1 text-sm font-medium">{t('choose_coin')}</p>
              <div className="grid grid-cols-4 gap-2">
                {COIN_GROUPS.map((g) => {
                  const active = groupId === g.id
                  return (
                    <button
                      key={g.id}
                      onClick={() => selectGroup(g.id)}
                      className={`relative flex flex-col items-center gap-1.5 rounded-2xl border p-2.5 transition-all active:scale-95 ${
                        active
                          ? 'border-primary/60 bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.35)]'
                          : 'border-border bg-card'
                      }`}
                    >
                      <CoinIcon symbol={g.symbol} className="size-9" />
                      <span className="text-[11px] font-semibold">{g.symbol}</span>
                      {active && (
                        <motion.span
                          layoutId="coin-check"
                          className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary"
                        >
                          <Check className="size-2.5 text-primary-foreground" />
                        </motion.span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Network sub-picker */}
              <AnimatePresence initial={false}>
                {group && group.networks.length > 1 && (
                  <motion.div
                    key={`nets-${group.id}`}
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 20 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-2xl border border-border bg-card/70 p-3">
                      <p className="mb-2 flex items-center gap-2 px-1 text-xs font-medium text-muted-foreground">
                        <span>{t('choose_network')}</span>
                        <span className="text-primary">·</span>
                        <span>{group.symbol}</span>
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {group.networks.map((n) => {
                          const active = coinId === n.id
                          return (
                            <button
                              key={n.id}
                              onClick={() => {
                                setCoinId(n.id)
                                setInvoice(null)
                              }}
                              className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${
                                active
                                  ? 'border-primary/60 bg-primary/10'
                                  : 'border-transparent bg-secondary'
                              }`}
                            >
                              <CoinIcon
                                symbol={n.symbol}
                                network={n.network}
                                className="size-8"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-semibold">{n.network}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {n.symbol} · {n.network}
                                </p>
                              </div>
                              <span
                                className={`flex size-5 items-center justify-center rounded-full border ${
                                  active
                                    ? 'border-primary bg-primary'
                                    : 'border-muted-foreground/40'
                                }`}
                              >
                                {active && (
                                  <Check className="size-3 text-primary-foreground" />
                                )}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={lockInvoice}
                disabled={!canContinue}
                className="mt-6 w-full rounded-2xl bg-primary py-4 font-semibold text-primary-foreground active:scale-95 disabled:opacity-40"
              >
                {t('continue')}
              </button>
            </motion.div>
          )}

          {stage === 'pay' && coin && (
            <motion.div
              key="pay"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            >
              {/* Terminal shell: header + timer + hero */}
              <div className="mb-4 overflow-hidden rounded-[28px] border border-border bg-card">
                {/* Header: coin + live rate */}
                <div className="flex items-center justify-between p-5 pb-4">
                  <div className="flex items-center gap-3">
                    <CoinIcon symbol={coin.symbol} network={coin.network} className="size-10" />
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        {t('pay_with') ?? 'Pay with'} {coin.symbol}
                      </p>
                      <p className="text-sm font-semibold">{coin.name}</p>
                    </div>

                  </div>
                  <div className="text-right">
                    <p className="mb-0.5 flex items-center justify-end gap-1 text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                      <TrendingUp className="size-2.5 text-success" />
                      {t('live_rate')}
                    </p>
                    <motion.p
                      key={rate}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="font-mono text-[11px] font-medium text-foreground/80"
                    >
                      1 {coin.symbol} ≈ {money(rate)}
                    </motion.p>
                  </div>
                </div>

                {/* Countdown timer — 30 min */}
                <div className="relative flex flex-col items-center px-6 py-4">
                  <div className="absolute inset-x-6 top-1/2 h-px -translate-y-1/2 bg-border" />
                  <div className="relative flex flex-col items-center bg-card px-6">
                    <div className="mb-1 flex items-baseline font-mono text-3xl font-bold tabular-nums tracking-tighter text-primary">
                      <AnimatePresence mode="popLayout">
                        <motion.span
                          key={`m${mm}`}
                          initial={{ y: -14, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: 14, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        >
                          {mm}
                        </motion.span>
                      </AnimatePresence>
                      <span className="mx-0.5 opacity-60">:</span>
                      <AnimatePresence mode="popLayout">
                        <motion.span
                          key={`s${ss}`}
                          initial={{ y: -14, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: 14, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        >
                          {ss}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const active = timerProgress > i / 5
                        return (
                          <motion.div
                            key={i}
                            className={`h-1 w-6 rounded-full ${active ? 'bg-primary' : 'bg-border'}`}
                            animate={{ opacity: active ? 1 : 0.35 }}
                          />
                        )
                      })}
                    </div>
                    <p className="mt-2 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                      {expired ? (t('expired') ?? 'expired') : (t('expires_in') ?? 'expires in')}
                    </p>
                  </div>
                </div>

                {/* Hero: send exactly + address */}
                <div className="mx-5 mb-5 rounded-3xl border border-border bg-secondary/40 p-5">
                  <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {t('send_exactly')}
                  </p>
                  <motion.button
                    type="button"
                    onClick={copyAmount}
                    key={sendAmount}
                    initial={{ opacity: 0.5, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileTap={{ scale: 0.96 }}
                    className="mt-2 flex w-full items-baseline justify-center gap-2 bg-transparent font-mono outline-none"
                    aria-label={t('copy')}
                  >
                    <span className="text-2xl font-bold tracking-tight">{sendAmount}</span>
                    <span className="text-xl font-bold text-primary">{coin.symbol}</span>
                  </motion.button>
                  <p className="mt-1 text-center text-[11px] text-muted-foreground">
                    ≈ {money(invoice?.usd ?? invoiceUsd)}
                  </p>


                  {/* Address ticket well */}
                  <div className="relative mt-5">
                    <motion.button
                      type="button"
                      onClick={copyAddress}
                      whileTap={{ scale: 0.98 }}
                      className="relative flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/30 bg-background/60 px-5 py-4 outline-none transition-colors active:bg-primary/5"
                      aria-label={t('copy_address') ?? 'Copy address'}
                    >
                      {/* Punch-hole notches */}
                      <div className="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rounded-full border-r-2 border-dashed border-primary/30 bg-card" />
                      <div className="absolute -right-2 top-1/2 size-4 -translate-y-1/2 rounded-full border-l-2 border-dashed border-primary/30 bg-card" />

                      <span className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/60">
                        {t('to_address')}
                      </span>

                      <div dir="ltr" data-selectable className="flex flex-wrap justify-center gap-x-1.5 gap-y-1 break-all text-center font-mono text-[13px] leading-relaxed tracking-wide text-white select-text">
                        {(() => {
                          const a = coin.address
                          const chunks: string[] = []
                          for (let i = 0; i < a.length; i += 4) chunks.push(a.slice(i, i + 4))
                          return chunks.map((c, i) => (
                            <motion.span
                              key={`${c}-${i}`}
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: i % 2 === 0 ? 1 : 0.6 }}
                              transition={{ delay: i * 0.03, type: 'spring', stiffness: 400, damping: 26 }}
                            >
                              {c}
                            </motion.span>
                          ))
                        })()}
                      </div>
                    </motion.button>
                  </div>

                  {/* Segmented action buttons */}
                  <div className="mt-3 grid h-14 grid-cols-2 gap-2">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setQrOpen(true)}
                      className="flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-card text-primary transition-colors active:bg-primary/10"
                    >
                      <QrCode className="size-5" />
                      <span className="text-sm font-medium">QR</span>
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={copyAddress}
                      className="relative flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary text-primary-foreground shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.5)]"
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        {copied ? (
                          <motion.span
                            key="ok"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                            className="flex items-center gap-2"
                          >
                            <Check className="size-5" />
                            <span className="text-sm font-bold tracking-tight">{t('copied')}</span>
                          </motion.span>
                        ) : (
                          <motion.span
                            key="cp"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                            className="flex items-center gap-2"
                          >
                            <Copy className="size-5" />
                            <span className="text-sm font-bold tracking-tight">{t('copy')}</span>
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </div>


                  <span className="mt-3 inline-block rounded-full bg-secondary px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {coin.network}
                  </span>
                </div>
              </div>

              <div className="mb-5 flex gap-2.5 rounded-2xl border border-primary/15 bg-primary/5 p-3.5">
                <Shield className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {t('secure_note')}
                </p>
              </div>

              <motion.button
                onClick={confirmPaid}
                disabled={expired}
                whileTap={{ scale: 0.96, y: 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                className="w-full rounded-[24px] bg-primary py-5 text-sm font-bold uppercase tracking-[0.15em] text-primary-foreground shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.4)] disabled:opacity-40"
              >
                {expired ? (t('expired') ?? 'Expired') : t('i_paid')}
              </motion.button>

            </motion.div>

          )}

          {stage === 'xmr_hash' && coin && (
            <motion.div
              key="xmr_hash"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            >
              <div className="mb-5 rounded-[32px] border border-border/60 bg-card p-6 shadow-2xl">
                {/* Header */}
                <div className="mb-8 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <CoinIcon symbol={coin.symbol} network={coin.network} className="size-10" />
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        {tr('xmr_hash_title', 'Manual verification')}
                      </p>
                      <h2 className="text-lg font-semibold leading-tight">{coin.name}</h2>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      {t('amount')}
                    </p>
                    <p className="font-mono text-lg font-medium text-primary">
                      {money(invoice?.usd ?? invoiceUsd)}
                    </p>
                  </div>
                </div>

                {/* Counter */}
                <div className="mb-6 text-center">
                  <div className="inline-flex items-baseline gap-1">
                    <motion.span
                      key={xmrHash.trim().length}
                      initial={{ opacity: 0.5, y: -2 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="font-mono text-4xl font-medium tabular-nums text-primary"
                    >
                      {String(xmrHash.trim().length).padStart(2, '0')}
                    </motion.span>
                    <span className="font-mono text-xl text-muted-foreground/40">/</span>
                    <span className="font-mono text-xl text-muted-foreground">64</span>
                  </div>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70">
                    {tr('xmr_hash_label', 'Transaction hash (TXID)')}
                  </p>
                </div>

                {/* Input area */}
                <div
                  className={`mb-4 rounded-2xl border bg-background/60 p-4 transition-colors ${
                    xmrHash && !xmrHashValid
                      ? 'border-destructive/40'
                      : 'border-border/60 focus-within:border-primary/30'
                  }`}
                >
                  <p className="mb-4 text-center text-[11px] leading-relaxed text-muted-foreground">
                    {tr(
                      'xmr_hash_sub',
                      'Monero is private by design — enter your transaction ID to continue.',
                    )}
                  </p>

                  <textarea
                    id="xmr-hash"
                    dir="ltr"
                    value={xmrHash}
                    onChange={(e) => setXmrHash(sanitizeTxid(e.target.value))}
                    onFocus={(e) =>
                      setTimeout(
                        () => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }),
                        250,
                      )
                    }
                    rows={3}
                    spellCheck={false}
                    autoCapitalize="none"
                    autoCorrect="off"
                    placeholder="a1b2 c3d4 e5f6 …"
                    className="h-20 w-full resize-none break-all bg-transparent text-center font-mono text-sm leading-relaxed tracking-wider text-foreground outline-none placeholder:text-muted-foreground/30"
                  />

                  <div className="mt-4 flex gap-2">
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setXmrHash('')}
                      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border/60 bg-secondary/40 text-sm font-medium text-muted-foreground"
                    >
                      <X className="size-4" />
                      {t('clear') ?? 'Clear'}
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={pasteXmrHash}
                      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
                    >
                      <Copy className="size-4" />
                      {tr('paste', 'Paste')}
                    </motion.button>
                  </div>
                </div>

                {xmrHash && !xmrHashValid && (
                  <p className="mb-3 text-center text-[11px] text-destructive">
                    {tr('xmr_hash_invalid', 'A Monero transaction ID is 64 hex characters.')}
                  </p>
                )}

                <span className="inline-flex rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {coin.network}
                </span>
              </div>

              <div className="mb-5 flex gap-3 rounded-[24px] border border-border/60 bg-secondary/20 p-4">
                <Shield className="mt-0.5 size-4 shrink-0 text-primary/60" />
                <p className="text-xs leading-snug text-muted-foreground">
                  {tr(
                    'xmr_privacy_note',
                    'Your privacy is protected. The transaction ID is used only to verify this top-up.',
                  )}
                </p>
              </div>

              <motion.button
                onClick={submitXmrHash}
                disabled={!xmrHashValid || xmrSubmitting}
                whileTap={{ scale: 0.96, y: 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                className="flex w-full items-center justify-center rounded-[24px] bg-primary py-5 text-sm font-bold uppercase tracking-[0.15em] text-primary-foreground shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.4)] disabled:opacity-40"
              >
                {xmrSubmitting ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  tr('send_for_review', 'Send for review')
                )}
              </motion.button>

              <button
                type="button"
                onClick={() => setStage('pay')}
                className="mt-3 w-full py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground active:scale-[0.98]"
              >
                {t('back') ?? 'Back'}
              </button>
            </motion.div>
          )}

          {stage === 'xmr_pending' && coin && (
            <motion.div
              key="xmr_pending"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: 'spring', stiffness: 240, damping: 26 }}
              style={{ perspective: 1200 }}
            >
              <motion.div
                initial={{ rotateX: 14, scale: 0.94 }}
                animate={{ rotateX: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 180, damping: 20 }}
                style={{ transformStyle: 'preserve-3d' }}
                className="relative mb-5 overflow-hidden rounded-[32px] border border-border/60 bg-card p-6 shadow-2xl"
              >
                {/* ambient gold aura */}
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute -top-24 left-1/2 size-64 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
                  animate={{ opacity: [0.35, 0.7, 0.35], scale: [0.95, 1.08, 0.95] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                />

                <div className="relative mb-8 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <CoinIcon symbol={coin.symbol} network={coin.network} className="size-10" />
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        {tr('xmr_pending_title', 'Verification pending')}
                      </p>
                      <h2 className="text-lg font-semibold leading-tight">{coin.name}</h2>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      {t('amount')}
                    </p>
                    <p className="font-mono text-lg font-medium text-primary">
                      {money(invoice?.usd ?? invoiceUsd)}
                    </p>
                  </div>
                </div>

                {/* 3D emblem */}
                <div className="relative mb-7 flex justify-center" style={{ perspective: 800 }}>
                  <motion.div
                    className="relative flex size-28 items-center justify-center"
                    style={{ transformStyle: 'preserve-3d' }}
                    animate={{ rotateY: [0, 12, 0, -12, 0], rotateX: [0, -8, 0, 8, 0] }}
                    transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <motion.span
                      aria-hidden
                      className="absolute inset-0 rounded-full border border-primary/25"
                      style={{ transform: 'rotateX(68deg)' }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
                    />
                    <motion.span
                      aria-hidden
                      className="absolute inset-2 rounded-full border border-dashed border-primary/30"
                      style={{ transform: 'rotateY(70deg)' }}
                      animate={{ rotate: -360 }}
                      transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
                    />
                    <motion.span
                      aria-hidden
                      className="absolute inset-0 rounded-full border-2 border-primary/15 border-t-primary/80"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3.2, repeat: Infinity, ease: 'linear' }}
                    />
                    <motion.span
                      aria-hidden
                      className="absolute inset-0 rounded-full bg-primary/10 blur-xl"
                      animate={{ opacity: [0.4, 0.9, 0.4] }}
                      transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.div
                      className="relative flex size-16 items-center justify-center rounded-full border border-primary/30 bg-secondary/50 shadow-[0_12px_30px_-12px_hsl(var(--primary)/0.6)]"
                      style={{ transform: 'translateZ(26px)' }}
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Shield className="size-7 text-primary" />
                    </motion.div>
                  </motion.div>
                </div>

                <div className="relative mb-6 text-center">
                  <h3 className="mb-2 text-base font-semibold">
                    {tr('xmr_pending_head', 'Your request is under review')}
                  </h3>
                  <p className="mx-auto max-w-[19rem] text-xs leading-relaxed text-muted-foreground">
                    {tr(
                      'xmr_pending_sub',
                      'Our specialists are checking your Monero transfer. The balance will be credited automatically and you will get a notification in the bot.',
                    )}
                  </p>
                  <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
                    {tr('xmr_pending_eta', 'Estimated wait: 2–15 minutes')}
                  </p>
                </div>

                <div className="relative mb-4 rounded-2xl border border-border/60 bg-background/60 p-4">
                  <div
                    dir="ltr"
                    data-selectable
                    className="flex select-text flex-wrap justify-center gap-x-1.5 gap-y-1 break-all text-center font-mono text-sm leading-relaxed tracking-wider text-foreground"
                  >
                    {(() => {
                      const h = xmrHash.trim()
                      const chunks: string[] = []
                      for (let i = 0; i < h.length; i += 4) chunks.push(h.slice(i, i + 4))
                      return chunks.map((c, i) => (
                        <motion.span
                          key={`${c}-${i}`}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: i % 2 === 0 ? 1 : 0.6, y: 0 }}
                          transition={{ delay: i * 0.03, type: 'spring', stiffness: 400, damping: 26 }}
                        >
                          {c}
                        </motion.span>
                      ))
                    })()}
                  </div>
                </div>

                <span className="relative inline-flex rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {coin.network}
                </span>
              </motion.div>

              <div className="mb-5 flex gap-3 rounded-[24px] border border-border/60 bg-secondary/20 p-4">
                <Clock className="mt-0.5 size-4 shrink-0 text-primary/60" />
                <p className="text-xs leading-snug text-muted-foreground">
                  {tr(
                    'xmr_pending_notify',
                    'You will get a notification in the bot once it is credited — you can close this screen.',
                  )}
                </p>
              </div>

              <motion.button
                onClick={() => go('history')}
                whileTap={{ scale: 0.96, y: 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                className="w-full rounded-[24px] bg-primary py-5 text-sm font-bold uppercase tracking-[0.15em] text-primary-foreground shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.4)]"
              >
                {tr('xmr_pending_got_it', 'Got it, close')}
              </motion.button>
            </motion.div>
          )}







          {stage === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-16 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                className="mb-5 flex size-20 items-center justify-center rounded-full bg-success/15"
              >
                <Check className="size-10 text-success" />
              </motion.div>
              <p className="text-lg font-semibold">{t('payment_success')}</p>
              <p className="mt-1 text-sm text-muted-foreground">+{money(amountNum)}</p>
              <button
                onClick={back}
                className="mt-7 rounded-2xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground active:scale-95"
              >
                {t('back')}
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <AnimatePresence>
        {qrOpen && coin && (
          <motion.div
            key="qr-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setQrOpen(false)}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[358px] overflow-hidden rounded-[32px] border border-white/10 bg-card shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)]"
            >
              {/* Ambient gold glow */}
              <div className="pointer-events-none absolute -right-24 -top-24 size-48 rounded-full bg-primary/10 blur-[80px]" />

              <button
                onClick={() => setQrOpen(false)}
                aria-label="Close"
                className="absolute right-4 top-4 z-10 flex size-9 items-center justify-center rounded-full bg-secondary/80 text-muted-foreground backdrop-blur-sm transition-all hover:text-foreground active:scale-90"
              >
                <X className="size-4" />
              </button>

              <div className="relative flex flex-col items-center p-7 pt-8">
                {/* Header: amount */}
                <div className="mb-7 flex flex-col items-center text-center">
                  <span className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {t('send_exactly')}
                  </span>
                  <button
                    type="button"
                    onClick={copyAmount}
                    className="flex items-baseline gap-2 bg-transparent font-mono outline-none active:scale-95 transition-transform"
                    aria-label={t('copy')}
                  >
                    <motion.span
                      key={sendAmount}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-4xl font-bold tracking-tight text-primary"
                    >
                      {sendAmount}
                    </motion.span>
                    <span className="text-lg font-semibold text-foreground/60">{coin.symbol}</span>
                  </button>

                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <CoinIcon symbol={coin.symbol} network={coin.network} className="size-3.5" />
                    <span>{coin.name}</span>
                  </div>
                </div>

                {/* QR with scan beam */}
                <div className="relative">
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary/20 blur-2xl"
                    animate={{ scale: [0.75, 1, 0.75], opacity: [0.4, 0.7, 0.4] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <div className="relative overflow-hidden rounded-[24px] bg-white p-4 shadow-2xl">
                    <div className="flex aspect-square w-[180px] items-center justify-center">
                      {qrDataUrl ? (
                        <img src={qrDataUrl} alt="QR" className="h-full w-full" />
                      ) : (
                        <Loader2 className="size-6 animate-spin text-black" />
                      )}
                    </div>
                    {/* Scan beam */}
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[24px]">
                      <motion.div
                        className="absolute left-0 right-0 h-[2px] bg-primary/60 shadow-[0_0_16px_hsl(var(--primary))]"
                        animate={{ top: ['0%', '100%', '0%'], opacity: [0, 1, 1, 1, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', times: [0, 0.1, 0.5, 0.9, 1] }}
                      />
                    </div>
                  </div>
                </div>




                {/* Footer action */}
                <div className="mt-6 flex w-full justify-center">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setQrOpen(false)}
                    className="w-1/2 rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground shadow-[0_8px_20px_-4px_hsl(var(--primary)/0.4)]"
                  >
                    {t('done') ?? 'Done'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Custom numeric keypad — replaces the native mobile keyboard */}
      <AnimatePresence>
        {keypadOpen && (
          <motion.div
            key="keypad-overlay"
            className="fixed inset-0 z-[80] flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={closeKeypad}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              key="keypad-sheet"
              initial={{ y: '110%' }}
              animate={{ y: 0 }}
              exit={{ y: '110%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              className="relative w-full max-w-[440px] rounded-t-[28px] border border-white/5 bg-card/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-24px_60px_-10px_rgba(0,0,0,0.6)] backdrop-blur-xl"
              style={{ touchAction: 'none' }}
            >
              {/* Grabber */}
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/15" />

              {/* Live amount preview */}
              <div className="mb-3 flex items-baseline justify-between px-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {t('amount_usd')}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-muted-foreground/70">$</span>
                  <motion.span
                    key={amount}
                    initial={{ scale: 0.9, opacity: 0.6 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                    className="font-mono text-2xl font-bold tabular-nums text-primary"
                  >
                    {amount || '0'}
                  </motion.span>
                </div>
              </div>

              {/* Quick presets strip */}
              <div className="mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1 no-scrollbar">
                {PRESETS.map((p) => (
                  <button
                    key={`kp-${p}`}
                    onClick={() => setAmount(String(p))}
                    className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                      amountNum === p
                        ? 'border-primary/60 bg-primary/15 text-primary'
                        : 'border-white/5 bg-white/[0.03] text-muted-foreground'
                    }`}
                  >
                    ${p}
                  </button>
                ))}
              </div>

              {/* Keypad grid */}
              <div className="grid grid-cols-3 gap-2">
                {['1','2','3','4','5','6','7','8','9','.','0','back'].map((k) => {
                  const isAction = k === 'back' || k === '.'
                  const label = k === 'back' ? <Delete className="size-5" /> : k
                  return (
                    <motion.button
                      key={k}
                      whileTap={{ scale: 0.92, backgroundColor: 'hsl(var(--primary) / 0.15)' }}
                      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                      onClick={() => keypadPress(k)}
                      className={`relative flex h-14 items-center justify-center rounded-2xl border font-mono text-2xl font-semibold tabular-nums transition-colors ${
                        isAction
                          ? 'border-white/5 bg-white/[0.03] text-muted-foreground'
                          : 'border-white/5 bg-white/[0.06] text-foreground'
                      } active:border-primary/40`}
                    >
                      {label}
                    </motion.button>
                  )
                })}
              </div>

              {/* Done bar */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={closeKeypad}
                className="mt-3 w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-[0_10px_24px_-6px_hsl(var(--primary)/0.5)]"
              >
                {t('done') ?? 'Done'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <MoneroManagerSheet open={xmrSheet} onClose={() => setXmrSheet(false)} />
    </div>


  )
}


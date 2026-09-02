'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  Check,
  Loader2,
  ChevronRight,
  Delete,
  Heart,
  
  Info,
  Layers,
  Link2,
  MessageCircle,
  Minus,
  MoreHorizontal,
  Plus,
  Repeat2,
  Bookmark,
  Share,
  ShoppingBag,
  Upload,
  User,
  X,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { compactNumber, money, parseTargets } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { useServerFn } from '@tanstack/react-start'
import { useQuery } from '@tanstack/react-query'
import { createFollowHubOrder, getFollowHubLimits } from '@/lib/followhub.functions'
import { useNav } from '@/lib/nav'
import { useStore } from '@/lib/store'
import type { BoostService, CartItem, Lang } from '@/lib/types'
import { useToast } from './toast'
import { cn } from '@/lib/utils'
import { AurxMark } from './aurx-mark'
import { VerifiedBadge } from './icons/verified-badge'
import { useXProfile, loadXProfileFast } from '@/lib/x-profile'
import { syncXProfiles, type XProfileRow } from '@/lib/x-profile.functions'
import { extractTweetId, loadXTweetFast, decodeTweetText } from '@/lib/x-tweet'
import type { XTweetRow } from '@/lib/x-tweet.functions'
import { ServiceInfoSheet } from './service-info-sheet'
import { DigitRoll } from './ui/digit-roll'
import img4 from '@/assets/avatars/image-4.png'
import img5 from '@/assets/avatars/image-5.png'
import img7 from '@/assets/avatars/image-7.png'
import img9 from '@/assets/avatars/image-9.png'
import img10 from '@/assets/avatars/image-10.png'
import img11 from '@/assets/avatars/image-11.png'

const AVATAR_OPTIONS: { id: string; url: string; label: string }[] = [
  { id: 'pepe', url: img4, label: 'Pepe' },
  { id: 'rick', url: img5, label: 'Rick' },
  { id: 'twitter', url: img7, label: 'Twitter' },
  { id: 'alien', url: img9, label: 'Alien cat' },
  { id: 'boom', url: img10, label: 'Boom cat' },
  { id: 'mike', url: img11, label: 'Mike' },
]

function restoreTargets(item?: CartItem) {
  return (item?.meta?.targets ?? '')
    .split(/[\n,]+/)
    .map((target) => target.trim())
    .filter(Boolean)
    .join('\n')
}

function restoreAmount(item: CartItem | undefined, service: BoostService) {
  const saved = Number(item?.meta?.amount)
  if (!Number.isFinite(saved) || saved <= 0) return service.min
  return Math.min(Math.max(saved, service.min), service.max)
}

export function OrderForm({
  service: baseService,
  editItem,
}: {
  service: BoostService
  editItem?: CartItem
}) {
  const { t, lang } = useI18n()
  const { addToCart, balance, applyServerBalance, registerServerOrder } = useStore()
  const createOrder = useServerFn(createFollowHubOrder)
  const fetchLimits = useServerFn(getFollowHubLimits)
  const { show } = useToast()
  const { go } = useNav()

  // Лимиты берём у поставщика: локальные значения — только запасной вариант.
  const limitsQ = useQuery({
    queryKey: ['followhub-limits'],
    queryFn: () => fetchLimits(),
    staleTime: 5 * 60 * 1000,
  })
  const service = useMemo<BoostService>(() => {
    const limit = limitsQ.data?.[baseService.id]
    return limit ? { ...baseService, min: limit.min, max: limit.max } : baseService
  }, [baseService, limitsQ.data])

  const initialRaw = restoreTargets(editItem)
  const [raw, setRaw] = useState(initialRaw)
  const [bulk, setBulk] = useState(initialRaw.includes('\n'))
  const [qty, setQty] = useState(() => restoreAmount(editItem, service))
  const [touched, setTouched] = useState(false)
  const [typing, setTyping] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [shake, setShake] = useState<false | 'add' | 'buy'>(false)
  const [noFunds, setNoFunds] = useState(false)
  const [keypadOpen, setKeypadOpen] = useState(false)
  const [qtyDraft, setQtyDraft] = useState<string>('')
  const [infoOpen, setInfoOpen] = useState(false)
  const [buying, setBuying] = useState(false)
  const isFollowers = service.categoryId === 'followers'
  const isLikes = service.categoryId === 'likes'
  const isViews = service.categoryId === 'views'
  const isReposts = service.categoryId === 'reposts'
  const isBookmarks = service.categoryId === 'bookmarks'
  const isPostTarget = isLikes || isViews || isReposts || isBookmarks

  useEffect(() => {
    if (!isFocused || bulk || !raw) {
      setTyping(false)
      return
    }
    setTyping(true)
    const id = setTimeout(() => setTyping(false), 350)
    return () => clearTimeout(id)
  }, [raw, isFocused, bulk])

  // Draft key for this form instance. Mobile WebViews (Telegram/iOS) get
  // discarded when the user leaves the app — without this, long target lists
  // typed by hand are lost.
  const draftKey = `aurex:order:${service.id}:${editItem?.key ?? 'new'}`
  const draftLoaded = useRef(false)
  const firstResetRun = useRef(true)

  useEffect(() => {
    // Skip the very first run so a restored draft isn't immediately wiped.
    if (firstResetRun.current) {
      firstResetRun.current = false
      return
    }
    const restoredRaw = restoreTargets(editItem)
    setRaw(restoredRaw)
    setBulk(restoredRaw.includes('\n'))
    setQty(restoreAmount(editItem, service))
    setTouched(false)
    setTyping(false)
    setFileName(null)
    draftLoaded.current = false
  }, [editItem?.key, service.id])

  // Restore draft on mount / when the form identity changes.
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(draftKey)
      if (stored) {
        const d = JSON.parse(stored) as { raw?: string; qty?: number }
        if (typeof d.raw === 'string' && d.raw.length) {
          setRaw(d.raw)
          setBulk(d.raw.includes('\n'))
        }
        if (typeof d.qty === 'number' && Number.isFinite(d.qty)) setQty(d.qty)
      }
    } catch {
      /* ignore */
    }
    draftLoaded.current = true
  }, [draftKey])

  // Persist draft as the user types.
  useEffect(() => {
    if (!draftLoaded.current) return
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({ raw, qty }))
    } catch {
      /* ignore */
    }
  }, [draftKey, raw, qty])

  const { valid, invalid } = useMemo(
    () => parseTargets(raw, isPostTarget ? 'likes' : 'followers'),
    [raw, isPostTarget],
  )
  const targetCount = Math.max(valid.length, 0)

  const clampedQty = Math.min(Math.max(qty, service.min), service.max)
  const base = (service.pricePer1000 * clampedQty) / 1000
  const total = base * Math.max(targetCount, 1)
  const pct = ((clampedQty - service.min) / Math.max(1, service.max - service.min)) * 100


  const hasInvalid = invalid.length > 0
  const canOrder = targetCount > 0 && !hasInvalid

  /* ─── "Применить": pull the real X profile for a single target ───
   * Deliberately manual: no request is fired while typing, and the
   * feature is disabled in bulk ("Списком") mode. */
  const singleHandle = !bulk ? extractHandle(raw) : ''
  const singleTweetId = !bulk && isPostTarget ? extractTweetId(raw) : ''
  const [applied, setApplied] = useState<XProfileRow | null>(null)
  const [appliedTweet, setAppliedTweet] = useState<XTweetRow | null>(null)
  const [applyState, setApplyState] = useState<'idle' | 'loading' | 'error' | 'missing'>('idle')

  // Any change to the target invalidates a previously applied result.
  useEffect(() => {
    setApplied(null)
    setAppliedTweet(null)
    setApplyState('idle')
  }, [singleHandle, singleTweetId, bulk])

  const canApply =
    !bulk &&
    !hasInvalid &&
    targetCount > 0 &&
    (isPostTarget ? singleTweetId.length > 0 : isFollowers && singleHandle.length >= 2)
  const showApply = !bulk && (isFollowers || isPostTarget)
  const isApplied = Boolean(applied || appliedTweet) && applyState === 'idle'

  async function applyProfile() {
    if (!canApply || applyState === 'loading') return
    setApplyState('loading')
    try {
      if (isPostTarget) {
        const tweet = await loadXTweetFast(singleTweetId)
        if (!tweet) {
          setAppliedTweet(null)
          setApplyState('missing')
          return
        }
        setAppliedTweet(tweet)
        setApplyState('idle')
        return
      }
      const row = await loadXProfileFast(singleHandle)
      if (!row) {
        setApplied(null)
        setApplyState('missing')
        return
      }
      setApplied(row)
      setApplyState('idle')
    } catch {
      setApplied(null)
      setAppliedTweet(null)
      setApplyState('error')
    }
  }



  const stepBtn = 100

  const keypadPress = useCallback(
    (key: string) => {
      setQtyDraft((prev) => {
        if (key === 'back') return prev.length <= 1 ? '' : prev.slice(0, -1)
        if (prev.replace(/^0+/, '').length >= 7) return prev
        if (prev === '0') return key
        return prev + key
      })
    },
    [],
  )
  function openKeypad() {
    setQtyDraft('')
    setKeypadOpen(true)
  }
  function closeKeypad() {
    if (qtyDraft !== '') {
      const n = Number(qtyDraft)
      if (Number.isFinite(n) && n > 0) {
        setQty(Math.min(Math.max(n, service.min), service.max))
      }
    }
    setKeypadOpen(false)
  }

  function triggerShake(target: 'add' | 'buy' = 'add') {
    setShake(target)
    window.setTimeout(() => setShake(false), 520)
  }

  function triggerNoFunds() {
    setNoFunds(true)
    window.setTimeout(() => setNoFunds(false), 600)
  }

  // Press-and-hold repeat for +/- buttons
  const holdTimer = useRef<number | null>(null)
  const holdInterval = useRef<number | null>(null)
  const stopHold = useCallback(() => {
    if (holdTimer.current) { window.clearTimeout(holdTimer.current); holdTimer.current = null }
    if (holdInterval.current) { window.clearInterval(holdInterval.current); holdInterval.current = null }
  }, [])
  const startHold = useCallback((dir: 1 | -1) => {
    stopHold()
    const tick = () => setQty((q) => {
      const next = q + dir * stepBtn
      return Math.min(service.max, Math.max(service.min, next))
    })
    holdTimer.current = window.setTimeout(() => {
      holdInterval.current = window.setInterval(tick, 80)
    }, 350)
  }, [service.min, service.max, stopHold])
  useEffect(() => () => stopHold(), [stopHold])

  function clearDraft() {
    try {
      sessionStorage.removeItem(draftKey)
    } catch {
      /* ignore */
    }
  }

  function doAddToCart() {
    clearDraft()
    addToCart({
      key: editItem?.key ?? `${service.id}-${Date.now()}`,
      kind: 'boost',
      refId: service.id,
      title: service.name[lang],
      subtitle: `${clampedQty.toLocaleString()} × ${targetCount} ${t('targets_count')}`,
      qty: targetCount,
      unitPrice: total / targetCount,
      total,
      meta: {
        targets: valid.join('\n'),
        amount: String(clampedQty),
        ...(applied && !applied.not_found
          ? { start_followers: String(applied.followers) }
          : {}),
      },
    })
    show(editItem ? (lang === 'ru' ? 'Изменения сохранены' : 'Changes saved') : t('added'))
    if (editItem) {
      go('cart')
      return
    }
    setRaw('')
    setQty(service.min)
    setTouched(false)
  }

  function handleAddClick() {
    setTouched(true)
    if (!canOrder) {
      triggerShake('add')
      show(
        hasInvalid
          ? lang === 'ru'
            ? 'Проверьте ссылки — есть ошибки'
            : 'Check the links — some are invalid'
          : lang === 'ru'
            ? 'Введите ссылку или @username'
            : 'Enter a link or @username',
      )
      return
    }
    doAddToCart()
  }

  async function handleBuyNow() {
    if (buying) return
    setTouched(true)
    if (!canOrder) {
      triggerShake('buy')
      show(
        hasInvalid
          ? lang === 'ru'
            ? 'Проверьте ссылки — есть ошибки'
            : 'Check the links — some are invalid'
          : lang === 'ru'
            ? 'Введите ссылку или @username'
            : 'Enter a link or @username',
      )
      return
    }
    if (balance < total) {
      triggerNoFunds()
      show(t('not_enough'))
      return
    }

    setBuying(true)
    const localOrderId = `FH-${crypto.randomUUID()}`
    try {
      const result = await createOrder({
        data: {
          localOrderId,
          serviceId: service.id,
          category: service.categoryId,
          title: service.name[lang],
          quantity: clampedQty,
          targets: valid,
          ...(applied && !applied.not_found ? { startFollowers: applied.followers } : {}),
        },
      })
      applyServerBalance(result.balance)
      registerServerOrder({
        id: result.localOrderId,
        date: result.createdAt || Date.now(),
        title: service.name[lang],
        amount: result.amount,
        status: 'in_progress',
        refillable: service.refill,
        kind: 'boost',
        paid: true,
        qty: clampedQty,
        orderRef: result.providerOrderId,
        serviceId: service.id,
        ...(valid[0] ? { target: valid[0] } : {}),
        ...(applied && !applied.not_found ? { startFollowers: applied.followers } : {}),
      })
      clearDraft()
      show(t('payment_success'))
      setRaw('')
      setQty(service.min)
      setTouched(false)
    } catch (error) {
      show(error instanceof Error ? error.message : 'Не удалось оформить заказ')
    } finally {
      setBuying(false)
    }
  }

  const bulkLabel = lang === 'ru' ? 'Списком' : 'List'
  const singleLabel = lang === 'ru' ? 'Один' : 'One'
  const targetsLabel = lang === 'ru' ? 'Куда крутим' : 'Target account'
  const targetsHintSingle =
    lang === 'ru'
      ? isPostTarget
        ? 'Укажите ссылку на пост X'
        : 'Укажите @ник или ссылку на профиль X'
      : isPostTarget
        ? 'Enter a link to the X post'
        : 'Enter @handle or a link to the X profile'
  const targetsHintBulk =
    lang === 'ru'
      ? isPostTarget
        ? 'Каждый пост с новой строки — заказ поделим поровну'
        : 'Каждый аккаунт с новой строки — заказ поделим поровну'
      : isPostTarget
        ? 'One post per line — the order is split evenly'
        : 'One account per line — the order is split evenly'
  const placeholderSingle = isPostTarget
    ? 'x.com/username/status/1234567890'
    : '@username'
  const placeholderBulk = isPostTarget
    ? 'x.com/user1/status/1234567890\nx.com/user2/status/0987654321'
    : '@user1\nx.com/user2\nhttps://x.com/user3'

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const cleaned = text
        .split(/[\r\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .join('\n')
      setRaw((prev) => {
        const base = prev.trim()
        return base ? `${base}\n${cleaned}` : cleaned
      })
      setFileName(file.name)
      show(lang === 'ru' ? 'Файл загружен' : 'File loaded')
    } catch {
      show(lang === 'ru' ? 'Не удалось прочитать файл' : 'Could not read file')
    }
  }

  return (
    <div className="px-4 pb-40 pt-3">
      {/* ─── Live profile preview (followers only) — top of the flow ─── */}
      {isFollowers && (
        <FollowersPreview
          count={clampedQty}
          handle={extractHandle(raw)}
          typing={typing}
          profile={applied}

        />
      )}

      {/* ─── Live tweet preview (likes / views / reposts / bookmarks) ─── */}
      {isPostTarget && (
        <LikesPreview
          count={clampedQty}
          handle={appliedTweet?.author_username || extractHandle(raw)}
          typing={typing}
          lang={lang}
          tweet={appliedTweet}
          mode={isViews ? 'views' : isReposts ? 'reposts' : isBookmarks ? 'bookmarks' : 'likes'}
        />
      )}

      {/* ─── Compact quantity picker ─── */}
      <div className="mb-3 rounded-[1.5rem] border border-border bg-card px-4 pb-3 pt-2.5 shadow-[inset_0_1px_0_color-mix(in_oklab,var(--foreground)_5%,transparent)]">
        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(service.min, q - stepBtn))}
            onPointerDown={() => startHold(-1)}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
            onPointerCancel={stopHold}
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border-strong bg-secondary/45 text-foreground shadow-[inset_0_1px_0_color-mix(in_oklab,var(--foreground)_6%,transparent)] transition-colors active:scale-95"
            aria-label="−"
          >
            <Minus className="size-4" strokeWidth={2.7} />
          </button>
          <button
            type="button"
            onClick={openKeypad}
            className="tnum min-w-0 rounded-xl py-1 text-center font-display text-[26px] font-black leading-none text-primary transition-colors active:bg-primary/5"
          >
            {clampedQty.toLocaleString()}
          </button>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(service.max, q + stepBtn))}
            onPointerDown={() => startHold(1)}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
            onPointerCancel={stopHold}
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border-strong bg-secondary/45 text-foreground shadow-[inset_0_1px_0_color-mix(in_oklab,var(--foreground)_6%,transparent)] transition-colors active:scale-95"
            aria-label="+"
          >
            <Plus className="size-4" strokeWidth={2.7} />
          </button>
        </div>

        <div className="relative mt-1 h-7 px-1">
          <div className="absolute inset-x-1 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-background/75 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--border)_65%,transparent),inset_0_1px_4px_color-mix(in_oklab,var(--background)_70%,transparent)]" />
          <div
            className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-linear-to-r from-primary/60 to-primary"
            style={{ left: '0.25rem', width: `calc((100% - 0.5rem) * ${pct} / 100)` }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute top-1/2 size-[16px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/70 bg-[radial-gradient(circle_at_30%_25%,var(--gold-soft),var(--gold)_58%,var(--gold-deep))] shadow-[0_0_0_2px_color-mix(in_oklab,var(--background)_88%,transparent),0_6px_12px_-6px_color-mix(in_oklab,var(--primary)_75%,transparent)]"
            style={{ left: `calc(0.25rem + (100% - 0.5rem) * ${pct} / 100)` }}
          />
          <input
            type="range"
            min={service.min}
            max={service.max}
            step={1}
            value={clampedQty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="range-vault absolute inset-x-0 top-0 w-full appearance-none bg-transparent outline-hidden"
          />
        </div>

        <div className="mt-1.5 flex items-center justify-between px-1">
          <span className="tnum text-[10px] font-semibold tracking-wide text-muted-foreground/70">
            {(lang === 'ru' ? 'Мин ' : 'Min ') + service.min.toLocaleString()}
          </span>
          <span className="tnum text-[10px] font-semibold tracking-wide text-muted-foreground/70">
            {(lang === 'ru' ? 'Лимит ' : 'Limit ') + service.max.toLocaleString()}
          </span>
        </div>
      </div>

      {/* ─── Service info divider (post targets) ─── */}
      {isPostTarget && (
        <motion.button
          type="button"
          onClick={() => setInfoOpen(true)}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          whileTap={{ scale: 0.98 }}
          className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-secondary/25 py-2 text-[11px] font-medium text-muted-foreground/80 transition-colors hover:bg-secondary/40 active:bg-secondary/50"
        >
          <Info className="size-3.5" />
          <span>{lang === 'ru' ? 'Об услуге' : 'About service'}</span>
        </motion.button>
      )}

      {/* ─── Targets ─── */}
      <div className="mb-2 flex items-center justify-between px-1">
        <label className="text-[14px] font-extrabold tracking-tight">
          {targetsLabel}
        </label>
        <span
          className={`tnum rounded-full border px-2 py-0.5 text-[10px] font-extrabold tracking-wider transition-colors ${
            targetCount > 0 && !hasInvalid
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border bg-secondary text-muted-foreground'
          }`}
        >
          {targetCount} {t('targets_count')}
        </span>
      </div>
      <p className="mb-2 px-1 text-[11.5px] leading-snug text-muted-foreground">
        {bulk ? targetsHintBulk : targetsHintSingle}
      </p>

      {/* Mode toggle */}
      <div className="mb-2 inline-flex rounded-full border border-border bg-secondary/60 p-0.5 text-[11px] font-bold">
        <button
          type="button"
          onClick={() => {
            setBulk(false)
            setRaw(raw.split(/\s+/).filter(Boolean)[0] ?? '')
          }}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors ${
            !bulk ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
          }`}
        >
          <User className="size-3.5" />
          {singleLabel}
        </button>
        <button
          type="button"
          onClick={() => setBulk(true)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors ${
            bulk ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
          }`}
        >
          <Layers className="size-3.5" />
          {bulkLabel}
        </button>
      </div>

      <div
        className={`relative rounded-2xl border bg-card transition-colors ${
          touched && hasInvalid
            ? 'border-destructive/60'
            : 'border-border focus-within:border-primary/60'
        }`}
      >
        <Link2 className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-muted-foreground/70" />
        {bulk ? (
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onBlur={() => setTouched(true)}
            rows={4}
            dir="ltr"
            placeholder={placeholderBulk}
            className="w-full resize-none bg-transparent py-3 pl-10 pr-4 font-mono text-[13px] leading-relaxed outline-none placeholder:text-muted-foreground/40"
          />
        ) : (
          <input
            value={raw}
            onChange={(e) => setRaw(e.target.value.replace(/\s+/g, ''))}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false)
              setTyping(false)
              setTouched(true)
            }}
            dir="ltr"
            placeholder={placeholderSingle}
            className={cn(
              'w-full bg-transparent py-3 pl-10 font-mono text-[13px] leading-relaxed outline-none placeholder:text-muted-foreground/40',
              showApply ? 'pr-[108px]' : 'pr-4',
            )}
          />
        )}

        {/* Apply — pulls real X data only on demand (single target only) */}
        {showApply && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={applyProfile}
            disabled={!canApply || applyState === 'loading'}
            className={cn(
              'absolute right-2 top-1/2 inline-flex h-8 -translate-y-1/2 items-center gap-1.5 rounded-full px-3 text-[11.5px] font-bold transition-all active:scale-95',
              isApplied
                ? 'bg-primary/15 text-primary'
                : canApply
                  ? 'bg-primary text-primary-foreground shadow-[0_6px_16px_-8px_color-mix(in_oklab,var(--primary)_80%,transparent)]'
                  : 'bg-secondary/60 text-muted-foreground/60',
            )}
          >
            {applyState === 'loading' ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : isApplied ? (
              <Check className="size-3.5" strokeWidth={3} />
            ) : null}
            {applyState === 'loading'
              ? lang === 'ru'
                ? 'Подгрузка…'
                : 'Loading'
              : isApplied
                ? lang === 'ru'
                  ? 'Готово'
                  : 'Applied'
                : lang === 'ru'
                  ? 'Применить'
                  : 'Apply'}
          </button>
        )}
      </div>

      {showApply && (applyState === 'missing' || applyState === 'error') && (
        <p className="mt-2 px-1 text-[11px] font-semibold text-destructive">
          {applyState === 'missing'
            ? isPostTarget
              ? lang === 'ru'
                ? 'Пост не найден — проверьте ссылку'
                : 'Post not found — check the link'
              : lang === 'ru'
                ? 'Такой профиль X не найден — проверьте ник'
                : 'No such X profile — check the handle'
            : lang === 'ru'
              ? 'Сервис данных недоступен, попробуйте ещё раз'
              : 'Data service unavailable, try again'}
        </p>
      )}


      {bulk && (
        <div className="mt-2 flex items-center justify-between gap-2 px-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-[11px] font-bold text-foreground transition-colors hover:bg-secondary active:scale-95"
          >
            <Upload className="size-3.5" />
            {lang === 'ru' ? 'Загрузить .txt' : 'Upload .txt'}
          </button>
          {fileName && (
            <span className="truncate text-[10.5px] text-muted-foreground">
              {fileName}
            </span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,text/plain"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      )}

      <AnimatePresence initial={false}>
        {touched && hasInvalid && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-2 flex items-center gap-1.5 px-1"
          >
            <AlertCircle className="size-3.5 text-destructive" />
            <span className="text-[11px] font-semibold text-destructive">
              {t(isPostTarget ? 'invalid_format_likes' : 'invalid_format')}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {bulk && targetCount > 1 && (
        <p className="mt-3 rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-[11.5px] text-muted-foreground">
          {clampedQty.toLocaleString()} × {targetCount} ={' '}
          <span className="font-bold text-foreground">
            {(clampedQty * targetCount).toLocaleString()}
          </span>{' '}
          {lang === 'ru' ? 'всего' : 'total'}
        </p>
      )}

      {/* ─── Sticky footer — pinned to bottom ─── */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        className="glass fixed inset-x-0 bottom-0 z-30 mx-auto w-[min(480px,100%)] border-t border-border/60 px-4 pt-2.5"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mb-2 flex items-end justify-between px-1">
          <div className="min-w-0">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {t('total')}
            </p>
            <motion.p
              key={total.toFixed(2)}
              initial={{ opacity: 0.4, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="tnum font-display text-[24px] font-extrabold leading-none tracking-tight"
            >
              {money(total)}
            </motion.p>
          </div>
          {canOrder && (
            <p className="tnum text-[11px] font-semibold text-muted-foreground">
              {clampedQty.toLocaleString()} × {targetCount}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {/* Add to cart — grey by default, red flash when invalid */}
          <motion.button
            animate={shake === 'add' ? { x: [0, -8, 8, -6, 6, -3, 0] } : { x: 0 }}
            transition={{ duration: 0.45 }}
            type="button"
            onClick={handleAddClick}
            aria-disabled={!canOrder}
            className={`relative flex h-12 flex-1 items-center justify-center gap-2 overflow-hidden rounded-2xl border text-[13px] font-bold uppercase tracking-wider transition-colors ${
              canOrder
                ? 'border-border bg-secondary text-foreground hover:bg-secondary/70 active:scale-[0.98]'
                : 'border-border/60 bg-secondary/40 text-muted-foreground'
            }`}
          >
            <ShoppingBag className="relative z-10 size-4" />
            <span className="relative z-10">
              {editItem ? (lang === 'ru' ? 'Сохранить' : 'Save') : t('add_to_cart')}
            </span>
          </motion.button>

          {/* Quick pay — gold, no cart */}
          <motion.button
            animate={
              (shake === 'buy' && !canOrder) || noFunds
                ? { x: [0, -6, 6, -6, 6, 0] }
                : { x: 0 }
            }
            transition={{ duration: 0.35 }}
            type="button"
             onClick={handleBuyNow}
             aria-disabled={!canOrder || buying}
             disabled={buying}
             className={`relative flex h-12 flex-1 items-center justify-center gap-2 overflow-hidden rounded-2xl px-4 text-[13px] font-extrabold uppercase tracking-wider transition-transform ${
              canOrder
                ? 'ring-glow bg-gradient-to-r from-primary via-primary to-gold-deep text-primary-foreground active:scale-[0.98]'
                : 'bg-secondary/40 text-muted-foreground'
            }`}
          >
            {buying ? <Loader2 className="relative z-10 size-4 animate-spin" /> : <Zap className="relative z-10 size-4" />}
            {(noFunds || (shake === 'buy' && !canOrder)) && (
              <>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.55, 0] }}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                  className="pointer-events-none absolute inset-0 z-0 rounded-2xl bg-destructive/35"
                />
                <motion.span
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: [0, 0.7, 0], scale: [0.6, 1.4, 1.6] }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="pointer-events-none absolute inset-0 z-0 rounded-2xl"
                  style={{
                    background:
                      'radial-gradient(120% 120% at 50% 50%, hsl(0 90% 55% / 0.55), transparent 65%)',
                  }}
                />
              </>
            )}
            {canOrder ? (
              <Zap className="relative z-10 size-4" strokeWidth={2.5} />
            ) : (
              <motion.span
                animate={
                  (shake === 'buy' || noFunds)
                    ? { rotate: [0, -12, 12, -8, 0], scale: [1, 1.15, 1] }
                    : {}
                }
                transition={{ duration: 0.45 }}
                className="relative z-10"
              >
                <AlertCircle className="size-4" />
              </motion.span>
            )}
            <span className="relative z-10">
              {lang === 'ru' ? 'Купить сразу' : t('buy_now')}
            </span>
          </motion.button>
        </div>
      </motion.div>

      {/* Custom numeric keypad — replaces the native mobile keyboard */}
      <AnimatePresence>
        {keypadOpen && (
          <motion.div
            key="qty-keypad"
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
                  {isFollowers
                    ? lang === 'ru' ? 'Фолловеров' : 'Followers'
                    : t('quantity')}
                </span>
                <motion.span
                  key={qtyDraft || '0'}
                  initial={{ scale: 0.9, opacity: 0.6 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                  className="tnum font-mono text-2xl font-bold text-primary"
                >
                  {(Number(qtyDraft) || 0).toLocaleString()}
                </motion.span>
              </div>

              <div className="mb-2 flex justify-between px-2 text-[10px] font-semibold text-muted-foreground/70">
                <span>{lang === 'ru' ? 'Мин' : 'Min'} {service.min.toLocaleString()}</span>
                <span>{lang === 'ru' ? 'Макс' : 'Max'} {service.max.toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {['1','2','3','4','5','6','7','8','9','','0','back'].map((k, i) => {
                  if (k === '') return <div key={`sp-${i}`} className="h-14" />
                  const isAction = k === 'back'
                  const label = k === 'back' ? <Delete className="size-5" /> : k
                  return (
                    <motion.button
                      key={k}
                      whileTap={{ scale: 0.92 }}
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

      <ServiceInfoSheet open={infoOpen} onOpenChange={setInfoOpen} />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
 * FollowersPreview — a live X-profile card that mirrors the
 * slider value. The follower number rolls digit-by-digit as
 * the user drags. Feels like the account is filling in real
 * time. Only rendered for the Followers category.
 * ─────────────────────────────────────────────────────── */
function extractHandle(input: string): string {
  const first = input.split(/[\s,]+/).find(Boolean) ?? ''
  let h = first.trim()
  h = h.replace(/^https?:\/\//i, '')
  h = h.replace(/^(?:www\.)?(?:x|twitter)\.com\//i, '')
  h = h.replace(/^@+/, '')
  h = h.split(/[/?#]/)[0]
  h = h.replace(/[^A-Za-z0-9_]/g, '')
  return h.slice(0, 15)
}

function formatJoined(raw: string | null | undefined): string | null {
  if (!raw) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  return `Joined ${d.toLocaleString('en-US', { month: 'long' })} ${d.getFullYear()}`
}

function FollowersPreview({
  count,
  handle,
  typing,
  profile,
}: {
  count: number
  handle: string
  typing: boolean
  /** Real X data — only present after the user pressed "Применить". */
  profile?: XProfileRow | null
}) {
  const live = profile && !profile.not_found ? profile : null
  // Real followers + the ordered amount, exactly what the account will show.
  const totalFollowers = (live?.followers ?? 0) + count
  const formatted = totalFollowers.toLocaleString('en-US')
  const digits = formatted.split('')
  const displayHandle = live?.user_name || handle || 'username'
  const storageKey = `aurx.profile.v2.${(handle || '__default__').toLowerCase()}`
  const [customName, setCustomName] = useState<string>('')
  const [customAvatar, setCustomAvatar] = useState<string>('')
  const [editing, setEditing] = useState(false)

  // Name and avatar edits are session-only: they reset to the live X data
  // whenever the mini app is restarted.
  useEffect(() => {
    try {
      localStorage.removeItem(storageKey)
    } catch {
      /* ignore */
    }
    setCustomName('')
    setCustomAvatar('')
  }, [storageKey])

  const displayName = customName || live?.name || 'Name'
  const displayAvatar = customAvatar || live?.avatar_url || ''
  const joinedLabel = formatJoined(live?.joined_at) ?? 'Joined November 2030'
  const followingCount = (live?.following ?? 0).toLocaleString('en-US')
  const vt = (live?.verified_type ?? '').toLowerCase()
  const profileVerifiedTone =
    live && (live.is_blue_verified || live.is_verified || vt)
      ? vt === 'business' || vt === 'organization'
        ? 'text-[#e2b719]'
        : vt === 'government'
          ? 'text-[#829aab]'
          : 'text-[#1d9bf0]'
      : null



  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative -mx-4 mb-5 overflow-hidden rounded-none border-y border-white/10 bg-black sm:mx-0 sm:rounded-2xl sm:border"
    >
      {/* Banner — real one when cached, otherwise a fresh-profile gray */}
      <div className="h-[76px] overflow-hidden bg-[#333639]">
        {live?.banner_url && (
          <img src={live.banner_url} alt="" className="size-full object-cover" />
        )}
      </div>

      {/* Body */}
      <div className="relative px-4 pb-4">
        {/* Avatar + Edit profile row */}
        <div className="flex items-start justify-between">
          <div
            className="-mt-10 flex size-[72px] items-center justify-center overflow-hidden rounded-full border-[4px] border-black bg-[#1d1f23]"
          >
            {displayAvatar ? (
              <img src={displayAvatar} alt="" className="size-full object-cover" />
            ) : (
              <AurxMark className="size-[70%] opacity-90" />
            )}
          </div>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setEditing(true)}
            className="mt-3 cursor-pointer rounded-full border border-white/25 px-3.5 py-1 text-[13px] font-bold text-white/95 transition-colors hover:bg-white/10 active:bg-white/15"
          >
            Edit profile
          </button>
        </div>

        {/* Name + handle */}
        <div className="mt-2">
          <p
            className="flex items-center gap-1 text-[19px] font-extrabold leading-tight tracking-[-0.01em] text-white"
            style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
          >
            <span className="min-w-0 truncate">{displayName}</span>
            {profileVerifiedTone && (
              <VerifiedBadge className={cn('size-[19px] shrink-0', profileVerifiedTone)} />
            )}
          </p>

          <motion.p
            className="text-[14px] leading-tight text-[#71767b]"
            style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
          >
            @{displayHandle}
            {typing && (
              <motion.span
                aria-hidden
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.55, repeat: Infinity, ease: 'linear' }}
                className="ml-0.5 inline-block h-[0.9em] w-[2px] translate-y-[2px] bg-white/80 align-middle"
              />
            )}
          </motion.p>
        </div>

        {/* Joined */}
        <div className="mt-3 flex items-center gap-1 text-[14px] text-[#71767b]">
          <CalendarDays className="size-[16px]" strokeWidth={2} />
          <span>{joinedLabel}</span>
          <ChevronRight className="size-[14px]" strokeWidth={2.5} />
        </div>

        {/* Following / Followers */}
        <div className="mt-3 flex items-center gap-5 text-[14px] text-[#71767b]">
          <span>
            <span className="font-bold text-white">{followingCount}</span> Following
          </span>
          <span className="flex items-baseline gap-1">
            <DigitRoll digits={digits} />
            <span>Followers</span>
          </span>
        </div>


      </div>


      <AnimatePresence>
        {editing && (
          <EditProfileModal
            handle={handle}
            initialName={customName}
            initialAvatar={customAvatar}
            realName={live?.name ?? ''}
            realAvatar={live?.avatar_url ?? ''}
            realBanner={live?.banner_url ?? ''}
            onClose={() => setEditing(false)}
            onSave={(name, avatar) => {
              setCustomName(name)
              setCustomAvatar(avatar)
              setEditing(false)
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function EditProfileModal({
  handle,
  initialName,
  initialAvatar,
  initialPost = '',
  showPostField = false,
  realName = '',
  realAvatar = '',
  realBanner = '',
  onClose,
  onSave,
}: {
  handle: string
  initialName: string
  initialAvatar: string
  initialPost?: string
  showPostField?: boolean
  /** Live values already cached for this @handle — no API call is made for them. */
  realName?: string
  realAvatar?: string
  realBanner?: string
  onClose: () => void
  onSave: (name: string, avatar: string, post?: string) => void
}) {
  const modalProfile = useXProfile(handle)
  const resolvedName = modalProfile?.name || realName
  const resolvedAvatar = modalProfile?.avatar_url || realAvatar
  const resolvedBanner = modalProfile?.banner_url || realBanner
  
  const [name, setName] = useState(initialName || resolvedName)
  const [avatar, setAvatar] = useState(initialAvatar)
  const [post, setPost] = useState(initialPost)
  const [uploaded, setUploaded] = useState('')
  const [touchedName, setTouchedName] = useState(Boolean(initialName))

  // Live profile may resolve a moment after the modal opens — adopt the real
  // name as long as the user has not typed their own.
  useEffect(() => {
    if (!touchedName && resolvedName) setName(resolvedName)
  }, [resolvedName, touchedName])



  const { lang } = useI18n()
  const shownAvatar = avatar || resolvedAvatar
  // Phone photos are 3–12 MB; turning them straight into a base64 data URL is
  // what made the picker feel frozen. Decode off the main thread and downscale
  // to a 320px avatar before we ever touch React state.
  const pickFile = async (file: File | undefined) => {
    if (!file) return
    const objectUrl = URL.createObjectURL(file)
    try {
      const bitmap = await createImageBitmap(file)
      const size = 320
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('no 2d context')
      const side = Math.min(bitmap.width, bitmap.height)
      ctx.drawImage(
        bitmap,
        (bitmap.width - side) / 2,
        (bitmap.height - side) / 2,
        side,
        side,
        0,
        0,
        size,
        size,
      )
      bitmap.close?.()
      const url = canvas.toDataURL('image/webp', 0.85)
      setUploaded(url)
      setAvatar(url)
    } catch {
      // Safari/older WebViews without createImageBitmap — use the blob URL as-is.
      setUploaded(objectUrl)
      setAvatar(objectUrl)
      return
    }
    URL.revokeObjectURL(objectUrl)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
        className="relative flex w-full max-w-[600px] flex-col overflow-hidden bg-black text-white sm:my-6 sm:max-h-[92vh] sm:rounded-2xl sm:border sm:border-white/15"
      >
        {/* Header — X-style: close · title · Save */}
        <div className="sticky top-0 z-10 flex items-center gap-6 border-b border-white/10 bg-black/85 px-4 py-2.5 backdrop-blur">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-ml-2 flex size-9 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
          >
            <X className="size-5" strokeWidth={2.25} />
          </button>
          <h3 className="flex-1 text-[20px] font-extrabold tracking-tight">Edit profile</h3>
          <button
            type="button"
            onClick={() => onSave(name.trim(), avatar, showPostField ? post.trim() : undefined)}
            className="rounded-full bg-white px-4 py-1.5 text-[15px] font-bold text-black transition-colors hover:bg-white/90"
          >
            Save
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Banner strip — real banner when we already have it cached */}
          <div className="relative h-[150px] overflow-hidden bg-[#333639]">
            {resolvedBanner && (
              <img src={resolvedBanner} alt="" className="size-full object-cover" />
            )}
          </div>

          {/* Avatar overlapping banner */}
          <div className="relative -mt-[52px] px-4">
            <div className="flex size-[112px] items-center justify-center overflow-hidden rounded-full border-[4px] border-black bg-[#1d1f23]">
              {shownAvatar ? (
                <img src={shownAvatar} alt="" className="size-full object-cover" />
              ) : (
                <AurxMark className="size-[70%] opacity-90" />
              )}
            </div>
          </div>

          {/* Form fields */}
          <div className="px-4 pt-6 pb-8">
            {/* Floating-label Name input, X-style */}
            <div className="group relative rounded-[4px] border border-[#333639] bg-black px-2 pb-2 pt-2 focus-within:border-[#1d9bf0]">
              <label
                className={`pointer-events-none absolute left-2 origin-top-left text-[#71767b] transition-all group-focus-within:top-1 group-focus-within:translate-y-0 group-focus-within:text-[13px] group-focus-within:text-[#1d9bf0] ${
                  name ? 'top-1 translate-y-0 text-[13px]' : 'top-1/2 -translate-y-1/2 text-[17px]'
                }`}
              >
                Name
              </label>
              <div className="flex items-center">
                <input
                  value={name}
                  onChange={(e) => {
                    setTouchedName(true)
                    setName(e.target.value.slice(0, 50))
                  }}
                  placeholder={resolvedName}
                  maxLength={50}
                  autoFocus
                  className="mt-4 w-full bg-transparent text-[17px] text-white outline-none"
                />
                <span className="ml-2 mt-4 shrink-0 self-end text-[13px] text-[#71767b]">
                  {name.length} / 50
                </span>
              </div>
            </div>



            {/* Avatar picker */}
            <div className="mt-8">
              <p className="mb-3 text-[15px] font-extrabold text-white">Choose avatar</p>
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
                <button
                  type="button"
                  onClick={() => setAvatar('')}
                  aria-label="Default"
                  className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-full bg-[#1d1f23] transition-all ${
                    avatar === '' ? 'ring-[3px] ring-[#1d9bf0]' : 'ring-1 ring-white/10'
                  }`}
                >
                  {resolvedAvatar ? (
                    <img src={resolvedAvatar} alt="" className="size-full object-cover" />
                  ) : (
                    <AurxMark className="size-[60%] opacity-90" />
                  )}
                </button>
                {AVATAR_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAvatar(opt.url)}
                    aria-label={opt.label}
                    className={`relative aspect-square overflow-hidden rounded-full transition-all ${
                      avatar === opt.url ? 'ring-[3px] ring-[#1d9bf0]' : 'ring-1 ring-white/10'
                    }`}
                  >
                    <img src={opt.url} alt={opt.label} className="size-full object-cover" />
                  </button>
                ))}
                <label
                  aria-label={lang === 'ru' ? 'Загрузить своё фото' : 'Upload your photo'}
                  className={`relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-0.5 overflow-hidden rounded-full bg-[#1d1f23] text-[#71767b] transition-all hover:text-white ${
                    uploaded && avatar === uploaded
                      ? 'ring-[3px] ring-[#1d9bf0]'
                      : 'ring-1 ring-dashed ring-white/25'
                  }`}
                >
                  {uploaded ? (
                    <img src={uploaded} alt="" className="size-full object-cover" />
                  ) : (
                    <>
                      <Upload className="size-[30%]" strokeWidth={2.1} />
                       <span className="text-[8px] font-bold uppercase leading-none tracking-wide">
                         {lang === 'ru' ? 'загрузить фото' : 'upload photo'}
                       </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="sr-only"
                    onChange={(e) => pickFile(e.target.files?.[0])}
                  />
                </label>
              </div>
            </div>

            {showPostField && (
              <div className="mt-8">
                <p className="mb-2 text-[15px] font-extrabold text-white">Post</p>
                <div className="rounded-[4px] border border-[#333639] bg-black p-3 focus-within:border-[#1d9bf0]">
                  <textarea
                    value={post}
                    onChange={(e) => setPost(e.target.value.slice(0, 280))}
                    maxLength={280}
                    rows={3}
                    placeholder="What's happening?"
                    className="w-full resize-none bg-transparent text-[17px] leading-snug text-white outline-none placeholder:text-[#71767b]"
                  />
                  <div className="mt-1 text-right text-[12px] text-[#71767b]">
                    {post.length} / 280
                  </div>
                </div>
              </div>
            )}

            {/* Reset link */}
            <button
              type="button"
              onClick={() => onSave('', '', showPostField ? '' : undefined)}
              className="mt-8 text-[14px] font-semibold text-[#f4212e] hover:underline"
            >
              Reset to default
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}


/** Renders tweet text with X-style entity highlighting (@user, #tag, links). */
function TweetText({ text }: { text: string }) {
  // Trailing t.co links are the attached media/quote — X hides them too.
  const clean = decodeTweetText(text)
    .replace(/\s*https:\/\/t\.co\/\w+\s*$/g, '')
    .trim()
  const parts = clean.split(/(@[A-Za-z0-9_]{1,15}|#[\p{L}\p{N}_]+|https?:\/\/\S+)/gu)
  return (
    <p className="mt-0.5 text-[15px] leading-[20px] whitespace-pre-wrap break-words text-white">
      {parts.map((p, i) => {
        if (/^[@#]/.test(p) || /^https?:\/\//.test(p))
          return (
            <span key={i} className="text-[#f91880]">
              {p}
            </span>
          )
        return <span key={i}>{p}</span>
      })}
    </p>
  )
}

/* ─────────────────────────────────────────────────────────
 * LikesPreview — a live X-tweet card with an editable post,
 * name, handle and avatar. The like counter mirrors the
 * slider value (rolls digit-by-digit). Only rendered for
 * the Likes category.
 * ─────────────────────────────────────────────────────── */
function LikesPreview({
  count,
  handle,
  typing,
  lang,
  mode = 'likes',
  tweet,
}: {
  count: number
  handle: string
  typing: boolean
  lang: Lang
  mode?: 'likes' | 'views' | 'reposts' | 'bookmarks'
  /** Real post data — only present after the user pressed "Применить". */
  tweet?: XTweetRow | null
}) {
  const real = tweet && !tweet.not_found ? tweet : null
  const baseCount = real
    ? mode === 'likes'
      ? real.like_count
      : mode === 'reposts'
        ? real.retweet_count
        : mode === 'views'
          ? real.view_count
          : real.bookmark_count
    : 0
  const formatted = (baseCount + count).toLocaleString('en-US')
  const digits = formatted.split('')
  const displayHandle = real?.author_username || handle || 'username'
  const profileKey = `aurx.profile.v2.${(handle || '__default__').toLowerCase()}`
  const postKey = `aurx.likepost.${(handle || '__default__').toLowerCase()}`
  const [customName, setCustomName] = useState<string>('')
  const [customAvatar, setCustomAvatar] = useState<string>('')
  const [postText, setPostText] = useState<string>('')
  const [editing, setEditing] = useState(false)
  // Nothing is pulled until the user presses "Применить".

  useEffect(() => {
    try {
      localStorage.removeItem(profileKey)
    } catch {
      /* ignore */
    }
    setCustomName('')
    setCustomAvatar('')
    try {
      const p = localStorage.getItem(postKey)
      setPostText(p ?? '')
    } catch {
      setPostText('')
    }
  }, [profileKey, postKey])

  const displayName = customName || real?.author_name || 'Name'
  const displayAvatar = customAvatar || real?.author_avatar_url || ''
  const displayPost = postText || real?.text || 'Example'
  const displayDate = real?.posted_at
    ? new Date(real.posted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'Feb 30'
  const verifiedTone = real
    ? real.is_blue_verified || real.verified_type
      ? (real.verified_type ?? '').toLowerCase() === 'business' ||
        (real.verified_type ?? '').toLowerCase() === 'organization'
        ? 'text-[#e2b719]'
        : (real.verified_type ?? '').toLowerCase() === 'government'
          ? 'text-[#829aab]'
          : 'text-[#1d9bf0]'
      : null
    : null

  const sideCount = (n: number) => (n > 0 ? compactNumber(n) : '')

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative mb-5 overflow-hidden rounded-2xl border border-white/10 bg-black"
      style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
    >
      <div className="flex gap-3 px-4 pt-3.5 pb-2.5">
        {/* Avatar */}
        <div className="flex size-[40px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1d1f23]">
          {displayAvatar ? (
            <img src={displayAvatar} alt="" className="size-full object-cover" />
          ) : (
            <AurxMark className="size-[70%] opacity-90" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {/* Header row: name ✓ @handle · date  ···  */}
          <div className="grid grid-cols-[minmax(0,1fr)_28px] items-center gap-1">
            <div className="flex min-w-0 items-center gap-1 overflow-hidden">
              <span className="max-w-full shrink-0 truncate text-[15px] leading-5 font-bold text-white">
                {displayName}
              </span>
              {verifiedTone && (
                <VerifiedBadge className={cn('size-[16px] shrink-0', verifiedTone)} />
              )}
              <span className="min-w-0 truncate text-[15px] leading-5 text-[#71767b]">
                @{displayHandle}
              </span>
              {typing && (
                <motion.span
                  aria-hidden
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.55, repeat: Infinity, ease: 'linear' }}
                  className="inline-block h-[0.9em] w-[2px] shrink-0 bg-white/80"
                />
              )}
              <span className="shrink-0 text-[15px] leading-5 whitespace-nowrap text-[#71767b]">
                · {displayDate}
              </span>
            </div>
            <button
              type="button"
              aria-label={lang === 'ru' || lang === 'uk' ? 'Изменить' : 'Edit'}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setEditing(true)}
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-[#71767b] transition-colors hover:bg-white/10 hover:text-white active:bg-white/15"
            >
              <MoreHorizontal className="size-[18px]" strokeWidth={2} />
            </button>
          </div>

          {/* Post body */}
          <TweetText text={displayPost} />

          {/* Action row — как в мобильном X: иконки равномерно по ширине */}
          <div className="-ml-[52px] mt-3 flex w-[calc(100%+52px)] items-center justify-between gap-1 text-[#71767b]">
            {(
              [
                { key: 'reply', icon: MessageCircle, size: 17, value: real?.reply_count ?? 0 },
                {
                  key: 'reposts',
                  icon: Repeat2,
                  size: 18,
                  value: real?.retweet_count ?? 0,
                  tone: 'text-[#00ba7c]',
                },
                {
                  key: 'likes',
                  icon: Heart,
                  size: 17,
                  value: real?.like_count ?? 0,
                  tone: 'text-[#f91880]',
                  fill: 'fill-[#f91880]',
                },
                { key: 'views', icon: BarChart3, size: 17, value: real?.view_count ?? 0 },
                {
                  key: 'bookmarks',
                  icon: Bookmark,
                  size: 17,
                  value: real?.bookmark_count ?? 0,
                  tone: 'text-[#1d9bf0]',
                  fill: 'fill-[#1d9bf0]',
                },
              ] as const
            ).map((m) => {
              const active = mode === m.key
              const Icon = m.icon
              return (
                <span
                  key={m.key}
                  className={cn(
                    'flex shrink-0 items-center gap-1 text-[13px] whitespace-nowrap tnum',
                    active && ('tone' in m ? m.tone : 'text-white'),
                  )}
                >
                  <Icon
                    className={cn('shrink-0', active && 'fill' in m ? m.fill : undefined)}
                    style={{ width: m.size, height: m.size }}
                    strokeWidth={1.7}
                  />
                  {active ? (
                    <span>{compactNumber(baseCount + count)}</span>
                  ) : m.value > 0 ? (
                    <span>{compactNumber(m.value)}</span>
                  ) : null}
                </span>
              )
            })}
            <span className="flex shrink-0">
              <Share className="size-[17px] shrink-0" strokeWidth={1.7} />
            </span>
          </div>



        </div>
      </div>


      <AnimatePresence>
        {editing && (
          <EditProfileModal
            handle={handle}
            initialName={customName}
            initialAvatar={customAvatar}
            initialPost={postText}
            showPostField
            realName={real?.author_name ?? ''}
            realAvatar={real?.author_avatar_url ?? ''}
            realBanner={''}
            onClose={() => setEditing(false)}
            onSave={(name, avatar, post) => {
              setCustomName(name)
              setCustomAvatar(avatar)
              const nextPost = post ?? ''
              setPostText(nextPost)
              if (!nextPost) localStorage.removeItem(postKey)
              else localStorage.setItem(postKey, nextPost)
              setEditing(false)
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

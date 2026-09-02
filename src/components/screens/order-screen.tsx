'use client'

/* ─────────────────────────────────────────────────────────────
 * DESIGN FROZEN (Adeg / выдача аккаунтов)
 * Внешний вид этого экрана зафиксирован по требованию владельца.
 * Не менять разметку, классы, тексты и анимации без явного
 * подтверждения («размораживай дизайн Adeg»).
 * Багфиксы логики — можно, визуал — нет.
 * ───────────────────────────────────────────────────────────── */

import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Flag,
  GripVertical,
  KeyRound,
  Mail,
  Package,

  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SheetsIcon } from '@/components/icons/sheets-icon'
import txtIcon from '@/assets/txt-icon.png'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getOrderDelivery } from '@/lib/order-sync.functions'
import { XProfilePreview, type ProfileDraft } from '@/components/custom-account-profile-editor'
import { customLang } from '@/lib/custom-account'
import { copyText } from '@/lib/clipboard'
import { money } from '@/lib/format'
import { orderService } from '@/lib/order-service'
import { dbStatusToOrderStatus, orderStatusLabel } from '@/lib/order-status'
import { useI18n } from '@/lib/i18n'
import {
  FIELD_ORDER,
  SECRET_FIELDS,
  TEMPLATES,
  DELIMITERS,
  type DeliveredAccount,
  type Delimiter,
  type FieldKey,
  type TemplateId,
  delimiterChar,
  formatAccounts,
  maskValue,
  orderText,
  ruAccountPlural,
  templateLabel,
  displayValue,
  accountOrderId,
  effectiveMailProvider,
  accountFieldOrder,
  buyerFieldLabel,
  exportHeader,
} from '@/lib/order-delivery'
import { downloadOrderXlsx } from '@/lib/order-xlsx'
import { useStore } from '@/lib/store'
import { XLogo } from '../x-logo'
import { useToast } from '../toast'
import { ReportIssueSheet } from '../report-issue-sheet'
import { CustomMailHelpSheet } from '../custom-mail-help-sheet'

import { OrderProgress } from '../order-progress'

function dateTime(ts: number) {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Supplier shows the order ref shortened: `42753f83…acb0`. */
function shortRef(ref: string) {
  const raw = ref.replace(/^auto:/, '')
  return raw.length > 14 ? `${raw.slice(0, 8)}…${raw.slice(-4)}` : raw
}

/**
 * Internal project order id, derived from the purchase date/time.
 * Format: M + DD + Hmm + YYYY (Moscow time, 12-hour clock).
 * e.g. Aug 13 2026, 8:35 → "8138352026".
 */
function projectOrderId(ts: number): string {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Moscow',
    month: 'numeric',
    day: '2-digit',
    hour: 'numeric',
    hour12: true,
    minute: '2-digit',
    year: 'numeric',
  })
  const parts = fmt.formatToParts(new Date(ts))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('month')}${get('day')}${get('hour')}${get('minute')}${get('year')}`
}

function SortableFieldItem({
  field,
  label,
  checked,
  onToggle,
}: {
  field: FieldKey
  label?: string
  checked: boolean
  onToggle: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field,
  })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ${isDragging ? 'bg-white/[0.06] shadow-lg' : ''}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground/70 active:bg-white/[0.06] active:text-foreground"
        aria-label="Drag to reorder"
      >
        <GripVertical className="size-[18px]" strokeWidth={2.2} />
      </button>
      <button
        onClick={onToggle}
        className={`flex size-3.5 shrink-0 items-center justify-center rounded border text-[8px] ${
          checked ? 'border-primary bg-primary text-primary-foreground' : 'border-white/20'
        }`}
        aria-label={field}
      >
        {checked ? '✓' : ''}
      </button>
      <span className="min-w-0 flex-1 truncate text-[12px] font-medium">{label ?? field}</span>
    </div>
  )
}

export function OrderScreen() {
  const { id } = useParams({ from: '/order/$id' })
  const navigate = useNavigate()
  const { lang } = useI18n()
  const { orders, isAdmin } = useStore()
  const { show } = useToast()
  const T = (k: string, v?: Record<string, string | number>) => orderText(lang, k, v)

  const order = useMemo(() => orders.find((o) => o.id === id) ?? null, [orders, id])

  // Demo / local test orders have no supplier row, so only real (uuid) orders
  // are refreshed against the supplier API.
  const isRemote = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  const isLocalTest = id.startsWith('test-') || id.startsWith('demo-')
  const fetchDelivery = useServerFn(getOrderDelivery)
  const { data: live } = useQuery({
    queryKey: ['order-delivery', id],
    queryFn: () => fetchDelivery({ data: { orderId: id } }),
    enabled: isRemote && order !== null,
    staleTime: 30_000,
    refetchInterval: 5_000,
    retry: 1,
  })

  const accounts: DeliveredAccount[] = useMemo(
    () => {
      // The server copy is authoritative: an admin correction saved a minute ago
      // must win over whatever was hydrated into the store on page load.
      if (live?.accounts?.length) return live.accounts
      if (order?.accounts?.length) return order.accounts
      if (isLocalTest) {
        return [{ username: 'test_account', password: 'TestPassword123' }]
      }

      return []
    },
    [isLocalTest, live, order],
  )

  const guaranteeUntil = live?.guaranteeUntil ?? order?.guaranteeUntil

  const [openIds, setOpenIds] = useState<number[] | null>(null)
  const [detailsOpened, setDetailsOpened] = useState(false)
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState<Record<string, boolean>>({})
  const [formatOpen, setFormatOpen] = useState(false)
  const [template, setTemplate] = useState<TemplateId>('original')
  const [delimiter, setDelimiter] = useState<Delimiter>(':')
  const [fields, setFields] = useState<FieldKey[]>(FIELD_ORDER)
  const [active, setActive] = useState<FieldKey[]>(FIELD_ORDER)
  const [previewExpired, setPreviewExpired] = useState(false)
  const [reportIdx, setReportIdx] = useState<number | null>(null)
  const [mailHelpIdx, setMailHelpIdx] = useState<number | null>(null)


  useEffect(() => {
    setDetailsOpened(false)
    setOpenIds(null)
    setFormatOpen(false)
  }, [id])

  const [previewEl, setPreviewEl] = useState<HTMLDivElement | null>(null)
  const [trackEl, setTrackEl] = useState<HTMLDivElement | null>(null)
  const [scrollInfo, setScrollInfo] = useState({ top: 0, height: 0, visible: false })
  const dragRef = useRef<{ startY: number; startScroll: number } | null>(null)

  const trackHeight = trackEl?.clientHeight ?? previewEl?.clientHeight ?? 0

  const updateScrollbar = useCallback(() => {
    const el = previewEl
    if (!el) return
    const maxScroll = el.scrollHeight - el.clientHeight
    if (maxScroll <= 0) {
      setScrollInfo({ top: 0, height: 0, visible: false })
      return
    }
    const ratio = el.scrollTop / maxScroll
    const th = trackEl?.clientHeight ?? el.clientHeight
    const thumbHeight = Math.max(28, (el.clientHeight / el.scrollHeight) * th)
    const maxTop = Math.max(0, th - thumbHeight)
    setScrollInfo({
      top: Math.min(maxTop, ratio * maxTop),
      height: thumbHeight,
      visible: true,
    })
  }, [previewEl, trackEl])

  useEffect(() => {
    const el = previewEl
    if (!el) return
    updateScrollbar()
    el.addEventListener('scroll', updateScrollbar, { passive: true })
    const ro = new ResizeObserver(updateScrollbar)
    ro.observe(el)
    if (trackEl) ro.observe(trackEl)
    return () => {
      el.removeEventListener('scroll', updateScrollbar)
      ro.disconnect()
    }
  }, [previewEl, trackEl, updateScrollbar])

  function onThumbPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    const el = previewEl
    if (!el) return
    dragRef.current = { startY: e.clientY, startScroll: el.scrollTop }
    const th = trackHeight || el.clientHeight
    const onMove = (ev: PointerEvent) => {
      if (!dragRef.current || !el) return
      const delta = ev.clientY - dragRef.current.startY
      const thumbHeight = scrollInfo.height
      const maxScroll = el.scrollHeight - el.clientHeight
      const maxTop = Math.max(0, th - thumbHeight)
      const scrollDelta = (delta / maxTop) * maxScroll
      el.scrollTop = Math.max(0, Math.min(maxScroll, dragRef.current.startScroll + scrollDelta))
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  function onTrackPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation()
    const el = previewEl
    if (!el) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clickY = e.clientY - rect.top
    const th = trackHeight || el.clientHeight
    const thumbHeight = scrollInfo.height
    const maxScroll = el.scrollHeight - el.clientHeight
    const maxTop = Math.max(0, th - thumbHeight)
    const desiredTop = Math.max(0, Math.min(maxTop, clickY - thumbHeight / 2))
    el.scrollTop = (desiredTop / maxTop) * maxScroll
  }

  const scrollPreviewBy = useCallback((delta: number) => {
    const el = previewEl
    if (!el) return
    const maxScroll = el.scrollHeight - el.clientHeight
    el.scrollTop = Math.max(0, Math.min(maxScroll, el.scrollTop + delta))
  }, [previewEl])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
  )

  const guaranteeExpired =
    !!guaranteeUntil && (previewExpired || Date.now() > guaranteeUntil)

  const count = accounts.length || live?.qty || order?.qty || 0
  // Accounts are collapsed by default; user taps to expand.
  const openList = openIds ?? []
  const orderedActive = fields.filter((f) => active.includes(f))
  const fullText = formatAccounts(accounts, template, orderedActive, delimiter, lang)
  const PREVIEW_LIMIT = 5
  const scrollTemplates: TemplateId[] = ['login', 'api']
  const hiddenCount = scrollTemplates.includes(template)
    ? 0
    : Math.max(0, accounts.length - PREVIEW_LIMIT)
  const preview = scrollTemplates.includes(template)
    ? fullText
    : hiddenCount
      ? formatAccounts(accounts.slice(0, PREVIEW_LIMIT), template, orderedActive, delimiter, lang)
      : fullText

  const secretKeys = useMemo(() => {
    const keys: string[] = []
    accounts.forEach((acc, i) => {
      accountFieldOrder(acc).forEach((f) => {
        if (SECRET_FIELDS.has(f)) keys.push(`${i}:${f}`)
      })
    })
    return keys
  }, [accounts])

  // Export catalogue = ONLY fields actually delivered in this order
  // (catalogue order first, then admin-invented customs).
  const allFields = useMemo<FieldKey[]>(() => {
    const present = new Set<string>()
    accounts.forEach((acc) => accountFieldOrder(acc).forEach((f) => present.add(f)))
    const known = FIELD_ORDER.filter((f) => present.has(f))
    const extra = [...present].filter((f) => !FIELD_ORDER.includes(f as never))
    return [...known, ...extra]
  }, [accounts])

  useEffect(() => {
    setFields(allFields)
    setActive((prev) => {
      if (template === 'original') return allFields
      const kept = allFields.filter((f) => prev.includes(f))
      return kept.length ? kept : allFields
    })
  }, [allFields, template])


  const allRevealed = secretKeys.length > 0 && secretKeys.every((k) => revealed[k])

  function toggleAccount(i: number) {
    setOpenIds(openList.includes(i) ? [] : [i])
  }

  async function copy(text: string, key?: string) {
    const ok = await copyText(text)
    show(ok ? T('copied') : 'Error', ok ? undefined : { variant: 'error' })
    if (ok && key) {
      setCopied((p) => ({ ...p, [key]: true }))
      setTimeout(() => setCopied((p) => ({ ...p, [key]: false })), 2000)
    }
  }

  function downloadTxt() {
    const blob = new Blob([fullText + '\n'], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `order-${order?.orderRef ?? id}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 500)
  }

  function downloadCsv() {
    downloadOrderXlsx(accounts, orderedActive, `order-${order?.orderRef ?? id}.xlsx`)
  }

  function openMailReader(acc?: DeliveredAccount) {
    const src = acc ?? accounts[0]
    if (src) {
      sessionStorage.setItem(
        'tool:mail',
        JSON.stringify({
          email: src['hotmail_email'] ?? '',
          refresh_token: src['refresh_token'] ?? '',
          client_id: src['client_id'] ?? '',
        }),
      )
    }
    void navigate({ to: '/tools/mail' })
  }

  function openTotp(acc?: DeliveredAccount) {
    const secret = (acc ?? accounts[0])?.['twofa']
    if (secret) sessionStorage.setItem('tool:totp', secret)
    void navigate({ to: '/tools/totp' })
  }


  function applyTemplate(next: TemplateId) {
    setTemplate(next)
    const tpl = TEMPLATES.find((t) => t.id === next)
    if (tpl) {
      setFields(allFields)
      const picked =
        tpl.id === 'original'
          ? allFields
          : allFields.filter((f) => tpl.fields.includes(f))
      setActive(picked)
    }
  }


  function handleDragEnd(e: DragEndEvent) {
    const { active: item, over } = e
    if (over && item.id !== over.id) {
      setFields((prev) => {
        const oldIndex = prev.indexOf(item.id as FieldKey)
        const newIndex = prev.indexOf(over.id as FieldKey)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  const statusLabel = order
    ? orderStatusLabel(order.dbStatus ? dbStatusToOrderStatus(order.dbStatus) : order.status, lang === 'ru')
    : T('waiting')
  const displayTitle = (order?.title ?? T('order_title')).replace(
    'Old Dated Twitter Accounts',
    'Old Dated Accounts',
  )
  // Каждая услуга — свой дизайн. Ветвимся строго по типу, не «на глаз».
  const service = orderService(order)
  const isAged = service === 'aged'
  const isCustom = service === 'custom'
  const showDelivery = !isCustom || detailsOpened
  // В кастом-аккаунтах мы больше не работаем через API стороннего проекта —
  // везде фигурирует НАШ внутренний id, сгенерированный из даты покупки.
  // Для aged/boost сохраняется id поставщика (batch ref / per-item id).
  const projectId = projectOrderId(order?.date ?? Date.now())
  const itemIdFor = (acc: DeliveredAccount) =>
    isCustom ? projectId : accountOrderId(acc, order?.orderRef ?? id)

  return (
    <div className="mx-auto w-full max-w-[1180px] pb-20 text-[13px] sm:px-5">
      <div className="px-4 pt-5 sm:px-0 sm:pt-8">
        <button
          onClick={() => void navigate({ to: '/history' })}
          className="flex items-center gap-2 text-sm font-semibold text-muted-foreground active:opacity-60"
        >
          <ArrowLeft className="size-4" />
          {T('back')}
        </button>
      </div>

      {/* ── Order summary (AGED accounts only — custom account screen is untouched) ── */}
      <div className="px-4 pt-4 sm:px-0 sm:pt-6">
        {isAged ? (
        <div className="rounded-2xl border border-border bg-card p-3.5">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-[14px] border border-white/10 bg-[#0a0a0a] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <XLogo className="size-[22px] text-foreground" />
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[15px] font-bold leading-tight">{displayTitle}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {dateTime(order?.date ?? Date.now())}
                </span>
                <span className="flex items-center gap-1 rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <Package className="size-3" />
                  {count} {T('items')}
                </span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[15px] font-bold text-success tabular-nums">
                {money(order?.amount ?? 0)}
              </p>
              <span className="mt-1.5 inline-block rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                {statusLabel}
              </span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <button
              onClick={() => void copy(projectOrderId(order?.date ?? Date.now()))}
              className="flex items-center gap-1 rounded-md bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground active:scale-95"
            >
              <Copy className="size-3" />
              Order ID: {projectOrderId(order?.date ?? Date.now())}
            </button>
            {guaranteeUntil ? (
              <Chip
                icon={guaranteeExpired ? ShieldAlert : ShieldCheck}
                tone={guaranteeExpired ? 'red' : 'blue'}
              >
                {guaranteeExpired ? T('guarantee_expired') : T('guarantee_active')}{' '}
                <span className="opacity-60 tabular-nums">{dateTime(guaranteeUntil)}</span>
              </Chip>
            ) : null}
          </div>

        </div>
        ) : null}




        {isAdmin && guaranteeUntil && isAged ? (
          <button
            type="button"
            onClick={() => setPreviewExpired((v) => !v)}
            className="mx-auto mt-2 flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.05] px-3 py-1 text-[9px] font-semibold text-muted-foreground active:scale-[0.98]"
          >
            <ShieldAlert className="size-3" />
            {previewExpired ? T('preview_expired_off') : T('preview_expired')}
          </button>
        ) : null}
      </div>

      {isCustom && order?.customAccount ? (
        <OrderedProfileBanner meta={order.customAccount} />
      ) : null}

      {isCustom && order ? (
        <OrderProgress
          order={order}
          canManage={isAdmin && isLocalTest}
          detailsOpen={detailsOpened}
          onToggleDetails={() => {
            if (detailsOpened) {
              setDetailsOpened(false)
              setOpenIds(null)
              setFormatOpen(false)
              return
            }

            setDetailsOpened(true)
            toggleAccount(0)
            window.requestAnimationFrame(() => {
              document
                .getElementById('order-delivery')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            })
          }}
        />
      ) : null}


      {!showDelivery ? null : accounts.length === 0 ? (
        <p id="order-delivery" className="px-6 py-14 text-center text-sm text-muted-foreground">
          {T('empty')}
        </p>
      ) : (
        <>
          {/* ── Toolbar (aged/boost only — кастом без него) ──────────── */}
          {isCustom ? null : (
            <div className="flex flex-wrap items-center gap-2 px-4 pt-3 sm:px-1">
              <button
                onClick={() => {
                  if (allRevealed) {
                    setRevealed({})
                  } else {
                    const next: Record<string, boolean> = {}
                    secretKeys.forEach((k) => (next[k] = true))
                    setRevealed(next)
                  }
                }}
                className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-foreground active:opacity-60"
              >
                {allRevealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                {allRevealed ? T('hide_all') : T('show_all')}
              </button>
            </div>
          )}


          {/* ── Accounts ────────────────────────────────────────────── */}
          <div id="order-accounts" className="space-y-2 px-4 pt-3 sm:px-0">
            {accounts.map((acc, i) => {
              const open = openList.includes(i)
              return (
                <div key={i} className="rounded-2xl border border-border bg-card">
                  <div
                    onClick={() => toggleAccount(i)}
                    className="flex cursor-pointer items-center gap-2 px-3.5 py-2.5 active:opacity-80"
                  >
                    {accounts.length > 1 ? (
                      <span className="text-[11px] text-muted-foreground">#{i + 1}</span>
                    ) : null}
                    <span className="flex min-w-0 flex-1 items-center gap-1">
                      <span className="truncate font-mono text-[11px] font-semibold">
                        {acc['username'] ?? '—'}
                      </span>
                      <a
                        href={`https://x.com/${acc['username'] ?? ''}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Open X profile"
                        title="Open X profile"
                        className="shrink-0 text-muted-foreground transition-colors hover:text-[#1d9bf0] active:text-[#1d9bf0] active:opacity-60"
                      >
                        <ExternalLink className="size-3" />
                      </a>
                    </span>
                    <span className="rounded-full border border-success/25 bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                      {statusLabel}
                    </span>
                    <IconBtn
                      label="Report"
                      tone="red"
                      onClick={(e) => {
                        e.stopPropagation()
                        setReportIdx(i)
                      }}
                    >
                      <Flag className="size-3.5" />
                    </IconBtn>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleAccount(i)
                      }}
                      aria-label="Toggle"
                      className="flex size-7 items-center justify-center rounded-lg text-muted-foreground active:opacity-60"
                    >
                      <ChevronDown
                        className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </div>

                  {open ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                       className="overflow-hidden px-3 pb-3"
                    >
                        <div className="mb-2 rounded-md border border-white/10 bg-background/80 px-2 py-1.5 text-center">
                          <p className="text-[7px] font-medium uppercase text-muted-foreground">
                            order id
                          </p>
                          <p className="mt-0.5 break-all font-mono text-[10px] font-semibold">
                            {itemIdFor(acc)}
                          </p>
                        </div>
                       <div className="grid grid-cols-2 gap-2">
                        {accountFieldOrder(acc).map((f) => {
                          const rk = `${i}:${f}`
                          const secret = !isCustom && SECRET_FIELDS.has(f)
                          const shown = !secret || revealed[rk]
                          const rawValue = acc[f] ?? ''
                          const display = displayValue(f, rawValue)
                          const isCopied = copied[rk]
                          return (
                            <div
                              key={f}
                              onClick={() => void copy(rawValue, rk)}
                              aria-label={`Copy ${f}`}
                              role="button"
                              className="min-h-[48px] cursor-pointer rounded-md border border-white/10 bg-background/80 px-2 py-1.5 text-left active:opacity-80"
                            >
                              <div className="flex items-center gap-2">
                                 <p className="min-w-0 flex-1 truncate text-[7px] font-medium uppercase text-muted-foreground">
                                  {buyerFieldLabel(acc, f)}
                                </p>
                                {secret ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setRevealed((p) => ({ ...p, [rk]: !p[rk] }))
                                    }}
                                    aria-label="Reveal"
                                    className="text-muted-foreground active:opacity-60"
                                  >
                                    {shown ? (
                                      <EyeOff className="size-3.5" />
                                    ) : (
                                      <Eye className="size-3.5" />
                                    )}
                                  </button>
                                ) : null}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    void copy(rawValue, rk)
                                  }}
                                  aria-label={isCopied ? 'Copied' : 'Copy field'}
                                  className={`shrink-0 active:opacity-60 ${isCopied ? 'text-success' : 'text-muted-foreground'}`}
                                >
                                  {isCopied ? (
                                    <Check className="size-3.5" />
                                  ) : (
                                    <Copy className="size-3.5" />
                                  )}
                                </button>
                              </div>
                               <p className="mt-1 break-all font-mono text-[10px] font-semibold leading-tight">
                                {shown ? display : maskValue(display)}
                              </p>
                            </div>
                          )
                        })}
                       </div>

                       {/* ── Per-account quick actions ───────────────── */}
                       {isCustom ? (
                         (acc['hotmail_email'] || acc['refresh_token'] || acc['twofa']) && (
                           <div className="mt-2 space-y-2">
                             {(effectiveMailProvider(acc) || acc['hotmail_email'] || acc['refresh_token']) ? (
                               <motion.button
                                 whileTap={{ scale: 0.985 }}
                                 onClick={() => setMailHelpIdx(i)}
                                 animate={{
                                   boxShadow: [
                                     '0 0 0 0 color-mix(in oklab, var(--info) 0%, transparent)',
                                     '0 0 0 4px color-mix(in oklab, var(--info) 14%, transparent)',
                                     '0 0 0 0 color-mix(in oklab, var(--info) 0%, transparent)',
                                   ],
                                 }}
                                 transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                                 className="relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-info/25 bg-gradient-to-r from-info/12 to-transparent px-3 py-2.5 text-left"
                               >
                                 <motion.span
                                   aria-hidden
                                   className="pointer-events-none absolute inset-0 bg-info/10"
                                   animate={{ opacity: [0.15, 0.5, 0.15] }}
                                   transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                                 />
                                 <motion.span
                                   className="relative flex size-8 shrink-0 items-center justify-center rounded-xl bg-info/15 text-info"
                                   animate={{ scale: [1, 1.06, 1] }}
                                   transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                                 >
                                   <Mail className="size-4" />
                                 </motion.span>
                                 <span className="relative min-w-0 flex-1">
                                   <span className="block text-[12px] font-bold leading-tight">
                                     {lang === 'ru' || lang === 'uk'
                                       ? 'Как войти в почту?'
                                       : 'How to access the mailbox?'}
                                   </span>
                                   <span className="block text-[9.5px] text-muted-foreground">
                                     {lang === 'ru' || lang === 'uk'
                                       ? 'Пошаговая инструкция и вход в один тап'
                                       : 'Step-by-step guide and one-tap login'}
                                   </span>
                                 </span>
                                 <ChevronRight className="relative size-4 shrink-0 text-muted-foreground" />
                               </motion.button>
                             ) : null}
                             {acc['twofa'] ? (
                               <motion.button
                                 whileTap={{ scale: 0.985 }}
                                 onClick={() => openTotp(acc)}
                                 className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-success/12 to-transparent px-3 py-2.5 text-left"
                               >
                                 <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
                                   <KeyRound className="size-4" />
                                 </span>
                                 <span className="min-w-0 flex-1">
                                   <span className="block text-[12px] font-bold leading-tight">
                                     {lang === 'ru' || lang === 'uk'
                                       ? 'Получить код 2FA'
                                       : 'Get 2FA code'}
                                   </span>
                                   <span className="block text-[9.5px] text-muted-foreground">
                                     {lang === 'ru' || lang === 'uk'
                                       ? 'Ключ уже подставлен — код обновляется каждые 30 сек'
                                       : 'Key prefilled — code refreshes every 30s'}
                                   </span>
                                 </span>
                                 <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                               </motion.button>
                             ) : null}
                           </div>
                         )
                       ) : (
                         (acc['hotmail_email'] || acc['refresh_token'] || acc['twofa']) && (

                         <div className="group relative mt-2 grid grid-cols-2 gap-2">
                           <motion.div
                             aria-hidden
                             className="pointer-events-none absolute inset-0 rounded-xl bg-info/10 blur-md"
                             animate={{ opacity: [0.15, 0.45, 0.15] }}
                             transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity }}
                           />
                           <motion.div
                             aria-hidden
                             className="pointer-events-none absolute inset-0 rounded-xl bg-success/10 blur-md"
                             animate={{ opacity: [0.15, 0.45, 0.15] }}
                             transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity, delay: 1.2 }}
                           />

                           {(acc['hotmail_email'] || acc['refresh_token']) ? (
                             <button
                               onClick={() => openMailReader(acc)}
                               className="relative z-10 flex items-center justify-between gap-1.5 rounded-xl border border-info/40 bg-info/10 px-3 py-2 text-[11px] font-bold text-info transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
                             >
                               <span className="flex items-center gap-1.5">
                                 <Mail className="size-3.5" />
                                 {T('email_access')}
                               </span>
                               <span className="flex size-5 items-center justify-center rounded-md bg-info/25">
                                 <ChevronRight className="size-3.5" />
                               </span>
                             </button>
                           ) : (
                             <span />
                           )}
                           {acc['twofa'] ? (
                             <button
                               onClick={() => openTotp(acc)}
                               className="relative z-10 flex items-center justify-between gap-1.5 rounded-xl border border-success/40 bg-success/10 px-3 py-2 text-[11px] font-bold text-success transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
                             >
                               <span className="flex items-center gap-1.5">
                                 <KeyRound className="size-3.5" />
                                 {T('twofa_protect')}
                               </span>
                               <span className="flex size-5 items-center justify-center rounded-md bg-success/25">
                                 <ChevronRight className="size-3.5" />
                               </span>
                             </button>
                           ) : (
                             <span />
                           )}
                         </div>
                         )
                       )}

                     </motion.div>
                   ) : null}
                 </div>
               )
             })}
           </div>

          {/* ── Format & export ─────────────────────────────────────── */}
          <div className="px-4 pt-4 sm:px-0">
            <div className="overflow-hidden rounded-lg border border-white/10 bg-card/40">
              <button
                onClick={() => setFormatOpen((v) => !v)}
                className="flex w-full items-center gap-3 px-4 py-3"
              >
                <span className="flex size-8 items-center justify-center rounded-md bg-info/10 text-info">
                  <SlidersHorizontal className="size-4" />
                </span>
                <span className="min-w-0 flex-1 text-center">
                  <span className="block text-[12px] font-bold">
                    {count === 1 ? T('format_title_single') : T('format_title_plural')}
                  </span>
                  <span className="block text-[9px] text-muted-foreground">
                    {T('format_sub', { n: count, acc: ruAccountPlural(count) })}
                  </span>
                </span>
                <ChevronDown
                  className={`size-4 shrink-0 text-muted-foreground transition-transform ${formatOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {formatOpen ? (
                <div className="border-t border-white/5 p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <Sparkles className="size-3" />
                    {T('quick_templates')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {TEMPLATES.map((tpl) => {
                      const selected = template === tpl.id
                      const selectedCls =
                        tpl.id === 'original'
                          ? 'bg-success/20 text-success'
                          : 'bg-[#00bfff] text-white'
                      return (
                        <button
                          key={tpl.id}
                          onClick={() => applyTemplate(tpl.id)}
                          className={`rounded-xl px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                            selected
                              ? selectedCls
                              : 'border border-white/10 bg-white/[0.02] text-foreground/80'
                          }`}
                        >
                          {templateLabel(lang, tpl.id)}
                        </button>
                      )
                    })}
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {T('fields_order')}
                    </p>
                    <p className="text-[11px]">
                      <button
                        onClick={() => setActive(allFields)}
                        className="text-primary active:opacity-60"
                      >
                        {T('select_all')}
                      </button>
                      <span className="px-1 text-muted-foreground">/</span>
                      <button
                        onClick={() => setActive([])}
                        className="text-muted-foreground active:opacity-60"
                      >
                        {T('clear_all')}
                      </button>
                    </p>
                  </div>


                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext items={fields} strategy={verticalListSortingStrategy}>
                      <div className="mt-2 max-h-56 space-y-0.5 overflow-y-auto rounded-xl border border-white/5 bg-white/[0.02] p-2">
                        {fields.map((f) => (
                          <SortableFieldItem
                            key={f}
                            field={f}
                            label={exportHeader(accounts, f, undefined, lang)}
                            checked={active.includes(f)}
                            onToggle={() =>
                              setActive((prev) =>
                                prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
                              )
                            }
                          />
                        ))}
                      </div>
                    </SortableContext>


                  </DndContext>

                  {template !== 'original' ? (
                    <div className="mt-4">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {T('delimiter')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {DELIMITERS.map((d) => (
                          <button
                            key={d}
                            onClick={() => setDelimiter(d)}
                            className={`min-w-[2.25rem] rounded-xl px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                              delimiter === d
                                ? 'bg-[#00bfff] text-white'
                                : 'border border-white/10 bg-white/[0.02] text-foreground/80'
                            }`}
                          >
                            {d === 'TAB' ? 'TAB' : d === 'SPACE' ? 'SPACE' : delimiterChar(d)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <p className="mb-1 mt-4 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <Eye className="size-3" />
                    {T('preview')}
                  </p>

                  <div className="relative">
                    <div
                      ref={setPreviewEl}
                      className="max-h-[280px] overflow-y-auto overscroll-contain rounded-lg border border-white/[0.06] bg-black/40 p-3 pr-8 font-mono text-[11px] leading-relaxed text-[#00e5a0] [-webkit-overflow-scrolling:touch]"
                      onClick={() => void copy(preview)}
                    >
                      <pre className="whitespace-pre-wrap break-all">{preview}</pre>
                    </div>
                    {scrollInfo.visible ? (
                      <div className="absolute right-1 top-2 bottom-2 flex w-5 touch-none flex-col items-center">
                        <button
                          type="button"
                          aria-label="Scroll preview up"
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[#00e5a0] drop-shadow-[0_0_4px_rgba(0,229,160,0.8)] transition-transform active:scale-90"
                          onClick={() => scrollPreviewBy(-80)}
                        >
                          <svg viewBox="0 0 24 24" className="size-2.5 fill-current">
                            <path d="M12 6l8 12H4z" />
                          </svg>
                        </button>

                        <div
                          ref={setTrackEl}
                          className="relative my-1 w-2.5 flex-1 touch-none rounded-full bg-white/15"
                          onPointerDown={onTrackPointerDown}
                          aria-hidden="true"
                        >
                          <div className="absolute inset-0 overflow-hidden rounded-full">
                            <div
                              className="absolute left-0 right-0 top-0 flex cursor-pointer justify-center touch-none"
                              style={{ top: scrollInfo.top, height: scrollInfo.height }}
                              onPointerDown={onThumbPointerDown}
                              aria-label="Scroll preview"
                            >
                              <div className="h-full w-1.5 rounded-full bg-[#00e5a0] shadow-[0_0_14px_rgba(0,229,160,0.9)]" />
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          aria-label="Scroll preview down"
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[#00e5a0] drop-shadow-[0_0_4px_rgba(0,229,160,0.8)] transition-transform active:scale-90"
                          onClick={() => scrollPreviewBy(80)}
                        >
                          <svg viewBox="0 0 24 24" className="size-2.5 fill-current">
                            <path d="M12 18l-8-12h16z" />
                          </svg>
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {hiddenCount ? (
                    <p className="mt-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px] leading-snug text-muted-foreground">
                      {T('preview_more', { n: hiddenCount })}
                    </p>
                  ) : null}

                  <div className="mt-6 border-t border-foreground/10 pt-4">
                    <div className="px-3 text-center text-[12px] font-semibold leading-5 text-muted-foreground">
                      {T('choose_format')}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <motion.button
                      onClick={downloadTxt}
                      className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-card px-4 py-3 text-[11px] font-bold text-foreground shadow-sm shadow-black/20 transition-all hover:border-white/[0.10] hover:bg-elevated active:scale-[0.99]"
                      whileHover="hover"
                      whileTap="tap"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg overflow-hidden">
                        <img src={txtIcon} alt="" className="size-full object-contain" />
                      </span>
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block">{T('download_txt')}</span>
                      </span>
                      <motion.span
                        className="size-5 shrink-0 text-muted-foreground/70 transition-colors group-hover:text-[#1d9bf0] group-active:text-[#1d9bf0]"
                        variants={{
                          hover: { y: 4 },
                          tap: { scale: 0.9, y: 5 },
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      >
                        <Download className="size-full" strokeWidth={2} />
                      </motion.span>
                    </motion.button>
                    <motion.button
                      onClick={downloadCsv}
                      className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-card px-4 py-3 text-[11px] font-bold text-foreground shadow-sm shadow-black/20 transition-all hover:border-white/[0.10] hover:bg-elevated active:scale-[0.99]"
                      whileHover="hover"
                      whileTap="tap"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center">
                        <SheetsIcon className="h-8 w-auto" />
                      </span>
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block whitespace-nowrap">{T('download_csv_sheets')}</span>
                        {T('download_csv_hint') ? (
                          <span className="block text-[10px] font-medium text-muted-foreground">{T('download_csv_hint')}</span>
                        ) : null}
                      </span>
                      <motion.span
                        className="size-5 shrink-0 text-muted-foreground/70 transition-colors group-hover:text-[#1d9bf0] group-active:text-[#1d9bf0]"
                        variants={{
                          hover: { y: 4 },
                          tap: { scale: 0.9, y: 5 },
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      >
                        <Download className="size-full" strokeWidth={2} />
                      </motion.span>
                    </motion.button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

        </>
      )}
      <ReportIssueSheet
        open={reportIdx !== null}
        onOpenChange={(v) => setReportIdx(v ? reportIdx : null)}
        account={reportIdx !== null ? accounts[reportIdx]?.['username'] : undefined}
        orderRef={
          reportIdx !== null && accounts[reportIdx]
            ? itemIdFor(accounts[reportIdx])
            : isCustom
              ? projectId
              : (order?.orderRef ?? id)
        }
      />
      <CustomMailHelpSheet
        open={mailHelpIdx !== null}
        onOpenChange={(v) => setMailHelpIdx(v ? mailHelpIdx : null)}
        creds={{
          email: mailHelpIdx !== null ? accounts[mailHelpIdx]?.['hotmail_email'] : undefined,
          password: mailHelpIdx !== null ? accounts[mailHelpIdx]?.['hotmail_pass'] : undefined,
          refreshToken: mailHelpIdx !== null ? accounts[mailHelpIdx]?.['refresh_token'] : undefined,
          clientId: mailHelpIdx !== null ? accounts[mailHelpIdx]?.['client_id'] : undefined,
          provider:
            mailHelpIdx !== null && accounts[mailHelpIdx]
              ? effectiveMailProvider(accounts[mailHelpIdx]!)
              : null,
        }}
        onOpenReader={() => {
          if (mailHelpIdx !== null) openMailReader(accounts[mailHelpIdx])
        }}
      />

    </div>
  )
}

function Chip({
  icon: Icon,
  tone,
  children,
  onClick,
}: {
  icon: typeof ShieldCheck
  tone: 'blue' | 'green' | 'red' | 'neutral'
  children: React.ReactNode
  onClick?: () => void
}) {
  const cls =
    tone === 'blue'
      ? 'border-info/25 bg-info/10 text-info'
      : tone === 'green'
        ? 'border-success/25 bg-success/10 text-success'
        : tone === 'red'
          ? 'border-destructive/35 bg-destructive/10 text-destructive'
          : 'border-white/15 bg-white/[0.05] text-muted-foreground'
  const base = `flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-semibold ${cls}`
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${base} active:scale-[0.98]`}>
        <Icon className="size-3" />
        {children}
      </button>
    )
  }
  return (
    <span className={base}>
      <Icon className="size-3" />
      {children}
    </span>
  )
}

function IconBtn({
  children,
  onClick,
  label,
  tone,
}: {
  children: React.ReactNode
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  label: string
  tone?: 'blue' | 'green' | 'red'
}) {
  const cls =
    tone === 'blue'
      ? 'text-info bg-info/10'
      : tone === 'green'
        ? 'text-success bg-success/10'
        : tone === 'red'
          ? 'text-destructive bg-destructive/10'
          : 'text-muted-foreground bg-white/[0.04]'
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex size-6 shrink-0 items-center justify-center rounded-md active:opacity-60 ${cls}`}
    >
      {children}
    </button>
  )
}
/* ── Ordered custom account preview ─────────────────────────────────── */
function OrderedProfileBanner({ meta }: { meta: Record<string, string> }) {
  const { lang } = useI18n()
  const cl = customLang(lang)
  const year = meta['year'] ?? '2021'
  const clean = (v?: string) => (v && v !== '—' ? v : '')
  const draft: ProfileDraft = {
    name: clean(meta['profile_name']),
    handle: clean(meta['profile_handle']).replace(/^@/, ''),
    bio: clean(meta['profile_bio']),
    avatar: meta['profile_avatar_url'] || null,
    banner: meta['profile_banner_url'] || null,
    verified: meta['profile_verified'] === 'yes',
    followingRange:
      (meta['profile_following_range'] as ProfileDraft['followingRange']) || '30-50',
    postsRange: (meta['profile_posts_range'] as ProfileDraft['postsRange']) || '0-50',
    followers: Number(meta['followers']) || 5000,
  }
  const chosen = ['ctl-year', 'ctl-followers', 'ctl-following', 'ctl-posts', 'ctl-name', 'ctl-handle', 'ctl-bio', 'ctl-media']

  return (
    <div className="px-4 pt-4 sm:px-0">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-primary/70">
        {cl === 'ru' ? 'Ваш аккаунт' : 'Your account'}
      </p>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <XProfilePreview value={draft} cl={cl} year={year} onJump={() => {}} chosen={chosen} demoMedia />
      </div>
    </div>
  )
}

'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  X,
  Trash2,
  Loader2,
  Check,
  BadgeCheck,
  Star,
  RefreshCw,

  AlertCircle,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createFollowerAccount,
  updateFollowerAccount,
  deleteFollowerAccount,
  type FollowerAccountRow,
  type SmartFollower,
} from '@/lib/follower-accounts'
import { TOPICS, TOPIC_ROTATION, isTopicId, type TopicId } from '@/lib/topics'
import type { Verification } from '@/lib/types'
import { formatCompactFollowers, normalizeXHandle, verificationFromX } from '@/lib/x-utils'
import { syncXProfiles } from '@/lib/x-profile.functions'
import { useToast } from './toast'

type Props = {
  open: boolean
  onClose: () => void
  row: FollowerAccountRow | null // null = create mode
  category?: 'followers_acc' | 'smart_acc'
}

type FormState = {
  year_range: string
  price_per_account: number
  stock: number
  followers: number
  smart_followers: number
  verification: Verification
  is_active: boolean
  /** Ordered list; index 0 = primary. */
  topic_ids: TopicId[]
  account_url: string
  smart_list: SmartFollower[]
  /** Optional "Описание" block shown on the public account page. */
  description_enabled: boolean
  description_ru: string
}

const emptyForm: FormState = {
  year_range: '2020',
  price_per_account: 0,
  stock: 1,
  followers: 0,
  smart_followers: 0,
  verification: 'none',
  is_active: true,
  topic_ids: [],
  account_url: '',
  smart_list: [],
  description_enabled: false,
  description_ru: '',
}

function fmtK(n: number) {
  return formatCompactFollowers(n)
}


const PLACEHOLDER_LABEL_RE = /^Smart follower\s+\d+$/i
function cleanSmartLabel(label: string) {
  return PLACEHOLDER_LABEL_RE.test(label.trim()) ? '' : label
}

const VERIFICATIONS = [
  { id: 'none', label: 'Без', color: 'oklch(0.55 0 0)' },
  { id: 'blue', label: 'Синяя', color: 'oklch(0.72 0.15 235)' },
  { id: 'gold', label: 'Золотая', color: 'oklch(0.85 0.14 88)' },
  { id: 'gray', label: 'Серая', color: 'oklch(0.74 0.01 260)' },
] as const

type TabId = 'main' | 'smart'

export function FollowerAccountEditor({ open, onClose, row, category = 'followers_acc' }: Props) {
  const isEdit = !!row
  const effectiveCategory = row?.category ?? category
  const isSmart = effectiveCategory === 'smart_acc'

  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [xLoading, setXLoading] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [tab, setTab] = useState<TabId>('main')
  const lastAutoHandle = useRef<string | null>(null)
  const { show } = useToast()

  useEffect(() => {
    if (!open) return
    if (row) {
      const raw = Array.isArray(row.topic_ids) && row.topic_ids.length > 0
        ? row.topic_ids
        : row.topic_id
        ? [row.topic_id]
        : []
      const cleaned: TopicId[] = []
      for (const t of raw) {
        if (isTopicId(t) && !cleaned.includes(t)) cleaned.push(t)
      }
      if (row.topic_id && isTopicId(row.topic_id) && cleaned.includes(row.topic_id)) {
        const i = cleaned.indexOf(row.topic_id)
        if (i > 0) {
          cleaned.splice(i, 1)
          cleaned.unshift(row.topic_id)
        }
      }
      setForm({
        year_range: row.year_range,
        price_per_account: Number(row.price_per_account),
        stock: row.stock,
        followers: row.followers,
        smart_followers: row.smart_followers ?? 0,
        verification: row.verification,
        is_active: row.is_active,
        topic_ids: cleaned,
        account_url: row.account_url ?? '',
        smart_list: Array.isArray(row.smart_followers_list)
          ? row.smart_followers_list.map((x) => ({
              label: cleanSmartLabel(String(x?.label ?? '')),
              avatar_url: x?.avatar_url ?? '',
            }))
          : [],
        description_enabled: row.description_enabled ?? false,
        description_ru: row.description_ru ?? '',
      })
    } else {
      setForm(emptyForm)
    }
    setConfirmDelete(false)
    setManualMode(false)
    setTab('main')
    lastAutoHandle.current = null
  }, [open, row])

  const primaryTopicId = form.topic_ids[0]
  const topic = primaryTopicId ? TOPICS[primaryTopicId] : null
  const soldOut = form.stock <= 0

  const issues = useMemo(() => {
    const list: { tab: TabId; text: string }[] = []
    if (form.topic_ids.length === 0) list.push({ tab: 'main', text: 'Выберите тематику' })
    if (!form.price_per_account) list.push({ tab: 'main', text: 'Укажите цену' })
    if (!form.followers && !normalizeXHandle(form.account_url))
      list.push({ tab: 'main', text: 'Нужны фолловеры или ссылка на X' })
    return list
  }, [form.topic_ids, form.price_per_account, form.followers, form.account_url])

  const fetchXPatch = async (source: FormState) => {
    const handle = normalizeXHandle(source.account_url)
    if (!handle) return null

    const rows = await syncXProfiles({ data: { handles: [handle], force: true } })
    const profile = rows.find((r) => r.username_key === handle.toLowerCase())
    if (!profile || profile.not_found) return null

    const joinedYear = profile.joined_at
      ? String(new Date(profile.joined_at).getUTCFullYear())
      : source.year_range

    return {
      account_url: `x.com/${profile.user_name || handle}`,
      followers: profile.followers || source.followers,
      verification: verificationFromX(
        profile.is_blue_verified,
        profile.verified_type,
        profile.is_verified,
        source.verification,
      ),
      year_range: joinedYear || source.year_range,
      userName: profile.user_name || handle,
    }
  }

  const save = async () => {
    setSaving(true)
    let nextForm = form
    if (normalizeXHandle(form.account_url)) {
      try {
        const patch = await fetchXPatch(form)
        if (patch) {
          nextForm = { ...form, ...patch }
          setForm(nextForm)
        }
      } catch {
        /* Manual values remain valid when provider is temporarily unavailable. */
      }
    }

    if (form.topic_ids.length === 0) {
      setTab('main')
      show('Выберите хотя бы одну тематику')
      setSaving(false)
      return
    }
    if (!nextForm.followers) {
      setTab('main')
      show('Укажите количество фолловеров')
      setSaving(false)
      return
    }
    if (!nextForm.price_per_account) {
      setTab('main')
      show('Укажите цену')
      setSaving(false)
      return
    }
    try {
      const primary = nextForm.topic_ids[0]
      const t = TOPICS[primary]
      const derivedName = `${t.label.ru} · ${fmtK(nextForm.followers)}`
      const derivedNameEn = `${t.label.en} · ${fmtK(nextForm.followers)}`
      const payload = {
        name_ru: derivedName,
        name_en: derivedNameEn,
        description_ru: nextForm.description_ru.trim(),
        description_en: nextForm.description_ru.trim(),
        description_enabled: nextForm.description_enabled && !!nextForm.description_ru.trim(),
        year_range: nextForm.year_range || '2020',
        price_per_account: nextForm.price_per_account,
        stock: nextForm.stock,
        followers: nextForm.followers,
        verification: nextForm.verification,
        badge_ru: t.label.ru,
        badge_en: t.label.en,
        is_active: nextForm.is_active,
        topic_id: primary,
        topic_ids: nextForm.topic_ids,
        account_url: nextForm.account_url.trim() || null,
        smart_followers: isSmart ? nextForm.smart_followers || 0 : null,
        smart_followers_list: [],

        category: effectiveCategory,
        features: [],
      }

      if (isEdit && row) {
        await updateFollowerAccount(row.id, payload)
        show('Сохранено')
      } else {
        await createFollowerAccount(payload)
        show('Карточка создана')
      }
      onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ошибка сохранения'
      show(msg)
    } finally {
      setSaving(false)
    }
  }

  const fillFromX = async () => {
    const handle = normalizeXHandle(form.account_url)
    if (!handle) {
      show('Вставь ссылку или @username X-аккаунта')
      return
    }
    setXLoading(true)
    try {
      const patch = await fetchXPatch(form)
      if (!patch) {
        show('X-аккаунт не найден')
        return
      }
      setForm((prev) => ({ ...prev, ...patch }))
      show(`Подтянул @${patch.userName}`)
    } catch (e) {
      show(e instanceof Error ? e.message : 'Не удалось подтянуть данные из X')
    } finally {
      setXLoading(false)
    }
  }

  const remove = async () => {
    if (!row) return
    setDeleting(true)
    try {
      await deleteFollowerAccount(row.id)
      show('Карточка удалена')
      onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ошибка удаления'
      show(msg)
    } finally {
      setDeleting(false)
    }
  }

  const toggleSold = () => setForm((f) => ({ ...f, stock: f.stock > 0 ? 0 : 1 }))
  const topicList = useMemo(() => TOPIC_ROTATION.map((id) => TOPICS[id]), [])


  const tabs: { id: TabId; label: string }[] = [
    { id: 'main', label: 'Карточка' },
    ...(isSmart ? ([{ id: 'smart' as const, label: 'Smart' }]) : []),
  ]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-end justify-center bg-black/80 sm:items-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 28, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[95vh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[20px] border-x border-t border-border bg-[oklch(0.115_0.004_60)] sm:rounded-[20px] sm:border"
          >
            {/* ── Header ─────────────────────────────── */}
            <header className="shrink-0 border-b border-border">
              <div className="flex items-start gap-3 px-5 pb-4 pt-5">
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-muted-foreground">
                    {isSmart ? 'Smart-аккаунт' : 'Аккаунт с фолловерами'}
                  </p>
                  <h2 className="font-display mt-1.5 truncate text-[19px] font-semibold leading-none tracking-tight text-foreground">
                    {topic ? topic.label.ru : 'Без тематики'}
                  </h2>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="tnum">{fmtK(form.followers || 0)}</span>
                    <Dot />
                    <span className="tnum text-foreground">${form.price_per_account || 0}</span>
                    <Dot />
                    <span className={soldOut ? 'text-destructive' : 'text-success'}>
                      {soldOut ? 'SOLD' : 'LIVE'}
                    </span>
                    {!form.is_active && (
                      <>
                        <Dot />
                        <span>HIDDEN</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="-mr-1.5 -mt-1 flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                  aria-label="Закрыть"
                >
                  <X className="size-4" strokeWidth={2} />
                </button>
              </div>

              {/* Tabs — underline, not pills */}
              <div className="flex px-5">
                {tabs.map((t) => {
                  const active = tab === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      className={`relative pb-2.5 pr-6 text-[13px] font-semibold transition-colors ${
                        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'
                      }`}
                    >
                      {t.label}
                      {t.id === 'smart' && (
                        <span className="tnum ml-1.5 text-primary">{form.smart_followers}</span>
                      )}
                      {active && (
                        <motion.span
                          layoutId="editor-tab"
                          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                          className="absolute -bottom-px left-0 right-6 h-px bg-primary"
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            </header>

            {/* ── Body ───────────────────────────────── */}
            <div className="flex-1 overflow-y-auto">
              {tab === 'main' && (
                <div>
                  <Block
                    index="01"
                    title="Ссылка на X"
                    aside={normalizeXHandle(form.account_url) ? 'данные подтянутся' : 'обязательно'}
                  >
                    <div
                      className={`flex items-center gap-1 rounded-xl border bg-[oklch(0.135_0.004_60)] px-3 transition-colors focus-within:border-primary/70 ${
                        normalizeXHandle(form.account_url) ? 'border-border-strong' : 'border-border'
                      }`}
                    >
                      <span className="shrink-0 select-none text-[15px] text-muted-foreground">
                        x.com/
                      </span>
                      <input
                        className="h-12 min-w-0 flex-1 bg-transparent text-[15px] font-medium text-foreground outline-none placeholder:text-muted-foreground/40"
                        type="text"
                        inputMode="url"
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                        value={
                          normalizeXHandle(form.account_url) ??
                          form.account_url.replace(/^@/, '')
                        }
                        onChange={(e) => {
                          const raw = e.target.value.trim()
                          const handle = normalizeXHandle(raw)
                          setForm({ ...form, account_url: handle ? `x.com/${handle}` : raw })
                        }}
                        placeholder="username"
                      />
                      {normalizeXHandle(form.account_url) && (
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, account_url: '' })}
                          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                          aria-label="Очистить"
                        >
                          <X className="size-4" />
                        </button>
                      )}
                    </div>
                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={fillFromX}
                        disabled={
                          xLoading || saving || deleting || !normalizeXHandle(form.account_url)
                        }
                        className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-primary/60 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
                      >
                        <RefreshCw className={`size-3.5 ${xLoading ? 'animate-spin' : ''}`} />
                        {xLoading ? 'Загружаю…' : 'Подтянуть данные'}
                      </button>
                    </div>

                    {!manualMode ? (
                      <div className="mt-4 space-y-3">
                        <div className="divide-y divide-border/70 border-y border-border/70">
                          <StatRow
                            label="Фолловеры"
                            value={form.followers ? fmtK(form.followers) : '—'}
                          />
                          <StatRow label="Год регистрации" value={form.year_range || '—'} />
                          <StatRow
                            label="Верификация"
                            value={VERIFICATIONS.find((v) => v.id === form.verification)?.label ?? '—'}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setManualMode(true)}
                          className="text-[12px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
                        >
                          Задать вручную
                        </button>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <Field label="Фолловеры">
                            <input
                              className="tnum w-full border-b border-border bg-transparent pb-1.5 text-[15px] text-foreground outline-none focus:border-primary/70"
                              type="number"
                              inputMode="numeric"
                              value={form.followers || ''}
                              onChange={(e) =>
                                setForm({ ...form, followers: Number(e.target.value) || 0 })
                              }
                              placeholder="16500"
                            />
                          </Field>
                          <Field label="Год">
                            <input
                              className="tnum w-full border-b border-border bg-transparent pb-1.5 text-[15px] text-foreground outline-none focus:border-primary/70"
                              type="text"
                              inputMode="numeric"
                              value={form.year_range}
                              onChange={(e) => setForm({ ...form, year_range: e.target.value })}
                              placeholder="2017"
                            />
                          </Field>
                        </div>
                        <div>
                          <span className="mb-2 block text-[12px] text-muted-foreground">
                            Галочка
                          </span>
                          <div className="grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-border bg-border">
                            {VERIFICATIONS.map((v) => {
                              const active = form.verification === v.id
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => setForm({ ...form, verification: v.id })}
                                  className={`flex h-11 items-center justify-center gap-1 text-[12px] font-medium transition-colors ${
                                    active
                                      ? 'bg-[oklch(0.2_0.006_68)]'
                                      : 'bg-[oklch(0.135_0.004_60)] text-muted-foreground hover:bg-[oklch(0.17_0.005_64)]'
                                  }`}
                                  style={active ? { color: v.color } : undefined}
                                >
                                  <BadgeCheck
                                    className="size-3.5"
                                    style={{ color: active ? v.color : 'oklch(0.42 0 0)' }}
                                    fill="currentColor"
                                    strokeWidth={0}
                                  />
                                  {v.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setManualMode(false)}
                          className="text-[12px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
                        >
                          Вернуть автозаполнение
                        </button>
                      </div>
                    )}
                  </Block>

                  <Block index="02" title="Статус">
                    <div className="divide-y divide-border/70 border-y border-border/70">
                      <SwitchRow
                        label="В наличии"
                        hint={soldOut ? 'Карточка помечена как проданная' : 'Доступна к покупке'}
                        on={!soldOut}
                        onToggle={toggleSold}
                      />
                      <SwitchRow
                        label="Показывать в каталоге"
                        hint={form.is_active ? 'Видна покупателям' : 'Скрыта от всех'}
                        on={form.is_active}
                        onToggle={() => setForm({ ...form, is_active: !form.is_active })}
                      />
                    </div>
                  </Block>

                  <Block index="03" title="Цена">
                    <div className="flex items-baseline gap-1 border-b border-border pb-2">
                      <span className="font-display text-[22px] font-semibold text-muted-foreground">
                        $
                      </span>
                      <input
                        className="tnum font-display min-w-0 flex-1 bg-transparent text-[28px] font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/35"
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        value={form.price_per_account || ''}
                        onChange={(e) =>
                          setForm({ ...form, price_per_account: Number(e.target.value) || 0 })
                        }
                        placeholder="0"
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {[50, 100, 250, 500, 1000].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setForm({ ...form, price_per_account: p })}
                          className={`tnum rounded-md border px-2.5 py-1 text-[13px] font-semibold transition-colors ${
                            form.price_per_account === p
                              ? 'border-primary/70 text-primary'
                              : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </Block>

                  <Block
                    index="04"
                    title="Тематики"
                    aside={
                      form.topic_ids.length > 0
                        ? `основная — ${TOPICS[form.topic_ids[0]].label.ru.toLowerCase()}`
                        : 'не выбрано'
                    }
                  >
                    <div className="grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-border bg-border">
                      {topicList.map((t) => {
                        const idx = form.topic_ids.indexOf(t.id)
                        const active = idx >= 0
                        const isPrimary = idx === 0
                        const toggle = () =>
                          setForm((prev) => {
                            const next = prev.topic_ids.filter((x) => x !== t.id)
                            if (!active) next.push(t.id)
                            return { ...prev, topic_ids: next }
                          })
                        const promote = (e: React.MouseEvent) => {
                          e.stopPropagation()
                          setForm((prev) => ({
                            ...prev,
                            topic_ids: [t.id, ...prev.topic_ids.filter((x) => x !== t.id)],
                          }))
                        }
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={toggle}
                            className={`relative flex flex-col items-center gap-1.5 px-1 py-2.5 text-[12px] font-medium leading-none transition-colors ${
                              active
                                ? 'bg-[oklch(0.2_0.006_68)] text-foreground'
                                : 'bg-[oklch(0.135_0.004_60)] text-muted-foreground hover:bg-[oklch(0.17_0.005_64)]'
                            }`}
                          >
                            <t.Icon
                              className="size-4"
                              strokeWidth={2}
                              style={{ color: active ? t.accent : undefined }}
                            />
                            <span className="w-full truncate text-center">{t.label.ru}</span>
                            {active && (
                              <span
                                onClick={isPrimary ? undefined : promote}
                                role={isPrimary ? undefined : 'button'}
                                aria-label={isPrimary ? 'Основная' : 'Сделать основной'}
                                className="absolute right-1 top-1 flex size-3.5 items-center justify-center rounded-[3px]"
                                style={{
                                  background: isPrimary ? t.accent : 'transparent',
                                  border: isPrimary ? 'none' : `1px solid ${t.accent}`,
                                  color: isPrimary ? 'oklch(0.14 0 0)' : t.accent,
                                }}
                              >
                                {isPrimary ? (
                                  <Star className="size-2" strokeWidth={3} fill="currentColor" />
                                ) : (
                                  <Check className="size-2" strokeWidth={4} />
                                )}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </Block>

                  <Block
                    index="05"
                    title="Описание"
                    aside={form.description_enabled ? 'показывается в карточке' : 'выключено'}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, description_enabled: !f.description_enabled }))
                      }
                      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                        form.description_enabled
                          ? 'border-primary/60 bg-primary/[0.07]'
                          : 'border-border bg-[oklch(0.135_0.004_60)] hover:border-border-strong'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold text-foreground">
                          Показывать блок «Описание»
                        </span>
                        <span className="mt-0.5 block text-[11.5px] leading-snug text-muted-foreground">
                          Отдельная кнопка на странице аккаунта с твоим текстом
                        </span>
                      </span>
                      <span
                        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                          form.description_enabled ? 'bg-primary' : 'bg-border-strong'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${
                            form.description_enabled ? 'left-[1.375rem]' : 'left-0.5'
                          }`}
                        />
                      </span>
                    </button>

                    {form.description_enabled && (
                      <div className="mt-3">
                        <textarea
                          rows={6}
                          value={form.description_ru}
                          onChange={(e) =>
                            setForm({ ...form, description_ru: e.target.value.slice(0, 1200) })
                          }
                          placeholder={
                            'Особенности аккаунта, чем крут, история, аудитория…\n\nКаждая строка — отдельный абзац.'
                          }
                          className="w-full resize-none rounded-xl border border-border bg-[oklch(0.135_0.004_60)] px-3.5 py-3 text-[14px] leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary/70"
                        />
                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Строка «— пункт» станет списком</span>
                          <span className="tnum">{form.description_ru.length}/1200</span>
                        </div>
                      </div>
                    )}
                  </Block>

                  {isEdit && (
                    <Block index="06" title="Опасная зона">
                      <button
                        type="button"
                        onClick={() => (confirmDelete ? remove() : setConfirmDelete(true))}
                        disabled={deleting || saving}
                        className={`flex h-11 w-full items-center justify-center gap-2 rounded-lg border text-[13px] font-semibold transition-colors disabled:opacity-50 ${
                          confirmDelete
                            ? 'border-destructive bg-destructive text-destructive-foreground'
                            : 'border-destructive/40 text-destructive hover:bg-destructive/10'
                        }`}
                      >
                        {deleting ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                        {confirmDelete ? 'Подтвердить удаление' : 'Удалить карточку'}
                      </button>
                    </Block>
                  )}
                </div>
              )}

              {tab === 'smart' && isSmart && (
                <div>
                  <Block
                    index="01"
                    title="Умные подписчики"
                    aside="число в карточке"
                  >
                    <div className="flex items-baseline gap-2 border-b border-border pb-2">
                      <input
                        className="tnum font-display min-w-0 flex-1 bg-transparent text-[32px] font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/35"
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={form.smart_followers || ''}
                        onChange={(e) =>
                          setForm({ ...form, smart_followers: Math.max(0, Number(e.target.value) || 0) })
                        }
                        placeholder="0"
                      />
                      <span className="text-[13px] text-muted-foreground">шт.</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {[1, 2, 3, 5, 10, 25, 50].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setForm({ ...form, smart_followers: n })}
                          className={`tnum rounded-md border px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                            form.smart_followers === n
                              ? 'border-primary/70 text-primary'
                              : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <p className="mt-3 text-[12px] leading-snug text-muted-foreground">
                      В карточке покупатель видит только количество умных подписчиков — аватарки и
                      имена не нужны.
                    </p>
                  </Block>
                </div>
              )}


            </div>

            {/* ── Footer ─────────────────────────────── */}
            <footer className="shrink-0 border-t border-border bg-[oklch(0.1_0.004_60)] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              {issues.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTab(issues[0].tab)}
                  className="mb-2.5 flex w-full items-center gap-1.5 text-left text-[12px]  text-destructive"
                >
                  <AlertCircle className="size-3.5 shrink-0" />
                  {issues[0].text}
                </button>
              )}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-12 flex-1 rounded-lg border border-border text-[13px] font-semibold  text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving || deleting}
                  className="flex h-12 flex-[1.6] items-center justify-center gap-2 rounded-lg bg-primary text-[13px] font-semibold  text-primary-foreground transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-50"
                >
                  {saving && <Loader2 className="size-3.5 animate-spin" />}
                  {isEdit ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Dot() {
  return <span className="size-[3px] rounded-full bg-border-strong" aria-hidden />
}

function Block({
  index,
  title,
  aside,
  children,
}: {
  index: string
  title: string
  aside?: string
  children: React.ReactNode
}) {
  return (
    <section className="border-b border-border px-5 py-5 last:border-b-0">
      <div className="mb-3.5 flex items-baseline gap-2.5">
        <span className="tnum text-[11px] font-semibold text-primary/60">{index}</span>
        <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        {aside && (
          <span className="ml-auto truncate text-[12px] tracking-[0.06em] text-muted-foreground">
            {aside}
          </span>
        )}
      </div>
      {children}
    </section>
  )
}

function SwitchRow({
  label,
  hint,
  on,
  onToggle,
}: {
  label: string
  hint: string
  on: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      className="flex w-full items-center gap-3 py-3 text-left"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium leading-tight text-foreground">{label}</p>
        <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{hint}</p>
      </div>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          on ? 'bg-primary' : 'bg-secondary'
        }`}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 600, damping: 38 }}
          className={`absolute top-0.5 size-5 rounded-full ${
            on ? 'right-0.5 bg-primary-foreground' : 'left-0.5 bg-muted-foreground'
          }`}
        />
      </span>
    </button>
  )
}

function IconBtn({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex size-8 items-center justify-center rounded-md transition-colors disabled:opacity-25 ${
        danger
          ? 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
          : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-[13.5px] text-muted-foreground">{label}</span>
      <span className="tnum text-[14px] font-semibold text-foreground">{value}</span>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[12px]  text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  )
}

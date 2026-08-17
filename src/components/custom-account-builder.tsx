'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { ArrowRight, Check, ChevronDown, Pencil, X } from 'lucide-react'

import { useI18n } from '@/lib/i18n'
import { useStore } from '@/lib/store'
import { useNav } from '@/lib/nav'
import { useToast } from './toast'
import { BoostUnavailableSheet } from './boost-unavailable-sheet'
import {
  ProfileControlPanel,
  XProfilePreview,
  T as PANEL_T,
  type ProfileDraft,
} from './custom-account-profile-editor'
import { getBoostStatuses } from '@/lib/boost-status.functions'
import {
  AUDIENCES,
  BASE_TIERS,
  CUSTOM_MIN,
  EXTRAS,
  customLang,
  fmtFollowers,
  followingLabel,
  postCountLabel,
  tierForYear,
  quoteCustomAccount,
  type Audience,
  type BaseTier,
  type ExtraId,
} from '@/lib/custom-account'


const COPY = {
  ru: {
    eyebrow: 'CUSTOM',
    title: 'Аккаунт под ключ',
    lead: 'Год регистрации, аудитория и оформление — собираем под твою задачу.',
    subtitle: 'Вы выбираете год регистрации, юзер, ник, кол-во фолловеров..',
    cta: 'Собрать',
    from: 'от',
    down: 'Провайдер на паузе',
    downLead: 'Кастомные аккаунты временно недоступны — нажми, чтобы получить уведомление.',
    sheetTitle: 'Аккаунт под ключ',
    sheetSub: 'Собери конфигурацию — покажем цену и срок',
    stepBase: 'База аккаунта',
    stepAudience: 'Аудитория',
    stepFollowers: 'Фолловеры',
    stepExtras: 'Дополнительно',
    total: 'Итого',
    add: 'В корзину',
    save: 'Сохранить изменения',
    eta: 'Готово за',
    days: 'дн.',
    discount: 'Скидка за объём',
    base: 'Аккаунт',
    followers: 'фолловеров',
    unavailableAudience: 'на паузе',
    added: 'Аккаунт под ключ добавлен в корзину',
    year: 'Регистрация',
    perDay: 'в день',
    stepProfile: 'Профиль в X',
    profileHint: 'Нажимай на элементы — меняй ник, юзер, аватар, галочку и цифры',
    fillFirst: 'Сначала заполни:',
    confirmTitle: 'Проверь данные',
    confirmSub: 'Так аккаунт будет собран. Всё верно?',
    confirmEdit: 'Изменить',
    confirmOk: 'Всё верно — в корзину',
    fName: 'Никнейм',
    fHandle: 'Юзернейм',
    fBio: 'Описание',
    fMedia: 'Аватар / баннер',
    fYear: 'Год регистрации',
    fFollowers: 'Фолловеры',
    fFollowing: 'Подписки',
    fPosts: 'Посты',
    fVerified: 'Верификация',
    yes: 'Да',
    no: 'Нет',
    uploaded: 'Загружено',
    none: '—',
  },
  en: {
    eyebrow: 'CUSTOM',
    title: 'Custom account',
    lead: 'Year, audience, branding and add-ons — built for your goal.',
    subtitle: 'You pick the registration year, username, handle, follower count..',
    cta: 'Build',
    from: 'from',
    down: 'Provider paused',
    downLead: 'Custom accounts are temporarily unavailable — tap to get notified.',
    sheetTitle: 'Custom account',
    sheetSub: 'Configure it — we show price and ETA',
    stepBase: 'Account base',
    stepAudience: 'Audience',
    stepFollowers: 'Followers',
    stepExtras: 'Add-ons',
    total: 'Total',
    add: 'Add to cart',
    save: 'Save changes',
    eta: 'Ready in',
    days: 'd',
    discount: 'Volume discount',
    base: 'Account',
    followers: 'followers',
    unavailableAudience: 'paused',
    added: 'Custom account added to cart',
    year: 'Registered',
    perDay: 'per day',
    stepProfile: 'X profile',
    profileHint: 'Tap the elements to change name, handle, avatar, badge and counts',
    fillFirst: 'Fill in first:',
    confirmTitle: 'Check the details',
    confirmSub: 'This is how the account will be built. All correct?',
    confirmEdit: 'Edit',
    confirmOk: 'Confirm — add to cart',
    fName: 'Display name',
    fHandle: 'Username',
    fBio: 'Bio',
    fMedia: 'Avatar / banner',
    fYear: 'Registration year',
    fFollowers: 'Followers',
    fFollowing: 'Following',
    fPosts: 'Posts',
    fVerified: 'Verification',
    yes: 'Yes',
    no: 'No',
    uploaded: 'Uploaded',
    none: '—',
  },
} as const

function SlidersIcon() {
  const rows = [
    { y: 6, cls: 'knob-a' },
    { y: 12, cls: 'knob-b' },
    { y: 18, cls: 'knob-c' },
  ]
  return (
    <div className="slider-icon relative size-10 shrink-0 overflow-hidden rounded-xl border border-info/30 bg-info/10 text-info group-hover:border-info group-hover:bg-info/15 group-hover:shadow-lg group-hover:shadow-info/20">
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="relative size-full p-1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      >
        {rows.map((r) => (
          <g key={r.y}>
            <line x1={3} y1={r.y} x2={21} y2={r.y} className="opacity-20" />
            <line
              x1={3}
              y1={r.y}
              x2={21}
              y2={r.y}
              pathLength={1}
              className={`slider-fill ${r.cls} opacity-70`}
            />
            <circle
              cx={0}
              cy={r.y}
              r={2.6}
              fill="currentColor"
              stroke="none"
              className={`slider-knob ${r.cls}`}
            />
          </g>
        ))}
      </svg>
    </div>
  )
}

export function CustomAccountBanner() {

  const { lang } = useI18n()
  const L = COPY[customLang(lang)]
  const [open, setOpen] = useState(false)
  const [notifyOpen, setNotifyOpen] = useState(false)
  const [notifyRegion, setNotifyRegion] = useState<'_all' | 'global' | 'jp' | 'kr' | 'us'>('_all')

  const getStatuses = useServerFn(getBoostStatuses)
  const statusQ = useQuery({
    queryKey: ['boost-statuses'],
    queryFn: () => getStatuses(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  const statusMap = useMemo(() => {
    const m: Record<string, boolean> = {}
    for (const s of statusQ.data?.statuses ?? []) {
      const key = s.region === '_all' ? s.subcategory_id : `${s.subcategory_id}:${s.region}`
      m[key] = s.is_available
    }
    return m
  }, [statusQ.data])

  const isAudienceUp = (a: Audience) =>
    statusMap['followers'] !== false && statusMap[`followers:${a.region}`] !== false
  const serviceUp = statusMap['followers'] !== false && AUDIENCES.some(isAudienceUp)

  const minPrice = useMemo(() => {
    const cheapest = AUDIENCES.reduce((a, b) => (a.pricePer1000 <= b.pricePer1000 ? a : b))
    return (
      BASE_TIERS[0].price + quoteCustomAccount({
        followers: CUSTOM_MIN,
        audience: cheapest,
        base: BASE_TIERS[0],
        extras: [],
      }).followersPrice
    )
  }, [])

  return (
    <>
      <motion.button
        type="button"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        whileTap={{ scale: 0.99 }}
        onClick={() => (serviceUp ? setOpen(true) : setNotifyOpen(true))}
        className="group relative mb-4 flex w-full items-center justify-between overflow-hidden rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-all duration-300 hover:border-info/50"
      >
        {/* kinetic background accent */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        >
          <span className="absolute -top-1/2 right-0 h-[200%] w-32 -skew-x-12 bg-info/10" />
        </span>

        {/* left: icon + text */}
        <div className="relative flex items-center gap-2.5">
          {/* custom icon */}
          <SlidersIcon />

          <div className="flex flex-col">
            <span className="inline-flex w-fit items-center rounded bg-info px-1 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary-foreground">
              {L.eyebrow}
            </span>
            <h3 className="mt-0.5 text-base font-extrabold uppercase leading-none tracking-tight text-foreground">
              {L.title}
            </h3>
            <p className="mt-0.5 text-[10px] font-normal leading-snug tracking-normal text-muted-foreground">
              {serviceUp ? L.subtitle : L.down}
            </p>
          </div>
        </div>

        {/* right: price + arrow */}
        <div className="relative flex items-center gap-2.5">
          <div className="text-right">
            <span className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              {L.from}
            </span>
            <span className="tnum mt-0.5 block text-base font-bold leading-none text-foreground">
              ${minPrice.toFixed(0)}
            </span>
          </div>
          <span className="grid size-7 place-items-center rounded-full border border-info/30 text-info transition-colors duration-300 group-hover:border-info group-hover:bg-info group-hover:text-primary-foreground">
            <ArrowRight className="size-3.5" strokeWidth={2.5} />
          </span>
        </div>

        {/* bottom accent line */}
        <span
          aria-hidden
          className="absolute bottom-0 left-0 h-[2px] w-0 bg-info transition-all duration-500 ease-out group-hover:w-full"
        />
      </motion.button>










      <CustomAccountSheet
        open={open}
        onClose={() => setOpen(false)}
        isAudienceUp={isAudienceUp}
        onAudienceDown={(a) => {
          setNotifyRegion(a ? a.region : '_all')
          setNotifyOpen(true)
        }}
      />

      <BoostUnavailableSheet
        open={notifyOpen}
        onOpenChange={setNotifyOpen}
        subcategory="followers"
        region={notifyRegion}
        subcategoryLabel={L.sheetTitle}
      />
    </>
  )
}

export function CustomAccountSheet({
  open,
  onClose,
  isAudienceUp,
  onAudienceDown,
  editKey,
}: {
  open: boolean
  onClose: () => void
  isAudienceUp: (a: Audience) => boolean
  onAudienceDown: (a: Audience | null) => void
  editKey?: string
}) {
  const { lang } = useI18n()
  const cl = customLang(lang)
  const L = COPY[cl]
  const PL = PANEL_T[cl]
  const { addToCart, cart, setEditingCustomKey } = useStore()
  const { go } = useNav()
  const { show } = useToast()
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const editItem = useMemo(() => cart.find((i) => i.key === editKey), [cart, editKey])

  const [year, setYear] = useState('2021')
  const [audienceId, setAudienceId] = useState<Audience['id']>('global')
  const [openId, setOpenId] = useState<string | null>(null)
  const [visited, setVisited] = useState<string[]>([])
  const [chosen, setChosen] = useState<string[]>([])
  const [confirming, setConfirming] = useState(false)
  const [draft, setDraft] = useState<ProfileDraft>({
    name: '',
    handle: '',
    bio: '',
    avatar: null,
    banner: null,
    verified: false,
    followingRange: '30-50',
    postsRange: '0-50',
    followers: 5000,
  })

  useEffect(() => {
    if (!editItem || !editItem.meta) return
    const m = editItem.meta
    const nextAudience = AUDIENCES.find((a) => a.id === m.audience) ?? AUDIENCES[0]
    setYear(m.year || '2021')
    setAudienceId(nextAudience.id)
    setDraft({
      name: m.profile_name || '',
      handle: m.profile_handle?.replace(/^@/, '') || '',
      bio: m.profile_bio || '',
      avatar: m.profile_avatar_url || null,
      banner: m.profile_banner_url || null,
      verified: m.profile_verified === 'yes',
      followingRange: (m.profile_following as ProfileDraft['followingRange']) || '30-50',
      postsRange: (m.profile_posts as ProfileDraft['postsRange']) || '0-50',
      followers: Number(m.followers) || 5000,
    })
    setVisited(['ctl-name', 'ctl-handle', 'ctl-year', 'ctl-followers', 'ctl-following', 'ctl-posts'])
    setChosen(['ctl-name', 'ctl-handle', 'ctl-year', 'ctl-followers', 'ctl-following', 'ctl-posts'])
  }, [editItem])

  const base: BaseTier = tierForYear(year)
  const audience = AUDIENCES.find((a) => a.id === audienceId) ?? AUDIENCES[0]
  const extras: ExtraId[] = draft.verified ? ['verified'] : []
  const quote = quoteCustomAccount({ followers: draft.followers, audience, base, extras })

  const picked = (id: string) => chosen.includes(id)
  const missingSteps: { id: string; label: string }[] = [
    !draft.name && { id: 'ctl-name', label: PL.name },
    !draft.handle && { id: 'ctl-handle', label: PL.handle },
    draft.verified && (!draft.avatar || !draft.banner) && { id: 'ctl-media', label: PL.media },
    !picked('ctl-year') && { id: 'ctl-year', label: PL.year },
    !picked('ctl-followers') && { id: 'ctl-followers', label: PL.followers },
    !picked('ctl-following') && { id: 'ctl-following', label: PL.following },
    !picked('ctl-posts') && { id: 'ctl-posts', label: PL.postsCount },
  ].filter(Boolean) as { id: string; label: string }[]
  const missing = missingSteps.map((m) => m.label)
  const blocked = missingSteps.length > 0

  const patch = (p: Partial<ProfileDraft>) => setDraft((d) => ({ ...d, ...p }))

  // цена появляется только после того, как покупатель сам выбрал год, фолловеров и регион
  const priceReady = picked('ctl-year') && picked('ctl-followers')

  const jump = (id: string) => {
    setOpenId(id)
    const el = scrollRef.current?.querySelector(`#${id}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const input = el?.querySelector('input, textarea') as HTMLElement | null
    if (input && !(input as HTMLInputElement).type?.match(/file|range/)) {
      setTimeout(() => input.focus({ preventScroll: true }), 320)
    }
  }

  const check = () => {
    if (!isAudienceUp(audience)) {
      onAudienceDown(audience)
      return
    }
    if (missingSteps.length > 0) {
      show(`${L.fillFirst} ${missing.join(', ')}`, { variant: 'error' })
      jump(missingSteps[0].id)
      return
    }
    setConfirming(true)
  }

  const add = () => {
    const extraLabels = EXTRAS.filter((e) => extras.includes(e.id)).map((e) => e.label[cl])
    addToCart({
      key: editItem?.key ?? `custom_acc-${Date.now()}`,
      kind: 'account',
      refId: 'custom_account',
      title: `${L.sheetTitle} · ${fmtFollowers(draft.followers)}`,
      subtitle: `${year} · ${audience.label[cl]}${extraLabels.length ? ` · ${extraLabels.join(', ')}` : ''}`,
      qty: 1,
      unitPrice: quote.total,
      total: quote.total,
      meta: {
        followers: String(draft.followers),
        audience: audience.id,
        base: base.id,
        year,
        extras: extras.join(',') || '—',
        eta: `${quote.etaDays}`,
        profile_name: draft.name || '—',
        profile_handle: draft.handle ? `@${draft.handle}` : '—',
        profile_bio: draft.bio || '',
        profile_following: followingLabel(draft.followingRange),
        profile_posts: postCountLabel(draft.postsRange),
        profile_following_range: draft.followingRange,
        profile_posts_range: draft.postsRange,
        profile_verified: draft.verified ? 'yes' : 'no',
        profile_avatar: draft.avatar ? 'uploaded' : '—',
        profile_banner: draft.banner ? 'uploaded' : '—',
        profile_avatar_url: draft.avatar || '',
        profile_banner_url: draft.banner || '',
      },
    })
    show(editItem ? 'Изменения сохранены' : L.added)
    setConfirming(false)
    onClose()
    setEditingCustomKey(null)
    go('cart')
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-stretch justify-center bg-[oklch(0.115_0.004_60)] sm:items-center sm:bg-black/80"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 28, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex h-full w-full max-w-[430px] flex-col overflow-hidden border-border bg-[oklch(0.115_0.004_60)] sm:h-auto sm:max-h-[94vh] sm:rounded-[20px] sm:border"
          >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
              <div className="min-w-0 flex-1">
                <span className="block text-[9px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                  {L.eyebrow}
                </span>
                <h2 className="font-display mt-1.5 text-[22px] font-bold uppercase leading-[0.95] tracking-[-0.02em] text-foreground">
                  {L.sheetTitle}
                </h2>
                <p className="mt-1.5 max-w-[260px] text-[11px] leading-snug text-muted-foreground">
                  {L.sheetSub}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="-mr-1.5 -mt-1 flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
              >
                <X className="size-4" strokeWidth={2} />
              </button>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto">
              <XProfilePreview value={draft} cl={cl} year={year} onJump={jump} chosen={chosen} />
              <ProfileControlPanel
                value={draft}
                onChange={patch}
                cl={cl}
                year={year}
                onYear={setYear}
                audience={audience}
                onAudience={(a) => setAudienceId(a.id)}
                isAudienceUp={isAudienceUp}
                onAudienceDown={onAudienceDown}
                missing={missing}
                openId={openId}
                onOpenId={setOpenId}
                visited={visited}
                onVisit={(id) => setVisited((v) => (v.includes(id) ? v : [...v, id]))}
                chosen={chosen}
                onChoose={(id) => setChosen((c) => (c.includes(id) ? c : [...c, id]))}
              />
            </div>

            <footer className="shrink-0 border-t border-border bg-[oklch(0.1_0.004_60)] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3.5">
              <div className="mb-3 flex items-baseline justify-between">
                <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {L.total}
                  {priceReady && (
                  <span className="ml-2.5 normal-case tracking-normal text-[11px] text-muted-foreground/70">
                    {L.eta} {quote.etaDays} {L.days}
                  </span>
                  )}
                </span>
                <motion.span
                  key={priceReady ? quote.total.toFixed(2) : 'idle'}
                  initial={{ y: -6, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className={`tnum font-display text-[24px] font-light tracking-[-0.02em] ${priceReady ? 'text-foreground' : 'text-muted-foreground/40'}`}
                >
                  {priceReady ? `$${quote.total.toFixed(2)}` : '—'}
                </motion.span>
              </div>
              <motion.button
                type="button"
                onClick={check}
                whileTap={{ scale: 0.99 }}
                className={`group flex h-[52px] w-full items-center justify-center gap-2.5 rounded-[4px] bg-primary text-[12px] font-bold uppercase tracking-[0.18em] text-primary-foreground transition-all hover:brightness-[1.06] ${
                  blocked ? 'opacity-45' : ''
                }`}
              >
                {editItem ? L.save : L.add}
                <ArrowRight
                  className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                  strokeWidth={2.2}
                />
              </motion.button>
            </footer>

            <ConfirmSheet
              open={confirming}
              onClose={() => setConfirming(false)}
              onConfirm={add}
              draft={draft}
              cl={cl}
              year={year}
              audience={audience}
              chosen={chosen}
              total={quote.total}
              eta={quote.etaDays}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ------------------------------------------------------------------- faq */

/* --- custom line icons (drawn for this block, no generic library glyphs) --- */

type FaqIconId =
  | 'hourglass'
  | 'crowd'
  | 'dice'
  | 'imprint'
  | 'refill'
  | 'verified'
  | 'vault'

function FaqIcon({ id, className }: { id: FaqIconId; className?: string }) {
  const common = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (id) {
    case 'hourglass':
      return (
        <svg {...common}>
          <path d="M7.4 3.4h9.2M7.4 20.6h9.2" />
          <path d="M8.6 3.4v2.7c0 2 1.4 3.3 3.4 5.9 2-2.6 3.4-3.9 3.4-5.9V3.4" opacity="0.55" />
          <path d="M8.6 20.6v-2.7c0-2 1.4-3.3 3.4-5.9 2 2.6 3.4 3.9 3.4 5.9v2.7" />
          <path d="M10.3 17.9h3.4" opacity="0.5" />
          <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" opacity="0.8" />
        </svg>
      )
    case 'crowd':
      return (
        <svg {...common}>
          <circle cx="9" cy="8.6" r="2.9" />
          <path d="M3.8 19.2c.4-3 2.6-4.8 5.2-4.8s4.8 1.8 5.2 4.8" />
          <path d="M15.4 6.4a2.9 2.9 0 0 1 0 5.6" opacity="0.55" />
          <path d="M17 14.9c1.7.6 2.9 2.2 3.2 4.3" opacity="0.55" />
          <path d="M18.4 4.4v3.2M16.8 6h3.2" opacity="0.8" />
        </svg>
      )
    case 'dice':
      return (
        <svg {...common}>
          <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="4.4" opacity="0.45" />
          <circle cx="8.4" cy="8.4" r="1.25" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" opacity="0.7" />
          <circle cx="15.6" cy="15.6" r="1.25" fill="currentColor" stroke="none" />
          <path d="M6.6 17.4h2.6M14.8 6.6h2.6" opacity="0.5" />
        </svg>
      )
    case 'imprint':
      return (
        <svg {...common}>
          <path d="M4.2 6.6a3.6 3.6 0 0 1 6.2-2.5" opacity="0.45" />
          <rect x="3.2" y="8.4" width="8.4" height="12.2" rx="2.6" opacity="0.45" />
          <path d="M6 12.2h2.8M6 15.4h2.8" opacity="0.6" />
          <circle cx="17.2" cy="8.6" r="2.9" />
          <path d="M12.6 20.6c.3-2.9 2.2-4.7 4.6-4.7s4.3 1.8 4.6 4.7" />
          <path d="M11.9 12.4h1.9" opacity="0.7" />
          <path d="M12.9 11.4l1 1-1 1" opacity="0.7" />
        </svg>
      )
    case 'refill':
      return (
        <svg {...common}>
          <path d="M12 3.6 5.8 6v5.4c0 3.9 2.6 7 6.2 8.7 3.6-1.7 6.2-4.8 6.2-8.7V6L12 3.6Z" opacity="0.5" />
          <path d="M14.9 11.1a3 3 0 1 0-.5 2.9" />
          <path d="M15.4 8.9v2.3h-2.3" />
        </svg>
      )
    case 'verified':
      return (
        <svg {...common}>
          <path
            d="M12 3.4c1 0 1.9.5 2.5 1.3.9-.3 2-.1 2.7.6.7.7.9 1.8.6 2.7.8.6 1.3 1.5 1.3 2.5s-.5 1.9-1.3 2.5c.3.9.1 2-.6 2.7-.7.7-1.8.9-2.7.6-.6.8-1.5 1.3-2.5 1.3s-1.9-.5-2.5-1.3c-.9.3-2 .1-2.7-.6-.7-.7-.9-1.8-.6-2.7-.8-.6-1.3-1.5-1.3-2.5s.5-1.9 1.3-2.5c-.3-.9-.1-2 .6-2.7.7-.7 1.8-.9 2.7-.6.6-.8 1.5-1.3 2.5-1.3Z"
            opacity="0.55"
          />
          <path d="M9.6 10.6 11.4 12.4l3.2-3.4" />
          <path d="M8.9 18.4v3.1l3.1-1.6 3.1 1.6v-3.1" opacity="0.6" />
        </svg>
      )
    case 'vault':
      return (
        <svg {...common}>
          <rect x="3.4" y="3.6" width="17.2" height="16.8" rx="3.4" opacity="0.45" />
          <circle cx="12" cy="12" r="4.3" />
          <path d="M12 7.7v1.6M12 14.7v1.6M7.7 12h1.6M14.7 12h1.6" opacity="0.75" />
          <path d="M6.4 20.4v1.1M17.6 20.4v1.1" opacity="0.5" />
        </svg>
      )
  }
}

/* --- inline text formatting helpers --- */

function Em({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-primary">{children}</span>
}
function Strong({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-foreground">{children}</span>
}
function Mono({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-[5px] border border-primary/25 bg-primary/10 px-1.5 py-[1px] font-mono text-[11.5px] font-medium text-primary">
      {children}
    </span>
  )
}
function Und({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-medium text-foreground/90 underline decoration-primary/60 decoration-dotted underline-offset-[3px]">
      {children}
    </span>
  )
}
function Strike({ children }: { children: React.ReactNode }) {
  return <span className="text-muted-foreground/60 line-through">{children}</span>
}
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <span className="mt-2.5 block rounded-[10px] border border-primary/25 bg-primary/[0.07] px-3 py-2 text-[12px] leading-[1.55] text-foreground/85">
      {children}
    </span>
  )
}

type FaqItem = { icon: FaqIconId; q: string; a: React.ReactNode; badge: string }

function buildFaq(
  cl: 'ru' | 'en',
  draft: ProfileDraft,
  audience: Audience,
  year: string,
): { eyebrow: string; title: string; lead: string; items: FaqItem[] } {
  const followers = draft.followers.toLocaleString('en-US')
  const following = followingLabel(draft.followingRange)
  const posts = postCountLabel(draft.postsRange)

  if (cl === 'en') {
    return {
      eyebrow: 'BEFORE YOU CONFIRM',
      title: 'What you need to know',
      lead: 'Short answers to every question about this build.',
      items: [
        {
          icon: 'hourglass',
          q: 'When will the account be ready?',
          a: (
            <>
              Delivery takes <Em>30 minutes to 24 hours</Em> after payment, with an average of{' '}
              <Mono>~45 min</Mono>. Verified builds take slightly longer. Status is always visible in{' '}
              <Und>Profile → Order history</Und>.
            </>
          ),
          badge: '~45 MIN',
        },
        {
          icon: 'crowd',
          q: 'Will the follower count be exact?',
          a: (
            <>
              You ordered <Mono>{followers}</Mono> followers ({audience.label.en}). The final number
              can land <Em>a few dozen above or below</Em> that figure — that is normal for any
              follower service and <Strike>is not a shortfall</Strike>. It never drifts further than
              that.
            </>
          ),
          badge: `${followers} +/- FEW DOZEN`,
        },
        {
          icon: 'dice',
          q: 'How are following and posts picked?',
          a: (
            <>
              You picked following <Mono>{following}</Mono> and posts <Mono>{posts}</Mono>. The exact
              value is <Em>random inside that range</Em> and never leaves it. Numbers in the preview
              above are <Und>just a generated example</Und>.
            </>
          ),
          badge: 'RANDOM IN RANGE',
        },
        {
          icon: 'imprint',
          q: 'Everything you filled in goes onto the real account',
          a: (
            <>
              Name, <Mono>@username</Mono>, bio, avatar, banner and registration year (
              <Mono>{year}</Mono>) are applied to the delivered account <Em>exactly 1:1</Em>.
              <Tip>
                <Strong>Tip:</Strong> check from another account whether your{' '}
                <Mono>@username</Mono> is free before ordering — if it is taken we have to contact
                you and that costs time.
              </Tip>
            </>
          ),
          badge: 'APPLIED 1:1',
        },
        {
          icon: 'refill',
          q: 'Followers guarantee and refill',
          a: (
            <>
              Followers are covered for <Em>2 days</Em>. Within <Mono>48 h</Mono> you can request a
              refill up to <Em>4 times</Em>, once every <Mono>12 h</Mono>.
            </>
          ),
          badge: '2 DAYS / 4 REFILLS',
        },
        {
          icon: 'verified',
          q: 'How does verification work?',
          a: (
            <>
              The checkmark is bought <Em>on the delivery day</Em> and lasts exactly{' '}
              <Mono>30 days</Mono>. Renewal after that is on you. It requires a filled avatar,
              banner, name and username — <Und>an X requirement, not ours</Und>.
            </>
          ),
          badge: '30 DAYS',
        },
        {
          icon: 'vault',
          q: 'How do I keep the account safe?',
          a: (
            <>
              Right after delivery: <Strong>change the password</Strong>, attach your own email,
              enable <Em>2FA</Em> and avoid logging in from many devices at once. The full guide is
              in <Und>Profile → Order history → this order → Security guide</Und>.
            </>
          ),
          badge: 'GUIDE IN ORDER',
        },
      ],
    }
  }

  return {
    eyebrow: 'ПЕРЕД ПОДТВЕРЖДЕНИЕМ',
    title: 'Что нужно знать',
    lead: 'Короткие ответы на все вопросы по этой сборке.',
    items: [
      {
        icon: 'hourglass',
        q: 'Когда будет готов аккаунт?',
        a: (
          <>
            Выдача занимает <Em>от 30 минут до 24 часов</Em> после оплаты, в среднем{' '}
            <Mono>~45 мин</Mono>. Сборки с верификацией готовятся чуть дольше. Статус всегда виден в{' '}
            <Und>Профиль → История заказов</Und>.
          </>
        ),
        badge: '~45 МИН',
      },
      {
        icon: 'crowd',
        q: 'Количество фолловеров будет точным?',
        a: (
          <>
            Вы заказали <Mono>{followers}</Mono> фолловеров ({audience.label.ru}). Итог может
            отличаться на <Em>несколько десятков</Em> в плюс или в минус — это нормальная
            погрешность накрутки и <Strike>не считается недоливом</Strike>. Сильнее этого мы не
            расходимся.
          </>
        ),
        badge: `${followers} ± НЕСКОЛЬКО ДЕСЯТКОВ`,
      },
      {
        icon: 'dice',
        q: 'Как выбираются подписки и посты?',
        a: (
          <>
            Вы выбрали подписки <Mono>{following}</Mono> и посты <Mono>{posts}</Mono>. Точное число
            подбирается <Em>случайно внутри диапазона</Em> и за его пределы не выходит. Числа в
            предпросмотре выше — <Und>просто сгенерированный пример</Und>.
          </>
        ),
        badge: 'РАНДОМ В ДИАПАЗОНЕ',
      },
      {
        icon: 'imprint',
        q: 'Всё, что вы заполнили, будет на аккаунте',
        a: (
          <>
            Никнейм, <Mono>@юзернейм</Mono>, описание, аватар, баннер и год регистрации (
            <Mono>{year}</Mono>) переносятся в выданный аккаунт <Em>ровно 1:1</Em>.
            <Tip>
              <Strong>Совет:</Strong> заранее проверьте с другого аккаунта, свободен ли ваш{' '}
              <Mono>@юзернейм</Mono>. Если он занят, нам придётся связываться с вами — а это лишнее
              время до выдачи.
            </Tip>
          </>
        ),
        badge: 'ПЕРЕНОС 1:1',
      },
      {
        icon: 'refill',
        q: 'Гарантия на фолловеров и рефилл',
        a: (
          <>
            На фолловеров действует гарантия <Em>2 дня</Em>. В течение <Mono>48 ч</Mono> можно
            запросить рефилл — до <Em>4 раз</Em>, не чаще одного раза в <Mono>12 ч</Mono>.
          </>
        ),
        badge: '2 ДНЯ / 4 РЕФИЛЛА',
      },
      {
        icon: 'verified',
        q: 'Как работает верификация?',
        a: (
          <>
            Галочка покупается <Em>в день выдачи</Em> и действует ровно <Mono>30 дней</Mono>.
            Продление после — на вашей стороне. Нужны заполненные аватар, баннер, никнейм и
            юзернейм — <Und>это требование X, а не наше</Und>.
          </>
        ),
        badge: '30 ДНЕЙ',
      },
      {
        icon: 'vault',
        q: 'Как обезопасить аккаунт?',
        a: (
          <>
            Сразу после получения: <Strong>смените пароль</Strong>, привяжите свою почту, включите{' '}
            <Em>2FA</Em> и не заходите одновременно с нескольких устройств. Полная инструкция — в{' '}
            <Und>Профиль → История заказов → этот заказ → Инструкция безопасности</Und>.
          </>
        ),
        badge: 'ИНСТРУКЦИЯ В ЗАКАЗЕ',
      },
    ],
  }
}

function DeliveryFaq({
  cl,
  draft,
  audience,
  year,
}: {
  cl: 'ru' | 'en'
  draft: ProfileDraft
  audience: Audience
  year: string
}) {
  const F = useMemo(() => buildFaq(cl, draft, audience, year), [cl, draft, audience, year])
  const [open, setOpen] = useState<number | null>(0)
  const [shown, setShown] = useState(false)
  return (
    <section className="px-5 pb-8 pt-2" style={{ perspective: '1100px' }}>
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        className="flex w-full items-start gap-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[9.5px] font-medium uppercase tracking-[0.28em] text-primary/75">
            {F.eyebrow}
          </span>
          <span
            className="font-display mt-2 block text-[26px] font-semibold uppercase leading-[0.95] tracking-[-0.01em] text-foreground"
            style={{
              textShadow:
                '0 1px 0 oklch(0.28 0.01 60), 0 2px 0 oklch(0.24 0.01 60), 0 3px 0 oklch(0.2 0.01 60), 0 10px 22px oklch(0 0 0 / 0.55)',
            }}
          >
            {F.title}
          </span>
          <span className="mt-1.5 block text-[11.5px] text-muted-foreground">{F.lead}</span>
        </span>
        <span
          className={`mt-4 flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
            shown
              ? 'border-primary/45 bg-primary/12 text-primary'
              : 'border-border bg-[oklch(0.2_0.005_60)] text-muted-foreground'
          }`}
        >
          <ChevronDown
            className={`size-4 transition-transform duration-300 ${shown ? 'rotate-180' : ''}`}
            strokeWidth={2}
          />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {shown && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
      <div className="mt-4 space-y-2.5">
        {F.items.map((it, i) => {
          const isOpen = open === i
          return (
            <motion.div
              key={it.q}
              initial={false}
              animate={{
                rotateX: isOpen ? 0 : 2.5,
                y: isOpen ? -2 : 0,
              }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              style={{ transformStyle: 'preserve-3d' }}
              className={`overflow-hidden rounded-[16px] border bg-[linear-gradient(160deg,oklch(0.175_0.005_60),oklch(0.13_0.004_60))] ${
                isOpen
                  ? 'border-primary/35 shadow-[0_18px_38px_-20px_oklch(0.8_0.14_85_/_0.55),0_1px_0_0_oklch(1_0_0_/_0.07)_inset]'
                  : 'border-border shadow-[0_10px_26px_-20px_oklch(0_0_0_/_0.9),0_1px_0_0_oklch(1_0_0_/_0.04)_inset]'
              }`}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-[11px] border transition-colors ${
                    isOpen
                      ? 'border-primary/45 bg-primary/12 text-primary'
                      : 'border-border bg-[oklch(0.2_0.005_60)] text-muted-foreground'
                  }`}
                  style={{ transform: 'translateZ(24px)' }}
                >
                  <FaqIcon id={it.icon} className="size-[20px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold leading-tight tracking-[-0.005em] text-foreground">
                    {it.q}
                  </span>
                  <span className="mt-1 block text-[9.5px] uppercase tracking-[0.16em] text-primary/70">
                    {it.badge}
                  </span>
                </span>
                <ChevronDown
                  className={`size-4 shrink-0 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : ''}`}
                  strokeWidth={2}
                />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <p className="border-t border-border/70 px-4 py-3.5 text-[12.5px] leading-[1.65] text-foreground/70">
                      {it.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

function ConfirmSheet({
  open,
  onClose,
  onConfirm,
  onEdit,
  draft,
  cl,
  year,
  audience,
  chosen,
  total,
  eta,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  onEdit?: () => void
  draft: ProfileDraft
  cl: 'ru' | 'en'
  year: string
  audience: Audience
  chosen: string[]
  total: number
  eta: number
}) {
  const L = COPY[cl]
  const rows: [string, string][] = [
    [L.fName, draft.name || L.none],
    [L.fHandle, draft.handle ? `@${draft.handle}` : L.none],
    [L.fBio, draft.bio || L.none],
    [L.fMedia, [draft.avatar && 'AVA', draft.banner && 'BANNER'].filter(Boolean).join(' · ') || L.none],
    [L.fYear, year],
    [L.fFollowers, `${draft.followers.toLocaleString('en-US')} · ${audience.label[cl]}`],
    [L.fFollowing, followingLabel(draft.followingRange)],
    [L.fPosts, postCountLabel(draft.postsRange)],
    [L.fVerified, draft.verified ? L.yes : L.no],
  ]
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 z-[20] flex items-end justify-center bg-black/70 backdrop-blur-[2px]"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 38 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full w-full overflow-y-auto rounded-t-[18px] border-t border-border bg-[oklch(0.13_0.004_60)] pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <div className="px-5 pb-4 pt-3">
              <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-border-strong/70" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/70">
                {cl === 'ru' ? 'Финальная сверка' : 'Final check'}
              </p>
              <h3 className="mt-1.5 font-display text-[26px] font-bold uppercase leading-[1.05] tracking-[-0.025em] text-foreground">
                {L.confirmTitle}
              </h3>
              <div className="mt-3 h-px w-full bg-[linear-gradient(90deg,oklch(0.8_0.14_85_/_0.45),transparent)]" />
              <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
                {cl === 'ru' ? (
                  <>
                    Так аккаунт будет собран. Сверьте{' '}
                    <span className="font-semibold text-foreground">ник</span>,{' '}
                    <span className="font-semibold text-foreground">юзернейм</span>,{' '}
                    <span className="font-semibold text-foreground">год</span> и{' '}
                    <span className="font-semibold text-foreground">фолловеров</span> перед подтверждением.
                  </>
                ) : (
                  <>
                    This is how the account will be built. Double-check the{' '}
                    <span className="font-semibold text-foreground">name</span>,{' '}
                    <span className="font-semibold text-foreground">username</span>,{' '}
                    <span className="font-semibold text-foreground">year</span> and{' '}
                    <span className="font-semibold text-foreground">followers</span> before confirming.
                  </>
                )}
              </p>
            </div>

            <div className="border-y border-border">
              <XProfilePreview
                value={draft}
                cl={cl}
                year={year}
                onJump={() => {}}
                chosen={chosen}
                demoMedia
              />
            </div>

            <DeliveryFaq cl={cl} draft={draft} audience={audience} year={year} />

            <div className="flex items-stretch gap-2.5 px-5 pt-4">
              <motion.button
                type="button"
                onClick={() => {
                  onClose()
                  onEdit?.()
                }}
                whileTap={{ scale: 0.97 }}
                className="flex h-[54px] shrink-0 items-center gap-2 rounded-[14px] border border-border bg-[oklch(0.16_0.004_60)] px-4 text-[12px] font-medium tracking-[0.01em] text-muted-foreground shadow-[0_1px_0_0_oklch(1_0_0_/_0.05)_inset] transition-colors hover:border-border-strong hover:text-foreground"
              >
                <Pencil className="size-4" strokeWidth={1.8} />
                {L.confirmEdit}
              </motion.button>
              <motion.button
                type="button"
                onClick={onConfirm}
                whileTap={{ scale: 0.98 }}
                className="group relative flex h-[54px] flex-1 items-center justify-center gap-2.5 overflow-hidden rounded-[14px] bg-primary text-[13px] font-semibold tracking-[0.005em] text-primary-foreground shadow-[0_10px_24px_-12px_oklch(0.8_0.14_85_/_0.75)] transition-all hover:brightness-[1.06]"
              >
                <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-[linear-gradient(180deg,oklch(1_0_0_/_0.22),transparent)]" />
                <Check className="size-4" strokeWidth={3} />
                {L.confirmOk}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function CustomAccountConfirmSheet({
  open,
  onClose,
  editKey,
  onEdit,
  isAudienceUp,
  onAudienceDown,
}: {
  open: boolean
  onClose: () => void
  editKey?: string
  onEdit?: () => void
  isAudienceUp: (a: Audience) => boolean
  onAudienceDown: (a: Audience | null) => void
}) {
  const { lang } = useI18n()
  const cl = customLang(lang)
  const { cart } = useStore()

  const editItem = useMemo(() => cart.find((i) => i.key === editKey), [cart, editKey])

  const draft = useMemo<ProfileDraft>(() => {
    const m = editItem?.meta
    if (!m) {
      return {
        name: '',
        handle: '',
        bio: '',
        avatar: null,
        banner: null,
        verified: false,
        followingRange: '30-50',
        postsRange: '0-50',
        followers: 5000,
      }
    }
    return {
      name: m.profile_name || '',
      handle: m.profile_handle?.replace(/^@/, '') || '',
      bio: m.profile_bio || '',
      avatar: m.profile_avatar_url || null,
      banner: m.profile_banner_url || null,
      verified: m.profile_verified === 'yes',
      followingRange: (m.profile_following as ProfileDraft['followingRange']) || '30-50',
      postsRange: (m.profile_posts as ProfileDraft['postsRange']) || '0-50',
      followers: Number(m.followers) || 5000,
    }
  }, [editItem])

  const year = editItem?.meta?.year ?? '2021'
  const audience = useMemo(
    () => AUDIENCES.find((a) => a.id === editItem?.meta?.audience) ?? AUDIENCES[0],
    [editItem],
  )
  const base = useMemo(() => tierForYear(year), [year])
  const extras: ExtraId[] = draft.verified ? ['verified'] : []
  const quote = useMemo(
    () => quoteCustomAccount({ followers: draft.followers, audience, base, extras }),
    [draft.followers, audience, base, extras],
  )

  const chosen = useMemo(() => {
    const c: string[] = ['ctl-year', 'ctl-followers', 'ctl-following', 'ctl-posts']
    if (draft.name && draft.name !== '—') c.push('ctl-name')
    if (draft.handle && draft.handle !== '—') c.push('ctl-handle')
    if (draft.bio && draft.bio !== '—') c.push('ctl-bio')
    if (draft.avatar || draft.banner) c.push('ctl-media')
    return c
  }, [draft])

  return (
    <ConfirmSheet
      open={open}
      onClose={onClose}
      onEdit={onEdit}
      onConfirm={onClose}
      draft={draft}
      cl={cl}
      year={year}
      audience={audience}
      chosen={chosen}
      total={quote.total}
      eta={quote.etaDays}
    />
  )
}


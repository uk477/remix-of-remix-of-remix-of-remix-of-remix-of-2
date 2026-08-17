'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  Ban,
  BellRing,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  ImagePlus,
  Info,
  Link2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Minus,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'

import { VerifiedBadge } from './icons/verified-badge'
import { RegionMark } from './boost-icons'
import { QtyKeypad } from './qty-keypad'
import { MediaCropper } from './media-cropper'
import { normalizeXHandle } from '@/lib/x-utils'
import {
  AUDIENCES,
  CUSTOM_MAX,
  CUSTOM_MIN,
  CUSTOM_STEP,
  EXTRAS,
  FOLLOWING_RANGES,
  POST_COUNT_RANGES,
  YEARS,
  followingLabel,
  postCountLabel,
  postCountPreview,
  randomFollowingCount,
  randomPostCount,
  type Audience,
  type FollowingRangeId,
  type PostCountRangeId,
} from '@/lib/custom-account'

function AudienceMark({ id, className }: { id: string; className?: string }) {
  return <RegionMark region={id as 'global' | 'jp' | 'kr' | 'us'} className={className} />
}

export type ProfileDraft = {
  name: string
  handle: string
  bio: string
  avatar: string | null
  banner: string | null
  verified: boolean
  followingRange: FollowingRangeId
  postsRange: PostCountRangeId
  followers: number
}

export type CL = 'ru' | 'en'

export const T = {
  ru: {
    previewHint: 'Живой предпросмотр — так профиль увидят в X',
    panel: 'Заполни профиль',
    name: 'Никнейм',
    namePh: 'Никнейм',
    handle: 'Юзернейм',
    handlePh: 'юзернейм',
    handleNote: 'Убедись, что юзернейм свободен в X',
    bio: 'Описание',
    bioPh: 'Описание профиля',
    media: 'Аватар и баннер',
    avatar: 'Аватар',
    banner: 'Баннер',
    upload: 'Загрузить',
    replace: 'Заменить',
    year: 'Год регистрации',
    yearNote: 'Чем старше аккаунт — тем дороже и ценнее',
    following: 'Кол-во подписок',
    followers: 'Кол-во фолловеров',
    postsCount: 'Кол-во постов',
    audience: 'Регион аудитории',
    unavailable: 'Недоступно',
    unavailableTap: 'Сервис на паузе — нажми, чтобы включить уведомление',
    verified: 'Верификация',
    verifiedOn: 'С галочкой',
    verifiedOff: 'Без галочки',
    verifiedYes: 'Нужно',
    verifiedNo: 'Не нужно',
    perMonth: 'на месяц',
    verifiedNote: 'Оформим верификацию X. С галочкой профиль обязан быть заполнен полностью.',
    required: 'Заполни для галочки',
    optional: 'необязательно',
    follow: 'Читать',
    followingBtn: 'Читаете',
    posts: 'постов',
    joined: 'Joined',
    followingShort: 'Following',
    followersShort: 'Followers',
    tabPosts: 'Посты',
    tabReplies: 'Ответы',
    tabMedia: 'Медиа',
    menuShare: 'Поделиться профилем',
    menuCopy: 'Скопировать ссылку',
    menuMute: 'Заглушить',
    menuAbout: 'Об этом аккаунте',
    menuLists: 'Добавить/убрать из списков',
    menuViewLists: 'Посмотреть списки',
    menuBlock: 'Заблокировать',
    menuReport: 'Пожаловаться',
    unfollow: 'Отписаться',
    unfollowTitle: 'Отписаться от',
    unfollowText:
      'Его посты больше не будут появляться в вашей ленте «Читаемые». Профиль по-прежнему можно смотреть, если посты не защищены.',
    cancel: 'Отмена',
    empty: 'Здесь появятся',
    perK: 'за 1000',
    eta: 'Готово за',
    days: 'дн.',
    back: 'Назад',
    save: 'Сохранить',
  },
  en: {
    previewHint: 'Live preview — this is how X will show it',
    panel: 'Fill in the profile',
    name: 'Display name',
    namePh: 'Name',
    handle: 'Username',
    handlePh: 'username',
    handleNote: 'Make sure the username is not taken on X',
    bio: 'Bio',
    bioPh: 'Bio',
    media: 'Avatar & banner',
    avatar: 'Avatar',
    banner: 'Banner',
    upload: 'Upload',
    replace: 'Replace',
    year: 'Registration year',
    yearNote: 'The older the account, the pricier and stronger',
    following: 'Following count',
    followers: 'Followers count',
    postsCount: 'Post count',
    audience: 'Audience region',
    unavailable: 'Unavailable',
    unavailableTap: 'Service paused — tap to get notified',
    verified: 'Verification',
    verifiedOn: 'With badge',
    verifiedOff: 'No badge',
    verifiedYes: 'Need',
    verifiedNo: 'No need',
    perMonth: 'per month',
    verifiedNote: 'We set up X verification. With the badge the profile must be filled in completely.',
    required: 'Required for the badge',
    optional: 'optional',
    follow: 'Follow',
    followingBtn: 'Following',
    posts: 'posts',
    joined: 'Joined',
    followingShort: 'Following',
    followersShort: 'Followers',
    tabPosts: 'Posts',
    tabReplies: 'Replies',
    tabMedia: 'Media',
    menuShare: 'Share profile',
    menuCopy: 'Copy link',
    menuMute: 'Mute',
    menuAbout: 'About this account',
    menuLists: 'Add/remove from Lists',
    menuViewLists: 'View Lists',
    menuBlock: 'Block',
    menuReport: 'Report',
    unfollow: 'Unfollow',
    unfollowTitle: 'Unfollow',
    unfollowText:
      'Their posts will no longer show up in your Following timeline. You can still view their profile, unless their posts are protected.',
    cancel: 'Cancel',
    empty: 'Nothing here yet:',
    perK: 'per 1000',
    eta: 'Ready in',
    days: 'd',
    back: 'Back',
    save: 'Save',
  },
} as const

const fmt = (n: number) => n.toLocaleString('en-US')

const DEMO_TONES = [
  {
    banner: 'linear-gradient(120deg, oklch(0.30 0.005 60), oklch(0.22 0.004 60))',
    avatar: 'linear-gradient(140deg, oklch(0.34 0.005 60), oklch(0.24 0.004 60))',
  },
  {
    banner: 'linear-gradient(120deg, oklch(0.34 0.006 250), oklch(0.24 0.005 250))',
    avatar: 'linear-gradient(140deg, oklch(0.36 0.006 250), oklch(0.26 0.005 250))',
  },
  {
    banner: 'linear-gradient(120deg, oklch(0.32 0.006 150), oklch(0.23 0.004 150))',
    avatar: 'linear-gradient(140deg, oklch(0.35 0.006 150), oklch(0.25 0.004 150))',
  },
  {
    banner: 'linear-gradient(120deg, oklch(0.33 0.007 30), oklch(0.23 0.005 30))',
    avatar: 'linear-gradient(140deg, oklch(0.36 0.007 30), oklch(0.25 0.005 30))',
  },
]

/* ------------------------------------------------------------------ preview */

export function XProfilePreview({
  value,
  cl,
  year,
  onJump,
  chosen = [],
  demoMedia = false,
}: {
  value: ProfileDraft
  cl: CL
  year: string
  onJump: (id: string) => void
  chosen?: string[]
  demoMedia?: boolean
}) {
  const L = T[cl]
  const has = (id: string) => chosen.includes(id)
  const DASH = '—'
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [tab, setTab] = useState(0)
  const [following, setFollowing] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  void onJump

  const demoTone = useMemo(
    () => DEMO_TONES[Math.floor(Math.random() * DEMO_TONES.length)],
    [],
  )
  const demoFollowing = useMemo(
    () => randomFollowingCount(value.followingRange),
    [value.followingRange],
  )
  const demoPosts = useMemo(() => randomPostCount(value.postsRange), [value.postsRange])

  useEffect(() => {
    if (!menuOpen) return
    const close = () => setMenuOpen(false)
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [menuOpen])

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    setTilt({ x: -py * 6, y: px * 8 })
  }

  const Tap = ({
    children,
    className = '',
  }: {
    id: string
    children: React.ReactNode
    className?: string
    round?: boolean
  }) => (
    <span className={`relative block text-left ${className}`}>{children}</span>
  )

  return (
    <div className="px-4 pt-3" style={{ perspective: 900 }}>
      <motion.div
        onPointerMove={onMove}
        onPointerLeave={() => setTilt({ x: 0, y: 0 })}
        animate={{ rotateX: tilt.x, rotateY: tilt.y }}
        transition={{ type: 'spring', stiffness: 160, damping: 18 }}
        style={{ transformStyle: 'preserve-3d' }}
        className="overflow-hidden rounded-[10px] border border-border bg-[oklch(0.09_0.004_60)] shadow-[0_24px_60px_-32px_color-mix(in_oklab,var(--gold)_60%,transparent)]"
      >
        {/* chrome */}
        <div className="flex items-center gap-3 px-3 py-2">
          <ArrowLeft className="size-4 text-foreground/70" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 truncate text-[13px] font-bold text-foreground">
              {value.name || <span className="text-muted-foreground/45">{L.namePh}</span>}
              {value.verified && (
                <VerifiedBadge className="inline-block size-3.5 shrink-0 align-middle text-info" />
              )}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {has('ctl-posts')
                ? fmt(demoMedia ? demoPosts : postCountPreview(value.postsRange))
                : DASH}{' '}
              {L.posts}
            </p>
          </div>
          <Search className="size-4 text-foreground/50" />
        </div>

        {/* banner */}
        <div className="block w-full">
          <span className="relative block h-28 w-full overflow-hidden">
            {value.banner ? (
              <img src={value.banner} alt="" className="size-full object-cover" />
            ) : demoMedia ? (
              <>
                <span
                  aria-hidden
                  className="absolute inset-0"
                  style={{ background: demoTone.banner }}
                />
                <svg
                  aria-hidden
                  viewBox="0 0 400 112"
                  preserveAspectRatio="none"
                  className="absolute inset-0 size-full text-foreground/25"
                >
                  <circle cx="70" cy="30" r="26" fill="currentColor" opacity="0.35" />
                  <path d="M0 96 70 52l58 30 62-46 66 40 60-28 84 44v20H0z" fill="currentColor" opacity="0.45" />
                  <path d="M0 108 96 64l72 32 74-34 78 40 80-26v36H0z" fill="currentColor" opacity="0.3" />
                </svg>
                <span className="absolute inset-0 grid place-items-center">
                  <span className="rounded-md bg-black/35 px-2.5 py-1 text-[14px] font-bold uppercase tracking-[0.28em] text-foreground/75 backdrop-blur-[1px]">
                    ur banner <span className="text-foreground/50">(example)</span>
                  </span>
                </span>
              </>
            ) : (
              <>
                <motion.span
                  aria-hidden
                  className="absolute inset-0 bg-[linear-gradient(110deg,oklch(0.55_0.16_250/0.55),oklch(0.7_0.14_200/0.25),transparent_70%)]"
                  animate={{ backgroundPositionX: ['0%', '100%', '0%'] }}
                  transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
                  style={{ backgroundSize: '200% 100%' }}
                />
                <span className="absolute inset-0 grid place-items-center text-foreground/70">
                  <ImagePlus className="size-4" />
                </span>
              </>
            )}
          </span>
        </div>

        <div className="relative z-10 px-4 pb-0">
          <div className="flex items-start justify-between pt-2">
            <Tap id="ctl-media" round>
              <motion.span
                whileTap={{ scale: 0.96 }}
                className="-mt-[52px] block size-[72px] shrink-0 overflow-hidden rounded-full border-[4px] border-[oklch(0.09_0.004_60)] bg-info/25"
              >
                {value.avatar ? (
                  <img src={value.avatar} alt="" className="size-full object-cover" />
                ) : demoMedia ? (
                  <span
                    className="relative grid size-full place-items-center"
                    style={{ background: demoTone.avatar }}
                  >
                    <svg aria-hidden viewBox="0 0 72 72" className="absolute inset-0 size-full text-foreground/30">
                      <circle cx="36" cy="28" r="13" fill="currentColor" />
                      <path d="M8 70c4-16 15-24 28-24s24 8 28 24z" fill="currentColor" opacity="0.8" />
                    </svg>
                    <span className="relative text-center text-[8.5px] font-bold uppercase leading-[1.15] tracking-[0.1em] text-foreground/85 [text-shadow:0_1px_2px_rgba(0,0,0,.6)]">
                      ur pfp
                      <br />
                      <span className="text-[7px] tracking-[0.06em] text-foreground/60">(example)</span>
                    </span>
                  </span>
                ) : (
                  <span className="grid size-full place-items-center text-foreground/70">
                    <Camera className="size-4" />
                  </span>
                )}
              </motion.span>
            </Tap>
            <div className="relative flex items-center gap-2">
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="menu"
                className={`grid size-8 place-items-center rounded-full border transition-colors ${
                  menuOpen
                    ? 'border-foreground/60 bg-foreground/10 text-foreground'
                    : 'border-border text-foreground/80'
                }`}
              >
                <MoreHorizontal className="size-4" />
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                aria-label="message"
                className="grid size-8 place-items-center rounded-full border border-border text-foreground/80"
              >
                <MessageCircle className="size-4" />
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => (following ? setConfirmOpen(true) : setFollowing(true))}
                className={`group rounded-full px-4 py-1.5 text-[13px] font-bold transition-colors ${
                  following
                    ? 'border border-destructive/60 bg-transparent text-destructive hover:bg-destructive/10'
                    : 'bg-foreground text-background'
                }`}
              >
                {following ? L.unfollow : L.follow}
              </motion.button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ duration: 0.16 }}
                    className="absolute right-0 top-10 z-30 w-[240px] overflow-hidden rounded-xl border border-border bg-[oklch(0.11_0.004_60)] py-1 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.9)]"
                  >
                    {[
                      { i: Info, t: L.menuAbout },
                      { i: Link2, t: L.menuCopy },
                      { i: Ban, t: L.menuBlock },
                    ].map(({ i: I, t }) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setMenuOpen(false)}
                        className="flex w-full items-center gap-3 px-3.5 py-2 text-left text-[13px] font-semibold text-foreground/90 transition-colors hover:bg-foreground/5"
                      >
                        <I className="size-4 shrink-0 text-foreground/70" />
                        <span className="truncate">{t}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {confirmOpen && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-6 backdrop-blur-sm"
                    onClick={() => setConfirmOpen(false)}
                  >
                    <motion.div
                      initial={{ scale: 0.94, y: 8 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.96, opacity: 0 }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full max-w-[320px] rounded-2xl border border-border bg-[oklch(0.11_0.004_60)] p-5 text-left shadow-[0_30px_70px_-25px_rgba(0,0,0,0.95)]"
                    >
                      <p className="text-[17px] font-extrabold text-foreground">
                        {L.unfollowTitle} @{value.handle || L.handlePh}?
                      </p>
                      <p className="mt-2 text-[13px] leading-snug text-muted-foreground">
                        {L.unfollowText}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setFollowing(false)
                          setConfirmOpen(false)
                        }}
                        className="mt-4 w-full rounded-full bg-foreground py-2.5 text-[14px] font-bold text-background"
                      >
                        {L.unfollow}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmOpen(false)}
                        className="mt-2 w-full rounded-full border border-border py-2.5 text-[14px] font-bold text-foreground"
                      >
                        {L.cancel}
                      </button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            <Tap id="ctl-name">
              <span className="block text-[19px] font-extrabold leading-tight text-foreground">
                {value.name || <span className="text-muted-foreground">—</span>}
              </span>
            </Tap>
            {value.verified && (
              <VerifiedBadge className="size-[18px] shrink-0 self-center text-info" />
            )}
          </div>

          <div className="mt-0.5 flex">
            <Tap id="ctl-handle">
              <span
                className="block text-[14px] leading-snug text-muted-foreground"
              >
                {value.handle ? `@${value.handle}` : '@ —'}
              </span>
            </Tap>
          </div>

          {(value.bio || !demoMedia) && (
            <div className="mt-2.5 flex">
              <Tap id="ctl-bio">
                <span
                  className={`block max-w-full text-[13.5px] leading-snug ${value.bio ? 'text-foreground/90' : 'text-muted-foreground'}`}
                >
                  {value.bio || '—'}
                </span>
              </Tap>
            </div>
          )}

          <div className="mt-2.5 flex">
            <Tap id="ctl-year">
              <span className="flex items-center gap-1.5 text-[13.5px] text-muted-foreground">
                <CalendarDays className="size-4 shrink-0" strokeWidth={1.6} />
                {L.joined} {has('ctl-year') ? year : DASH}
                <ChevronRight className="size-3.5 shrink-0" />
              </span>
            </Tap>
          </div>

          <div className="mt-3 flex items-center gap-5">
            <Tap id="ctl-following">
              <span className="block text-[13.5px] text-muted-foreground">
                <span className="tnum font-bold text-foreground">
                  {has('ctl-following')
                    ? demoMedia
                      ? fmt(demoFollowing)
                      : followingLabel(value.followingRange)
                    : DASH}
                </span>{' '}
                {L.followingShort}
              </span>
            </Tap>
            <Tap id="ctl-followers">
              <span className="block text-[13.5px] text-muted-foreground">
                <span className="tnum font-bold text-foreground">
                  {has('ctl-followers')
                    ? (value.followers + (following ? 1 : 0)).toLocaleString('en-US')
                    : DASH}
                </span>{' '}
                {L.followersShort}
              </span>
            </Tap>
          </div>

          {/* tabs */}
          <div className="-mx-4 mt-4 grid grid-cols-3 border-b border-border text-center text-[13.5px]">
            {[L.tabPosts, L.tabReplies, L.tabMedia].map((t, i) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(i)}
                className="relative pb-3 transition-colors"
              >
                <span
                  className={i === tab ? 'font-bold text-foreground' : 'text-muted-foreground'}
                >
                  {t}
                </span>
                {i === tab && (
                  <motion.span
                    layoutId="x-tab-underline"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className="absolute bottom-0 left-1/2 h-[3px] w-10 -translate-x-1/2 rounded-full bg-primary"
                  />
                )}
              </button>
            ))}
          </div>
          <div className="py-6 text-center text-[12.5px] text-muted-foreground/70">
            {L.empty} {[L.tabPosts, L.tabReplies, L.tabMedia][tab].toLowerCase()}
          </div>
        </div>
      </motion.div>
    </div>
  )
}


/* -------------------------------------------------------------------- panel */

function Field({
  value,
  onChange,
  placeholder,
  prefix,
  maxLength,
  area,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  prefix?: string
  maxLength: number
  area?: boolean
}) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  useEffect(() => {
    const t = setTimeout(() => {
      const el = ref.current
      if (!el) return
      el.focus({ preventScroll: true })
      const n = el.value.length
      try {
        el.setSelectionRange(n, n)
      } catch {
        /* noop */
      }
    }, 340)
    return () => clearTimeout(t)
  }, [])
  const count = (
    <span className="tnum pointer-events-none absolute bottom-2.5 right-0 font-mono text-[10px] tracking-widest text-muted-foreground/45">
      {value.length}/{maxLength}
    </span>
  )
  if (area) {
    return (
      <div className="group/f relative">
        <textarea
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          rows={3}
          maxLength={maxLength}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="peer w-full resize-none border-b border-border bg-transparent pb-6 pt-1 text-[15px] leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary/40"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-primary transition-transform duration-500 ease-out peer-focus:scale-x-100"
        />
        {count}
      </div>
    )
  }
  return (
    <div className="relative flex items-center border-b border-border transition-colors focus-within:border-primary/40">
      {prefix && (
        <span className="mr-0.5 text-[16px] font-light text-muted-foreground/70">{prefix}</span>
      )}
      <input
        ref={ref as React.RefObject<HTMLInputElement>}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="peer w-full bg-transparent py-2.5 text-[16px] tracking-[-0.01em] text-foreground outline-none placeholder:font-light placeholder:text-muted-foreground/40"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-px left-0 h-px w-full origin-left scale-x-0 bg-primary transition-transform duration-500 ease-out peer-focus:scale-x-100"
      />
    </div>
  )
}

function ImagePicker({
  label,
  src,
  round,
  onPick,
  onClear,
  cl,
}: {
  label: string
  src: string | null
  round?: boolean
  onPick: (dataUrl: string) => void
  onClear: () => void
  cl: CL
}) {
  const L = T[cl]
  const ref = useRef<HTMLInputElement | null>(null)
  const [raw, setRaw] = useState<string | null>(null)
  const objectUrl = useRef<string | null>(null)
  const clearRaw = () => {
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current)
      objectUrl.current = null
    }
    setRaw(null)
  }
  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f || !f.type.startsWith('image/') || f.size > 5 * 1024 * 1024) return
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    const url = URL.createObjectURL(f)
    objectUrl.current = url
    setRaw(url)
  }
  const empty = {
    background:
      'linear-gradient(150deg, color-mix(in oklab, var(--gold) 6%, transparent), transparent 60%), oklch(0.165 0.005 64)',
  }
  return (
    <div className={round ? 'flex items-center gap-4' : ''}>
      <button
        type="button"
        onPointerDown={() => ref.current?.click()}
        className={`group relative block shrink-0 overflow-hidden border transition-colors duration-300 ${
          src ? 'border-primary/45' : 'border-border hover:border-primary/40'
        } ${round ? 'size-[88px] rounded-full' : 'aspect-[3/1] w-full rounded-[4px]'}`}
        style={src ? undefined : empty}
      >
        {src ? (
          <>
            <img src={src} alt="" className="size-full object-cover" />
            <span className="absolute inset-0 grid place-items-center bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <Camera className="size-4 text-primary" strokeWidth={1.5} />
            </span>
          </>
        ) : (
          <span className="grid size-full place-items-center text-muted-foreground/70 transition-colors duration-300 group-hover:text-primary">
            <ImagePlus className="size-5" strokeWidth={1.2} />
          </span>
        )}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={handle}
      />
      {raw && (
        <MediaCropper
          src={raw}
          aspect={round ? 1 : 3}
          round={round}
          title={cl === 'ru' ? 'Редактировать медиа' : 'Edit media'}
          applyLabel={cl === 'ru' ? 'Применить' : 'Apply'}
          onCancel={clearRaw}
          onApply={(d) => {
            onPick(d)
            clearRaw()
          }}
        />
      )}
      <div className={`flex items-center gap-3 ${round ? 'flex-1' : 'mt-2.5 justify-between'}`}>
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        {src && (
          <button
            type="button"
            onClick={() => setRaw(src)}
            className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-primary"
          >
            {cl === 'ru' ? 'Изменить' : 'Edit'}
          </button>
        )}
        <button
          type="button"
          onPointerDown={() => ref.current?.click()}
          className="text-[10px] font-medium uppercase tracking-[0.14em] text-primary/90 transition-colors hover:text-primary"
        >
          {src ? L.replace : L.upload}
        </button>
        {src && (
          <button
            type="button"
            onClick={onClear}
            className="text-muted-foreground transition-colors hover:text-destructive"
          >
            <Trash2 className="size-3.5" strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
  className = '',
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={`tnum rounded-[3px] border py-2 text-center text-[12.5px] tracking-[0.04em] transition-colors duration-200 ${
        active
          ? 'border-primary bg-primary font-semibold text-primary-foreground'
          : 'border-border font-medium text-muted-foreground hover:border-primary/45 hover:text-foreground'
      } ${className}`}
    >
      {children}
    </motion.button>
  )
}

/* ---------------------------------------------------------------- menu row */

function MenuRow({
  cl,
  id,
  n,
  title,
  summary,
  done,
  status,
  open,
  onOpen,
  onBack,
  onSave,
  children,
}: {
  cl: CL
  id: string
  n: number
  title: string
  summary: string
  done: boolean
  status: 'idle' | 'warn' | 'done'
  open: boolean
  onOpen: () => void
  onBack: () => void
  onSave: () => void
  children: React.ReactNode
}) {
  const L = T[cl]
  return (
    <div
      id={id}
      className={`scroll-mt-4 overflow-hidden rounded-[6px] border transition-colors duration-300 ${
        open
          ? 'border-primary/35'
          : status === 'done'
            ? 'border-success/35'
            : status === 'warn'
              ? 'border-destructive/40'
              : 'border-border'
      }`}
      style={{
        background: 'oklch(0.145 0.005 64)',
        boxShadow:
          !open && status === 'done'
            ? '0 0 0 1px color-mix(in oklab, var(--success) 12%, transparent), 0 0 18px -8px color-mix(in oklab, var(--success) 60%, transparent)'
            : !open && status === 'warn'
              ? '0 0 0 1px color-mix(in oklab, var(--destructive) 12%, transparent), 0 0 18px -8px color-mix(in oklab, var(--destructive) 55%, transparent)'
              : undefined,
      }}
    >
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <span className="tnum font-mono text-[10px] tracking-[0.2em] text-primary/70">
          {String(n).padStart(2, '0')}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium tracking-[0.01em] text-foreground">
            {title}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground/80">
            {summary}
          </span>
        </span>

        {/* status: check → pencil on hover */}
        <span className="relative grid size-7 shrink-0 place-items-center">
          {!open && status !== 'idle' && (
            <motion.span
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`absolute grid size-6 place-items-center rounded-full border transition-opacity duration-200 group-hover:opacity-0 ${
                status === 'done'
                  ? 'border-success/45 bg-success/12 text-success'
                  : 'border-destructive/45 bg-destructive/12 text-destructive'
              }`}
            >
              {status === 'done' ? (
                <Check className="size-3.5" strokeWidth={3} />
              ) : (
                <span className="text-[12px] font-bold leading-none">?</span>
              )}
            </motion.span>
          )}
          <span
            className={`absolute text-muted-foreground transition-all duration-200 ${
              open
                ? 'rotate-90 opacity-100'
                : status !== 'idle'
                  ? 'opacity-0 group-hover:text-primary group-hover:opacity-100'
                  : 'opacity-70 group-hover:text-primary group-hover:opacity-100'
            }`}
          >
            {open ? (
              <ChevronRight className="size-4" strokeWidth={2} />
            ) : (
              <Pencil className="size-3.5" strokeWidth={1.8} />
            )}
          </span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/70 px-4 pb-4 pt-4">
              {children}
              <div className="mt-5 grid grid-cols-[auto_1fr] gap-2">
                <button
                  type="button"
                  onClick={onBack}
                  className="flex h-11 items-center gap-1.5 rounded-[4px] border border-border px-4 text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                >
                  <ArrowLeft className="size-3.5" strokeWidth={2} />
                  {L.back}
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  className="flex h-11 items-center justify-center gap-2 rounded-[4px] bg-primary text-[11px] font-bold uppercase tracking-[0.18em] text-primary-foreground transition-all hover:brightness-[1.06]"
                >
                  <Check className="size-3.5" strokeWidth={3} />
                  {L.save}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------- verify step */

function VerifiedStep({
  value,
  onChange,
  cl,
  missing,
  price,
}: {
  value: boolean
  onChange: (v: boolean) => void
  cl: CL
  missing: string[]
  price: number
}) {
  const L = T[cl]
  return (
    <div
      className="relative flex items-center gap-3 overflow-hidden rounded-lg border border-primary/20 px-3 py-2.5"
      style={{
        background:
          'linear-gradient(160deg, color-mix(in oklab, var(--gold) 9%, transparent), transparent 45%), oklch(0.155 0.005 64)',
      }}
    >
      <motion.span
        aria-hidden
        initial={{ x: '-120%' }}
        animate={{ x: '220%' }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2.5 }}
        className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--gold)_10%,transparent),transparent)]"
      />

      <VerifiedBadge className="relative size-[18px] shrink-0 text-info" />

      <div className="relative min-w-0 flex-1">
        <h4 className="truncate text-[13px] font-semibold leading-none tracking-[-0.01em] text-foreground">
          {L.verified}
        </h4>
        <span className="mt-1 block text-[10px] leading-none text-muted-foreground">
          <span className="tnum text-primary">{price}$</span> · {L.perMonth}
        </span>
      </div>

      <div className="relative flex shrink-0 overflow-hidden rounded-full border border-border/80 bg-[oklch(0.12_0.004_60)] p-[3px]">
        {[true, false].map((on) => (
          <button
            key={String(on)}
            type="button"
            onClick={() => onChange(on)}
            className={`relative rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors duration-300 ${
              value === on ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {value === on && (
              <motion.span
                layoutId="verified-seg"
                transition={{ type: 'spring', stiffness: 420, damping: 38 }}
                className="absolute inset-0 rounded-full bg-primary"
              />
            )}
            <span className="relative">{on ? L.verifiedYes : L.verifiedNo}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function ProfileControlPanel({
  value,
  onChange,
  cl,
  year,
  onYear,
  audience,
  onAudience,
  isAudienceUp,
  onAudienceDown,
  missing,
  openId,
  onOpenId,
  visited,
  onVisit,
  chosen,
  onChoose,
}: {
  value: ProfileDraft
  onChange: (patch: Partial<ProfileDraft>) => void
  cl: CL
  year: string
  onYear: (y: string) => void
  audience: Audience
  onAudience: (a: Audience) => void
  isAudienceUp: (a: Audience) => boolean
  onAudienceDown: (a: Audience) => void
  missing: string[]
  openId: string | null
  onOpenId: (id: string | null) => void
  visited: string[]
  onVisit: (id: string) => void
  chosen: string[]
  onChoose: (id: string) => void
}) {
  const L = T[cl]
  const req = value.verified
  const verifiedPrice = EXTRAS.find((e) => e.id === 'verified')?.price ?? 14
  const snap = useRef<{ draft: ProfileDraft; year: string } | null>(null)
  const [keypadOpen, setKeypadOpen] = useState(false)
  const holdTimer = useRef<number | null>(null)
  const holdInterval = useRef<number | null>(null)
  const stopHold = () => {
    if (holdTimer.current) { window.clearTimeout(holdTimer.current); holdTimer.current = null }
    if (holdInterval.current) { window.clearInterval(holdInterval.current); holdInterval.current = null }
  }
  const followersRef = useRef(value.followers)
  followersRef.current = value.followers
  const setFollowers = (n: number) => {
    onChoose('ctl-followers')
    onChange({ followers: Math.min(CUSTOM_MAX, Math.max(CUSTOM_MIN, Math.round(n))) })
  }
  const bump = (dir: 1 | -1) => setFollowers(followersRef.current + dir * CUSTOM_STEP)
  const startHold = (dir: 1 | -1) => {
    stopHold()
    holdTimer.current = window.setTimeout(() => {
      holdInterval.current = window.setInterval(() => bump(dir), 80)
    }, 350)
  }
  useEffect(() => () => stopHold(), [])

  const open = (id: string) => {
    if (openId === id) {
      onVisit(id)
      onOpenId(null)
      return
    }
    snap.current = { draft: value, year }
    onVisit(id)
    onOpenId(id)
  }
  const back = () => {
    if (snap.current) {
      onChange(snap.current.draft)
      onYear(snap.current.year)
    }
    if (openId) onVisit(openId)
    onOpenId(null)
  }
  const save = () => {
    if (openId) onVisit(openId)
    onOpenId(null)
  }
  const seen = (id: string) => visited.includes(id)
  const picked = (id: string) => chosen.includes(id)

  const row = (
    id: string,
    n: number,
    title: string,
    summary: string,
    done: boolean,
    children: React.ReactNode,
    _required = false,
    statusOverride?: 'idle' | 'warn' | 'done',
  ) => (
    <MenuRow
      key={id}
      cl={cl}
      id={id}
      n={n}
      title={title}
      summary={summary}
      done={done}
      status={statusOverride ?? (!seen(id) ? 'idle' : done ? 'done' : 'warn')}
      open={openId === id}
      onOpen={() => open(id)}
      onBack={back}
      onSave={save}
    >
      {children}
    </MenuRow>
  )

  const dash = cl === 'ru' ? 'не заполнено' : 'not set'

  return (
    <div className="px-5 pb-8 pt-5">
      <VerifiedStep
        value={value.verified}
        onChange={(v) => onChange({ verified: v })}
        cl={cl}
        missing={missing}
        price={verifiedPrice}
      />

      <div className="mt-6 space-y-2.5">
        {row(
          'ctl-name',
          1,
          L.name,
          value.name || dash,
          !!value.name,
          <Field
            value={value.name}
            maxLength={50}
            placeholder={L.namePh}
            onChange={(v) => onChange({ name: v })}
          />,
          true,
        )}

        {row(
          'ctl-handle',
          2,
          L.handle,
          value.handle ? `@${value.handle}` : dash,
          !!value.handle,
          <>
            <Field
              value={value.handle}
              prefix="@"
              maxLength={15}
              placeholder={L.handlePh}
              onChange={(v) => onChange({ handle: normalizeXHandle(v) })}
            />
            <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground/85">
              {L.handleNote}
            </p>
          </>,
          true,
        )}

        {row(
          'ctl-bio',
          3,
          L.bio,
          value.bio || dash,
          !!value.bio,
          <Field
            value={value.bio}
            area
            maxLength={160}
            placeholder={L.bioPh}
            onChange={(v) => onChange({ bio: v })}
          />,
          false,
          value.bio ? 'done' : 'idle',
        )}

        {row(
          'ctl-media',
          4,
          L.media,
          [value.avatar && L.avatar, value.banner && L.banner].filter(Boolean).join(' · ') || dash,
          req ? !!value.avatar && !!value.banner : true,
          <div className="space-y-5">
            <ImagePicker
              cl={cl}
              label={L.avatar}
              src={value.avatar}
              round
              onPick={(d) => onChange({ avatar: d })}
              onClear={() => onChange({ avatar: null })}
            />
            <ImagePicker
              cl={cl}
              label={L.banner}
              src={value.banner}
              onPick={(d) => onChange({ banner: d })}
              onClear={() => onChange({ banner: null })}
            />
          </div>,
          req,
          value.avatar && value.banner
            ? 'done'
            : req && seen('ctl-media')
              ? 'warn'
              : 'idle',
        )}

        {row(
          'ctl-year',
          5,
          L.year,
          picked('ctl-year') ? year : dash,
          picked('ctl-year'),
          <>
            <div className="grid grid-cols-5 gap-2">
              {YEARS.map((y) => (
                <Chip
                  key={y}
                  active={picked('ctl-year') && y === year}
                  onClick={() => {
                    onChoose('ctl-year')
                    onYear(y)
                  }}
                >
                  {y}
                </Chip>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground/85">{L.yearNote}</p>
          </>,
          true,
        )}

        {row(
          'ctl-followers',
          6,
          L.followers,
          picked('ctl-followers') ? `${fmt(value.followers)} · ${audience.label[cl]}` : dash,
          picked('ctl-followers'),
          <>
            <p className="mb-2.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {L.audience}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {AUDIENCES.map((a, i) => {
                const up = isAudienceUp(a)
                const active = picked('ctl-followers') && a.id === audience.id && up
                const wide = i === AUDIENCES.length - 1 && AUDIENCES.length % 2 === 1
                return (
                  <motion.button
                    key={a.id}
                    type="button"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * i, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      if (!up) return onAudienceDown(a)
                      onChoose('ctl-followers')
                      onAudience(a)
                    }}
                    className={`group relative flex flex-col items-center overflow-hidden rounded-3xl border px-3 pb-3.5 pt-4 text-center transition-colors ${
                      wide ? 'col-span-2' : ''
                    } ${
                      active
                        ? 'border-primary/50 bg-[color-mix(in_oklab,var(--primary)_9%,var(--card))]'
                        : 'border-border bg-card active:bg-secondary'
                    } ${up ? '' : 'opacity-70'}`}
                  >
                    {active && (
                      <span className="absolute end-2.5 top-2.5 flex size-4 items-center justify-center rounded-full bg-primary">
                        <Check className="size-2.5 text-background" strokeWidth={3} />
                      </span>
                    )}
                    <div className="pointer-events-none mb-2 flex h-20 w-full items-center justify-center">
                      <AudienceMark id={a.id} className="size-20" />
                    </div>
                    <div className="relative w-full">
                      <p className="font-display text-[15px] font-extrabold leading-tight tracking-tight">
                        {a.label[cl]}
                      </p>
                      {up ? (
                        <p className="tnum mt-1 text-[11px] font-semibold text-primary">
                          {a.pricePer1000 % 1 === 0 ? a.pricePer1000 : a.pricePer1000.toFixed(2)}$
                          <span className="text-muted-foreground"> · {L.perK}</span>
                        </p>
                      ) : (
                        <p className="mt-1 flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-destructive">
                          <BellRing className="size-3" strokeWidth={2} />
                          {L.unavailable}
                        </p>
                      )}
                    </div>
                  </motion.button>
                )
              })}
            </div>
            {!isAudienceUp(audience) && (
              <p className="mt-2.5 text-[11px] leading-relaxed text-destructive">
                {L.unavailableTap}
              </p>
            )}

            <div className="mt-4 border-t border-border pt-4">
              <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2">
                <button
                  type="button"
                  onClick={() => bump(-1)}
                  onPointerDown={() => startHold(-1)}
                  onPointerUp={stopHold}
                  onPointerLeave={stopHold}
                  onPointerCancel={stopHold}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-secondary/45 text-foreground transition-transform active:scale-95"
                  aria-label="−"
                >
                  <Minus className="size-4" strokeWidth={2.7} />
                </button>
                <button
                  type="button"
                  onClick={() => setKeypadOpen(true)}
                  className="tnum min-w-0 rounded-xl py-1 text-center font-display text-[28px] font-black leading-none text-primary transition-colors active:bg-primary/5"
                >
                  {value.followers.toLocaleString()}
                </button>
                <button
                  type="button"
                  onClick={() => bump(1)}
                  onPointerDown={() => startHold(1)}
                  onPointerUp={stopHold}
                  onPointerLeave={stopHold}
                  onPointerCancel={stopHold}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-secondary/45 text-foreground transition-transform active:scale-95"
                  aria-label="+"
                >
                  <Plus className="size-4" strokeWidth={2.7} />
                </button>
              </div>
              <p className="mt-1 text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {L.followersShort}
              </p>
              <input
                type="range"
                min={CUSTOM_MIN}
                max={CUSTOM_MAX}
                step={1}
                value={value.followers}
                onChange={(e) => setFollowers(Number(e.target.value))}
                className="custom-range mt-3 w-full"
                style={{
                  backgroundSize: `${((value.followers - CUSTOM_MIN) / (CUSTOM_MAX - CUSTOM_MIN)) * 100}% 100%`,
                }}
              />
              <div className="tnum mt-3 flex justify-between font-mono text-[10px] tracking-wide text-muted-foreground/70">
                <span>{fmt(CUSTOM_MIN)}</span>
                <span>{fmt(CUSTOM_MAX)}</span>
              </div>
              <QtyKeypad
                open={keypadOpen}
                title={L.followersShort}
                min={CUSTOM_MIN}
                max={CUSTOM_MAX}
                doneLabel={cl === 'ru' ? 'Готово' : 'Done'}
                onClose={() => setKeypadOpen(false)}
                onCommit={setFollowers}
              />
            </div>
          </>,
          true,
        )}

        {row(
          'ctl-following',
          7,
          L.following,
          picked('ctl-following') ? followingLabel(value.followingRange) : dash,
          picked('ctl-following'),
          <div className="grid grid-cols-3 gap-2">
            {FOLLOWING_RANGES.map((r) => (
              <Chip
                key={r.id}
                active={picked('ctl-following') && r.id === value.followingRange}
                onClick={() => {
                  onChoose('ctl-following')
                  onChange({ followingRange: r.id })
                }}
              >
                {r.label}
              </Chip>
            ))}
          </div>,
          true,
        )}

        {row(
          'ctl-posts',
          8,
          L.postsCount,
          picked('ctl-posts') ? postCountLabel(value.postsRange) : dash,
          picked('ctl-posts'),
          <div className="grid grid-cols-3 gap-2">
            {POST_COUNT_RANGES.map((r) => (
              <Chip
                key={r.id}
                active={picked('ctl-posts') && r.id === value.postsRange}
                onClick={() => {
                  onChoose('ctl-posts')
                  onChange({ postsRange: r.id })
                }}
              >
                {r.label}
              </Chip>
            ))}
          </div>,
          true,
        )}
      </div>
    </div>
  )
}

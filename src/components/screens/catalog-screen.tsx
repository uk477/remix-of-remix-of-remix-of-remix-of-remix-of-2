'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, Info, RefreshCw, Search, Sparkles, WifiOff } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { useQuery } from '@tanstack/react-query'
import { CATEGORIES, SERVICES } from '@/lib/data'
import { money } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { useNav } from '@/lib/nav'
import { useStore } from '@/lib/store'
import type { BoostService, Lang, Localized } from '@/lib/types'
import { BOOST_MARKS, RegionMark, type BoostMarkId } from '../boost-icons'
import { OrderForm } from '../order-form'
import { ScreenHeader } from '../screen-header'
import { ServiceInfoSheet } from '../service-info-sheet'
import { AurxMark } from '../aurx-mark'
import { BoostUnavailableSheet } from '../boost-unavailable-sheet'
import { CustomAccountBanner } from '../custom-account-builder'
import { getBoostStatuses, type BoostRegion, type BoostSubcatId } from '@/lib/boost-status.functions'

const ease = [0.22, 1, 0.36, 1] as const

type Region = 'global' | 'jp' | 'kr' | 'us'

const REGION_LABEL: Record<Region, Localized> = {
  global: { en: 'Global', ru: 'Глобальные', ar: 'عالمي', zh: '全球', es: 'Global', tr: 'Global', pt: 'Global', fr: 'Global', uk: 'Глобальні' },
  jp: { en: 'Japan', ru: 'Япония', ar: 'اليابان', zh: '日本', es: 'Japón', tr: 'Japonya', pt: 'Japão', fr: 'Japon', uk: 'Японія' },
  kr: { en: 'Korea', ru: 'Корея', ar: 'كوريا', zh: '韩国', es: 'Corea', tr: 'Kore', pt: 'Coreia', fr: 'Corée', uk: 'Корея' },
  us: { en: 'USA', ru: 'США', ar: 'أمريكا', zh: '美国', es: 'EEUU', tr: 'ABD', pt: 'EUA', fr: 'USA', uk: 'США' },
}

const REGION_TAG: Record<Region, string> = {
  global: 'GLB',
  jp: 'JP',
  kr: 'KR',
  us: 'US',
}

function categoryLabel(id: string, lang: Lang): string {
  const c = CATEGORIES.find((x) => x.id === id)
  return c ? c.name[lang] : id
}

export function CatalogScreen() {
  const { t, lang } = useI18n()
  const { back, param, editParam, go } = useNav()
  const { cart } = useStore()
  const [subcat, setSubcat] = useState<BoostMarkId | null>(null)
  const [region, setRegion] = useState<Region | null>(null)
  const [service, setService] = useState<BoostService | null>(null)
  const [query, setQuery] = useState('')
  const [unavailableSheet, setUnavailableSheet] = useState<
    { subcategory: BoostSubcatId; region?: Region } | null
  >(null)

  // Live availability from backend
  const getStatuses = useServerFn(getBoostStatuses)
  const statusQ = useQuery({
    queryKey: ['boost-statuses'],
    queryFn: () => getStatuses(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
  // Key = "subcat" or "subcat:region"
  const statusMap = useMemo(() => {
    const m: Record<string, boolean> = {}
    ;(statusQ.data?.statuses ?? []).forEach((s) => {
      const key = s.region === '_all' ? s.subcategory_id : `${s.subcategory_id}:${s.region}`
      m[key] = s.is_available
    })
    return m
  }, [statusQ.data])
  const isSubcatAvailable = (id: BoostMarkId) => statusMap[id] !== false // default true
  const isRegionAvailable = (r: Region) => statusMap[`followers:${r}`] !== false

  // Auto-select the single service for a subcategory (or region+followers).
  const pickSubcat = (id: BoostMarkId) => {
    if (!isSubcatAvailable(id)) {
      setUnavailableSheet({ subcategory: id as BoostSubcatId })
      return
    }
    if (id === 'followers') {
      setSubcat(id)
      return
    }
    const svc = SERVICES.find((s) => s.categoryId === id)
    if (svc) {
      setSubcat(id)
      setService(svc)
    } else {
      setSubcat(id)
    }
  }
  const pickRegion = (r: Region) => {
    if (!isRegionAvailable(r)) {
      setUnavailableSheet({ subcategory: 'followers', region: r })
      return
    }
    const svc = SERVICES.find((s) => s.categoryId === 'followers' && s.region === r)
    setRegion(r)
    if (svc) setService(svc)
  }

  // Deep-link support: /catalog?cat=<serviceId> opens that service directly
  // (e.g. tapping a cart line to edit it).
  useEffect(() => {
    if (!param) return
    const svc = SERVICES.find((s) => s.id === param)
    if (!svc) return
    setSubcat(svc.categoryId as BoostMarkId)
    if (svc.categoryId === 'followers' && svc.region) {
      setRegion(svc.region as Region)
    }
    setService(svc)
  }, [param])

  // ─────────── Level 3: order form ───────────
  if (service) {
    const editItem = editParam
      ? cart.find((item) => item.key === editParam && item.refId === service.id)
      : undefined
    return (
      <div>
        <ScreenHeader
          title={service.name[lang]}
          subtitle={`Twitter / X · ${t('boosted')}`}
          onBack={() => {
            if (editItem) {
              go('cart')
              return
            }
            setService(null)
            // Go all the way back to the subcategory picker — skip the
            // intermediate list that only ever had one item.
            if (service.categoryId === 'followers') {
              setRegion(null)
            } else {
              setSubcat(null)
            }
          }}
        />
        <OrderForm service={service} editItem={editItem} />
      </div>
    )
  }

  // Shared unavailable sheet renderer (reused by every level)
  const unavailableSheetEl = unavailableSheet ? (
    <BoostUnavailableSheet
      open={!!unavailableSheet}
      onOpenChange={(v) => !v && setUnavailableSheet(null)}
      subcategory={unavailableSheet.subcategory}
      region={unavailableSheet.region ? (unavailableSheet.region as BoostRegion) : '_all'}
      subcategoryLabel={
        unavailableSheet.region
          ? `${REGION_LABEL[unavailableSheet.region][lang]} · ${categoryLabel(unavailableSheet.subcategory, lang)}`
          : categoryLabel(unavailableSheet.subcategory, lang)
      }
    />
  ) : null

  // ─────────── Level 0: subcategory picker ───────────
  if (!subcat) {
    return (
      <div>
        <ScreenHeader title={t('nav_catalog')} onBack={back} />
        <SubcategoryPicker onPick={pickSubcat} lang={lang} statusMap={statusMap} />
        {unavailableSheetEl}
      </div>
    )
  }

  // ─────────── Level 1: region picker (Followers only) ───────────
  if (subcat === 'followers' && !region) {
    return (
      <div>
        <ScreenHeader
          title={categoryLabel('followers', lang)}
          subtitle={t('boosted')}
          onBack={() => setSubcat(null)}
        />
        <RegionPicker onPick={pickRegion} lang={lang} statusMap={statusMap} />
        {unavailableSheetEl}
      </div>
    )
  }

  // ─────────── Level 2: services list ───────────
  const filtered = SERVICES.filter((s) => {
    if (s.categoryId !== subcat) return false
    if (subcat === 'followers' && region && s.region !== region) return false
    return true
  }).filter((s) =>
    query.trim() ? s.name[lang].toLowerCase().includes(query.trim().toLowerCase()) : true,
  )

  const heading =
    subcat === 'followers' && region
      ? `${REGION_LABEL[region][lang]} · ${categoryLabel('followers', lang)}`
      : categoryLabel(subcat, lang)

  return (
    <div>
      <ScreenHeader
        title={heading}
        subtitle={t('boosted')}
        onBack={() =>
          subcat === 'followers' && region ? setRegion(null) : setSubcat(null)
        }
      />

      <div className="glass sticky top-0 z-20 border-b border-border px-4 pb-3 pt-1">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2.5">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search_services')}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2.5 px-4 pb-6 pt-4">
        <AnimatePresence initial={false}>
          {filtered.map((s, i) => (
            <ServiceRow
              key={s.id}
              service={s}
              index={i}
              lang={lang}
              refillLabel={t('refill')}
              popularLabel={t('popular')}
              fromLabel={t('from_price')}
              perLabel={t('per_1k')}
              onOpen={() => setService(s)}
            />
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Sparkles className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t('search_services')}…</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────── Subcategory picker ───────────────────────────

const SUBCATS: { id: BoostMarkId; hint: Localized }[] = [
  { id: 'followers',  hint: { en: '4 regions · Global / JP / KR / US', ru: '4 региона · Global / JP / KR / US', ar: '٤ مناطق · Global / JP / KR / US', zh: '4 地区 · 全球 / 日 / 韩 / 美', es: '4 regiones · Global / JP / KR / US', tr: '4 bölge · Global / JP / KR / US', pt: '4 regiões · Global / JP / KR / US', fr: '4 régions · Global / JP / KR / US', uk: '4 регіони · Global / JP / KR / US' } },
  { id: 'likes',      hint: { en: 'Instant · from $0.80/1k', ru: 'Мгновенно · от $0.80/1k', ar: 'فوري · من $0.80/1k', zh: '即时 · $0.80/1k 起', es: 'Instantáneo · desde $0.80/1k', tr: 'Anında · $0.80/1k’den', pt: 'Instantâneo · a partir de $0.80/1k', fr: 'Instantané · dès $0.80/1k', uk: 'Миттєво · від $0.80/1k' } },
  { id: 'views',      hint: { en: 'Algorithm boost · from $0.15/1k', ru: 'Буст алгоритма · от $0.15/1k', ar: 'دفع الخوارزمية · من $0.15/1k', zh: '算法助推 · $0.15/1k 起', es: 'Boost del algoritmo · desde $0.15/1k', tr: 'Algoritma boost · $0.15/1k’den', pt: 'Boost do algoritmo · a partir de $0.15/1k', fr: 'Boost algorithme · dès $0.15/1k', uk: 'Буст алгоритму · від $0.15/1k' } },
  { id: 'reposts',    hint: { en: 'Real profiles · refill', ru: 'Реальные профили · рефилл', ar: 'حسابات حقيقية · إعادة تعبئة', zh: '真实账号 · 补量', es: 'Perfiles reales · refill', tr: 'Gerçek profiller · refill', pt: 'Perfis reais · refill', fr: 'Profils réels · refill', uk: 'Реальні профілі · рефілл' } },
  { id: 'bookmarks',  hint: { en: 'Ranking signal · fast', ru: 'Сигнал ранжирования · быстро', ar: 'إشارة الترتيب · سريع', zh: '排名信号 · 快速', es: 'Señal de ranking · rápido', tr: 'Sıralama sinyali · hızlı', pt: 'Sinal de ranking · rápido', fr: 'Signal de ranking · rapide', uk: 'Сигнал ранжування · швидко' } },
]

function SubcategoryPicker({
  onPick,
  lang,
  statusMap,
}: {
  onPick: (id: BoostMarkId) => void
  lang: Lang
  statusMap: Record<string, boolean>
}) {
  const isDown = (id: BoostMarkId) => statusMap[id] === false
  return (
    <div className="px-4 pb-8 pt-3">
      {/* Hero band */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease }}
        className="mb-5 overflow-hidden rounded-3xl border border-primary/30 bg-primary/10 p-5"
      >
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1">
          <span className="size-1.5 rounded-full bg-primary animate-live" />
          <span className="text-[11px] font-bold tracking-wider text-primary">BOOST · X</span>
        </div>
        <p className="font-display text-[22px] font-extrabold leading-tight tracking-tight">
          {lang === 'ru'
            ? 'Выбирай, что усилить'
            : lang === 'uk'
              ? 'Обери, що підсилити'
              : 'Pick what to amplify'}
        </p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {lang === 'ru'
            ? '5 категорий · регионы для фолловеров · рефилл'
            : lang === 'uk'
              ? '5 категорій · регіони для фолловерів · рефілл'
              : '5 categories · regional followers · refill'}
        </p>
      </motion.div>

      {/* First tile: Followers — full width, feature */}
      {SUBCATS.slice(0, 1).map((s) => {
        const Mark = BOOST_MARKS[s.id]
        const down = isDown(s.id)
        if (down) {
          return (
            <UnavailableHeroCard
              key={s.id}
              icon={<Mark className="size-full" />}
              title={categoryLabel(s.id, lang)}
              lang={lang}
              onClick={() => onPick(s.id)}
            />
          )
        }
        return (
          <motion.button
            key={s.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.45, ease }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onPick(s.id)}
            className="sheen group relative mb-3 flex w-full items-center gap-4 overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/15 via-background to-background p-5 text-start"
          >
            <div className="pointer-events-none absolute -end-8 -top-8 size-52 rounded-full bg-primary/10 blur-2xl" />
            <div className="relative size-20 shrink-0">
              <Mark className="size-full text-primary" />
            </div>
            <div className="relative min-w-0 flex-1">
              <p className="font-display text-[19px] font-extrabold tracking-tight">
                {categoryLabel(s.id, lang)}
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">{s.hint[lang]}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(['global', 'jp', 'kr', 'us'] as Region[]).map((r) => (
                  <span
                    key={r}
                    className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-primary"
                  >
                    {REGION_TAG[r]}
                  </span>
                ))}
              </div>
            </div>
            <ChevronRight className="relative size-5 shrink-0 text-primary rtl:rotate-180" />
          </motion.button>
        )
      })}

      {/* Rest: 2-col grid of subcategory cards */}
      <div className="grid grid-cols-2 gap-3">
        {SUBCATS.slice(1).map((s, i) => {
          const Mark = BOOST_MARKS[s.id]
          const count = SERVICES.filter((x) => x.categoryId === s.id).length
          const from = Math.min(
            ...SERVICES.filter((x) => x.categoryId === s.id).map((x) => x.pricePer1000),
          )
          const down = isDown(s.id)
          if (down) {
            return (
              <UnavailableGridCard
                key={s.id}
                index={i}
                icon={<Mark className="size-full" />}
                title={categoryLabel(s.id, lang)}
                lang={lang}
                onClick={() => onPick(s.id)}
              />
            )
          }
          return (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.45, ease }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onPick(s.id)}
              className="group relative flex h-44 flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card p-4 text-start transition-colors active:bg-secondary"
            >
              <div className="pointer-events-none absolute bottom-4 -end-6 opacity-90">
                <Mark className="size-28 opacity-90" />
              </div>
              <div className="relative">
                <div className="size-11">
                  <Mark className="size-11" />
                </div>
              </div>
              <div className="relative">
                <p className="font-display text-[15px] font-extrabold tracking-tight">
                  {categoryLabel(s.id, lang)}
                </p>
                <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                  {s.hint[lang]}
                </p>
                <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-primary">
                  {`from ${money(from)}`}
                  <span className="text-muted-foreground">· {count}</span>
                </p>
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────── Region picker ───────────────────────────

function RegionPicker({
  onPick,
  lang,
  statusMap,
}: {
  onPick: (r: Region) => void
  lang: Lang
  statusMap: Record<string, boolean>
}) {
  const regions: Region[] = ['global', 'jp', 'kr', 'us']
  const [infoOpen, setInfoOpen] = useState(false)
  const isRu = lang === 'ru' || lang === 'uk'
  return (
    <div className="px-4 pb-8 pt-3">
      <CustomAccountBanner />
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 text-[13px] text-muted-foreground"
      >
        {lang === 'ru'
          ? 'Выбери регион аудитории'
          : lang === 'uk'
            ? 'Обери регіон аудиторії'
            : 'Pick your audience region'}
      </motion.p>
      <div className="grid grid-cols-2 gap-3">
        {regions.map((r, i) => {
          const svc = SERVICES.find((s) => s.categoryId === 'followers' && s.region === r)
          const from = svc?.pricePer1000 ?? 0
          const count = SERVICES.filter(
            (s) => s.categoryId === 'followers' && s.region === r,
          ).length
          const down = statusMap[`followers:${r}`] === false
          if (down) {
            return (
              <UnavailableGridCard
                key={r}
                index={i}
                icon={<RegionMark region={r} className="size-full" />}
                title={REGION_LABEL[r][lang]}
                lang={lang}
                onClick={() => onPick(r)}
              />
            )
          }
          return (
            <motion.button
              key={r}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.05, duration: 0.4, ease }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onPick(r)}
              className="group relative flex h-44 flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card p-4 text-start active:bg-secondary"
            >
              <div className="pointer-events-none absolute bottom-8 -end-0 opacity-90">
                <RegionMark region={r} className="size-32" />
              </div>
              <div className="relative">
                <span className="rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-extrabold tracking-wider text-primary">
                  {REGION_TAG[r]}
                </span>
              </div>
              <div className="relative">
                <p className="font-display text-[16px] font-extrabold tracking-tight">
                  {REGION_LABEL[r][lang]}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-primary">
                  from {money(from)}
                  <span className="text-muted-foreground"> · {count}</span>
                </p>
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* ─── Service info CTA ─── */}
      <motion.button
        type="button"
        onClick={() => setInfoOpen(true)}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5, ease }}
        whileTap={{ scale: 0.98 }}
        className="group relative mt-4 flex w-full items-center gap-3 overflow-hidden rounded-3xl border border-primary/40 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--primary)_18%,transparent),color-mix(in_oklab,var(--primary)_4%,transparent))] p-4 text-start shadow-[inset_0_1px_0_color-mix(in_oklab,var(--foreground)_10%,transparent),0_18px_40px_-24px_color-mix(in_oklab,var(--primary)_70%,transparent)]"
      >
        {/* ambient glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              'radial-gradient(80% 120% at 12% 50%, color-mix(in oklab, var(--primary) 28%, transparent) 0%, transparent 55%)',
          }}
        />
        {/* 3D mark */}
        <div
          className="relative size-14 shrink-0"
          style={{ perspective: '600px' }}
        >
          <motion.div
            aria-hidden
            className="absolute inset-0 rounded-full border border-primary/30"
            style={{ transformStyle: 'preserve-3d' }}
            animate={{ rotateX: [65, 65], rotateZ: [0, 360] }}
            transition={{ duration: 12, ease: 'linear', repeat: Infinity }}
          />
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transformStyle: 'preserve-3d' }}
            animate={{
              rotateY: [-18, 18, -18],
              rotateX: [8, -8, 8],
              y: [-1.5, 1.5, -1.5],
            }}
            transition={{ duration: 5, ease: 'easeInOut', repeat: Infinity }}
          >
            <div
              className="size-10 drop-shadow-[0_10px_18px_color-mix(in_oklab,var(--primary)_60%,transparent)]"
              style={{ transform: 'translateZ(18px)' }}
            >
              <AurxMark className="size-full" />
            </div>
          </motion.div>
        </div>

        <div className="relative min-w-0 flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-primary/85">
            {isRu ? 'Обязательно к прочтению' : 'Must read'}
          </p>
          <p className="mt-0.5 truncate font-display text-[15px] font-black tracking-tight">
            {isRu ? 'Информация о сервисе' : 'About this service'}
          </p>
          <p className="mt-0.5 line-clamp-1 text-[11.5px] text-white/55">
            {isRu
              ? 'Регионы, качество, рефилл — всё в одном месте'
              : 'Regions, quality, refill — all in one place'}
          </p>
        </div>

        <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/15 text-primary">
          <Info className="size-4" strokeWidth={2.4} />
        </span>
      </motion.button>

      <ServiceInfoSheet open={infoOpen} onOpenChange={setInfoOpen} />
    </div>
  )
}

// ─────────────────────────── Service row ───────────────────────────

function ServiceRow({
  service: s,
  index: i,
  lang,
  refillLabel,
  popularLabel,
  fromLabel,
  perLabel,
  onOpen,
}: {
  service: BoostService
  index: number
  lang: Lang
  refillLabel: string
  popularLabel: string
  fromLabel: string
  perLabel: string
  onOpen: () => void
}) {
  const Mark = BOOST_MARKS[s.categoryId as BoostMarkId] ?? BOOST_MARKS.likes
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ delay: Math.min(i * 0.04, 0.3), ease }}
      whileTap={{ scale: 0.98 }}
      onClick={onOpen}
      className="group flex items-center gap-3.5 rounded-2xl border border-border bg-card p-3.5 text-start transition-colors active:border-border-strong"
    >
      <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary ring-1 ring-border-strong">
        <Mark className="size-11" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[15px] font-bold tracking-tight">{s.name[lang]}</p>
          {s.popular && (
            <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-primary">
              {popularLabel}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[12px] text-muted-foreground">{s.speed[lang]}</span>
          {s.refill && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success">
              <RefreshCw className="size-3" />
              {refillLabel}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end leading-none">
        <span className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {fromLabel}
        </span>
        <span className="tnum text-[18px] font-extrabold tracking-tight">
          {money(s.pricePer1000)}
        </span>
        <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">
          {perLabel}
        </span>
      </div>
    </motion.button>
  )
}

// ─────────────────────────── Unavailable cards (3D + red slash) ───────────────────────────

function unavailableCopy(lang: Lang) {
  const ru = lang === 'ru' || lang === 'uk'
  return {
    badge: ru ? 'Временно недоступно' : 'Temporarily unavailable',
    tap: ru ? 'Что случилось?' : "What's going on?",
  }
}

function SlashOverlay() {
  return (
    <motion.div
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ delay: 0.15, duration: 0.5, ease }}
      className="pointer-events-none absolute inset-0 flex items-center justify-center origin-left"
    >
      <div className="h-[3px] w-[140%] -rotate-[18deg] rounded-full bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.75)]" />
    </motion.div>
  )
}

function Tilt3D({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      animate={{ rotateX: [8, -6, 8], rotateY: [-10, 12, -10], y: [0, -3, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      style={{ transformStyle: 'preserve-3d', perspective: 600 }}
      className="relative"
    >
      {children}
    </motion.div>
  )
}

function UnavailableHeroCard({
  icon, title, lang, onClick,
}: { icon: React.ReactNode; title: string; lang: Lang; onClick: () => void }) {
  const c = unavailableCopy(lang)
  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05, duration: 0.45, ease }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group relative mb-3 flex w-full items-center gap-4 overflow-hidden rounded-3xl border border-red-500/40 bg-gradient-to-br from-red-500/10 via-background to-background p-5 text-start"
    >
      <div className="pointer-events-none absolute -end-8 -top-8 size-52 rounded-full bg-red-500/10 blur-2xl" />
      <div className="relative size-20 shrink-0 grayscale">
        <Tilt3D>
          <div className="size-20 text-muted-foreground/70">{icon}</div>
          <SlashOverlay />
        </Tilt3D>
      </div>
      <div className="relative min-w-0 flex-1">
        <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5">
          <WifiOff className="size-3 text-red-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">
            {c.badge}
          </span>
        </div>
        <p className="font-display text-[19px] font-extrabold tracking-tight text-muted-foreground line-through decoration-red-500/70 decoration-2">
          {title}
        </p>
        <p className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-red-400">
          <Info className="size-3.5" />
          {c.tap}
        </p>
      </div>
    </motion.button>
  )
}

function UnavailableGridCard({
  icon, title, lang, onClick, index,
}: { icon: React.ReactNode; title: string; lang: Lang; onClick: () => void; index: number }) {
  const c = unavailableCopy(lang)
  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05, duration: 0.45, ease }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="group relative flex h-44 flex-col justify-between overflow-hidden rounded-3xl border border-red-500/30 bg-gradient-to-br from-red-500/5 via-card to-card p-4 text-start"
    >
      <div className="pointer-events-none absolute bottom-4 -end-4 opacity-60 grayscale">
        <Tilt3D>
          <div className="size-28 text-muted-foreground/60">{icon}</div>
          <SlashOverlay />
        </Tilt3D>
      </div>
      <div className="relative inline-flex w-fit items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5">
        <WifiOff className="size-3 text-red-500" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">
          {c.badge}
        </span>
      </div>
      <div className="relative">
        <p className="font-display text-[15px] font-extrabold tracking-tight text-muted-foreground line-through decoration-red-500/70 decoration-2">
          {title}
        </p>
        <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-red-400">
          <Info className="size-3" />
          {c.tap}
        </p>
      </div>
    </motion.button>
  )
}

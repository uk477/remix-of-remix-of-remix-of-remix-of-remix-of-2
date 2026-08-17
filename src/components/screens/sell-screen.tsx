'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  BadgeCheck,
  BrainCircuit,
  CheckCircle2,
  DollarSign,
  KeyRound,
  Link2,
  Mail,
  Send,
  ShieldCheck,
  Sparkles,
  Tag,
  Users,
  Wand2,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { useNav } from '@/lib/nav'
import { useSessionState } from '@/lib/persistent-state'
import { ScreenHeader } from '../screen-header'
import { useToast } from '../toast'
import { XButton } from '../ui/x-button'

const ease = [0.22, 1, 0.36, 1] as const

type Mode = 'pick' | 'account' | 'service'

const NICHES: { id: string; key: string }[] = [
  { id: 'crypto', key: 'niche_crypto' },
  { id: 'nft', key: 'niche_nft' },
  { id: 'dev', key: 'niche_dev' },
  { id: 'finance', key: 'niche_finance' },
  { id: 'gaming', key: 'niche_gaming' },
  { id: 'other', key: 'niche_other' },
]

export function SellScreen() {
  const { t } = useI18n()
  const { back } = useNav()
  const { show } = useToast()

  const [mode, setMode] = useState<Mode>('pick')
  const topRef = useRef<HTMLDivElement | null>(null)

  // Account form
  const [link, setLink] = useSessionState('aurex:sell:link', '')
  const [followers, setFollowers] = useSessionState('aurex:sell:followers', '')
  const [niche, setNiche] = useSessionState<string>('aurex:sell:niche', 'crypto')
  const [hasSmart, setHasSmart] = useSessionState<boolean | null>('aurex:sell:hasSmart', null)
  const [smartCount, setSmartCount] = useSessionState('aurex:sell:smartCount', '')
  const [emailAccess, setEmailAccess] = useSessionState<boolean | null>('aurex:sell:emailAccess', null)
  const [contact, setContact] = useSessionState('aurex:sell:contact', '')
  const [desiredPrice, setDesiredPrice] = useSessionState('aurex:sell:price', '')
  const [sent, setSent] = useState(false)

  // Service form
  const [offerName, setOfferName] = useSessionState('aurex:sell:offerName', '')
  const [offerDesc, setOfferDesc] = useSessionState('aurex:sell:offerDesc', '')
  const [offerPrice, setOfferPrice] = useSessionState('aurex:sell:offerPrice', '')
  const [offerNegotiable, setOfferNegotiable] = useSessionState('aurex:sell:offerNegotiable', false)
  const [offerContact, setOfferContact] = useSessionState('aurex:sell:offerContact', '')
  const [offerEscrow, setOfferEscrow] = useState(false)
  const [offerSent, setOfferSent] = useState(false)

  // Scroll to top whenever mode changes
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    // Also make sure the window scrolls up (mobile safety)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [mode])

  const canSubmitAccount = useMemo(
    () =>
      link.trim().length > 3 &&
      followers.trim().length > 0 &&
      hasSmart !== null &&
      emailAccess !== null &&
      contact.trim().length > 2,
    [link, followers, hasSmart, emailAccess, contact],
  )

  const canSubmitOffer = useMemo(
    () =>
      offerName.trim().length > 2 &&
      offerDesc.trim().length > 20 &&
      (offerNegotiable || offerPrice.trim().length > 0) &&
      offerContact.trim().length > 2 &&
      offerEscrow,
    [offerName, offerDesc, offerPrice, offerNegotiable, offerContact, offerEscrow],
  )

  function clearDraft(prefix: string) {
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i)
        if (k && k.startsWith(prefix)) sessionStorage.removeItem(k)
      }
    } catch {
      /* ignore */
    }
  }

  function handleSubmitAccount() {
    if (!canSubmitAccount) return
    setSent(true)
    clearDraft('aurex:sell:')
    show(t('sell_success'))
  }

  async function handleSubmitOffer() {
    if (!canSubmitOffer) return
    setOfferSent(true)
    clearDraft('aurex:sell:')
    show(t('offer_success'))
    const { supabase } = await import('@/integrations/supabase/client')
    const { data: sess } = await supabase.auth.getSession()
    const uid = sess.session?.user.id
    if (!uid) return
    const trimmedPrice = offerPrice.trim()
    const isNegotiable = trimmedPrice.length === 0 ? true : offerNegotiable && trimmedPrice.length === 0
    await supabase.from('supplier_applications').insert({
      user_id: uid,
      service_name: offerName.trim(),
      description: offerDesc.trim(),
      price: trimmedPrice.length > 0 ? trimmedPrice : null,
      negotiable: isNegotiable,
      telegram: offerContact.trim(),
      agreed_guarantor: offerEscrow,
    })

  }

  // Success screens
  if (sent || offerSent) {
    return (
      <div>
        <ScreenHeader title={t('sell_title')} onBack={back} />
        <div className="flex flex-col items-center px-6 pt-20 text-center">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 240, damping: 16 }}
            className="gold-ring mb-6 flex size-20 items-center justify-center rounded-full bg-primary/15"
          >
            <CheckCircle2 className="size-11 text-primary" strokeWidth={2} />
          </motion.div>
          <h2 className="font-display text-2xl font-extrabold tracking-tight">
            {sent ? t('sell_success') : t('offer_success')}
          </h2>
          <XButton variant="solid" size="md" className="mt-8" onClick={back}>
            {t('nav_home')}
          </XButton>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div ref={topRef} />
      <ScreenHeader title={t('sell_title')} subtitle={t('app_tagline')} onBack={back} />

      <div className="px-4 pb-8 pt-3">
        <AnimatePresence mode="wait" initial={false}>
          {mode === 'pick' && (
            <PickerStep
              key="pick"
              t={t}
              onPick={(m) => setMode(m)}
            />
          )}

          {mode === 'account' && (
            <motion.div
              key="account"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease }}
            >
              <ModeChip
                icon={Users}
                label={t('pick_account_tag')}
                onChange={() => setMode('pick')}
                changeLabel={t('pick_change')}
              />

              <Section title={t('sell_step_account')} delay={0.05}>
                <Field icon={Link2} label={t('field_account_link')} badge={t('required')}>
                  <input
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    inputMode="url"
                    placeholder="https://x.com/username"
                    className="field-input"
                  />
                </Field>
                <Field icon={Users} label={t('field_followers')} badge={t('required')}>
                  <input
                    value={followers}
                    onChange={(e) => setFollowers(e.target.value.replace(/[^\d]/g, ''))}
                    inputMode="numeric"
                    placeholder="12 500"
                    className="field-input"
                  />
                </Field>
                <Field icon={DollarSign} label={t('field_price')} badge={t('offer_field_price_badge')} hint={t('field_price_hint')}>
                  <input
                    value={desiredPrice}
                    onChange={(e) => setDesiredPrice(e.target.value)}
                    inputMode="text"
                    placeholder=""
                    maxLength={40}
                    className="field-input"
                  />
                </Field>
              </Section>


              <Section title={t('sell_step_audience')} delay={0.1}>
                <Field icon={Tag} label={t('field_niche')} hint={t('field_niche_hint')}>
                  <div className="flex flex-wrap gap-2">
                    {NICHES.map((n) => {
                      const active = niche === n.id
                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => setNiche(n.id)}
                          className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                            active
                              ? 'border-primary bg-primary/15 text-primary'
                              : 'border-border bg-secondary text-muted-foreground'
                          }`}
                        >
                          {t(n.key)}
                        </button>
                      )
                    })}
                  </div>
                </Field>

                <Field icon={BrainCircuit} label={t('field_smart')}>
                  <YesNoToggle value={hasSmart} onChange={setHasSmart} t={t} />
                  <AnimatePresence initial={false}>
                    {hasSmart === true && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.28, ease }}
                        className="overflow-hidden"
                      >
                        <label className="mb-1.5 block text-[12px] text-muted-foreground">
                          {t('field_smart_count')}
                        </label>
                        <input
                          value={smartCount}
                          onChange={(e) =>
                            setSmartCount(e.target.value.replace(/[^\d]/g, ''))
                          }
                          inputMode="numeric"
                          placeholder="1 200"
                          className="field-input"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Field>
              </Section>

              <Section title={t('sell_step_contact')} delay={0.15}>
                <Field icon={KeyRound} label={t('field_email_access')}>
                  <YesNoToggle value={emailAccess} onChange={setEmailAccess} t={t} />
                </Field>
                <Field
                  icon={AtSign}
                  label={t('field_contact')}
                  hint={t('field_contact_hint')}
                  badge={t('required')}
                >
                  <input
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="@username"
                    className="field-input"
                  />
                </Field>
              </Section>

              <XButton
                variant="primary"
                size="lg"
                block
                className="mt-2"
                disabled={!canSubmitAccount}
                onClick={handleSubmitAccount}
              >
                <Mail className="size-[18px]" />
                {t('sell_submit')}
              </XButton>
            </motion.div>
          )}

          {mode === 'service' && (
            <motion.div
              key="service"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease }}
            >
              <ModeChip
                icon={Wand2}
                label={t('pick_service_tag')}
                onChange={() => setMode('pick')}
                changeLabel={t('pick_change')}
              />

              <Section title={t('offer_section')} delay={0.05}>
                <Field icon={Tag} label={t('offer_field_name')} badge={t('required')}>
                  <input
                    value={offerName}
                    onChange={(e) => setOfferName(e.target.value)}
                    placeholder={t('offer_field_name_ph')}
                    maxLength={80}
                    className="field-input"
                  />
                </Field>

                <Field icon={Sparkles} label={t('offer_field_desc')} badge={t('required')}>
                  <textarea
                    value={offerDesc}
                    onChange={(e) => setOfferDesc(e.target.value)}
                    placeholder={t('offer_field_desc_ph')}
                    maxLength={1000}
                    rows={5}
                    className="field-input resize-none leading-relaxed"
                  />
                  <div className="mt-1.5 text-right text-[10.5px] tabular-nums text-muted-foreground">
                    <span className={offerDesc.length === 0 ? 'text-muted-foreground font-semibold' : offerDesc.trim().length < 20 ? 'text-red-500 font-semibold' : 'text-emerald-500 font-semibold'}>
                      {offerDesc.length}
                    </span>
                    /1000 {t('chars_count')}
                  </div>
                </Field>

                <Field icon={DollarSign} label={t('offer_field_price')} badge={t('offer_field_price_badge')}>
                  <input
                    value={offerPrice}
                    onChange={(e) => {
                      setOfferPrice(e.target.value)
                      if (e.target.value.trim().length > 0 && offerNegotiable) setOfferNegotiable(false)
                    }}
                    placeholder={t('offer_field_price_ph')}
                    maxLength={40}
                    className="field-input"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setOfferNegotiable((v) => {
                        const next = !v
                        if (next) setOfferPrice('')
                        return next
                      })
                    }}
                    className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                      offerNegotiable
                        ? 'border-primary bg-primary/15 text-primary'
                        : 'border-border bg-secondary text-muted-foreground'
                    }`}
                  >
                    <span
                      className={`flex size-3.5 items-center justify-center rounded-[4px] border ${
                        offerNegotiable ? 'border-primary bg-primary/30' : 'border-border'
                      }`}
                    >
                      {offerNegotiable && <BadgeCheck className="size-3 text-primary" />}
                    </span>
                    {t('offer_price_negotiable')}
                  </button>
                </Field>


                <Field icon={AtSign} label={t('offer_field_contact')} badge={t('required')}>
                  <input
                    value={offerContact}
                    onChange={(e) => setOfferContact(e.target.value)}
                    placeholder="@username"
                    maxLength={64}
                    className="field-input"
                  />
                </Field>

                <button
                  type="button"
                  onClick={() => setOfferEscrow((v) => !v)}
                  className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition-colors ${
                    offerEscrow
                      ? 'border-primary/60 bg-primary/10'
                      : 'border-border bg-secondary/60'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                      offerEscrow ? 'border-primary bg-primary text-background' : 'border-border'
                    }`}
                  >
                    {offerEscrow && <BadgeCheck className="size-3.5" strokeWidth={3} />}
                  </span>
                  <span className="flex items-center gap-2 text-[13px] font-medium leading-snug">
                    <ShieldCheck className="size-4 text-primary" />
                    {t('offer_agree_escrow')}
                  </span>
                </button>
              </Section>

              <XButton
                variant="primary"
                size="lg"
                block
                className="mt-2"
                disabled={!canSubmitOffer}
                onClick={handleSubmitOffer}
              >
                <Send className="size-[18px]" />
                {t('offer_submit')}
              </XButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ---------- Picker step ---------- */

function PickerStep({
  t,
  onPick,
}: {
  t: (k: string) => string
  onPick: (m: 'account' | 'service') => void
}) {
  return (
    <motion.div
      key="pick"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease }}
    >
      {/* Kicker */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease, delay: 0.05 }}
        className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1"
      >
        <Zap className="size-3.5 text-primary" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          {t('pick_kicker')}
        </span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease, delay: 0.1 }}
        className="font-display text-[26px] font-extrabold leading-[1.05] tracking-tight"
      >
        {t('pick_title')}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease, delay: 0.15 }}
        className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground"
      >
        {t('pick_sub')}
      </motion.p>

      <div className="mt-6 flex flex-col gap-4">
        <PickCard
          index={0}
          icon={Users}
          tag={t('pick_account_tag')}
          title={t('pick_account_title')}
          desc={t('pick_account_desc')}
          cta={t('pick_cta')}
          accent="gold"
          onClick={() => onPick('account')}
        />
        <PickCard
          index={1}
          icon={Wand2}
          tag={t('pick_service_tag')}
          title={t('pick_service_title')}
          desc={t('pick_service_desc')}
          cta={t('pick_cta')}
          accent="mono"
          onClick={() => onPick('service')}
        />
      </div>

      {/* Trust row */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease, delay: 0.35 }}
        className="mt-6 flex items-center justify-center gap-4 text-[11px] text-muted-foreground"
      >
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-primary/80" />
          {t('sell_why_3')}
        </span>
        <span className="h-3 w-px bg-border" />
        <span className="inline-flex items-center gap-1.5">
          <DollarSign className="size-3.5 text-primary/80" />
          {t('sell_why_1')}
        </span>
        <span className="h-3 w-px bg-border" />
        <span className="inline-flex items-center gap-1.5">
          <Zap className="size-3.5 text-primary/80" />
          {t('sell_why_2')}
        </span>
      </motion.div>
    </motion.div>
  )
}

function PickCard({
  index,
  icon: Icon,
  tag,
  title,
  desc,
  cta,
  accent,
  onClick,
}: {
  index: number
  icon: LucideIcon
  tag: string
  title: string
  desc: string
  cta: string
  accent: 'gold' | 'mono'
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease, delay: 0.18 + index * 0.08 }}
      whileTap={{ scale: 0.985 }}
      whileHover={{ y: -2 }}
      className={`group relative block w-full overflow-hidden rounded-3xl border p-5 text-left transition-colors ${
        accent === 'gold'
          ? 'border-primary/35 bg-gradient-to-br from-primary/12 via-card to-card'
          : 'border-border bg-card hover:border-primary/30'
      }`}
    >
      {/* Animated glow */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-3xl"
        initial={{ opacity: 0.3 }}
        animate={{ opacity: [0.25, 0.55, 0.25] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: index * 0.6 }}
        style={{
          background:
            accent === 'gold'
              ? 'radial-gradient(700px circle at 15% 0%, hsl(var(--primary) / 0.22), transparent 45%)'
              : 'radial-gradient(600px circle at 85% 100%, hsl(var(--primary) / 0.10), transparent 45%)',
        }}
      />

      {/* Corner shimmer */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-primary/20 blur-3xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.6, 0] }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.5 + index * 0.4,
        }}
      />

      <div className="relative flex items-start gap-4">
        <motion.div
          whileHover={{ rotate: -6, scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className={`gold-ring flex size-12 shrink-0 items-center justify-center rounded-2xl ${
            accent === 'gold' ? 'bg-primary/20' : 'bg-secondary'
          }`}
        >
          <Icon className={`size-5 ${accent === 'gold' ? 'text-primary' : 'text-foreground'}`} />
        </motion.div>

        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-primary/85">
            {tag}
          </p>
          <p className="mt-1.5 font-display text-[17px] font-extrabold leading-tight tracking-tight">
            {title}
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">{desc}</p>

          <div className="mt-3.5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary">
            {cta}
            <motion.span
              className="inline-flex"
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ArrowRight className="size-3.5" />
            </motion.span>
          </div>
        </div>
      </div>
    </motion.button>
  )
}

function ModeChip({
  icon: Icon,
  label,
  changeLabel,
  onChange,
}: {
  icon: LucideIcon
  label: string
  changeLabel: string
  onChange: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease }}
      className="mb-4 flex items-center justify-between rounded-2xl border border-border bg-card/60 px-3 py-2"
    >
      <div className="flex items-center gap-2 text-[12.5px] font-semibold">
        <Icon className="size-4 text-primary" />
        {label}
      </div>
      <button
        type="button"
        onClick={onChange}
        className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        {changeLabel}
      </button>
    </motion.div>
  )
}

/* ---------- Reusable primitives ---------- */

function Section({
  title,
  delay = 0,
  children,
}: {
  title: string
  delay?: number
  children: React.ReactNode
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease, delay }}
      className="mb-4 rounded-3xl border border-border bg-card p-4"
    >
      <p className="mb-3 font-display text-[13px] font-extrabold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <div className="flex flex-col gap-4">{children}</div>
    </motion.section>
  )
}

function Field({
  icon: Icon,
  label,
  hint,
  badge,
  children,
}: {
  icon: LucideIcon
  label: string
  hint?: string
  badge?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <span className="text-[13.5px] font-semibold">{label}</span>
        {badge && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {badge}
          </span>
        )}
      </div>
      {hint && <p className="mb-2 ps-6 text-[11px] text-muted-foreground">{hint}</p>}
      <div className="ps-6">{children}</div>
    </div>
  )
}

function YesNoToggle({
  value,
  onChange,
  t,
}: {
  value: boolean | null
  onChange: (v: boolean) => void
  t: (k: string) => string
}) {
  const opts = [
    { v: true, label: t('opt_yes') },
    { v: false, label: t('opt_no') },
  ]
  return (
    <div className="flex gap-2">
      {opts.map((o) => {
        const active = value === o.v
        return (
          <button
            key={String(o.v)}
            type="button"
            onClick={() => onChange(o.v)}
            className={`relative flex-1 overflow-hidden rounded-xl border py-2.5 text-[13px] font-semibold transition-colors ${
              active
                ? 'border-primary text-primary'
                : 'border-border bg-secondary text-muted-foreground'
            }`}
          >
            {active && (
              <motion.span
                layoutId={`yn-${o.label}`}
                className="absolute inset-0 bg-primary/15"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative flex items-center justify-center gap-1.5">
              {active && o.v && <BadgeCheck className="size-4" />}
              {o.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

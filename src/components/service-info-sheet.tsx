'use client'

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useRef } from 'react'
import {
  BadgeCheck,
  FileCheck2,
  Gauge,
  Info,
  RefreshCcw,
  ShieldCheck,
  Sparkle,
  Sparkles,
  Timer,
  Zap,
} from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AurxMark } from './aurx-mark'
import { useI18n } from '@/lib/i18n'

type Stat = { icon: React.ElementType; value: string; label: string }
type Section = {
  icon: React.ElementType
  tag: string
  title: string
  body: string
  bullets?: string[]
  tone?: 'default' | 'gold' | 'warn'
}
type Copy = {
  eyebrow: string
  title: string
  subtitle: string
  intro: string
  stats: Stat[]
  sections: Section[]
  agreement: string
  footer: string
}

function useCopy(): Copy {
  const { lang } = useI18n()
  const isRu = lang === 'ru' || lang === 'uk'
  return isRu
    ? {
        eyebrow: 'AURX · О СЕРВИСЕ',
        title: 'Всё, что нужно знать перед стартом',
        subtitle:
          'Прозрачные условия, живые метрики, автозапуск. Мы сделали продвижение таким, каким оно должно быть.',
        intro:
          'Услуга запускается автоматически сразу после оплаты — тебе не нужно ничего подтверждать, писать в поддержку или ждать оператора. Просто закажи и наблюдай, как растёт число фолловеров.',
        stats: [
          { icon: Zap, value: '~15 мин', label: 'среднее время' },
          { icon: Timer, value: '0 сек', label: 'запуск после оплаты' },
        ],
        sections: [
          {
            icon: Gauge,
            tag: 'СКОРОСТЬ',
            title: 'Моментальный старт, плавная выдача',
            body:
              'Запуск моментальный, среднее время выполнения — около 15 минут. Скорость подбирается автоматически, чтобы X читал прирост как естественный.',
            bullets: [
              'Старт: сразу после оплаты, без модерации',
              'Средняя выдача: 15 минут',
              'В редких случаях возможны небольшие задержки при пиковой нагрузке',
            ],
          },
          {
            icon: RefreshCcw,
            tag: 'ГАРАНТИЯ',
            title: 'Рефилл 48 часов — бесплатно',
            body:
              'Гарантия и рефилл действуют 48 часов с момента запуска услуги. Если часть аудитории отвалится — вернём одним нажатием.',
            bullets: [
              '«Профиль» → «Заказы» → нужный заказ → кнопка «Рефилл»',
              'Один рефилл раз в 12 часов, до 4 раз за заказ',
              'Работает автоматически, без переписки с поддержкой',
            ],
            tone: 'gold',
          },
          {
            icon: ShieldCheck,
            tag: 'БЕЗОПАСНОСТЬ',
            title: 'Аккаунт под защитой',
            body:
              'Работаем только по @нику или ссылке — пароль не нужен никогда. Twitter/X не наказывает тех, кто пользуется продвижением: ни блокировок, ни красных табличек, ни теневых банов.',
            bullets: [
              'Ноль доступа к аккаунту, ноль рисков',
              'Никаких взаимодействий, которые триггерят антиспам',
            ],
          },
          {
            icon: FileCheck2,
            tag: 'ВАЖНО',
            title: 'Один заказ — один сервис',
            body:
              'Пока идёт наша накрутка, не запускай параллельно ту же метрику на других сайтах. Пересечение источников ломает алгоритм выдачи и может исказить результат — в этом случае претензии не рассматриваются.',
            tone: 'warn',
          },
        ],
        agreement:
          'Оформляя заказ, ты подтверждаешь, что ознакомился и согласен с правилами сервиса.',
        footer: 'AureX Agency · сервис #1 по X',
      }
    : {
        eyebrow: 'AURX · ABOUT THE SERVICE',
        title: 'Everything you need before you start',
        subtitle:
          'Transparent terms, real metrics, instant launch. Growth done the way it should be.',
        intro:
          'Your order fires the moment payment lands — no confirmations, no support tickets, no waiting. Just checkout and watch the numbers move.',
        stats: [
          { icon: Zap, value: '~15 min', label: 'average delivery' },
          { icon: Timer, value: '0 sec', label: 'launch after payment' },
          { icon: ShieldCheck, value: '48 h', label: 'guarantee & refill' },
        ],
        sections: [
          {
            icon: Gauge,
            tag: 'SPEED',
            title: 'Instant launch, smooth delivery',
            body:
              'Launch is instant, average completion around 15 minutes. Drip speed auto-tunes so X sees the growth as natural.',
            bullets: [
              'Starts immediately after payment — zero moderation',
              'Typical delivery: 15 minutes',
              'Rare delays possible during peak load',
            ],
          },
          {
            icon: RefreshCcw,
            tag: 'GUARANTEE',
            title: '48-hour free refill',
            body:
              'Guarantee and refill are active for 48 hours after launch. If part of the audience drops off, you refill it in one tap.',
            bullets: [
              'Profile → Orders → your order → Refill button',
              'One refill per 12 hours, up to 4 per order',
              'Fully automatic — no support messaging required',
            ],
            tone: 'gold',
          },
          {
            icon: ShieldCheck,
            tag: 'SAFETY',
            title: 'Your account stays protected',
            body:
              'We only need your @handle or profile URL — never your password. Twitter/X does not penalize accounts that use promotion services: no suspensions, no red flags, no shadow bans.',
            bullets: [
              'Zero account access, zero risk',
              'No actions that trigger anti-spam',
            ],
          },
          {
            icon: FileCheck2,
            tag: 'IMPORTANT',
            title: 'One order — one provider',
            body:
              'While our promotion is running, do not launch the same metric on other services in parallel. Mixed sources break the delivery algorithm and may distort the result — such cases are not eligible for claims.',
            tone: 'warn',
          },
        ],
        agreement:
          'By placing an order you confirm that you have read and agreed to the service rules.',
        footer: 'AureX Agency · #1 X growth desk',
      }
}

function FloatingMark() {
  // Six particles orbiting on different radii/speeds
  const particles = Array.from({ length: 6 }).map((_, i) => ({
    size: 3 + (i % 3),
    radius: 62 + (i % 3) * 8,
    duration: 6 + i * 1.4,
    delay: -i * 0.9,
    tiltX: 55 + (i % 2) * 20,
    reverse: i % 2 === 0,
  }))

  return (
    <div
      className="relative mx-auto mb-5 h-44 w-44"
      style={{ perspective: '1100px' }}
    >
      {/* soft radial floor glow */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle at 50% 55%, color-mix(in oklab, var(--primary) 60%, transparent) 0%, transparent 62%)',
        }}
      />

      {/* rotating conic aura */}
      <motion.div
        aria-hidden
        className="absolute inset-4 rounded-full opacity-70 blur-xl"
        style={{
          background:
            'conic-gradient(from 0deg, transparent 0deg, color-mix(in oklab, var(--primary) 70%, transparent) 90deg, transparent 180deg, color-mix(in oklab, var(--primary) 40%, transparent) 270deg, transparent 360deg)',
        }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 10, ease: 'linear', repeat: Infinity }}
      />

      {/* orbital rings (tilted for 3D depth) */}
      <motion.div
        aria-hidden
        className="absolute inset-2 rounded-full border border-primary/35"
        style={{ transformStyle: 'preserve-3d', transform: 'rotateX(68deg)' }}
        animate={{ rotateZ: [0, 360] }}
        transition={{ duration: 16, ease: 'linear', repeat: Infinity }}
      />
      <motion.div
        aria-hidden
        className="absolute inset-2 rounded-full border border-primary/20"
        style={{ transformStyle: 'preserve-3d', transform: 'rotateY(72deg)' }}
        animate={{ rotateZ: [0, -360] }}
        transition={{ duration: 22, ease: 'linear', repeat: Infinity }}
      />
      <motion.div
        aria-hidden
        className="absolute inset-6 rounded-full border border-white/10"
        style={{ transformStyle: 'preserve-3d', transform: 'rotateX(76deg) rotateY(20deg)' }}
        animate={{ rotateZ: [0, 360] }}
        transition={{ duration: 28, ease: 'linear', repeat: Infinity }}
      />

      {/* orbiting gold particles */}
      {particles.map((p, i) => (
        <motion.div
          key={i}
          aria-hidden
          className="absolute inset-0"
          style={{ transformStyle: 'preserve-3d', transform: `rotateX(${p.tiltX}deg)` }}
          animate={{ rotateZ: p.reverse ? [0, -360] : [0, 360] }}
          transition={{ duration: p.duration, ease: 'linear', repeat: Infinity, delay: p.delay }}
        >
          <div
            className="absolute left-1/2 top-1/2 rounded-full bg-primary shadow-[0_0_10px_2px_color-mix(in_oklab,var(--primary)_80%,transparent)]"
            style={{
              width: p.size,
              height: p.size,
              transform: `translate(-50%, -50%) translateX(${p.radius}px)`,
            }}
          />
        </motion.div>
      ))}

      {/* 3D-spinning coin (the mark) */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ y: [-6, 6, -6] }}
        transition={{ duration: 4.5, ease: 'easeInOut', repeat: Infinity }}
      >
        <motion.div
          className="relative size-24"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ rotateY: [0, 360] }}
          transition={{ duration: 9, ease: 'linear', repeat: Infinity }}
        >
          {/* front face */}
          <div
            className="absolute inset-0 grid place-items-center rounded-full"
            style={{
              transform: 'translateZ(14px)',
              background:
                'radial-gradient(circle at 30% 25%, color-mix(in oklab, var(--primary) 35%, #1a1512) 0%, #0b0908 70%)',
              boxShadow:
                'inset 0 0 22px color-mix(in oklab, var(--primary) 30%, transparent), 0 20px 40px -10px color-mix(in oklab, var(--primary) 60%, transparent)',
              border: '1px solid color-mix(in oklab, var(--primary) 45%, transparent)',
            }}
          >
            <div className="size-14">
              <AurxMark className="size-full" />
            </div>
            {/* specular sweep */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
            >
              <motion.div
                className="absolute -inset-x-4 top-0 h-full opacity-70"
                style={{
                  background:
                    'linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.35) 50%, transparent 65%)',
                }}
                animate={{ x: ['-80%', '110%'] }}
                transition={{ duration: 3.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1.2 }}
              />
            </motion.div>
          </div>

          {/* coin edge (side band) */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'linear-gradient(90deg, color-mix(in oklab, var(--primary) 55%, #0b0908), color-mix(in oklab, var(--primary) 15%, #0b0908) 50%, color-mix(in oklab, var(--primary) 55%, #0b0908))',
              transform: 'translateZ(0px) scaleX(0.98)',
              opacity: 0.55,
              filter: 'blur(1px)',
            }}
          />

          {/* back face */}
          <div
            className="absolute inset-0 grid place-items-center rounded-full"
            style={{
              transform: 'translateZ(-14px) rotateY(180deg)',
              background:
                'radial-gradient(circle at 70% 30%, color-mix(in oklab, var(--primary) 30%, #14100e) 0%, #08 70%)',
              boxShadow:
                'inset 0 0 22px color-mix(in oklab, var(--primary) 25%, transparent)',
              border: '1px solid color-mix(in oklab, var(--primary) 35%, transparent)',
            }}
          >
            <div className="font-display text-[10px] font-black tracking-[0.32em] text-primary/70">
              AURX
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* sparkle accents */}
      <motion.div
        aria-hidden
        className="absolute right-2 top-3 text-primary"
        animate={{ opacity: [0.2, 1, 0.2], scale: [0.7, 1.15, 0.7], rotate: [0, 25, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Sparkles className="size-4" />
      </motion.div>
      <motion.div
        aria-hidden
        className="absolute left-3 bottom-5 text-primary/80"
        animate={{ opacity: [0.15, 0.9, 0.15], scale: [0.6, 1, 0.6], rotate: [0, -20, 0] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
      >
        <Sparkles className="size-3" />
      </motion.div>
    </div>
  )
}

function StatCard({ stat, i }: { stat: Stat; i: number }) {
  const Icon = stat.icon
  const ref = useRef<HTMLDivElement>(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rx = useSpring(useTransform(my, [-1, 1], [10, -10]), { stiffness: 220, damping: 18 })
  const ry = useSpring(useTransform(mx, [-1, 1], [-14, 14]), { stiffness: 220, damping: 18 })
  const glowX = useTransform(mx, [-1, 1], ['0%', '100%'])
  const glowY = useTransform(my, [-1, 1], ['0%', '100%'])

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    mx.set(((e.clientX - r.left) / r.width) * 2 - 1)
    my.set(((e.clientY - r.top) / r.height) * 2 - 1)
  }
  function onLeave() {
    mx.set(0)
    my.set(0)
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      initial={{ opacity: 0, y: 18, rotateX: -22 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ delay: 0.15 + i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      style={{
        rotateX: rx,
        rotateY: ry,
        transformStyle: 'preserve-3d',
      }}
      className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/[0.12] via-primary/[0.04] to-white/[0.02] p-3.5 text-center shadow-[0_12px_30px_-16px_color-mix(in_oklab,var(--primary)_65%,transparent)]"
    >
      {/* cursor-follow highlight */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background: useTransform(
            [glowX, glowY],
            ([x, y]) =>
              `radial-gradient(120px 120px at ${x} ${y}, color-mix(in oklab, var(--primary) 45%, transparent), transparent 70%)`,
          ),
        }}
      />
      {/* animated conic ring behind icon */}
      <motion.div
        className="relative mx-auto mb-2 size-10"
        style={{ transformStyle: 'preserve-3d', transform: 'translateZ(24px)' }}
      >
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'conic-gradient(from 0deg, color-mix(in oklab, var(--primary) 80%, transparent), transparent 40%, color-mix(in oklab, var(--primary) 60%, transparent) 70%, transparent)',
            padding: 1.5,
            WebkitMask:
              'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 6, ease: 'linear', repeat: Infinity }}
        />
        <div
          className="absolute inset-1 flex items-center justify-center rounded-full text-primary"
          style={{
            background:
              'radial-gradient(circle at 30% 25%, color-mix(in oklab, var(--primary) 30%, #0e0b09) 0%, #0a0807 80%)',
            boxShadow:
              'inset 0 0 12px color-mix(in oklab, var(--primary) 35%, transparent)',
          }}
        >
          <Icon className="size-4" strokeWidth={2.4} />
        </div>
      </motion.div>
      <div
        className="relative font-display text-[16px] font-black leading-none tracking-tight text-white"
        style={{ transform: 'translateZ(18px)' }}
      >
        {stat.value}
      </div>
      <div
        className="relative mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white/55"
        style={{ transform: 'translateZ(10px)' }}
      >
        {stat.label}
      </div>
    </motion.div>
  )
}

/** Rotating gold coin-badge used for section icons. */
function CoinBadge({
  Icon,
  tone,
}: {
  Icon: React.ElementType
  tone: 'gold' | 'warn' | 'default'
}) {
  const accent = tone === 'warn' ? '#fbbf24' : 'var(--primary)'
  const iconColor = tone === 'warn' ? 'text-amber-300' : 'text-primary'

  return (
    <div
      className="relative size-11 shrink-0"
      style={{ perspective: '600px' }}
    >
      {/* rotating conic ring */}
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(from 0deg, ${accent}, transparent 35%, ${accent} 70%, transparent)`,
          padding: 1.5,
          WebkitMask:
            'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          opacity: 0.9,
        }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 7, ease: 'linear', repeat: Infinity }}
      />
      {/* subtle outer glow */}
      <div
        aria-hidden
        className="absolute -inset-1 rounded-full blur-md"
        style={{
          background: `radial-gradient(circle, ${accent} 0%, transparent 70%)`,
          opacity: 0.35,
        }}
      />
      {/* face — with a gentle Y-tilt idle animation for a 3D feel */}
      <motion.div
        className={`absolute inset-[3px] flex items-center justify-center rounded-full ${iconColor}`}
        style={{
          transformStyle: 'preserve-3d',
          background:
            tone === 'warn'
              ? 'radial-gradient(circle at 30% 25%, rgba(251,191,36,0.28) 0%, #100c07 75%)'
              : 'radial-gradient(circle at 30% 25%, color-mix(in oklab, var(--primary) 32%, #100c07) 0%, #09 78%)',
          boxShadow:
            tone === 'warn'
              ? 'inset 0 0 14px rgba(251,191,36,0.25)'
              : 'inset 0 0 14px color-mix(in oklab, var(--primary) 35%, transparent)',
        }}
        animate={{ rotateY: [-14, 14, -14], rotateX: [4, -4, 4] }}
        transition={{ duration: 5.5, ease: 'easeInOut', repeat: Infinity }}
      >
        <Icon className="size-[18px]" strokeWidth={2.3} />
        {/* specular sweep */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
        >
          <motion.div
            className="absolute -inset-x-3 top-0 h-full opacity-60"
            style={{
              background:
                'linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.35) 50%, transparent 60%)',
            }}
            animate={{ x: ['-90%', '110%'] }}
            transition={{
              duration: 3,
              ease: 'easeInOut',
              repeat: Infinity,
              repeatDelay: 2.5,
            }}
          />
        </motion.div>
      </motion.div>
    </div>
  )
}

function SectionCard({ s, i }: { s: Section; i: number }) {
  const Icon = s.icon
  const tone = s.tone ?? 'default'
  const borderTone =
    tone === 'gold'
      ? 'border-primary/30'
      : tone === 'warn'
        ? 'border-amber-500/35'
        : 'border-white/8'
  const bgTone =
    tone === 'gold'
      ? 'bg-gradient-to-b from-primary/[0.08] to-white/[0.02]'
      : tone === 'warn'
        ? 'bg-gradient-to-b from-amber-500/[0.08] to-white/[0.02]'
        : 'bg-white/[0.03]'
  const tagTone =
    tone === 'warn' ? 'text-amber-300/90' : 'text-primary/80'

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: 0.05 + i * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative overflow-hidden rounded-2xl border p-4 ${borderTone} ${bgTone}`}
    >
      {/* corner glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            tone === 'warn'
              ? 'radial-gradient(circle, rgba(251,191,36,0.22) 0%, transparent 70%)'
              : 'radial-gradient(circle, color-mix(in oklab, var(--primary) 30%, transparent) 0%, transparent 70%)',
          opacity: tone === 'default' ? 0.35 : 0.65,
        }}
      />

      <div className="relative mb-2 flex items-center gap-2.5">
        <CoinBadge Icon={Icon} tone={tone} />
        <div className="min-w-0 flex-1">
          <p className={`text-[9.5px] font-extrabold tracking-[0.24em] ${tagTone}`}>
            {s.tag}
          </p>
          <h3 className="mt-0.5 text-[14px] font-bold leading-tight tracking-tight text-white">
            {s.title}
          </h3>
        </div>
      </div>

      <p className="relative text-[12.5px] leading-relaxed text-white/70">
        {s.body}
      </p>

      {s.bullets && (
        <ul className="relative mt-3 space-y-1.5">
          {s.bullets.map((b, bi) => (
            <motion.li
              key={bi}
              initial={{ opacity: 0, x: -6 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 + bi * 0.05, duration: 0.3 }}
              className="flex items-start gap-2 text-[12px] leading-relaxed text-white/75"
            >
              <BadgeCheck
                className={`mt-0.5 size-3.5 shrink-0 ${tone === 'warn' ? 'text-amber-300' : 'text-primary'}`}
                strokeWidth={2.4}
              />
              <span>{b}</span>
            </motion.li>
          ))}
        </ul>
      )}
    </motion.div>
  )
}

export function ServiceInfoSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const copy = useCopy()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex h-[92dvh] flex-col overflow-hidden rounded-t-3xl border-t border-primary/25 bg-[#0b0b0d] p-0 shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.8)]"
      >
        {/* drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1.5 w-10 rounded-full bg-white/15" />
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="relative overflow-hidden px-5 pt-4 pb-6">
            {/* ambient gold aura */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-64"
              style={{
                background:
                  'radial-gradient(120% 80% at 50% 0%, color-mix(in oklab, var(--primary) 22%, transparent) 0%, transparent 60%)',
              }}
            />
            <div className="relative">
              <FloatingMark />
              <p className="text-center text-[10px] font-extrabold tracking-[0.32em] text-primary/80">
                {copy.eyebrow}
              </p>
              <h2 className="mt-1.5 text-center font-display text-[22px] font-black leading-tight tracking-tight">
                {copy.title}
              </h2>
              <p className="mx-auto mt-2 max-w-[36ch] text-center text-[12.5px] leading-relaxed text-white/55">
                {copy.subtitle}
              </p>

              {/* stats row */}
              <div
                className="mt-5 grid grid-cols-2 gap-2"
                style={{ perspective: '700px' }}
              >
                {copy.stats.map((s, i) => (
                  <StatCard key={s.label} stat={s} i={i} />
                ))}
              </div>
            </div>
          </div>

          <div className="px-5 pb-8">
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="mb-4 flex items-start gap-2.5 rounded-2xl border border-primary/25 bg-primary/[0.06] px-4 py-3 text-[13px] leading-relaxed text-white/85"
            >
              <Sparkle className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{copy.intro}</span>
            </motion.p>

            <div className="space-y-3">
              {copy.sections.map((s, i) => (
                <SectionCard key={s.title} s={s} i={i} />
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="mt-5 flex items-start gap-2.5 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/[0.10] via-primary/[0.05] to-transparent px-4 py-3"
            >
              <Info className="mt-0.5 size-4 shrink-0 text-primary" />
              <p className="text-[12px] leading-relaxed text-white/75">
                {copy.agreement}
              </p>
            </motion.div>

            <p className="mt-6 text-center text-[10.5px] font-semibold uppercase tracking-[0.25em] text-white/30">
              {copy.footer}
            </p>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}